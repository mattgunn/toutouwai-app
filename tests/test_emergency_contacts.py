"""Tests for the emergency contacts endpoints."""


class TestCreateEmergencyContact:
    def test_create_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="EC", last_name="Worker", email="ec@test.com")
        resp = client.post("/api/emergency-contacts", json={
            "employee_id": emp_id,
            "contact_name": "Jane Doe",
            "relationship": "Spouse",
            "phone": "+64-21-555-0100",
            "email": "jane@example.com",
            "is_primary": 1,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["contact_name"] == "Jane Doe"
        assert data["phone"] == "+64-21-555-0100"
        assert "employee_name" in data

    def test_create_missing_employee_id(self, client):
        resp = client.post("/api/emergency-contacts", json={
            "contact_name": "Jane",
            "phone": "123",
        })
        assert resp.status_code == 400

    def test_create_missing_contact_name(self, client, seed_employee):
        emp_id = seed_employee(first_name="EC2", last_name="Worker", email="ec2@test.com")
        resp = client.post("/api/emergency-contacts", json={
            "employee_id": emp_id,
            "phone": "123",
        })
        assert resp.status_code == 400

    def test_create_missing_phone(self, client, seed_employee):
        emp_id = seed_employee(first_name="EC3", last_name="Worker", email="ec3@test.com")
        resp = client.post("/api/emergency-contacts", json={
            "employee_id": emp_id,
            "contact_name": "Jane",
        })
        assert resp.status_code == 400

    def test_create_invalid_employee_id(self, client):
        resp = client.post("/api/emergency-contacts", json={
            "employee_id": "nonexistent",
            "contact_name": "Jane",
            "phone": "123",
        })
        assert resp.status_code == 400


class TestListEmergencyContacts:
    def test_list_empty(self, client):
        resp = client.get("/api/emergency-contacts")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_after_create(self, client, seed_employee):
        emp_id = seed_employee(first_name="ECL", last_name="Worker", email="ecl@test.com")
        client.post("/api/emergency-contacts", json={
            "employee_id": emp_id,
            "contact_name": "Bob",
            "phone": "555-0101",
        })
        resp = client.get("/api/emergency-contacts")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_filter_by_employee_id(self, client, seed_employee):
        emp1 = seed_employee(first_name="ECF1", last_name="Worker", email="ecf1@test.com")
        emp2 = seed_employee(first_name="ECF2", last_name="Worker", email="ecf2@test.com")
        client.post("/api/emergency-contacts", json={
            "employee_id": emp1, "contact_name": "A", "phone": "1",
        })
        client.post("/api/emergency-contacts", json={
            "employee_id": emp2, "contact_name": "B", "phone": "2",
        })
        resp = client.get(f"/api/emergency-contacts?employee_id={emp1}")
        assert resp.status_code == 200
        for c in resp.json():
            assert c["employee_id"] == emp1


class TestUpdateEmergencyContact:
    def test_update_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="ECU", last_name="Worker", email="ecu@test.com")
        r = client.post("/api/emergency-contacts", json={
            "employee_id": emp_id, "contact_name": "Old", "phone": "111",
        })
        cid = r.json()["id"]
        resp = client.put(f"/api/emergency-contacts/{cid}", json={"contact_name": "New Name"})
        assert resp.status_code == 200
        assert resp.json()["contact_name"] == "New Name"

    def test_update_no_fields(self, client, seed_employee):
        emp_id = seed_employee(first_name="ECU2", last_name="Worker", email="ecu2@test.com")
        r = client.post("/api/emergency-contacts", json={
            "employee_id": emp_id, "contact_name": "X", "phone": "1",
        })
        cid = r.json()["id"]
        resp = client.put(f"/api/emergency-contacts/{cid}", json={})
        assert resp.status_code == 400

    def test_update_nonexistent(self, client):
        resp = client.put("/api/emergency-contacts/nonexistent", json={"contact_name": "X"})
        assert resp.status_code == 404


class TestDeleteEmergencyContact:
    def test_delete_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="ECD", last_name="Worker", email="ecd@test.com")
        r = client.post("/api/emergency-contacts", json={
            "employee_id": emp_id, "contact_name": "Del", "phone": "999",
        })
        cid = r.json()["id"]
        resp = client.delete(f"/api/emergency-contacts/{cid}")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
