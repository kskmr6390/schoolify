# Database Schema — Schoolify

All tables except `tenants` include `tenant_id` for row-level isolation.

## ER Diagram

```mermaid
erDiagram
    tenants {
        UUID id PK
        string slug UK
        string name
        string domain
        string logo_url
        string primary_color
        string secondary_color
        jsonb branding_config
        enum plan
        enum status
        timestamp trial_ends_at
        timestamp created_at
    }

    tenant_settings {
        UUID id PK
        UUID tenant_id FK
        string key
        string value
    }

    feature_flags {
        UUID id PK
        UUID tenant_id FK
        string flag_name
        boolean enabled
        jsonb config
    }

    users {
        UUID id PK
        UUID tenant_id FK
        string email
        string password_hash
        enum role
        enum status
        string first_name
        string last_name
        string avatar_url
        timestamp last_login
        boolean email_verified
    }

    oauth_accounts {
        UUID id PK
        UUID user_id FK
        enum provider
        string provider_id
        string access_token
        timestamp expires_at
    }

    refresh_tokens {
        UUID id PK
        UUID user_id FK
        string token_hash
        timestamp expires_at
        boolean revoked
        jsonb device_info
    }

    audit_logs {
        UUID id PK
        UUID tenant_id FK
        UUID user_id FK
        string action
        string resource
        UUID resource_id
        jsonb old_values
        jsonb new_values
        string ip_address
        boolean success
        timestamp created_at
    }

    academic_years {
        UUID id PK
        UUID tenant_id FK
        string name
        date start_date
        date end_date
        boolean is_current
    }

    classes {
        UUID id PK
        UUID tenant_id FK
        UUID academic_year_id FK
        string name
        int grade
        string section
        int capacity
        UUID class_teacher_id FK
    }

    subjects {
        UUID id PK
        UUID tenant_id FK
        string name
        string code UK
        boolean is_active
    }

    class_subjects {
        UUID id PK
        UUID tenant_id FK
        UUID class_id FK
        UUID subject_id FK
        UUID teacher_id FK
    }

    timetable_slots {
        UUID id PK
        UUID tenant_id FK
        UUID class_id FK
        UUID subject_id FK
        UUID teacher_id FK
        int day_of_week
        time start_time
        time end_time
        string room
    }

    students {
        UUID id PK
        UUID tenant_id FK
        UUID user_id FK
        string student_code UK
        string first_name
        string last_name
        date dob
        enum gender
        jsonb address
        date enrollment_date
        UUID class_id FK
        int roll_number
        string blood_group
        jsonb emergency_contact
        enum status
    }

    parents {
        UUID id PK
        UUID tenant_id FK
        UUID user_id FK
        UUID student_id FK
        string first_name
        string last_name
        string relationship
        string phone
        boolean is_emergency_contact
    }

    student_documents {
        UUID id PK
        UUID tenant_id FK
        UUID student_id FK
        string document_type
        string file_url
        UUID uploaded_by FK
    }

    attendance_records {
        UUID id PK
        UUID tenant_id FK
        UUID class_id FK
        UUID subject_id FK
        date date
        int period
        UUID recorded_by FK
    }

    attendance_entries {
        UUID id PK
        UUID record_id FK
        UUID student_id FK
        enum status
        string notes
        timestamp marked_at
    }

    assignments {
        UUID id PK
        UUID tenant_id FK
        UUID class_id FK
        UUID subject_id FK
        UUID teacher_id FK
        string title
        text description
        timestamp due_date
        decimal max_marks
        enum assignment_type
        boolean is_published
    }

    submissions {
        UUID id PK
        UUID tenant_id FK
        UUID assignment_id FK
        UUID student_id FK
        timestamp submitted_at
        decimal marks_obtained
        text feedback
        enum status
        UUID graded_by FK
    }

    exams {
        UUID id PK
        UUID tenant_id FK
        UUID class_id FK
        UUID subject_id FK
        UUID academic_year_id FK
        string name
        enum exam_type
        timestamp exam_date
        decimal max_marks
        boolean is_published
    }

    exam_results {
        UUID id PK
        UUID tenant_id FK
        UUID exam_id FK
        UUID student_id FK
        decimal marks_obtained
        string grade
        decimal grade_points
        boolean is_pass
        UUID entered_by FK
    }

    fee_structures {
        UUID id PK
        UUID tenant_id FK
        UUID academic_year_id FK
        UUID class_id FK
        string name
        decimal amount
        date due_date
        enum fee_type
        boolean is_recurring
    }

    invoices {
        UUID id PK
        UUID tenant_id FK
        UUID student_id FK
        UUID academic_year_id FK
        string invoice_number UK
        decimal total_amount
        decimal paid_amount
        decimal discount_amount
        enum status
        date due_date
        string idempotency_key UK
    }

    invoice_items {
        UUID id PK
        UUID invoice_id FK
        string description
        decimal amount
        int quantity
    }

    payments {
        UUID id PK
        UUID tenant_id FK
        UUID invoice_id FK
        UUID student_id FK
        decimal amount
        enum payment_method
        string transaction_id
        string idempotency_key UK
        enum status
        timestamp paid_at
    }

    notifications {
        UUID id PK
        UUID tenant_id FK
        UUID user_id FK
        enum channel
        string title
        text body
        boolean is_read
        enum status
        timestamp sent_at
        jsonb metadata
    }

    copilot_conversations {
        UUID id PK
        UUID tenant_id FK
        UUID user_id FK
        string title
        boolean is_active
    }

    copilot_messages {
        UUID id PK
        UUID tenant_id FK
        UUID conversation_id FK
        enum role
        text content
        jsonb sources
    }

    tenants ||--o{ tenant_settings : "has"
    tenants ||--o{ feature_flags : "has"
    users ||--o{ oauth_accounts : "has"
    users ||--o{ refresh_tokens : "has"
    tenants ||--o{ users : "contains"
    tenants ||--o{ academic_years : "has"
    academic_years ||--o{ classes : "contains"
    classes ||--o{ class_subjects : "teaches"
    subjects ||--o{ class_subjects : "in"
    classes ||--o{ timetable_slots : "has"
    classes ||--o{ students : "enrolls"
    students ||--o{ parents : "has"
    students ||--o{ student_documents : "has"
    classes ||--o{ attendance_records : "tracks"
    attendance_records ||--o{ attendance_entries : "contains"
    classes ||--o{ assignments : "has"
    assignments ||--o{ submissions : "receives"
    classes ||--o{ exams : "has"
    exams ||--o{ exam_results : "produces"
    students ||--o{ invoices : "billed"
    invoices ||--o{ invoice_items : "contains"
    invoices ||--o{ payments : "receives"
    users ||--o{ notifications : "receives"
    users ||--o{ copilot_conversations : "has"
    copilot_conversations ||--o{ copilot_messages : "contains"
```

## Key Design Decisions

### Idempotency Keys (Invoices + Payments)
Both `invoices.idempotency_key` and `payments.idempotency_key` have unique constraints.
Client generates UUID before calling API → even if network times out and client retries,
the second call returns the existing record instead of creating a duplicate.

### JSONB Fields
- `address`, `emergency_contact`: Flexible structured data without schema migrations
- `branding_config`: Custom CSS variables, themes per tenant
- `audit_logs.old_values/new_values`: Snapshot of record before/after change
- `gateway_response`: Raw payment gateway JSON for debugging

### Soft Deletes
No hard deletes on business entities. Status fields:
- users: `status = inactive`
- students: `status = inactive`
- Preserves audit trail and foreign key integrity
