import json
import os
import sqlite3
import uuid
from pathlib import Path
from datetime import datetime, timezone

WORKSPACE = Path(__file__).resolve().parent.parent
DB_PATH = WORKSPACE / "data" / "hris.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    role        TEXT NOT NULL DEFAULT 'member',
    is_active   INTEGER DEFAULT 1,
    permissions TEXT DEFAULT '[]',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS departments (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    head_id     TEXT,
    azure_ad_group_id TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS positions (
    id            TEXT PRIMARY KEY,
    title         TEXT NOT NULL,
    department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
    level         TEXT,
    description   TEXT,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS employees (
    id            TEXT PRIMARY KEY,
    first_name    TEXT NOT NULL,
    last_name     TEXT NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    phone         TEXT,
    department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
    position_id   TEXT REFERENCES positions(id) ON DELETE SET NULL,
    manager_id    TEXT REFERENCES employees(id) ON DELETE SET NULL,
    start_date    TEXT,
    end_date      TEXT,
    status        TEXT NOT NULL DEFAULT 'active',
    avatar_url    TEXT,
    address       TEXT,
    date_of_birth TEXT,
    gender        TEXT,
    ethnicity     TEXT,
    emergency_contact TEXT,
    notes         TEXT,
    employment_type TEXT DEFAULT 'full_time',
    location      TEXT,
    payhero_employee_key TEXT,
    azure_ad_id   TEXT,
    user_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_manager ON employees(manager_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_payhero ON employees(payhero_employee_key);
CREATE INDEX IF NOT EXISTS idx_employees_azure_ad ON employees(azure_ad_id);

CREATE TABLE IF NOT EXISTS leave_types (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    days_per_year REAL NOT NULL DEFAULT 0,
    color         TEXT DEFAULT '#3B82F6',
    is_active     INTEGER DEFAULT 1,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leave_requests (
    id            TEXT PRIMARY KEY,
    employee_id   TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id TEXT NOT NULL REFERENCES leave_types(id),
    start_date    TEXT NOT NULL,
    end_date      TEXT NOT NULL,
    days          REAL NOT NULL DEFAULT 0,
    status        TEXT NOT NULL DEFAULT 'pending',
    notes         TEXT,
    reviewed_by   TEXT,
    reviewed_at   TEXT,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

CREATE TABLE IF NOT EXISTS time_entries (
    id          TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date        TEXT NOT NULL,
    hours       REAL NOT NULL DEFAULT 0,
    project     TEXT,
    description TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_time_entries_employee ON time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);

CREATE TABLE IF NOT EXISTS job_postings (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    department_id   TEXT REFERENCES departments(id) ON DELETE SET NULL,
    description     TEXT,
    requirements    TEXT,
    status          TEXT NOT NULL DEFAULT 'draft',
    location        TEXT,
    employment_type TEXT DEFAULT 'full_time',
    salary_min      REAL,
    salary_max      REAL,
    published_at    TEXT,
    closes_at       TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status);

CREATE TABLE IF NOT EXISTS applicants (
    id              TEXT PRIMARY KEY,
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,
    email           TEXT NOT NULL,
    phone           TEXT,
    job_posting_id  TEXT NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'applied',
    stage           TEXT NOT NULL DEFAULT 'applied',
    resume_url      TEXT,
    cover_letter    TEXT,
    notes           TEXT,
    rating          INTEGER,
    applied_at      TEXT NOT NULL,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_applicants_job ON applicants(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_applicants_stage ON applicants(stage);

CREATE TABLE IF NOT EXISTS review_cycles (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    start_date  TEXT NOT NULL,
    end_date    TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'draft',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
    id           TEXT PRIMARY KEY,
    employee_id  TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    reviewer_id  TEXT NOT NULL,
    cycle_id     TEXT NOT NULL REFERENCES review_cycles(id) ON DELETE CASCADE,
    rating       INTEGER,
    feedback     TEXT,
    status       TEXT NOT NULL DEFAULT 'draft',
    submitted_at TEXT,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reviews_employee ON reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_cycle ON reviews(cycle_id);

CREATE TABLE IF NOT EXISTS goals (
    id          TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    description TEXT,
    due_date    TEXT,
    status      TEXT NOT NULL DEFAULT 'not_started',
    progress    INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_goals_employee ON goals(employee_id);

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
);

-- Compensation
CREATE TABLE IF NOT EXISTS compensation (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    effective_date TEXT NOT NULL,
    salary REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'NZD',
    pay_frequency TEXT NOT NULL DEFAULT 'annual',
    reason TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_compensation_employee ON compensation(employee_id);

-- Benefits
CREATE TABLE IF NOT EXISTS benefit_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    provider TEXT,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS benefit_enrollments (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL REFERENCES benefit_plans(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active',
    start_date TEXT NOT NULL,
    end_date TEXT,
    coverage_level TEXT DEFAULT 'employee',
    employee_contribution REAL DEFAULT 0,
    employer_contribution REAL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_enrollments_employee ON benefit_enrollments(employee_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_plan ON benefit_enrollments(plan_id);

-- Succession Planning
CREATE TABLE IF NOT EXISTS succession_plans (
    id TEXT PRIMARY KEY,
    position_id TEXT NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
    incumbent_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
    risk_of_loss TEXT DEFAULT 'low',
    impact_of_loss TEXT DEFAULT 'low',
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_succession_position ON succession_plans(position_id);

CREATE TABLE IF NOT EXISTS succession_candidates (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL REFERENCES succession_plans(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    readiness TEXT NOT NULL DEFAULT 'not_ready',
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_candidates_plan ON succession_candidates(plan_id);

-- Onboarding
CREATE TABLE IF NOT EXISTS onboarding_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS onboarding_template_tasks (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL REFERENCES onboarding_templates(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to_role TEXT DEFAULT 'hr',
    due_days INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_template_tasks_template ON onboarding_template_tasks(template_id);

CREATE TABLE IF NOT EXISTS onboarding_checklists (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    template_id TEXT REFERENCES onboarding_templates(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'in_progress',
    started_at TEXT NOT NULL,
    completed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_checklists_employee ON onboarding_checklists(employee_id);

CREATE TABLE IF NOT EXISTS onboarding_tasks (
    id TEXT PRIMARY KEY,
    checklist_id TEXT NOT NULL REFERENCES onboarding_checklists(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to_role TEXT DEFAULT 'hr',
    assigned_to_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    due_date TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    completed_at TEXT,
    completed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_checklist ON onboarding_tasks(checklist_id);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_path TEXT,
    file_size INTEGER,
    mime_type TEXT,
    category TEXT DEFAULT 'general',
    description TEXT,
    uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    expiry_date TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_documents_employee ON documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);

-- Audit Trail
CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    user_name TEXT,
    user_email TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

-- Workflow Engine
CREATE TABLE IF NOT EXISTS workflow_definitions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    trigger_entity TEXT NOT NULL,
    trigger_action TEXT NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workflow_steps (
    id TEXT PRIMARY KEY,
    definition_id TEXT NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL DEFAULT 1,
    approver_type TEXT NOT NULL DEFAULT 'manager',
    approver_role TEXT,
    approver_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_def ON workflow_steps(definition_id);

CREATE TABLE IF NOT EXISTS workflow_instances (
    id TEXT PRIMARY KEY,
    definition_id TEXT NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    initiated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    current_step INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_entity ON workflow_instances(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS workflow_approvals (
    id TEXT PRIMARY KEY,
    instance_id TEXT NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
    step_id TEXT NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
    approver_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    comments TEXT,
    decided_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_approvals_instance ON workflow_approvals(instance_id);
CREATE INDEX IF NOT EXISTS idx_approvals_approver ON workflow_approvals(approver_id);

-- Employee Surveys
CREATE TABLE IF NOT EXISTS surveys (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    anonymous INTEGER DEFAULT 1,
    start_date TEXT,
    end_date TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS survey_questions (
    id TEXT PRIMARY KEY,
    survey_id TEXT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'rating',
    options TEXT,
    sort_order INTEGER DEFAULT 0,
    required INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_survey_questions_survey ON survey_questions(survey_id);

CREATE TABLE IF NOT EXISTS survey_responses (
    id TEXT PRIMARY KEY,
    survey_id TEXT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
    employee_id TEXT REFERENCES employees(id) ON DELETE SET NULL,
    response_value TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_responses_survey ON survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_responses_question ON survey_responses(question_id);

-- Learning Management
CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    format TEXT DEFAULT 'online',
    duration_hours REAL DEFAULT 1,
    provider TEXT,
    is_mandatory INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS course_enrollments (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'assigned',
    assigned_by TEXT REFERENCES users(id),
    assigned_at TEXT NOT NULL,
    started_at TEXT,
    completed_at TEXT,
    score REAL,
    certificate_url TEXT,
    due_date TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_employee ON course_enrollments(employee_id);

CREATE TABLE IF NOT EXISTS certifications (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    issuer TEXT,
    issue_date TEXT,
    expiry_date TEXT,
    credential_id TEXT,
    credential_url TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_certifications_employee ON certifications(employee_id);

-- Salary Bands / Grades
CREATE TABLE IF NOT EXISTS salary_bands (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    grade TEXT NOT NULL,
    position_id TEXT REFERENCES positions(id),
    min_salary REAL NOT NULL,
    mid_salary REAL NOT NULL,
    max_salary REAL NOT NULL,
    currency TEXT DEFAULT 'NZD',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_salary_bands_position ON salary_bands(position_id);

-- 360-Degree Feedback
CREATE TABLE IF NOT EXISTS feedback_requests (
    id TEXT PRIMARY KEY,
    review_id TEXT REFERENCES reviews(id) ON DELETE CASCADE,
    employee_id TEXT NOT NULL REFERENCES employees(id),
    reviewer_id TEXT NOT NULL REFERENCES employees(id),
    relationship TEXT NOT NULL DEFAULT 'peer',
    status TEXT NOT NULL DEFAULT 'pending',
    rating INTEGER,
    feedback TEXT,
    submitted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_feedback_employee ON feedback_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_feedback_reviewer ON feedback_requests(reviewer_id);

-- Interviews
CREATE TABLE IF NOT EXISTS interviews (
    id TEXT PRIMARY KEY,
    applicant_id TEXT NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
    interviewer_id TEXT REFERENCES employees(id),
    interview_type TEXT DEFAULT 'phone',
    scheduled_at TEXT NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    location TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled',
    feedback TEXT,
    rating INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_interviews_applicant ON interviews(applicant_id);
CREATE INDEX IF NOT EXISTS idx_interviews_interviewer ON interviews(interviewer_id);

-- Offers
CREATE TABLE IF NOT EXISTS offers (
    id TEXT PRIMARY KEY,
    applicant_id TEXT NOT NULL REFERENCES applicants(id) ON DELETE CASCADE,
    job_posting_id TEXT REFERENCES job_postings(id),
    salary REAL,
    currency TEXT DEFAULT 'NZD',
    start_date TEXT,
    position_id TEXT REFERENCES positions(id),
    department_id TEXT REFERENCES departments(id),
    status TEXT NOT NULL DEFAULT 'draft',
    notes TEXT,
    sent_at TEXT,
    responded_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_offers_applicant ON offers(applicant_id);

-- Locations
CREATE TABLE IF NOT EXISTS locations (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    address     TEXT,
    city        TEXT,
    state       TEXT,
    country     TEXT,
    postal_code TEXT,
    timezone    TEXT,
    is_active   INTEGER DEFAULT 1,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

-- Emergency Contacts
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id            TEXT PRIMARY KEY,
    employee_id   TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    contact_name  TEXT NOT NULL,
    relationship  TEXT,
    phone         TEXT,
    email         TEXT,
    is_primary    INTEGER DEFAULT 1,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_employee ON emergency_contacts(employee_id);

-- Dependents
CREATE TABLE IF NOT EXISTS dependents (
    id            TEXT PRIMARY KEY,
    employee_id   TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    first_name    TEXT NOT NULL,
    last_name     TEXT NOT NULL,
    relationship  TEXT NOT NULL CHECK (relationship IN ('spouse', 'child', 'domestic_partner', 'other')),
    date_of_birth TEXT,
    gender        TEXT,
    is_active     INTEGER DEFAULT 1,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_dependents_employee ON dependents(employee_id);

-- Job History
CREATE TABLE IF NOT EXISTS job_history (
    id              TEXT PRIMARY KEY,
    employee_id     TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    effective_date  TEXT NOT NULL,
    position_id     TEXT REFERENCES positions(id) ON DELETE SET NULL,
    department_id   TEXT REFERENCES departments(id) ON DELETE SET NULL,
    manager_id      TEXT REFERENCES employees(id) ON DELETE SET NULL,
    location        TEXT,
    employment_type TEXT,
    reason          TEXT,
    notes           TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_job_history_employee ON job_history(employee_id);

-- Skills Catalog
CREATE TABLE IF NOT EXISTS skills (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    category    TEXT,
    description TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

-- Employee Skills
CREATE TABLE IF NOT EXISTS employee_skills (
    id                TEXT PRIMARY KEY,
    employee_id       TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    skill_id          TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    proficiency_level TEXT CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    years_experience  REAL,
    notes             TEXT,
    verified_by       TEXT,
    verified_at       TEXT,
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_employee_skills_employee ON employee_skills(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_skills_skill ON employee_skills(skill_id);

-- Compensation Components
CREATE TABLE IF NOT EXISTS compensation_components (
    id              TEXT PRIMARY KEY,
    employee_id     TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    component_type  TEXT NOT NULL CHECK (component_type IN ('bonus', 'stock', 'allowance', 'commission', 'overtime', 'other')),
    amount          REAL NOT NULL,
    currency        TEXT DEFAULT 'NZD',
    frequency       TEXT CHECK (frequency IN ('one_time', 'monthly', 'quarterly', 'annual')),
    effective_date  TEXT,
    end_date        TEXT,
    description     TEXT,
    status          TEXT DEFAULT 'active',
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comp_components_employee ON compensation_components(employee_id);

-- Leave Accrual Policies
CREATE TABLE IF NOT EXISTS leave_accrual_policies (
    id                  TEXT PRIMARY KEY,
    leave_type_id       TEXT NOT NULL REFERENCES leave_types(id),
    name                TEXT NOT NULL,
    accrual_rate        REAL NOT NULL,
    accrual_frequency   TEXT CHECK (accrual_frequency IN ('monthly', 'quarterly', 'annual')),
    max_balance         REAL,
    carry_over_limit    REAL,
    waiting_period_days INTEGER DEFAULT 0,
    is_active           INTEGER DEFAULT 1,
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_leave_accrual_leave_type ON leave_accrual_policies(leave_type_id);

-- Assets
CREATE TABLE IF NOT EXISTS assets (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    asset_tag     TEXT,
    category      TEXT CHECK (category IN ('laptop', 'phone', 'monitor', 'keyboard', 'chair', 'vehicle', 'other')),
    serial_number TEXT,
    purchase_date TEXT,
    purchase_cost REAL,
    status        TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'maintenance', 'retired')),
    assigned_to   TEXT REFERENCES employees(id) ON DELETE SET NULL,
    assigned_date TEXT,
    notes         TEXT,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assets_assigned_to ON assets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);

-- Disciplinary Actions
CREATE TABLE IF NOT EXISTS disciplinary_actions (
    id            TEXT PRIMARY KEY,
    employee_id   TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    action_type   TEXT NOT NULL CHECK (action_type IN ('verbal_warning', 'written_warning', 'final_warning', 'suspension', 'termination', 'other')),
    description   TEXT,
    incident_date TEXT,
    action_date   TEXT,
    issued_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
    status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'appealed')),
    resolution    TEXT,
    resolved_at   TEXT,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_disciplinary_employee ON disciplinary_actions(employee_id);

-- Grievances
CREATE TABLE IF NOT EXISTS grievances (
    id          TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    subject     TEXT NOT NULL,
    description TEXT,
    category    TEXT CHECK (category IN ('workplace', 'harassment', 'discrimination', 'safety', 'pay', 'policy', 'other')),
    priority    TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status      TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'investigating', 'resolved', 'dismissed', 'escalated')),
    assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
    resolution  TEXT,
    filed_date  TEXT,
    resolved_at TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_grievances_employee ON grievances(employee_id);
CREATE INDEX IF NOT EXISTS idx_grievances_status ON grievances(status);

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL,
    content      TEXT,
    category     TEXT CHECK (category IN ('general', 'policy', 'event', 'hr', 'it', 'safety')),
    priority     TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
    status       TEXT NOT NULL DEFAULT 'draft',
    author_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
    expires_at   TEXT,
    is_active    INTEGER DEFAULT 1,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    message     TEXT,
    type        TEXT CHECK (type IN ('info', 'warning', 'action', 'reminder')),
    entity_type TEXT,
    entity_id   TEXT,
    is_read     INTEGER DEFAULT 0,
    read_at     TEXT,
    created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Probation Periods
CREATE TABLE IF NOT EXISTS probation_periods (
    id          TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    start_date  TEXT NOT NULL,
    end_date    TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'passed', 'extended', 'failed')),
    review_date TEXT,
    reviewer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    notes       TEXT,
    outcome     TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_probation_employee ON probation_periods(employee_id);

-- Notice Periods
CREATE TABLE IF NOT EXISTS notice_periods (
    id                TEXT PRIMARY KEY,
    employee_id       TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    notice_type       TEXT NOT NULL CHECK (notice_type IN ('resignation', 'termination', 'redundancy', 'end_of_contract')),
    notice_date       TEXT,
    effective_date    TEXT,
    last_working_day  TEXT,
    notice_length_days INTEGER,
    status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'serving', 'completed', 'waived')),
    reason            TEXT,
    notes             TEXT,
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notice_periods_employee ON notice_periods(employee_id);

-- Delegations
CREATE TABLE IF NOT EXISTS delegations (
    id           TEXT PRIMARY KEY,
    delegator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    delegate_id  TEXT NOT NULL REFERENCES users(id),
    entity_type  TEXT,
    entity_id    TEXT,
    start_date   TEXT,
    end_date     TEXT,
    reason       TEXT,
    notes        TEXT,
    is_active    INTEGER DEFAULT 1,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_delegations_delegator ON delegations(delegator_id);
CREATE INDEX IF NOT EXISTS idx_delegations_delegate ON delegations(delegate_id);

-- Benefit Life Events
CREATE TABLE IF NOT EXISTS benefit_life_events (
    id           TEXT PRIMARY KEY,
    employee_id  TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    event_type   TEXT NOT NULL CHECK (event_type IN ('marriage', 'divorce', 'birth', 'adoption', 'death', 'job_change', 'open_enrollment', 'loss_of_coverage', 'other')),
    event_date   TEXT,
    description  TEXT,
    status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'processed')),
    supporting_document_url TEXT,
    notes        TEXT,
    processed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    processed_at TEXT,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_life_events_employee ON benefit_life_events(employee_id);

-- Training Prerequisites
CREATE TABLE IF NOT EXISTS training_prerequisites (
    id                    TEXT PRIMARY KEY,
    course_id             TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    prerequisite_course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    is_mandatory          INTEGER DEFAULT 1,
    created_at            TEXT NOT NULL,
    updated_at            TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_training_prereqs_course ON training_prerequisites(course_id);

-- Job Requisitions
CREATE TABLE IF NOT EXISTS job_requisitions (
    id                 TEXT PRIMARY KEY,
    title              TEXT NOT NULL,
    department_id      TEXT REFERENCES departments(id) ON DELETE SET NULL,
    position_id        TEXT REFERENCES positions(id) ON DELETE SET NULL,
    requested_by       TEXT REFERENCES users(id) ON DELETE SET NULL,
    number_of_openings INTEGER DEFAULT 1,
    justification      TEXT,
    priority           TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status             TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected', 'filled', 'cancelled')),
    budget_min         REAL,
    budget_max         REAL,
    currency           TEXT DEFAULT 'NZD',
    target_start_date  TEXT,
    approved_by        TEXT REFERENCES users(id) ON DELETE SET NULL,
    approved_at        TEXT,
    created_at         TEXT NOT NULL,
    updated_at         TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_job_requisitions_status ON job_requisitions(status);
CREATE INDEX IF NOT EXISTS idx_job_requisitions_dept ON job_requisitions(department_id);

-- Cost Centers
CREATE TABLE IF NOT EXISTS cost_centers (
    id            TEXT PRIMARY KEY,
    code          TEXT NOT NULL,
    name          TEXT NOT NULL,
    description   TEXT,
    department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
    manager_id    TEXT REFERENCES employees(id) ON DELETE SET NULL,
    budget        REAL,
    currency      TEXT DEFAULT 'NZD',
    is_active     INTEGER DEFAULT 1,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cost_centers_dept ON cost_centers(department_id);

-- Custom Field Definitions
CREATE TABLE IF NOT EXISTS custom_field_definitions (
    id            TEXT PRIMARY KEY,
    entity_type   TEXT NOT NULL,
    field_name    TEXT NOT NULL,
    field_type    TEXT NOT NULL DEFAULT 'text',
    field_options TEXT,
    is_required   INTEGER DEFAULT 0,
    sort_order    INTEGER DEFAULT 0,
    is_active     INTEGER DEFAULT 1,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

-- Custom Field Values
CREATE TABLE IF NOT EXISTS custom_field_values (
    id            TEXT PRIMARY KEY,
    definition_id TEXT NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
    entity_id     TEXT NOT NULL,
    value         TEXT,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cfv_definition ON custom_field_values(definition_id);
CREATE INDEX IF NOT EXISTS idx_cfv_entity ON custom_field_values(entity_id);
"""


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def init_db():
    conn = get_connection()
    conn.executescript(SCHEMA)

    # Seed default leave types if empty
    if conn.execute("SELECT COUNT(*) FROM leave_types").fetchone()[0] == 0:
        ts = now_iso()
        for name, days, color in [
            ("Annual Leave", 20, "#3B82F6"),
            ("Sick Leave", 10, "#EF4444"),
            ("Personal Leave", 5, "#8B5CF6"),
        ]:
            conn.execute(
                "INSERT INTO leave_types (id, name, days_per_year, color, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)",
                (new_id(), name, days, color, ts, ts),
            )

    # Seed default admin user if configured and no users exist
    default_admin = os.environ.get("DEFAULT_ADMIN_EMAIL", "")
    if default_admin and conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0:
        ts = now_iso()
        all_modules = [
            "dashboard", "employees", "departments", "positions",
            "leave", "timesheets", "recruitment", "performance",
            "reports", "settings", "compensation", "benefits", "succession",
            "locations", "assets", "grievances", "announcements", "skills",
            "disciplinary",
        ]
        name = default_admin.split("@")[0].replace(".", " ").title()
        conn.execute(
            "INSERT INTO users (id, name, email, role, permissions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (new_id(), name, default_admin, "admin", json.dumps(all_modules), ts, ts),
        )

    conn.commit()
    conn.close()
