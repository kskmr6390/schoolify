# Schoolify — Multi-Tenant School Management System

A production-ready, scalable SaaS platform for managing schools. Built with a microservices architecture supporting multiple schools (tenants) with role-based access for Admins, Teachers, Students, and Parents.

## Architecture Overview

```
Client Apps (Web + Mobile)
       ↓
   API Gateway :8000  (JWT validation, routing, rate limiting)
       ↓
┌──────────────────────────────────────────────────────────┐
│  Auth     Tenant   Student  Attendance  Fee  Assignment  │
│  :8001    :8002    :8004    :8005      :8006  :8008      │
│                                                          │
│  User     Notification   Analytics   AI Copilot         │
│  :8003    :8007           :8009       :8010              │
└──────────────────────────────────────────────────────────┘
       ↓ Kafka Events ↓
  Notification Service (Email + SMS + Push)
       ↓
PostgreSQL · Redis · MinIO · FAISS
```

See [docs/architecture.md](docs/architecture.md) for full diagram and design decisions.

## Quick Start

### Prerequisites
- Docker + Docker Compose
- 4GB RAM minimum

### 1. Clone and configure

```bash
cp docker/.env.example docker/.env
# Edit docker/.env with your settings (minimum: set SECRET_KEY)
```

### 2. Start all services

```bash
make up
# Or: docker-compose -f docker/docker-compose.yml up -d
```

### 3. Verify services are running

```bash
make health
# Or: curl http://localhost:8000/health/all
```

### 4. Access the platform

| Service | URL |
|---------|-----|
| Web App | http://localhost:3000 |
| API Gateway | http://localhost:8000 |
| API Docs | http://localhost:8001/docs |
| Grafana | http://localhost:3001 |
| MinIO Console | http://localhost:9001 |
| MailHog | http://localhost:8025 |

## Service Ports Reference

| Service | Port | Description |
|---------|------|-------------|
| API Gateway | 8000 | Single entry point for all API requests |
| Auth Service | 8001 | Login, registration, tokens, RBAC |
| Tenant Service | 8002 | School onboarding, feature flags |
| User Service | 8003 | User profiles by role |
| Student SIS | 8004 | Students, classes, timetable |
| Attendance | 8005 | Daily + period attendance |
| Fee Service | 8006 | Invoices, payments (idempotent) |
| Notification | 8007 | Email, SMS, push (Kafka consumer) |
| Assignment | 8008 | Homework, exams, grading |
| Analytics | 8009 | Dashboards, reports |
| AI Copilot | 8010 | RAG-based school insights |

## Project Structure

```
schoolify/
├── services/
│   ├── shared/              # Shared library (DB, security, events, middleware)
│   ├── api-gateway/         # FastAPI reverse proxy + JWT validation
│   ├── auth-service/        # Authentication & user management
│   ├── tenant-service/      # School/tenant management
│   ├── user-service/        # User profiles
│   ├── student-service/     # Student SIS, classes, timetable
│   ├── attendance-service/  # Attendance tracking
│   ├── fee-service/         # Fee management & payments
│   ├── notification-service/# Multi-channel notifications
│   ├── assignment-service/  # Assignments, exams, grading
│   ├── analytics-service/   # Dashboards & reports
│   └── ai-copilot-service/  # RAG-based AI insights
├── frontend/
│   └── web/                 # Next.js 14 web application
├── mobile/                  # React Native (Expo) mobile app
├── docker/                  # Docker Compose + Nginx + Prometheus
├── infra/
│   ├── k8s/                 # Kubernetes manifests + HPA
│   └── terraform/           # Infrastructure as Code
├── docs/                    # Architecture, DB schema, deployment guide
├── scripts/                 # Seed data, utilities
└── .github/workflows/       # CI/CD pipelines
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11, FastAPI, SQLAlchemy 2.0 (async) |
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Mobile | React Native (Expo) |
| Database | PostgreSQL 16 (row-level multi-tenancy) |
| Cache | Redis 7 |
| Queue | Apache Kafka |
| Storage | MinIO (S3-compatible) |
| AI | Claude claude-opus-4-6 API, sentence-transformers, FAISS |
| Monitoring | Prometheus + Grafana |
| Container | Docker, Kubernetes |
| CI/CD | GitHub Actions |

## Multi-Tenancy

Row-level isolation: every table has a `tenant_id` column. Tenant is resolved from:
1. `X-Tenant-Slug: {slug}` HTTP header
2. Subdomain: `{slug}.schoolify.com`

See [docs/architecture.md](docs/architecture.md#multi-tenancy-design) for details.

## Development

```bash
# Run tests
make test

# Lint code
make lint

# View logs for a specific service
make logs service=auth-service

# Generate a secure secret key
make gen-secret

# Run database migrations
make migrate

# Clean up (removes containers and volumes)
make clean
```

## Deployment

See [docs/deployment.md](docs/deployment.md) for:
- AWS EKS deployment
- GCP GKE deployment
- Environment variables reference
- Zero-downtime deployments
- Monitoring setup

## API Documentation

Each service exposes Swagger UI at `/docs`:
- Auth: http://localhost:8001/docs
- Students: http://localhost:8004/docs
- Fees: http://localhost:8006/docs

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m "feat: add your feature"`
4. Push and open a PR

## License

MIT License — see LICENSE file for details.
