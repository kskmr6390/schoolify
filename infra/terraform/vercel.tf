# ── OPTIONAL SERVICE: Vercel (Next.js frontend) ───────────────────────────────
# This file is managed by deploy.sh — do not rename manually.
# When vercel_api_token is empty, deploy.sh disables this file.
#
# Free tier: 100 GB bandwidth, unlimited deploys — $0
# Without Vercel: deploy the frontend manually (npm run build + any static host).

provider "vercel" {
  api_token = var.vercel_api_token
  team      = var.vercel_team_id != "" ? var.vercel_team_id : null
}

resource "vercel_project" "schoolify" {
  count     = var.vercel_api_token != "" ? 1 : 0
  name      = "schoolify-web"
  framework = "nextjs"

  git_repository = {
    type              = "github"
    repo              = var.github_repo
    production_branch = "master"
  }

  root_directory   = "frontend/web"
  install_command  = "npm ci"
  build_command    = "npm run build"
  output_directory = ".next"
}

resource "vercel_project_environment_variable" "api_url_production" {
  count      = var.vercel_api_token != "" ? 1 : 0
  project_id = vercel_project.schoolify[0].id
  key        = "NEXT_PUBLIC_API_URL"
  value      = "https://api.${var.domain}"
  target     = ["production"]
}

resource "vercel_project_environment_variable" "api_url_preview" {
  count      = var.vercel_api_token != "" ? 1 : 0
  project_id = vercel_project.schoolify[0].id
  key        = "NEXT_PUBLIC_API_URL"
  value      = "https://api.${var.domain}"
  target     = ["preview"]
}

resource "vercel_project_environment_variable" "app_url_production" {
  count      = var.vercel_api_token != "" ? 1 : 0
  project_id = vercel_project.schoolify[0].id
  key        = "NEXT_PUBLIC_APP_URL"
  value      = "https://${var.domain}"
  target     = ["production"]
}

resource "vercel_project_environment_variable" "app_url_preview" {
  count      = var.vercel_api_token != "" ? 1 : 0
  project_id = vercel_project.schoolify[0].id
  key        = "NEXT_PUBLIC_APP_URL"
  value      = "https://preview.${var.domain}"
  target     = ["preview"]
}
