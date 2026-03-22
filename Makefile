.PHONY: up down build migrate test lint seed logs clean

# Default target
help:
	@echo "Schoolify - School Management System"
	@echo ""
	@echo "Available commands:"
	@echo "  make up          Start all services (Docker Compose)"
	@echo "  make down        Stop all services"
	@echo "  make build       Build all Docker images"
	@echo "  make migrate     Run database migrations"
	@echo "  make test        Run all tests"
	@echo "  make lint        Run linters"
	@echo "  make seed        Seed demo data"
	@echo "  make logs        Tail service logs (use: make logs service=auth-service)"
	@echo "  make clean       Remove containers and volumes"

# Start all services
up:
	@echo "Starting Schoolify services..."
	docker-compose -f docker/docker-compose.yml --env-file docker/.env up -d
	@echo ""
	@echo "Services started!"
	@echo "  API Gateway:  http://localhost:8000"
	@echo "  Web App:      http://localhost:3000"
	@echo "  Grafana:      http://localhost:3001"
	@echo "  MinIO:        http://localhost:9001"
	@echo "  MailHog:      http://localhost:8025"

# Stop services
down:
	docker-compose -f docker/docker-compose.yml down

# Build images
build:
	docker-compose -f docker/docker-compose.yml build

# Run migrations (runs against running postgres container)
migrate:
	docker-compose -f docker/docker-compose.yml exec auth-service alembic upgrade head

# Run tests
test:
	pytest services/ -v --tb=short -x

# Run linters
lint:
	@echo "Running Python linters..."
	flake8 services/ --max-line-length=120 --exclude=*/tests/*,*/migrations/*
	@echo "Running frontend linter..."
	cd frontend/web && npm run lint

# Seed demo data
seed:
	python scripts/seed_data.py

# Tail logs (usage: make logs service=auth-service)
service ?= api-gateway
logs:
	docker-compose -f docker/docker-compose.yml logs -f $(service)

# Clean up everything
clean:
	docker-compose -f docker/docker-compose.yml down -v --remove-orphans

# Install development dependencies
install:
	pip install -r services/auth-service/requirements.txt
	cd frontend/web && npm install

# Generate a secure secret key
gen-secret:
	@python -c "import secrets; print(secrets.token_hex(32))"

# Check service health
health:
	@echo "Checking service health..."
	@curl -sf http://localhost:8000/health/all | python -m json.tool || echo "Gateway not running"
