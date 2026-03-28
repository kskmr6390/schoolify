"""
Shared configuration using Pydantic BaseSettings.
All services import this to get their configuration from environment variables.
"""
from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Schoolify"
    ENVIRONMENT: str = "production"
    DEBUG: bool = False
    SECRET_KEY: str = Field(..., description="JWT signing secret - must be set in env")

    # Database
    DATABASE_URL: str = Field(..., description="Async PostgreSQL URL (postgresql+asyncpg://...)")
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 40

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"
    REDIS_TTL_SECONDS: int = 300  # 5 minutes default cache TTL

    # Kafka
    KAFKA_BOOTSTRAP_SERVERS: str = "kafka:9092"
    KAFKA_CONSUMER_GROUP: str = "schoolify-group"
    # Set to SASL_SSL for Upstash Kafka (managed) — leave PLAINTEXT for local Docker Kafka
    KAFKA_SECURITY_PROTOCOL: str = "PLAINTEXT"
    KAFKA_SASL_MECHANISM: str = "SCRAM-SHA-256"
    KAFKA_SASL_USERNAME: str = ""
    KAFKA_SASL_PASSWORD: str = ""

    # JWT
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # OAuth - Google
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # AWS / S3
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    S3_BUCKET: str = "schoolify-uploads"
    S3_ENDPOINT_URL: str = ""  # MinIO endpoint for local dev

    # Email (SMTP)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    FROM_EMAIL: str = "noreply@schoolify.com"

    # SMS - Twilio
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""

    # Push Notifications - Firebase
    FIREBASE_CREDENTIALS_PATH: str = ""

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_TENANT_PER_MINUTE: int = 1000

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000", "https://app.schoolify.com"]

    # AI / LLM
    # AI_COPILOT_ENABLED=false disables the AI service entirely (saves ~90 MB RAM + Ollama)
    AI_COPILOT_ENABLED: bool = True
    # LLM_TYPE: "local" (Ollama) | "claude" (Anthropic API) | "disabled"
    LLM_TYPE: str = "local"
    ANTHROPIC_API_KEY: str = ""
    LOCAL_LLM_BASE_URL: str = "http://localhost:11434"
    LOCAL_LLM_MODEL: str = "tinyllama-1.1b"

    # Service URLs (for API Gateway)
    AUTH_SERVICE_URL: str = "http://auth-service:8001"
    TENANT_SERVICE_URL: str = "http://tenant-service:8002"
    USER_SERVICE_URL: str = "http://user-service:8003"
    STUDENT_SERVICE_URL: str = "http://student-service:8004"
    ATTENDANCE_SERVICE_URL: str = "http://attendance-service:8005"
    FEE_SERVICE_URL: str = "http://fee-service:8006"
    NOTIFICATION_SERVICE_URL: str = "http://notification-service:8007"
    ASSIGNMENT_SERVICE_URL: str = "http://assignment-service:8008"
    ANALYTICS_SERVICE_URL: str = "http://analytics-service:8009"
    AI_COPILOT_SERVICE_URL: str = "http://ai-copilot-service:8010"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
