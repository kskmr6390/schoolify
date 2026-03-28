#!/usr/bin/env bash
# Load fixture / seed data into the Schoolify Neon Postgres database.
#
# Usage:
#   ./scripts/load-fixtures.sh analytics          # Greenwood High School (50 students)
#   ./scripts/load-fixtures.sh sbm                # SBM International School (210 records)
#   ./scripts/load-fixtures.sh all                # both tenants
#
#   # Override DB URL manually (skips terraform output):
#   DATABASE_URL="postgresql://user:pass@host/db?sslmode=require" \
#     ./scripts/load-fixtures.sh analytics
#
# Requires: python3, pip, psycopg2-binary, bcrypt

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SEED="${1:-analytics}"

# ── Resolve DATABASE_URL ───────────────────────────────────────────────────────
if [ -z "${DATABASE_URL:-}" ]; then
  echo "→ Fetching database URL from terraform output..."
  RAW_URL=$(cd "$REPO_ROOT/infra/terraform" && terraform output -raw database_url 2>/dev/null || true)
  if [ -z "$RAW_URL" ]; then
    echo "ERROR: Could not get database_url from terraform output."
    echo "       Set it manually: DATABASE_URL='postgresql://...' $0 $SEED"
    exit 1
  fi
  # Convert postgresql+asyncpg://...?ssl=require → postgresql://...?sslmode=require
  DATABASE_URL="${RAW_URL/postgresql+asyncpg:\/\//postgresql://}"
  DATABASE_URL="${DATABASE_URL/?ssl=require/?sslmode=require}"
fi

export DATABASE_URL

echo "→ Installing dependencies..."
pip install -q psycopg2-binary bcrypt

echo ""
echo "┌─ Schoolify load-fixtures ──────────────────────────────────┐"
echo "│  Seed: $SEED"
echo "│  DB:   $(echo "$DATABASE_URL" | sed 's|//.*@|//***@|')"
echo "└────────────────────────────────────────────────────────────┘"
echo ""

cd "$REPO_ROOT"

run_seed() {
  local seed="$1"
  case "$seed" in
    analytics)
      python3 - <<'PYEOF'
import os, sys
sys.path.insert(0, ".")
import scripts.seed_analytics as m
db = os.environ["DATABASE_URL"]
m.DB = db
m.run()
PYEOF
      ;;
    sbm)
      python3 - <<'PYEOF'
import os, sys
sys.path.insert(0, ".")
import scripts.seed_sbm as m
db = os.environ["DATABASE_URL"]
m.DB_DSN = db
m.run()
PYEOF
      ;;
    *)
      echo "ERROR: Unknown seed '$seed'. Use 'analytics', 'sbm', or 'all'."
      exit 1
      ;;
  esac
}

if [ "$SEED" = "all" ]; then
  run_seed analytics
  echo ""
  run_seed sbm
else
  run_seed "$SEED"
fi
