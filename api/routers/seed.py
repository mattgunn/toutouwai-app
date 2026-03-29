"""Dev mode: seed database with realistic dummy data for all modules."""
import random
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()

FIRST_NAMES = ["James", "Emma", "Liam", "Olivia", "Noah", "Ava", "William", "Sophia", "Oliver", "Isabella",
               "Ethan", "Mia", "Lucas", "Charlotte", "Mason", "Amelia", "Logan", "Harper", "Alexander", "Evelyn",
               "Aroha", "Tane", "Nikau", "Manaia", "Kaia", "Sione", "Mele", "Raj", "Priya", "Wei"]
LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Wilson", "Taylor", "Thomas", "Anderson", "White",
              "Harris", "Martin", "Thompson", "Robinson", "Clark", "Lewis", "Walker", "Young", "Allen", "King",
              "Te Puni", "Ngata", "Taufa", "Sharma", "Chen", "Kim", "Patel", "Singh", "Nguyen", "Garcia"]


def _date(year=2025, month_range=(1, 12), day_range=(1, 28)):
    m = random.randint(*month_range)
    d = random.randint(*day_range)
    return f"{year}-{m:02d}-{d:02d}"


def _past_date():
    return _date(random.choice([2023, 2024, 2025]), (1, 12))


def _future_date():
    return _date(2026, (4, 12))


