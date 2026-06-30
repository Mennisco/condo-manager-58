"""Backend tests for the Bank Reconciliation feature (/api/bank/*)."""
import os
import io
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
SAMPLE_PDF_URL = (
    "https://customer-assets.emergentagent.com/job_e8987f5b-caf8-4a1c-b30b-b4e7ee06c37b/"
    "artifacts/x6koqz5z_260529_HB%26T.pdf"
)


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture
def headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def sample_pdf_bytes():
    r = requests.get(SAMPLE_PDF_URL, timeout=30)
    assert r.status_code == 200 and len(r.content) > 1000
    return r.content


# --- Reconcile endpoint ----------------------------------------------------
class TestBankReconcile:
    def test_reconcile_sample_pdf(self, headers, sample_pdf_bytes):
        files = {"file": ("260529_HBT.pdf", sample_pdf_bytes, "application/pdf")}
        r = requests.post(f"{BASE_URL}/api/bank/reconcile", headers=headers, files=files)
        assert r.status_code == 200, r.text
        body = r.json()

        meta = body["meta"]
        assert meta["period_start"] == "2026-05-01"
        assert meta["period_end"] == "2026-05-31"
        assert meta["beginning_balance"] == 18194.86
        assert meta["ending_balance"] == 11976.07

        s = body["summary"]
        assert s["deposits_total"] == 1313.0
        assert s["withdrawals_total"] == 7531.79
        assert s["deposits_count"] == 6
        assert s["withdrawals_count"] == 4
        assert s["matched_credits"] == 5
        assert s["matched_withdrawals"] == 2
        assert s["unmatched"] == 3
        assert s["balance_ok"] is True

        assert isinstance(body["credits"], list) and len(body["credits"]) == 6
        assert isinstance(body["withdrawals"], list) and len(body["withdrawals"]) == 4
        for t in body["credits"] + body["withdrawals"]:
            assert "match" in t  # either dict or None

        # Save id for later cleanup
        pytest.bank_statement_id = body["id"]

    def test_unauthorized(self, sample_pdf_bytes):
        files = {"file": ("x.pdf", sample_pdf_bytes, "application/pdf")}
        r = requests.post(f"{BASE_URL}/api/bank/reconcile", files=files)
        assert r.status_code in (401, 403)

    def test_non_pdf_returns_error(self, headers):
        files = {"file": ("note.txt", b"hello world this is not a pdf", "text/plain")}
        r = requests.post(f"{BASE_URL}/api/bank/reconcile", headers=headers, files=files)
        assert r.status_code in (400, 422), r.text

    def test_empty_pdf_returns_error(self, headers):
        # Minimal valid PDF header but no transactions
        empty_pdf = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"
        files = {"file": ("empty.pdf", empty_pdf, "application/pdf")}
        r = requests.post(f"{BASE_URL}/api/bank/reconcile", headers=headers, files=files)
        assert r.status_code in (400, 422)


# --- History endpoints -----------------------------------------------------
class TestBankHistory:
    def test_list_statements(self, headers):
        r = requests.get(f"{BASE_URL}/api/bank/statements", headers=headers)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        # The reconciled statement from previous test should be present
        sid = getattr(pytest, "bank_statement_id", None)
        if sid:
            assert any(it.get("id") == sid or it.get("_id") == sid for it in items)

    def test_get_statement_detail(self, headers):
        sid = getattr(pytest, "bank_statement_id", None)
        if not sid:
            pytest.skip("No statement id from reconcile test")
        r = requests.get(f"{BASE_URL}/api/bank/statements/{sid}", headers=headers)
        assert r.status_code == 200
        body = r.json()
        assert "meta" in body and "summary" in body
        assert "credits" in body and "withdrawals" in body

    def test_delete_statement(self, headers):
        sid = getattr(pytest, "bank_statement_id", None)
        if not sid:
            pytest.skip("No statement id from reconcile test")
        r = requests.delete(f"{BASE_URL}/api/bank/statements/{sid}", headers=headers)
        assert r.status_code == 200
        # Verify it's gone
        r2 = requests.get(f"{BASE_URL}/api/bank/statements/{sid}", headers=headers)
        assert r2.status_code == 404
