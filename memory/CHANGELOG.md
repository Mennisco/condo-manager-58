# Changelog

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
