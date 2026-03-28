# ── OPTIONAL SERVICE: Upstash Redis ───────────────────────────────────────────
# This file is managed by deploy.sh — do not rename manually.
# When upstash_api_key is empty in terraform.tfvars, deploy.sh disables this file.
#
# Note: Upstash shut down their Kafka product in 2025. Only Redis is provisioned.
# Free tier: Redis 256 MB / 10k cmd/day
# Without Redis: JWT blocklist falls back to DB; caching disabled.

provider "upstash" {
  email   = var.upstash_email
  api_key = var.upstash_api_key
}

# ── Redis ─────────────────────────────────────────────────────────────────────

resource "upstash_redis_database" "schoolify" {
  count          = var.upstash_api_key != "" ? 1 : 0
  database_name  = "schoolify-redis"
  region         = "global"
  primary_region = var.upstash_region
  tls            = true
  eviction       = true
}
