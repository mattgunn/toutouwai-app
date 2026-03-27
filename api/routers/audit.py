from fastapi import APIRouter, Depends, Query
from ..deps import get_db, get_current_user

router = APIRouter()


@router.get("/audit")
def list_audit_log(
    entity_type: str = "",
    entity_id: str = "",
    user_id: str = "",
    from_date: str = Query("", alias="from"),
    to_date: str = Query("", alias="to"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    conn=Depends(get_db),
    _user=Depends(get_current_user),
):
    conditions, params = [], []
    if entity_type:
        conditions.append("a.entity_type = ?")
        params.append(entity_type)
    if entity_id:
        conditions.append("a.entity_id = ?")
        params.append(entity_id)
    if user_id:
        conditions.append("a.user_id = ?")
        params.append(user_id)
    if from_date:
        conditions.append("a.created_at >= ?")
        params.append(from_date)
    if to_date:
        conditions.append("a.created_at <= ?")
        params.append(to_date)

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    total = conn.execute(f"SELECT COUNT(*) FROM audit_log a {where}", params).fetchone()[0]

    offset = (page - 1) * per_page
    rows = conn.execute(f"""
        SELECT a.*
        FROM audit_log a
        {where}
        ORDER BY a.created_at DESC
        LIMIT ? OFFSET ?
    """, params + [per_page, offset]).fetchall()

    return {
        "entries": [dict(r) for r in rows],
        "total": total,
        "page": page,
        "per_page": per_page,
    }
