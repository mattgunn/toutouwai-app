from fastapi import APIRouter, Depends, Query
from ..deps import get_db, get_current_user

router = APIRouter()


@router.get("/reports/headcount")
def headcount_report(conn=Depends(get_db), _user=Depends(get_current_user)):
    by_dept = conn.execute("""
        SELECT d.name as department, e.status,
               COUNT(*) as count
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        GROUP BY d.name, e.status
        ORDER BY d.name, e.status
    """).fetchall()

    by_position = conn.execute("""
        SELECT p.title as position, COUNT(*) as count
        FROM employees e
        LEFT JOIN positions p ON e.position_id = p.id
        WHERE e.status = 'active'
        GROUP BY p.title
        ORDER BY count DESC
    """).fetchall()

    totals = conn.execute("""
        SELECT status, COUNT(*) as count
        FROM employees
        GROUP BY status
    """).fetchall()

    return {
        "by_department": [dict(r) for r in by_dept],
        "by_position": [dict(r) for r in by_position],
        "totals": [dict(r) for r in totals],
    }


@router.get("/reports/turnover")
def turnover_report(
    period: str = Query("year", pattern="^(month|quarter|year)$"),
    conn=Depends(get_db),
    _user=Depends(get_current_user),
):
    if period == "month":
        date_fmt = "%Y-%m"
    elif period == "quarter":
        date_fmt = "%Y-Q"
    else:
        date_fmt = "%Y"

    terminated = conn.execute("""
        SELECT strftime(?, e.end_date) as period, COUNT(*) as terminations
        FROM employees e
        WHERE e.status = 'terminated' AND e.end_date IS NOT NULL
        GROUP BY strftime(?, e.end_date)
        ORDER BY period DESC
        LIMIT 12
    """, (date_fmt, date_fmt)).fetchall()

    total_active = conn.execute("SELECT COUNT(*) FROM employees WHERE status = 'active'").fetchone()[0]
    total_terminated = conn.execute("SELECT COUNT(*) FROM employees WHERE status = 'terminated'").fetchone()[0]
    total = total_active + total_terminated
    rate = round((total_terminated / total * 100), 1) if total > 0 else 0

    return {
        "by_period": [dict(r) for r in terminated],
        "total_active": total_active,
        "total_terminated": total_terminated,
        "turnover_rate": rate,
    }


@router.get("/reports/leave-utilization")
def leave_utilization_report(conn=Depends(get_db), _user=Depends(get_current_user)):
    by_type = conn.execute("""
        SELECT lt.name as leave_type, COUNT(lr.id) as request_count,
               COALESCE(SUM(lr.days), 0) as total_days,
               lr.status
        FROM leave_types lt
        LEFT JOIN leave_requests lr ON lr.leave_type_id = lt.id
        GROUP BY lt.name, lr.status
        ORDER BY lt.name
    """).fetchall()

    by_dept = conn.execute("""
        SELECT d.name as department, lt.name as leave_type,
               COALESCE(SUM(CASE WHEN lr.status = 'approved' THEN lr.days ELSE 0 END), 0) as days_used
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        CROSS JOIN leave_types lt
        LEFT JOIN leave_requests lr ON lr.employee_id = e.id AND lr.leave_type_id = lt.id
        WHERE e.status = 'active'
        GROUP BY d.name, lt.name
        ORDER BY d.name, lt.name
    """).fetchall()

    return {
        "by_type": [dict(r) for r in by_type],
        "by_department": [dict(r) for r in by_dept],
    }


@router.get("/reports/time-summary")
def time_summary_report(
    from_date: str = "",
    to_date: str = "",
    conn=Depends(get_db),
    _user=Depends(get_current_user),
):
    conditions, params = [], []
    if from_date:
        conditions.append("te.date >= ?")
        params.append(from_date)
    if to_date:
        conditions.append("te.date <= ?")
        params.append(to_date)
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    # Build JOIN condition for date filters so LEFT JOIN is preserved (employees with
    # no entries in range still appear with 0 hours rather than being dropped)
    join_conditions = ["te.employee_id = e.id"]
    join_params = []
    if from_date:
        join_conditions.append("te.date >= ?")
        join_params.append(from_date)
    if to_date:
        join_conditions.append("te.date <= ?")
        join_params.append(to_date)
    join_on = " AND ".join(join_conditions)

    by_employee = conn.execute(f"""
        SELECT e.first_name || ' ' || e.last_name as employee_name,
               COALESCE(SUM(te.hours), 0) as total_hours,
               COUNT(te.id) as entry_count
        FROM employees e
        LEFT JOIN time_entries te ON {join_on}
        WHERE e.status = 'active'
        GROUP BY e.id
        ORDER BY total_hours DESC
    """, join_params).fetchall()

    by_project = conn.execute(f"""
        SELECT COALESCE(te.project, 'Unassigned') as project,
               SUM(te.hours) as total_hours,
               COUNT(te.id) as entry_count
        FROM time_entries te
        {where}
        GROUP BY te.project
        ORDER BY total_hours DESC
    """, params).fetchall()

    total = conn.execute(f"""
        SELECT COALESCE(SUM(te.hours), 0) as total_hours,
               COUNT(te.id) as total_entries
        FROM time_entries te
        {where}
    """, params).fetchone()

    return {
        "by_employee": [dict(r) for r in by_employee],
        "by_project": [dict(r) for r in by_project],
        "total_hours": total["total_hours"],
        "total_entries": total["total_entries"],
    }


