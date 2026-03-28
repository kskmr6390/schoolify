#!/usr/bin/env python3
"""
Fixture seed for SBM International School.
Creates a new tenant with 210 records per major table.

Run from project root:
    python scripts/seed_sbm.py
"""

import json
import os
import random
import sys
import uuid
from datetime import date, datetime, timedelta

try:
    import bcrypt
    import psycopg2
except ImportError:
    print("Missing deps: pip install psycopg2-binary bcrypt")
    sys.exit(1)

# ── Config ────────────────────────────────────────────────────────────────────
DB_DSN = os.environ.get("DATABASE_URL", "postgresql://schoolify:schoolify_dev_password@localhost:5432/schoolify")

TENANT_ID    = "cccccccc-0000-0000-0000-000000000001"
TENANT_SLUG  = "sbm"
TENANT_NAME  = "SBM International School"
TENANT_EMAIL = "SBM@gmail.com"

ADMIN_EMAIL    = "admin@sbm.com"
ADMIN_PASSWORD = "Admin@123"

# 14 classes × 15 students = 210 students
SECTIONS = {
    8:  ["A", "B", "C"],
    9:  ["A", "B", "C"],
    10: ["A", "B", "C"],
    11: ["A", "B", "C"],
    12: ["A", "B"],
}

SUBJECTS = [
    ("Mathematics",        "MATH"),
    ("Physics",            "PHY"),
    ("Chemistry",          "CHEM"),
    ("Biology",            "BIO"),
    ("English",            "ENG"),
    ("Hindi",              "HIN"),
    ("History",            "HIST"),
    ("Geography",          "GEO"),
    ("Computer Science",   "CS"),
    ("Physical Education", "PE"),
]

BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]

FIRST_MALE = [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Reyansh", "Ayaan",
    "Krishna", "Ishaan", "Shaurya", "Atharv", "Advik", "Pranav", "Advait",
    "Dhruv", "Kabir", "Ritvik", "Parth", "Harsh", "Rohan", "Aryan", "Dev",
    "Rudra", "Raj", "Nikhil", "Akash", "Vikram", "Karan", "Siddharth", "Mihir",
]
FIRST_FEMALE = [
    "Aadhya", "Saanvi", "Ananya", "Pari", "Aanya", "Fatima", "Kiara", "Diya",
    "Myra", "Riya", "Ishita", "Nisha", "Priya", "Sneha", "Pooja", "Megha",
    "Kavya", "Siya", "Tanvi", "Nidhi", "Anjali", "Simran", "Neha", "Radhika",
    "Shruti", "Divya", "Asha", "Meera", "Lakshmi", "Geeta",
]
LAST_NAMES = [
    "Sharma", "Singh", "Patel", "Kumar", "Gupta", "Mehta", "Shah", "Joshi",
    "Rao", "Reddy", "Verma", "Mishra", "Pandey", "Malhotra", "Chauhan",
    "Chaudhary", "Agarwal", "Tiwari", "Bhatia", "Saxena",
]
CITIES = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Pune", "Kolkata", "Ahmedabad"]
OCCUPATIONS = ["Engineer", "Doctor", "Teacher", "Businessman", "Accountant", "Lawyer", "Manager", "Consultant"]
DEPARTMENTS = ["Science", "Mathematics", "Languages", "Social Studies", "Computer Science", "Physical Education"]
DESIGNATIONS = ["Senior Teacher", "Junior Teacher", "Head of Department", "Assistant Teacher", "Senior Lecturer"]
QUALIFICATIONS = [
    [{"degree": "M.Sc", "institution": "Delhi University", "year": 2010},
     {"degree": "B.Ed", "institution": "Jamia Millia", "year": 2008}],
    [{"degree": "M.A", "institution": "JNU", "year": 2011},
     {"degree": "B.Ed", "institution": "IP University", "year": 2013}],
    [{"degree": "M.Tech", "institution": "IIT Delhi", "year": 2012}],
    [{"degree": "Ph.D", "institution": "IIT Bombay", "year": 2014}],
    [{"degree": "B.Sc", "institution": "Mumbai University", "year": 2015},
     {"degree": "B.Ed", "institution": "SNDT", "year": 2016}],
]

random.seed(42)


def uid() -> str:
    return str(uuid.uuid4())


