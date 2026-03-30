"""Tests for the locations endpoints."""


class TestCreateLocation:
    def test_create_success(self, client):
        resp = client.post("/api/locations", json={
            "name": "Auckland Office",
            "address": "123 Queen St",
            "city": "Auckland",
            "state": "Auckland",
            "country": "New Zealand",
            "postal_code": "1010",
            "timezone": "Pacific/Auckland",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Auckland Office"
        assert data["city"] == "Auckland"
        assert data["is_active"] == 1

    def test_create_minimal(self, client):
        resp = client.post("/api/locations", json={"name": "Remote"})
        assert resp.status_code == 200
        assert resp.json()["name"] == "Remote"

    def test_create_missing_name(self, client):
        resp = client.post("/api/locations", json={"city": "Wellington"})
        assert resp.status_code == 400


class TestListLocations:
    def test_list_empty(self, client):
        resp = client.get("/api/locations")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_after_create(self, client):
        client.post("/api/locations", json={"name": "HQ"})
        resp = client.get("/api/locations")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1


class TestUpdateLocation:
    def test_update_success(self, client):
        r = client.post("/api/locations", json={"name": "Old Name"})
        lid = r.json()["id"]
        resp = client.put(f"/api/locations/{lid}", json={"name": "New Name"})
        assert resp.status_code == 200
        assert resp.json()["name"] == "New Name"

    def test_update_no_fields(self, client):
        r = client.post("/api/locations", json={"name": "Test"})
        lid = r.json()["id"]
        resp = client.put(f"/api/locations/{lid}", json={})
        assert resp.status_code == 400

    def test_update_nonexistent(self, client):
        resp = client.put("/api/locations/nonexistent", json={"name": "X"})
        assert resp.status_code == 404


class TestDeleteLocation:
    def test_delete_success(self, client):
        r = client.post("/api/locations", json={"name": "To Delete"})
        lid = r.json()["id"]
        resp = client.delete(f"/api/locations/{lid}")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
        # Verify it's gone
        listing = client.get("/api/locations")
        assert all(loc["id"] != lid for loc in listing.json())
