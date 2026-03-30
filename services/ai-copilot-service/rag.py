"""
RAG (Retrieval Augmented Generation) pipeline for the AI Copilot.

Architecture:
1. School data (attendance, grades, fees) is embedded and stored in FAISS per tenant
2. On query: retrieve top-k similar chunks from the tenant's vector store
3. Build a prompt with retrieved context + conversation history
4. Generate response using Claude API

Tenant isolation: each tenant has its own FAISS index file stored separately.
This prevents cross-tenant data leakage.
"""
import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

# Lazy imports - these are heavy libraries
_sentence_transformer = None
_faiss = None


def _get_encoder():
    """Lazy load sentence transformer model."""
    global _sentence_transformer
    if _sentence_transformer is None:
        from sentence_transformers import SentenceTransformer
        _sentence_transformer = SentenceTransformer("all-MiniLM-L6-v2")
    return _sentence_transformer


def _get_faiss():
    """Lazy load FAISS."""
    global _faiss
    if _faiss is None:
        import faiss
        _faiss = faiss
    return _faiss


FAISS_STORE_DIR = Path(os.getenv("FAISS_STORE_DIR", "/tmp/faiss_indexes"))
EMBEDDING_DIM = 384  # all-MiniLM-L6-v2 output dimension


class TenantVectorStore:
    """
    Per-tenant FAISS vector store.
    Documents are stored as: index + metadata JSON file.
    """

    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.store_dir = FAISS_STORE_DIR / tenant_id
        self.store_dir.mkdir(parents=True, exist_ok=True)
        self.index_path = self.store_dir / "index.faiss"
        self.meta_path = self.store_dir / "metadata.json"
        self._index = None
        self._metadata: List[Dict] = []
        self._load()

    def _load(self):
        faiss = _get_faiss()
        if self.index_path.exists():
            self._index = faiss.read_index(str(self.index_path))
            with open(self.meta_path) as f:
                self._metadata = json.load(f)
        else:
            self._index = faiss.IndexFlatIP(EMBEDDING_DIM)  # Inner product (cosine similarity)

    def _save(self):
        faiss = _get_faiss()
        faiss.write_index(self._index, str(self.index_path))
        with open(self.meta_path, "w") as f:
            json.dump(self._metadata, f)

    def add_documents(self, documents: List[Dict[str, Any]]):
        """
        Index documents into the vector store.
        Each document: {"content": str, "source_type": str, "source_id": str, ...}
        """
        encoder = _get_encoder()
        texts = [doc["content"] for doc in documents]
        embeddings = encoder.encode(texts, normalize_embeddings=True)

        self._index.add(np.array(embeddings, dtype=np.float32))
        self._metadata.extend(documents)
        self._save()

    def search(self, query: str, k: int = 5) -> List[Tuple[float, Dict]]:
        """
        Search for the most relevant documents.
        Returns list of (score, metadata) tuples.
        """
        if self._index.ntotal == 0:
            return []

        encoder = _get_encoder()
        query_embedding = encoder.encode([query], normalize_embeddings=True)
        scores, indices = self._index.search(np.array(query_embedding, dtype=np.float32), k)

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx >= 0 and idx < len(self._metadata):
                results.append((float(score), self._metadata[idx]))
        return results

    def clear(self):
        """Clear all indexed documents for this tenant."""
        faiss = _get_faiss()
        self._index = faiss.IndexFlatIP(EMBEDDING_DIM)
        self._metadata = []
        self._save()


# Cache of loaded vector stores per tenant
_stores: Dict[str, TenantVectorStore] = {}


def get_store(tenant_id: str) -> TenantVectorStore:
    if tenant_id not in _stores:
        _stores[tenant_id] = TenantVectorStore(tenant_id)
    return _stores[tenant_id]


class LocalOllamaClient:
    def __init__(self, base_url: str, default_model: str):
        self.base_url = base_url.rstrip("/")
        self.default_model = default_model

    async def generate(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        max_tokens: int = 1024,
        model: Optional[str] = None,
    ) -> str:
        import httpx
        payload = {
            "model": model or self.default_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                *messages,
            ],
            "max_tokens": max_tokens,
            "temperature": 0.2,
            "stream": False,
        }

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(f"{self.base_url}/v1/chat/completions", json=payload)
            resp.raise_for_status()
            data = resp.json()

        return data.get("choices", [])[0].get("message", {}).get("content", "")


