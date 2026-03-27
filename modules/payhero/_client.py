"""PayHero API client — login, fetch/push employees, fetch time entries."""

import requests
from typing import Any

BASE_URL = "https://payhero-public.azure-api.net"


class PayHeroError(Exception):
    """Raised when a PayHero API call fails."""
    pass


def payhero_login(api_key: str, subscription_key: str) -> str:
    """POST /login with the company api_key -> returns company_auth string."""
    resp = requests.post(
        f"{BASE_URL}/login",
        json={"api_key": api_key},
        headers={"Api-Subscription-Key": subscription_key},
        timeout=15,
    )
    if resp.status_code != 200:
        raise PayHeroError(f"PayHero login failed ({resp.status_code}): {resp.text}")
    data = resp.json()
    auth = data.get("company_auth")
    if not auth:
        raise PayHeroError("PayHero login response missing company_auth")
    return auth


def _headers(company_auth: str, subscription_key: str) -> dict[str, str]:
    return {
        "Authorization": company_auth,
        "Api-Subscription-Key": subscription_key,
    }


def payhero_fetch_employees(
    company_auth: str,
    subscription_key: str,
) -> list[dict[str, Any]]:
    """GET /employee/all -> list of employees."""
    resp = requests.get(
        f"{BASE_URL}/employee/all",
        headers=_headers(company_auth, subscription_key),
        timeout=15,
    )
    if resp.status_code != 200:
        raise PayHeroError(f"Failed to fetch employees ({resp.status_code}): {resp.text}")
    data = resp.json()
    return data if isinstance(data, list) else []


def payhero_fetch_time(
    company_auth: str,
    subscription_key: str,
    start_date: str,
    end_date: str,
) -> list[dict[str, Any]]:
    """GET /time?start_date=...&end_date=... -> list of time entries.

    Dates should be YYYY-MM-DD format.
    """
    resp = requests.get(
        f"{BASE_URL}/time",
        params={"start_date": start_date, "end_date": end_date},
        headers=_headers(company_auth, subscription_key),
        timeout=30,
    )
    if resp.status_code != 200:
        raise PayHeroError(f"Failed to fetch time ({resp.status_code}): {resp.text}")
    data = resp.json()
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and "items" in data:
        return data["items"]
    return data if isinstance(data, list) else []
