"""Tests for the announcements endpoints."""


class TestCreateAnnouncement:
    def test_create_success(self, client):
        resp = client.post("/api/announcements", json={
            "title": "Company Picnic",
            "content": "Annual company picnic this Friday at noon.",
            "category": "event",
            "priority": "important",
            "status": "published",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Company Picnic"
        assert data["content"] == "Annual company picnic this Friday at noon."
        assert data["is_active"] == 1
        assert "author_name" in data

    def test_create_with_defaults(self, client):
        resp = client.post("/api/announcements", json={
            "title": "Minimal", "content": "Body text",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["priority"] == "normal"
        assert data["status"] == "draft"

    def test_create_missing_title(self, client):
        resp = client.post("/api/announcements", json={"content": "Body"})
        assert resp.status_code == 400

    def test_create_missing_content(self, client):
        resp = client.post("/api/announcements", json={"title": "Title"})
        assert resp.status_code == 400


class TestListAnnouncements:
    def test_list_empty(self, client):
        resp = client.get("/api/announcements")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_after_create(self, client):
        client.post("/api/announcements", json={"title": "News", "content": "Body"})
        resp = client.get("/api/announcements")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1


class TestActiveAnnouncements:
    def test_active_empty(self, client):
        resp = client.get("/api/announcements/active")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_active_returns_published(self, client):
        client.post("/api/announcements", json={
            "title": "Active One", "content": "Body",
            "status": "published", "is_active": 1,
        })
        client.post("/api/announcements", json={
            "title": "Draft One", "content": "Body",
            "status": "draft", "is_active": 1,
        })
        resp = client.get("/api/announcements/active")
        assert resp.status_code == 200
        for a in resp.json():
            assert a["status"] == "published"
            assert a["is_active"] == 1


class TestUpdateAnnouncement:
    def test_update_success(self, client):
        r = client.post("/api/announcements", json={"title": "Old", "content": "Old body"})
        aid = r.json()["id"]
        resp = client.put(f"/api/announcements/{aid}", json={"title": "Updated"})
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated"

    def test_update_no_fields(self, client):
        r = client.post("/api/announcements", json={"title": "T", "content": "C"})
        aid = r.json()["id"]
        resp = client.put(f"/api/announcements/{aid}", json={})
        assert resp.status_code == 400

    def test_update_nonexistent(self, client):
        resp = client.put("/api/announcements/nonexistent", json={"title": "X"})
        assert resp.status_code == 404


class TestDeleteAnnouncement:
    def test_delete_success(self, client):
        r = client.post("/api/announcements", json={"title": "Del", "content": "Del"})
        aid = r.json()["id"]
        resp = client.delete(f"/api/announcements/{aid}")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
