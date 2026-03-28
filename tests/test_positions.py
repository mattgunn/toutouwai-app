class TestListPositions:
    """Tests for GET /api/positions."""

    def test_list_empty(self, client):
        resp = client.get("/api/positions")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_with_positions(self, client, seed_department):
        dept_id = seed_department()
        client.post("/api/positions", json={"title": "Engineer", "department_id": dept_id})
        client.post("/api/positions", json={"title": "Designer", "department_id": dept_id})
        resp = client.get("/api/positions")
        data = resp.json()
        assert len(data) == 2
        titles = [p["title"] for p in data]
        assert "Engineer" in titles
        assert "Designer" in titles

    def test_list_includes_department_name(self, client, seed_department):
        dept_id = seed_department(name="Engineering")
        client.post("/api/positions", json={"title": "Lead", "department_id": dept_id})
        resp = client.get("/api/positions")
        data = resp.json()
        assert data[0]["department_name"] == "Engineering"

    def test_list_includes_employee_count(self, client, seed_department, seed_position, seed_employee):
        dept_id = seed_department()
        pos_id = seed_position(title="Dev", dept_id=dept_id)
        seed_employee(first_name="Alice", last_name="A", dept_id=dept_id, pos_id=pos_id)
        seed_employee(first_name="Bob", last_name="B", email="bob.b@test.com", dept_id=dept_id, pos_id=pos_id)
        resp = client.get("/api/positions")
        # Find the "Dev" position in the results
        devs = [p for p in resp.json() if p["title"] == "Dev"]
        assert len(devs) == 1
        assert devs[0]["employee_count"] == 2

    def test_list_sorted_by_title(self, client, seed_department):
        dept_id = seed_department()
        client.post("/api/positions", json={"title": "Zebra Role", "department_id": dept_id})
        client.post("/api/positions", json={"title": "Alpha Role", "department_id": dept_id})
        resp = client.get("/api/positions")
        data = resp.json()
        assert data[0]["title"] == "Alpha Role"
        assert data[1]["title"] == "Zebra Role"


class TestCreatePosition:
    """Tests for POST /api/positions."""

    def test_create_position(self, client, seed_department):
        dept_id = seed_department()
        resp = client.post("/api/positions", json={
            "title": "Software Engineer",
            "department_id": dept_id,
            "level": "Senior",
            "description": "Writes code"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Software Engineer"
        assert data["level"] == "Senior"
        assert data["description"] == "Writes code"
        assert data["department_id"] == dept_id
        assert data["id"] is not None

    def test_create_position_minimal(self, client):
        resp = client.post("/api/positions", json={"title": "Intern"})
        assert resp.status_code == 200
        assert resp.json()["title"] == "Intern"

    def test_create_position_appears_in_list(self, client, seed_department):
        dept_id = seed_department()
        client.post("/api/positions", json={"title": "NewRole", "department_id": dept_id})
        resp = client.get("/api/positions")
        titles = [p["title"] for p in resp.json()]
        assert "NewRole" in titles


class TestUpdatePosition:
    """Tests for PUT /api/positions/{id}."""

    def test_update_position_title(self, client, seed_position):
        pos_id = seed_position(title="OldTitle")
        resp = client.put(f"/api/positions/{pos_id}", json={"title": "NewTitle"})
        assert resp.status_code == 200
        assert resp.json()["title"] == "NewTitle"

    def test_update_position_level(self, client, seed_position):
        pos_id = seed_position()
        resp = client.put(f"/api/positions/{pos_id}", json={"level": "Principal"})
        assert resp.status_code == 200
        assert resp.json()["level"] == "Principal"

    def test_update_position_description(self, client, seed_position):
        pos_id = seed_position()
        resp = client.put(f"/api/positions/{pos_id}", json={"description": "New desc"})
        assert resp.status_code == 200
        assert resp.json()["description"] == "New desc"

    def test_update_nonexistent_position(self, client):
        resp = client.put("/api/positions/nonexistent-id", json={"title": "X"})
        assert resp.status_code == 404

    def test_update_preserves_other_fields(self, client, seed_department):
        dept_id = seed_department()
        create_resp = client.post("/api/positions", json={
            "title": "KeepMe",
            "department_id": dept_id,
            "level": "Mid"
        })
        pos_id = create_resp.json()["id"]
        client.put(f"/api/positions/{pos_id}", json={"description": "Added"})
        resp = client.get("/api/positions")
        pos = [p for p in resp.json() if p["id"] == pos_id][0]
        assert pos["title"] == "KeepMe"
        assert pos["level"] == "Mid"
        assert pos["description"] == "Added"


class TestDeletePosition:
    """Tests for DELETE /api/positions/{id}."""

    def test_delete_position(self, client, seed_position):
        pos_id = seed_position(title="ToDelete")
        resp = client.delete(f"/api/positions/{pos_id}")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
        # Verify it's gone
        list_resp = client.get("/api/positions")
        ids = [p["id"] for p in list_resp.json()]
        assert pos_id not in ids

    def test_delete_nonexistent_position(self, client):
        resp = client.delete("/api/positions/nonexistent-id")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