PROVIDER_COSTS: Dict[str, float] = {
    # cost per 1K tokens (rough estimate input+output blended)
    "openai":    0.002,
    "anthropic": 0.003,
    "google":    0.0005,
    "mistral":   0.001,
    "groq":      0.0001,
    "cohere":    0.001,
    "local":     0.0,
}


class RAGPipeline:
    """Full RAG pipeline: retrieve context -> augment -> generate.
    Supports all 7 providers: openai, anthropic, google, mistral, groq, cohere, local.
    Provider selection and API key are passed per-request so each tenant can use their own.
    """

    def __init__(self):
        from ..shared.config import settings
        self._settings = settings
        # Local Ollama client used when provider='local'
        self._ollama = LocalOllamaClient(settings.LOCAL_LLM_BASE_URL, settings.LOCAL_LLM_MODEL)
        # Anthropic is the default server-side provider when caller sends no api_key
        self._default_anthropic_key = settings.ANTHROPIC_API_KEY

    async def index_school_data(
        self,
        tenant_id: str,
        data_type: str,
        records: List[Dict],
    ):
        """
        Index school records into the vector store.
        Called by admin to refresh the AI's knowledge base.

        data_type: "students", "attendance", "exam_results", "fees"
        """
        store = get_store(tenant_id)
        documents = []

        for record in records:
            content = self._record_to_text(data_type, record)
            documents.append({
                "content": content,
                "source_type": data_type,
                "source_id": record.get("id", ""),
                "metadata": record,
            })

        store.add_documents(documents)
        return len(documents)

    def _record_to_text(self, data_type: str, record: Dict) -> str:
        """Convert a record to natural language text for indexing."""
        if data_type == "student":
            return (
                f"Student: {record.get('first_name')} {record.get('last_name')}, "
                f"Class: {record.get('class_name', 'N/A')}, "
                f"Attendance: {record.get('attendance_pct', 'N/A')}%, "
                f"Average Grade: {record.get('avg_grade', 'N/A')}"
            )
        elif data_type == "exam_result":
            return (
                f"Student {record.get('student_name')} scored {record.get('marks_obtained')} "
                f"out of {record.get('max_marks')} in {record.get('exam_name')} "
                f"({record.get('subject_name')}). Grade: {record.get('grade')}"
            )
        elif data_type == "attendance":
            return (
                f"Class {record.get('class_name')} attendance on {record.get('date')}: "
                f"{record.get('present_count')} present, {record.get('absent_count')} absent."
            )
        else:
            return json.dumps(record)

    async def retrieve_context(
        self, tenant_id: str, query: str, k: int = 5
    ) -> List[Dict]:
        """Retrieve relevant context chunks for a query."""
        store = get_store(tenant_id)
        results = store.search(query, k=k)
        return [{"score": score, **meta} for score, meta in results if score > 0.3]

    def _build_system_prompt(
        self,
        context: List[Dict],
        tenant_name: str,
        live_context: str = "",
    ) -> str:
        vector_text = "\n\n".join([
            f"[Source {i+1} - {ctx.get('source_type', 'data')}]\n{ctx.get('content', '')}"
            for i, ctx in enumerate(context)
        ])

        live_section = (
            f"\n\nLIVE SCHOOL DATA (fetched in real-time — use this as the primary source of truth):\n"
            f"{live_context}"
            if live_context else ""
        )

        vector_section = (
            f"\n\nADDITIONAL INDEXED CONTEXT:\n{vector_text}"
            if vector_text else ""
        )

        return f"""You are an AI data assistant for {tenant_name}'s school management system.
You have direct access to the school's live data and must answer questions using real numbers and names from that data.
{live_section}{vector_section}

Guidelines:
- ALWAYS use the live school data above to answer — never say "I don't have access"
- Quote exact student names, percentages, and counts from the data
- If a specific piece of data is not in the context above, say what IS available and offer to help further
- Provide clear lists and tables when showing multiple students/records
- Offer actionable recommendations (e.g., contact parents of low-attendance students)
- Be concise and direct — lead with the answer, then explain"""

    async def _call_provider(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        provider: str,
        model: Optional[str],
        api_key: Optional[str],
    ) -> Tuple[str, int, int]:
        """
        Route to the correct LLM provider.
        Returns (response_text, tokens_in, tokens_out).
        """
        import httpx

        all_messages = [{"role": "system", "content": system_prompt}] + messages

        if provider == "local":
            text = await self._ollama.generate(system_prompt, messages, max_tokens=1024, model=model)
            return text, 0, 0

        if provider == "anthropic":
            key = api_key or self._default_anthropic_key
            import anthropic as anthropic_lib
            client = anthropic_lib.AsyncAnthropic(api_key=key)
            resp = await client.messages.create(
                model=model or "claude-sonnet-4-6",
                max_tokens=1024,
                system=system_prompt,
                messages=messages,
            )
            return (
                resp.content[0].text,
                resp.usage.input_tokens,
                resp.usage.output_tokens,
            )

        if provider == "openai":
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={"model": model or "gpt-4o-mini", "messages": all_messages, "max_tokens": 1024, "temperature": 0.3},
                )
                resp.raise_for_status()
                data = resp.json()
            choice = data["choices"][0]["message"]["content"]
            usage = data.get("usage", {})
            return choice, usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0)

        if provider == "google":
            contents = [{"role": "user" if m["role"] == "user" else "model",
                         "parts": [{"text": m["content"]}]} for m in messages]
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model or 'gemini-1.5-flash'}:generateContent?key={api_key}"
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(url, json={"contents": contents, "systemInstruction": {"parts": [{"text": system_prompt}]},
                                                    "generationConfig": {"maxOutputTokens": 1024, "temperature": 0.3}})
                resp.raise_for_status()
                data = resp.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            usage = data.get("usageMetadata", {})
            return text, usage.get("promptTokenCount", 0), usage.get("candidatesTokenCount", 0)

        if provider == "mistral":
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(
                    "https://api.mistral.ai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={"model": model or "mistral-small-latest", "messages": all_messages, "max_tokens": 1024, "temperature": 0.3},
                )
                resp.raise_for_status()
                data = resp.json()
            usage = data.get("usage", {})
            return data["choices"][0]["message"]["content"], usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0)

        if provider == "groq":
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={"model": model or "llama-3.3-70b-versatile", "messages": all_messages, "max_tokens": 1024, "temperature": 0.3},
                )
                resp.raise_for_status()
                data = resp.json()
            usage = data.get("usage", {})
            return data["choices"][0]["message"]["content"], usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0)

        if provider == "cohere":
            chat_history = [{"role": "USER" if m["role"] == "user" else "CHATBOT", "message": m["content"]}
                            for m in messages[:-1]]
            last_msg = messages[-1]["content"] if messages else ""
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(
                    "https://api.cohere.ai/v1/chat",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={"model": model or "command-r", "message": last_msg, "chat_history": chat_history,
                          "preamble": system_prompt},
                )
                resp.raise_for_status()
                data = resp.json()
            tokens = data.get("meta", {}).get("tokens", {})
            return data["text"], tokens.get("input_tokens", 0), tokens.get("output_tokens", 0)

        raise ValueError(f"Unknown provider: {provider}")

    async def generate_response(
        self,
        query: str,
        context: List[Dict],
        conversation_history: List[Dict],
        tenant_name: str = "the school",
        model: Optional[str] = None,
        provider: str = "anthropic",
        api_key: Optional[str] = None,
        live_context: str = "",
    ) -> Tuple[str, List[Dict], int, int]:
        """
        Generate an AI response using the specified provider + RAG context + live data.
        Returns (response_text, sources_used, tokens_in, tokens_out).
        """
        system_prompt = self._build_system_prompt(context, tenant_name, live_context=live_context)
        messages = []
        for msg in conversation_history[-10:]:
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": query})

        response_text, tok_in, tok_out = await self._call_provider(
            system_prompt, messages, provider, model, api_key
        )
        sources = [{"source_type": ctx.get("source_type"), "source_id": ctx.get("source_id")}
                   for ctx in context]
        return response_text, sources, tok_in, tok_out

    async def answer_question(
        self,
        tenant_id: str,
        query: str,
        conversation_history: List[Dict] = None,
        tenant_name: str = "School",
        model: Optional[str] = None,
        provider: str = "anthropic",
        api_key: Optional[str] = None,
        live_context: str = "",
    ) -> Dict:
        """Full RAG pipeline: live data + retrieve from FAISS → augment → generate."""
        context = await self.retrieve_context(tenant_id, query)
        response, sources, tok_in, tok_out = await self.generate_response(
            query, context, conversation_history or [], tenant_name,
            model=model, provider=provider, api_key=api_key,
            live_context=live_context,
        )
        return {
            "response": response,
            "sources": sources,
            "context_used": len(context) > 0,
            "tokens_input": tok_in,
            "tokens_output": tok_out,
        }


# Singleton RAG pipeline
rag_pipeline = RAGPipeline()
