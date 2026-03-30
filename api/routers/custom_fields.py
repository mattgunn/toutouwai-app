from fastapi import APIRouter, Depends, HTTPException
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


# ── Field Definitions ────────────────────────────────────────────────


@router.get("/custom-fields/definitions")
def list_definitions(
    entity_type: str | None = None,
    is_active: int | None = None,
    conn=Depends(get_db),
    _user=Depends(get_current_user),
):
    query = "SELECT * FROM custom_field_definitions"
    conditions, params = [], []
    if entity_type:
        conditions.append("entity_type = ?")
        params.append(entity_type)
    if is_active is not None:
        conditions.append("is_active = ?")
        params.append(is_active)
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY sort_order, created_at"
    rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


@router.get("/custom-fields/definitions/{definition_id}")
def get_definition(definition_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    row = conn.execute(
        "SELECT * FROM custom_field_definitions WHERE id = ?", (definition_id,)
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Field definition not found")
    return dict(row)


@router.post("/custom-fields/definitions")
def create_definition(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    if not body.get("entity_type"):
        raise HTTPException(status_code=400, detail="entity_type is required")
    if not body.get("field_name"):
        raise HTTPException(status_code=400, detail="field_name is required")
    if not body.get("field_type"):
        raise HTTPException(status_code=400, detail="field_type is required")
    valid_types = ("text", "number", "date", "select", "boolean")
    if body["field_type"] not in valid_types:
        raise HTTPException(status_code=400, detail=f"field_type must be one of {valid_types}")
    ts = now_iso()
    did = new_id()
    conn.execute("""
        INSERT INTO custom_field_definitions (id, entity_type, field_name, field_type,
            field_options, is_required, sort_order, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (did, body["entity_type"], body["field_name"], body["field_type"],
          body.get("field_options"), body.get("is_required", 0),
          body.get("sort_order", 0), body.get("is_active", 1), ts, ts))
    conn.commit()
    row = conn.execute(
        "SELECT * FROM custom_field_definitions WHERE id = ?", (did,)
    ).fetchone()
    return dict(row)


@router.put("/custom-fields/definitions/{definition_id}")
def update_definition(definition_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["entity_type", "field_name", "field_type", "field_options",
              "is_required", "sort_order", "is_active"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.append(now_iso())
    values.append(definition_id)
    conn.execute(f"UPDATE custom_field_definitions SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute(
        "SELECT * FROM custom_field_definitions WHERE id = ?", (definition_id,)
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Field definition not found")
    return dict(row)


@router.delete("/custom-fields/definitions/{definition_id}")
def delete_definition(definition_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM custom_field_values WHERE definition_id = ?", (definition_id,))
    conn.execute("DELETE FROM custom_field_definitions WHERE id = ?", (definition_id,))
    conn.commit()
    return {"ok": True}


# ── Field Values ─────────────────────────────────────────────────────


@router.get("/custom-fields/values")
def list_values(
    definition_id: str | None = None,
    entity_id: str | None = None,
    entity_type: str | None = None,
    conn=Depends(get_db),
    _user=Depends(get_current_user),
):
    query = """
        SELECT cfv.*, cfd.field_name, cfd.field_type, cfd.entity_type
        FROM custom_field_values cfv
        JOIN custom_field_definitions cfd ON cfv.definition_id = cfd.id
    """
    conditions, params = [], []
    if definition_id:
        conditions.append("cfv.definition_id = ?")
        params.append(definition_id)
    if entity_id:
        conditions.append("cfv.entity_id = ?")
        params.append(entity_id)
    if entity_type:
        conditions.append("cfd.entity_type = ?")
        params.append(entity_type)
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY cfd.sort_order, cfd.field_name"
    rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


@router.post("/custom-fields/values")
def create_value(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    if not body.get("definition_id"):
        raise HTTPException(status_code=400, detail="definition_id is required")
    if not body.get("entity_id"):
        raise HTTPException(status_code=400, detail="entity_id is required")
    if not conn.execute("SELECT id FROM custom_field_definitions WHERE id = ?", (body["definition_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="definition_id does not exist")
    ts = now_iso()
    vid = new_id()
    conn.execute("""
        INSERT INTO custom_field_values (id, definition_id, entity_id, value, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (vid, body["definition_id"], body["entity_id"], body.get("value"), ts, ts))
    conn.commit()
    row = conn.execute("""
        SELECT cfv.*, cfd.field_name, cfd.field_type, cfd.entity_type
        FROM custom_field_values cfv
        JOIN custom_field_definitions cfd ON cfv.definition_id = cfd.id
        WHERE cfv.id = ?
    """, (vid,)).fetchone()
    return dict(row)


@router.put("/custom-fields/values/{value_id}")
def update_value(value_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    if "value" not in body:
        raise HTTPException(status_code=400, detail="No fields to update")
    ts = now_iso()
    conn.execute(
        "UPDATE custom_field_values SET value = ?, updated_at = ? WHERE id = ?",
        (body["value"], ts, value_id),
    )
    conn.commit()
    row = conn.execute("""
        SELECT cfv.*, cfd.field_name, cfd.field_type, cfd.entity_type
        FROM custom_field_values cfv
        JOIN custom_field_definitions cfd ON cfv.definition_id = cfd.id
        WHERE cfv.id = ?
    """, (value_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Field value not found")
    return dict(row)


@router.delete("/custom-fields/values/{value_id}")
def delete_value(value_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM custom_field_values WHERE id = ?", (value_id,))
    conn.commit()
    return {"ok": True}
