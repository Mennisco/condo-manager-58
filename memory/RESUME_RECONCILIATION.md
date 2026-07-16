# RESUME NOTE — Bank Reconciliation (UPDATED session 2)

## STATUS SNAPSHOT (most recent)
- June 2026 = fully reconciled vs 6/30 bank statement. July 2026 = fully posted (all 10 paid); only Jeff (607) & Earl (613) short $12 each.
- Shortfall visual cue on Monthly Fees page = BUILT & tested (amber "Short $X" badge + "Short (rate)" stat). Late fees stay manual; user is waiving these due to the increase (grace +1 month).
- Gmail: refresh tokens expire ~7 days in Google "Testing" mode. Backend now auto-clears dead token so UI shows "Connect Google" again. User declined/undecided on publishing to Production (would stop the weekly expiry).

## NEXT STEPS (in order)
1. Reconciliation view (deposits vs fees log) + ongoing PDF statement ingestion for the email-gap months (Jul2025–May2026). User wants email + PDF cross-check.
2. Multi-type Gmail alert parsing + dedup (New Remote Deposit, Automatic Deposit/Withdrawal) — email is end-of-month reconciliation only.
3. (Optional) Dashboard "This month" tile: posted/short/late at a glance.

## DONE (session 2c/2d)
- Imported 31 spreadsheet cell-comment notes onto fee_payment.notes; surfaced as StickyNote hover icon on Fees page.
- Google OAuth app PUBLISHED to Production (owner account = innsbruckone@gmail.com; project 924824139990). Reconnected -> durable (non-7-day) refresh token. Backend already auto-clears dead tokens.
- Make-up payment action, Posting page, manual late fees, shortfall cue all shipped & tested.

## KEY FACTS
- Fee increase EFFECTIVE JULY 1 2026 (Jul–Dec new rate; Jan–Jun old rate).
- Current rates (monthly_fee = new/2026): 601=120,603=120,605=96,607=138,609=138,611=138,613=138,615=96,617=120,619=120. Old rates: 109->120, 126->138, 87->96.
- "Transfer from DDA Acct ####" = homeowners banking at Heartland (OWNER payments). DDA acct map: 6010792=John Eden(605), 1066552=Frank Bennett(611).
- Emails miss many payments (only ~5 of 10 July deposits visible); bank STATEMENTS are authoritative. Newest statement = 6/30/26 (period 6/01–6/30). July statement not closed yet.

## DATA CHANGES MADE (cumulative this fork)
- $288 alert marked recorded=True; Chuck Lough (615) Jul/Aug/Sep 2026 @ $96 recorded.
- Synced Jul–Dec 2026 amount_due -> monthly_fee (all units).
- Recorded 6 July 2026 payments at new rate (603,605,609,611,617,619) with placeholder paid_date 2026-07-01 (TRUE UP exact dates when July statement posts).

## KEY ASSETS (job artifacts)
- Spreadsheet: https://customer-assets.emergentagent.com/job_assoc-admin-3/artifacts/jipdz4dy_Copy%20of%20Innsbruck%201%20Fees%20%26%20Assessments.xlsx
- June 2026 bank statement PDF: https://customer-assets-lxgj4vgw.emergentagent.net/job_e8987f5b-caf8-4a1c-b30b-b4e7ee06c37b/artifacts/j8s28de3_260630.pdf
- Mo. Fees Log blocks: 2023=rows3-12, 2024=16-25, 2025=32-41, 2026=48-57; cols F(6)=Jan..Q(17)=Dec; value=date received; cell COMMENT=note; col B=address, C=autopay acct, D=amt due, E=owner.

## OLD DETAIL (session 1) below
---


## Current task
Reconcile actual bank deposits vs the monthly fees log BEFORE building the fee-shortfall feature.
User said: "get everything reconciled before we go any further." Shortfall feature is APPROVED but DEFERRED until reconciliation is done.

## ROOT CAUSE of missing deposits (confirmed)
Heartland sends 4 financial alert email types; we only parse ONE:
- "Transaction Alert" (daily batch; deposits OVER ~$95 + withdrawals; has real txn date) — CURRENTLY PARSED
- "New Remote Deposit Alert" — "A check for $X.XX has been submitted ... via our mobile app" (credit; only email date, no payee) — NOT parsed
- "Automatic Deposit Alert" — "Transaction Amount: $X  Transaction Description: <desc>  Available Balance: $Y" (credit) — NOT parsed
- "Automatic Withdrawal Alert" — same body format as Automatic Deposit (withdrawal) — NOT parsed
- (Non-financial, ignore: "Online Banking Access Alert", "You received a new secure message", "A change was made ...")

Email counts in mailbox: 28 Transaction, 29 New Remote Deposit, 9 Auto Withdrawal, 2 Auto Deposit, 45 access alerts.
Gap: NO "Transaction Alert" emails Jul 2025–Jun 2026 (that stretch only has the real-time types).

