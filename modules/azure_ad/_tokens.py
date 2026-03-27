"""Azure AD OAuth token persistence and refresh."""

import json
import os
import requests
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parent.parent.parent
TOKENS_FILE = WORKSPACE / ".azure_ad_tokens.json"

AZURE_TOKEN_URL = "https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
AZURE_AUTHORIZE_URL = "https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/authorize"

GRAPH_SCOPES = "https://graph.microsoft.com/.default"


def _get_env(key: str) -> str:
    return os.environ.get(key, "")


def azure_credentials() -> dict[str, str]:
    return {
        "client_id": _get_env("AZURE_CLIENT_ID"),
        "client_secret": _get_env("AZURE_CLIENT_SECRET"),
        "tenant_id": _get_env("AZURE_TENANT_ID"),
    }


def has_credentials() -> bool:
    creds = azure_credentials()
    return bool(creds["client_id"] and creds["client_secret"] and creds["tenant_id"])


def load_tokens() -> dict | None:
    try:
        with open(TOKENS_FILE) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def save_tokens(tokens: dict):
    tmp = str(TOKENS_FILE) + ".tmp"
    with open(tmp, "w") as f:
        json.dump(tokens, f, indent=2)
    os.replace(tmp, str(TOKENS_FILE))


def clear_tokens():
    try:
        TOKENS_FILE.unlink()
    except FileNotFoundError:
        pass


def get_authorize_url(redirect_uri: str) -> str:
    """Build the Microsoft OAuth authorization URL."""
    creds = azure_credentials()
    return (
        AZURE_AUTHORIZE_URL.format(tenant_id=creds["tenant_id"])
        + f"?client_id={creds['client_id']}"
        + f"&response_type=code"
        + f"&redirect_uri={redirect_uri}"
        + f"&response_mode=query"
        + f"&scope={GRAPH_SCOPES} offline_access openid profile email"
    )


def exchange_code(code: str, redirect_uri: str) -> dict:
    """Exchange authorization code for tokens."""
    creds = azure_credentials()
    resp = requests.post(
        AZURE_TOKEN_URL.format(tenant_id=creds["tenant_id"]),
        data={
            "client_id": creds["client_id"],
            "client_secret": creds["client_secret"],
            "code": code,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
            "scope": f"{GRAPH_SCOPES} offline_access openid profile email",
        },
        timeout=15,
    )
    if resp.status_code != 200:
        raise Exception(f"Token exchange failed ({resp.status_code}): {resp.text}")
    tokens = resp.json()
    save_tokens(tokens)
    return tokens


def get_valid_access_token() -> str | None:
    """Return a valid access token, refreshing if needed."""
    tokens = load_tokens()
    if not tokens:
        return None

    # Try refresh if we have a refresh_token
    refresh_token = tokens.get("refresh_token")
    if not refresh_token:
        # Use existing access_token (may be expired)
        return tokens.get("access_token")

    creds = azure_credentials()
    resp = requests.post(
        AZURE_TOKEN_URL.format(tenant_id=creds["tenant_id"]),
        data={
            "client_id": creds["client_id"],
            "client_secret": creds["client_secret"],
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
            "scope": f"{GRAPH_SCOPES} offline_access",
        },
        timeout=15,
    )
    if resp.status_code == 200:
        new_tokens = resp.json()
        # Preserve refresh_token if not returned
        if "refresh_token" not in new_tokens:
            new_tokens["refresh_token"] = refresh_token
        save_tokens(new_tokens)
        return new_tokens["access_token"]

    # Refresh failed, return existing (may prompt re-auth)
    return tokens.get("access_token")
