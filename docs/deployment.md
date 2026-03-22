# Deployment Guide — Schoolify

## AWS EKS Deployment

### Prerequisites
```bash
# Install tools
brew install awscli kubectl helm eksctl

# Configure AWS credentials
aws configure
```

### 1. Create EKS Cluster
```bash
eksctl create cluster \
  --name schoolify-prod \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type m5.xlarge \
  --nodes 3 \
  --nodes-min 3 \
  --nodes-max 20 \
  --managed
```

### 2. Install dependencies
```bash
# Nginx Ingress Controller
helm upgrade --install ingress-nginx ingress-nginx \
  --repo https://kubernetes.github.io/ingress-nginx \
  --namespace ingress-nginx --create-namespace

# cert-manager (automatic SSL via Let's Encrypt)
helm upgrade --install cert-manager cert-manager \
  --repo https://charts.jetstack.io \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true

# Create ClusterIssuer for Let's Encrypt
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@schoolify.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### 3. Create Secrets
```bash
# Database credentials
kubectl create secret generic schoolify-secrets \
  --from-literal=secret-key="$(openssl rand -hex 32)" \
  --from-literal=database-url="postgresql+asyncpg://schoolify:PASSWORD@rds-endpoint:5432/schoolify" \
  --from-literal=redis-url="redis://elasticache-endpoint:6379/0" \
  -n schoolify-prod

# Pull secrets for private registry
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USERNAME \
  --docker-password=YOUR_GITHUB_TOKEN \
  -n schoolify-prod
```

### 4. Deploy RDS (PostgreSQL)
```bash
# Create RDS instance (via AWS Console or Terraform)
aws rds create-db-instance \
  --db-instance-identifier schoolify-prod \
  --db-instance-class db.r6g.large \
  --engine postgres \
  --engine-version 16.1 \
  --master-username schoolify \
  --master-user-password "$(openssl rand -base64 24)" \
  --allocated-storage 100 \
  --storage-type gp3 \
  --multi-az \
  --vpc-security-group-ids sg-xxxxxxxx \
  --db-subnet-group-name schoolify-subnet-group
```

### 5. Deploy to Kubernetes
```bash
# Apply all manifests
kubectl apply -f infra/k8s/namespace.yaml
kubectl apply -f infra/k8s/configmap.yaml
kubectl apply -f infra/k8s/secrets.yaml
kubectl apply -f infra/k8s/postgres.yaml  # if using in-cluster postgres (dev only)
kubectl apply -f infra/k8s/redis.yaml
kubectl apply -f infra/k8s/api-gateway.yaml
kubectl apply -f infra/k8s/services.yaml
kubectl apply -f infra/k8s/ingress.yaml
kubectl apply -f infra/k8s/monitoring.yaml

# Or using Kustomize:
kubectl apply -k infra/k8s/
```

### 6. Run Database Migrations
```bash
kubectl run db-migrate \
  --image=ghcr.io/YOUR_ORG/schoolify/auth-service:latest \
  --restart=Never \
  --env="DATABASE_URL=$(kubectl get secret schoolify-secrets -o jsonpath='{.data.database-url}' | base64 -d)" \
  --command -- alembic upgrade head \
  -n schoolify-prod

# Wait for completion
kubectl wait --for=condition=complete pod/db-migrate -n schoolify-prod --timeout=5m
kubectl delete pod db-migrate -n schoolify-prod
```

### 7. Verify deployment
```bash
kubectl get pods -n schoolify-prod
kubectl get services -n schoolify-prod
kubectl get ingress -n schoolify-prod
curl https://api.schoolify.com/health/all
```

---

## GCP GKE Deployment

### 1. Create GKE Cluster
```bash
gcloud container clusters create schoolify-prod \
  --region us-central1 \
  --machine-type n2-standard-4 \
  --num-nodes 3 \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 20 \
  --enable-autorepair \
  --enable-autoupgrade \
  --workload-pool=${PROJECT_ID}.svc.id.goog

