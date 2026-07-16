"""Phase B backend tests: dashboard trends, apply-fees, expense date_paid, budgets, ownership_pct."""
import os
import pytest
import requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or "https://condo-manager-58.preview.emergentagent.com").rstrip("/")
EMAIL = "innsbruckone@gmail.com"
PASSWORD = "1nn58ruck0ne"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    assert r.status_code == 200
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Dashboard trends ----------
class TestDashboardTrends:
    def test_trends_endpoint_returns_years(self, headers):
        r = requests.get(f"{BASE_URL}/api/dashboard/trends", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert "years" in data
        years = data["years"]
        assert isinstance(years, list)
        assert len(years) >= 3, f"Expected at least 3 years, got {len(years)}"
        # Each year card must have key fields
        for y in years:
            assert "year" in y
            assert "collected" in y
            assert "expenses" in y
            assert "on_time_rate" in y or y.get("paid_count") == 0
            assert "late_count" in y

    def test_trends_2023_values(self, headers):
        r = requests.get(f"{BASE_URL}/api/dashboard/trends", headers=headers)
        years = {y["year"]: y for y in r.json()["years"]}
        assert 2023 in years, f"2023 missing from trends: {list(years.keys())}"
        y2023 = years[2023]
        # Spec: 2023 collected=$10,584, expenses=$7,370.83, on-time=81.7%
        assert abs(y2023["collected"] - 10584.0) < 5.0, f"2023 collected={y2023['collected']}"
        assert abs(y2023["expenses"] - 7370.83) < 5.0, f"2023 expenses={y2023['expenses']}"
        assert y2023["on_time_rate"] is not None
        assert abs(y2023["on_time_rate"] - 81.7) < 2.0, f"2023 on-time={y2023['on_time_rate']}"

    def test_trends_2024_expenses(self, headers):
        r = requests.get(f"{BASE_URL}/api/dashboard/trends", headers=headers)
        years = {y["year"]: y for y in r.json()["years"]}
        if 2024 in years:
            assert abs(years[2024]["expenses"] - 17677.27) < 50.0, f"2024 expenses={years[2024]['expenses']}"


# ---------- Expenses w/ date_paid + year filter ----------
class TestExpensesPhaseB:
    def test_expenses_2023_imported(self, headers):
        r = requests.get(f"{BASE_URL}/api/expenses", params={"year": 2023}, headers=headers)
        assert r.status_code == 200
        rows = r.json() if isinstance(r.json(), list) else r.json().get("items", [])
        assert len(rows) >= 30, f"Expected ~36 expense rows for 2023, got {len(rows)}"
        cats = {e.get("category") for e in rows}
        # Spec: categories like Insurance, Mowing, Utilities
        # tolerant match (case-insensitive containment)
        cats_lower = " ".join(c.lower() for c in cats if c)
        assert "insurance" in cats_lower, f"Insurance missing; cats={cats}"

    def test_expenses_2024_count(self, headers):
        r = requests.get(f"{BASE_URL}/api/expenses", params={"year": 2024}, headers=headers)
        rows = r.json() if isinstance(r.json(), list) else r.json().get("items", [])
        assert len(rows) >= 40, f"Expected ~45 expense rows for 2024, got {len(rows)}"

    def test_expenses_2025_count(self, headers):
        r = requests.get(f"{BASE_URL}/api/expenses", params={"year": 2025}, headers=headers)
        rows = r.json() if isinstance(r.json(), list) else r.json().get("items", [])
        assert len(rows) >= 40, f"Expected ~44 expense rows for 2025, got {len(rows)}"

    def test_create_expense_with_date_paid_persists(self, headers):
        payload = {
            "date": "2025-06-15",
            "category": "TEST_CATEGORY",
            "vendor": "TEST Vendor",
            "description": "TEST_date_paid_persist",
            "amount": 12.34,
            "method": "check",
            "date_paid": "2025-06-20",
        }
        c = requests.post(f"{BASE_URL}/api/expenses", json=payload, headers=headers)
        assert c.status_code in (200, 201), c.text
        created = c.json()
        eid = created.get("id") or created.get("_id")
        assert eid
        assert created.get("date_paid") == "2025-06-20"

        # GET back via list and find
        g = requests.get(f"{BASE_URL}/api/expenses", params={"year": 2025}, headers=headers)
        rows = g.json() if isinstance(g.json(), list) else g.json().get("items", [])
        match = [e for e in rows if (e.get("id") or e.get("_id")) == eid]
        assert match, "created TEST expense not found in GET"
        assert match[0].get("date_paid") == "2025-06-20"

        # cleanup
        requests.delete(f"{BASE_URL}/api/expenses/{eid}", headers=headers)


# ---------- Budgets 2024..2027 ----------
class TestBudgets:
    @pytest.mark.parametrize("year", [2024, 2025, 2026, 2027])
    def test_budget_year_has_lines(self, headers, year):
        r = requests.get(f"{BASE_URL}/api/budget", params={"year": year}, headers=headers)
        assert r.status_code == 200
        rows = r.json() if isinstance(r.json(), list) else r.json().get("items", [])
        assert len(rows) >= 5, f"Budget {year} has only {len(rows)} lines"

    def test_budget_2026_total(self, headers):
        r = requests.get(f"{BASE_URL}/api/budget", params={"year": 2026}, headers=headers)
        rows = r.json() if isinstance(r.json(), list) else r.json().get("items", [])
        total = sum(float(b.get("budgeted_amount", b.get("amount", 0)) or 0) for b in rows)
        # Spec: 2026 total = $14,693.75, 10 lines
        assert len(rows) >= 8, f"2026 budget lines={len(rows)}"
        assert abs(total - 14693.75) < 5.0, f"2026 budget total={total}"


# ---------- Units ownership_pct ----------
class TestUnitsOwnership:
    def test_units_have_ownership_pct_summing_to_100(self, headers):
        r = requests.get(f"{BASE_URL}/api/units", headers=headers)
        assert r.status_code == 200
        units = r.json() if isinstance(r.json(), list) else r.json().get("items", [])
        assert len(units) == 10, f"Expected 10 units, got {len(units)}"
        total = sum(float(u.get("ownership_pct", 0) or 0) for u in units)
        # ownership_pct is stored as decimal fraction (0.098 = 9.8%), so the
        # FeeIncrease page multiplies by 100 for display. Sum should equal ~1.0.
        assert abs(total - 1.0) < 0.01, f"ownership_pct (fraction) sum={total}"

    def test_apply_fees_updates_units(self, headers):
        # Snapshot current
        r0 = requests.get(f"{BASE_URL}/api/units", headers=headers)
        before = {u["id"]: (u.get("monthly_fee", 0), u.get("late_fee", 0)) for u in r0.json()}

        # Build payload (small, deterministic change)
        rows = [{"unit_id": uid, "monthly_fee": round(mf + 0.01, 2), "late_fee": round(lf, 2)}
                for uid, (mf, lf) in before.items()]
        ap = requests.post(f"{BASE_URL}/api/units/apply-fees", json=rows, headers=headers)
        assert ap.status_code == 200, ap.text
        body = ap.json()
        assert body.get("updated") == len(rows)

        # Verify change
        r1 = requests.get(f"{BASE_URL}/api/units", headers=headers)
        after = {u["id"]: (u.get("monthly_fee", 0), u.get("late_fee", 0)) for u in r1.json()}
        for uid, (mf, lf) in before.items():
            assert abs(after[uid][0] - (mf + 0.01)) < 0.001, f"unit {uid} mf not updated"

        # Restore
        restore = [{"unit_id": uid, "monthly_fee": round(mf, 2), "late_fee": round(lf, 2)}
                   for uid, (mf, lf) in before.items()]
        rs = requests.post(f"{BASE_URL}/api/units/apply-fees", json=restore, headers=headers)
        assert rs.status_code == 200
