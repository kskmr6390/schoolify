FROM python:3.11-slim AS builder
WORKDIR /build
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev g++ && rm -rf /var/lib/apt/lists/*
COPY services/ai-copilot-service/requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.11-slim AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 curl && rm -rf /var/lib/apt/lists/*
COPY --from=builder /install /usr/local
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
COPY services/shared /app/services/shared
COPY services/ai-copilot-service /app/services/ai_copilot_service
RUN useradd -r -s /bin/false appuser
RUN mkdir -p /data/faiss_indexes && chown -R appuser:appuser /app /data
USER appuser
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8010/health || exit 1
EXPOSE 8010
VOLUME ["/data/faiss_indexes"]
CMD ["uvicorn", "services.ai_copilot_service.main:app", "--host", "0.0.0.0", "--port", "8010", "--workers", "1"]
