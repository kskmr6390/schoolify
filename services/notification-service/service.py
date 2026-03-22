"""
Notification service business logic.
Handles email (SMTP), SMS (Twilio), and push (FCM) delivery.
"""
import re
from datetime import datetime
from typing import Dict, List, Optional
from uuid import UUID

import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from jinja2 import Template
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from twilio.rest import Client as TwilioClient

from ..shared.config import settings
from ..shared.events import SchoolifyEvent, Topics
from .models import DeviceToken, Notification, NotificationChannel, NotificationStatus


class NotificationService:

    def __init__(self):
        self._twilio: Optional[TwilioClient] = None

    def _get_twilio(self) -> TwilioClient:
        if not self._twilio:
            self._twilio = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        return self._twilio

    async def send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        html_body: Optional[str] = None,
    ):
        """Send email via SMTP with TLS."""
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.FROM_EMAIL
        msg["To"] = to_email

        msg.attach(MIMEText(body, "plain"))
        if html_body:
            msg.attach(MIMEText(html_body, "html"))

        try:
            await aiosmtplib.send(
                msg,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER,
                password=settings.SMTP_PASSWORD,
                use_tls=False,
                start_tls=True,
            )
            return True
        except Exception as e:
            print(f"Email send failed: {e}")
            return False

    async def send_sms(self, to_number: str, message: str):
        """Send SMS via Twilio."""
        try:
            twilio = self._get_twilio()
            twilio.messages.create(
                body=message,
                from_=settings.TWILIO_FROM_NUMBER,
                to=to_number,
            )
            return True
        except Exception as e:
            print(f"SMS send failed: {e}")
            return False

    async def send_push(
        self,
        device_tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict] = None,
    ):
        """Send push notification via Firebase FCM."""
        try:
            import firebase_admin
            from firebase_admin import messaging
            if not firebase_admin._apps:
                firebase_admin.initialize_app()

            message = messaging.MulticastMessage(
                tokens=device_tokens,
                notification=messaging.Notification(title=title, body=body),
                data={str(k): str(v) for k, v in (data or {}).items()},
            )
            response = messaging.send_each_for_multicast(message)
            return response.success_count > 0
        except Exception as e:
            print(f"Push notification failed: {e}")
            return False

    def render_template(self, template_str: str, variables: Dict) -> str:
        """Render a Jinja2 template with provided variables."""
        template = Template(template_str)
        return template.render(**variables)

    async def create_in_app_notification(
        self,
        db: AsyncSession,
        tenant_id: UUID,
        user_id: UUID,
        title: str,
        body: str,
        metadata: Optional[Dict] = None,
    ) -> Notification:
        """Create an in-app notification record."""
        notification = Notification(
            tenant_id=tenant_id,
            user_id=user_id,
            channel=NotificationChannel.IN_APP,
            title=title,
            body=body,
            metadata=metadata or {},
            status=NotificationStatus.SENT,
            sent_at=datetime.utcnow(),
        )
        db.add(notification)
        return notification

    async def process_event(self, event: SchoolifyEvent, db: AsyncSession):
        """
        Process a Kafka event and trigger appropriate notifications.
        Each event type has its own notification template and recipients.
        """
        payload = event.payload
        event_type = event.event_type

        if event_type == "attendance.marked":
            await self._handle_attendance_marked(event, db)
        elif event_type == "fee.paid":
            await self._handle_fee_paid(event, db)
        elif event_type == "assignment.published":
            await self._handle_assignment_published(event, db)
        elif event_type == "submission.graded":
            await self._handle_submission_graded(event, db)
        elif event_type == "fee.invoice_created":
            await self._handle_invoice_created(event, db)

    async def _handle_attendance_marked(self, event: SchoolifyEvent, db: AsyncSession):
        """Notify parents of absent students."""
        absent_ids = event.payload.get("absent_student_ids", [])
        date_str = event.payload.get("date", "today")
        for student_id in absent_ids:
            # In production: look up parent contact info and send notification
            print(f"Notifying parent of absent student {student_id} on {date_str}")

    async def _handle_fee_paid(self, event: SchoolifyEvent, db: AsyncSession):
        """Send payment receipt to parent/student."""
        print(f"Sending payment receipt for invoice {event.payload.get('invoice_id')}")

    async def _handle_assignment_published(self, event: SchoolifyEvent, db: AsyncSession):
        """Notify students in class of new assignment."""
        print(f"Notifying students of new assignment in class {event.payload.get('class_id')}")

    async def _handle_submission_graded(self, event: SchoolifyEvent, db: AsyncSession):
        """Notify student that their submission was graded."""
        print(f"Notifying student {event.payload.get('student_id')} of graded submission")

    async def _handle_invoice_created(self, event: SchoolifyEvent, db: AsyncSession):
        """Notify parent/student of new invoice."""
        print(f"Notifying about new invoice {event.payload.get('invoice_id')}")
