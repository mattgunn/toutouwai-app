"""Tests for the job requisitions endpoints."""


class TestCreateRequisition:
    def test_create_success(self, client, seed_department):
        dept_id = seed_department(name="Req Dept")
        resp = client.post("/api/requisitions", json={
            "title": "Senior Developer",
            "department_id": dept_id,
            "justification": "Team expansion needed",
            "number_of_openings": 2,
            "priority": "high",
            "budget_min": 80000,
            "budget_max": 120000,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Senior Developer"
        assert data["department_id"] == dept_id
        assert data["number_of_openings"] == 2
        assert data["status"] == "draft"
        assert "department_name" in data
        assert "requested_by_name" in data

    def test_create_with_defaults(self, client, seed_department):
        dept_id = seed_department(name="Req Dept 2")
        resp = client.post("/api/requisitions", json={
            "title": "Junior Dev",
            "department_id": dept_id,
            "justification": "Replacement",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["number_of_openings"] == 1
        assert data["priority"] == "normal"
        assert data["currency"] == "NZD"
        assert data["status"] == "draft"

    def test_create_missing_title(self, client, seed_department):
        dept_id = seed_department(name="Req Dept 3")
        resp = client.post("/api/requisitions", json={
            "department_id": dept_id, "justification": "Test",
        })
        assert resp.status_code == 400

    def test_create_missing_department_id(self, client):
        resp = client.post("/api/requisitions", json={
            "title": "Dev", "justification": "Test",
        })
        assert resp.status_code == 400

    def test_create_missing_justification(self, client, seed_department):
        dept_id = seed_department(name="Req Dept 4")
        resp = client.post("/api/requisitions", json={
            "title": "Dev", "department_id": dept_id,
        })
        assert resp.status_code == 400

    def test_create_invalid_department_id(self, client):
        resp = client.post("/api/requisitions", json={
            "title": "Dev", "department_id": "nonexistent", "justification": "Test",
        })
        assert resp.status_code == 400

    def test_create_invalid_position_id(self, client, seed_department):
        dept_id = seed_department(name="Req Dept 5")
        resp = client.post("/api/requisitions", json={
            "title": "Dev",
            "department_id": dept_id,
            "justification": "Test",
            "position_id": "nonexistent",
        })
        assert resp.status_code == 400


class TestListRequisitions:
    def test_list_empty(self, client):
        resp = client.get("/api/requisitions")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_after_create(self, client, seed_department):
        dept_id = seed_department(name="Req List Dept")
        client.post("/api/requisitions", json={
            "title": "Tester", "department_id": dept_id, "justification": "Need QA",
        })
        resp = client.get("/api/requisitions")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_filter_by_department_id(self, client, seed_department):
        dept1 = seed_department(name="Req Filter Dept 1")
        dept2 = seed_department(name="Req Filter Dept 2")
        client.post("/api/requisitions", json={
            "title": "Dev A", "department_id": dept1, "justification": "A",
        })
        client.post("/api/requisitions", json={
            "title": "Dev B", "department_id": dept2, "justification": "B",
        })
        resp = client.get(f"/api/requisitions?department_id={dept1}")
        assert resp.status_code == 200
        for r in resp.json():
            assert r["department_id"] == dept1


class TestUpdateRequisition:
    def test_update_success(self, client, seed_department):
        dept_id = seed_department(name="Req Update Dept")
        r = client.post("/api/requisitions", json={
            "title": "Old Title", "department_id": dept_id, "justification": "Test",
        })
        rid = r.json()["id"]
        resp = client.put(f"/api/requisitions/{rid}", json={"title": "New Title"})
        assert resp.status_code == 200
        assert resp.json()["title"] == "New Title"

    def test_update_approve(self, client, seed_department):
        dept_id = seed_department(name="Req Approve Dept")
        r = client.post("/api/requisitions", json={
            "title": "Approve Me", "department_id": dept_id, "justification": "Needed",
        })
        rid = r.json()["id"]
        resp = client.put(f"/api/requisitions/{rid}", json={"status": "approved"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "approved"
        assert resp.json()["approved_by"] is not None
        assert resp.json()["approved_at"] is not None

    def test_update_no_fields(self, client, seed_department):
        dept_id = seed_department(name="Req NoField Dept")
        r = client.post("/api/requisitions", json={
            "title": "T", "department_id": dept_id, "justification": "J",
        })
        rid = r.json()["id"]
        resp = client.put(f"/api/requisitions/{rid}", json={})
        assert resp.status_code == 400

    def test_update_nonexistent(self, client):
        resp = client.put("/api/requisitions/nonexistent", json={"title": "X"})
        assert resp.status_code == 404


class TestDeleteRequisition:
    def test_delete_success(self, client, seed_department):
        dept_id = seed_department(name="Req Delete Dept")
        r = client.post("/api/requisitions", json={
            "title": "Delete Me", "department_id": dept_id, "justification": "Test",
        })
        rid = r.json()["id"]
        resp = client.delete(f"/api/requisitions/{rid}")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
