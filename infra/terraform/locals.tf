locals {
  # ── Required: Neon Postgres (always provisioned) ───────────────────────────
  neon_db_url = "postgresql+asyncpg://${neon_project.schoolify.database_user}:${neon_project.schoolify.database_password}@${neon_project.schoolify.database_host}/${neon_project.schoolify.database_name}?ssl=require"

  # ── Optional: Upstash Redis ────────────────────────────────────────────────
  # try() catches the error when upstash_redis_database.schoolify has count=0.
  redis_url = try(
    "rediss://default:${upstash_redis_database.schoolify[0].password}@${upstash_redis_database.schoolify[0].endpoint}:${upstash_redis_database.schoolify[0].port}",
    ""
  )

  # ── Optional: AWS S3 ──────────────────────────────────────────────────────
  # Admin credentials are used directly by the app (no scoped IAM user needed).
  s3_access_key_id     = var.aws_admin_access_key_id
  s3_secret_access_key = var.aws_admin_secret_access_key
  s3_bucket            = try(aws_s3_bucket.schoolify[0].bucket, "")

  # ── Helpers ────────────────────────────────────────────────────────────────
  github_org = split("/", var.github_repo)[0]
}
