from fastapi import APIRouter, Depends
from ..deps import get_db, get_current_user

router = APIRouter()


@router.get("/dashboard")
def get_dashboard(conn=Depends(get_db), _user=Depends(get_current_user)):
    total = conn.execute("SELECT COUNT(*) FROM employees").fetchone()[0]
    active = conn.execute("SELECT COUNT(*) FROM employees WHERE status = 'active'").fetchone()[0]
    pending_leave = conn.execute("SELECT COUNT(*) FROM leave_requests WHERE status = 'pending'").fetchone()[0]
    open_positions = conn.execute("SELECT COUNT(*) FROM job_postings WHERE status = 'open'").fetchone()[0]
    active_cycles = conn.execute("SELECT COUNT(*) FROM review_cycles WHERE status = 'active'").fetchone()[0]

    recent_hires = conn.execute("""
        SELECT e.*, d.name as department_name, p.title as position_title,
               m.first_name || ' ' || m.last_name as manager_name
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN positions p ON e.position_id = p.id
        LEFT JOIN employees m ON e.manager_id = m.id
        ORDER BY e.start_date DESC LIMIT 5
    """).fetchall()

    upcoming_leave = conn.execute("""
        SELECT lr.*, e.first_name || ' ' || e.last_name as employee_name,
               lt.name as leave_type_name
        FROM leave_requests lr
        JOIN employees e ON lr.employee_id = e.id
        JOIN leave_types lt ON lr.leave_type_id = lt.id
        WHERE lr.status = 'approved' AND lr.start_date >= date('now')
        ORDER BY lr.start_date LIMIT 5
    """).fetchall()

    return {
        "total_employees": total,
        "active_employees": active,
        "pending_leave_requests": pending_leave,
        "open_positions": open_positions,
        "active_review_cycles": active_cycles,
        "recent_hires": [dict(r) for r in recent_hires],
        "upcoming_leave": [dict(r) for r in upcoming_leave],
    }
