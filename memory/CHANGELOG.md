# Changelog

## July 2026 (session 4) — Posting edit, remind-all, reconnect prompt
- FEATURE: Edit Payment on Posting page — the "Edit payment" modal (previously only on Monthly Fees) is now on the Posting page too. Extracted into a shared component `/app/frontend/src/components/EditFeeModal.jsx` and used by both Fees.jsx and Posting.jsx. Pencil button `posting-edit-{unit}` opens it; saves via PUT /api/fees/{id}.
- FEATURE: "Remind all overdue owners" — Delinquency page header now has a one-click button (`remind-all-btn`, shown only when there are delinquent rows) that POSTs to /api/reports/delinquency/remind-all. Backend loops every delinquent unit with an email on file and sends the friendly past-due reminder via Gmail; returns {sent, sent_units, skipped, failed}. Gated 428 until Google reconnect for gmail.send.
- UX: Bank Alerts page shows an amber "Reconnect to enable email" banner (`gmail-reconnect-banner`) when Google is connected but the gmail.send scope is not yet granted (uses status.can_send). Guides the user to reconnect so statements/reminders can be emailed.
- Verified: testing_agent iteration_19 = frontend 100% (Posting edit saves+persists, Fees regression OK, Delinquency loads). Backend remind-all verified via curl (correct 428 without send scope). Email send remains gated until the user reconnects Google once.

## July 2026 (session 3d) — Texting, payment reminders, statement logo, autopay notes
- FEATURE: Text statement (Google Voice copy/paste) — Owner Ledger "Text" button opens a modal with the owner's phone, a prefilled summary message (unit, owner, billed/paid/balance for the selected coverage), "Copy message", and "Open Google Voice". Purely client-side (Google Voice has no API). Reusable TextMessageModal component.
- FEATURE: Payment Reminders — on the Delinquency page each overdue owner has "Email" and "Text" reminder actions. Email → POST /api/units/{id}/reminder/email sends a short friendly past-due nudge (no attachment) via Gmail (gated 428 until Google reconnect). Text → copy/paste modal with a past-due message.
- FEATURE: Statement Logo — Innsbruck building photo now appears at the top of the printed statement, the emailed HTML statement, and the generated PDF (reportlab embeds a downscaled 170KB asset at /app/backend/assets/statement_logo.jpg).
- FEATURE: Autopay/ACH notes — new "Autopay / ACH detail" field per unit (Units add/edit form); shown as a green card on the owner's history page. Seeded for 605 (Heartland DDA #6010792) and 611 (#1066552).
- Hardening: added _to_oid() so malformed unit ids return 404 instead of 500 (applied to ledger, email-statement, reminder endpoints).
- Verified: testing_agent iteration_18 = 100% (9/9 backend, all frontend). Email/reminder send remain gated until the user reconnects Google for the gmail.send scope.

