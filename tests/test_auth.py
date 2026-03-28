import jwt
from api.deps import JWT_SECRET, JWT_ALGORITHM
from datetime import datetime, timezone, timedelta


class TestAuthMe:
    """Tests for GET /api/auth/me."""

    def test_me_returns_user_profile(self, client, admin_user):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == admin_user["id"]
        assert data["name"] == "Test Admin"
        assert data["email"] == "admin@test.com"
        assert data["role"] == "admin"
        assert "permissions" in data

    def test_me_without_token_returns_401(self, raw_client):
        resp = raw_client.get("/api/auth/me")
        assert resp.status_code == 401

    def test_me_with_invalid_token_returns_401(self, raw_client):
        resp = raw_client.get("/api/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
        assert resp.status_code == 401

    def test_me_with_expired_token_returns_401(self, raw_client, admin_user):
        expired_token = jwt.encode(
            {"sub": admin_user["id"], "exp": datetime(2020, 1, 1, tzinfo=timezone.utc)},
            JWT_SECRET, algorithm=JWT_ALGORITHM
        )
        resp = raw_client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
        assert resp.status_code == 401

    def test_me_permissions_list(self, client):
        resp = client.get("/api/auth/me")
        data = resp.json()
        assert isinstance(data["permissions"], list)
        assert "dashboard" in data["permissions"]
        assert "employees" in data["permissions"]


class TestRequestLink:
    """Tests for POST /api/auth/request-link."""

    def test_request_link_existing_user(self, client, admin_user):
        resp = client.post("/api/auth/request-link", json={"email": "admin@test.com"})
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

    def test_request_link_new_user_auto_creates(self, client, db):
        resp = client.post("/api/auth/request-link", json={"email": "newuser@test.com"})
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
        # Verify user was created in the database
        row = db.execute("SELECT * FROM users WHERE email = ?", ("newuser@test.com",)).fetchone()
        assert row is not None

    def test_request_link_missing_email_returns_422(self, client):
        resp = client.post("/api/auth/request-link", json={})
        assert resp.status_code == 422


class TestVerify:
    """Tests for GET /api/auth/verify."""

    def test_verify_valid_token(self, client, admin_user):
        token = jwt.encode(
            {"sub": admin_user["id"], "type": "login", "exp": datetime.now(timezone.utc) + timedelta(minutes=15)},
            JWT_SECRET, algorithm=JWT_ALGORITHM
        )
        resp = client.get(f"/api/auth/verify?token={token}")
        assert resp.status_code == 200
        data = resp.json()
        assert "jwt" in data
        # Verify the returned JWT is valid
        decoded = jwt.decode(data["jwt"], JWT_SECRET, algorithms=[JWT_ALGORITHM])
        assert decoded["sub"] == admin_user["id"]

    def test_verify_invalid_token(self, client):
        resp = client.get("/api/auth/verify?token=invalid.token.here")
        assert resp.status_code == 400

    def test_verify_expired_token(self, client, admin_user):
        token = jwt.encode(
            {"sub": admin_user["id"], "type": "login", "exp": datetime(2020, 1, 1, tzinfo=timezone.utc)},
            JWT_SECRET, algorithm=JWT_ALGORITHM
        )
        resp = client.get(f"/api/auth/verify?token={token}")
        assert resp.status_code == 400