gcloud container clusters get-credentials schoolify-prod --region us-central1
```

### 2. Use Cloud SQL (PostgreSQL)
```bash
gcloud sql instances create schoolify-prod \
  --database-version=POSTGRES_16 \
  --tier=db-custom-4-15360 \
  --region=us-central1 \
  --availability-type=REGIONAL  # High availability
```

---

## Environment Variables Reference

### All Services (required)
```
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/schoolify
REDIS_URL=redis://host:6379/0
KAFKA_BOOTSTRAP_SERVERS=kafka-broker:9092
SECRET_KEY=<32+ char random string>
ENVIRONMENT=production
```

### Auth Service
```
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
SMTP_HOST=email-smtp.us-east-1.amazonaws.com  # AWS SES
SMTP_PORT=587
SMTP_USER=AKIAIOSFODNN7EXAMPLE
SMTP_PASSWORD=smtp_password
FROM_EMAIL=noreply@schoolify.com
```

### Fee Service
```
# No additional variables - uses common config
```

### Notification Service
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+1234567890
FIREBASE_CREDENTIALS_PATH=/secrets/firebase.json
```

### AI Copilot Service
```
ANTHROPIC_API_KEY=sk-ant-api03-xxx
FAISS_STORE_DIR=/data/faiss_indexes
```

### Frontend (Next.js)
```
NEXT_PUBLIC_API_URL=https://api.schoolify.com
NEXT_PUBLIC_APP_URL=https://app.schoolify.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
```

---

## Zero-Downtime Deployment Strategy

### Rolling Update (default)
```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1        # One extra pod during update
    maxUnavailable: 0  # Never reduce below desired count
```

This ensures: old pods receive traffic until new pods pass readiness checks.

### Blue-Green (for major releases)
```bash
# Deploy new version as separate deployment
kubectl apply -f deployment-green.yaml

# Switch service selector when ready
kubectl patch service api-gateway -p '{"spec":{"selector":{"version":"green"}}}'

# Clean up blue
kubectl delete deployment api-gateway-blue
```

---

## Monitoring Setup

### Prometheus + Grafana
All FastAPI services expose `/metrics` via `prometheus-fastapi-instrumentator`.

```bash
# Deploy Prometheus
helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace \
  --set grafana.adminPassword=admin \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false
```

### Key Metrics to Monitor
- `http_requests_total` — Request count by service/endpoint/status
- `http_request_duration_seconds` — P50/P95/P99 latency
- `db_pool_size` — Connection pool utilization
- `kafka_consumer_lag` — Message processing lag

### Alerts (Prometheus AlertManager)
```yaml
# CPU > 80% for 5 minutes
# Memory > 85% for 5 minutes
# Error rate > 5% for 2 minutes
# Kafka consumer lag > 1000 messages
# DB connections > 80% of max_connections
```

---

## Secrets Management

### AWS Secrets Manager
```bash
# Store secrets
aws secretsmanager create-secret \
  --name schoolify/prod/database-url \
  --secret-string "postgresql+asyncpg://..."

# Use in K8s via External Secrets Operator
kubectl apply -f - <<EOF
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
EOF
```

---

## Cost Optimization

### Production (est. 10K students)
| Component | Spec | Monthly Cost |
|-----------|------|-------------|
| EKS nodes (3x m5.large) | 3 nodes, auto-scale to 10 | ~$200-600 |
| RDS PostgreSQL (db.r6g.large) | Multi-AZ, 100GB | ~$300 |
| ElastiCache Redis (cache.r6g.large) | Single node | ~$150 |
| MSK Kafka (kafka.m5.large) | 3 brokers | ~$400 |
| S3 storage | 100GB | ~$5 |
| CloudFront CDN | 1TB transfer | ~$85 |
| **Total estimate** | | **~$1,200-1,700/mo** |

### Cost-Saving Tips
1. Use Spot Instances for non-critical services (70% savings)
2. Reserved Instances for RDS/ElastiCache (40% savings)
3. S3 Intelligent-Tiering for document storage
4. CloudFront caching reduces origin load
5. Scale down staging to minimal during off-hours
