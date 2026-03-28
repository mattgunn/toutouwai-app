"""Tests for the settings router: app settings and user management."""


# ── Settings ───────────────────────────────────────────────────────


def test_get_settings_empty(client):
    resp = client.get("/api/settings")
    assert resp.status_code == 200
    assert isinstance(resp.json(), dict)


def test_put_settings(client):
    resp = client.put("/api/settings", json={
        "company_name": "Acme Corp",
        "timezone": "Pacific/Auckland",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["company_name"] == "Acme Corp"
    assert data["timezone"] == "Pacific/Auckland"


def test_put_settings_json_value(client):
    resp = client.put("/api/settings", json={
        "modules": ["dashboard", "employees", "leave"],
    })
    assert resp.status_code == 200
    assert resp.json()["modules"] == ["dashboard", "employees", "leave"]


def test_get_settings_persists(client):
    client.put("/api/settings", json={"company_name": "Test Co"})
    resp = client.get("/api/settings")
    assert resp.status_code == 200
    assert resp.json()["company_name"] == "Test Co"


def test_put_settings_overwrites(client):
    client.put("/api/settings", json={"company_name": "Old"})
    client.put("/api/settings", json={"company_name": "New"})
    resp = client.get("/api/settings")
    assert resp.json()["company_name"] == "New"


# ── Users ──────────────────────────────────────────────────────────


def test_list_users(client):
    resp = client.get("/api/settings/users")
    assert resp.status_code == 200
    data = resp.json()
    # At least the admin_user from conftest
    assert len(data) >= 1
    assert any(u["email"] == "admin@test.com" for u in data)


def test_create_user(client):
    resp = client.post("/api/settings/users", json={
        "name": "New User",
        "email": "newuser@test.com",
        "role": "member",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "New User"
    assert data["email"] == "newuser@test.com"
    assert data["role"] == "member"


def test_create_user_with_permissions(client):
    resp = client.post("/api/settings/users", json={
        "name": "Restricted",
        "email": "restricted@test.com",
        "permissions": ["dashboard", "employees"],
    })
    assert resp.status_code == 200
    import json
    perms = json.loads(resp.json()["permissions"])
    assert "dashboard" in perms
    assert "employees" in perms


def test_create_user_defaults(client):
    resp = client.post("/api/settings/users", json={"email": "defaults@test.com"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["role"] == "member"
    assert data["name"] == ""


def test_update_user(client):
    user = client.post("/api/settings/users", json={
        "name": "Old Name",
        "email": "update@test.com",
    }).json()
    resp = client.put(f"/api/settings/users/{user['id']}", json={
        "name": "New Name",
        "role": "admin",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "New Name"
    assert data["role"] == "admin"


def test_update_user_permissions(client):
    user = client.post("/api/settings/users", json={
        "name": "Perms",
        "email": "perms@test.com",
    }).json()
    resp = client.put(f"/api/settings/users/{user['id']}", json={
        "permissions": ["dashboard", "reports"],
    })
    assert resp.status_code == 200
    import json
    perms = json.loads(resp.json()["permissions"])
    assert perms == ["dashboard", "reports"]


def test_update_user_is_active(client):
    user = client.post("/api/settings/users", json={
        "name": "Deactivate",
        "email": "deactivate@test.com",
    }).json()
    resp = client.put(f"/api/settings/users/{user['id']}", json={"is_active": 0})
    assert resp.status_code == 200
    assert resp.json()["is_active"] == 0
