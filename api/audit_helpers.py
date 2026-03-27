from .db import new_id, now_iso


def log_audit(conn, entity_type, entity_id, action, user, field_name=None, old_value=None, new_value=None):
    """Log an audit entry. Call this from other routers after mutations."""
    conn.execute("""
        INSERT INTO audit_log (id, entity_type, entity_id, action, field_name, old_value, new_value,
            user_id, user_name, user_email, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        new_id(), entity_type, entity_id, action, field_name,
        str(old_value) if old_value is not None else None,
        str(new_value) if new_value is not None else None,
        user.get("id"), user.get("name"), user.get("email"), now_iso(),
    ))
