import asyncio, os
from dotenv import load_dotenv
load_dotenv()
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    c = AsyncIOMotorClient(os.environ["MONGO_URL"]); db = c[os.environ["DB_NAME"]]
    units = [u async for u in db.units.find()]
    units.sort(key=lambda u: u["unit_number"])
    print(f"{'Unit':<6}{'Owner':<26}{'CurRate':>8}{'OldDue26':>9}{'PaidYr':>9}{'NewDueYr':>9}{'ShortYr':>9}")
    grand = 0.0
    for u in units:
        rows = [f async for f in db.fee_payments.find({"unit_id": str(u["_id"]), "period_year": 2026})]
        rate = float(u.get("monthly_fee", 0) or 0)
        old_dues = sorted(set(round(float(f.get("amount_due", 0) or 0), 2) for f in rows))
        paid_yr = round(sum(float(f.get("amount_paid", 0) or 0) for f in rows), 2)
        new_due_yr = round(rate * len(rows), 2)
        short = round(new_due_yr - paid_yr, 2)
        grand += short
        old_str = "/".join(str(x) for x in old_dues)
        print(f"{u['unit_number']:<6}{(u['owner_name'] or '')[:24]:<26}{rate:>8}{old_str:>9}{paid_yr:>9}{new_due_yr:>9}{short:>9}")
    print("-"*76)
    print(f"{'TOTAL 2026 shortfall across all units if synced to current rates:':<67}{round(grand,2):>9}")

asyncio.run(main())
