# API Overview — Schoolify

## Base URL
```
Production:  https://api.schoolify.com
Staging:     https://staging-api.schoolify.com
Local:       http://localhost:8000
```

## Tenant Identification

Every request (except public endpoints) must identify the school tenant via:

**Option 1: HTTP Header (recommended for API clients)**
```
X-Tenant-Slug: greenwood-high
```

**Option 2: Subdomain (web/mobile apps)**
```
https://greenwood-high.schoolify.com/api/v1/...
```

## Authentication

### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@school.com",
  "password": "Password@123",
  "tenant_slug": "greenwood-high"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiJ9...",
    "refresh_token": "550e8400-e29b-41d4-a716-446655440000...",
    "token_type": "bearer",
    "expires_in": 1800,
    "user": {
      "id": "uuid",
      "email": "admin@school.com",
      "role": "admin",
      "first_name": "Sarah",
      "last_name": "Mitchell"
    }
  }
}
```

### Using the Access Token
```http
GET /api/v1/students
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
X-Tenant-Slug: greenwood-high
```

### Token Refresh
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{"refresh_token": "your-refresh-token"}
```

## Standard Response Format

All endpoints return this envelope:
```json
{
  "success": true,
  "data": { ... },
  "meta": null,
  "errors": null
}
```

Error response:
```json
{
  "success": false,
  "data": null,
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "Email is required",
      "field": "email"
    }
  ]
}
```

## Pagination

Paginated endpoints accept:
```
GET /api/v1/students?page=1&limit=20&sort_by=first_name&sort_order=asc
```

Response includes:
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 472,
    "page": 1,
    "limit": 20,
    "pages": 24
  }
}
```

## Error Codes

| HTTP Status | Code | Description |
|------------|------|-------------|
| 400 | `VALIDATION_ERROR` | Request body validation failed |
| 400 | `DUPLICATE_PAYMENT` | Payment already processed (idempotency) |
| 401 | `UNAUTHORIZED` | Missing or invalid access token |
| 401 | `TOKEN_EXPIRED` | Access token has expired |
| 403 | `FORBIDDEN` | Insufficient role permissions |
| 403 | `TENANT_MISMATCH` | User doesn't belong to this tenant |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Resource already exists |
| 422 | `UNPROCESSABLE` | Business logic validation failed |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 503 | `SERVICE_UNAVAILABLE` | Downstream service unavailable |

## Rate Limiting Headers

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 55
X-RateLimit-Reset: 1700000060
Retry-After: 60  # Only on 429 responses
```

## API Endpoints Reference

### Auth Service `/api/v1/auth`
```
POST   /login                    # Login with email/password
POST   /register                 # Register new user
POST   /refresh                  # Refresh access token
POST   /logout                   # Revoke refresh token
GET    /me                       # Get current user
PUT    /me                       # Update profile
POST   /change-password          # Change password
POST   /google                   # Google OAuth login
POST   /forgot-password          # Request password reset
POST   /reset-password           # Confirm password reset
GET    /users                    # List users [admin]
POST   /users                    # Create user [admin]
GET    /users/:id                # Get user [admin]
PUT    /users/:id                # Update user [admin]
DELETE /users/:id                # Deactivate user [admin]
GET    /audit-logs               # Get audit trail [admin]
```

### Tenant Service `/api/v1/tenants`
```
POST   /                         # Create tenant [super_admin]
GET    /                         # List tenants [super_admin]
GET    /by-slug/:slug            # Get tenant branding (public)
GET    /:id                      # Get tenant [admin]
PUT    /:id                      # Update tenant [admin]
POST   /:id/onboard              # Onboard tenant [super_admin]
GET    /:id/settings             # Get settings [admin]
PUT    /:id/settings             # Update settings [admin]
GET    /:id/feature-flags        # List feature flags [admin]
PUT    /:id/feature-flags/:flag  # Toggle feature flag [super_admin]
```

### Student SIS `/api/v1`
```
# Academic Years
GET    /academic-years           # List academic years
POST   /academic-years           # Create academic year [admin]
POST   /academic-years/:id/set-current

# Classes
GET    /classes                  # List classes
POST   /classes                  # Create class [admin]
GET    /classes/:id/students     # Students in class
GET    /classes/:id/timetable    # Class timetable

# Subjects
GET    /subjects
POST   /subjects                 [admin]

# Timetable
POST   /timetable                [admin]

# Students
GET    /students                 # List (paginated, filterable)
POST   /students                 [admin, teacher]
GET    /students/:id
PUT    /students/:id             [admin, teacher]
DELETE /students/:id             [admin]
GET    /students/:id/attendance-summary
GET    /students/:id/results
POST   /students/bulk-import     # CSV import [admin]

# Parents
GET    /parents/student/:id
POST   /parents                  [admin]
```

