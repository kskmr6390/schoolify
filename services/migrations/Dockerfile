FROM python:3.11-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends libpq5 libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY services/migrations/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Copy shared code and all service models (env.py imports from all of them)
COPY services/shared                   /app/services/shared
COPY services/migrations               /app/services/migrations
COPY services/auth-service             /app/services/auth_service
COPY services/tenant-service           /app/services/tenant_service
COPY services/user-service             /app/services/user_service
COPY services/student-service          /app/services/student_service
COPY services/attendance-service       /app/services/attendance_service
COPY services/fee-service              /app/services/fee_service
COPY services/assignment-service       /app/services/assignment_service
COPY services/notification-service     /app/services/notification_service
COPY services/ai-copilot-service       /app/services/ai_copilot_service
COPY services/analytics-service        /app/services/analytics_service

COPY services/migrations/alembic.ini    /app/alembic.ini
COPY services/migrations/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

CMD ["/app/entrypoint.sh"]
