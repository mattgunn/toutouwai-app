"""Tests for the skills catalog and employee skills endpoints."""


class TestCreateSkillCatalog:
    def test_create_success(self, client):
        resp = client.post("/api/skills/catalog", json={
            "name": "Python",
            "category": "Programming",
            "description": "Python programming language",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Python"
        assert data["category"] == "Programming"
        assert data["employee_count"] == 0

    def test_create_minimal(self, client):
        resp = client.post("/api/skills/catalog", json={"name": "Go"})
        assert resp.status_code == 200
        assert resp.json()["name"] == "Go"

    def test_create_missing_name(self, client):
        resp = client.post("/api/skills/catalog", json={"category": "Languages"})
        assert resp.status_code == 400


class TestListSkillCatalog:
    def test_list_empty(self, client):
        resp = client.get("/api/skills/catalog")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_after_create(self, client):
        client.post("/api/skills/catalog", json={"name": "Rust"})
        resp = client.get("/api/skills/catalog")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1


class TestUpdateSkillCatalog:
    def test_update_success(self, client):
        r = client.post("/api/skills/catalog", json={"name": "Old Skill"})
        sid = r.json()["id"]
        resp = client.put(f"/api/skills/catalog/{sid}", json={"name": "New Skill"})
        assert resp.status_code == 200
        assert resp.json()["name"] == "New Skill"

    def test_update_no_fields(self, client):
        r = client.post("/api/skills/catalog", json={"name": "Test"})
        sid = r.json()["id"]
        resp = client.put(f"/api/skills/catalog/{sid}", json={})
        assert resp.status_code == 400

    def test_update_nonexistent(self, client):
        resp = client.put("/api/skills/catalog/nonexistent", json={"name": "X"})
        assert resp.status_code == 404


class TestDeleteSkillCatalog:
    def test_delete_success(self, client):
        r = client.post("/api/skills/catalog", json={"name": "To Delete"})
        sid = r.json()["id"]
        resp = client.delete(f"/api/skills/catalog/{sid}")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True


class TestCreateEmployeeSkill:
    def test_create_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="SK", last_name="Worker", email="sk@test.com")
        skill = client.post("/api/skills/catalog", json={"name": "TypeScript"}).json()
        resp = client.post("/api/skills/employee", json={
            "employee_id": emp_id,
            "skill_id": skill["id"],
            "proficiency_level": "intermediate",
            "years_experience": 3,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["employee_id"] == emp_id
        assert data["skill_id"] == skill["id"]
        assert data["proficiency_level"] == "intermediate"
        assert "employee_name" in data
        assert "skill_name" in data

    def test_create_missing_employee_id(self, client):
        skill = client.post("/api/skills/catalog", json={"name": "CSS"}).json()
        resp = client.post("/api/skills/employee", json={"skill_id": skill["id"]})
        assert resp.status_code == 400

    def test_create_missing_skill_id(self, client, seed_employee):
        emp_id = seed_employee(first_name="SK2", last_name="Worker", email="sk2@test.com")
        resp = client.post("/api/skills/employee", json={"employee_id": emp_id})
        assert resp.status_code == 400

    def test_create_invalid_employee_id(self, client):
        skill = client.post("/api/skills/catalog", json={"name": "HTML"}).json()
        resp = client.post("/api/skills/employee", json={
            "employee_id": "nonexistent", "skill_id": skill["id"],
        })
        assert resp.status_code == 400

    def test_create_invalid_skill_id(self, client, seed_employee):
        emp_id = seed_employee(first_name="SK3", last_name="Worker", email="sk3@test.com")
        resp = client.post("/api/skills/employee", json={
            "employee_id": emp_id, "skill_id": "nonexistent",
        })
        assert resp.status_code == 400


class TestListEmployeeSkills:
    def test_list_empty(self, client):
        resp = client.get("/api/skills/employee")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_filter_by_employee(self, client, seed_employee):
        emp_id = seed_employee(first_name="SKL", last_name="Worker", email="skl@test.com")
        skill = client.post("/api/skills/catalog", json={"name": "Java"}).json()
        client.post("/api/skills/employee", json={
            "employee_id": emp_id, "skill_id": skill["id"],
        })
        resp = client.get(f"/api/skills/employee?employee_id={emp_id}")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1
        for es in resp.json():
            assert es["employee_id"] == emp_id


class TestUpdateEmployeeSkill:
    def test_update_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="SKU", last_name="Worker", email="sku@test.com")
        skill = client.post("/api/skills/catalog", json={"name": "SQL"}).json()
        r = client.post("/api/skills/employee", json={
            "employee_id": emp_id, "skill_id": skill["id"], "proficiency_level": "beginner",
        })
        esid = r.json()["id"]
        resp = client.put(f"/api/skills/employee/{esid}", json={"proficiency_level": "expert"})
        assert resp.status_code == 200
        assert resp.json()["proficiency_level"] == "expert"

    def test_update_no_fields(self, client, seed_employee):
        emp_id = seed_employee(first_name="SKU2", last_name="Worker", email="sku2@test.com")
        skill = client.post("/api/skills/catalog", json={"name": "Perl"}).json()
        r = client.post("/api/skills/employee", json={
            "employee_id": emp_id, "skill_id": skill["id"],
        })
        esid = r.json()["id"]
        resp = client.put(f"/api/skills/employee/{esid}", json={})
        assert resp.status_code == 400

    def test_update_nonexistent(self, client):
        resp = client.put("/api/skills/employee/nonexistent", json={"proficiency_level": "expert"})
        assert resp.status_code == 404


class TestDeleteEmployeeSkill:
    def test_delete_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="SKD", last_name="Worker", email="skd@test.com")
        skill = client.post("/api/skills/catalog", json={"name": "Kotlin"}).json()
        r = client.post("/api/skills/employee", json={
            "employee_id": emp_id, "skill_id": skill["id"],
        })
        esid = r.json()["id"]
        resp = client.delete(f"/api/skills/employee/{esid}")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
