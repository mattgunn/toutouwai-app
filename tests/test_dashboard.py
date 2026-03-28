class TestDashboard:
    """Tests for GET /api/dashboard."""

    def test_dashboard_returns_expected_keys(self, client):
        resp = client.get("/api/dashboard")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_employees" in data
        assert "active_employees" in data
        assert "pending_leave_requests" in data
        assert "open_positions" in data
        assert "active_review_cycles" in data
        assert "recent_hires" in data
        assert "upcoming_leave" in data

    def test_dashboard_empty_database(self, client):
        resp = client.get("/api/dashboard")
        data = resp.json()
        assert data["total_employees"] == 0
        assert data["active_employees"] == 0
        assert data["pending_leave_requests"] == 0
        assert data["open_positions"] == 0
        assert data["active_review_cycles"] == 0
        assert data["recent_hires"] == []
        assert data["upcoming_leave"] == []

    def test_dashboard_counts_employees(self, client, seed_employee):
        seed_employee(first_name="Alice", last_name="Smith")
        seed_employee(first_name="Bob", last_name="Jones")
        resp = client.get("/api/dashboard")
        data = resp.json()
        assert data["total_employees"] == 2
        assert data["active_employees"] == 2

    def test_dashboard_recent_hires_populated(self, client, seed_employee):
        seed_employee(first_name="Alice", last_name="Smith")
        resp = client.get("/api/dashboard")
        data = resp.json()
        assert len(data["recent_hires"]) == 1
        assert data["recent_hires"][0]["first_name"] == "Alice"

    def test_dashboard_counts_inactive_employees(self, client, db, seed_department, seed_position):
        """Inactive employees count toward total but not active."""
        from api.db import new_id, now_iso
        dept_id = seed_department()
        pos_id = seed_position(dept_id=dept_id)
        ts = now_iso()
        eid = new_id()
        db.execute("""INSERT INTO employees (id, first_name, last_name, email, department_id, position_id,
                      status, start_date, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)""",
                   (eid, "Inactive", "User", "inactive@test.com", dept_id, pos_id, "inactive", "2024-01-15", ts, ts))
        db.commit()

        resp = client.get("/api/dashboard")
        data = resp.json()
        assert data["total_employees"] == 1
        assert data["active_employees"] == 0

    def test_dashboard_counts_pending_leave(self, client, db, seed_employee, seed_leave_types):
        """Pending leave requests are counted."""
        from api.db import new_id, now_iso
        eid = seed_employee()
        lt_ids = seed_leave_types
        ts = now_iso()
        lid = new_id()
        db.execute("""INSERT INTO leave_requests (id, employee_id, leave_type_id, start_date, end_date, days, status, created_at, updated_at)
                      VALUES (?,?,?,?,?,?,?,?,?)""",
                   (lid, eid, lt_ids[0], "2026-06-01", "2026-06-05", 5, "pending", ts, ts))
        db.commit()

        resp = client.get("/api/dashboard")
        data = resp.json()
        assert data["pending_leave_requests"] == 1