### Attendance `/api/v1/attendance`
```
POST   /                         # Mark attendance [teacher, admin]
GET    /class/:class_id          # Class attendance (date range)
GET    /student/:id/summary      # Student attendance summary
GET    /low-attendance           # Students below threshold [admin, teacher]
```

### Fee Service `/api/v1/fees`
```
# Fee Structures
GET    /structures               [admin]
POST   /structures               [admin]

# Invoices
GET    /invoices                 [admin]
POST   /invoices                 [admin]
GET    /invoices/student/:id     # Student fee statement
POST   /invoices/bulk-generate   # Generate for all students [admin]

# Payments (idempotent)
POST   /payments                 [admin]
GET    /payments/:id

# Reports
GET    /reports/collection       # Fee collection report [admin]
GET    /reports/outstanding      # Outstanding fees [admin]
```

### Assignments & Exams `/api/v1`
```
# Assignments
GET    /assignments
POST   /assignments              [teacher, admin]
POST   /assignments/:id/publish  [teacher, admin]
POST   /assignments/:id/submissions  # Submit [student]
GET    /assignments/:id/submissions  # View all [teacher, admin]
PUT    /submissions/:id/grade    [teacher, admin]

# Exams
GET    /exams
POST   /exams                    [teacher, admin]
POST   /exams/:id/results/bulk   # Bulk enter results [teacher, admin]
GET    /exams/:id/results

# Results
GET    /results/student/:id      # All results for student
```

### Notifications `/api/v1/notifications`
```
GET    /                         # User's notifications (paginated)
GET    /unread-count             # Count of unread
PUT    /:id/read                 # Mark as read
PUT    /read-all                 # Mark all as read
GET    /preferences              # Get notification preferences
PUT    /preferences              # Update preferences
POST   /devices/register         # Register push token
```

### Analytics `/api/v1/analytics` (& `/api/v1/dashboard`, `/api/v1/reports`)
```
GET    /dashboard/admin          # Admin dashboard metrics
GET    /dashboard/teacher        # Teacher dashboard
GET    /dashboard/student/:id    # Student dashboard
GET    /dashboard/parent/:student_id

GET    /reports/enrollment       # Enrollment trends
GET    /reports/attendance       # Attendance analytics
GET    /reports/fee-collection   # Fee analytics
GET    /reports/academic-performance
```

### AI Copilot `/api/v1/copilot`
```
POST   /chat                     # Send message, get AI response
GET    /conversations            # List conversations
GET    /conversations/:id        # Get conversation + messages
DELETE /conversations/:id
POST   /index                    # Trigger data indexing [admin]
GET    /suggestions              # Example query suggestions
```

## SDK Example (JavaScript/TypeScript)

```typescript
import axios from 'axios'

const api = axios.create({
  baseURL: 'https://api.schoolify.com',
  headers: {
    'X-Tenant-Slug': 'greenwood-high',
  },
})

// Login
const { data } = await api.post('/api/v1/auth/login', {
  email: 'admin@school.com',
  password: 'Password@123',
  tenant_slug: 'greenwood-high',
})
api.defaults.headers['Authorization'] = `Bearer ${data.data.access_token}`

// List students
const students = await api.get('/api/v1/students?page=1&limit=20')

// Mark attendance
await api.post('/api/v1/attendance', {
  class_id: 'uuid',
  date: '2024-03-20',
  entries: [
    { student_id: 'uuid1', status: 'present' },
    { student_id: 'uuid2', status: 'absent' },
  ],
})

// Idempotent payment
await api.post('/api/v1/fees/payments', {
  invoice_id: 'uuid',
  amount: 15000,
  payment_method: 'upi',
  idempotency_key: crypto.randomUUID(),  // Client-generated, unique per payment attempt
})

// AI Copilot
const chat = await api.post('/api/v1/copilot/chat', {
  message: 'Which students have attendance below 75% this month?',
})
console.log(chat.data.data.response)
```