## July 2026 (session 3c) — Emailed statements, year filter, balance reminders, delinquency report
- FEATURE: Statement Year Filter — Owner Ledger page has a "Coverage" selector (All years / each year). Summary cards, on-screen history, printed statement, and emailed statement all respect the selection.
- FEATURE: Email Owner Statement (via connected Gmail) — "Email statement" button opens a modal (prefilled owner email + optional note). POST /api/units/{id}/statement/email builds an HTML body + a reportlab PDF attachment and sends through the Gmail API (users().messages().send). Added gmail.send scope (GMAIL_SCOPES); /gmail/status now returns can_send; callback stores granted scopes. Endpoint returns 428 until the user reconnects Google to grant send permission. NOTE: user must reconnect Google once (Bank Alerts → Reconnect) to enable sending.
- FEATURE: Balance Reminders — Units & Owners list has a "Balance" column: red "$X due" badge for past-due owners, green "Current" otherwise. Backed by GET /api/units/balances (overdue = past-due only, future months excluded).
- FEATURE: Delinquency Report — new /delinquency page + sidebar link. GET /api/reports/delinquency lists units with a past-due balance (worst first) with oldest-owed month, months overdue, and contact info; print/save-as-PDF friendly. Association totals (overdue, all-time billed/collected). Currently 0 past-due (everyone paid through Jul 2026).
- Refactor: extracted _build_ledger() helper (adds overdue/months_overdue) reused by ledger, balances, delinquency, and email endpoints. Added reportlab==5.0.0.
- Verified: testing_agent iteration_17 = 100% (7/7 backend, all frontend). Email send path is gated (can't be exercised until Google reconnect).

## July 2026 (session 3b) — Owner history, printable statements, CSV exports
- FEATURE: Owner History drill-down — click any row on Units & Owners (or "View history" menu) opens /units/:id. GET /api/units/{id}/ledger returns the full month-by-month payment timeline grouped by year, with per-row status (posted/short/unpaid), late flags, imported notes, and lifetime totals (billed / paid / balance due / months paid & late).
- FEATURE: Printable Owner Statement — "Print statement" button on the ledger page renders a clean print-only document (association header, owner details, year tables with Due/Paid/Paid-date/Balance, and total balance due). Uses existing @media print rules (sidebar hidden). User picks print or Save-as-PDF from the browser dialog.
- FEATURE: CSV exports (Annual Report page "Data exports" card) — GET /api/export/fees.csv (year or all), /api/export/expenses.csv (year or all), /api/export/owner-summary.csv (all-time per-owner totals). Downloaded via authenticated blob fetch. Verified filenames + contents.
- All endpoints verified via curl; ledger, print layout, and CSV download verified via screenshots/Playwright.

## July 2026 (session 3) — Reconciliation cross-check + Dashboard "This Month" tile
- FEATURE: Bank Reconcile "Cross-check" side-by-side view — GET /api/bank/reconcile-view?year&month shows parsed PDF bank deposits next to recorded fee-log payments for the chosen period. Matches by amount (±$1), each used once; prepayments (same unit + paid_date across months) collapse into one payment row. Flags matched / deposit-with-no-record / record-with-no-deposit and shows deposits−payments difference. Period dropdown (GET /api/bank/periods, defaults to opened/uploaded statement's period). Verified June 2026: 6 matched, 1 deposit-only ($120 Mobile Remote Deposit), diff $120.
- FEATURE: Dashboard "This Month" tile — GET /api/dashboard/this-month returns posted/short/unpaid/late counts + collected/due totals + a "Needs attention" list of unpaid/short units for the current month. Verified Jul 2026: 8 posted, 2 short (607 & 613 $12 each), 1 late.

## July 2026 (session 2c) — Imported spreadsheet notes
- Imported all 31 embedded cell comments from "Mo. Fees Log" onto matching fee_payment.notes (check #s, wire details, "PIF thru 12/31", prepayment ranges). Mapped by year-block + row-index (handles prior owners: Christina Fogarty->601 Allie Roe, Ted Johnson->607 Jeff). All 31 matched existing rows; 0 missing.
- Surfaced notes in UI: amber note icon (StickyNote) with hover tooltip next to owner name on the Monthly Fees page (data-testid fee-note-<unit>).

## July 2026 (session 2b) — Make-up payment + Posting page + manual late fees
- FEATURE: "Record make-up payment" — POST /api/fees/makeup distributes one check across a unit's underpaid months oldest-first; GET /api/fees/shortfall/{unit_id} lists short months + total. Fees page "Make-up payment" button + MakeupModal (unit picker, live shortfall preview, amount/date). Verified: $72 clears Jeff's 6 months, $48 Earl.
- FEATURE: new "Posting" page (/posting, nav ListChecks) — monthly routine: mark each unit paid (auto-fills amount=rate, date=now, method), method dropdown, progress stats (X/10 posted, collected, late count). Unpaid units past the 10th flag "Late".
- CHANGE: late fees are now MANUAL everywhere. list_fees returns is_late (auto flag: paid-after-10th or unpaid-past-10th) and late_fee_applied = stored late_fee_charged. total_due only includes the late fee when explicitly charged. Fees page + Posting page show "Apply {fee}" (when late & not charged) / "Remove" (when charged). PUT /fees accepts late_fee_charged.
- Verified testing_agent iteration_16 = 100% (6/6), non-destructive.

## July 2026 (session 2) — July posting, rate sync, shortfall cue
- Reconciled June 2026 against the 6/30 bank statement (uploaded): all 10 units covered (6 monthly deposits on statement + 4 prepaid earlier). Confirmed "missing" John Eden (605, $87) & Frank Bennett (611, $126) paid via DDA transfers (acct 6010792 / 1066552).
- CONFIRMED fee increase is effective JULY 1 (Jul–Dec only), NOT full year. True rate shortfall recomputed: Jeff Johnson (607) $72 + Earl Rogers (613) $48 = $120 total on paid Jul–Dec months.
- DATA CHANGES: synced Jul–Dec 2026 amount_due -> current monthly_fee (60 rows); recorded 6 July payments at new rate (603 $120, 605 $96, 609 $138, 611 $138, 617 $120, 619 $120; placeholder paid_date 2026-07-01, true-up at month-end vs July statement). July now fully posted; only 607 & 613 short $12 each ($24 July).
- FEATURE: shortfall visual cue on Monthly Fees page. Backend list_fees returns `short` = amount_due - amount_paid when paid & underpaid. Frontend Fees.jsx: amber "Short $X" badge (short-tag-<unit>), row amber tint, new "Short (rate)" summary stat (fees-stat-short). Late fees remain fully MANUAL (user waives these due to the increase; grace extended a month). Verified testing_agent iteration_15 = 100%.
- Also: Gmail token now auto-clears when expired/revoked (Google "Testing" mode ~7-day refresh-token expiry) so UI shows Connect again. See RESUME_RECONCILIATION.md.

## July 2026 — Record-state + login photo fix
- Bug: recording a split deposit (e.g. $288 → 3× $96 for Chuck Lough) saved the fees correctly but the alert row stayed "Review" because _match_txn only matches a single equal-amount fee_payment. Users thought it failed and re-recorded.
- Fix: gmail_alerts now carry a persistent `recorded` flag. New endpoint POST /api/gmail/alerts/{aid}/resolve?recorded=bool. Record modal passes alertId; onRecorded resolves the alert. Table shows green "Recorded" badge + Undo link (priority: recorded > match > review). unmatched count excludes recorded.
- Fix: removed full-image green overlay bg-[#166534]/40 on Login.jsx photo (user disliked "green tint"); replaced with bottom-only dark gradient for text legibility. Dashboard photo already neutral.

## July 2026 — Deposit owner suggestions (P1)
- Bare check deposits (email says only "Deposit", no payer) stay flagged as Review by design — payer identity lives in the check image, not the email. Confirmed with user: deposits are always single-owner, never combined.
- Backend _suggest_unit_by_name(): for credit deposits whose description contains an owner's first+last name (ACH/P2P like "P2P NFCU ACH WEB JAY S BARLOW"), attaches row["suggested"] {unit_id, unit_number, owner_name} to GET /api/gmail/alerts.
- Frontend: alert table shows green "Likely: Unit X · Owner" hint for named deposits (still with Record button). RecordTransactionModal pre-selects the suggested owner and shows a "Suggestions" block: by-name chip + amount-based fee-match chips (units whose monthly_fee divides the amount, ticking implied months). Float-safe tolerance on the divide.
- VERIFIED via testing_agent (iteration_14, 100%): 47 alerts, 2 named deposits show hints (Allie Roe, Jay Barlow), bare deposits show none, modal pre-selects + chips work.

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