@router.get("/reports/compensation")
def compensation_report(conn=Depends(get_db), _user=Depends(get_current_user)):
    by_dept = conn.execute("""
        SELECT d.name as department,
               COUNT(e.id) as employee_count,
               p.level as position_level
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN positions p ON e.position_id = p.id
        WHERE e.status = 'active'
        GROUP BY d.name, p.level
        ORDER BY d.name
    """).fetchall()

    by_position = conn.execute("""
        SELECT p.title as position, p.level,
               COUNT(e.id) as employee_count
        FROM employees e
        LEFT JOIN positions p ON e.position_id = p.id
        WHERE e.status = 'active'
        GROUP BY p.title, p.level
        ORDER BY employee_count DESC
    """).fetchall()

    return {
        "by_department": [dict(r) for r in by_dept],
        "by_position": [dict(r) for r in by_position],
    }


@router.get("/reports/recruitment")
def recruitment_report(conn=Depends(get_db), _user=Depends(get_current_user)):
    by_status = conn.execute("""
        SELECT status, COUNT(*) as count
        FROM job_postings
        GROUP BY status
    """).fetchall()

    by_stage = conn.execute("""
        SELECT stage, COUNT(*) as count
        FROM applicants
        GROUP BY stage
        ORDER BY CASE stage
            WHEN 'applied' THEN 1
            WHEN 'screening' THEN 2
            WHEN 'interview' THEN 3
            WHEN 'offer' THEN 4
            WHEN 'hired' THEN 5
            WHEN 'rejected' THEN 6
            ELSE 7
        END
    """).fetchall()

    total_postings = conn.execute("SELECT COUNT(*) FROM job_postings").fetchone()[0]
    total_applicants = conn.execute("SELECT COUNT(*) FROM applicants").fetchone()[0]
    total_hired = conn.execute("SELECT COUNT(*) FROM applicants WHERE stage = 'hired'").fetchone()[0]
    conversion_rate = round((total_hired / total_applicants * 100), 1) if total_applicants > 0 else 0

    return {
        "postings_by_status": [dict(r) for r in by_status],
        "applicants_by_stage": [dict(r) for r in by_stage],
        "total_postings": total_postings,
        "total_applicants": total_applicants,
        "total_hired": total_hired,
        "conversion_rate": conversion_rate,
    }


@router.get("/reports/diversity")
def diversity_report(conn=Depends(get_db), _user=Depends(get_current_user)):
    by_dept = conn.execute("""
        SELECT d.name as department, COUNT(e.id) as count
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        WHERE e.status = 'active'
        GROUP BY d.name
        ORDER BY count DESC
    """).fetchall()

    by_tenure = conn.execute("""
        SELECT
            CASE
                WHEN julianday('now') - julianday(start_date) < 365 THEN '0-1 years'
                WHEN julianday('now') - julianday(start_date) < 1095 THEN '1-3 years'
                WHEN julianday('now') - julianday(start_date) < 1825 THEN '3-5 years'
                ELSE '5+ years'
            END as tenure_group,
            COUNT(*) as count
        FROM employees
        WHERE status = 'active' AND start_date IS NOT NULL
        GROUP BY tenure_group
        ORDER BY tenure_group
    """).fetchall()

    by_gender = conn.execute("""
        SELECT COALESCE(gender, 'Not specified') as gender, COUNT(*) as count
        FROM employees
        WHERE status = 'active'
        GROUP BY gender
        ORDER BY count DESC
    """).fetchall()

    by_employment_type = conn.execute("""
        SELECT COALESCE(employment_type, 'Not specified') as employment_type, COUNT(*) as count
        FROM employees
        WHERE status = 'active'
        GROUP BY employment_type
        ORDER BY count DESC
    """).fetchall()

    by_age = conn.execute("""
        SELECT
            CASE
                WHEN date_of_birth IS NULL THEN 'Unknown'
                WHEN (julianday('now') - julianday(date_of_birth)) / 365.25 < 25 THEN 'Under 25'
                WHEN (julianday('now') - julianday(date_of_birth)) / 365.25 < 35 THEN '25-34'
                WHEN (julianday('now') - julianday(date_of_birth)) / 365.25 < 45 THEN '35-44'
                WHEN (julianday('now') - julianday(date_of_birth)) / 365.25 < 55 THEN '45-54'
                ELSE '55+'
            END as age_group,
            COUNT(*) as count
        FROM employees
        WHERE status = 'active'
        GROUP BY age_group
        ORDER BY age_group
    """).fetchall()

    by_location = conn.execute("""
        SELECT COALESCE(location, 'Not specified') as location, COUNT(*) as count
        FROM employees
        WHERE status = 'active'
        GROUP BY location
        ORDER BY count DESC
    """).fetchall()

    by_ethnicity = conn.execute("""
        SELECT COALESCE(ethnicity, 'Not specified') as ethnicity, COUNT(*) as count
        FROM employees
        WHERE status = 'active'
        GROUP BY ethnicity
        ORDER BY count DESC
    """).fetchall()

    return {
        "by_department": [dict(r) for r in by_dept],
        "by_tenure": [dict(r) for r in by_tenure],
        "by_gender": [dict(r) for r in by_gender],
        "by_employment_type": [dict(r) for r in by_employment_type],
        "by_age": [dict(r) for r in by_age],
        "by_location": [dict(r) for r in by_location],
        "by_ethnicity": [dict(r) for r in by_ethnicity],
    }
