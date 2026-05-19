"""Add notifications, chat, awards, user/staff profiles, parent-student links

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-25 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── PostgreSQL enum types ─────────────────────────────────────────────────
    op.execute("CREATE TYPE IF NOT EXISTS notificationchannel AS ENUM ('email', 'sms', 'push', 'in_app')")
    op.execute("CREATE TYPE IF NOT EXISTS notificationstatus  AS ENUM ('pending', 'sent', 'failed', 'delivered')")
    op.execute("CREATE TYPE IF NOT EXISTS gender              AS ENUM ('male', 'female', 'other', 'prefer_not_to_say')")

    # ── Notification Templates ────────────────────────────────────────────────
    op.create_table(
        'notification_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('channel', sa.String(20), nullable=False),
        sa.Column('subject', sa.String(255), nullable=True),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('variables', postgresql.JSONB(), server_default='[]', nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('is_system', sa.Boolean(), server_default='false', nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_notification_templates_tenant_id', 'notification_templates', ['tenant_id'])

    # ── Notifications ─────────────────────────────────────────────────────────
    op.create_table(
        'notifications',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('channel', sa.String(20), server_default='in_app', nullable=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.Column('extra_data', postgresql.JSONB(), server_default='{}', nullable=True),
        sa.Column('status', sa.String(20), server_default='pending', nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_notifications_tenant_id', 'notifications', ['tenant_id'])
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])

    # ── Notification Preferences ──────────────────────────────────────────────
    op.create_table(
        'notification_preferences',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email_enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('sms_enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('push_enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('in_app_enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('event_preferences', postgresql.JSONB(), server_default='{}', nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_notification_preferences_tenant_id', 'notification_preferences', ['tenant_id'])
    op.create_index('ix_notification_preferences_user_id', 'notification_preferences', ['user_id'])

    # ── Device Tokens ─────────────────────────────────────────────────────────
    op.create_table(
        'device_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('token', sa.String(500), nullable=False),
        sa.Column('platform', sa.String(10), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('last_used_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_device_tokens_tenant_id', 'device_tokens', ['tenant_id'])
    op.create_index('ix_device_tokens_user_id', 'device_tokens', ['user_id'])

    # ── Chat Conversations ────────────────────────────────────────────────────
    op.create_table(
        'chat_conversations',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('type', sa.String(10), server_default='direct', nullable=False),
        sa.Column('name', sa.String(200), nullable=True),
        sa.Column('participants', postgresql.JSONB(), server_default='[]', nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_chat_conversations_tenant_id', 'chat_conversations', ['tenant_id'])

    # ── Chat Messages ─────────────────────────────────────────────────────────
    op.create_table(
        'chat_messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('conversation_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('sender_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('sender_name', sa.String(200), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('type', sa.String(20), server_default='text', nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_chat_messages_tenant_id', 'chat_messages', ['tenant_id'])
    op.create_index('ix_chat_messages_conversation_id', 'chat_messages', ['conversation_id'])

    # ── Awards ────────────────────────────────────────────────────────────────
    op.create_table(
        'awards',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('icon', sa.String(50), server_default='trophy', nullable=True),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('recipient_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('recipient_name', sa.String(200), nullable=False),
        sa.Column('recipient_class', sa.String(100), nullable=True),
        sa.Column('awarded_by_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('awarded_by_name', sa.String(200), nullable=False),
        sa.Column('shared_to_feed', sa.Boolean(), server_default='true', nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_awards_tenant_id', 'awards', ['tenant_id'])
    op.create_index('ix_awards_recipient_id', 'awards', ['recipient_id'])

    # ── User Profiles ─────────────────────────────────────────────────────────
    op.create_table(
        'user_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('phone', sa.String(20), nullable=True),
        sa.Column('date_of_birth', sa.Date(), nullable=True),
        sa.Column('gender', sa.String(30), nullable=True),
        sa.Column('address', postgresql.JSONB(), server_default='{}', nullable=True),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('avatar_url', sa.String(512), nullable=True),
        sa.Column('preferences', postgresql.JSONB(), server_default='{}', nullable=True),
        sa.Column('is_profile_complete', sa.Boolean(), server_default='false', nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', name='uq_user_profiles_user_id'),
    )
    op.create_index('ix_user_profiles_tenant_id', 'user_profiles', ['tenant_id'])
    op.create_index('ix_user_profiles_user_id', 'user_profiles', ['user_id'])

    # ── Staff Profiles ────────────────────────────────────────────────────────
    op.create_table(
        'staff_profiles',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('employee_id', sa.String(50), nullable=True),
        sa.Column('department', sa.String(100), nullable=True),
        sa.Column('designation', sa.String(100), nullable=True),
        sa.Column('date_of_joining', sa.Date(), nullable=True),
        sa.Column('qualifications', postgresql.JSONB(), server_default='[]', nullable=True),
        sa.Column('subject_expertise', postgresql.JSONB(), server_default='[]', nullable=True),
        sa.Column('emergency_contact', postgresql.JSONB(), server_default='{}', nullable=True),
        sa.Column('salary', sa.String(20), nullable=True),
        sa.Column('salary_type', sa.String(20), server_default='monthly', nullable=True),
        sa.Column('staff_type', sa.String(50), server_default='teaching', nullable=True),
        sa.Column('leave_balance', sa.Integer(), server_default='12', nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', name='uq_staff_profiles_user_id'),
    )
    op.create_index('ix_staff_profiles_tenant_id', 'staff_profiles', ['tenant_id'])
    op.create_index('ix_staff_profiles_user_id', 'staff_profiles', ['user_id'])

    # ── Parent-Student Links ──────────────────────────────────────────────────
    op.create_table(
        'parent_student_links',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('parent_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('student_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('relationship', sa.String(50), server_default='parent', nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_parent_student_links_tenant_id', 'parent_student_links', ['tenant_id'])
    op.create_index('ix_parent_student_links_parent_id', 'parent_student_links', ['parent_id'])
    op.create_index('ix_parent_student_links_student_id', 'parent_student_links', ['student_id'])


def downgrade() -> None:
    op.drop_table('parent_student_links')
    op.drop_table('staff_profiles')
    op.drop_table('user_profiles')
    op.drop_table('awards')
    op.drop_table('chat_messages')
    op.drop_table('chat_conversations')
    op.drop_table('device_tokens')
    op.drop_table('notification_preferences')
    op.drop_table('notifications')
    op.drop_table('notification_templates')
    op.execute("DROP TYPE IF EXISTS gender")
    op.execute("DROP TYPE IF EXISTS notificationstatus")
    op.execute("DROP TYPE IF EXISTS notificationchannel")
