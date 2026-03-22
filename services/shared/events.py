"""
Kafka event producer/consumer for async service communication.

Event-driven design decouples services:
  - AttendanceService marks attendance → publishes ATTENDANCE_MARKED
  - NotificationService consumes it → sends SMS/email to parents
  - No direct HTTP call between services, no tight coupling

Topics are partitioned by tenant_id for tenant-level ordering guarantees.
"""
import json
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

from aiokafka import AIOKafkaConsumer, AIOKafkaProducer

from .config import settings

# ── Event Topic Constants ──────────────────────────────────────────────────────
class Topics:
    USER_CREATED = "user.created"
    USER_UPDATED = "user.updated"
    STUDENT_ENROLLED = "student.enrolled"
    ATTENDANCE_MARKED = "attendance.marked"
    LOW_ATTENDANCE_ALERT = "attendance.low_alert"
    FEE_INVOICE_CREATED = "fee.invoice_created"
    FEE_PAID = "fee.paid"
    FEE_OVERDUE = "fee.overdue"
    ASSIGNMENT_PUBLISHED = "assignment.published"
    SUBMISSION_GRADED = "submission.graded"
    EXAM_RESULT_PUBLISHED = "exam.result_published"
    NOTIFICATION_SEND = "notification.send"
    REPORT_READY = "report.ready"


@dataclass
class SchoolifyEvent:
    """Base event schema. All Kafka messages follow this structure."""
    event_id: str
    event_type: str
    tenant_id: str
    payload: Dict[str, Any]
    timestamp: str
    version: str = "1.0"

    @classmethod
    def create(cls, event_type: str, tenant_id: str, payload: Dict[str, Any]):
        return cls(
            event_id=str(uuid.uuid4()),
            event_type=event_type,
            tenant_id=tenant_id,
            payload=payload,
            timestamp=datetime.utcnow().isoformat(),
        )

    def to_json(self) -> bytes:
        return json.dumps(asdict(self)).encode("utf-8")


class EventProducer:
    """
    Kafka producer wrapper.
    Each service creates one instance and reuses it across requests.
    """

    def __init__(self):
        self._producer: Optional[AIOKafkaProducer] = None

    async def start(self):
        self._producer = AIOKafkaProducer(
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            value_serializer=lambda v: v,  # We serialize ourselves
            compression_type="gzip",  # Compress messages for throughput
            acks="all",  # Wait for all replicas to acknowledge (durability)
            enable_idempotence=True,  # Prevent duplicate messages on retry
        )
        await self._producer.start()

    async def stop(self):
        if self._producer:
            await self._producer.stop()

    async def publish(
        self,
        topic: str,
        event_type: str,
        tenant_id: str,
        payload: Dict[str, Any],
    ):
        """
        Publish an event to a Kafka topic.
        Uses tenant_id as the partition key so events for the same tenant
        are always processed in order.
        """
        if not self._producer:
            raise RuntimeError("Producer not started. Call start() first.")

        event = SchoolifyEvent.create(event_type, tenant_id, payload)
        await self._producer.send(
            topic,
            value=event.to_json(),
            key=tenant_id.encode("utf-8"),  # Partition by tenant
        )
        return event.event_id


class EventConsumer:
    """Kafka consumer wrapper for background services (e.g., notification-service)."""

    def __init__(self, topics: List[str], group_id: str = settings.KAFKA_CONSUMER_GROUP):
        self.topics = topics
        self.group_id = group_id
        self._consumer: Optional[AIOKafkaConsumer] = None

    async def start(self):
        self._consumer = AIOKafkaConsumer(
            *self.topics,
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            group_id=self.group_id,
            auto_offset_reset="earliest",
            enable_auto_commit=True,
            value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        )
        await self._consumer.start()

    async def stop(self):
        if self._consumer:
            await self._consumer.stop()

    async def consume(self, handler: Callable[[SchoolifyEvent], None]):
        """Start consuming messages, calling handler for each."""
        async for msg in self._consumer:
            try:
                event = SchoolifyEvent(**msg.value)
                await handler(event)
            except Exception as e:
                print(f"Error processing event: {e}")  # Use proper logger in prod


# Singleton producer instance (started in service lifespan)
event_producer = EventProducer()
