import pytest
import sqlite3
import jwt
import json
from fastapi.testclient import TestClient
from api.db import SCHEMA, new_id, now_iso
from api.deps import JWT_SECRET, JWT_ALGORITHM
from api.main import app


@pytest.fixture
def db():
    """In-memory SQLite database with schema."""
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    conn.executescript(SCHEMA)
    yield conn
    conn.close()


@pytest.fixture
def admin_user(db):
    """Create an admin user and return their dict."""
    ts = now_iso()
    uid = new_id()
    db.execute(
        "INSERT INTO users (id, name, email, role, permissions, created_at, updated_at) VALUES (?,?,?,?,?,?,?)",
        (uid, "Test Admin", "admin@test.com", "admin", json.dumps(["dashboard","employees","departments","positions","leave","timesheets","recruitment","performance","reports","settings","compensation","benefits","succession"]), ts, ts)
    )
    db.commit()
    return {"id": uid, "name": "Test Admin", "email": "admin@test.com", "role": "admin", "is_super_admin": False, "permissions": ["dashboard","employees","departments","positions","leave","timesheets","recruitment","performance","reports","settings","compensation","benefits","succession"]}


@pytest.fixture
def auth_token(admin_user):
    """JWT token for the admin user."""
    return jwt.encode({"sub": admin_user["id"], "exp": 9999999999}, JWT_SECRET, algorithm=JWT_ALGORITHM)


@pytest.fixture
def client(db, admin_user, auth_token):
    """TestClient with DB and auth overrides."""
    from api.deps import get_db, get_current_user

    def override_db():
        yield db

    def override_user():
        return admin_user

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = override_user

    c = TestClient(app)
    c.headers["Authorization"] = f"Bearer {auth_token}"
    yield c

    app.dependency_overrides.clear()


@pytest.fixture
def raw_client(db):
    """TestClient with DB override only (no auth override) — for testing auth failures."""
    from api.deps import get_db

    def override_db():
        yield db

    app.dependency_overrides = {get_db: override_db}

    c = TestClient(app)
    yield c

    app.dependency_overrides.clear()


@pytest.fixture
def seed_department(db):
    """Helper to create a department."""
    def _create(name="Engineering", description="Eng dept"):
        ts = now_iso()
        did = new_id()
        db.execute("INSERT INTO departments (id, name, description, created_at, updated_at) VALUES (?,?,?,?,?)",
                   (did, name, description, ts, ts))
        db.commit()
        return did
    return _create


@pytest.fixture
def seed_position(db, seed_department):
    """Helper to create a position."""
    def _create(title="Software Engineer", dept_id=None):
        if not dept_id:
            dept_id = seed_department()
        ts = now_iso()
        pid = new_id()
        db.execute("INSERT INTO positions (id, title, department_id, created_at, updated_at) VALUES (?,?,?,?,?)",
                   (pid, title, dept_id, ts, ts))
        db.commit()
        return pid
    return _create


@pytest.fixture
def seed_employee(db, seed_department, seed_position):
    """Helper to create an employee."""
    def _create(first_name="John", last_name="Doe", email=None, dept_id=None, pos_id=None):
        if not email:
            email = f"{first_name.lower()}.{last_name.lower()}@test.com"
        if not dept_id:
            dept_id = seed_department()
        if not pos_id:
            pos_id = seed_position(dept_id=dept_id)
        ts = now_iso()
        eid = new_id()
        db.execute("""INSERT INTO employees (id, first_name, last_name, email, department_id, position_id,
                      status, start_date, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)""",
                   (eid, first_name, last_name, email, dept_id, pos_id, "active", "2024-01-15", ts, ts))
        db.commit()
        return eid
    return _create


@pytest.fixture
def seed_leave_types(db):
    """Seed default leave types."""
    ts = now_iso()
    ids = []
    for name, days in [("Annual Leave", 20), ("Sick Leave", 10)]:
        lid = new_id()
        ids.append(lid)
        db.execute("INSERT INTO leave_types (id, name, days_per_year, color, is_active, created_at, updated_at) VALUES (?,?,?,?,1,?,?)",
                   (lid, name, days, "#3B82F6", ts, ts))
    db.commit()
    return ids
