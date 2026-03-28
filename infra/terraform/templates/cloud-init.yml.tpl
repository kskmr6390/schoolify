#cloud-config
# Schoolify VPS bootstrap — runs once on first boot
# Progress: tail -f /var/log/cloud-init-output.log

package_update: true
package_upgrade: true

packages:
  - apt-transport-https
  - ca-certificates
  - curl
  - gnupg
  - fail2ban
  - ufw

write_files:

  # ── Production environment file ─────────────────────────────────────────────
  # Loaded by docker-compose.prod.yml via env_file directive.
  # Permissions 0600 — readable by root only.
  - path: /opt/schoolify/.env
    permissions: '0600'
    content: |
      # ── Deployment ──────────────────────────────────────────────
      GITHUB_REPO=${github_repo}
      IMAGE_TAG=latest
      GHCR_TOKEN=${ghcr_token}

      # ── Database (Neon serverless Postgres) ─────────────────────
      DATABASE_URL=${database_url}

      # ── Cache (Upstash Redis — TLS) ─────────────────────────────
      REDIS_URL=${redis_url}

      # ── Storage (AWS S3) ─────────────────────────────────────────
      AWS_ACCESS_KEY_ID=${s3_access_key_id}
      AWS_SECRET_ACCESS_KEY=${s3_secret_access_key}
      S3_BUCKET=${s3_bucket}
      S3_ENDPOINT_URL=${s3_endpoint}

      # ── App ──────────────────────────────────────────────────────
      SECRET_KEY=${secret_key}
      ENVIRONMENT=production
      DEBUG=false
      DOMAIN=${domain}
      CORS_ORIGINS=["https://${domain}","https://www.${domain}"]

      # ── AI (Anthropic Claude API) ────────────────────────────────
      ANTHROPIC_API_KEY=${anthropic_api_key}
      LLM_TYPE=anthropic
      FAISS_STORE_DIR=/app/faiss_indexes

      # ── OAuth ────────────────────────────────────────────────────
      GOOGLE_CLIENT_ID=${google_client_id}
      GOOGLE_CLIENT_SECRET=${google_client_secret}

      # ── Email ────────────────────────────────────────────────────
      SMTP_HOST=${smtp_host}
      SMTP_PORT=${smtp_port}
      SMTP_USER=${smtp_user}
      SMTP_PASSWORD=${smtp_password}
      FROM_EMAIL=noreply@${domain}

      # ── Monitoring (Grafana Cloud remote_write) ──────────────────
      GRAFANA_PROMETHEUS_URL=${grafana_prom_url}
      GRAFANA_API_KEY=${grafana_api_key}

  # ── Caddy reverse proxy config ──────────────────────────────────────────────
  # Auto-obtains Let's Encrypt TLS cert for api.<domain>.
  # api-gateway binds to 127.0.0.1:8000 (not exposed externally).
  - path: /etc/caddy/Caddyfile
    permissions: '0644'
    content: |
      api.${domain} {
        reverse_proxy localhost:8000

        header {
          Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
          X-Content-Type-Options    "nosniff"
          X-Frame-Options           "DENY"
          Referrer-Policy           "strict-origin-when-cross-origin"
          -Server
        }

        log {
          output file /var/log/caddy/access.log {
            roll_size     100mb
            roll_keep     7
            roll_keep_for 720h
          }
        }
      }

  # ── Systemd service: manages all microservices via docker compose ────────────
  - path: /etc/systemd/system/schoolify.service
    permissions: '0644'
    content: |
      [Unit]
      Description=Schoolify Microservices (Docker Compose)
      Documentation=https://github.com/${github_repo}
      Requires=docker.service
      After=docker.service network-online.target

      [Service]
      Type=oneshot
      RemainAfterExit=yes
      WorkingDirectory=/opt/schoolify
      ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d --remove-orphans --pull always
      ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down
      ExecReload=/usr/bin/docker compose -f docker-compose.prod.yml pull && \
                 /usr/bin/docker compose -f docker-compose.prod.yml up -d --remove-orphans
      TimeoutStartSec=600
      Restart=on-failure
      RestartSec=30

      [Install]
      WantedBy=multi-user.target

  # ── Daily auto-update: pulls latest images at 03:00 UTC ────────────────────
  - path: /etc/systemd/system/schoolify-update.service
    permissions: '0644'
    content: |
      [Unit]
      Description=Pull and redeploy latest Schoolify images

      [Service]
      Type=oneshot
      WorkingDirectory=/opt/schoolify
      EnvironmentFile=/opt/schoolify/.env
      ExecStartPre=/bin/sh -c 'echo "$GHCR_TOKEN" | docker login ghcr.io -u ${github_repo_owner} --password-stdin'
      ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml pull
      ExecStartPost=/usr/bin/docker compose -f docker-compose.prod.yml up -d --remove-orphans

  - path: /etc/systemd/system/schoolify-update.timer
    permissions: '0644'
    content: |
      [Unit]
      Description=Daily Schoolify image update

      [Timer]
      OnCalendar=*-*-* 03:00:00 UTC
      Persistent=true

      [Install]
      WantedBy=timers.target

runcmd:
  # ── Install Docker ──────────────────────────────────────────────────────────
  - install -m 0755 -d /etc/apt/keyrings
  - curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  - chmod a+r /etc/apt/keyrings/docker.asc
  - >-
    echo "deb [arch=$(dpkg --print-architecture)
    signed-by=/etc/apt/keyrings/docker.asc]
    https://download.docker.com/linux/ubuntu
    $(. /etc/os-release && echo $VERSION_CODENAME) stable"
    > /etc/apt/sources.list.d/docker.list
  - apt-get update -y
  - apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

  # ── Install Caddy (stable release via official Cloudsmith repo) ─────────────
  - curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  - curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt | tee /etc/apt/sources.list.d/caddy-stable.list
  - apt-get update -y
  - apt-get install -y caddy
  - mkdir -p /var/log/caddy

  # ── Harden SSH (disable password auth, keep key-only) ───────────────────────
  - sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
  - systemctl restart ssh

  # ── Fail2ban + UFW (belt-and-suspenders alongside Hetzner firewall) ─────────
  - systemctl enable fail2ban
  - systemctl start fail2ban
  - ufw --force enable
  - ufw allow 22/tcp
  - ufw allow 80/tcp
  - ufw allow 443/tcp

  # ── Start Docker ────────────────────────────────────────────────────────────
  - systemctl enable docker
  - systemctl start docker

  # ── Create project directories ───────────────────────────────────────────────
  - mkdir -p /opt/schoolify/faiss_indexes

  # ── Download production docker-compose from main branch ─────────────────────
  - >-
    curl -fsSL
    https://raw.githubusercontent.com/${github_repo}/master/docker/docker-compose.prod.yml
    -o /opt/schoolify/docker-compose.prod.yml

  # ── Enable and start everything ─────────────────────────────────────────────
  - systemctl daemon-reload
  - systemctl enable schoolify
  - systemctl enable schoolify-update.timer
  - systemctl start schoolify-update.timer
  - systemctl enable caddy
  - systemctl restart caddy
  - systemctl start schoolify
