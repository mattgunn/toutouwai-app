"""Tests for the benefits endpoints."""
import pytest


class TestBenefitPlans:
    def test_list_plans_empty(self, client):
        resp = client.get("/api/benefits/plans")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_create_plan(self, client):
        resp = client.post("/api/benefits/plans", json={
            "name": "Health Insurance",
            "type": "health",
            "provider": "Acme Health",
            "description": "Full medical coverage",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Health Insurance"
        assert data["type"] == "health"
        assert data["is_active"] == 1

    def test_create_plan_minimal(self, client):
        resp = client.post("/api/benefits/plans", json={
            "name": "Dental",
            "type": "dental",
        })
        assert resp.status_code == 200
        assert resp.json()["name"] == "Dental"

    def test_list_plans_after_create(self, client):
        client.post("/api/benefits/plans", json={"name": "Plan A", "type": "health"})
        client.post("/api/benefits/plans", json={"name": "Plan B", "type": "dental"})
        resp = client.get("/api/benefits/plans")
        assert len(resp.json()) >= 2

    def test_plan_includes_enrollment_count(self, client):
        resp = client.post("/api/benefits/plans", json={"name": "Count Plan", "type": "health"})
        plans = client.get("/api/benefits/plans").json()
        plan = [p for p in plans if p["id"] == resp.json()["id"]][0]
        assert plan["active_enrollments"] == 0

    def test_update_plan(self, client):
        create_resp = client.post("/api/benefits/plans", json={"name": "Original", "type": "health"})
        pid = create_resp.json()["id"]

        resp = client.put(f"/api/benefits/plans/{pid}", json={
            "name": "Updated Plan",
            "is_active": 0,
        })
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Plan"
        assert resp.json()["is_active"] == 0

    def test_update_plan_no_fields_returns_400(self, client):
        create_resp = client.post("/api/benefits/plans", json={"name": "No Update", "type": "health"})
        pid = create_resp.json()["id"]

        resp = client.put(f"/api/benefits/plans/{pid}", json={})
        assert resp.status_code == 400

    def test_update_nonexistent_plan_returns_404(self, client):
        resp = client.put("/api/benefits/plans/nonexistent-id", json={"name": "X"})
        assert resp.status_code == 404


class TestBenefitEnrollments:
    def _create_plan(self, client):
        resp = client.post("/api/benefits/plans", json={"name": "Test Plan", "type": "health"})
        return resp.json()["id"]

    def test_list_enrollments_empty(self, client):
        resp = client.get("/api/benefits/enrollments")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_create_enrollment(self, client, seed_employee):
        emp_id = seed_employee(first_name="BenA", last_name="Worker", email="bena@test.com")
        plan_id = self._create_plan(client)

        resp = client.post("/api/benefits/enrollments", json={
            "employee_id": emp_id,
            "plan_id": plan_id,
            "start_date": "2026-01-01",
            "coverage_level": "family",
            "employee_contribution": 200,
            "employer_contribution": 400,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["employee_id"] == emp_id
        assert data["plan_id"] == plan_id
        assert data["status"] == "active"
        assert data["coverage_level"] == "family"
        assert "employee_name" in data
        assert "plan_name" in data

    def test_create_enrollment_defaults(self, client, seed_employee):
        emp_id = seed_employee(first_name="BenB", last_name="Worker", email="benb@test.com")
        plan_id = self._create_plan(client)

        resp = client.post("/api/benefits/enrollments", json={
            "employee_id": emp_id,
            "plan_id": plan_id,
            "start_date": "2026-01-01",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "active"
        assert data["coverage_level"] == "employee"
        assert data["employee_contribution"] == 0
        assert data["employer_contribution"] == 0

    def test_list_enrollments_after_create(self, client, seed_employee):
        emp_id = seed_employee(first_name="BenC", last_name="Worker", email="benc@test.com")
        plan_id = self._create_plan(client)
        client.post("/api/benefits/enrollments", json={
            "employee_id": emp_id, "plan_id": plan_id, "start_date": "2026-01-01",
        })
        resp = client.get("/api/benefits/enrollments")
        assert len(resp.json()) >= 1

    def test_filter_enrollments_by_employee(self, client, seed_employee):
        emp_id = seed_employee(first_name="BenD", last_name="Worker", email="bend@test.com")
        plan_id = self._create_plan(client)
        client.post("/api/benefits/enrollments", json={
            "employee_id": emp_id, "plan_id": plan_id, "start_date": "2026-01-01",
        })
        resp = client.get(f"/api/benefits/enrollments?employee_id={emp_id}")
        for e in resp.json():
            assert e["employee_id"] == emp_id

    def test_filter_enrollments_by_plan(self, client, seed_employee):
        emp_id = seed_employee(first_name="BenE", last_name="Worker", email="bene@test.com")
        plan_id = self._create_plan(client)
        client.post("/api/benefits/enrollments", json={
            "employee_id": emp_id, "plan_id": plan_id, "start_date": "2026-01-01",
        })
        resp = client.get(f"/api/benefits/enrollments?plan_id={plan_id}")
        for e in resp.json():
            assert e["plan_id"] == plan_id

    def test_update_enrollment(self, client, seed_employee):
        emp_id = seed_employee(first_name="BenF", last_name="Worker", email="benf@test.com")
        plan_id = self._create_plan(client)
        create_resp = client.post("/api/benefits/enrollments", json={
            "employee_id": emp_id, "plan_id": plan_id, "start_date": "2026-01-01",
        })
        eid = create_resp.json()["id"]

        resp = client.put(f"/api/benefits/enrollments/{eid}", json={
            "status": "cancelled",
            "end_date": "2026-12-31",
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "cancelled"
        assert resp.json()["end_date"] == "2026-12-31"

    def test_update_enrollment_no_fields_returns_400(self, client, seed_employee):
        emp_id = seed_employee(first_name="BenG", last_name="Worker", email="beng@test.com")
        plan_id = self._create_plan(client)
        create_resp = client.post("/api/benefits/enrollments", json={
            "employee_id": emp_id, "plan_id": plan_id, "start_date": "2026-01-01",
        })
        eid = create_resp.json()["id"]

        resp = client.put(f"/api/benefits/enrollments/{eid}", json={})
        assert resp.status_code == 400

    def test_update_nonexistent_enrollment_returns_404(self, client):
        resp = client.put("/api/benefits/enrollments/nonexistent-id", json={"status": "cancelled"})
        assert resp.status_code == 404

    def test_plan_enrollment_count_increments(self, client, seed_employee):
        emp_id = seed_employee(first_name="BenH", last_name="Worker", email="benh@test.com")
        plan_id = self._create_plan(client)
        client.post("/api/benefits/enrollments", json={
            "employee_id": emp_id, "plan_id": plan_id, "start_date": "2026-01-01",
        })
        plans = client.get("/api/benefits/plans").json()
        plan = [p for p in plans if p["id"] == plan_id][0]
        assert plan["active_enrollments"] == 1
