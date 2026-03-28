#!/usr/bin/env bash
# Deploy latest Docker images to the Schoolify production VPS.
#
# Usage:
#   ./scripts/deploy-prod.sh               # deploy latest images
#   ./scripts/deploy-prod.sh --migrate     # deploy + run DB migrations
#   ./scripts/deploy-prod.sh <vps_ip>      # override VPS IP manually
#
# Requires: terraform (to read VPS IP) or pass IP as argument.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="/opt/schoolify/docker-compose.prod.yml"

# ── Resolve VPS IP ─────────────────────────────────────────────────────────────
MIGRATE=false
VPS_IP=""

for arg in "$@"; do
  case "$arg" in
    --migrate) MIGRATE=true ;;
    *)         VPS_IP="$arg" ;;
  esac
done

if [ -z "$VPS_IP" ]; then
  VPS_IP=$(cd "$REPO_ROOT/infra/terraform" && terraform output -raw vps_ip 2>/dev/null || true)
fi

if [ -z "$VPS_IP" ]; then
  echo "ERROR: VPS IP not found."
  echo "       Run from infra/terraform/: terraform output vps_ip"
  echo "       Or pass it directly:       ./scripts/deploy-prod.sh <vps_ip>"
  exit 1
fi

echo ""
echo "┌─ Schoolify deploy-prod ────────────────────────────────────┐"
echo "│  VPS: $VPS_IP"
echo "└────────────────────────────────────────────────────────────┘"
echo ""

SSH="ssh -o StrictHostKeyChecking=no root@$VPS_IP"
SCP="scp -o StrictHostKeyChecking=no"

# ── Sync docker-compose.prod.yml ───────────────────────────────────────────────
echo "→ Syncing docker-compose.prod.yml..."
$SSH "mkdir -p /opt/schoolify/faiss_indexes"
$SCP "$REPO_ROOT/docker/docker-compose.prod.yml" "root@$VPS_IP:$COMPOSE_FILE"
$SCP "$REPO_ROOT/docker/prometheus.prod.yml" "root@$VPS_IP:/opt/schoolify/prometheus.prod.yml"

# ── GHCR login (needed for private packages) ──────────────────────────────────
# Set GHCR_TOKEN env var locally, or store it in /opt/schoolify/.env on the VPS
# as GHCR_TOKEN=<your-github-pat-with-read:packages-scope>
if [ -n "${GHCR_TOKEN:-}" ]; then
  echo "→ Logging in to GHCR..."
  $SSH "echo '$GHCR_TOKEN' | docker login ghcr.io -u kskmr6390 --password-stdin"
else
  # Try to read token stored on the VPS itself
  $SSH "grep -q GHCR_TOKEN /opt/schoolify/.env 2>/dev/null && \
    source /opt/schoolify/.env && \
    echo \"\$GHCR_TOKEN\" | docker login ghcr.io -u kskmr6390 --password-stdin" 2>/dev/null || true
fi

# ── Pull latest images ─────────────────────────────────────────────────────────
echo "→ Pulling latest images..."
$SSH "docker compose -f $COMPOSE_FILE pull"

# ── Restart services ───────────────────────────────────────────────────────────
echo "→ Restarting services..."
$SSH "docker compose -f $COMPOSE_FILE up -d --remove-orphans"

# ── Run migrations (optional) ──────────────────────────────────────────────────
if $MIGRATE; then
  echo "→ Running DB migrations..."
  $SSH "docker exec schoolify-api-gateway python -m alembic upgrade head"
  echo "  ✓ Migrations done"
fi

# ── Prune old images ───────────────────────────────────────────────────────────
echo "→ Pruning unused images..."
$SSH "docker image prune -f" > /dev/null

# ── Show status ────────────────────────────────────────────────────────────────
echo ""
echo "✓ Deployed. Service status:"
$SSH "docker compose -f $COMPOSE_FILE ps --format 'table {{.Name}}\t{{.Status}}'"
echo ""
echo "Logs: ssh root@$VPS_IP 'docker compose -f $COMPOSE_FILE logs -f --tail=50'"
