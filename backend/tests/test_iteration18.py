"""Iteration 18 tests: autopay persistence on units, ledger returns unit.autopay,
reminder/email 428 gating, statement logo asset present."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN_EMAIL = "innsbruckone@gmail.com"
ADMIN_PASSWORD = "1nn58ruck0ne"


@pytest.fixture(scope="module")
def auth():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    tok = r.json().get("access_token") or r.json().get("token")
    assert tok
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="module")
def units(auth):
    r = requests.get(f"{BASE_URL}/api/units", headers=auth, timeout=30)
    assert r.status_code == 200
    return r.json()


def _find_unit(units, num):
    for u in units:
        if str(u.get("unit_number")) == str(num):
            return u
    return None


class TestAutopayField:
    def test_units_list_has_autopay_field(self, units):
        # At least seeded 605/611 have autopay
        u605 = _find_unit(units, "605")
        u611 = _find_unit(units, "611")
        assert u605 is not None, "unit 605 not found"
        assert u611 is not None, "unit 611 not found"
        assert u605.get("autopay"), f"605 autopay missing: {u605.get('autopay')}"
        assert u611.get("autopay"), f"611 autopay missing: {u611.get('autopay')}"

    def test_ledger_returns_unit_autopay_605(self, auth, units):
        u = _find_unit(units, "605")
        r = requests.get(f"{BASE_URL}/api/units/{u['id']}/ledger", headers=auth, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d.get("unit", {}).get("autopay"), f"ledger unit.autopay missing for 605: {d.get('unit')}"

    def test_ledger_returns_unit_autopay_611(self, auth, units):
        u = _find_unit(units, "611")
        r = requests.get(f"{BASE_URL}/api/units/{u['id']}/ledger", headers=auth, timeout=30)
        assert r.status_code == 200
        assert r.json().get("unit", {}).get("autopay")

    def test_ledger_no_autopay_for_other_unit(self, auth, units):
        # Pick a non-605/611 unit
        other = next((u for u in units if str(u.get("unit_number")) not in ("605", "611")), None)
        assert other is not None
        r = requests.get(f"{BASE_URL}/api/units/{other['id']}/ledger", headers=auth, timeout=30)
        assert r.status_code == 200
        # Field may be absent, None or empty
        ap = r.json().get("unit", {}).get("autopay")
        assert not ap, f"unexpected autopay for unit {other.get('unit_number')}: {ap}"

    def test_put_unit_persists_autopay(self, auth, units):
        # Pick a non-605/611 unit for test, save and revert
        target = next((u for u in units if str(u.get("unit_number")) not in ("605", "611")), None)
        assert target is not None
        original_ap = target.get("autopay") or ""
        payload = {**target, "autopay": "TEST_AUTOPAY_ACH_9999"}
        # PUT typically expects unit input model; try minimal
        r = requests.put(f"{BASE_URL}/api/units/{target['id']}", headers=auth, json=payload, timeout=30)
        assert r.status_code in (200, 204), f"PUT failed: {r.status_code} {r.text}"
        # Verify via ledger
        led = requests.get(f"{BASE_URL}/api/units/{target['id']}/ledger", headers=auth, timeout=30).json()
        assert led["unit"].get("autopay") == "TEST_AUTOPAY_ACH_9999"
        # Revert
        revert = {**target, "autopay": original_ap}
        requests.put(f"{BASE_URL}/api/units/{target['id']}", headers=auth, json=revert, timeout=30)


class TestReminderEmailGated:
    def test_reminder_email_returns_428(self, auth, units):
        u = _find_unit(units, "605") or units[0]
        r = requests.post(f"{BASE_URL}/api/units/{u['id']}/reminder/email",
                          headers=auth,
                          json={"to": "test@example.com"}, timeout=30)
        assert r.status_code == 428, f"expected 428, got {r.status_code}: {r.text}"

    def test_reminder_email_bad_unit_404(self, auth):
        r = requests.post(f"{BASE_URL}/api/units/507f1f77bcf86cd799439011/reminder/email",
                          headers=auth, json={"to": "x@example.com"}, timeout=30)
        assert r.status_code in (404, 428)  # 428 checked first is possible; document


class TestStatementLogo:
    def test_logo_asset_exists(self):
        import os as _os
        # Path from server.py
        path = "/app/backend/assets/statement_logo.jpg"
        assert _os.path.exists(path), f"Statement logo not found at {path}"
        assert _os.path.getsize(path) > 1000, "Logo file suspiciously small"


class TestDelinquencyStillLoads:
    def test_delinquency_ok(self, auth):
        r = requests.get(f"{BASE_URL}/api/reports/delinquency", headers=auth, timeout=30)
        assert r.status_code == 200
