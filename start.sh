#!/usr/bin/env bash
set -euo pipefail

# ─── Schoolify — Local Development Startup Script ───────────────────────────
# Usage:
#   ./start.sh           — start everything (infra + all services)
#   ./start.sh infra     — start only infra (postgres, redis, kafka, minio)
#   ./start.sh services  — start only app services (assumes infra is up)
#   ./start.sh frontend  — start Next.js dev server
#   ./start.sh mobile    — start Expo dev server
#   ./start.sh stop      — stop all containers
#   ./start.sh logs      — tail all service logs
#   ./start.sh status    — show container health

COMPOSE="docker compose -f docker/docker-compose.yml"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # no colour

log()  { echo -e "${GREEN}[schoolify]${NC} $*"; }
warn() { echo -e "${YELLOW}[schoolify]${NC} $*"; }
err()  { echo -e "${RED}[schoolify]${NC} $*" >&2; }

# ── Preflight checks ─────────────────────────────────────────────────────────
check_deps() {
  local missing=()
  for cmd in docker curl; do
    command -v "$cmd" &>/dev/null || missing+=("$cmd")
  done
  if [[ ${#missing[@]} -gt 0 ]]; then
    err "Missing required tools: ${missing[*]}"
    exit 1
  fi

  if ! docker info &>/dev/null; then
    err "Docker daemon is not running. Start Docker Desktop and try again."
    exit 1
  fi
}

# ── .env setup ───────────────────────────────────────────────────────────────
ensure_env() {
  if [[ ! -f docker/.env ]]; then
    warn "docker/.env not found — copying from docker/.env.example"
    cp docker/.env.example docker/.env

    # Auto-generate a random SECRET_KEY
    local secret
    secret=$(openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))")
    if [[ "$(uname)" == "Darwin" ]]; then
      sed -i '' "s|SECRET_KEY=.*|SECRET_KEY=${secret}|" docker/.env
    else
      sed -i "s|SECRET_KEY=.*|SECRET_KEY=${secret}|" docker/.env
    fi
    log "Generated SECRET_KEY in docker/.env"
  fi
}

# ── Wait for a Docker container to reach healthy status ─────────────────────
wait_container_healthy() {
  local name=$1 container=$2 max=${3:-60}
  local elapsed=0
  printf "  Waiting for %-30s" "$name..."
  until [[ "$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null)" == "healthy" ]]; do
    sleep 2
    elapsed=$((elapsed + 2))
    if [[ $elapsed -ge $max ]]; then
      echo " TIMEOUT"
      err "$name did not become healthy within ${max}s"
      return 1
    fi
    printf "."
  done
  echo " OK"
}

# ── Wait for an HTTP endpoint ────────────────────────────────────────────────
wait_healthy() {
  local name=$1 url=$2 max=${3:-60}
  local elapsed=0
  printf "  Waiting for %-30s" "$name..."
  until curl -sf "$url" &>/dev/null; do
    sleep 2
    elapsed=$((elapsed + 2))
    if [[ $elapsed -ge $max ]]; then
      echo " TIMEOUT"
      err "$name did not become healthy within ${max}s"
      return 1
    fi
    printf "."
  done
  echo " OK"
}

# ── Start infrastructure only ────────────────────────────────────────────────
start_infra() {
  log "Starting infrastructure services..."
  $COMPOSE up -d postgres redis zookeeper kafka minio mailhog

  log "Waiting for infrastructure to be ready..."
  wait_container_healthy "PostgreSQL"  schoolify-postgres  60
  wait_container_healthy "Redis"       schoolify-redis     30
  wait_container_healthy "Kafka"       schoolify-kafka     120
  wait_healthy           "MailHog UI"  "http://localhost:8025" 30

  log "Infrastructure ready."
}

# ── Run DB migrations ────────────────────────────────────────────────────────
run_migrations() {
  log "Running database migrations..."
  $COMPOSE run --rm \
    -e DATABASE_URL="postgresql+asyncpg://schoolify:schoolify_dev_password@postgres:5432/schoolify" \
    auth-service \
    alembic -c services/migrations/alembic.ini upgrade head \
    || warn "Migration step skipped (service may not be built yet)"
}

# ── Start all app services ────────────────────────────────────────────────────
start_services() {
  log "Starting application services..."
  $COMPOSE up -d \
    api-gateway \
    auth-service \
    tenant-service \
    user-service \
    student-service \
    attendance-service \
    fee-service \
    notification-service \
    assignment-service \
    analytics-service \
    ai-copilot-service

  log "Waiting for API Gateway..."
  wait_container_healthy "API Gateway" schoolify-api-gateway 120

  log "All services up."
}

# ── Start monitoring stack ────────────────────────────────────────────────────
start_monitoring() {
  log "Starting monitoring (Prometheus + Grafana)..."
  $COMPOSE up -d prometheus grafana
  wait_healthy "Grafana" "http://localhost:3001/api/health" 60
  log "Grafana → http://localhost:3001  (admin / admin)"
}

# ── Start Next.js frontend ────────────────────────────────────────────────────
start_frontend() {
  local web_dir="frontend/web"
  if [[ ! -d "$web_dir/node_modules" ]]; then
    log "Installing frontend dependencies..."
    (cd "$web_dir" && npm install)
  fi
  log "Starting Next.js dev server → http://localhost:3000"
  (cd "$web_dir" && npm run dev) &
  echo $! > /tmp/schoolify-frontend.pid
}

# ── Start Expo mobile ─────────────────────────────────────────────────────────
start_mobile() {
  if [[ ! -d "mobile/node_modules" ]]; then
    log "Installing mobile dependencies..."
    (cd mobile && npm install)
  fi
  log "Starting Expo dev server..."
  (cd mobile && npx expo start) &
  echo $! > /tmp/schoolify-mobile.pid
}

# ── Print service URLs ────────────────────────────────────────────────────────
print_urls() {
  echo ""
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}  Schoolify is running!${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "  Frontend (Next.js)   →  http://localhost:3000"
  echo "  API Gateway          →  http://localhost:8000"
  echo "  API Docs             →  http://localhost:8000/docs"
  echo "  Health (all)         →  http://localhost:8000/health/all"
  echo ""
  echo "  Auth Service         →  http://localhost:8001"
  echo "  Tenant Service       →  http://localhost:8002"
  echo "  Student Service      →  http://localhost:8004"
  echo "  Attendance Service   →  http://localhost:8005"
  echo "  Fee Service          →  http://localhost:8006"
  echo "  Notification Service →  http://localhost:8007"
  echo "  Assignment Service   →  http://localhost:8008"
  echo "  Analytics Service    →  http://localhost:8009"
  echo "  AI Copilot Service   →  http://localhost:8010"
  echo ""
  echo "  Grafana              →  http://localhost:3001  (admin/admin)"
  echo "  MailHog (email UI)   →  http://localhost:8025"
  echo "  MinIO Console        →  http://localhost:9001  (minioadmin/minioadmin)"
  echo ""
  echo -e "${YELLOW}  Logs:   ./start.sh logs${NC}"
  echo -e "${YELLOW}  Stop:   ./start.sh stop${NC}"
  echo ""
}

# ── Main ─────────────────────────────────────────────────────────────────────
CMD="${1:-all}"

check_deps

case "$CMD" in
  all)
    ensure_env
    start_infra
    start_services
    start_monitoring
    print_urls
    ;;
  infra)
    ensure_env
    start_infra
    ;;
  services)
    start_services
    print_urls
    ;;
  frontend)
    start_frontend
    log "Frontend started. PID saved to /tmp/schoolify-frontend.pid"
    ;;
  mobile)
    start_mobile
    log "Expo started. PID saved to /tmp/schoolify-mobile.pid"
    ;;
  migrate)
    ensure_env
    run_migrations
    ;;
  stop)
    log "Stopping all containers..."
    $COMPOSE down
    [[ -f /tmp/schoolify-frontend.pid ]] && kill "$(cat /tmp/schoolify-frontend.pid)" 2>/dev/null && rm /tmp/schoolify-frontend.pid || true
    [[ -f /tmp/schoolify-mobile.pid   ]] && kill "$(cat /tmp/schoolify-mobile.pid)"   2>/dev/null && rm /tmp/schoolify-mobile.pid   || true
    log "All stopped."
    ;;
  logs)
    $COMPOSE logs -f --tail=50
    ;;
  status)
    $COMPOSE ps
    echo ""
    log "Health check:"
    for port in 8000 8001 8002 8003 8004 8005 8006 8007 8008 8009 8010; do
      status=$(curl -sf "http://localhost:${port}/health" 2>/dev/null && echo "OK" || echo "DOWN")
      printf "  :%s  %s\n" "$port" "$status"
    done
    ;;
  *)
    echo "Usage: ./start.sh [all|infra|services|frontend|mobile|migrate|stop|logs|status]"
    exit 1
    ;;
esac
