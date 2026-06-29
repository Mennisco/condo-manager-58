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

## Next Tasks
1. Phase B import: Expenses (Paid Expenses tab → add `date_paid`), Budget tab, Fee Increase Worksheet page.
2. Drill-down: click a unit on the dashboard → year-long payment history & balance owed.
3. CSV export buttons on Expenses and Fees pages.
4. Receipt/document attachments (object storage).

## Credentials
See `/app/memory/test_credentials.md`. Default admin: `treasurer@condoassoc.org` / `treasurer123`.
