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
            "custom_field_values", "custom_field_definitions",
            "cost_centers",
            "job_requisitions",
            "training_prerequisites", "course_enrollments", "certifications", "courses",
            "benefit_life_events",
            "delegations",
            "notice_periods",
            "probation_periods",
            "notifications",
            "announcements",
            "grievances",
            "disciplinary_actions",
            "assets",
            "leave_accrual_policies",
            "compensation_components",
            "employee_skills", "skills",
            "job_history",
            "dependents",
            "emergency_contacts",
            "locations",
            "feedback_requests",
            "offers", "interviews",
            "salary_bands",
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

    # --- Locations ---
    location_data = [
        ("Auckland HQ", "100 Queen Street", "Auckland", "Auckland", "NZ", "1010", "Pacific/Auckland"),
        ("Wellington Office", "50 Lambton Quay", "Wellington", "Wellington", "NZ", "6011", "Pacific/Auckland"),
        ("Christchurch Office", "20 Cathedral Square", "Christchurch", "Canterbury", "NZ", "8011", "Pacific/Auckland"),
        ("Hamilton Office", "10 Victoria Street", "Hamilton", "Waikato", "NZ", "3204", "Pacific/Auckland"),
        ("Remote", None, None, None, "NZ", None, "Pacific/Auckland"),
    ]
    location_ids = []
    for lname, addr, city, state, country, postal, tz in location_data:
        lid = new_id()
        location_ids.append(lid)
        conn.execute(
            "INSERT INTO locations (id, name, address, city, state, country, postal_code, timezone, is_active, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,1,?,?)",
            (lid, lname, addr, city, state, country, postal, tz, ts, ts)
        )

    # --- Emergency Contacts ---
    relationships_ec = ["spouse", "parent", "sibling", "partner", "friend"]
    for eid in random.sample(emp_ids, min(15, len(emp_ids))):
        conn.execute(
            "INSERT INTO emergency_contacts (id, employee_id, contact_name, relationship, phone, email, is_primary, created_at, updated_at) VALUES (?,?,?,?,?,?,1,?,?)",
            (new_id(), eid,
             f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}",
             random.choice(relationships_ec),
             f"+64 21 {random.randint(100,999)} {random.randint(1000,9999)}",
             f"{random.choice(FIRST_NAMES).lower()}.{random.choice(LAST_NAMES).lower()}@gmail.com",
             ts, ts)
        )

    # --- Dependents ---
    dep_relationships = ["spouse", "child", "child", "child", "domestic_partner"]
    for eid in random.sample(emp_ids, min(10, len(emp_ids))):
        fn = random.choice(FIRST_NAMES)
        ln = random.choice(LAST_NAMES)
        rel = random.choice(dep_relationships)
        dob_year = random.randint(1980, 2020) if rel == "child" else random.randint(1970, 2000)
        conn.execute(
            "INSERT INTO dependents (id, employee_id, first_name, last_name, relationship, date_of_birth, gender, is_active, created_at, updated_at) VALUES (?,?,?,?,?,?,?,1,?,?)",
            (new_id(), eid, fn, ln, rel,
             f"{dob_year}-{random.randint(1,12):02d}-{random.randint(1,28):02d}",
             random.choice(["male", "female"]),
             ts, ts)
        )

    # --- Job History ---
    history_reasons = ["Promotion", "Transfer", "Role change", "Reorganisation", "Lateral move"]
    emp_types = ["full_time", "part_time", "contract"]
    for _ in range(20):
        eid = random.choice(emp_ids)
        conn.execute(
            "INSERT INTO job_history (id, employee_id, effective_date, position_id, department_id, manager_id, location, employment_type, reason, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            (new_id(), eid, _past_date(),
             random.choice(list(pos_ids.values())),
             random.choice(list(dept_ids.values())),
             random.choice(emp_ids),
             random.choice(["Auckland", "Wellington", "Christchurch", "Remote"]),
             random.choice(emp_types),
             random.choice(history_reasons),
             "Historical record",
             ts, ts)
        )

    # --- Skills ---
    skill_catalog = [
        ("Python", "technical", "Python programming language"),
        ("JavaScript", "technical", "JavaScript/TypeScript development"),
        ("Leadership", "soft_skill", "Team leadership and management"),
        ("Project Management", "management", "Planning and executing projects"),
        ("Data Analysis", "technical", "Analysing datasets and deriving insights"),
        ("Communication", "soft_skill", "Written and verbal communication"),
        ("SQL", "technical", "Database querying and management"),
        ("React", "technical", "React frontend framework"),
        ("AWS", "technical", "Amazon Web Services cloud platform"),
        ("Agile", "management", "Agile methodologies (Scrum, Kanban)"),
        ("Machine Learning", "technical", "ML model development and deployment"),
        ("Public Speaking", "soft_skill", "Presenting to audiences"),
        ("Negotiation", "soft_skill", "Business negotiation skills"),
        ("Financial Analysis", "management", "Financial modelling and analysis"),
        ("Strategic Planning", "management", "Long-term strategy development"),
    ]
    skill_ids = []
    for sname, scat, sdesc in skill_catalog:
        sid = new_id()
        skill_ids.append(sid)
        conn.execute(
            "INSERT INTO skills (id, name, category, description, created_at, updated_at) VALUES (?,?,?,?,?,?)",
            (sid, sname, scat, sdesc, ts, ts)
        )

    # --- Employee Skills ---
    proficiency_levels = ["beginner", "intermediate", "advanced", "expert"]
    for _ in range(30):
        conn.execute(
            "INSERT INTO employee_skills (id, employee_id, skill_id, proficiency_level, years_experience, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)",
            (new_id(), random.choice(emp_ids), random.choice(skill_ids),
             random.choice(proficiency_levels),
             round(random.uniform(0.5, 15), 1),
             random.choice(["Self-assessed", "Verified by manager", "Certified", None]),
             ts, ts)
        )

    # --- Compensation Components ---
    comp_types = ["bonus", "stock", "allowance", "commission"]
    comp_freqs = ["one_time", "monthly", "quarterly", "annual"]
    comp_descs = [
        "Performance bonus", "Annual retention bonus", "RSU grant", "Home office allowance",
        "Travel allowance", "Sales commission", "Signing bonus", "Quarterly incentive",
        "Technology allowance", "Professional development fund",
    ]
    for _ in range(15):
        conn.execute(
            "INSERT INTO compensation_components (id, employee_id, component_type, amount, currency, frequency, effective_date, end_date, description, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            (new_id(), random.choice(emp_ids),
             random.choice(comp_types),
             round(random.uniform(500, 25000), 2),
             "NZD",
             random.choice(comp_freqs),
             _past_date(),
             _future_date() if random.random() > 0.5 else None,
             random.choice(comp_descs),
             random.choice(["active", "active", "active", "ended"]),
             ts, ts)
        )

    # --- Leave Accrual Policies ---
    leave_type_map = {lt["id"]: lt for lt in conn.execute("SELECT id, name FROM leave_types").fetchall()}
    accrual_data = [
        ("Annual Leave Monthly Accrual", "monthly", 1.67, 30, 10, 0),
        ("Sick Leave Annual Accrual", "annual", 10, 20, 5, 0),
        ("Personal Leave Annual Accrual", "annual", 5, 10, 2, 0),
    ]
    for i, (aname, freq, rate, max_bal, carry, wait) in enumerate(accrual_data):
        lt_id = leave_type_ids[i] if i < len(leave_type_ids) else leave_type_ids[0]
        conn.execute(
            "INSERT INTO leave_accrual_policies (id, leave_type_id, name, accrual_rate, accrual_frequency, max_balance, carry_over_limit, waiting_period_days, is_active, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,1,?,?)",
            (new_id(), lt_id, aname, rate, freq, max_bal, carry, wait, ts, ts)
        )

    # --- Assets ---
    asset_categories = ["laptop", "phone", "monitor", "keyboard", "chair"]
    asset_models = {
        "laptop": ["MacBook Pro 14\"", "MacBook Pro 16\"", "Dell XPS 15", "ThinkPad X1 Carbon"],
        "phone": ["iPhone 15 Pro", "iPhone 14", "Samsung Galaxy S24"],
        "monitor": ["Dell U2723QE 27\"", "LG 27UK850-W", "Samsung S34J550WQN"],
        "keyboard": ["Apple Magic Keyboard", "Logitech MX Keys"],
        "chair": ["Herman Miller Aeron", "Steelcase Leap V2"],
    }
    for i in range(20):
        cat = random.choice(asset_categories)
        model = random.choice(asset_models[cat])
        assigned_emp = random.choice(emp_ids) if random.random() > 0.3 else None
        status = "assigned" if assigned_emp else random.choice(["available", "maintenance", "retired"])
        conn.execute(
            "INSERT INTO assets (id, name, asset_tag, category, serial_number, purchase_date, purchase_cost, status, assigned_to, assigned_date, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (new_id(), model, f"AST-{1000 + i:04d}", cat,
             f"SN-{random.randint(100000, 999999)}",
             _past_date(),
             round(random.uniform(200, 4500), 2),
             status,
             assigned_emp,
             _past_date() if assigned_emp else None,
             None,
             ts, ts)
        )

    # --- Disciplinary Actions ---
    disc_types = ["verbal_warning", "written_warning", "verbal_warning", "final_warning", "written_warning"]
    disc_descs = [
        "Repeated tardiness",
        "Failure to follow safety procedures",
        "Inappropriate workplace behaviour",
        "Missed deadlines without communication",
        "Policy violation - internet usage",
    ]
    for i in range(5):
        conn.execute(
            "INSERT INTO disciplinary_actions (id, employee_id, action_type, description, incident_date, action_date, issued_by, status, resolution, resolved_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            (new_id(), random.choice(emp_ids),
             disc_types[i], disc_descs[i],
             _past_date(), _past_date(),
             user["id"],
             random.choice(["open", "acknowledged", "resolved"]),
             "Discussed with employee" if random.random() > 0.5 else None,
             _past_date() if random.random() > 0.5 else None,
             ts, ts)
        )

    # --- Grievances ---
    griev_data = [
        ("Unfair workload distribution", "workplace", "medium"),
        ("Harassment complaint", "harassment", "critical"),
        ("Pay discrepancy concern", "pay", "high"),
        ("Unsafe office conditions", "safety", "high"),
        ("Disagreement with policy change", "policy", "low"),
    ]
    for subject, category, priority in griev_data:
        conn.execute(
            "INSERT INTO grievances (id, employee_id, subject, description, category, priority, status, assigned_to, resolution, filed_date, resolved_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (new_id(), random.choice(emp_ids),
             subject, f"Detailed description of: {subject}",
             category, priority,
             random.choice(["submitted", "investigating", "resolved"]),
             user["id"],
             "Resolved through mediation" if random.random() > 0.5 else None,
             _past_date(),
             _past_date() if random.random() > 0.5 else None,
             ts, ts)
        )

    # --- Announcements ---
    announce_data = [
        ("Updated Remote Work Policy", "Please review the new remote work guidelines effective next month.", "policy", "important"),
        ("Holiday Schedule 2025-2026", "Upcoming public holiday dates and office closure schedule.", "general", "normal"),
        ("Annual Company Picnic", "Join us for the annual company picnic at Cornwall Park on 15 March.", "event", "normal"),
        ("IT Maintenance Window", "Scheduled system maintenance this Saturday 10pm-2am. Services may be unavailable.", "it", "urgent"),
    ]
    for atitle, acontent, acat, apri in announce_data:
        conn.execute(
            "INSERT INTO announcements (id, title, content, category, priority, status, author_id, expires_at, is_active, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,1,?,?)",
            (new_id(), atitle, acontent, acat, apri,
             "published", user["id"], _future_date(),
             ts, ts)
        )

    # --- Notifications ---
    notif_data = [
        ("Leave request approved", "Your leave request for 5 days has been approved.", "info", "leave_request"),
        ("Performance review due", "Your mid-year review is due by end of month.", "reminder", "review"),
        ("New announcement posted", "A new company announcement has been published.", "info", "announcement"),
        ("Document expiring soon", "Your First Aid Certificate expires in 30 days.", "warning", "document"),
        ("Goal deadline approaching", "Your Q1 OKR goal is due in 7 days.", "reminder", "goal"),
        ("Training assigned", "You have been assigned a new mandatory training course.", "action", "course"),
        ("Benefit enrollment open", "Open enrollment period starts next week.", "info", "benefit"),
        ("Timesheet reminder", "Please submit your timesheet for this week.", "reminder", "time_entry"),
        ("New team member", "A new team member has joined your department.", "info", "employee"),
        ("Policy update", "The company travel policy has been updated.", "info", "announcement"),
    ]
    for ntitle, nmsg, ntype, nentity in notif_data:
        conn.execute(
            "INSERT INTO notifications (id, user_id, title, message, type, entity_type, entity_id, is_read, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
            (new_id(), user["id"],
             ntitle, nmsg, ntype, nentity, random.choice(emp_ids),
             random.choice([0, 0, 0, 1]),
             ts)
        )

    # --- Probation Periods ---
    # Pick 8 employees for probation records
    probation_emps = random.sample(emp_ids, min(8, len(emp_ids)))
    for i, eid in enumerate(probation_emps):
        start = _past_date()
        start_dt = datetime.strptime(start, "%Y-%m-%d")
        end_dt = start_dt + timedelta(days=90)
        end = end_dt.strftime("%Y-%m-%d")
        status = "passed" if i < 4 else random.choice(["active", "extended"])
        conn.execute(
            "INSERT INTO probation_periods (id, employee_id, start_date, end_date, status, review_date, reviewer_id, notes, outcome, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (new_id(), eid, start, end, status,
             end,
             user["id"],
             random.choice(["Progressing well", "Meeting expectations", "Needs improvement", "Extended for further assessment"]),
             "Confirmed" if status == "passed" else None,
             ts, ts)
        )

    # --- Notice Periods ---
    notice_types = ["resignation", "termination", "end_of_contract"]
    for i in range(3):
        eid = random.choice(emp_ids)
        notice_dt = _past_date()
        conn.execute(
            "INSERT INTO notice_periods (id, employee_id, notice_type, notice_date, effective_date, last_working_day, notice_length_days, status, reason, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            (new_id(), eid,
             notice_types[i], notice_dt, notice_dt,
             _future_date(), random.choice([30, 60, 90]),
             random.choice(["pending", "serving", "completed"]),
             random.choice(["Career change", "Relocation", "Contract end", "Performance"]),
             None,
             ts, ts)
        )

    # --- Delegations ---
    delegation_data = [
        ("leave_request", "Annual leave delegation"),
        ("expense", "Expense approval delegation"),
    ]
    for etype, reason in delegation_data:
        conn.execute(
            "INSERT INTO delegations (id, delegator_id, delegate_id, entity_type, start_date, end_date, reason, is_active, created_at, updated_at) VALUES (?,?,?,?,?,?,?,1,?,?)",
            (new_id(), user["id"], user["id"],
             etype, _past_date(), _future_date(), reason,
             ts, ts)
        )

    # --- Benefit Life Events ---
    life_event_data = [
        ("marriage", "approved"),
        ("birth", "processed"),
        ("open_enrollment", "pending"),
        ("marriage", "approved"),
        ("birth", "pending"),
    ]
    for etype, estatus in life_event_data:
        conn.execute(
            "INSERT INTO benefit_life_events (id, employee_id, event_type, event_date, description, status, processed_by, processed_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
            (new_id(), random.choice(emp_ids),
             etype, _past_date(),
             f"Life event: {etype}",
             estatus,
             user["id"] if estatus in ("approved", "processed") else None,
             _past_date() if estatus in ("approved", "processed") else None,
             ts, ts)
        )

    # --- Courses (for training prerequisites) ---
    course_data = [
        ("Health & Safety Fundamentals", "compliance", "online", 2, 1),
        ("Introduction to Python", "technical", "online", 8, 0),
        ("Advanced Python", "technical", "online", 16, 0),
        ("Leadership 101", "leadership", "classroom", 4, 0),
        ("Advanced Leadership", "leadership", "classroom", 8, 0),
        ("Data Privacy & Security", "compliance", "online", 1, 1),
    ]
    course_ids = []
    for ctitle, ccat, cfmt, cdur, cmand in course_data:
        cid = new_id()
        course_ids.append(cid)
        conn.execute(
            "INSERT INTO courses (id, title, description, category, format, duration_hours, provider, is_mandatory, is_active, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,1,?,?)",
            (cid, ctitle, f"Course: {ctitle}", ccat, cfmt, cdur,
             random.choice(["Internal", "LinkedIn Learning", "Coursera"]),
             cmand, ts, ts)
        )

    # --- Training Prerequisites ---
    # Advanced Python requires Intro to Python; Advanced Leadership requires Leadership 101; Data Privacy requires H&S
    prereq_links = [(2, 1), (4, 3), (5, 0)]  # (course_index, prereq_index)
    for cidx, pidx in prereq_links:
        conn.execute(
            "INSERT INTO training_prerequisites (id, course_id, prerequisite_course_id, is_mandatory, created_at, updated_at) VALUES (?,?,?,1,?,?)",
            (new_id(), course_ids[cidx], course_ids[pidx], ts, ts)
        )

    # --- Job Requisitions ---
    req_data = [
        ("Senior Software Engineer", "Engineering", "Senior Software Engineer", "approved", "high"),
        ("Marketing Coordinator", "Marketing", "Marketing Specialist", "pending_approval", "normal"),
        ("Finance Analyst", "Finance", "Financial Analyst", "draft", "normal"),
        ("DevOps Engineer", "Engineering", "Software Engineer", "filled", "urgent"),
    ]
    for rtitle, rdept, rpos, rstatus, rpri in req_data:
        conn.execute(
            "INSERT INTO job_requisitions (id, title, department_id, position_id, requested_by, number_of_openings, justification, priority, status, budget_min, budget_max, currency, target_start_date, approved_by, approved_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (new_id(), rtitle,
             dept_ids.get(rdept, list(dept_ids.values())[0]),
             pos_ids.get(rpos, list(pos_ids.values())[0]),
             user["id"],
             random.randint(1, 3),
             f"Headcount request for {rtitle} role",
             rpri, rstatus,
             80000, 150000, "NZD",
             _future_date(),
             user["id"] if rstatus in ("approved", "filled") else None,
             _past_date() if rstatus in ("approved", "filled") else None,
             ts, ts)
        )

    # --- Cost Centers ---
    cc_data = [
        ("CC-ENG", "Engineering Cost Center", "Engineering"),
        ("CC-PRD", "Product Cost Center", "Product"),
        ("CC-HR", "Human Resources Cost Center", "Human Resources"),
        ("CC-FIN", "Finance Cost Center", "Finance"),
        ("CC-MKT", "Marketing Cost Center", "Marketing"),
        ("CC-OPS", "Operations Cost Center", "Operations"),
    ]
    for ccode, cname, cdept in cc_data:
        conn.execute(
            "INSERT INTO cost_centers (id, code, name, description, department_id, manager_id, budget, currency, is_active, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,1,?,?)",
            (new_id(), ccode, cname, f"Cost center for {cdept}",
             dept_ids.get(cdept, list(dept_ids.values())[0]),
             managers.get(cdept),
             round(random.uniform(500000, 3000000), 2),
             "NZD",
             ts, ts)
        )

    # --- Custom Field Definitions ---
    cf_shirt_id = new_id()
    cf_preferred_id = new_id()
    cf_parking_id = new_id()
    conn.execute(
        "INSERT INTO custom_field_definitions (id, entity_type, field_name, field_type, field_options, is_required, sort_order, is_active, created_at, updated_at) VALUES (?,?,?,?,?,0,1,1,?,?)",
        (cf_shirt_id, "employee", "Shirt Size", "select", '["XS","S","M","L","XL","XXL"]', ts, ts)
    )
    conn.execute(
        "INSERT INTO custom_field_definitions (id, entity_type, field_name, field_type, field_options, is_required, sort_order, is_active, created_at, updated_at) VALUES (?,?,?,?,?,0,2,1,?,?)",
        (cf_preferred_id, "employee", "Preferred Name", "text", None, ts, ts)
    )
    conn.execute(
        "INSERT INTO custom_field_definitions (id, entity_type, field_name, field_type, field_options, is_required, sort_order, is_active, created_at, updated_at) VALUES (?,?,?,?,?,0,3,1,?,?)",
        (cf_parking_id, "employee", "Parking Spot", "text", None, ts, ts)
    )

    # --- Custom Field Values ---
    shirt_sizes = ["XS", "S", "M", "M", "L", "L", "XL", "XXL"]
    for eid in random.sample(emp_ids, min(10, len(emp_ids))):
        conn.execute(
            "INSERT INTO custom_field_values (id, definition_id, entity_id, value, created_at, updated_at) VALUES (?,?,?,?,?,?)",
            (new_id(), cf_shirt_id, eid, random.choice(shirt_sizes), ts, ts)
        )
    for eid in random.sample(emp_ids, min(6, len(emp_ids))):
        conn.execute(
            "INSERT INTO custom_field_values (id, definition_id, entity_id, value, created_at, updated_at) VALUES (?,?,?,?,?,?)",
            (new_id(), cf_preferred_id, eid, random.choice(FIRST_NAMES), ts, ts)
        )
    for eid in random.sample(emp_ids, min(5, len(emp_ids))):
        conn.execute(
            "INSERT INTO custom_field_values (id, definition_id, entity_id, value, created_at, updated_at) VALUES (?,?,?,?,?,?)",
            (new_id(), cf_parking_id, eid, f"P{random.randint(1, 50)}", ts, ts)
        )

    conn.commit()

    # Count what was created
    # Link admin user to first employee for self-service to work
    admin_user = conn.execute("SELECT id, email FROM users WHERE role = 'admin' LIMIT 1").fetchone()
    if admin_user:
        first_emp = conn.execute("SELECT id FROM employees LIMIT 1").fetchone()
        if first_emp:
            conn.execute("UPDATE employees SET user_id = ?, email = ? WHERE id = ?",
                         (admin_user["id"], admin_user["email"], first_emp["id"]))
            conn.commit()

    counts = {}
    for table in ["departments", "positions", "employees", "leave_requests",
                   "time_entries", "job_postings", "applicants", "review_cycles", "reviews", "goals",
                   "compensation", "benefit_plans", "benefit_enrollments", "succession_plans",
                   "onboarding_templates", "documents", "surveys", "workflow_definitions", "audit_log",
                   "locations", "emergency_contacts", "dependents", "job_history",
                   "skills", "employee_skills", "compensation_components",
                   "leave_accrual_policies", "assets", "disciplinary_actions", "grievances",
                   "announcements", "notifications", "probation_periods", "notice_periods",
                   "delegations", "benefit_life_events", "courses", "training_prerequisites",
                   "job_requisitions", "cost_centers", "custom_field_definitions", "custom_field_values"]:
        counts[table] = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]

    return {"status": "ok", "message": "Database seeded with dummy data", "counts": counts}


@router.delete("/seed")
def clear_seed_data(conn=Depends(get_db), _user=Depends(get_current_user)):
    """Clear all seeded data (keeps users and settings)."""
    tables = [
        "custom_field_values", "custom_field_definitions",
        "cost_centers",
        "job_requisitions",
        "training_prerequisites", "course_enrollments", "certifications", "courses",
        "benefit_life_events",
        "delegations",
        "notice_periods",
        "probation_periods",
        "notifications",
        "announcements",
        "grievances",
        "disciplinary_actions",
        "assets",
        "leave_accrual_policies",
        "compensation_components",
        "employee_skills", "skills",
        "job_history",
        "dependents",
        "emergency_contacts",
        "locations",
        "feedback_requests",
        "offers", "interviews",
        "salary_bands",
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
    return {"status": "ok", "message": "All data cleared"}
