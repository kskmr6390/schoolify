# ── SSH Key ───────────────────────────────────────────────────────────────────

resource "hcloud_ssh_key" "schoolify" {
  name       = "schoolify-deploy-key"
  public_key = var.ssh_public_key
}

# ── Firewall ──────────────────────────────────────────────────────────────────

resource "hcloud_firewall" "schoolify" {
  name = "schoolify-fw"

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "80"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "443"
    source_ips = ["0.0.0.0/0", "::/0"]
  }
}

# ── VPS: Hetzner cx33 — 4 vCPU x86, 8 GB RAM ≈ €5.99/mo ────────────────────

resource "hcloud_server" "schoolify" {
  name         = "schoolify-vps"
  server_type  = "cx33"
  image        = "ubuntu-24.04"
  location     = var.server_location
  ssh_keys     = [hcloud_ssh_key.schoolify.id]
  firewall_ids = [hcloud_firewall.schoolify.id]

  # All optional values come from locals.tf.
  # locals.tf uses try() to return "" when a service is not provisioned —
  # the .env on the VPS will have empty values for those, and the services
  # handle missing config gracefully.
  user_data = templatefile("${path.module}/templates/cloud-init.yml.tpl", {
    domain               = var.domain
    database_url         = local.neon_db_url
    redis_url            = local.redis_url
    s3_access_key_id     = local.s3_access_key_id
    s3_secret_access_key = local.s3_secret_access_key
    s3_bucket            = local.s3_bucket
    s3_endpoint          = "" # empty = boto3 uses native AWS endpoint automatically
    secret_key           = var.secret_key
    anthropic_api_key    = var.anthropic_api_key
    google_client_id     = var.google_client_id
    google_client_secret = var.google_client_secret
    smtp_host            = var.smtp_host
    smtp_port            = tostring(var.smtp_port)
    smtp_user            = var.smtp_user
    smtp_password        = var.smtp_password
    github_repo          = var.github_repo
    grafana_prom_url     = var.grafana_cloud_prometheus_url
    grafana_api_key      = var.grafana_cloud_api_key
  })

  labels = {
    project = "schoolify"
    tier    = "tier1-vps"
  }

  lifecycle {
    prevent_destroy = false
    ignore_changes  = [user_data]
  }
}
