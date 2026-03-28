# ── Hetzner Cloud ─────────────────────────────────────────────────────────────

variable "hetzner_api_token" {
  description = "Hetzner Cloud API token — create at console.hetzner.com → Security → API Tokens"
  type        = string
  sensitive   = true
}

variable "ssh_public_key" {
  description = "SSH public key content to install on VPS (e.g. contents of ~/.ssh/id_ed25519.pub)"
  type        = string
}

variable "domain" {
  description = "Root domain (e.g. schoolify.app). API will be served at api.<domain>"
  type        = string
}

variable "server_location" {
  description = "Hetzner datacenter location: nbg1=Nuremberg, fsn1=Falkenstein, hel1=Helsinki, ash=Ashburn"
  type        = string
  default     = "nbg1"
}

# ── Neon Postgres ─────────────────────────────────────────────────────────────

variable "neon_api_key" {
  description = "Neon API key — create at console.neon.tech → Account → API Keys"
  type        = string
  sensitive   = true
}

variable "neon_org_id" {
  description = "Neon organization ID — find at console.neon.tech → Settings → Organization"
  type        = string
  default     = ""
}

variable "neon_region" {
  description = "Neon region — pick closest to your Hetzner location"
  type        = string
  default     = "aws-eu-central-1" # Frankfurt (pair with nbg1/fsn1/hel1)
  # Other options: aws-us-east-1, aws-us-east-2, aws-us-west-2, aws-ap-southeast-1
}

# ── Upstash (Kafka + Redis) ───────────────────────────────────────────────────

variable "upstash_email" {
  description = "Upstash account email — from console.upstash.com → Account (optional)"
  type        = string
  default     = ""
}

variable "upstash_api_key" {
  description = "Upstash API key — from console.upstash.com → Account → Management API (optional)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "upstash_region" {
  description = "Upstash region for Kafka and Redis"
  type        = string
  default     = "eu-west-1" # Ireland (closest to Hetzner nbg1)
  # Other options: us-east-1, us-west-1, ap-southeast-1, ap-northeast-1
}

# ── AWS S3 (object storage) ───────────────────────────────────────────────────
# Terraform needs admin AWS credentials to create the S3 bucket and IAM user.
# The app itself uses a scoped IAM access key that Terraform creates and outputs.

variable "aws_admin_access_key_id" {
  description = "AWS IAM access key ID with S3 + IAM permissions — for Terraform to provision storage (optional)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "aws_admin_secret_access_key" {
  description = "AWS IAM secret access key (optional)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "aws_region" {
  description = "AWS region for the S3 bucket — pick closest to your Hetzner VPS"
  type        = string
  default     = "eu-central-1" # Frankfurt — closest to nbg1
}

variable "s3_bucket_name" {
  description = "S3 bucket name — must be globally unique across all AWS accounts"
  type        = string
  default     = "schoolify-uploads"
}

# ── Vercel ────────────────────────────────────────────────────────────────────

variable "vercel_api_token" {
  description = "Vercel API token — create at vercel.com → Settings → Tokens (optional)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "vercel_team_id" {
  description = "Vercel team ID for organization accounts (leave empty for personal account)"
  type        = string
  default     = ""
}

variable "github_repo" {
  description = "GitHub repository in 'owner/name' format (e.g. acme/schoolify) — used for Vercel git integration and GHCR image pulls"
  type        = string
}

variable "ghcr_token" {
  description = "GitHub PAT with read:packages scope — allows VPS to pull private GHCR images. Create at github.com → Settings → Developer settings → Personal access tokens"
  type        = string
  sensitive   = true
  default     = ""
}

# ── App Secrets ───────────────────────────────────────────────────────────────

variable "secret_key" {
  description = "JWT signing secret — generate with: python -c \"import secrets; print(secrets.token_hex(32))\""
  type        = string
  sensitive   = true
}

variable "anthropic_api_key" {
  description = "Anthropic API key for AI Copilot — from console.anthropic.com"
  type        = string
  sensitive   = true
  default     = ""
}

variable "google_client_id" {
  description = "Google OAuth2 client ID for SSO (optional)"
  type        = string
  default     = ""
}

variable "google_client_secret" {
  description = "Google OAuth2 client secret (optional)"
  type        = string
  sensitive   = true
  default     = ""
}

# ── SMTP ──────────────────────────────────────────────────────────────────────

variable "smtp_host" {
  description = "SMTP server hostname — recommended: smtp.resend.com (3000 free emails/mo)"
  type        = string
  default     = ""
}

variable "smtp_port" {
  description = "SMTP port (587 for STARTTLS, 465 for SSL)"
  type        = number
  default     = 465
}

variable "smtp_user" {
  description = "SMTP username"
  type        = string
  default     = ""
}

variable "smtp_password" {
  description = "SMTP password / API key"
  type        = string
  sensitive   = true
  default     = ""
}

# ── Grafana Cloud (optional monitoring) ───────────────────────────────────────

variable "grafana_cloud_prometheus_url" {
  description = "Grafana Cloud Prometheus remote_write URL (optional) — from grafana.com → My Account → Prometheus Details"
  type        = string
  default     = ""
}

variable "grafana_cloud_api_key" {
  description = "Grafana Cloud API key for Prometheus remote_write (optional)"
  type        = string
  sensitive   = true
  default     = ""
}
