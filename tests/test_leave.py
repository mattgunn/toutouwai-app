"""Tests for the leave management endpoints."""
import pytest


class TestLeaveTypes:
    def test_list_leave_types_empty(self, client):
        resp = client.get("/api/leave/types")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_list_leave_types_after_seed(self, client, seed_leave_types):
        leave_type_ids = seed_leave_types
        resp = client.get("/api/leave/types")
        assert resp.status_code == 200
        types = resp.json()
        assert len(types) >= len(leave_type_ids)

    def test_leave_types_have_expected_fields(self, client, seed_leave_types):
        resp = client.get("/api/leave/types")
        lt = resp.json()[0]
        assert "id" in lt
        assert "name" in lt
        assert "days_per_year" in lt
        assert "is_active" in lt


class TestLeaveRequests:
    def test_list_leave_requests_empty(self, client):
        resp = client.get("/api/leave/requests")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_create_leave_request(self, client, seed_employee, seed_leave_types):
        emp_id = seed_employee(first_name="Alice", last_name="Test", email="alice@test.com")
        lt_ids = seed_leave_types

        resp = client.post("/api/leave/requests", json={
            "employee_id": emp_id,
            "leave_type_id": lt_ids[0],
            "start_date": "2026-04-01",
            "end_date": "2026-04-05",
            "days": 5,
            "notes": "Holiday",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["employee_id"] == emp_id
        assert data["status"] == "pending"
        assert data["days"] == 5
        assert "employee_name" in data
        assert "leave_type_name" in data

    def test_list_leave_requests_after_create(self, client, seed_employee, seed_leave_types):
        emp_id = seed_employee(first_name="Bob", last_name="Test", email="bob@test.com")
        lt_ids = seed_leave_types

        client.post("/api/leave/requests", json={
            "employee_id": emp_id,
            "leave_type_id": lt_ids[0],
            "start_date": "2026-05-01",
            "end_date": "2026-05-03",
            "days": 3,
        })
        resp = client.get("/api/leave/requests")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_filter_leave_requests_by_employee(self, client, seed_employee, seed_leave_types):
        emp_id = seed_employee(first_name="Carol", last_name="Filter", email="carol@test.com")
        lt_ids = seed_leave_types

        client.post("/api/leave/requests", json={
            "employee_id": emp_id,
            "leave_type_id": lt_ids[0],
            "start_date": "2026-06-01",
            "end_date": "2026-06-02",
            "days": 2,
        })
        resp = client.get(f"/api/leave/requests?employee_id={emp_id}")
        assert resp.status_code == 200
        for req in resp.json():
            assert req["employee_id"] == emp_id

    def test_filter_leave_requests_by_status(self, client, seed_employee, seed_leave_types):
        emp_id = seed_employee(first_name="Dave", last_name="Filter", email="dave@test.com")
        lt_ids = seed_leave_types

        client.post("/api/leave/requests", json={
            "employee_id": emp_id,
            "leave_type_id": lt_ids[0],
            "start_date": "2026-07-01",
            "end_date": "2026-07-01",
            "days": 1,
        })
        resp = client.get("/api/leave/requests?status=pending")
        assert resp.status_code == 200
        for req in resp.json():
            assert req["status"] == "pending"


class TestLeaveRequestStatus:
    def _create_request(self, client, seed_employee, seed_leave_types):
        emp_id = seed_employee()
        lt_ids = seed_leave_types

        resp = client.post("/api/leave/requests", json={
            "employee_id": emp_id,
            "leave_type_id": lt_ids[0],
            "start_date": "2026-08-01",
            "end_date": "2026-08-03",
            "days": 3,
        })
        return resp.json()["id"]

    def test_approve_leave_request(self, client, seed_employee, seed_leave_types):
        req_id = self._create_request(client, seed_employee, seed_leave_types)
        resp = client.put(f"/api/leave/requests/{req_id}/status", json={"status": "approved"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "approved"
        assert resp.json()["reviewed_by"] is not None

    def test_reject_leave_request(self, client, seed_employee, seed_leave_types):
        req_id = self._create_request(client, seed_employee, seed_leave_types)
        resp = client.put(f"/api/leave/requests/{req_id}/status", json={"status": "rejected"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "rejected"

    def test_cancel_leave_request(self, client, seed_employee, seed_leave_types):
        req_id = self._create_request(client, seed_employee, seed_leave_types)
        resp = client.put(f"/api/leave/requests/{req_id}/status", json={"status": "cancelled"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "cancelled"

    def test_invalid_status_returns_400(self, client, seed_employee, seed_leave_types):
        req_id = self._create_request(client, seed_employee, seed_leave_types)
        resp = client.put(f"/api/leave/requests/{req_id}/status", json={"status": "invalid_status"})
        assert resp.status_code == 400

    def test_nonexistent_request_returns_404(self, client):
        resp = client.put("/api/leave/requests/nonexistent-id/status", json={"status": "approved"})
        assert resp.status_code == 404


class TestLeaveBalances:
    def test_balances_empty(self, client):
        resp = client.get("/api/leave/balances")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_balances_with_employee_and_leave_types(self, client, seed_employee, seed_leave_types):
        seed_employee(first_name="Frank", last_name="Balance", email="frank@test.com")

        resp = client.get("/api/leave/balances")
        assert resp.status_code == 200
        balances = resp.json()
        assert len(balances) > 0
        b = balances[0]
        assert "employee_id" in b
        assert "leave_type_id" in b
        assert "entitled" in b
        assert "used" in b
        assert "remaining" in b

    def test_balances_reflect_approved_leave(self, client, seed_employee, seed_leave_types):
        emp_id = seed_employee(first_name="Grace", last_name="Balance", email="grace@test.com")
        lt_ids = seed_leave_types

        create_resp = client.post("/api/leave/requests", json={
            "employee_id": emp_id,
            "leave_type_id": lt_ids[0],
            "start_date": "2026-09-01",
            "end_date": "2026-09-05",
            "days": 5,
        })
        req_id = create_resp.json()["id"]
        client.put(f"/api/leave/requests/{req_id}/status", json={"status": "approved"})

        resp = client.get("/api/leave/balances")
        balances = resp.json()
        emp_balances = [b for b in balances if b["employee_id"] == emp_id and b["leave_type_id"] == lt_ids[0]]
        assert len(emp_balances) == 1
        assert emp_balances[0]["used"] == 5
        assert emp_balances[0]["remaining"] == emp_balances[0]["entitled"] - 5
