"""Gmail OAuth flow and endpoints tests."""
import os
import urllib.parse as up
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://condo-manager-58.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "innsbruckone@gmail.com"
ADMIN_PASS = "1nn58ruck0ne"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# --- OAuth login redirect ---
def test_gmail_login_redirects_to_google_with_correct_params(token):
    r = requests.get(f"{BASE_URL}/api/oauth/gmail/login", params={"token": token}, allow_redirects=False, timeout=30)
    assert r.status_code in (302, 307), f"expected redirect, got {r.status_code}"
    loc = r.headers.get("location", "")
    assert loc.startswith("https://accounts.google.com/"), f"bad Location: {loc}"
    parsed = up.urlparse(loc)
    qs = up.parse_qs(parsed.query)
    assert qs.get("login_hint", [""])[0] == ADMIN_EMAIL
    assert "select_account" in qs.get("prompt", [""])[0]
    assert "gmail.readonly" in qs.get("scope", [""])[0]


def test_gmail_login_invalid_token_returns_401():
    r = requests.get(f"{BASE_URL}/api/oauth/gmail/login", params={"token": "garbage"}, allow_redirects=False, timeout=30)
    assert r.status_code == 401


# --- Callback error handling (no strand) ---
def test_callback_access_denied_redirects_to_gmail_error():
    r = requests.get(f"{BASE_URL}/api/oauth/gmail/callback", params={"error": "access_denied"}, allow_redirects=False, timeout=30)
    assert r.status_code in (302, 307)
    loc = r.headers.get("location", "")
    assert loc.endswith("/gmail?gmail=error"), f"unexpected loc: {loc}"


def test_callback_unknown_state_redirects_gracefully():
    r = requests.get(f"{BASE_URL}/api/oauth/gmail/callback",
                     params={"code": "bad", "state": "doesnotexist"},
                     allow_redirects=False, timeout=30)
    assert r.status_code in (302, 307)
    loc = r.headers.get("location", "")
    assert loc.endswith("/gmail?gmail=error"), f"unexpected loc: {loc}"


# --- Gmail status / sync / alerts (not connected state) ---
def test_gmail_status_not_connected(auth_headers):
    # Ensure not connected first
    requests.delete(f"{BASE_URL}/api/oauth/gmail", headers=auth_headers, timeout=30)
    r = requests.get(f"{BASE_URL}/api/gmail/status", headers=auth_headers, timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert data["connected"] is False
    assert data["email"] is None
    assert data["configured"] is True


def test_gmail_sync_not_connected_returns_400(auth_headers):
    r = requests.post(f"{BASE_URL}/api/gmail/sync", headers=auth_headers, timeout=30)
    assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text}"


def test_gmail_alerts_returns_list(auth_headers):
    r = requests.get(f"{BASE_URL}/api/gmail/alerts", headers=auth_headers, timeout=30)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# --- Regression: core endpoints still work ---
@pytest.mark.parametrize("path", [
    "/api/dashboard/summary",
    "/api/vendors",
    "/api/pnl/summary",
    "/api/bank/transactions",
])
def test_regression_endpoints_reachable(auth_headers, path):
    r = requests.get(f"{BASE_URL}{path}", headers=auth_headers, timeout=30)
    assert r.status_code in (200, 404), f"{path} -> {r.status_code}: {r.text[:200]}"
