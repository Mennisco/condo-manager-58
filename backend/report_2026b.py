import asyncio, os
from dotenv import load_dotenv
load_dotenv()
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    c = AsyncIOMotorClient(os.environ["MONGO_URL"]); db = c[os.environ["DB_NAME"]]
    units = [u async for u in db.units.find()]
    units.sort(key=lambda u: u["unit_number"])
    print(f"{'Unit':<6}{'Owner':<22}{'Rate':>6}{'PaidMos':>8}{'PaidSum':>9}{'Expect':>8}{'RateShort':>10}{'UnpaidMos':>10}")
    grand = 0.0
    for u in units:
        rows = [f async for f in db.fee_payments.find({"unit_id": str(u["_id"]), "period_year": 2026})]
        rate = float(u.get("monthly_fee", 0) or 0)
        paid_rows = [f for f in rows if f.get("paid")]
        paid_mos = len(paid_rows)
        paid_sum = round(sum(float(f.get("amount_paid", 0) or 0) for f in paid_rows), 2)
        expect = round(rate * paid_mos, 2)
        short = round(expect - paid_sum, 2)
        unpaid = len(rows) - paid_mos
        grand += short
        print(f"{u['unit_number']:<6}{(u['owner_name'] or '')[:20]:<22}{rate:>6}{paid_mos:>8}{paid_sum:>9}{expect:>8}{short:>10}{unpaid:>10}")
    print("-"*79)
    print(f"TRUE 2026 rate shortfall (on already-paid months, to collect via make-up): ${round(grand,2)}")

asyncio.run(main())
