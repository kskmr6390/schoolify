# Neon — serverless Postgres that scales to zero when idle
#
# Free tier : 0.5 GB storage, 1 shared compute unit, 1 project
# Pro ($19) : 10 GB storage, autoscaling 0.25–10 CU, branching, PITR
#
# Connection string built in locals.tf → local.neon_db_url
# Format: postgresql+asyncpg://user:pass@host/db?ssl=require

resource "neon_project" "schoolify" {
  name                       = "schoolify"
  region_id                  = var.neon_region
  pg_version                 = 16
  org_id                     = var.neon_org_id != "" ? var.neon_org_id : null
  history_retention_seconds  = 21600  # 6 hours — free tier maximum

  default_endpoint_settings {
    # Autoscale from 0.25 CU (idle) to 1 CU (under load)
    # 1 CU = 1 vCPU + 4 GB RAM
    autoscaling_limit_min_cu = 0.25
    autoscaling_limit_max_cu = 1
  }

  quota {
    # Safety cap — raise to 0 (unlimited) once you have paying customers
    # Prevents runaway bills during early testing
    active_time_seconds = 432000 # 120 hours/month
  }
}
