"""Tests for the notifications endpoints."""


class TestCreateNotification:
    def test_create_success(self, client, admin_user):
        resp = client.post("/api/notifications", json={
            "user_id": admin_user["id"],
            "title": "Leave Approved",
            "message": "Your leave request has been approved.",
            "type": "info",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Leave Approved"
        assert data["message"] == "Your leave request has been approved."
        assert data["type"] == "info"
        assert data["is_read"] == 0

    def test_create_with_defaults(self, client, admin_user):
        resp = client.post("/api/notifications", json={
            "user_id": admin_user["id"],
            "title": "Info", "message": "Something happened",
        })
        assert resp.status_code == 200
        assert resp.json()["type"] == "info"

    def test_create_missing_user_id(self, client):
        resp = client.post("/api/notifications", json={
            "title": "Test", "message": "Test",
        })
        assert resp.status_code == 400

    def test_create_missing_title(self, client, admin_user):
        resp = client.post("/api/notifications", json={
            "user_id": admin_user["id"], "message": "Test",
        })
        assert resp.status_code == 400

    def test_create_missing_message(self, client, admin_user):
        resp = client.post("/api/notifications", json={
            "user_id": admin_user["id"], "title": "Test",
        })
        assert resp.status_code == 400

    def test_create_invalid_user_id(self, client):
        resp = client.post("/api/notifications", json={
            "user_id": "nonexistent", "title": "Test", "message": "Test",
        })
        assert resp.status_code == 400


class TestListNotifications:
    def test_list_empty(self, client):
        resp = client.get("/api/notifications")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_after_create(self, client, admin_user):
        client.post("/api/notifications", json={
            "user_id": admin_user["id"], "title": "N1", "message": "M1",
        })
        resp = client.get("/api/notifications")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_filter_by_user_id(self, client, admin_user):
        client.post("/api/notifications", json={
            "user_id": admin_user["id"], "title": "For Admin", "message": "M",
        })
        resp = client.get(f"/api/notifications?user_id={admin_user['id']}")
        assert resp.status_code == 200
        for n in resp.json():
            assert n["user_id"] == admin_user["id"]


class TestUnreadCount:
    def test_unread_count_zero(self, client):
        resp = client.get("/api/notifications/unread-count")
        assert resp.status_code == 200
        assert resp.json()["count"] == 0

    def test_unread_count_after_create(self, client, admin_user):
        client.post("/api/notifications", json={
            "user_id": admin_user["id"], "title": "Unread", "message": "M",
        })
        resp = client.get("/api/notifications/unread-count")
        assert resp.status_code == 200
        assert resp.json()["count"] >= 1


class TestMarkAsRead:
    def test_mark_as_read(self, client, admin_user):
        r = client.post("/api/notifications", json={
            "user_id": admin_user["id"], "title": "Read Me", "message": "M",
        })
        nid = r.json()["id"]
        assert r.json()["is_read"] == 0

        resp = client.put(f"/api/notifications/{nid}/read")
        assert resp.status_code == 200
        assert resp.json()["is_read"] == 1
        assert resp.json()["read_at"] is not None

    def test_mark_as_read_nonexistent(self, client):
        resp = client.put("/api/notifications/nonexistent/read")
        assert resp.status_code == 404


class TestMarkAllAsRead:
    def test_mark_all_as_read(self, client, admin_user):
        client.post("/api/notifications", json={
            "user_id": admin_user["id"], "title": "N1", "message": "M",
        })
        client.post("/api/notifications", json={
            "user_id": admin_user["id"], "title": "N2", "message": "M",
        })
        resp = client.put("/api/notifications/read-all", json={})
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
        # Verify unread count is now 0
        count_resp = client.get("/api/notifications/unread-count")
        assert count_resp.json()["count"] == 0


class TestDeleteNotification:
    def test_delete_success(self, client, admin_user):
        r = client.post("/api/notifications", json={
            "user_id": admin_user["id"], "title": "Del", "message": "Del",
        })
        nid = r.json()["id"]
        resp = client.delete(f"/api/notifications/{nid}")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
