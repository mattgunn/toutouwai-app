"""Tests for the benefit life events endpoints."""


class TestCreateLifeEvent:
    def test_create_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="BLE", last_name="Worker", email="ble@test.com")
        resp = client.post("/api/benefits/life-events", json={
            "employee_id": emp_id,
            "event_type": "marriage",
            "event_date": "2026-02-14",
            "description": "Got married",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["event_type"] == "marriage"
        assert data["event_date"] == "2026-02-14"
        assert data["status"] == "pending"
        assert "employee_name" in data

    def test_create_missing_employee_id(self, client):
        resp = client.post("/api/benefits/life-events", json={
            "event_type": "marriage", "event_date": "2026-02-14",
        })
        assert resp.status_code == 400

    def test_create_missing_event_type(self, client, seed_employee):
        emp_id = seed_employee(first_name="BLE2", last_name="Worker", email="ble2@test.com")
        resp = client.post("/api/benefits/life-events", json={
            "employee_id": emp_id, "event_date": "2026-02-14",
        })
        assert resp.status_code == 400

    def test_create_missing_event_date(self, client, seed_employee):
        emp_id = seed_employee(first_name="BLE3", last_name="Worker", email="ble3@test.com")
        resp = client.post("/api/benefits/life-events", json={
            "employee_id": emp_id, "event_type": "marriage",
        })
        assert resp.status_code == 400

    def test_create_invalid_employee_id(self, client):
        resp = client.post("/api/benefits/life-events", json={
            "employee_id": "nonexistent",
            "event_type": "marriage", "event_date": "2026-02-14",
        })
        assert resp.status_code == 400


class TestListLifeEvents:
    def test_list_empty(self, client):
        resp = client.get("/api/benefits/life-events")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_after_create(self, client, seed_employee):
        emp_id = seed_employee(first_name="BLEL", last_name="Worker", email="blel@test.com")
        client.post("/api/benefits/life-events", json={
            "employee_id": emp_id, "event_type": "birth", "event_date": "2026-01-01",
        })
        resp = client.get("/api/benefits/life-events")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_filter_by_employee_id(self, client, seed_employee):
        emp1 = seed_employee(first_name="BLEF1", last_name="Worker", email="blef1@test.com")
        emp2 = seed_employee(first_name="BLEF2", last_name="Worker", email="blef2@test.com")
        client.post("/api/benefits/life-events", json={
            "employee_id": emp1, "event_type": "birth", "event_date": "2026-01-01",
        })
        client.post("/api/benefits/life-events", json={
            "employee_id": emp2, "event_type": "marriage", "event_date": "2026-02-01",
        })
        resp = client.get(f"/api/benefits/life-events?employee_id={emp1}")
        assert resp.status_code == 200
        for e in resp.json():
            assert e["employee_id"] == emp1


class TestUpdateLifeEvent:
    def test_update_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="BLEU", last_name="Worker", email="bleu@test.com")
        r = client.post("/api/benefits/life-events", json={
            "employee_id": emp_id, "event_type": "marriage", "event_date": "2026-02-14",
        })
        eid = r.json()["id"]
        resp = client.put(f"/api/benefits/life-events/{eid}", json={"status": "processed"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "processed"
        assert resp.json()["processed_by"] is not None
        assert resp.json()["processed_at"] is not None

    def test_update_no_fields(self, client, seed_employee):
        emp_id = seed_employee(first_name="BLEU2", last_name="Worker", email="bleu2@test.com")
        r = client.post("/api/benefits/life-events", json={
            "employee_id": emp_id, "event_type": "birth", "event_date": "2026-01-01",
        })
        eid = r.json()["id"]
        resp = client.put(f"/api/benefits/life-events/{eid}", json={})
        assert resp.status_code == 400

    def test_update_nonexistent(self, client):
        resp = client.put("/api/benefits/life-events/nonexistent", json={"status": "processed"})
        assert resp.status_code == 404


class TestDeleteLifeEvent:
    def test_delete_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="BLED", last_name="Worker", email="bled@test.com")
        r = client.post("/api/benefits/life-events", json={
            "employee_id": emp_id, "event_type": "marriage", "event_date": "2026-02-14",
        })
        eid = r.json()["id"]
        resp = client.delete(f"/api/benefits/life-events/{eid}")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
