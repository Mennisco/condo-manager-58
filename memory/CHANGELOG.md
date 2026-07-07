# Changelog

## July 2026 — Gmail bank-alerts FULLY LIVE (fixed 403 + parser)
- Resolved OAuth blockers: (1) removed forced login_hint that caused generic Google "403 - that's all we know"; (2) fixed PKCE "Missing code verifier" by persisting flow.code_verifier in oauth_states and restoring it in callback; (3) fixed NameError (logger→log) that turned callback errors into 500s.
- Rewrote parse_alert_email(): Heartland alerts are HTML-only (no plain-text part) so stripped body is one line. Parser now uses global regex + section-position detection instead of line splitting. Handles "Jul 03 2026 Deposit $288.00" mixed-case month.
- Sync query tightened to: from:no-reply@hbtbank.com subject:"Transaction Alert" newer_than:2y, maxResults=100.
- VERIFIED LIVE: connected as innsbruckone@gmail.com, synced 47 real transactions, parsing + owner-matching working (e.g. matched Unit 601 · Allie Roe). User confirmed.

## July 2026 — Gmail bank-alert parsing (P1)
- Google OAuth (read-only Gmail) integration. Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GMAIL_REDIRECT_URI, APP_BASE_URL in backend/.env.
- Endpoints: GET /api/gmail/status, GET /api/oauth/gmail/login?token=, GET /api/oauth/gmail/callback, DELETE /api/oauth/gmail, POST /api/gmail/sync, GET /api/gmail/alerts, DELETE /api/gmail/alerts/{id}.
- Parser parse_alert_email(): reads Heartland "Transaction Alert" emails (Available Balance + "Deposits over"/"Withdrawals over" sections, lines like "JUL 03 2026 Deposit $288.00"). Deterministic; unit-tested on sample (balance $13,292.59, deposits $288 + $138).
- Sync fetches from:no-reply@hbtbank.com newer_than:1y, dedups by message_id:index into gmail_alerts collection; alerts matched to fees/expenses by amount.
- Frontend: /gmail "Bank Alerts" page (Connect Google, Sync now, disconnect, alert table with one-click Record).
- Shared RecordTransactionModal component (used by Bank Reconcile + Bank Alerts): record expense (guessed category/vendor) or fee (multi-month tick + auto-split).
- STATUS: code complete + parser/endpoints/redirect verified. Live Gmail fetch pending user's one-time Google authorization (consent screen shows "unverified app" — user clicks Advanced → Go to app; account is a test user).

## Prior (June 2026)
- Bank reconciliation (PDF), P&L, Fee Increase, multi-year trend w/ Net, Vendors multi-category, expense notes/search, 2023-2025 fee history, late fees. See PRD.md.
