"""Backend tests for the P&L Statement endpoint (/api/reports/pnl)."""
import os
import requests
import pytest


def _read_frontend_url():
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.strip().split("=", 1)[1]
    except Exception:
        pass
    return ""


BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or _read_frontend_url()).rstrip("/")
ADMIN_EMAIL = "innsbruckone@gmail.com"
ADMIN_PASS = "1nn58ruck0ne"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture
def headers(token):
    return {"Authorization": f"Bearer {token}"}


# 2025 full-year accrual reference numbers per spec
class TestPnL2025Accrual:
    def test_full_year_accrual_2025(self, headers):
        r = requests.get(f"{BASE_URL}/api/reports/pnl",
                         params={"start": "2025-01-01", "end": "2025-12-31", "basis": "accrual"},
                         headers=headers)
        assert r.status_code == 200, r.text
        d = r.json()
        # income
        assert d["income"]["fees"] == pytest.approx(13368.00, abs=0.01)
        assert d["income"]["late_fees"] == pytest.approx(49.66, abs=0.01)
        assert d["income"]["total"] == pytest.approx(13417.66, abs=0.01)
        # expenses
        assert d["total_expenses"] == pytest.approx(9607.40, abs=0.01)
        assert d["total_budget"] == pytest.approx(13665.00, abs=0.01)
        # net
        assert d["net_income"] == pytest.approx(3810.26, abs=0.01)
        # months = full year
        assert d["months"] == 12

    def test_expense_lines_present_and_have_variance(self, headers):
        r = requests.get(f"{BASE_URL}/api/reports/pnl",
                         params={"start": "2025-01-01", "end": "2025-12-31", "basis": "accrual"},
                         headers=headers)
        d = r.json()
        cats = {l["category"]: l for l in d["expense_lines"]}
        assert "Mowing" in cats
        mow = cats["Mowing"]
        # spec: Mowing actual 1285 budget 1215 => over budget => negative variance
        assert mow["actual"] == pytest.approx(1285.00, abs=0.01)
        assert mow["budget"] == pytest.approx(1215.00, abs=0.01)
        assert mow["variance"] < 0  # over-budget


class TestPnLBasisToggle:
    def test_cash_vs_accrual_differ_for_2026(self, headers):
        # 2026 has prepayments; cash uses paid_date, accrual uses period month
        r_acc = requests.get(f"{BASE_URL}/api/reports/pnl",
                             params={"start": "2026-01-01", "end": "2026-12-31", "basis": "accrual"},
                             headers=headers)
        r_cash = requests.get(f"{BASE_URL}/api/reports/pnl",
                              params={"start": "2026-01-01", "end": "2026-12-31", "basis": "cash"},
                              headers=headers)
        assert r_acc.status_code == 200 and r_cash.status_code == 200
        a = r_acc.json(); c = r_cash.json()
        assert a["basis"] == "accrual"
        assert c["basis"] == "cash"
        # numbers should differ when prepayments exist
        assert a["income"]["fees"] != c["income"]["fees"] or a["income"]["late_fees"] != c["income"]["late_fees"]


class TestPnLBudgetProration:
    def test_this_month_budget_is_annual_over_12(self, headers):
        r_full = requests.get(f"{BASE_URL}/api/reports/pnl",
                              params={"start": "2025-01-01", "end": "2025-12-31", "basis": "accrual"},
                              headers=headers)
        r_one = requests.get(f"{BASE_URL}/api/reports/pnl",
                             params={"start": "2025-06-01", "end": "2025-06-30", "basis": "accrual"},
                             headers=headers)
        full = r_full.json(); one = r_one.json()
        assert one["months"] == 1
        # Total budget for one month ~= annual / 12
        assert one["total_budget"] == pytest.approx(full["total_budget"] / 12.0, abs=1.0)


class TestPnLEdgeCases:
    def test_custom_range_response_shape(self, headers):
        r = requests.get(f"{BASE_URL}/api/reports/pnl",
                         params={"start": "2025-03-15", "end": "2025-07-20", "basis": "accrual"},
                         headers=headers)
        assert r.status_code == 200
        d = r.json()
        for k in ["start", "end", "basis", "months", "income", "expense_lines",
                  "total_expenses", "total_budget", "net_income"]:
            assert k in d
        for k in ["fees", "late_fees", "total"]:
            assert k in d["income"]

    def test_unauthorized_without_token(self):
        r = requests.get(f"{BASE_URL}/api/reports/pnl",
                         params={"start": "2025-01-01", "end": "2025-12-31"})
        assert r.status_code in (401, 403)
