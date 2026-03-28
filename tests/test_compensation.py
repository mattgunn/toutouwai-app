"""Tests for the compensation endpoints."""
import pytest


class TestListCompensation:
    def test_list_empty(self, client):
        resp = client.get("/api/compensation")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_after_create(self, client, seed_employee):
        emp_id = seed_employee(first_name="CompA", last_name="Worker", email="compa@test.com")
        client.post("/api/compensation", json={
            "employee_id": emp_id,
            "effective_date": "2026-01-01",
            "salary": 85000,
        })
        resp = client.get("/api/compensation")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_filter_by_employee(self, client, seed_employee):
        emp_id = seed_employee(first_name="CompB", last_name="Worker", email="compb@test.com")
        client.post("/api/compensation", json={
            "employee_id": emp_id,
            "effective_date": "2026-01-01",
            "salary": 90000,
        })
        resp = client.get(f"/api/compensation?employee_id={emp_id}")
        assert resp.status_code == 200
        for c in resp.json():
            assert c["employee_id"] == emp_id


class TestCreateCompensation:
    def test_create_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="CompC", last_name="Worker", email="compc@test.com")
        resp = client.post("/api/compensation", json={
            "employee_id": emp_id,
            "effective_date": "2026-04-01",
            "salary": 95000,
            "currency": "USD",
            "pay_frequency": "monthly",
            "reason": "Annual review",
            "notes": "Well deserved",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["employee_id"] == emp_id
        assert data["salary"] == 95000
        assert data["currency"] == "USD"
        assert data["pay_frequency"] == "monthly"
        assert "employee_name" in data

    def test_create_with_defaults(self, client, seed_employee):
        emp_id = seed_employee(first_name="CompD", last_name="Worker", email="compd@test.com")
        resp = client.post("/api/compensation", json={
            "employee_id": emp_id,
            "effective_date": "2026-01-01",
            "salary": 70000,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["currency"] == "NZD"
        assert data["pay_frequency"] == "annual"


class TestCurrentCompensation:
    def test_current_empty(self, client):
        resp = client.get("/api/compensation/current")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_current_returns_latest(self, client, seed_employee):
        emp_id = seed_employee(first_name="CompE", last_name="Worker", email="compe@test.com")
        client.post("/api/compensation", json={
            "employee_id": emp_id,
            "effective_date": "2025-01-01",
            "salary": 70000,
        })
        client.post("/api/compensation", json={
            "employee_id": emp_id,
            "effective_date": "2026-01-01",
            "salary": 80000,
        })
        resp = client.get("/api/compensation/current")
        assert resp.status_code == 200
        emp_records = [c for c in resp.json() if c["employee_id"] == emp_id]
        assert len(emp_records) == 1
        assert emp_records[0]["salary"] == 80000
        assert "department_name" in emp_records[0]
        assert "position_title" in emp_records[0]


class TestUpdateCompensation:
    def test_update_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="CompF", last_name="Worker", email="compf@test.com")
        create_resp = client.post("/api/compensation", json={
            "employee_id": emp_id,
            "effective_date": "2026-01-01",
            "salary": 75000,
        })
        comp_id = create_resp.json()["id"]

        resp = client.put(f"/api/compensation/{comp_id}", json={
            "salary": 80000,
            "reason": "Promotion",
        })
        assert resp.status_code == 200
        assert resp.json()["salary"] == 80000
        assert resp.json()["reason"] == "Promotion"

    def test_update_no_fields_returns_400(self, client, seed_employee):
        emp_id = seed_employee(first_name="CompG", last_name="Worker", email="compg@test.com")
        create_resp = client.post("/api/compensation", json={
            "employee_id": emp_id,
            "effective_date": "2026-01-01",
            "salary": 75000,
        })
        comp_id = create_resp.json()["id"]

        resp = client.put(f"/api/compensation/{comp_id}", json={})
        assert resp.status_code == 400

    def test_update_nonexistent_returns_404(self, client):
        resp = client.put("/api/compensation/nonexistent-id", json={"salary": 100000})
        assert resp.status_code == 404
