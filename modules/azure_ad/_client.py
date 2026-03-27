"""Microsoft Graph API client for Azure AD user and group operations."""

import requests
from typing import Any

GRAPH_BASE = "https://graph.microsoft.com/v1.0"


class GraphAPIError(Exception):
    pass


def _request(method: str, path: str, token: str, json_body: dict | None = None) -> dict | list:
    url = f"{GRAPH_BASE}{path}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    resp = requests.request(method, url, headers=headers, json=json_body, timeout=30)
    if resp.status_code >= 400:
        raise GraphAPIError(f"Graph API {method} {path} failed ({resp.status_code}): {resp.text}")
    if resp.status_code == 204:
        return {}
    return resp.json()


def graph_get(path: str, token: str) -> Any:
    return _request("GET", path, token)


def graph_post(path: str, body: dict, token: str) -> Any:
    return _request("POST", path, token, body)


def graph_patch(path: str, body: dict, token: str) -> Any:
    return _request("PATCH", path, token, body)


# ── User operations ──────────────────────────────────────────────────

def fetch_ad_users(token: str) -> list[dict[str, Any]]:
    """Fetch all users from Azure AD. Handles pagination."""
    users = []
    url = "/users?$select=id,displayName,givenName,surname,mail,userPrincipalName,jobTitle,department,accountEnabled,manager&$top=100"
    while url:
        data = graph_get(url, token)
        users.extend(data.get("value", []))
        url = data.get("@odata.nextLink", "").replace(GRAPH_BASE, "") if "@odata.nextLink" in data else None
    return users


def fetch_ad_user(user_id: str, token: str) -> dict[str, Any]:
    return graph_get(f"/users/{user_id}?$select=id,displayName,givenName,surname,mail,userPrincipalName,jobTitle,department,accountEnabled", token)


def create_ad_user(body: dict, token: str) -> dict[str, Any]:
    """Create a new user in Azure AD.

    body should include: displayName, mailNickname, userPrincipalName,
    passwordProfile: { password, forceChangePasswordNextSignIn }
    """
    return graph_post("/users", body, token)


def update_ad_user(user_id: str, body: dict, token: str) -> dict:
    """Update user properties (givenName, surname, jobTitle, department, etc.)."""
    return graph_patch(f"/users/{user_id}", body, token)


def disable_ad_user(user_id: str, token: str) -> dict:
    """Disable an Azure AD user account."""
    return graph_patch(f"/users/{user_id}", {"accountEnabled": False}, token)


def enable_ad_user(user_id: str, token: str) -> dict:
    """Enable an Azure AD user account."""
    return graph_patch(f"/users/{user_id}", {"accountEnabled": True}, token)


# ── Manager operations ───────────────────────────────────────────────

def fetch_user_manager(user_id: str, token: str) -> dict | None:
    """Get a user's manager."""
    try:
        return graph_get(f"/users/{user_id}/manager", token)
    except GraphAPIError:
        return None


def set_user_manager(user_id: str, manager_ad_id: str, token: str):
    """Set a user's manager."""
    graph_patch(f"/users/{user_id}/manager/$ref", {
        "@odata.id": f"{GRAPH_BASE}/users/{manager_ad_id}"
    }, token)


# ── Group operations (for department mapping) ────────────────────────

def fetch_ad_groups(token: str) -> list[dict[str, Any]]:
    """Fetch all groups. Filters to security groups by default."""
    data = graph_get("/groups?$select=id,displayName,description,mailEnabled,securityEnabled&$top=100", token)
    return data.get("value", [])


def fetch_group_members(group_id: str, token: str) -> list[dict[str, Any]]:
    data = graph_get(f"/groups/{group_id}/members?$select=id,displayName,mail", token)
    return data.get("value", [])


def add_group_member(group_id: str, user_id: str, token: str):
    graph_post(f"/groups/{group_id}/members/$ref", {
        "@odata.id": f"{GRAPH_BASE}/directoryObjects/{user_id}"
    }, token)


def remove_group_member(group_id: str, user_id: str, token: str):
    """Remove a member from a group."""
    _request("DELETE", f"/groups/{group_id}/members/{user_id}/$ref", token)
