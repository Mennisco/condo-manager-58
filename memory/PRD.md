# Condo Association Manager — PRD

## Original Problem Statement
"I'm the president and treasurer of a small 10-unit condominium association. I currently track income and expenses and other regulatory duties of the association with a very elemental spreadsheet. I want to create an app that will track:
- condo owner monthly fee payments
- tracking expenses
- doing an annual budget based on the previous year's expenses
- vendor communications
- homeowner communications
- Filing taxes
- doing the annual report for the state of Illinois. we are not-for-profit corporation

in a simple, easy-to-use app that I can hand off to the next president or treasurer of the association."

## User Choices (collected via ask_human)
- Auth: Treasurer + Board members (JWT, admin-managed accounts)
- Communications: log only (no real email)
- Payments: manual mark-as-paid (check / Zelle / cash / ACH)
- Tax / IL annual report: PDF/summary + reminders & checklist
- AI assistance: none

## Architecture
- Backend: FastAPI + Motor (MongoDB) + bcrypt + PyJWT (httpOnly cookies). All routes prefixed `/api`.
- Frontend: React 19 + react-router-dom v7 + axios (withCredentials) + recharts + sonner toasts + shadcn-ready Tailwind. Manrope (display) / DM Sans (body).
- DB: `condo_assoc` (Mongo). Collections: users, units, fee_payments, expenses, budget_items, vendors, communications, compliance_tasks.

## Personas
- **Treasurer (admin)**: primary user. Manages everything.
- **Board members (admin)**: optional secondary admins added by the treasurer.

## Implemented (Feb 2026)
- JWT auth: `/api/auth/login`, `/me`, `/logout`, `/refresh`, `/register` (admin-only), `/users`.
- Dashboard: YTD income/expenses/balance, overdue count + amount, monthly cashflow bar chart, expenses-by-category donut.
- Units CRUD with owner contact + monthly fee.
- Monthly Fees: generate per-unit per month (idempotent), mark paid/unpaid, method (check/Zelle/cash/ACH), notes; collected/due/unpaid stats.
- Expenses CRUD with category, vendor, method, year filter; per-category roll-up.
- Annual Budget: line CRUD per year + "Generate from prior year" (aggregates prior-year expenses by category with uplift %).
- Vendors directory with contact info.
- Communications log (homeowner / vendor, incoming / outgoing, subject + body + follow-up date + resolved toggle).
- Tax & Compliance: seedable default checklist for IL NFP (Form NFP 114.05, $10 fee, registered agent, officers update), IRS (1120-H vs 990 decision, 60/90 tests, deadlines), and Internal (annual meeting, budget distribution, reconciliation, insurance renewal). Per-task due date, notes, completion toggle, progress bar.
- Annual Report: print-friendly page with financial summary, monthly activity, by-category, budget, and full expense ledger — usable for board distribution / tax-prep handoff.

## Backlog
- **P1**: Per-owner payment history page (drill-down by unit), CSV/Excel export of fees & expenses, reserve fund tracking.
- **P1**: PDF generation server-side (currently uses browser print → PDF).
- **P2**: Email integration to actually send homeowner / vendor messages (Resend or SendGrid) when user is ready.
- **P2**: Online payments via Stripe (deferred — user chose manual).
- **P2**: Attachment uploads (receipt images / vendor invoices) via object storage.
- **P2**: Multi-user invite flow UI for board members (endpoint exists, no UI yet).
- **P3**: AI assist for drafting emails / budget suggestions (user declined initially).

## Implemented (June 2026)
- **Per-unit Late Fee**: `late_fee` field on Unit (editable in Units page; = 25% of dues per spreadsheet Fee Incr. Calc. H27-H36 → 601/603/617/619=$30, 605/615=$24.83, 607/609/611/613=$34.59). GET /api/fees enriches each row with `late_fee`, `late_fee_applied` (applies when paid after / unpaid past the 10th of the month), and `total_due`. Per-row Waive toggle (`late_fee_waived`, PUT /api/fees). Fees page shows Late Fee column + Late Fees stat + late fee folded into Total Due.
- **Imported 2023-2025 fee history** (360 rows) from "Mo. Fees Log" tab: exact deposit dates, paid where a date exists / unpaid where blank, Prepaid logic via shared paid_date. 2026 data untouched. Idempotent import script: `/app/backend/import_history.py`.

