"""Tests for the custom fields definitions and values endpoints."""


class TestCreateFieldDefinition:
    def test_create_success(self, client):
        resp = client.post("/api/custom-fields/definitions", json={
            "entity_type": "employee",
            "field_name": "t_shirt_size",
            "field_type": "select",
            "field_options": "S,M,L,XL",
            "is_required": 0,
            "sort_order": 1,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["entity_type"] == "employee"
        assert data["field_name"] == "t_shirt_size"
        assert data["field_type"] == "select"
        assert data["is_active"] == 1

    def test_create_missing_entity_type(self, client):
        resp = client.post("/api/custom-fields/definitions", json={
            "field_name": "test", "field_type": "text",
        })
        assert resp.status_code == 400

    def test_create_missing_field_name(self, client):
        resp = client.post("/api/custom-fields/definitions", json={
            "entity_type": "employee", "field_type": "text",
        })
        assert resp.status_code == 400

    def test_create_missing_field_type(self, client):
        resp = client.post("/api/custom-fields/definitions", json={
            "entity_type": "employee", "field_name": "test",
        })
        assert resp.status_code == 400

    def test_create_invalid_field_type(self, client):
        resp = client.post("/api/custom-fields/definitions", json={
            "entity_type": "employee",
            "field_name": "test",
            "field_type": "invalid_type",
        })
        assert resp.status_code == 400


class TestListFieldDefinitions:
    def test_list_empty(self, client):
        resp = client.get("/api/custom-fields/definitions")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_after_create(self, client):
        client.post("/api/custom-fields/definitions", json={
            "entity_type": "employee", "field_name": "badge_id", "field_type": "text",
        })
        resp = client.get("/api/custom-fields/definitions")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_filter_by_entity_type(self, client):
        client.post("/api/custom-fields/definitions", json={
            "entity_type": "employee", "field_name": "field_a", "field_type": "text",
        })
        client.post("/api/custom-fields/definitions", json={
            "entity_type": "department", "field_name": "field_b", "field_type": "number",
        })
        resp = client.get("/api/custom-fields/definitions?entity_type=employee")
        assert resp.status_code == 200
        for d in resp.json():
            assert d["entity_type"] == "employee"


class TestUpdateFieldDefinition:
    def test_update_success(self, client):
        r = client.post("/api/custom-fields/definitions", json={
            "entity_type": "employee", "field_name": "old_field", "field_type": "text",
        })
        did = r.json()["id"]
        resp = client.put(f"/api/custom-fields/definitions/{did}", json={
            "field_name": "new_field",
        })
        assert resp.status_code == 200
        assert resp.json()["field_name"] == "new_field"

    def test_update_no_fields(self, client):
        r = client.post("/api/custom-fields/definitions", json={
            "entity_type": "employee", "field_name": "x", "field_type": "text",
        })
        did = r.json()["id"]
        resp = client.put(f"/api/custom-fields/definitions/{did}", json={})
        assert resp.status_code == 400

    def test_update_nonexistent(self, client):
        resp = client.put("/api/custom-fields/definitions/nonexistent", json={
            "field_name": "X",
        })
        assert resp.status_code == 404


class TestDeleteFieldDefinition:
    def test_delete_success(self, client):
        r = client.post("/api/custom-fields/definitions", json={
            "entity_type": "employee", "field_name": "del_me", "field_type": "text",
        })
        did = r.json()["id"]
        resp = client.delete(f"/api/custom-fields/definitions/{did}")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True


class TestCreateFieldValue:
    def test_create_success(self, client):
        defn = client.post("/api/custom-fields/definitions", json={
            "entity_type": "employee", "field_name": "shoe_size", "field_type": "number",
        }).json()
        resp = client.post("/api/custom-fields/values", json={
            "definition_id": defn["id"],
            "entity_id": "some-employee-id",
            "value": "42",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["definition_id"] == defn["id"]
        assert data["entity_id"] == "some-employee-id"
        assert data["value"] == "42"
        assert "field_name" in data
        assert "field_type" in data

    def test_create_missing_definition_id(self, client):
        resp = client.post("/api/custom-fields/values", json={
            "entity_id": "some-id",
        })
        assert resp.status_code == 400

    def test_create_missing_entity_id(self, client):
        defn = client.post("/api/custom-fields/definitions", json={
            "entity_type": "employee", "field_name": "fav_color", "field_type": "text",
        }).json()
        resp = client.post("/api/custom-fields/values", json={
            "definition_id": defn["id"],
        })
        assert resp.status_code == 400

    def test_create_invalid_definition_id(self, client):
        resp = client.post("/api/custom-fields/values", json={
            "definition_id": "nonexistent",
            "entity_id": "some-id",
        })
        assert resp.status_code == 400


class TestListFieldValues:
    def test_list_empty(self, client):
        resp = client.get("/api/custom-fields/values")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_after_create(self, client):
        defn = client.post("/api/custom-fields/definitions", json={
            "entity_type": "employee", "field_name": "desk_number", "field_type": "text",
        }).json()
        client.post("/api/custom-fields/values", json={
            "definition_id": defn["id"], "entity_id": "emp-1", "value": "D42",
        })
        resp = client.get("/api/custom-fields/values")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_filter_by_entity_id(self, client):
        defn = client.post("/api/custom-fields/definitions", json={
            "entity_type": "employee", "field_name": "floor", "field_type": "number",
        }).json()
        client.post("/api/custom-fields/values", json={
            "definition_id": defn["id"], "entity_id": "emp-filter-1", "value": "3",
        })
        client.post("/api/custom-fields/values", json={
            "definition_id": defn["id"], "entity_id": "emp-filter-2", "value": "5",
        })
        resp = client.get("/api/custom-fields/values?entity_id=emp-filter-1")
        assert resp.status_code == 200
        for v in resp.json():
            assert v["entity_id"] == "emp-filter-1"


class TestUpdateFieldValue:
    def test_update_success(self, client):
        defn = client.post("/api/custom-fields/definitions", json={
            "entity_type": "employee", "field_name": "update_me", "field_type": "text",
        }).json()
        r = client.post("/api/custom-fields/values", json={
            "definition_id": defn["id"], "entity_id": "emp-u", "value": "old",
        })
        vid = r.json()["id"]
        resp = client.put(f"/api/custom-fields/values/{vid}", json={"value": "new"})
        assert resp.status_code == 200
        assert resp.json()["value"] == "new"

    def test_update_no_value_field(self, client):
        defn = client.post("/api/custom-fields/definitions", json={
            "entity_type": "employee", "field_name": "no_update", "field_type": "text",
        }).json()
        r = client.post("/api/custom-fields/values", json={
            "definition_id": defn["id"], "entity_id": "emp-nu", "value": "X",
        })
        vid = r.json()["id"]
        resp = client.put(f"/api/custom-fields/values/{vid}", json={})
        assert resp.status_code == 400

    def test_update_nonexistent(self, client):
        resp = client.put("/api/custom-fields/values/nonexistent", json={"value": "X"})
        assert resp.status_code == 404


class TestDeleteFieldValue:
    def test_delete_success(self, client):
        defn = client.post("/api/custom-fields/definitions", json={
            "entity_type": "employee", "field_name": "del_val", "field_type": "text",
        }).json()
        r = client.post("/api/custom-fields/values", json={
            "definition_id": defn["id"], "entity_id": "emp-d", "value": "bye",
        })
        vid = r.json()["id"]
        resp = client.delete(f"/api/custom-fields/values/{vid}")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
