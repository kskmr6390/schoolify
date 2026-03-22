"""
Database seed script for development and demo environments.
Creates a complete demo school with realistic data.

Usage:
    python scripts/seed_data.py

Output: Prints all login credentials.
"""
import asyncio
import hashlib
import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal

# Note: In production, install dependencies and set DATABASE_URL env var
DEMO_DATA = {
    "tenant": {
        "id": str(uuid.uuid4()),
        "slug": "greenwood-high",
        "name": "Greenwood High School",
        "email": "admin@greenwoodhigh.edu",
        "primary_color": "#4F46E5",
        "secondary_color": "#10B981",
        "plan": "pro",
        "status": "active",
    },
    "users": [
        {
            "email": "admin@greenwoodhigh.edu",
            "password": "Admin@123",
            "role": "admin",
            "first_name": "Sarah",
            "last_name": "Mitchell",
        },
        {
            "email": "teacher.math@greenwoodhigh.edu",
            "password": "Teacher@123",
            "role": "teacher",
            "first_name": "David",
            "last_name": "Chen",
        },
        {
            "email": "teacher.science@greenwoodhigh.edu",
            "password": "Teacher@123",
            "role": "teacher",
            "first_name": "Priya",
            "last_name": "Sharma",
        },
        {
            "email": "student.alice@greenwoodhigh.edu",
            "password": "Student@123",
            "role": "student",
            "first_name": "Alice",
            "last_name": "Johnson",
        },
        {
            "email": "student.bob@greenwoodhigh.edu",
            "password": "Student@123",
            "role": "student",
            "first_name": "Bob",
            "last_name": "Williams",
        },
        {
            "email": "parent.johnson@email.com",
            "password": "Parent@123",
            "role": "parent",
            "first_name": "Mary",
            "last_name": "Johnson",
        },
    ],
    "academic_year": {
        "name": "2024-25",
        "start_date": "2024-06-01",
        "end_date": "2025-03-31",
        "is_current": True,
    },
    "classes": [
        {"name": "Grade 10-A", "grade": 10, "section": "A", "capacity": 40},
        {"name": "Grade 10-B", "grade": 10, "section": "B", "capacity": 40},
        {"name": "Grade 9-A", "grade": 9, "section": "A", "capacity": 40},
    ],
    "subjects": [
        {"name": "Mathematics", "code": "MATH10"},
        {"name": "Science", "code": "SCI10"},
        {"name": "English", "code": "ENG10"},
        {"name": "History", "code": "HIST10"},
    ],
    "students": [
        {"first_name": "Alice", "last_name": "Johnson", "student_code": "SCH-2024-0001", "grade": 10},
        {"first_name": "Bob", "last_name": "Williams", "student_code": "SCH-2024-0002", "grade": 10},
        {"first_name": "Carol", "last_name": "Davis", "student_code": "SCH-2024-0003", "grade": 10},
        {"first_name": "Daniel", "last_name": "Brown", "student_code": "SCH-2024-0004", "grade": 10},
        {"first_name": "Emma", "last_name": "Wilson", "student_code": "SCH-2024-0005", "grade": 9},
        {"first_name": "Frank", "last_name": "Taylor", "student_code": "SCH-2024-0006", "grade": 9},
        {"first_name": "Grace", "last_name": "Anderson", "student_code": "SCH-2024-0007", "grade": 9},
        {"first_name": "Henry", "last_name": "Thomas", "student_code": "SCH-2024-0008", "grade": 9},
    ],
    "fee_structures": [
        {"name": "Tuition Fee", "amount": 15000, "fee_type": "tuition", "due_date": "2024-07-01"},
        {"name": "Library Fee", "amount": 500, "fee_type": "library", "due_date": "2024-07-01"},
        {"name": "Lab Fee", "amount": 1000, "fee_type": "lab", "due_date": "2024-07-01"},
    ],
}


def print_seed_summary():
    """Print a summary of what would be created."""
    print("\n" + "="*60)
    print("SCHOOLIFY DEMO DATA SEED SUMMARY")
    print("="*60)
    print(f"\nTenant: {DEMO_DATA['tenant']['name']}")
    print(f"Slug:   {DEMO_DATA['tenant']['slug']}")
    print(f"\nLogin URL: http://localhost:3000/login")
    print(f"\n{'Role':<15} {'Email':<45} {'Password'}")
    print("-"*70)
    for user in DEMO_DATA['users']:
        print(f"{user['role']:<15} {user['email']:<45} {user['password']}")

    print(f"\n{'Classes:':<20} {len(DEMO_DATA['classes'])} classes")
    print(f"{'Subjects:':<20} {len(DEMO_DATA['subjects'])} subjects")
    print(f"{'Students:':<20} {len(DEMO_DATA['students'])} students")
    print(f"{'Fee Structures:':<20} {len(DEMO_DATA['fee_structures'])} fee types")
    print("\n" + "="*60)
    print("Note: Run migrations first, then start all services.")
    print("Use the API endpoints to create this data programmatically.")
    print("="*60 + "\n")


if __name__ == "__main__":
    print_seed_summary()

    print("To seed data via API:")
    print("1. Start all services: make up")
    print("2. Create tenant: POST /api/v1/tenants")
    print("3. Onboard tenant: POST /api/v1/tenants/{id}/onboard")
    print("4. Create users: POST /api/v1/auth/users")
    print("\nOr use the admin panel at http://localhost:3000/login")
    print("with admin@greenwoodhigh.edu / Admin@123")
