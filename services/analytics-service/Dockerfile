FROM python:3.11-slim AS builder
WORKDIR /build
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*
COPY services/analytics-service/requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.11-slim AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 curl && rm -rf /var/lib/apt/lists/*
COPY --from=builder /install /usr/local
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
COPY services/shared /app/services/shared
COPY services/analytics-service /app/services/analytics_service
RUN useradd -r -s /bin/false appuser && chown -R appuser:appuser /app
USER appuser
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3     CMD curl -f http://localhost:8009/health || exit 1
EXPOSE 8009
CMD ["uvicorn", "services.analytics_service.main:app", "--host", "0.0.0.0", "--port", "8009", "--workers", "2"]
