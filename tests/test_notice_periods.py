"""Tests for the notice periods endpoints."""


class TestCreateNoticePeriod:
    def test_create_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="NP", last_name="Worker", email="np@test.com")
        resp = client.post("/api/notice-periods", json={
            "employee_id": emp_id,
            "notice_type": "resignation",
            "notice_date": "2026-03-01",
            "effective_date": "2026-04-01",
            "reason": "Personal reasons",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["notice_type"] == "resignation"
        assert data["notice_date"] == "2026-03-01"
        assert data["effective_date"] == "2026-04-01"
        assert data["status"] == "pending"
        assert "employee_name" in data

    def test_create_missing_employee_id(self, client):
        resp = client.post("/api/notice-periods", json={
            "notice_type": "resignation",
            "notice_date": "2026-03-01", "effective_date": "2026-04-01",
        })
        assert resp.status_code == 400

    def test_create_missing_notice_type(self, client, seed_employee):
        emp_id = seed_employee(first_name="NP2", last_name="Worker", email="np2@test.com")
        resp = client.post("/api/notice-periods", json={
            "employee_id": emp_id,
            "notice_date": "2026-03-01", "effective_date": "2026-04-01",
        })
        assert resp.status_code == 400

    def test_create_missing_notice_date(self, client, seed_employee):
        emp_id = seed_employee(first_name="NP3", last_name="Worker", email="np3@test.com")
        resp = client.post("/api/notice-periods", json={
            "employee_id": emp_id,
            "notice_type": "resignation", "effective_date": "2026-04-01",
        })
        assert resp.status_code == 400

    def test_create_missing_effective_date(self, client, seed_employee):
        emp_id = seed_employee(first_name="NP4", last_name="Worker", email="np4@test.com")
        resp = client.post("/api/notice-periods", json={
            "employee_id": emp_id,
            "notice_type": "resignation", "notice_date": "2026-03-01",
        })
        assert resp.status_code == 400

    def test_create_invalid_employee_id(self, client):
        resp = client.post("/api/notice-periods", json={
            "employee_id": "nonexistent",
            "notice_type": "resignation",
            "notice_date": "2026-03-01", "effective_date": "2026-04-01",
        })
        assert resp.status_code == 400


class TestListNoticePeriods:
    def test_list_empty(self, client):
        resp = client.get("/api/notice-periods")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_after_create(self, client, seed_employee):
        emp_id = seed_employee(first_name="NPL", last_name="Worker", email="npl@test.com")
        client.post("/api/notice-periods", json={
            "employee_id": emp_id,
            "notice_type": "resignation",
            "notice_date": "2026-03-01", "effective_date": "2026-04-01",
        })
        resp = client.get("/api/notice-periods")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_filter_by_employee_id(self, client, seed_employee):
        emp1 = seed_employee(first_name="NPF1", last_name="Worker", email="npf1@test.com")
        emp2 = seed_employee(first_name="NPF2", last_name="Worker", email="npf2@test.com")
        client.post("/api/notice-periods", json={
            "employee_id": emp1, "notice_type": "resignation",
            "notice_date": "2026-03-01", "effective_date": "2026-04-01",
        })
        client.post("/api/notice-periods", json={
            "employee_id": emp2, "notice_type": "termination",
            "notice_date": "2026-03-01", "effective_date": "2026-04-01",
        })
        resp = client.get(f"/api/notice-periods?employee_id={emp1}")
        assert resp.status_code == 200
        for np in resp.json():
            assert np["employee_id"] == emp1


class TestUpdateNoticePeriod:
    def test_update_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="NPU", last_name="Worker", email="npu@test.com")
        r = client.post("/api/notice-periods", json={
            "employee_id": emp_id, "notice_type": "resignation",
            "notice_date": "2026-03-01", "effective_date": "2026-04-01",
        })
        nid = r.json()["id"]
        resp = client.put(f"/api/notice-periods/{nid}", json={"status": "completed"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "completed"

    def test_update_no_fields(self, client, seed_employee):
        emp_id = seed_employee(first_name="NPU2", last_name="Worker", email="npu2@test.com")
        r = client.post("/api/notice-periods", json={
            "employee_id": emp_id, "notice_type": "resignation",
            "notice_date": "2026-03-01", "effective_date": "2026-04-01",
        })
        nid = r.json()["id"]
        resp = client.put(f"/api/notice-periods/{nid}", json={})
        assert resp.status_code == 400

    def test_update_nonexistent(self, client):
        resp = client.put("/api/notice-periods/nonexistent", json={"status": "completed"})
        assert resp.status_code == 404


class TestDeleteNoticePeriod:
    def test_delete_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="NPD", last_name="Worker", email="npd@test.com")
        r = client.post("/api/notice-periods", json={
            "employee_id": emp_id, "notice_type": "resignation",
            "notice_date": "2026-03-01", "effective_date": "2026-04-01",
        })
        nid = r.json()["id"]
        resp = client.delete(f"/api/notice-periods/{nid}")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