## DRY-RUN RESULT (parsing all 4 types + dedup, nothing written)
- Deduped credits: 62 deposits totaling $12,776 (vs current 46 / $7,350 in DB).
- Dedup rule that worked: key = (amount, kind, date within ±1 day); prefer source TxnAlert > AutoDep/AutoWd > RemoteDep.
- Parser regexes (reuse these):
  - Txn Alert line: `(Jan|..|Dec)\s+(\d{1,2})\s+(\d{4})\s+(.+?)\s+\$([\d,]+\.\d{2})` (IGNORECASE), section headers `(Deposits|Credits|Withdrawals|Debits)`.
  - Remote Deposit: `A check for \$([\d,]+\.\d{2})`  -> credit, date=email date, desc="Remote check deposit".
  - Auto Dep/Wd: amount `Transaction Amount:\s*\$([\d,]+\.\d{2})`, desc `Transaction Description:\s*(.+?)\s+Available Balance`.
  - Email date via email.utils.parsedate_to_datetime(headers['date']).date().
- Body is HTML-only -> strip tags to one line; strip CSS with `re.sub(r"/\*.*?\*/"," ",body)`.

## The 6 payments with NO email alert at all (must come from PDF statements)
User: 6 homeowners paid but nothing shows and bank sent no alert. Named examples:
- Carol & Maurie Schennum (unit 617): $720 on Jul 1 2026 (new rate $120 x 6 = $720, thru year-end).
- John Eden (605) and Frank Bennett (611): automatic ACH transfers, not showing.
Dry-run did NOT find $720 or EDEN/BENNETT/SCHENNUM in any alert -> confirms these need the PDF bank statement.

## User decisions (confirmed this session)
1. Approve parsing all 4 alert types + dedup. ±1 day tolerance is fine (no weekend/holiday posting; remote deposits post same day).
2. Build a reconciliation VIEW: per period, bank deposits vs fees-log records; flag matched / deposit-without-record / record-without-deposit; match multi-month prepayments by summing amounts near the deposit date.
3. Gap Jul2025–Jun2026: use BOTH real-time alerts AND monthly PDF bank statements (cross-check) = option C.
4. Deposits are almost always owner payments. "Transfer from DDA Acct No. ####" = homeowners who also bank at Heartland (treat as OWNER payments, not internal transfers).

## NEXT STEPS (in order)
1. Implement multi-type parsing + dedup in backend `gmail_sync` (server.py ~line 1495) and parser helpers (~line 1373). Broaden Gmail query from `subject:"Transaction Alert"` to all hbtbank financial types; route by subject; dedup against existing gmail_alerts by (amount,kind,date±1). Re-sync.
2. Build reconciliation view (frontend page + backend endpoint) comparing deposits vs fee_payments for a chosen period.
3. Ingest the gap-period PDF bank statements via existing Bank Reconcile tool (asset: 260529_HB&T.pdf = May 2026 statement). Ask user to upload the rest of the missing months.
4. THEN the fee-shortfall feature (see below).

## DEFERRED: fee-shortfall feature (approved, not yet built)
- Sync 2026 `amount_due` -> each unit's current `monthly_fee` (true 2026 rate). BEFORE/AFTER shown; true rate shortfall on already-paid months = $780 total (607 Jeff=$144, most others ~$66-72). NOT YET APPLIED.
- Add balance-aware display: "Short $X" when amount_paid<amount_due; running per-owner balance.
- Late fees stay MANUAL (never auto-applied to rate shortfalls) — user assesses case by case.
- "Record make-up payment" action: one check amount spread across a month range to clear shortfall (most owners pay the difference to apply across whole prepay period; ~1 owner waits till end).
- Import 31 spreadsheet cell-comment notes onto matching fee_payment rows (first month of each range). Notes contain check #s, "wire transfer $600 for May-Oct", "PIF thru 12/31", etc.

## DATA CHANGES MADE THIS SESSION (for awareness)
- $288 deposit alert (2026-07-03) marked recorded=True.
- 3 fee_payments created for Chuck Lough (615): 2026-07/08/09 @ $96 (from earlier Record test). These are legit.
- No other DB mutations.

## KEY ASSETS (job artifacts, re-downloadable)
- Spreadsheet: https://customer-assets.emergentagent.com/job_assoc-admin-3/artifacts/jipdz4dy_Copy%20of%20Innsbruck%201%20Fees%20%26%20Assessments.xlsx
  (sheets: Contact List, "Mo. Fees Log", Paid Expenses, Budget, "Fee Incr. Calc.")
  Mo. Fees Log blocks: 2023=rows3-12, 2024=16-25, 2025=32-41, 2026=48-57; cols F(6)=Jan..Q(17)=Dec; cell value=date received; cell COMMENT=note. Col B=address, D=amt due, E=owner.
- Bank statement PDF (May 2026): https://customer-assets.emergentagent.com/job_e8987f5b-caf8-4a1c-b30b-b4e7ee06c37b/artifacts/x6koqz5z_260529_HB%26T.pdf

## Current unit rates (monthly_fee) for reference
601 Allie Roe 120 | 603 Jay Barlow 120 | 605 John Eden 96 | 607 Jeff Johnson 138 | 609 Bill Mensch 138 | 611 Frank Bennett 138 | 613 Earl Rogers 138 | 615 Chuck Lough 96 | 617 Carol&Maurie Schennum 120 | 619 Sarah Schabow 120
