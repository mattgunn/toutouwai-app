"""Tests for the time entries endpoints."""
import pytest


class TestListTimeEntries:
    def test_list_empty(self, client):
        resp = client.get("/api/time-entries")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_after_create(self, client, seed_employee):
        emp_id = seed_employee()
        client.post("/api/time-entries", json={
            "employee_id": emp_id,
            "date": "2026-03-20",
            "hours": 8,
            "project": "Alpha",
        })
        resp = client.get("/api/time-entries")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_filter_by_employee(self, client, seed_employee):
        emp_id = seed_employee(first_name="TimeA", last_name="Worker", email="timea@test.com")
        client.post("/api/time-entries", json={
            "employee_id": emp_id,
            "date": "2026-03-21",
            "hours": 4,
        })
        resp = client.get(f"/api/time-entries?employee_id={emp_id}")
        assert resp.status_code == 200
        for entry in resp.json():
            assert entry["employee_id"] == emp_id

    def test_filter_by_date_range(self, client, seed_employee):
        emp_id = seed_employee(first_name="TimeB", last_name="Worker", email="timeb@test.com")
        client.post("/api/time-entries", json={
            "employee_id": emp_id, "date": "2026-01-15", "hours": 8,
        })
        client.post("/api/time-entries", json={
            "employee_id": emp_id, "date": "2026-03-15", "hours": 6,
        })
        resp = client.get("/api/time-entries?date_from=2026-03-01&date_to=2026-03-31")
        assert resp.status_code == 200
        for entry in resp.json():
            assert entry["date"] >= "2026-03-01"
            assert entry["date"] <= "2026-03-31"


class TestCreateTimeEntry:
    def test_create_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="TimeC", last_name="Worker", email="timec@test.com")
        resp = client.post("/api/time-entries", json={
            "employee_id": emp_id,
            "date": "2026-03-25",
            "hours": 7.5,
            "project": "Beta",
            "description": "Coding",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["employee_id"] == emp_id
        assert data["hours"] == 7.5
        assert data["project"] == "Beta"
        assert "employee_name" in data

    def test_create_missing_employee_id(self, client):
        resp = client.post("/api/time-entries", json={
            "date": "2026-03-25",
            "hours": 8,
        })
        assert resp.status_code == 400
        assert "employee_id" in resp.json()["detail"].lower()

    def test_create_nonexistent_employee(self, client):
        resp = client.post("/api/time-entries", json={
            "employee_id": "nonexistent-id",
            "date": "2026-03-25",
            "hours": 8,
        })
        assert resp.status_code == 400
        assert "exist" in resp.json()["detail"].lower()

    def test_create_missing_date(self, client, seed_employee):
        emp_id = seed_employee(first_name="TimeD", last_name="Worker", email="timed@test.com")
        resp = client.post("/api/time-entries", json={
            "employee_id": emp_id,
            "hours": 8,
        })
        assert resp.status_code == 400
        assert "date" in resp.json()["detail"].lower()

    def test_create_invalid_date_format(self, client, seed_employee):
        emp_id = seed_employee(first_name="TimeE", last_name="Worker", email="timee@test.com")
        resp = client.post("/api/time-entries", json={
            "employee_id": emp_id,
            "date": "not-a-date",
            "hours": 8,
        })
        assert resp.status_code == 400
        assert "date" in resp.json()["detail"].lower()

    def test_create_missing_hours(self, client, seed_employee):
        emp_id = seed_employee(first_name="TimeF", last_name="Worker", email="timef@test.com")
        resp = client.post("/api/time-entries", json={
            "employee_id": emp_id,
            "date": "2026-03-25",
        })
        assert resp.status_code == 400
        assert "hours" in resp.json()["detail"].lower()

    def test_create_hours_over_24(self, client, seed_employee):
        emp_id = seed_employee(first_name="TimeG", last_name="Worker", email="timeg@test.com")
        resp = client.post("/api/time-entries", json={
            "employee_id": emp_id,
            "date": "2026-03-25",
            "hours": 25,
        })
        assert resp.status_code == 400
        assert "hours" in resp.json()["detail"].lower()

    def test_create_hours_negative(self, client, seed_employee):
        emp_id = seed_employee(first_name="TimeH", last_name="Worker", email="timeh@test.com")
        resp = client.post("/api/time-entries", json={
            "employee_id": emp_id,
            "date": "2026-03-25",
            "hours": -1,
        })
        assert resp.status_code == 400

    def test_create_hours_zero(self, client, seed_employee):
        emp_id = seed_employee(first_name="TimeI", last_name="Worker", email="timei@test.com")
        resp = client.post("/api/time-entries", json={
            "employee_id": emp_id,
            "date": "2026-03-25",
            "hours": 0,
        })
        assert resp.status_code == 200

    def test_create_hours_24(self, client, seed_employee):
        emp_id = seed_employee(first_name="TimeJ", last_name="Worker", email="timej@test.com")
        resp = client.post("/api/time-entries", json={
            "employee_id": emp_id,
            "date": "2026-03-25",
            "hours": 24,
        })
        assert resp.status_code == 200


class TestUpdateTimeEntry:
    def test_update_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="TimeK", last_name="Worker", email="timek@test.com")
        create_resp = client.post("/api/time-entries", json={
            "employee_id": emp_id,
            "date": "2026-03-25",
            "hours": 8,
        })
        entry_id = create_resp.json()["id"]

        resp = client.put(f"/api/time-entries/{entry_id}", json={
            "hours": 6,
            "project": "Updated",
        })
        assert resp.status_code == 200
        assert resp.json()["hours"] == 6
        assert resp.json()["project"] == "Updated"

    def test_update_nonexistent_returns_404(self, client):
        resp = client.put("/api/time-entries/nonexistent-id", json={"hours": 5})
        assert resp.status_code == 404


class TestDeleteTimeEntry:
    def test_delete_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="TimeL", last_name="Worker", email="timel@test.com")
        create_resp = client.post("/api/time-entries", json={
            "employee_id": emp_id,
            "date": "2026-03-25",
            "hours": 8,
        })
        entry_id = create_resp.json()["id"]

        resp = client.delete(f"/api/time-entries/{entry_id}")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

        # Verify it's gone
        list_resp = client.get(f"/api/time-entries?employee_id={emp_id}")
        ids = [e["id"] for e in list_resp.json()]
        assert entry_id not in ids

    def test_delete_nonexistent_still_ok(self, client):
        resp = client.delete("/api/time-entries/nonexistent-id")
        assert resp.status_code == 200
