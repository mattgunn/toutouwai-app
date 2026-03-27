"""Azure AD bidirectional sync logic."""

import secrets
import string
import sqlite3
from typing import Any
from api.db import new_id, now_iso
from . import _client as graph


def sync_users_from_ad(
    conn: sqlite3.Connection,
    ad_users: list[dict[str, Any]],
) -> dict[str, int]:
    """Pull users from Azure AD into HRIS employees.

    Matches by azure_ad_id, then by email.
    Returns counts: { created, updated, skipped }.
    """
    ts = now_iso()
    created = 0
    updated = 0
    skipped = 0

    for ad_user in ad_users:
        ad_id = ad_user.get("id", "")
        email = (ad_user.get("mail") or ad_user.get("userPrincipalName") or "").strip().lower()
        first_name = ad_user.get("givenName", "")
        last_name = ad_user.get("surname", "")
        job_title = ad_user.get("jobTitle")
        department = ad_user.get("department")
        enabled = ad_user.get("accountEnabled", True)

        if not ad_id or not email:
            skipped += 1
            continue

        # Skip service accounts and similar
        if email.startswith("#") or "@" not in email:
            skipped += 1
            continue

        # Try match by azure_ad_id
        row = conn.execute(
            "SELECT id FROM employees WHERE azure_ad_id = ?", (ad_id,)
        ).fetchone()

        if not row:
            row = conn.execute(
                "SELECT id FROM employees WHERE LOWER(email) = ?", (email,)
            ).fetchone()

        # Resolve department_id if department name is provided
        dept_id = None
        if department:
            dept_row = conn.execute(
                "SELECT id FROM departments WHERE LOWER(name) = ?", (department.lower(),)
            ).fetchone()
            if dept_row:
                dept_id = dept_row["id"]

        status = "active" if enabled else "inactive"

        if row:
            conn.execute("""
                UPDATE employees SET
                    first_name = COALESCE(NULLIF(?, ''), first_name),
                    last_name = COALESCE(NULLIF(?, ''), last_name),
                    department_id = COALESCE(?, department_id),
                    status = ?,
                    azure_ad_id = ?,
                    updated_at = ?
                WHERE id = ?
            """, (first_name, last_name, dept_id, status, ad_id, ts, row["id"]))
            updated += 1
        else:
            conn.execute("""
                INSERT INTO employees (id, first_name, last_name, email, department_id,
                    status, azure_ad_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (new_id(), first_name, last_name, email, dept_id, status, ad_id, ts, ts))
            created += 1

    conn.commit()
    return {"created": created, "updated": updated, "skipped": skipped}


def sync_groups_as_departments(
    conn: sqlite3.Connection,
    ad_groups: list[dict[str, Any]],
) -> dict[str, int]:
    """Map Azure AD groups to HRIS departments.

    Only processes security-enabled groups.
    """
    ts = now_iso()
    created = 0
    updated = 0

    for group in ad_groups:
        if not group.get("securityEnabled"):
            continue

        group_id = group["id"]
        name = group.get("displayName", "")
        description = group.get("description")

        if not name:
            continue

        row = conn.execute(
            "SELECT id FROM departments WHERE azure_ad_group_id = ?", (group_id,)
        ).fetchone()

        if not row:
            row = conn.execute(
                "SELECT id FROM departments WHERE LOWER(name) = ?", (name.lower(),)
            ).fetchone()

        if row:
            conn.execute("""
                UPDATE departments SET azure_ad_group_id = ?, description = COALESCE(?, description), updated_at = ?
                WHERE id = ?
            """, (group_id, description, ts, row["id"]))
            updated += 1
        else:
            conn.execute("""
                INSERT INTO departments (id, name, description, azure_ad_group_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (new_id(), name, description, group_id, ts, ts))
            created += 1

    conn.commit()
    return {"created": created, "updated": updated}


def push_employee_to_ad(
    conn: sqlite3.Connection,
    employee_id: str,
    token: str,
    domain: str = "yourdomain.onmicrosoft.com",
) -> str | None:
    """Push an HRIS employee to Azure AD. Creates or updates.

    Returns the Azure AD user ID.
    """
    emp = conn.execute("""
        SELECT e.*, d.name as department_name, p.title as position_title
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN positions p ON e.position_id = p.id
        WHERE e.id = ?
    """, (employee_id,)).fetchone()

    if not emp:
        return None

    ts = now_iso()

    if emp["azure_ad_id"]:
        # Update existing AD user
        body: dict[str, Any] = {
            "givenName": emp["first_name"],
            "surname": emp["last_name"],
        }
        if emp["department_name"]:
            body["department"] = emp["department_name"]
        if emp["position_title"]:
            body["jobTitle"] = emp["position_title"]
        if emp["status"] == "terminated":
            body["accountEnabled"] = False

        graph.update_ad_user(emp["azure_ad_id"], body, token)
        return emp["azure_ad_id"]
    else:
        # Create new AD user
        mail_nickname = f"{emp['first_name'].lower()}.{emp['last_name'].lower()}"
        upn = f"{mail_nickname}@{domain}"
        temp_password = _generate_temp_password()

        body = {
            "accountEnabled": emp["status"] != "terminated",
            "displayName": f"{emp['first_name']} {emp['last_name']}",
            "givenName": emp["first_name"],
            "surname": emp["last_name"],
            "mailNickname": mail_nickname,
            "userPrincipalName": upn,
            "passwordProfile": {
                "password": temp_password,
                "forceChangePasswordNextSignIn": True,
            },
        }
        if emp["department_name"]:
            body["department"] = emp["department_name"]
        if emp["position_title"]:
            body["jobTitle"] = emp["position_title"]

        result = graph.create_ad_user(body, token)
        ad_id = result.get("id")

        if ad_id:
            conn.execute(
                "UPDATE employees SET azure_ad_id = ?, updated_at = ? WHERE id = ?",
                (ad_id, ts, employee_id),
            )
            conn.commit()

        return ad_id


def _generate_temp_password(length: int = 16) -> str:
    chars = string.ascii_letters + string.digits + "!@#$%"
    # Ensure at least one of each required type
    password = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice("!@#$%"),
    ]
    password.extend(secrets.choice(chars) for _ in range(length - 4))
    # Shuffle to avoid predictable positions
    result = list(password)
    secrets.SystemRandom().shuffle(result)
    return "".join(result)


def build_ad_user_preview(
    conn: sqlite3.Connection,
    ad_users: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Build a preview of what AD sync would do."""
    preview = []

    for ad_user in ad_users:
        ad_id = ad_user.get("id", "")
        email = (ad_user.get("mail") or ad_user.get("userPrincipalName") or "").strip().lower()
        display_name = ad_user.get("displayName", "")

        if not ad_id or not email or email.startswith("#") or "@" not in email:
            continue

        row = conn.execute(
            "SELECT id, first_name, last_name, email FROM employees WHERE azure_ad_id = ?",
            (ad_id,),
        ).fetchone()

        if not row:
            row = conn.execute(
                "SELECT id, first_name, last_name, email FROM employees WHERE LOWER(email) = ?",
                (email,),
            ).fetchone()

        preview.append({
            "azure_ad_id": ad_id,
            "display_name": display_name,
            "email": email,
            "job_title": ad_user.get("jobTitle"),
            "department": ad_user.get("department"),
            "account_enabled": ad_user.get("accountEnabled", True),
            "matched_employee_id": row["id"] if row else None,
            "matched_employee_name": f"{row['first_name']} {row['last_name']}" if row else None,
            "action": "update" if row else "create",
        })

    return preview