## Implemented (June 2026) — Phase B
- **Imported Paid Expenses** (2023/2024/2025, ~125 rows) from the spreadsheet matrix — one expense per category per month, dated the 1st (month-level granularity). Categories normalized (Mowing, Snow Removal, Utilities, Insurance, Bank/Accounting, Maintenance, Window Washing, Landscaping, Trash Removal, Other). Script: `/app/backend/import_phase_b.py`. Year totals match spreadsheet (2023=$7,370.83, 2024=$17,677.27, 2025=$9,607.40).
- **Imported Budgets** 2024/2025/2026/2027 (category totals → budget_items). 2026 total = $14,693.75.
- **Expense cell-comment notes**: re-imported expenses now carry the spreadsheet's embedded cell comments (vendor/payment detail, 21 notes) into the expense `notes` field, shown under the description on the Expenses page. Also imported 2026 & 2027 "Actual" expense blocks (~160 expense rows total). Vendor field left blank per user (full text kept in Notes).
- **Expense.date_paid** field added (optional; blank on import, editable in the Expenses modal).
- **Unit.ownership_pct** added (decimal fraction, sums to 1.0). Seeded from Fee Incr. Calc. column D.
- **Fee Increase Worksheet** (`/fee-increase`, nav "Fee Increase"): interactive calculator — enter target annual budget → per-unit new monthly dues = (target/12) × ownership_pct, monthly increase, new late fee = 25% of new dues. "Apply new fees to units" (admin-only POST /api/units/apply-fees) writes new monthly_fee + late_fee to each unit.
- **Dashboard Multi-Year Trend strip** (GET /api/dashboard/trends): per-year Collected, Expenses, On-time payment rate (paid by the 10th), YoY expense growth, with a de-emphasized late-payment count.
- Verified: 28/28 backend tests + frontend flows (iteration_10).

## Implemented (June 2026) — P&L Statement + polish
- **P&L Statement** (`/pnl`, nav "P&L Statement", GET /api/reports/pnl): periods = This Month / This Quarter / YTD / Full Year / Custom. Basis toggle — Earned/Accrual (default; dues recognized in the month they cover via amount_due, neutralizing prepayments) vs Cash (amount_paid by paid_date). Income (fees + late fees assessed) → Total Income; Expenses by category Actual|Budget(prorated, category-mapped)|Variance → Total Expenses; Net Income (Surplus/Deficit). Print/PDF.
- **Budget page**: Print button added; remains the annual planning tool (Nov meeting), not auto-updated monthly.
- Print CSS (`@media print`) hides sidebar. Dashboard banner renamed "Treasurer Dashboard" → "Innsbruck One Manager".
- **Vendors**: multi-category support (toggle chips/badges); directory seeded with 7 vendors + categories + lifecycle notes (KS Lawn and Snow replaced by JC Land Services, Mar 2026). Expense cell-comment notes imported; 11 vendors auto-filled from notes.
- **Expenses**: cross-year search box (vendor/keyword/category/notes); date_paid field.
- Verified iteration_11: 34/34 backend (6 new P&L tests) + frontend 100%.
- Known minor: Recharts width(-1) console warnings on Dashboard (cosmetic); P&L custom range spanning two years uses end-year for budget lookup.


## Next Tasks (Future backlog — discuss with user next)
1. Gmail bank-alert parsing (P1) — connect InnsbruckOne@gmail.com to read bank deposit/withdrawal alert emails. (User: tackle next session.)
2. PWA "install to home screen" support (icon + manifest). (User: tackle next session.)
3. One-click year-end statement PDFs emailed to owners (P2).
4. Per-owner drill-down (click unit → full payment history & balance owed); CSV export on Fees/Expenses.
5. Bank reconcile: one-click "Record this" from a flagged row — DONE (record expense / fee + auto-rematch via POST /api/bank/statements/{id}/rematch & POST /api/fees/record). Remaining nicety: de-dup confirm on re-upload of same period.

## Implemented (June 2026) — Bank Reconciliation + polish
- **Bank Reconciliation** (`/bank`, nav "Bank Reconcile"): upload a Heartland Bank & Trust statement PDF → deterministic pdfplumber parser (no LLM) extracts credits/withdrawals + balances → auto-matches deposits to PAID fee_payments and withdrawals to expenses by amount (±$0.50) → flags unmatched for review → verifies balance → stores each statement (bank_statements collection, base64 PDF kept). Endpoints: POST /api/bank/reconcile, GET /api/bank/statements, GET/DELETE /api/bank/statements/{id}. Verified iteration_12 (7 new tests). Sample May 2026: 5/6 deposits + 2/4 withdrawals matched, 3 flagged, balanced.
- Login "Treasurer sign-in" → "Manager sign-in". Dashboard trend strip now shows a **Net** line per year (collected − expenses).
- Vendor back-fill: 140 historical expenses tagged (Honeycomb Insurance, City of Princeton, Republic Services, KS Lawn and Snow pre-Mar-2026, JC Land Services after).

## Credentials
See `/app/memory/test_credentials.md`. Default admin: `treasurer@condoassoc.org` / `treasurer123`.
