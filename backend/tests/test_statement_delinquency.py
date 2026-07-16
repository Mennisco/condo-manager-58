"""Tests for Owner Ledger year filter, unit balances, email statement (gated),
and delinquency report endpoints."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://condo-manager-58.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "innsbruckone@gmail.com"
ADMIN_PASSWORD = "1nn58ruck0ne"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    j = r.json()
    return j.get("access_token") or j.get("token")


@pytest.fixture(scope="module")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def units(auth):
    r = requests.get(f"{BASE_URL}/api/units", headers=auth, timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) > 0
    return data


class TestUnitBalances:
    def test_balances_endpoint(self, auth, units):
        r = requests.get(f"{BASE_URL}/api/units/balances", headers=auth, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, dict)
        # Should have keys for each unit id
        for u in units:
            uid = u.get("id")
            if uid in data:
                entry = data[uid]
                assert "overdue" in entry
                assert "months_overdue" in entry
                assert "balance_due" in entry
                assert isinstance(entry["overdue"], (bool, int, float))


class TestOwnerLedger:
    def test_ledger_all_years(self, auth, units):
        uid = units[0]["id"]
        r = requests.get(f"{BASE_URL}/api/units/{uid}/ledger", headers=auth, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "unit" in d and "rows" in d and "totals" in d
        for k in ("total_due", "total_paid", "total_short", "overdue", "months_overdue"):
            assert k in d["totals"], f"missing totals key {k}"

    def test_ledger_year_filter(self, auth, units):
        uid = units[0]["id"]
        r = requests.get(f"{BASE_URL}/api/units/{uid}/ledger?year=2026", headers=auth, timeout=30)
        assert r.status_code == 200
        d = r.json()
        # All rows should be in 2026
        for row in d["rows"]:
            ym = row.get("year_month") or row.get("month") or ""
            if ym:
                assert ym.startswith("2026"), f"row not in 2026: {ym}"

    def test_ledger_year_totals_differ_or_equal(self, auth, units):
        """Totals for a single year should be <= all-years totals."""
        uid = units[0]["id"]
        all_r = requests.get(f"{BASE_URL}/api/units/{uid}/ledger", headers=auth, timeout=30).json()
        y_r = requests.get(f"{BASE_URL}/api/units/{uid}/ledger?year=2026", headers=auth, timeout=30).json()
        assert y_r["totals"]["total_due"] <= all_r["totals"]["total_due"] + 0.01


class TestEmailStatementGated:
    def test_gmail_status_shape(self, auth):
        r = requests.get(f"{BASE_URL}/api/gmail/status", headers=auth, timeout=30)
        assert r.status_code == 200
        d = r.json()
        # can_send should be present per spec
        assert "can_send" in d, f"gmail status missing can_send: {d}"

    def test_email_statement_gated_returns_428(self, auth, units):
        uid = units[0]["id"]
        r = requests.post(
            f"{BASE_URL}/api/units/{uid}/statement/email",
            headers=auth,
            json={"to": "test@example.com", "year": 2026},
            timeout=30,
        )
        # Per spec: 428 when Gmail not connected / no send scope
        assert r.status_code == 428, f"expected 428, got {r.status_code}: {r.text}"


class TestDelinquencyReport:
    def test_delinquency_report(self, auth):
        r = requests.get(f"{BASE_URL}/api/reports/delinquency", headers=auth, timeout=30)
        assert r.status_code == 200
        d = r.json()
        # Should have stat totals and units list
        # Loosely validate presence of expected fields
        assert isinstance(d, dict)
        keys = set(d.keys())
        # Common expected keys
        expected_any = {"delinquent_units", "total_overdue", "billed_all_time", "collected_all_time", "units", "rows"}
        assert keys & expected_any, f"unexpected shape: {keys}"
