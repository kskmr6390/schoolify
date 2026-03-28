#!/usr/bin/env bash
# Schoolify Tier 1 — Smart deploy script
#
# Reads terraform.tfvars to detect which services are configured,
# then enables/disables their .tf files BEFORE running terraform.
# This prevents provider auth errors when credentials are missing.
#
# Usage:
#   ./deploy.sh              # terraform plan, then apply (prompts for confirmation)
#   ./deploy.sh plan         # terraform plan only (no apply)
#   ./deploy.sh -auto-approve  # plan + apply without confirmation prompt

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

TFVARS="terraform.tfvars"

if [ ! -f "$TFVARS" ]; then
  echo "ERROR: terraform.tfvars not found."
  echo "       cp terraform.tfvars.example terraform.tfvars  then fill it in."
  exit 1
fi

# ── Helper: check if a variable is set (non-empty) in terraform.tfvars ────────
is_set() {
  local key="$1"
  # matches: key = "non-empty-value"  (ignores empty strings and comments)
  grep -qE "^[[:space:]]*${key}[[:space:]]*=[[:space:]]*\"[^\"]+\"" "$TFVARS"
}

# ── Helper: enable or disable an optional service file ────────────────────────
toggle_service() {
  local file="$1"    # e.g. "upstash"
  local key="$2"     # variable name that signals this service is configured
  local label="$3"   # human-readable name

  if is_set "$key"; then
    if [ -f "${file}.tf.disabled" ]; then
      mv "${file}.tf.disabled" "${file}.tf"
      echo "  ✅  ${label}: enabled (credentials found)"
    else
      echo "  ✅  ${label}: already enabled"
    fi
  else
    if [ -f "${file}.tf" ]; then
      mv "${file}.tf" "${file}.tf.disabled"
      echo "  ⏭   ${label}: disabled (no ${key} in tfvars)"
    else
      echo "  ⏭   ${label}: already disabled"
    fi
  fi
}

echo ""
echo "┌─ Schoolify deploy ─────────────────────────────────────────┐"
echo "│  Detecting configured services from terraform.tfvars ...   │"
echo "└────────────────────────────────────────────────────────────┘"
echo ""

# Required — always on
echo "  ✅  Hetzner VPS:     required"
echo "  ✅  Neon Postgres:   required"

# Optional — enable/disable based on tfvars
toggle_service "upstash"   "upstash_api_key"         "Upstash Redis"
toggle_service "s3"        "aws_admin_access_key_id"  "AWS S3 (storage)"
toggle_service "vercel"    "vercel_api_token"         "Vercel (frontend)"

echo ""

# ── Run terraform ─────────────────────────────────────────────────────────────
echo "Running: terraform init -upgrade"
terraform init -upgrade

echo ""

echo "Running: terraform plan"
terraform plan

echo ""

if [ "${1:-}" = "plan" ]; then
  echo "Plan complete. Re-run without 'plan' to apply."
else
  echo "Running: terraform apply $*"
  terraform apply "$@"
  echo ""
  echo "Done. Run 'terraform output services_status' to see what was provisioned."
fi
