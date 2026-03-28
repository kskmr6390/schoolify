# ── OPTIONAL SERVICE: AWS S3 (object storage) ─────────────────────────────────
# This file is managed by deploy.sh — do not rename manually.
# When aws_admin_access_key_id is empty, deploy.sh disables this file.
#
# Cost: 5 GB free (12 months) → ~$0.023/GB storage + $0.09/GB egress after that
# Without S3: file uploads (student bulk import, attachments) are disabled.
#             Core app (auth, attendance, fees, assignments) still works fully.
#
# Note: admin credentials are used directly by the app (no scoped IAM user is
# created so no iam:CreateUser permission is needed).

provider "aws" {
  region     = var.aws_region
  access_key = var.aws_admin_access_key_id
  secret_key = var.aws_admin_secret_access_key
}

# ── S3 Bucket ─────────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "schoolify" {
  count  = var.aws_admin_access_key_id != "" ? 1 : 0
  bucket = var.s3_bucket_name

  tags = {
    project = "schoolify"
    tier    = "tier1-vps"
  }
}

# Block all public access — files served via presigned URLs only
resource "aws_s3_bucket_public_access_block" "schoolify" {
  count  = var.aws_admin_access_key_id != "" ? 1 : 0
  bucket = aws_s3_bucket.schoolify[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
