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


class RAGPipeline:
    """Full RAG pipeline: retrieve context -> augment -> generate."""

    def __init__(self):
        from ..shared.config import settings
        if settings.LLM_TYPE.lower() == "local":
            self.client = LocalOllamaClient(settings.LOCAL_LLM_BASE_URL, settings.LOCAL_LLM_MODEL)
            self.default_model = settings.LOCAL_LLM_MODEL
            self.is_local = True
        else:
            import anthropic
            self.client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            self.default_model = "claude-opus-4-6"
            self.is_local = False

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

    async def generate_response(
        self,
        query: str,
        context: List[Dict],
        conversation_history: List[Dict],
        tenant_name: str = "the school",
        model: Optional[str] = None,
    ) -> Tuple[str, List[Dict]]:
        """
        Generate an AI response using Claude with retrieved context.
        Returns (response_text, sources_used).
        """
        # Build context string
        context_text = "\n\n".join([
            f"[Source {i+1} - {ctx.get('source_type', 'data')}]\n{ctx.get('content', '')}"
            for i, ctx in enumerate(context)
        ])

        system_prompt = f"""You are an AI assistant for {tenant_name}'s school management system.
You help administrators, teachers, and parents understand school data and make informed decisions.

Available school data context:
{context_text if context_text else "No specific data context available for this query."}

Guidelines:
- Answer based on the provided context when available
- Be specific about student names, numbers, and percentages when available
- If data is insufficient, say so clearly - don't make up numbers
- Provide actionable recommendations when relevant
- Be concise but thorough
- Format lists and statistics clearly"""

        # Build messages from history
        messages = []
        for msg in conversation_history[-10:]:  # Last 10 messages for context
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": query})

        if self.is_local:
            response_text = await self.client.generate(system_prompt, messages, max_tokens=1024, model=model or self.default_model)
        else:
            response = await self.client.messages.create(
                model=self.default_model,
                max_tokens=1024,
                system=system_prompt,
                messages=messages,
            )
            response_text = response.content[0].text
        sources = [{"source_type": ctx.get("source_type"), "source_id": ctx.get("source_id")}
                   for ctx in context]
        return response_text, sources

    async def answer_question(
        self,
        tenant_id: str,
        query: str,
        conversation_history: List[Dict] = None,
        tenant_name: str = "School",
        model: Optional[str] = None,
    ) -> Dict:
        """Full RAG pipeline: retrieve → augment → generate."""
        context = await self.retrieve_context(tenant_id, query)
        response, sources = await self.generate_response(
            query, context, conversation_history or [], tenant_name, model=model
        )
        return {
            "response": response,
            "sources": sources,
            "context_used": len(context) > 0,
        }


# Singleton RAG pipeline
rag_pipeline = RAGPipeline()
