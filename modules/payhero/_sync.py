"""PayHero bidirectional sync logic."""

import sqlite3
from typing import Any
from api.db import new_id, now_iso


def sync_employees_from_payhero(
    conn: sqlite3.Connection,
    ph_employees: list[dict[str, Any]],
) -> dict[str, int]:
    """Pull employees from PayHero into HRIS.

    Matches by payhero_employee_key, then by email.
    Returns counts: { created, updated, skipped }.
    """
    ts = now_iso()
    created = 0
    updated = 0
    skipped = 0

    for ph in ph_employees:
        employee_key = str(ph.get("employee_key", ""))
        email = (ph.get("email") or "").strip().lower()
        display_name = ph.get("display_name", "")

        if not employee_key:
            skipped += 1
            continue

        # Parse name
        parts = display_name.strip().split(" ", 1) if display_name else ["", ""]
        first_name = parts[0] if parts else ""
        last_name = parts[1] if len(parts) > 1 else ""

        # Try match by payhero key
        row = conn.execute(
            "SELECT id FROM employees WHERE payhero_employee_key = ?",
            (employee_key,),
        ).fetchone()

        if not row and email:
            # Try match by email
            row = conn.execute(
                "SELECT id FROM employees WHERE LOWER(email) = ?",
                (email,),
            ).fetchone()

        if row:
            # Update existing employee
            conn.execute("""
                UPDATE employees SET
                    first_name = COALESCE(NULLIF(?, ''), first_name),
                    last_name = COALESCE(NULLIF(?, ''), last_name),
                    payhero_employee_key = ?,
                    updated_at = ?
                WHERE id = ?
            """, (first_name, last_name, employee_key, ts, row["id"]))
            updated += 1
        else:
            # Create new employee
            if not email:
                skipped += 1
                continue
            conn.execute("""
                INSERT INTO employees (id, first_name, last_name, email, status,
                    payhero_employee_key, created_at, updated_at)
                VALUES (?, ?, ?, ?, 'active', ?, ?, ?)
            """, (new_id(), first_name, last_name, email, employee_key, ts, ts))
            created += 1

    conn.commit()
    return {"created": created, "updated": updated, "skipped": skipped}


def build_employee_preview(
    conn: sqlite3.Connection,
    ph_employees: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Build a preview of what the sync would do, without committing."""
    preview = []

    for ph in ph_employees:
        employee_key = str(ph.get("employee_key", ""))
        email = (ph.get("email") or "").strip().lower()
        display_name = ph.get("display_name", "")

        if not employee_key:
            continue

        # Check if already linked
        row = conn.execute(
            "SELECT id, first_name, last_name, email FROM employees WHERE payhero_employee_key = ?",
            (employee_key,),
        ).fetchone()

        if not row and email:
            row = conn.execute(
                "SELECT id, first_name, last_name, email FROM employees WHERE LOWER(email) = ?",
                (email,),
            ).fetchone()

        preview.append({
            "payhero_employee_key": employee_key,
            "display_name": display_name,
            "email": email,
            "work_title": ph.get("work_title"),
            "matched_employee_id": row["id"] if row else None,
            "matched_employee_name": f"{row['first_name']} {row['last_name']}" if row else None,
            "action": "update" if row else "create",
        })

    return preview
