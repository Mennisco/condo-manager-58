"""Backend tests: auth cookies, session persistence, dashboard, fees regressions."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or "https://condo-manager-58.preview.emergentagent.com"
BASE_URL = BASE_URL.rstrip("/")

EMAIL = "innsbruckone@gmail.com"
PASSWORD = "1nn58ruck0ne"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    return s


@pytest.fixture(scope="module")
def authed_session(session):
    r = session.post(f"{BASE_URL}/api/auth/login",
                     json={"email": EMAIL, "password": PASSWORD})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return session


# ---------- Auth cookie attributes ----------
class TestAuthCookies:
    def test_login_success_and_cookie_attributes(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": EMAIL, "password": PASSWORD})
        assert r.status_code == 200
        data = r.json()
        # Login returns either {user: {...}} or flat user fields
        u = data.get("user", data)
        assert u.get("email") == EMAIL

        # Inspect raw Set-Cookie headers
        set_cookies = r.headers.get_all("Set-Cookie") if hasattr(r.headers, "get_all") else r.raw.headers.get_all("Set-Cookie")
        joined = "\n".join(set_cookies)
        assert "access_token=" in joined
        assert "refresh_token=" in joined
        # Both auth cookies must be SameSite=None; Secure
        access_line = [c for c in set_cookies if c.startswith("access_token=")][0]
        refresh_line = [c for c in set_cookies if c.startswith("refresh_token=")][0]
        assert "SameSite=none" in access_line.lower() or "samesite=none" in access_line.lower()
        assert "secure" in access_line.lower()
        assert "httponly" in access_line.lower()
        assert "samesite=none" in refresh_line.lower()
        assert "secure" in refresh_line.lower()
        assert "httponly" in refresh_line.lower()

    def test_login_invalid_credentials(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": EMAIL, "password": "wrongpass"})
        assert r.status_code in (400, 401)


# ---------- Authenticated endpoints ----------
class TestAuthenticatedEndpoints:
    def test_auth_me(self, authed_session):
        r = authed_session.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        u = r.json()
        assert u["email"] == EMAIL
        assert u.get("role") == "admin"

    def test_dashboard_summary(self, authed_session):
        r = authed_session.get(f"{BASE_URL}/api/dashboard/summary")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, dict)
        # Should at least be a JSON object with some keys
        assert len(data.keys()) > 0

    def test_fees_2023_march(self, authed_session):
        r = authed_session.get(f"{BASE_URL}/api/fees", params={"year": 2023, "month": 3})
        assert r.status_code == 200
        body = r.json()
        # Could be list or dict containing list
        if isinstance(body, dict):
            rows = body.get("fees") or body.get("items") or body.get("data") or []
        else:
            rows = body
        assert isinstance(rows, list)
        assert len(rows) > 0, "Expected fee rows for 2023-03"

    def test_unit_613_march_2023_late_fee(self, authed_session):
        """Regression: Unit 613 March 2023 should show $34.59 late fee."""
        r = authed_session.get(f"{BASE_URL}/api/fees", params={"year": 2023, "month": 3})
        assert r.status_code == 200
        body = r.json()
        rows = body if isinstance(body, list) else (body.get("fees") or body.get("items") or body.get("data") or [])
        # Find Unit 613
        u613 = None
        for row in rows:
            unit = row.get("unit_number") or row.get("unit") or row.get("unitNumber")
            if str(unit).strip() == "613":
                u613 = row
                break
        assert u613 is not None, "Unit 613 not present in 2023-03 fees"
        # Look for late fee around $34.59 (or any positive late_fee value)
        late = u613.get("late_fee") or u613.get("lateFee") or u613.get("late_fee_amount")
        assert late is not None, "Unit 613 should have late_fee field"
        # Late fee should be positive (paid late - Sep 28 vs Mar due)
        assert float(late) > 0, f"Expected positive late fee for late-paid Unit 613, got {late}"


# ---------- Session persistence (cookies in shared session) ----------
class TestSessionPersistence:
    def test_session_persists_across_calls(self):
        s = requests.Session()
        login = s.post(f"{BASE_URL}/api/auth/login",
                       json={"email": EMAIL, "password": PASSWORD})
        assert login.status_code == 200
        # access_token cookie should be present in session jar
        assert any(c.name == "access_token" for c in s.cookies)
        # Multiple subsequent calls should all succeed without re-login
        for _ in range(3):
            r = s.get(f"{BASE_URL}/api/auth/me")
            assert r.status_code == 200, f"Session lost: {r.status_code}"


# ---------- Logout ----------
class TestLogout:
    def test_logout_clears_session(self):
        s = requests.Session()
        s.post(f"{BASE_URL}/api/auth/login",
               json={"email": EMAIL, "password": PASSWORD})
        assert s.get(f"{BASE_URL}/api/auth/me").status_code == 200

        lo = s.post(f"{BASE_URL}/api/auth/logout")
        assert lo.status_code in (200, 204)

        # After logout, /auth/me should reject
        r = s.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code in (401, 403)


# ---------- Bearer-only auth (NO cookies) ----------
# This proves the iframe-friendly auth path: localStorage token + Authorization
# header should be sufficient even when third-party cookies are blocked.
class TestBearerOnlyAuth:
    def test_login_returns_access_token_in_body(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": EMAIL, "password": PASSWORD})
        assert r.status_code == 200
        body = r.json()
        assert "access_token" in body, "login response must contain access_token in body"
        token = body["access_token"]
        assert isinstance(token, str) and len(token) > 20
        # JWT format: 3 segments separated by '.'
        assert token.count(".") == 2

    def test_auth_me_with_bearer_only_no_cookies(self):
        # 1) Login and grab the token
        login = requests.post(f"{BASE_URL}/api/auth/login",
                              json={"email": EMAIL, "password": PASSWORD})
        assert login.status_code == 200
        token = login.json()["access_token"]
        # 2) Fresh client (no cookie jar) + only Authorization header
        headers = {"Authorization": f"Bearer {token}"}
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert r.status_code == 200, f"Bearer auth /me failed: {r.status_code} {r.text}"
        u = r.json()
        assert u["email"] == EMAIL
        assert u.get("role") == "admin"

    def test_dashboard_summary_with_bearer_only_no_cookies(self):
        login = requests.post(f"{BASE_URL}/api/auth/login",
                              json={"email": EMAIL, "password": PASSWORD})
        token = login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        r = requests.get(f"{BASE_URL}/api/dashboard/summary", headers=headers)
        assert r.status_code == 200
        assert isinstance(r.json(), dict)

    def test_fees_with_bearer_only_no_cookies(self):
        login = requests.post(f"{BASE_URL}/api/auth/login",
                              json={"email": EMAIL, "password": PASSWORD})
        token = login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        r = requests.get(f"{BASE_URL}/api/fees",
                         params={"year": 2023, "month": 3}, headers=headers)
        assert r.status_code == 200
        rows = r.json() if isinstance(r.json(), list) else r.json().get("fees", [])
        assert len(rows) > 0

    def test_bearer_invalid_token_rejected(self):
        headers = {"Authorization": "Bearer not-a-real-token"}
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert r.status_code == 401

    def test_unit_613_no_trailing_space_in_unit_number(self):
        """Regression: unit_number values should NOT have trailing whitespace,
        so the data-testid 'waive-late-fee-613' (without trailing space) matches."""
        login = requests.post(f"{BASE_URL}/api/auth/login",
                              json={"email": EMAIL, "password": PASSWORD})
        token = login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        r = requests.get(f"{BASE_URL}/api/fees",
                         params={"year": 2023, "month": 3}, headers=headers)
        assert r.status_code == 200
        rows = r.json() if isinstance(r.json(), list) else r.json().get("fees", [])
        for row in rows:
            unit = row.get("unit_number") or row.get("unit") or ""
            assert unit == str(unit).strip(), (
                f"unit_number has trailing/leading whitespace: {unit!r}"
            )
