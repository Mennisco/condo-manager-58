# RESUME NOTE — Bank Reconciliation (paused, pick up next session)

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
