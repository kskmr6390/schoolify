#!/usr/bin/env python3
"""
Rich analytics seed for Schoolify.
Creates 50 students, 6 teachers, 90 days attendance, invoices, exams, assignments.

Usage:
    python3 scripts/seed_analytics.py

Requires: psycopg2-binary bcrypt
    pip3 install psycopg2-binary bcrypt
"""
import uuid
import random
import bcrypt
import json
import psycopg2
import psycopg2.extras
from datetime import date, datetime, timedelta

# ── Config ────────────────────────────────────────────────────────────────────
DB = "postgresql://schoolify:schoolify_dev_password@localhost:5433/schoolify"
TENANT_ID = "47f46e0f-908c-4031-bc86-b3b3dfdff7cb"   # greenwood-high
TODAY = date(2026, 3, 23)

random.seed(42)   # reproducible


# ── Helpers ───────────────────────────────────────────────────────────────────
def uid():
    return str(uuid.uuid4())


def ts(d: date):
    return datetime(d.year, d.month, d.day, 8, 0, 0)


def hp(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt(12)).decode()


def working_days(start: date, end: date):
    """Return list of Mon-Fri dates between start and end (inclusive)."""
    days = []
    d = start
    while d <= end:
        if d.weekday() < 5:
            days.append(d)
        d += timedelta(days=1)
    return days


# ── Data definitions ──────────────────────────────────────────────────────────
MALE_FIRST   = ["Aarav","Arjun","Dev","Dhruv","Karan","Rohan","Vikram","Nikhil",
                "Pranav","Siddharth","Ankit","Harsh","Raj","Kabir","Ishan",
                "Yash","Mihir","Rishi","Tarun","Aditya","Om","Vivek","Neil","Jay","Shiv"]
FEMALE_FIRST = ["Aanya","Priya","Riya","Sneha","Kavya","Pooja","Ishaan","Nisha",
                "Ananya","Meera","Swati","Tanya","Divya","Simran","Kriti",
                "Shreya","Tanvi","Aditi","Avni","Mahi","Pari","Zara","Dia","Sana","Noor"]
LAST_NAMES   = ["Sharma","Patel","Singh","Kumar","Gupta","Verma","Mishra","Joshi",
                "Nair","Iyer","Reddy","Rao","Shah","Mehta","Jain","Kapoor",
                "Malhotra","Agarwal","Bose","Das","Sen","Pillai","Menon","Nambiar","Khanna"]

SUBJECTS = [
    ("Mathematics",    "MATH"),
    ("Science",        "SCI"),
    ("English",        "ENG"),
    ("History",        "HIST"),
    ("Physics",        "PHY"),
    ("Chemistry",      "CHEM"),
    ("Biology",        "BIO"),
    ("Computer Sc.",   "CS"),
]

TEACHERS = [
    ("David",  "Chen",       "teacher.math@greenwoodhigh.edu",    "Teacher@123"),
    ("Priya",  "Sharma",     "teacher.science@greenwoodhigh.edu", "Teacher@123"),
    ("Maria",  "Rodriguez",  "teacher.english@greenwoodhigh.edu", "Teacher@123"),
    ("James",  "Thompson",   "teacher.history@greenwoodhigh.edu", "Teacher@123"),
    ("Wei",    "Li",         "teacher.physics@greenwoodhigh.edu", "Teacher@123"),
    ("Arjun",  "Patel",      "teacher.biology@greenwoodhigh.edu", "Teacher@123"),
]

# (grade, section, capacity, teacher_idx)
CLASSES = [
    (8,  "A", 35, 4),   # Grade 8-A  — Wei Li
    (9,  "A", 38, 1),   # Grade 9-A  — Priya Sharma
    (9,  "B", 37, 2),   # Grade 9-B  — Maria Rodriguez
    (10, "A", 40, 0),   # Grade 10-A — David Chen
    (10, "B", 35, 3),   # Grade 10-B — James Thompson
]

# Attendance rate per class (0-1)
CLASS_ATT_RATE = [0.82, 0.88, 0.85, 0.92, 0.87]

