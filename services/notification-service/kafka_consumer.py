"""
Kafka consumer for the notification service.
Runs as a background task alongside the FastAPI app.
Listens to all service events and triggers appropriate notifications.
"""
import asyncio
from ..shared.events import EventConsumer, SchoolifyEvent, Topics
from .service import NotificationService

NOTIFICATION_TOPICS = [
    Topics.ATTENDANCE_MARKED,
    Topics.LOW_ATTENDANCE_ALERT,
    Topics.FEE_INVOICE_CREATED,
    Topics.FEE_PAID,
    Topics.FEE_OVERDUE,
    Topics.ASSIGNMENT_PUBLISHED,
    Topics.SUBMISSION_GRADED,
    Topics.EXAM_RESULT_PUBLISHED,
    Topics.USER_CREATED,
]

notification_consumer = EventConsumer(
    topics=NOTIFICATION_TOPICS,
    group_id="notification-service-group",
)
notification_service = NotificationService()


async def start_consumer():
    """Start the Kafka consumer. Called from service lifespan."""
    await notification_consumer.start()
    # Run consumer in background
    asyncio.create_task(_consume_loop())


async def stop_consumer():
    """Stop the Kafka consumer."""
    await notification_consumer.stop()


async def _consume_loop():
    """Continuously consume messages from Kafka."""
    async def handle_event(event: SchoolifyEvent):
        # Note: In production, create a fresh DB session per event
        # Here simplified without DB session for brevity
        print(f"Processing event: {event.event_type} for tenant {event.tenant_id}")
        # await notification_service.process_event(event, db)

    await notification_consumer.consume(handle_event)
