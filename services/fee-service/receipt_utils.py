"""
Receipt generation utilities:
  - generate_receipt_pdf  → returns bytes (in-memory PDF via reportlab)
  - upload_to_s3          → uploads PDF bytes, returns public URL
  - send_receipt_email    → sends email with PDF attachment via SMTP
"""
import io
import smtplib
import uuid
from datetime import datetime
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable,
)

from ..shared.config import settings


# ── PDF Generation ─────────────────────────────────────────────────────────────

def generate_receipt_pdf(receipt: dict, invoices: list[dict], school_name: str) -> bytes:
    """
    Build a clean A4 fee-receipt PDF.
    receipt  → dict with receipt_number, total_amount, paid_amount, created_at, notes
    invoices → list of dicts with invoice_number, issued_date, total_amount, paid_amount, items[]
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm,
    )
    styles = getSampleStyleSheet()
    indigo = colors.HexColor("#4F46E5")
    gray   = colors.HexColor("#6B7280")
    light  = colors.HexColor("#F3F4F6")

    heading  = ParagraphStyle("heading",  parent=styles["Heading1"],   textColor=indigo, fontSize=20, spaceAfter=2)
    sub      = ParagraphStyle("sub",      parent=styles["Normal"],     textColor=gray,   fontSize=9)
    bold_sm  = ParagraphStyle("bold_sm",  parent=styles["Normal"],     fontName="Helvetica-Bold", fontSize=9)
    normal_s = ParagraphStyle("normal_s", parent=styles["Normal"],     fontSize=9)
    right_b  = ParagraphStyle("right_b",  parent=styles["Normal"],     fontName="Helvetica-Bold", fontSize=10, alignment=2)

    student_name = receipt.get("student_name", "Student")
    student_code = receipt.get("student_code", "")
    receipt_no   = receipt.get("receipt_number", "")
    created_at   = receipt.get("created_at", datetime.utcnow().isoformat())
    if isinstance(created_at, datetime):
        created_at = created_at.strftime("%d %b %Y")
    elif "T" in str(created_at):
        try:
            created_at = datetime.fromisoformat(str(created_at).split(".")[0]).strftime("%d %b %Y")
        except Exception:
            pass

    total_amt = float(receipt.get("total_amount", 0))
    paid_amt  = float(receipt.get("paid_amount",  0))
    balance   = total_amt - paid_amt

    story = []

    # ── Header ──────────────────────────────────────────────────────────────
    story.append(Paragraph(school_name, heading))
    story.append(Paragraph("Fee Receipt", ParagraphStyle("rcpt", parent=styles["Normal"],
        fontName="Helvetica-Bold", fontSize=13, textColor=gray, spaceAfter=2)))
    story.append(HRFlowable(width="100%", thickness=1, color=indigo, spaceAfter=8))

    # Receipt meta table
    meta = [
        [Paragraph("Receipt No.", bold_sm),   Paragraph(receipt_no, normal_s),
         Paragraph("Date",        bold_sm),   Paragraph(str(created_at), normal_s)],
        [Paragraph("Student",     bold_sm),   Paragraph(student_name, normal_s),
         Paragraph("Roll / Code", bold_sm),   Paragraph(student_code, normal_s)],
    ]
    meta_tbl = Table(meta, colWidths=[3*cm, 6*cm, 3*cm, 5*cm])
    meta_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), light),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [light, colors.white]),
        ("GRID",    (0, 0), (-1, -1), 0.25, colors.HexColor("#E5E7EB")),
        ("PADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(meta_tbl)
    story.append(Spacer(1, 10))

    # ── Invoice line items ───────────────────────────────────────────────────
    for inv in invoices:
        inv_hdr = [
            Paragraph(f"Invoice {inv.get('invoice_number', '')}", bold_sm),
            Paragraph(f"Issued: {inv.get('issued_date', '')}", sub),
            Paragraph(f"Due: {inv.get('due_date', '')}", sub),
        ]
        story.append(Table([inv_hdr], colWidths=[7*cm, 4.5*cm, 4.5*cm]))
        story.append(Spacer(1, 3))

        items = inv.get("items", [])
        if items:
            rows = [[
                Paragraph("Description", bold_sm),
                Paragraph("Qty", bold_sm),
                Paragraph("Amount (₹)", bold_sm),
            ]]
            for it in items:
                rows.append([
                    Paragraph(str(it.get("description", "")), normal_s),
                    Paragraph(str(it.get("quantity", 1)),     normal_s),
                    Paragraph(f"₹ {float(it.get('amount', 0)):,.2f}", normal_s),
                ])
            tbl = Table(rows, colWidths=[10*cm, 2*cm, 4*cm])
            tbl.setStyle(TableStyle([
                ("BACKGROUND",  (0, 0), (-1, 0), indigo),
                ("TEXTCOLOR",   (0, 0), (-1, 0), colors.white),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, light]),
                ("GRID",        (0, 0), (-1, -1), 0.25, colors.HexColor("#E5E7EB")),
                ("PADDING",     (0, 0), (-1, -1), 4),
                ("ALIGN",       (1, 0), (-1, -1), "RIGHT"),
            ]))
            story.append(tbl)
            story.append(Spacer(1, 6))

    # ── Totals ───────────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=0.5, color=gray))
    story.append(Spacer(1, 4))
    totals = [
        ["",  "", Paragraph("Total Invoiced", bold_sm),  Paragraph(f"₹ {total_amt:,.2f}", right_b)],
        ["",  "", Paragraph("Amount Paid",    bold_sm),  Paragraph(f"₹ {paid_amt:,.2f}",  right_b)],
        ["",  "", Paragraph("Balance Due",    ParagraphStyle("bd", parent=styles["Normal"],
            fontName="Helvetica-Bold", fontSize=10,
            textColor=colors.HexColor("#EF4444") if balance > 0 else colors.HexColor("#22C55E"))),
         Paragraph(f"₹ {balance:,.2f}",
            ParagraphStyle("bd2", parent=styles["Normal"], fontSize=10, alignment=2,
                textColor=colors.HexColor("#EF4444") if balance > 0 else colors.HexColor("#22C55E"),
                fontName="Helvetica-Bold"))],
    ]
    tot_tbl = Table(totals, colWidths=[4*cm, 4*cm, 5*cm, 4*cm])
    tot_tbl.setStyle(TableStyle([("PADDING", (0, 0), (-1, -1), 3)]))
    story.append(tot_tbl)
    story.append(Spacer(1, 8))

    if receipt.get("notes"):
        story.append(Paragraph(f"Notes: {receipt['notes']}", sub))
        story.append(Spacer(1, 6))

    story.append(HRFlowable(width="100%", thickness=0.5, color=indigo))
    story.append(Spacer(1, 4))
    story.append(Paragraph("This is a computer-generated receipt.", sub))
    story.append(Paragraph(school_name, sub))

    doc.build(story)
    return buf.getvalue()


# ── S3 Upload ──────────────────────────────────────────────────────────────────

def upload_pdf_to_s3(
    pdf_bytes: bytes,
    tenant_id: str,
    receipt_number: str,
) -> str:
    """
    Uploads PDF bytes to S3 and returns a public (or presigned) URL.
    Falls back to local path string if S3 is not configured.
    """
    if not settings.AWS_ACCESS_KEY_ID:
        # S3 not configured — return a placeholder path
        return f"/receipts/{tenant_id}/{receipt_number}.pdf"

    try:
        import boto3
        from botocore.config import Config

        kwargs: dict = dict(
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
            config=Config(signature_version="s3v4"),
        )
        if settings.S3_ENDPOINT_URL:
            kwargs["endpoint_url"] = settings.S3_ENDPOINT_URL

        s3 = boto3.client("s3", **kwargs)
        key = f"receipts/{tenant_id}/{receipt_number}.pdf"
        s3.put_object(
            Bucket=settings.S3_BUCKET,
            Key=key,
            Body=pdf_bytes,
            ContentType="application/pdf",
        )
        # Generate a 7-day presigned URL
        url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.S3_BUCKET, "Key": key},
            ExpiresIn=7 * 24 * 3600,
        )
        return url
    except Exception as exc:
        raise RuntimeError(f"S3 upload failed: {exc}") from exc


# ── Email ──────────────────────────────────────────────────────────────────────

def send_receipt_email(
    to_email: str,
    student_name: str,
    receipt_number: str,
    school_name: str,
    pdf_bytes: bytes,
    pdf_url: Optional[str] = None,
) -> None:
    """
    Send fee receipt as email attachment via SMTP.
    Skips silently if SMTP is not configured.
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        return  # SMTP not configured

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Fee Receipt {receipt_number} – {school_name}"
    msg["From"]    = settings.FROM_EMAIL
    msg["To"]      = to_email

    view_link = f'<a href="{pdf_url}">View / Download Receipt</a>' if pdf_url else ""
    html_body = f"""
    <html><body style="font-family:Arial,sans-serif;color:#374151">
      <div style="max-width:600px;margin:auto;padding:24px">
        <h2 style="color:#4F46E5">{school_name}</h2>
        <p>Dear <strong>{student_name}</strong>,</p>
        <p>Please find your fee receipt <strong>{receipt_number}</strong> attached to this email.</p>
        {f'<p>{view_link}</p>' if view_link else ''}
        <p style="color:#6B7280;font-size:12px;margin-top:32px">
          This is an automated message. Please do not reply.
        </p>
      </div>
    </body></html>
    """
    msg.attach(MIMEText(html_body, "html"))

    # Attach PDF
    part = MIMEBase("application", "pdf")
    part.set_payload(pdf_bytes)
    encoders.encode_base64(part)
    part.add_header("Content-Disposition", f'attachment; filename="{receipt_number}.pdf"')
    msg.attach(part)

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        smtp.sendmail(settings.FROM_EMAIL, to_email, msg.as_string())