def pw_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def spread(start: date, end: date, n: int) -> list:
    delta = max((end - start).days, 1)
    step = delta / n
    return [start + timedelta(days=int(i * step)) for i in range(n)]


def grade_for(marks: float, max_marks: float):
    pct = marks / max_marks * 100
    if pct >= 90: return "A+", 10.0, True
    if pct >= 80: return "A",   9.0, True
    if pct >= 70: return "B+",  8.0, True
    if pct >= 60: return "B",   7.0, True
    if pct >= 50: return "C",   6.0, True
    if pct >= 40: return "D",   5.0, True
    return "F", 0.0, False


def main():
    conn = psycopg2.connect(DB_DSN)
    cur  = conn.cursor()
    NOW  = datetime.utcnow()
    TODAY = date.today()

    print("=" * 60)
    print("  SBM International School — Fixture Seed")
    print("=" * 60)

    # ── 0. Clean old SBM data ─────────────────────────────────────────────
    print("\n[0] Cleaning old SBM data …")
    cur.execute("DELETE FROM tenants WHERE slug = %s", (TENANT_SLUG,))
    conn.commit()
    for tbl in [
        "copilot_conversations", "training_jobs", "training_schedules",
        "notifications", "notification_preferences", "device_tokens",
        "submissions", "exam_results", "exams", "assignments",
        "payments", "invoices", "fee_structures",
        "attendance_records",
        "student_documents", "parents", "students",
        "post_likes", "posts",
        "timetable_slots", "class_subjects", "classes", "subjects", "academic_years",
        "staff_profiles", "user_profiles", "users",
    ]:
        try:
            cur.execute(f"DELETE FROM {tbl} WHERE tenant_id = %s", (TENANT_ID,))
        except Exception as e:
            conn.rollback()
            print(f"  warning: {tbl}: {e}")
    conn.commit()
    print("  done.")

    # ── 1. Tenant + settings + feature flags ──────────────────────────────
    print("\n[1] Tenant …")
    cur.execute("""
        INSERT INTO tenants (id, slug, name, email, phone, address, plan, status,
                             trial_ends_at, max_students, primary_color, secondary_color,
                             branding_config, created_at, updated_at)
        VALUES (%s,%s,%s,%s,%s,%s,'PRO','ACTIVE',%s,'500','#4F46E5','#10B981',%s,%s,%s)
    """, (
        TENANT_ID, TENANT_SLUG, TENANT_NAME, TENANT_EMAIL,
        "+91-22-12345678", "123 Education Road, Mumbai, Maharashtra 400001",
        (TODAY + timedelta(days=365)).isoformat(),
        json.dumps({}), NOW, NOW,
    ))

    for k, v in {
        "academic_year_start_month": "6", "attendance_threshold_percent": "75",
        "working_days_per_week": "5", "grading_scale": "letter", "currency": "INR",
        "timezone": "Asia/Kolkata", "date_format": "DD/MM/YYYY", "late_fee_percent": "2",
    }.items():
        cur.execute("""
            INSERT INTO tenant_settings (id, tenant_id, key, value, created_at, updated_at)
            VALUES (%s,%s,%s,%s,%s,%s)
        """, (uid(), TENANT_ID, k, v, NOW, NOW))

    for flag, enabled in {
        "parent_portal": True, "sms_notifications": True, "email_notifications": True,
        "push_notifications": True, "online_payments": True, "ai_copilot": True,
        "report_cards": True, "timetable": True, "document_management": True,
    }.items():
        cur.execute("""
            INSERT INTO feature_flags (id, tenant_id, flag_name, enabled, config,
                                      created_at, updated_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s)
        """, (uid(), TENANT_ID, flag, enabled, json.dumps({}), NOW, NOW))
    conn.commit()
    print(f"  ✓ tenant={TENANT_NAME}  slug={TENANT_SLUG}")

    # ── 2. Admin user ─────────────────────────────────────────────────────
    print("\n[2] Admin user …")
    admin_id   = uid()
    admin_hash = pw_hash(ADMIN_PASSWORD)
    cur.execute("""
        INSERT INTO users (id, tenant_id, email, password_hash, role, status,
                           first_name, last_name, email_verified, created_at, updated_at)
        VALUES (%s,%s,%s,%s,'ADMIN','ACTIVE','SBM','Admin',true,%s,%s)
    """, (admin_id, TENANT_ID, ADMIN_EMAIL, admin_hash, NOW, NOW))
    cur.execute("""
        INSERT INTO staff_profiles (id, tenant_id, user_id, employee_id, department,
                                    designation, date_of_joining, qualifications,
                                    subject_expertise, emergency_contact,
                                    created_at, updated_at)
        VALUES (%s,%s,%s,'SBM-A-001','Administration','Principal',%s,
                %s::jsonb,%s::jsonb,%s::jsonb,%s,%s)
    """, (
        uid(), TENANT_ID, admin_id,
        (TODAY - timedelta(days=2000)).isoformat(),
        json.dumps(QUALIFICATIONS[3]),
        json.dumps(["Administration", "Management"]),
        json.dumps({"name": "Emergency Contact", "phone": "+91-9000000001", "relation": "spouse"}),
        NOW, NOW,
    ))
    cur.execute("""
        INSERT INTO user_profiles (id, tenant_id, user_id, bio, is_profile_complete,
                                   created_at, updated_at)
        VALUES (%s,%s,%s,'Principal of SBM International School.',true,%s,%s)
    """, (uid(), TENANT_ID, admin_id, NOW, NOW))
    conn.commit()
    print(f"  ✓ {ADMIN_EMAIL} / {ADMIN_PASSWORD}")

    # ── 3. Academic year ──────────────────────────────────────────────────
    print("\n[3] Academic year …")
    ay_id = uid()
    cur.execute("""
        INSERT INTO academic_years (id, tenant_id, name, start_date, end_date, is_current,
                                   created_at, updated_at)
        VALUES (%s,%s,'2025-26',%s,%s,true,%s,%s)
    """, (ay_id, TENANT_ID, date(2025, 6, 1).isoformat(), date(2026, 5, 31).isoformat(), NOW, NOW))
    conn.commit()

    # ── 4. Subjects (10) ──────────────────────────────────────────────────
    print("\n[4] Subjects …")
    subj_map = {}
    for name, code in SUBJECTS:
        sid = uid()
        subj_map[code] = sid
        cur.execute("""
            INSERT INTO subjects (id, tenant_id, name, code, is_active, created_at, updated_at)
            VALUES (%s,%s,%s,%s,true,%s,%s)
        """, (sid, TENANT_ID, name, code, NOW, NOW))
    conn.commit()
    subj_codes = list(subj_map.keys())
    print(f"  ✓ {len(subj_map)} subjects")

    # ── 5. Teachers (14) ──────────────────────────────────────────────────
    print("\n[5] Teachers …")
    teacher_ids = []
    for i in range(14):
        is_male = i % 2 == 0
        fn = random.choice(FIRST_MALE if is_male else FIRST_FEMALE)
        ln = random.choice(LAST_NAMES)
        t_uid = uid()
        teacher_ids.append(t_uid)
        cur.execute("""
            INSERT INTO users (id, tenant_id, email, password_hash, role, status,
                               first_name, last_name, email_verified, created_at, updated_at)
            VALUES (%s,%s,%s,%s,'TEACHER','ACTIVE',%s,%s,true,%s,%s)
        """, (t_uid, TENANT_ID, f"teacher{i+1:02d}@sbm.edu", admin_hash, fn, ln, NOW, NOW))
        expertise = [subj_codes[i % len(subj_codes)], subj_codes[(i + 1) % len(subj_codes)]]
        cur.execute("""
            INSERT INTO staff_profiles (id, tenant_id, user_id, employee_id, department,
                                        designation, date_of_joining, qualifications,
                                        subject_expertise, emergency_contact,
                                        created_at, updated_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s::jsonb,%s::jsonb,%s::jsonb,%s,%s)
        """, (
            uid(), TENANT_ID, t_uid, f"SBM-T-{i+1:03d}",
            random.choice(DEPARTMENTS), random.choice(DESIGNATIONS),
            (TODAY - timedelta(days=random.randint(365, 3000))).isoformat(),
            json.dumps(random.choice(QUALIFICATIONS)),
            json.dumps(expertise),
            json.dumps({"name": f"{fn} Contact", "phone": f"+91-98{i:08d}", "relation": "spouse"}),
            NOW, NOW,
        ))
        cur.execute("""
            INSERT INTO user_profiles (id, tenant_id, user_id, bio, is_profile_complete,
                                       created_at, updated_at)
            VALUES (%s,%s,%s,'Teacher at SBM International School.',true,%s,%s)
        """, (uid(), TENANT_ID, t_uid, NOW, NOW))
        cur.execute("""
            INSERT INTO notification_preferences (id, tenant_id, user_id, email_enabled,
                                                  sms_enabled, push_enabled, in_app_enabled,
                                                  event_preferences, created_at, updated_at)
            VALUES (%s,%s,%s,true,%s,true,true,%s::jsonb,%s,%s)
        """, (uid(), TENANT_ID, t_uid, random.random() > 0.3,
              json.dumps({"fee_reminder": True, "attendance": True, "exam": True, "assignment": True}),
              NOW, NOW))
    conn.commit()
    print(f"  ✓ {len(teacher_ids)} teachers (with staff profiles + prefs)")

    # ── 6. Classes (14) ───────────────────────────────────────────────────
    print("\n[6] Classes …")
    classes = []
    t_idx = 0
    for grade in sorted(SECTIONS.keys()):
        for sec in SECTIONS[grade]:
            cid = uid()
            t_id = teacher_ids[t_idx % 14]
            name = f"Grade {grade}-{sec}"
            classes.append({"id": cid, "grade": grade, "section": sec,
                            "name": name, "teacher_id": t_id})
            cur.execute("""
                INSERT INTO classes (id, tenant_id, academic_year_id, name, grade, section,
                                    capacity, class_teacher_id, created_at, updated_at)
                VALUES (%s,%s,%s,%s,%s,%s,40,%s,%s,%s)
            """, (cid, TENANT_ID, ay_id, name, grade, sec, t_id, NOW, NOW))
            t_idx += 1
    conn.commit()
    print(f"  ✓ {len(classes)} classes")

    # ── 7. Class subjects (14 × 8 = 112) ─────────────────────────────────
    print("\n[7] Class subjects …")
    cs_n = 0
    for ci, cls in enumerate(classes):
        for j, sc in enumerate(subj_codes[:8]):
            cur.execute("""
                INSERT INTO class_subjects (id, tenant_id, class_id, subject_id, teacher_id,
                                           created_at, updated_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s)
            """, (uid(), TENANT_ID, cls["id"], subj_map[sc],
                  teacher_ids[(ci + j) % 14], NOW, NOW))
            cs_n += 1
    conn.commit()
    print(f"  ✓ {cs_n} class-subject mappings")

    # ── 8. Timetable slots (14 × 5 days × 3 periods = 210) ───────────────
    print("\n[8] Timetable slots …")
    PERIODS = [("08:00", "08:45"), ("08:45", "09:30"), ("09:30", "10:15")]
    ts_n = 0
    for ci, cls in enumerate(classes):
        for day in range(5):
            for pnum, (s, e) in enumerate(PERIODS, 1):
                sc = subj_codes[(ci * 3 + day + pnum) % 8]
                cur.execute("""
                    INSERT INTO timetable_slots (id, tenant_id, class_id, subject_id, teacher_id,
                                               day_of_week, start_time, end_time, room,
                                               period_number, created_at, updated_at)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """, (uid(), TENANT_ID, cls["id"], subj_map[sc], cls["teacher_id"],
                      day, s, e, f"Room-{(ci * 5 + day) % 30 + 101}", pnum, NOW, NOW))
                ts_n += 1
    conn.commit()
    print(f"  ✓ {ts_n} timetable slots")

    # ── 9. Students (210) + Parents (210) + Documents (210) ──────────────
    print("\n[9] Students, parents, documents …")
    student_ids = []
    enroll_dates = spread(date(2025, 10, 1), TODAY, 210)
    dob_dates    = spread(date(2007, 1, 1), date(2014, 12, 31), 210)
    genders = ["MALE"] * 105 + ["FEMALE"] * 105
    random.shuffle(genders)

    s_idx = 0
    for ci, cls in enumerate(classes):
        for roll in range(1, 16):   # 15 students per class
            g    = genders[s_idx]
            fn   = random.choice(FIRST_MALE if g == "MALE" else FIRST_FEMALE)
            ln   = random.choice(LAST_NAMES)
            sid  = uid()
            student_ids.append(sid)
            code = f"SBM-{cls['grade']}{cls['section']}-{roll:03d}"
            city = random.choice(CITIES)

            if s_idx < 200:   st = "ACTIVE"
            elif s_idx < 207: st = "INACTIVE"
            else:              st = "TRANSFERRED"

            cur.execute("""
                INSERT INTO students (id, tenant_id, student_code, first_name, last_name,
                                     dob, gender, address, enrollment_date, class_id,
                                     roll_number, blood_group, emergency_contact,
                                     status, created_at, updated_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s::jsonb,%s,%s,%s,%s,%s::jsonb,%s,%s,%s)
            """, (
                sid, TENANT_ID, code, fn, ln,
                dob_dates[s_idx].isoformat(), g,
                json.dumps({"street": f"{roll} Park Lane", "city": city,
                            "state": "Maharashtra", "pincode": f"4000{roll:02d}"}),
                enroll_dates[s_idx].isoformat(), cls["id"], roll,
                random.choice(BLOOD_GROUPS),
                json.dumps({"name": f"{random.choice(FIRST_MALE)} {ln}",
                            "phone": f"+91-98{random.randint(10000000, 99999999)}",
                            "relationship": "Father"}),
                st, NOW, NOW,
            ))

            # Parent
            rel = random.choice(["Father", "Mother"])
            pfn = random.choice(FIRST_MALE if rel == "Father" else FIRST_FEMALE)
            cur.execute("""
                INSERT INTO parents (id, tenant_id, student_id, first_name, last_name,
                                    relation_type, phone, email, occupation,
                                    is_emergency_contact, created_at, updated_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,true,%s,%s)
            """, (uid(), TENANT_ID, sid, pfn, ln, rel.lower(),
                  f"+91-98{random.randint(10000000, 99999999)}",
                  f"parent{s_idx}@gmail.com",
                  random.choice(OCCUPATIONS), NOW, NOW))

            # Document
            cur.execute("""
                INSERT INTO student_documents (id, tenant_id, student_id, document_type,
                                              file_url, file_name, file_size_bytes,
                                              uploaded_by, created_at, updated_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (uid(), TENANT_ID, sid,
                  random.choice(["birth_certificate", "aadhar", "transfer_certificate", "photo"]),
                  f"https://storage.sbm.edu/docs/{code}.pdf",
                  f"{code}-doc.pdf", random.randint(50000, 500000), admin_id, NOW, NOW))

            s_idx += 1
    conn.commit()
    print(f"  ✓ {len(student_ids)} students  {len(student_ids)} parents  {len(student_ids)} docs")

    # ── 10. Fee structures (5) ────────────────────────────────────────────
    print("\n[10] Fee structures …")
    fs_map = {}
    for fdesc, amount, ftype in [
        ("Tuition Fee", 15000, "TUITION"),
        ("Library Fee",   500, "LIBRARY"),
        ("Lab Fee",      1000, "LAB"),
        ("Sports Fee",    800, "SPORTS"),
        ("Exam Fee",     1200, "EXAM"),
    ]:
        fsid = uid()
        fs_map[ftype] = fsid
        cur.execute("""
            INSERT INTO fee_structures (id, tenant_id, academic_year_id, class_id, name, amount,
                                       due_date, fee_type, is_recurring, recurrence,
                                       is_active, created_at, updated_at)
            VALUES (%s,%s,%s,NULL,%s,%s,%s,%s,true,'quarterly',true,%s,%s)
        """, (fsid, TENANT_ID, ay_id, fdesc, amount,
              date(2025, 7, 31).isoformat(), ftype, NOW, NOW))
    conn.commit()
    print(f"  ✓ {len(fs_map)} fee structures")

    # ── 11. Invoices (210) + Items (630) + Payments (~136) ────────────────
    print("\n[11] Invoices, items, payments …")
    inv_statuses = (
        ["PAID"] * 84 + ["PARTIAL"] * 52 + ["OVERDUE"] * 42 +
        ["PENDING"] * 26 + ["DRAFT"] * 6
    )
    random.shuffle(inv_statuses)
    inv_dates = spread(date(2025, 10, 1), TODAY, 210)
    inv_n = pay_n = 0

    for i, sid in enumerate(student_ids):
        inv_id  = uid()
        status  = inv_statuses[i]
        total   = 16500   # 15000 + 500 + 1000
        issued  = inv_dates[i]
        due     = issued + timedelta(days=30)
        late_fee = random.randint(100, 330) if status == "OVERDUE" else 0
        paid     = (total if status == "PAID" else
                    random.randint(5000, 14000) if status == "PARTIAL" else 0)

        cur.execute("""
            INSERT INTO invoices (id, tenant_id, student_id, academic_year_id, invoice_number,
                                 total_amount, paid_amount, discount_amount, late_fee,
                                 status, issued_date, due_date, created_at, updated_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,0,%s,%s,%s,%s,%s,%s)
        """, (inv_id, TENANT_ID, sid, ay_id, f"INV-2025-{i+1:05d}",
              total, paid, late_fee, status,
              issued.isoformat(), due.isoformat(), NOW, NOW))

        for fdesc, famount, ftype in [
            ("Tuition Fee", 15000, "TUITION"),
            ("Library Fee",   500, "LIBRARY"),
            ("Lab Fee",      1000, "LAB"),
        ]:
            cur.execute("""
                INSERT INTO invoice_items (id, invoice_id, fee_structure_id, description,
                                          amount, quantity)
                VALUES (%s,%s,%s,%s,%s,1)
            """, (uid(), inv_id, fs_map.get(ftype), fdesc, famount))

        if status in ("PAID", "PARTIAL") and paid > 0:
            cur.execute("""
                INSERT INTO payments (id, tenant_id, invoice_id, student_id, amount,
                                     payment_method, transaction_id, idempotency_key,
                                     status, paid_at, recorded_by, created_at, updated_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,'COMPLETED',%s,%s,%s,%s)
            """, (
                uid(), TENANT_ID, inv_id, sid, paid,
                random.choice(["CASH", "UPI", "BANK_TRANSFER", "CARD"]),
                f"TXN-SBM-{i+1:06d}", f"idem-{inv_id}",
                datetime(issued.year, issued.month, issued.day, 10, 0),
                admin_id, NOW, NOW,
            ))
            pay_n += 1
        inv_n += 1
    conn.commit()
    print(f"  ✓ {inv_n} invoices  {inv_n * 3} items  {pay_n} payments")

    # ── 12. Attendance records (210) + entries (~3150) ────────────────────
    print("\n[12] Attendance records + entries …")
    # 15 working days × 14 classes = 210 attendance_records
    att_dates: list[date] = []
    d = date(2026, 3, 2)
    while len(att_dates) < 15:
        if d.weekday() < 5:
            att_dates.append(d)
        d += timedelta(days=1)

    ar_n = ae_n = 0
    class_rates = [random.uniform(0.85, 0.95) for _ in classes]

    for ci, cls in enumerate(classes):
        rate   = class_rates[ci]
        c_stds = student_ids[ci * 15:(ci + 1) * 15]
        for att_date in att_dates:
            ar_id = uid()
            cur.execute("""
                INSERT INTO attendance_records (id, tenant_id, class_id, subject_id, date,
                                              period, recorded_by, created_at, updated_at)
                VALUES (%s,%s,%s,NULL,%s,NULL,%s,%s,%s)
            """, (ar_id, TENANT_ID, cls["id"], att_date.isoformat(), cls["teacher_id"], NOW, NOW))
            ar_n += 1
            for stud_id in c_stds:
                r = random.random()
                astatus = "PRESENT" if r < rate else "LATE" if r < rate + 0.03 else "ABSENT"
                cur.execute("""
                    INSERT INTO attendance_entries (id, record_id, student_id, status, marked_at)
                    VALUES (%s,%s,%s,%s,%s)
                """, (uid(), ar_id, stud_id, astatus,
                      datetime.combine(att_date, datetime.min.time())))
                ae_n += 1
    conn.commit()
    print(f"  ✓ {ar_n} attendance records  {ae_n} entries")

    # ── 13. Posts (210) + Likes (210) ─────────────────────────────────────
    print("\n[13] Posts + likes …")
    post_ids = []
    for i in range(210):
        pid = uid()
        post_ids.append(pid)
        t_id = teacher_ids[i % 14]
        cur.execute("""
            INSERT INTO posts (id, tenant_id, author_id, author_name, author_role,
                              title, content, post_type, visibility,
                              likes_count, comments_count, created_at, updated_at)
            VALUES (%s,%s,%s,%s,'TEACHER',%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            pid, TENANT_ID, t_id, f"Teacher {(i % 14) + 1:02d}",
            f"School Notice #{i + 1}",
            f"Important update for all SBM students and parents. Reference #{i + 1}.",
            random.choice(["ANNOUNCEMENT", "MEETING", "EVENT", "GENERAL"]),
            random.choice(["ALL", "TEACHERS", "STUDENTS", "PARENTS"]),
            random.randint(0, 30), random.randint(0, 8), NOW, NOW,
        ))
    for i, pid in enumerate(post_ids):
        cur.execute("""
            INSERT INTO post_likes (id, tenant_id, post_id, user_id, user_role,
                                   created_at, updated_at)
            VALUES (%s,%s,%s,%s,'STUDENT',%s,%s)
        """, (uid(), TENANT_ID, pid, student_ids[i % 210], NOW, NOW))
    conn.commit()
    print("  ✓ 210 posts  210 likes")

    # ── 14. Assignments (42) + Submissions (~504) ─────────────────────────
    print("\n[14] Assignments + submissions …")
    asgn_n = sub_n = 0
    ATYPES = ["HOMEWORK", "PROJECT", "QUIZ", "CLASSWORK"]

    for ci, cls in enumerate(classes):
        c_stds  = student_ids[ci * 15:(ci + 1) * 15]
        t_id    = cls["teacher_id"]
        sc      = subj_codes[ci % len(subj_codes)]
        subj_id = subj_map[sc]
        for j in range(3):   # 3 assignments per class × 14 classes = 42
            asgn_id = uid()
            due = date(2026, 1, 10) + timedelta(days=j * 14 + ci)
            atype = ATYPES[j % 4]
            cur.execute("""
                INSERT INTO assignments (id, tenant_id, class_id, subject_id, teacher_id,
                                       title, description, due_date, max_marks,
                                       assignment_type, is_published, published_at,
                                       allow_late_submission, created_at, updated_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,100,%s,true,%s,false,%s,%s)
            """, (
                asgn_id, TENANT_ID, cls["id"], subj_id, t_id,
                f"{cls['name']} — {atype.title()} {j + 1}",
                f"Complete the {atype.lower()} for {cls['name']} by the due date.",
                due.isoformat(), atype,
                datetime(2026, 1, 1).isoformat(), NOW, NOW,
            ))
            asgn_n += 1
            # 80% of 15 = 12 submissions per assignment
            for stud_id in random.sample(c_stds, 12):
                sub_at = datetime(due.year, due.month, due.day, 14, 0) - timedelta(days=random.randint(0, 3))
                marks  = round(random.uniform(55, 98), 2)
                sstatus = random.choice(["SUBMITTED", "GRADED"])
                cur.execute("""
                    INSERT INTO submissions (id, tenant_id, assignment_id, student_id,
                                           submitted_at, marks_obtained, feedback,
                                           status, graded_by, graded_at,
                                           created_at, updated_at)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """, (
                    uid(), TENANT_ID, asgn_id, stud_id, sub_at, marks,
                    "Well done!" if sstatus == "GRADED" else None,
                    sstatus,
                    t_id if sstatus == "GRADED" else None,
                    sub_at + timedelta(days=3) if sstatus == "GRADED" else None,
                    NOW, NOW,
                ))
                sub_n += 1
    conn.commit()
    print(f"  ✓ {asgn_n} assignments  {sub_n} submissions")

    # ── 15. Exams (42) + Results (630) ────────────────────────────────────
    print("\n[15] Exams + results …")
    exam_n = res_n = 0
    EXAM_CONFIGS = [
        ("UNIT_TEST",  50, date(2026, 1, 20)),
        ("MIDTERM",   100, date(2026, 2, 12)),
        ("FINAL",     100, date(2026, 3, 5)),
    ]
    for ci, cls in enumerate(classes):
        c_stds  = student_ids[ci * 15:(ci + 1) * 15]
        sc      = subj_codes[ci % len(subj_codes)]
        subj_id = subj_map[sc]
        for etype, max_m, edate in EXAM_CONFIGS:
            eid = uid()
            cur.execute("""
                INSERT INTO exams (id, tenant_id, class_id, subject_id, academic_year_id,
                                  name, exam_type, exam_date, duration_minutes, max_marks,
                                  passing_marks, is_published, results_published,
                                  created_at, updated_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,180,%s,%s,true,true,%s,%s)
            """, (
                eid, TENANT_ID, cls["id"], subj_id, ay_id,
                f"{cls['name']} {etype.replace('_', ' ').title()}",
                etype,
                datetime(edate.year, edate.month, edate.day, 9, 0).isoformat(),
                max_m, max_m * 0.4, NOW, NOW,
            ))
            exam_n += 1
            for stud_id in c_stds:
                r = random.random()
                if   r < 0.15: marks = random.uniform(max_m * 0.90, max_m)
                elif r < 0.35: marks = random.uniform(max_m * 0.80, max_m * 0.90)
                elif r < 0.55: marks = random.uniform(max_m * 0.70, max_m * 0.80)
                elif r < 0.70: marks = random.uniform(max_m * 0.60, max_m * 0.70)
                elif r < 0.82: marks = random.uniform(max_m * 0.50, max_m * 0.60)
                elif r < 0.92: marks = random.uniform(max_m * 0.40, max_m * 0.50)
                else:           marks = random.uniform(0,            max_m * 0.40)
                g, gp, isp = grade_for(marks, max_m)
                cur.execute("""
                    INSERT INTO exam_results (id, tenant_id, exam_id, student_id,
                                            marks_obtained, grade, grade_points, is_pass,
                                            entered_by, created_at, updated_at)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """, (uid(), TENANT_ID, eid, stud_id,
                      round(marks, 2), g, gp, isp, admin_id, NOW, NOW))
                res_n += 1
    conn.commit()
    print(f"  ✓ {exam_n} exams  {res_n} exam results")

    # ── 16. Notifications (210) ───────────────────────────────────────────
    print("\n[16] Notifications …")
    NOTIF_TITLES = [
        "Fee Payment Reminder", "Attendance Alert", "Exam Result Published",
        "Assignment Due", "School Event", "Holiday Notice", "Parent Meeting",
        "Result Card Ready", "Library Book Due", "Sports Day Notice",
    ]
    for i in range(210):
        title   = random.choice(NOTIF_TITLES)
        n_date  = NOW - timedelta(days=random.randint(0, 45))
        is_read = random.random() > 0.35
        cur.execute("""
            INSERT INTO notifications (id, tenant_id, user_id, channel, title, body,
                                      is_read, sent_at, read_at, status,
                                      created_at, updated_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,'SENT',%s,%s)
        """, (
            uid(), TENANT_ID, student_ids[i % 210],
            random.choice(["EMAIL", "IN_APP", "SMS"]), title,
            f"Notification: {title}. Please check the SBM portal for details.",
            is_read, n_date,
            n_date + timedelta(hours=2) if is_read else None,
            NOW, NOW,
        ))
    conn.commit()
    print("  ✓ 210 notifications")

    # ── Summary ───────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("  ✅  SBM Fixture Seed COMPLETE")
    print("=" * 60)
    print(f"  Tenant   : {TENANT_NAME}")
    print(f"  Slug     : {TENANT_SLUG}")
    print(f"  Login    : {ADMIN_EMAIL}  /  {ADMIN_PASSWORD}")
    print(f"  Students : {len(student_ids)}  (200 ACTIVE, 7 INACTIVE, 3 TRANSFERRED)")
    print(f"  Classes  : {len(classes)}")
    print(f"  Invoices : {inv_n}  |  items: {inv_n * 3}  |  payments: {pay_n}")
    print(f"  Attend.  : {ar_n} records  |  {ae_n} entries")
    print(f"  Exams    : {exam_n}  |  results: {res_n}")
    print(f"  Assign.  : {asgn_n}  |  submissions: {sub_n}")
    print(f"  Posts    : 210  |  likes: 210")
    print(f"  Notifs   : 210")
    print("=" * 60)
    print(f"\n  Sign in at http://localhost:3000")
    print(f"  tenant_slug = {TENANT_SLUG}")
    print("=" * 60)

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
