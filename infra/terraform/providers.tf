terraform {
  required_version = ">= 1.5"  # compatible with Terraform 1.5.7+

  required_providers {
    # ── Required (always needed) ──────────────────────────────────────────────
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.47"
    }
    neon = {
      source  = "kislerdm/neon"
      version = "~> 0.6"
    }
    # ── Optional (provider + resources live in their own .tf file) ────────────
    # These are downloaded by `terraform init` regardless, but only *configured*
    # (and their API auth called) when their .tf file is present and active.
    upstash = {
      source  = "upstash/upstash"
      version = "~> 2.1"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "~> 1.11"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
  }
}

# ── Required providers (always configured) ────────────────────────────────────
provider "hcloud" {
  token = var.hetzner_api_token
}

provider "neon" {
  api_key = var.neon_api_key
}

# Optional provider blocks (upstash, vercel, aws) live in their own service files.
# This way disabling a file removes both the provider config AND its resources —
# preventing auth errors when credentials aren't available yet.