GRADE_DIST = [
    ("A+", 90, 100, 4.0, True,  0.15),
    ("A",  80,  89, 3.7, True,  0.20),
    ("B+", 70,  79, 3.3, True,  0.25),
    ("B",  60,  69, 3.0, True,  0.20),
    ("C",  50,  59, 2.0, True,  0.12),
    ("D",  40,  49, 1.0, True,  0.05),
    ("F",   0,  39, 0.0, False, 0.03),
]


def pick_grade(max_marks, passing_marks):
    """Return (marks, grade_letter, grade_points, is_pass)."""
    r = random.random()
    cumul = 0.0
    for g, lo, hi, gp, ip, prob in GRADE_DIST:
        cumul += prob
        if r <= cumul:
            pct = random.uniform(lo, hi) / 100
            marks = round(float(max_marks) * pct, 1)
            is_p = marks >= float(passing_marks)
            return marks, g, gp, is_p
    marks = round(float(max_marks) * 0.35, 1)
    return marks, "F", 0.0, False


# ── Main seed ─────────────────────────────────────────────────────────────────
def run():
    conn = psycopg2.connect(DB)
    conn.autocommit = False
    cur = conn.cursor()

    print("Connected to DB. Clearing existing tenant data...")

    # Clear in dependency order (some tables have no tenant_id — delete via parent)
    cur.execute("""DELETE FROM attendance_entries WHERE record_id IN
        (SELECT id FROM attendance_records WHERE tenant_id=%s)""", (TENANT_ID,))
    cur.execute("""DELETE FROM invoice_items WHERE invoice_id IN
        (SELECT id FROM invoices WHERE tenant_id=%s)""", (TENANT_ID,))
    for tbl in ["submissions", "exam_results", "exams", "assignments",
                "attendance_records",
                "payments", "invoices", "fee_structures",
                "student_documents", "parents", "students",
                "subjects", "classes", "academic_years",
                "staff_profiles", "users"]:
        cur.execute(f"DELETE FROM {tbl} WHERE tenant_id = %s", (TENANT_ID,))
        print(f"  cleared {tbl}")

    conn.commit()

    # ── Users ─────────────────────────────────────────────────────────────────
    print("\nCreating users...")
    now = datetime.utcnow()

    admin_id = uid()
    cur.execute("""
        INSERT INTO users (id, tenant_id, created_at, updated_at, email, password_hash,
                           role, status, first_name, last_name)
        VALUES (%s,%s,%s,%s,%s,%s,'ADMIN','ACTIVE','Sarah','Mitchell')
    """, (admin_id, TENANT_ID, now, now, "admin@greenwoodhigh.edu", hp("Admin@123")))

    teacher_ids = []
    for fn, ln, email, pw in TEACHERS:
        tid2 = uid()
        teacher_ids.append(tid2)
        cur.execute("""
            INSERT INTO users (id, tenant_id, created_at, updated_at, email, password_hash,
                               role, status, first_name, last_name)
            VALUES (%s,%s,%s,%s,%s,%s,'TEACHER','ACTIVE',%s,%s)
        """, (tid2, TENANT_ID, now, now, email, hp(pw), fn, ln))

    parent_ids = []
    for i in range(3):
        pid = uid()
        parent_ids.append(pid)
        cur.execute("""
            INSERT INTO users (id, tenant_id, created_at, updated_at, email, password_hash,
                               role, status, first_name, last_name)
            VALUES (%s,%s,%s,%s,%s,%s,'PARENT','ACTIVE',%s,'Johnson')
        """, (pid, TENANT_ID, now, now, f"parent{i+1}@email.com", hp("Parent@123"),
              ["Mary","Robert","Susan"][i]))

    conn.commit()
    print(f"  1 admin, {len(teacher_ids)} teachers, {len(parent_ids)} parents")

    # ── Staff profiles ────────────────────────────────────────────────────────
    print("Creating staff profiles...")
    dept_map = ["Mathematics","Science","English","History","Physics","Biology"]
    desig_map = ["Senior Teacher","Head of Science","English Dept Lead",
                 "Social Studies HOD","Physics Teacher","Biology Teacher"]
    for i, tid2 in enumerate(teacher_ids):
        cur.execute("""
            INSERT INTO staff_profiles (id, tenant_id, created_at, updated_at,
                user_id, employee_id, department, designation, date_of_joining,
                qualifications, subject_expertise)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (uid(), TENANT_ID, now, now, tid2,
              f"EMP-{1001+i}",
              dept_map[i], desig_map[i],
              date(2020 + i % 4, 6, 1),
              json.dumps([{"degree":"B.Ed","institution":"State University","year":2018+i%3}]),
              json.dumps([dept_map[i]])))

    # Admin staff profile
    cur.execute("""
        INSERT INTO staff_profiles (id, tenant_id, created_at, updated_at,
            user_id, employee_id, department, designation, date_of_joining,
            qualifications, subject_expertise)
        VALUES (%s,%s,%s,%s,%s,'EMP-1000','Administration','Principal',%s,%s,%s)
    """, (uid(), TENANT_ID, now, now, admin_id,
          date(2018, 6, 1),
          json.dumps([{"degree":"M.Ed","institution":"Central University","year":2017}]),
          json.dumps(["Administration"])))

    conn.commit()
    print(f"  {len(teacher_ids)+1} staff profiles created")

    # ── Academic year ─────────────────────────────────────────────────────────
    print("Creating academic year 2025-26...")
    ay_id = uid()
    cur.execute("""
        INSERT INTO academic_years (id, tenant_id, created_at, updated_at,
                                    name, start_date, end_date, is_current)
        VALUES (%s,%s,%s,%s,'2025-26','2025-09-01','2026-05-31',true)
    """, (ay_id, TENANT_ID, now, now))

    # ── Classes ───────────────────────────────────────────────────────────────
    print("Creating classes...")
    class_ids = []
    for grade, section, cap, t_idx in CLASSES:
        cid = uid()
        class_ids.append(cid)
        cur.execute("""
            INSERT INTO classes (id, tenant_id, created_at, updated_at,
                academic_year_id, name, grade, section, capacity, class_teacher_id)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (cid, TENANT_ID, now, now, ay_id,
              f"Grade {grade}-{section}", grade, section, cap,
              teacher_ids[t_idx]))
    conn.commit()
    print(f"  {len(class_ids)} classes")

    # ── Subjects ─────────────────────────────────────────────────────────────
    print("Creating subjects...")
    subject_ids = []
    for name, code in SUBJECTS:
        sid = uid()
        subject_ids.append(sid)
        cur.execute("""
            INSERT INTO subjects (id, tenant_id, created_at, updated_at,
                                  name, code, is_active)
            VALUES (%s,%s,%s,%s,%s,%s,true)
        """, (sid, TENANT_ID, now, now, name, code))
    conn.commit()

    # ── Students (50) ────────────────────────────────────────────────────────
    print("Creating 50 students...")
    student_ids_by_class = [[] for _ in range(5)]

    # Enrollment dates spread over last 6 months for trend chart
    enroll_buckets = [
        (date(2025, 10, 1), date(2025, 10, 31), 20),   # Oct: bulk
        (date(2025, 11, 1), date(2025, 11, 30),  5),
        (date(2025, 12, 1), date(2025, 12, 31),  3),
        (date(2026,  1, 1), date(2026,  1, 31),  8),
        (date(2026,  2, 1), date(2026,  2, 28),  7),
        (date(2026,  3, 1), date(2026,  3, 20),  7),
    ]

    enroll_dates = []
    for start, end, count in enroll_buckets:
        span = (end - start).days
        for _ in range(count):
            enroll_dates.append(start + timedelta(days=random.randint(0, span)))
    random.shuffle(enroll_dates)

    genders = ["MALE"] * 26 + ["FEMALE"] * 24
    random.shuffle(genders)

    statuses = ["ACTIVE"] * 47 + ["INACTIVE"] * 2 + ["TRANSFERRED"] * 1
    random.shuffle(statuses)

    idx = 0
    for ci, cid in enumerate(class_ids):
        for j in range(10):
            g = genders[idx]
            fn = random.choice(MALE_FIRST if g == "MALE" else FEMALE_FIRST)
            ln = random.choice(LAST_NAMES)
            enroll_d = enroll_dates[idx]
            dob = date(2009 + CLASSES[ci][0] - 8, random.randint(1,12), random.randint(1,28))
            st_id = uid()
            student_ids_by_class[ci].append(st_id)
            cur.execute("""
                INSERT INTO students (id, tenant_id, created_at, updated_at,
                    student_code, first_name, last_name, dob, gender,
                    enrollment_date, class_id, roll_number, status)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (st_id, TENANT_ID, ts(enroll_d), ts(enroll_d),
                  f"SCH-2025-{idx+1:04d}", fn, ln, dob, g,
                  enroll_d, cid, j + 1, statuses[idx]))
            idx += 1

    conn.commit()
    print(f"  50 students created")

    # ── Student documents (~70% coverage) ────────────────────────────────────
    print("Creating student documents...")
    all_students = [s for cls in student_ids_by_class for s in cls]
    doc_students = random.sample(all_students, 36)
    doc_types = ["BIRTH_CERTIFICATE", "TRANSFER_CERTIFICATE", "PHOTO", "REPORT_CARD"]
    for st_id in doc_students:
        for dt in random.sample(doc_types, random.randint(1, 3)):
            cur.execute("""
                INSERT INTO student_documents (id, tenant_id, created_at, updated_at,
                    student_id, document_type, file_url, file_name, uploaded_by)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (uid(), TENANT_ID, now, now, st_id, dt,
                  f"https://s3.example.com/docs/{uid()}.pdf",
                  f"{dt.lower()}.pdf", admin_id))
    conn.commit()
    print(f"  documents for {len(doc_students)} students")

    # ── Attendance (Oct 2025 – Mar 2026 working days) ─────────────────────────
    print("Creating attendance records...")
    att_days = working_days(date(2025, 10, 1), TODAY)
    att_count = 0
    for ci, cid in enumerate(class_ids):
        rate = CLASS_ATT_RATE[ci]
        rec_teacher = teacher_ids[CLASSES[ci][3]]
        students_in_class = student_ids_by_class[ci]
        for d in att_days:
            rec_id = uid()
            cur.execute("""
                INSERT INTO attendance_records (id, tenant_id, created_at, updated_at,
                    class_id, date, recorded_by)
                VALUES (%s,%s,%s,%s,%s,%s,%s)
            """, (rec_id, TENANT_ID, ts(d), ts(d), cid, d, rec_teacher))

            for st_id in students_in_class:
                r = random.random()
                if r < rate:
                    status = "PRESENT"
                elif r < rate + 0.03:
                    status = "LATE"
                elif r < rate + 0.05:
                    status = "EXCUSED"
                else:
                    status = "ABSENT"
                cur.execute("""
                    INSERT INTO attendance_entries (id, record_id,
                        student_id, status, marked_at)
                    VALUES (%s,%s,%s,%s,%s)
                """, (uid(), rec_id, st_id, status, ts(d)))
            att_count += 1

    conn.commit()
    print(f"  {att_count} attendance records × 10 students each")

    # ── Fee structures ────────────────────────────────────────────────────────
    print("Creating fee structures...")
    fee_defs = [
        ("Tuition Fee",  15000, "TUITION"),
        ("Library Fee",     500, "LIBRARY"),
        ("Lab Fee",        1000, "LAB"),
    ]
    fs_ids = []
    for name, amt, ftype in fee_defs:
        fid = uid()
        fs_ids.append((fid, amt))
        cur.execute("""
            INSERT INTO fee_structures (id, tenant_id, created_at, updated_at,
                academic_year_id, name, amount, due_date, fee_type, is_active)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,true)
        """, (fid, TENANT_ID, now, now, ay_id, name, amt,
              date(2025, 10, 15), ftype))
    conn.commit()

    # ── Invoices + payments ───────────────────────────────────────────────────
    print("Creating invoices and payments...")
    # Monthly issued_date spread for trend
    issue_months = [date(2025,10,1), date(2025,11,1), date(2025,12,1),
                    date(2026,1,1),  date(2026,2,1),  date(2026,3,1)]
    statuses_inv = (["PAID"] * 17 + ["PARTIAL"] * 13 +
                    ["OVERDUE"] * 11 + ["PENDING"] * 9)
    random.shuffle(statuses_inv)

    pay_methods = ["CASH","CARD","UPI","BANK_TRANSFER","ONLINE"]
    total_amount = sum(a for _, a in fs_ids)  # 16500

    for i, st_id in enumerate(all_students):
        inv_id = uid()
        status = statuses_inv[i % len(statuses_inv)]
        issue_d = issue_months[i % len(issue_months)]
        due_d = issue_d + timedelta(days=30)
        if status == "OVERDUE":
            due_d = issue_d + timedelta(days=15)

        if status == "PAID":
            paid = total_amount
        elif status == "PARTIAL":
            paid = round(total_amount * random.uniform(0.3, 0.8), 2)
        else:
            paid = 0

        cur.execute("""
            INSERT INTO invoices (id, tenant_id, created_at, updated_at,
                student_id, academic_year_id, invoice_number,
                total_amount, paid_amount, discount_amount, late_fee,
                status, issued_date, due_date)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,0,0,%s,%s,%s)
        """, (inv_id, TENANT_ID, ts(issue_d), ts(issue_d),
              st_id, ay_id, f"INV-2025-{i+1:04d}",
              total_amount, paid, status, issue_d, due_d))

        # Insert invoice items
        for fs_id, amt in fs_ids:
            cur.execute("""
                INSERT INTO invoice_items (id, invoice_id, fee_structure_id,
                    description, amount, quantity)
                VALUES (%s,%s,%s,%s,%s,1)
            """, (uid(), inv_id, fs_id,
                  next(n for n, a, _ in fee_defs if a == amt), amt))

        # Payment record for paid/partial
        if paid > 0:
            cur.execute("""
                INSERT INTO payments (id, tenant_id, created_at, updated_at,
                    invoice_id, student_id, amount, payment_method,
                    idempotency_key, status, paid_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,'COMPLETED',%s)
            """, (uid(), TENANT_ID, ts(issue_d), ts(issue_d),
                  inv_id, st_id, paid,
                  random.choice(pay_methods),
                  f"pay-{i}-{uuid.uuid4().hex[:8]}",
                  datetime.combine(issue_d + timedelta(days=random.randint(1,20)),
                                   datetime.min.time())))

    conn.commit()
    print(f"  {len(all_students)} invoices created")

    # ── Exams ─────────────────────────────────────────────────────────────────
    print("Creating exams and results...")
    exam_schedule = [
        ("Unit Test 1", "UNIT_TEST", date(2025,11,15), 50,  20),
        ("Midterm",     "MIDTERM",   date(2026, 1,20), 100, 40),
        ("Final Exam",  "FINAL",     date(2026, 3,10), 100, 40),
    ]
    # Use first 4 subjects (Math, Science, English, History) for exams
    exam_subjects = subject_ids[:4]

    exam_ids_all = []
    for ci, cid in enumerate(class_ids):
        for exam_name, exam_type, exam_dt, max_m, pass_m in exam_schedule:
            subj = exam_subjects[ci % len(exam_subjects)]
            eid = uid()
            exam_ids_all.append((eid, cid, subj, max_m, pass_m))
            cur.execute("""
                INSERT INTO exams (id, tenant_id, created_at, updated_at,
                    class_id, subject_id, academic_year_id, name, exam_type,
                    exam_date, duration_minutes, max_marks, passing_marks,
                    is_published, results_published)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,90,%s,%s,true,true)
            """, (eid, TENANT_ID, ts(exam_dt), ts(exam_dt),
                  cid, subj, ay_id, exam_name, exam_type,
                  datetime.combine(exam_dt, datetime.min.time()),
                  max_m, pass_m))

    # Exam results
    result_count = 0
    for eid, cid, subj, max_m, pass_m in exam_ids_all:
        ci = class_ids.index(cid)
        for st_id in student_ids_by_class[ci]:
            marks, grade, gp, is_p = pick_grade(max_m, pass_m)
            cur.execute("""
                INSERT INTO exam_results (id, tenant_id, created_at, updated_at,
                    exam_id, student_id, marks_obtained, grade, grade_points,
                    is_pass, entered_by)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (uid(), TENANT_ID, now, now,
                  eid, st_id, marks, grade, gp, is_p, admin_id))
            result_count += 1

    conn.commit()
    print(f"  {len(exam_ids_all)} exams, {result_count} results")

    # ── Assignments + submissions ─────────────────────────────────────────────
    print("Creating assignments and submissions...")
    assign_types = ["HOMEWORK","PROJECT","QUIZ","CLASSWORK"]
    assign_count = 0
    sub_count = 0
    for ci, cid in enumerate(class_ids):
        subj = subject_ids[ci % len(subject_ids)]
        teacher = teacher_ids[CLASSES[ci][3]]
        for j in range(3):
            due = date(2026, 1 + j, 28)
            aid = uid()
            cur.execute("""
                INSERT INTO assignments (id, tenant_id, created_at, updated_at,
                    class_id, subject_id, teacher_id, title, due_date, max_marks,
                    assignment_type, is_published, published_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,100,%s,true,%s)
            """, (uid(), TENANT_ID, ts(due - timedelta(days=10)), ts(due - timedelta(days=10)),
                  cid, subj, teacher,
                  f"Assignment {j+1} — {SUBJECTS[ci % len(SUBJECTS)][0]}",
                  datetime.combine(due, datetime.min.time()),
                  random.choice(assign_types),
                  datetime.combine(due - timedelta(days=10), datetime.min.time())))
            aid = cur.execute  # unused — we re-fetch below

        assign_count += 3

    # Fetch assignment IDs to create submissions
    cur.execute("""
        SELECT id, class_id FROM assignments WHERE tenant_id = %s
    """, (TENANT_ID,))
    assignments = cur.fetchall()

    for asgn_id, class_id in assignments:
        if class_id in class_ids:
            ci = class_ids.index(class_id)
        else:
            continue
        for st_id in student_ids_by_class[ci]:
            if random.random() < 0.75:   # 75% submission rate
                sub_status = "GRADED" if random.random() < 0.5 else "SUBMITTED"
                marks = round(random.uniform(60, 98), 1) if sub_status == "GRADED" else None
                cur.execute("""
                    INSERT INTO submissions (id, tenant_id, created_at, updated_at,
                        assignment_id, student_id, status, marks_obtained, submitted_at)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    ON CONFLICT (tenant_id, assignment_id, student_id) DO NOTHING
                """, (uid(), TENANT_ID, now, now,
                      asgn_id, st_id, sub_status, marks,
                      now if sub_status in ("SUBMITTED","GRADED") else None))
                sub_count += 1

    conn.commit()
    print(f"  {len(assignments)} assignments, {sub_count} submissions")

    cur.close()
    conn.close()

    print("\n" + "="*60)
    print("SEED COMPLETE")
    print("="*60)
    print(f"Tenant:    Greenwood High School  ({TENANT_ID})")
    print(f"URL:       http://localhost:3000/login")
    print(f"\n{'Role':<12} {'Email':<45} {'Password'}")
    print("-" * 70)
    print(f"{'admin':<12} {'admin@greenwoodhigh.edu':<45} Admin@123")
    for fn, ln, email, pw in TEACHERS:
        print(f"{'teacher':<12} {email:<45} {pw}")
    for i in range(3):
        print(f"{'parent':<12} {f'parent{i+1}@email.com':<45} Parent@123")
    print("\nData seeded:")
    print(f"  Students:          50  (47 active, 2 inactive, 1 transferred)")
    print(f"  Classes:           5   (Grades 8-10)")
    print(f"  Subjects:          8")
    print(f"  Attendance days:   {len(att_days)} working days (Oct 2025 – Mar 2026)")
    print(f"  Invoices:          50  (17 paid, 13 partial, 11 overdue, 9 pending)")
    print(f"  Exams:             15  (3 per class)")
    print(f"  Exam results:      {result_count}")
    print(f"  Assignments:       {len(assignments)}")
    print(f"  Submissions:       {sub_count}")
    print("="*60)


if __name__ == "__main__":
    run()
