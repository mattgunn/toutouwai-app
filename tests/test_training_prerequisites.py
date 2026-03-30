"""Tests for the training prerequisites endpoints."""


def _create_course(client, title):
    """Helper to create a course and return its id."""
    r = client.post("/api/learning/courses", json={"title": title})
    assert r.status_code == 200
    return r.json()["id"]


class TestCreatePrerequisite:
    def test_create_success(self, client):
        course_id = _create_course(client, "Advanced Python")
        prereq_id = _create_course(client, "Intro to Python")
        resp = client.post("/api/learning/prerequisites", json={
            "course_id": course_id,
            "prerequisite_course_id": prereq_id,
            "is_mandatory": 1,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["course_id"] == course_id
        assert data["prerequisite_course_id"] == prereq_id
        assert data["is_mandatory"] == 1
        assert "course_title" in data
        assert "prerequisite_title" in data

    def test_create_missing_course_id(self, client):
        prereq_id = _create_course(client, "Prereq Only")
        resp = client.post("/api/learning/prerequisites", json={
            "prerequisite_course_id": prereq_id,
        })
        assert resp.status_code == 400

    def test_create_missing_prerequisite_course_id(self, client):
        course_id = _create_course(client, "Course Only")
        resp = client.post("/api/learning/prerequisites", json={
            "course_id": course_id,
        })
        assert resp.status_code == 400

    def test_create_invalid_course_id(self, client):
        prereq_id = _create_course(client, "Valid Prereq")
        resp = client.post("/api/learning/prerequisites", json={
            "course_id": "nonexistent",
            "prerequisite_course_id": prereq_id,
        })
        assert resp.status_code == 400

    def test_create_invalid_prerequisite_course_id(self, client):
        course_id = _create_course(client, "Valid Course")
        resp = client.post("/api/learning/prerequisites", json={
            "course_id": course_id,
            "prerequisite_course_id": "nonexistent",
        })
        assert resp.status_code == 400


class TestListPrerequisites:
    def test_list_empty(self, client):
        resp = client.get("/api/learning/prerequisites")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_after_create(self, client):
        c1 = _create_course(client, "Course A")
        c2 = _create_course(client, "Course B")
        client.post("/api/learning/prerequisites", json={
            "course_id": c1, "prerequisite_course_id": c2,
        })
        resp = client.get("/api/learning/prerequisites")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_filter_by_course_id(self, client):
        c1 = _create_course(client, "Filter Course 1")
        c2 = _create_course(client, "Filter Course 2")
        c3 = _create_course(client, "Filter Course 3")
        client.post("/api/learning/prerequisites", json={
            "course_id": c1, "prerequisite_course_id": c2,
        })
        client.post("/api/learning/prerequisites", json={
            "course_id": c3, "prerequisite_course_id": c2,
        })
        resp = client.get(f"/api/learning/prerequisites?course_id={c1}")
        assert resp.status_code == 200
        for p in resp.json():
            assert p["course_id"] == c1


class TestUpdatePrerequisite:
    def test_update_success(self, client):
        c1 = _create_course(client, "Update Course 1")
        c2 = _create_course(client, "Update Course 2")
        r = client.post("/api/learning/prerequisites", json={
            "course_id": c1, "prerequisite_course_id": c2, "is_mandatory": 1,
        })
        pid = r.json()["id"]
        resp = client.put(f"/api/learning/prerequisites/{pid}", json={"is_mandatory": 0})
        assert resp.status_code == 200
        assert resp.json()["is_mandatory"] == 0

    def test_update_no_fields(self, client):
        c1 = _create_course(client, "NoField Course 1")
        c2 = _create_course(client, "NoField Course 2")
        r = client.post("/api/learning/prerequisites", json={
            "course_id": c1, "prerequisite_course_id": c2,
        })
        pid = r.json()["id"]
        resp = client.put(f"/api/learning/prerequisites/{pid}", json={})
        assert resp.status_code == 400

    def test_update_nonexistent(self, client):
        resp = client.put("/api/learning/prerequisites/nonexistent", json={"is_mandatory": 0})
        assert resp.status_code == 404


class TestDeletePrerequisite:
    def test_delete_success(self, client):
        c1 = _create_course(client, "Del Course 1")
        c2 = _create_course(client, "Del Course 2")
        r = client.post("/api/learning/prerequisites", json={
            "course_id": c1, "prerequisite_course_id": c2,
        })
        pid = r.json()["id"]
        resp = client.delete(f"/api/learning/prerequisites/{pid}")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