@router.post("/seed")
def seed_database(conn=Depends(get_db), user=Depends(get_current_user)):
    """Populate the database with realistic dummy data for development."""
    ts = now_iso()

    # Check if already seeded — clear first
    count = conn.execute("SELECT COUNT(*) FROM employees").fetchone()[0]
    if count > 0:
        tables = [
            "survey_responses", "survey_questions", "surveys",
            "workflow_approvals", "workflow_instances", "workflow_steps", "workflow_definitions",
            "audit_log", "documents",
            "onboarding_tasks", "onboarding_checklists", "onboarding_template_tasks", "onboarding_templates",
            "succession_candidates", "succession_plans",
            "benefit_enrollments", "benefit_plans", "compensation",
            "goals", "reviews", "review_cycles",
            "time_entries", "leave_requests",
            "applicants", "job_postings",
            "employees", "positions", "departments",
        ]
        for t in tables:
            try:
                conn.execute(f"DELETE FROM {t}")
            except Exception:
                pass
        conn.commit()

    # --- Departments ---
    dept_data = [
        "Engineering", "Product", "Human Resources", "Finance",
        "Marketing", "Sales", "Operations", "Legal", "Customer Success",
    ]
    dept_ids = {}
    for name in dept_data:
        did = new_id()
        dept_ids[name] = did
        conn.execute(
            "INSERT INTO departments (id, name, description, created_at, updated_at) VALUES (?,?,?,?,?)",
            (did, name, f"{name} department", ts, ts)
        )

    # --- Positions ---
    pos_data = [
        ("Software Engineer", "Engineering", "IC3"),
        ("Senior Software Engineer", "Engineering", "IC4"),
        ("Engineering Manager", "Engineering", "M1"),
        ("Product Manager", "Product", "IC4"),
        ("Senior Product Manager", "Product", "IC5"),
        ("HR Coordinator", "Human Resources", "IC2"),
        ("HR Manager", "Human Resources", "M1"),
        ("Financial Analyst", "Finance", "IC3"),
        ("Finance Manager", "Finance", "M1"),
        ("Marketing Specialist", "Marketing", "IC3"),
        ("Marketing Manager", "Marketing", "M1"),
        ("Sales Representative", "Sales", "IC2"),
        ("Sales Manager", "Sales", "M1"),
        ("Operations Analyst", "Operations", "IC3"),
        ("Customer Success Manager", "Customer Success", "M1"),
        ("Legal Counsel", "Legal", "IC5"),
    ]
    pos_ids = {}
    for title, dept, level in pos_data:
        pid = new_id()
        pos_ids[title] = pid
        conn.execute(
            "INSERT INTO positions (id, title, department_id, level, description, created_at, updated_at) VALUES (?,?,?,?,?,?,?)",
            (pid, title, dept_ids[dept], level, f"{title} role in {dept}", ts, ts)
        )

    # --- Employees ---
    emp_ids = []
    managers = {}
    used_emails: set[str] = set()

    def _unique_email(fn: str, ln: str) -> str:
        base = f"{fn.lower()}.{ln.lower().replace(' ', '')}@company.co.nz"
        if base not in used_emails:
            used_emails.add(base)
            return base
        for i in range(1, 100):
            candidate = f"{fn.lower()}.{ln.lower().replace(' ', '')}{i}@company.co.nz"
            if candidate not in used_emails:
                used_emails.add(candidate)
                return candidate
        return f"{new_id()[:8]}@company.co.nz"

    # Create managers first
    for dept_name, dept_id in dept_ids.items():
        eid = new_id()
        fn, ln = random.choice(FIRST_NAMES), random.choice(LAST_NAMES)
        mgr_positions = [t for t, d, _ in pos_data if d == dept_name and "Manager" in t]
        pos_title = mgr_positions[0] if mgr_positions else pos_data[0][0]
        salary = random.randint(120000, 180000)
        conn.execute(
            """INSERT INTO employees (id, first_name, last_name, email, phone, department_id, position_id,
            manager_id, start_date, status, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,NULL,?,?,?,?)""",
            (eid, fn, ln, _unique_email(fn, ln),
             f"+64 21 {random.randint(100,999)} {random.randint(1000,9999)}",
             dept_id, pos_ids.get(pos_title, list(pos_ids.values())[0]),
             _past_date(), "active", ts, ts)
        )
        emp_ids.append(eid)
        managers[dept_name] = eid

        conn.execute(
            "INSERT INTO compensation (id, employee_id, effective_date, salary, currency, pay_frequency, reason, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
            (new_id(), eid, _past_date(), salary, "NZD", "annual", "Initial compensation", ts, ts)
        )

    # Create regular employees
    statuses = ["active"] * 8 + ["on_leave", "inactive"]
    for _ in range(35):
        eid = new_id()
        fn, ln = random.choice(FIRST_NAMES), random.choice(LAST_NAMES)
        dept_name = random.choice(list(dept_ids.keys()))
        dept_positions = [t for t, d, _ in pos_data if d == dept_name and "Manager" not in t]
        pos_title = random.choice(dept_positions) if dept_positions else pos_data[0][0]
        status = random.choice(statuses)
        start = _past_date()
        salary = random.randint(60000, 150000)

        conn.execute(
            """INSERT INTO employees (id, first_name, last_name, email, phone, department_id, position_id,
            manager_id, start_date, status, address, emergency_contact, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (eid, fn, ln, _unique_email(fn, ln),
             f"+64 21 {random.randint(100,999)} {random.randint(1000,9999)}",
             dept_ids[dept_name], pos_ids.get(pos_title, list(pos_ids.values())[0]),
             managers[dept_name], start, status,
             f"{random.randint(1,200)} {random.choice(['Queen St', 'Lambton Quay', 'Riccarton Rd', 'Ponsonby Rd', 'Cuba St'])}, {random.choice(['Auckland', 'Wellington', 'Christchurch'])}",
             f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)} - {random.choice(['Partner', 'Parent', 'Sibling'])} - +64 21 {random.randint(100,999)} {random.randint(1000,9999)}",
             ts, ts)
        )
        emp_ids.append(eid)

        conn.execute(
            "INSERT INTO compensation (id, employee_id, effective_date, salary, currency, pay_frequency, reason, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
            (new_id(), eid, start, salary, "NZD", "annual", "Starting salary", ts, ts)
        )
        if random.random() > 0.6:
            conn.execute(
                "INSERT INTO compensation (id, employee_id, effective_date, salary, currency, pay_frequency, reason, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
                (new_id(), eid, _date(2025, (6, 12)), int(salary * 1.05 + random.randint(0, 5000)), "NZD", "annual",
                 random.choice(["Annual review", "Promotion", "Market adjustment"]), ts, ts)
            )

    # --- Leave Requests ---
    leave_types = conn.execute("SELECT id FROM leave_types").fetchall()
    leave_type_ids = [lt["id"] for lt in leave_types]
    statuses_lr = ["pending"] * 3 + ["approved"] * 5 + ["rejected"]
    for _ in range(40):
        eid = random.choice(emp_ids)
        days = random.randint(1, 10)
        start_dt = datetime(2025, random.randint(1, 12), random.randint(1, 25))
        end_dt = start_dt + timedelta(days=days - 1)
        start = start_dt.strftime("%Y-%m-%d")
        end = end_dt.strftime("%Y-%m-%d")
        conn.execute(
            """INSERT INTO leave_requests (id, employee_id, leave_type_id, start_date, end_date, days, notes, status, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (new_id(), eid, random.choice(leave_type_ids), start, end, days,
             random.choice(["Family vacation", "Medical appointment", "Personal day", "Wedding", "Moving house", "Conference"]),
             random.choice(statuses_lr), ts, ts)
        )

    # --- Time Entries ---
    for _ in range(80):
        eid = random.choice(emp_ids)
        date = _date(2025, (10, 12))
        conn.execute(
            "INSERT INTO time_entries (id, employee_id, date, hours, project, description, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)",
            (new_id(), eid, date, round(random.uniform(4, 10), 1),
             random.choice(["Project Alpha", "Project Beta", "Internal", "Client Work", "R&D"]),
             random.choice(["Sprint work", "Client meeting", "Code review", "Documentation", "Feature development", "Bug fixes"]),
             ts, ts)
        )

    # --- Job Postings ---
    posting_data = [
        ("Senior Full Stack Developer", "Engineering", "Build scalable web applications"),
        ("DevOps Engineer", "Engineering", "Manage CI/CD pipelines and cloud infrastructure"),
        ("Product Designer", "Product", "Design user-centred experiences"),
        ("Data Analyst", "Finance", "Analyse business metrics and build dashboards"),
        ("Account Executive", "Sales", "Drive enterprise sales growth"),
        ("Content Marketing Lead", "Marketing", "Develop content strategy and execution"),
    ]
    posting_ids = []
    for title, dept, desc in posting_data:
        pid = new_id()
        posting_ids.append(pid)
        conn.execute(
            """INSERT INTO job_postings (id, title, department_id, description, requirements, location, employment_type, salary_min, salary_max, status, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (pid, title, dept_ids.get(dept, list(dept_ids.values())[0]), desc,
             "3+ years experience\nRelevant qualifications\nStrong communication skills",
             random.choice(["Auckland", "Wellington", "Remote", "Christchurch"]),
             random.choice(["full_time", "contract"]),
             80000, 140000,
             random.choice(["open", "open", "open", "closed"]), ts, ts)
        )

    # --- Applicants ---
    stages = ["applied", "screening", "interview", "offer", "hired", "rejected"]
    for _ in range(25):
        fn, ln = random.choice(FIRST_NAMES), random.choice(LAST_NAMES)
        conn.execute(
            """INSERT INTO applicants (id, job_posting_id, first_name, last_name, email, phone, resume_url, stage, notes, applied_at, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (new_id(), random.choice(posting_ids), fn, ln,
             f"{fn.lower()}.{ln.lower()}@gmail.com",
             f"+64 22 {random.randint(100,999)} {random.randint(1000,9999)}",
             None, random.choice(stages),
             random.choice(["Strong candidate", "Good culture fit", "Needs technical assessment", "Referred by employee", ""]),
             _past_date(), ts, ts)
        )

    # --- Review Cycles ---
    cycle_ids = []
    for name, status in [("2024 Annual Review", "completed"), ("2025 Mid-Year Review", "active"), ("2025 Annual Review", "draft")]:
        cid = new_id()
        cycle_ids.append(cid)
        conn.execute(
            "INSERT INTO review_cycles (id, name, status, start_date, end_date, created_at, updated_at) VALUES (?,?,?,?,?,?,?)",
            (cid, name, status, "2025-01-01", "2025-12-31", ts, ts)
        )

    # --- Reviews ---
    for _ in range(30):
        conn.execute(
            """INSERT INTO reviews (id, cycle_id, employee_id, reviewer_id, status, rating, feedback, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?)""",
            (new_id(), random.choice(cycle_ids), random.choice(emp_ids), random.choice(emp_ids),
             random.choice(["draft", "submitted", "completed"]),
             random.choice([None, 3, 4, 5, 4, 3, 5]),
             random.choice(["Exceeds expectations", "Meets all objectives", "Strong performance this quarter", "Growing well in role", None]),
             ts, ts)
        )

    # --- Goals ---
    goal_titles = [
        "Complete Q1 OKRs", "Improve code test coverage to 80%", "Lead onboarding for new hires",
        "Deliver project Alpha on time", "Reduce customer churn by 5%", "Launch new marketing campaign",
        "Automate monthly reporting", "Complete leadership training", "Migrate to cloud infrastructure",
        "Build self-service analytics dashboard",
    ]
    for _ in range(25):
        conn.execute(
            "INSERT INTO goals (id, employee_id, title, description, due_date, status, progress, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
            (new_id(), random.choice(emp_ids),
             random.choice(goal_titles), "Detailed goal description and success criteria",
             _future_date(), random.choice(["not_started", "in_progress", "in_progress", "completed"]),
             random.randint(0, 100), ts, ts)
        )

    # --- Benefit Plans ---
    plan_data = [
        ("Health Insurance - Standard", "health", "Southern Cross"),
        ("Health Insurance - Premium", "health", "Southern Cross"),
        ("Life Insurance", "life", "AIA NZ"),
        ("KiwiSaver - Conservative", "retirement", "ANZ"),
        ("KiwiSaver - Growth", "retirement", "ANZ"),
        ("Dental Plan", "dental", "Lumino"),
        ("Wellness Programme", "wellness", "Internal"),
    ]
    plan_ids = []
    for name, ptype, provider in plan_data:
        pid = new_id()
        plan_ids.append(pid)
        conn.execute(
            "INSERT INTO benefit_plans (id, name, type, provider, description, is_active, created_at, updated_at) VALUES (?,?,?,?,?,1,?,?)",
            (pid, name, ptype, provider, f"{name} provided by {provider}", ts, ts)
        )

    # --- Benefit Enrollments ---
    for eid in random.sample(emp_ids, min(30, len(emp_ids))):
        for pid in random.sample(plan_ids, random.randint(1, 3)):
            conn.execute(
                """INSERT INTO benefit_enrollments (id, employee_id, plan_id, status, start_date, coverage_level, employee_contribution, employer_contribution, created_at, updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?)""",
                (new_id(), eid, pid, "active", _past_date(),
                 random.choice(["employee", "employee_spouse", "family"]),
                 round(random.uniform(20, 100), 2), round(random.uniform(50, 200), 2), ts, ts)
            )

    # --- Succession Plans ---
    critical_positions = random.sample(list(pos_ids.items()), min(6, len(pos_ids)))
    for pos_title, pos_id in critical_positions:
        sp_id = new_id()
        incumbent = random.choice(emp_ids)
        conn.execute(
            "INSERT INTO succession_plans (id, position_id, incumbent_id, risk_of_loss, impact_of_loss, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)",
            (sp_id, pos_id, incumbent,
             random.choice(["low", "medium", "high"]),
             random.choice(["low", "medium", "high", "critical"]),
             "Critical role requiring succession planning", ts, ts)
        )
        for candidate in random.sample(emp_ids, random.randint(1, 3)):
            conn.execute(
                "INSERT INTO succession_candidates (id, plan_id, employee_id, readiness, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?)",
                (new_id(), sp_id, candidate,
                 random.choice(["ready_now", "ready_1_year", "ready_2_years", "not_ready"]),
                 random.choice(["Strong leadership skills", "Needs mentoring", "High potential", "Technical expert"]),
                 ts, ts)
            )

    # --- Onboarding Templates ---
    templates = [
        ("Engineering Onboarding", "Engineering", [
            "Set up development environment", "Review coding standards", "Meet the team",
            "Complete security training", "First PR review", "Shadow senior engineer",
        ]),
        ("General Onboarding", None, [
            "Complete HR paperwork", "Office tour", "IT setup", "Meet your manager",
            "Review company handbook", "Benefits enrollment", "Set up payroll",
        ]),
    ]
    for tname, dept, tasks in templates:
        tid = new_id()
        conn.execute(
            "INSERT INTO onboarding_templates (id, name, description, department_id, is_active, created_at, updated_at) VALUES (?,?,?,?,1,?,?)",
            (tid, tname, f"Standard {tname.lower()} process", dept_ids.get(dept) if dept else None, ts, ts)
        )
        for i, task in enumerate(tasks):
            conn.execute(
                "INSERT INTO onboarding_template_tasks (id, template_id, title, description, assigned_to_role, due_days, sort_order, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
                (new_id(), tid, task, f"Complete: {task}", random.choice(["hr", "manager", "it"]), (i + 1) * 2, i, ts, ts)
            )

    # --- Documents ---
    doc_categories = ["contract", "policy", "certification", "id", "tax", "performance"]
    doc_names = [
        "Employment Contract", "NDA Agreement", "Tax Declaration IR330",
        "First Aid Certificate", "Driver's License", "Performance Review 2024",
        "Passport Copy", "Visa Documentation", "Company Handbook Acknowledgement",
    ]
    for _ in range(30):
        conn.execute(
            """INSERT INTO documents (id, employee_id, name, category, description, expiry_date, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?)""",
            (new_id(), random.choice(emp_ids), random.choice(doc_names),
             random.choice(doc_categories), "Uploaded document",
             _future_date() if random.random() > 0.5 else None, ts, ts)
        )

    # --- Surveys ---
    survey_data = [
        ("Employee Engagement Survey 2025", "active", [
            ("How satisfied are you with your role?", "rating"),
            ("How well does your manager support you?", "rating"),
            ("Would you recommend this company as a workplace?", "rating"),
            ("What could we improve?", "text"),
        ]),
        ("Onboarding Feedback", "active", [
            ("How was your onboarding experience?", "rating"),
            ("Did you feel welcomed by your team?", "rating"),
            ("What was missing from onboarding?", "text"),
        ]),
        ("Q4 Pulse Check", "draft", [
            ("How is your workload?", "rating"),
            ("Do you have the tools you need?", "rating"),
        ]),
    ]
    for stitle, sstatus, questions in survey_data:
        sid = new_id()
        conn.execute(
            "INSERT INTO surveys (id, title, description, status, anonymous, start_date, end_date, created_by, created_at, updated_at) VALUES (?,?,?,?,1,?,?,?,?,?)",
            (sid, stitle, f"{stitle} - gathering employee feedback", sstatus, "2025-01-01", "2025-12-31", user["id"], ts, ts)
        )
        for i, (qtxt, qtype) in enumerate(questions):
            qid = new_id()
            conn.execute(
                "INSERT INTO survey_questions (id, survey_id, question_text, question_type, sort_order, required, created_at, updated_at) VALUES (?,?,?,?,?,1,?,?)",
                (qid, sid, qtxt, qtype, i, ts, ts)
            )
            if sstatus == "active" and qtype == "rating":
                for resp_emp in random.sample(emp_ids, min(15, len(emp_ids))):
                    conn.execute(
                        "INSERT INTO survey_responses (id, survey_id, question_id, employee_id, response_value, created_at) VALUES (?,?,?,?,?,?)",
                        (new_id(), sid, qid, resp_emp, str(random.randint(1, 5)), ts)
                    )

    # --- Workflow Definitions ---
    wf_data = [
        ("Leave Approval", "leave_request", "create", [("manager",), ("hr",)]),
        ("Expense Approval", "expense", "create", [("manager",)]),
    ]
    for wname, entity, action, steps in wf_data:
        wid = new_id()
        conn.execute(
            "INSERT INTO workflow_definitions (id, name, trigger_entity, trigger_action, description, is_active, created_at, updated_at) VALUES (?,?,?,?,?,1,?,?)",
            (wid, wname, entity, action, f"Approval workflow for {entity}", ts, ts)
        )
        for i, (approver_type,) in enumerate(steps):
            conn.execute(
                "INSERT INTO workflow_steps (id, definition_id, step_order, approver_type, created_at, updated_at) VALUES (?,?,?,?,?,?)",
                (new_id(), wid, i + 1, approver_type, ts, ts)
            )

    # --- Audit Log ---
    actions_list = ["create", "update"]
    entity_types = ["employee", "leave_request", "compensation", "benefit_enrollment"]
    for _ in range(50):
        conn.execute(
            "INSERT INTO audit_log (id, entity_type, entity_id, action, field_name, old_value, new_value, user_id, user_name, user_email, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (new_id(), random.choice(entity_types), random.choice(emp_ids),
             random.choice(actions_list),
             random.choice(["status", "salary", "department_id", "position_id", None]),
             random.choice(["active", "85000", None]),
             random.choice(["on_leave", "92000", "approved"]),
             user["id"], user.get("name", "Admin"), user.get("email", ""),
             _date(2025, (1, 12)) + f"T{random.randint(8,17):02d}:{random.randint(0,59):02d}:00+00:00")
        )

    conn.commit()

    # Count what was created
    counts = {}
    for table in ["departments", "positions", "employees", "leave_requests",
                   "time_entries", "job_postings", "applicants", "review_cycles", "reviews", "goals",
                   "compensation", "benefit_plans", "benefit_enrollments", "succession_plans",
                   "onboarding_templates", "documents", "surveys", "workflow_definitions", "audit_log"]:
        counts[table] = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]

    return {"status": "ok", "message": "Database seeded with dummy data", "counts": counts}


@router.delete("/seed")
def clear_seed_data(conn=Depends(get_db), _user=Depends(get_current_user)):
    """Clear all seeded data (keeps users and settings)."""
    tables = [
        "survey_responses", "survey_questions", "surveys",
        "workflow_approvals", "workflow_instances", "workflow_steps", "workflow_definitions",
        "audit_log", "documents",
        "onboarding_tasks", "onboarding_checklists", "onboarding_template_tasks", "onboarding_templates",
        "succession_candidates", "succession_plans",
        "benefit_enrollments", "benefit_plans", "compensation",
        "goals", "reviews", "review_cycles",
        "time_entries", "leave_requests", "leave_balances",
        "applicants", "job_postings",
        "employees", "positions", "departments",
    ]
    for t in tables:
        try:
            conn.execute(f"DELETE FROM {t}")
        except Exception:
            pass
    conn.commit()
    return {"status": "ok", "message": "All data cleared"}
