output "vps_ip" {
  description = "Hetzner VPS IPv4 — add DNS A record: api.<domain> → this IP"
  value       = hcloud_server.schoolify.ipv4_address
}

output "neon_console_url" {
  description = "Neon database console"
  value       = "https://console.neon.tech/app/projects/${neon_project.schoolify.id}"
}

output "database_url" {
  description = "Neon Postgres connection string (sensitive)"
  value       = local.neon_db_url
  sensitive   = true
}

# ── Optional service outputs ───────────────────────────────────────────────────
# Each output is an empty string when the service is not provisioned.

output "upstash_redis_endpoint" {
  description = "Upstash Redis endpoint (empty if not provisioned)"
  value       = try("${upstash_redis_database.schoolify[0].endpoint}:${upstash_redis_database.schoolify[0].port}", "not provisioned")
}

output "s3_bucket_name" {
  description = "AWS S3 bucket name (empty if not provisioned)"
  value       = local.s3_bucket != "" ? local.s3_bucket : "not provisioned"
}

output "vercel_project_url" {
  description = "Vercel project dashboard (empty if not provisioned)"
  value       = try("https://vercel.com/${local.github_org}/${vercel_project.schoolify[0].name}", "not provisioned")
}

output "services_status" {
  description = "Which optional services were provisioned in this apply"
  value = {
    neon_postgres = "✅ provisioned"
    upstash_redis = local.redis_url != "" ? "✅ provisioned" : "⏭ skipped (no upstash_api_key)"
    aws_s3        = local.s3_bucket != "" ? "✅ provisioned" : "⏭ skipped (no aws_admin_access_key_id)"
    vercel        = var.vercel_api_token != "" ? "✅ provisioned" : "⏭ skipped (no vercel_api_token)"
  }
}

output "next_steps" {
  description = "Post-apply checklist"
  value       = <<-EOF

    ── Post-Apply Checklist ────────────────────────────────────────

    1. DNS  Add A record:
            api.${var.domain}  →  ${hcloud_server.schoolify.ipv4_address}

    2. Verify cloud-init finished:
            ssh root@${hcloud_server.schoolify.ipv4_address}
            tail -f /var/log/cloud-init-output.log

    3. Run DB migrations once:
            docker exec schoolify-api-gateway python -m alembic upgrade head

    4. To add a skipped service later:
            # Add its credentials to terraform.tfvars, then:
            ./deploy.sh

    5. Reveal DB connection string:
            terraform output -raw database_url
  EOF
}
