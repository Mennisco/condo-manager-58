import asyncio, os
from dotenv import load_dotenv
load_dotenv()
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    c = AsyncIOMotorClient(os.environ["MONGO_URL"]); db = c[os.environ["DB_NAME"]]
    # Bank alert credits (deposits)
    credits = [a async for a in db.gmail_alerts.find({"kind": "credit"}).sort("txn_date", 1)]
    debits = [a async for a in db.gmail_alerts.find({"kind": "withdrawal"}).sort("txn_date", 1)]
    print(f"Bank alerts: {len(credits)} deposits, {len(debits)} debits")
    cmin = credits[0]["txn_date"] if credits else None
    cmax = credits[-1]["txn_date"] if credits else None
    print(f"Deposit date range: {cmin} .. {cmax}")
    tot_dep = round(sum(a["amount"] for a in credits), 2)
    print(f"Total deposits (alerts): ${tot_dep}")

    # Fee payments with paid_date in the alert window
    units = {str(u["_id"]): u for u in [x async for x in db.units.find()]}
    fps = [f async for f in db.fee_payments.find({"paid": True, "paid_date": {"$ne": None}})]
    def dstr(f):
        pd = f.get("paid_date"); 
        return str(pd)[:10] if pd else None
    in_window = [f for f in fps if dstr(f) and cmin[:10] <= dstr(f) <= cmax[:10]]
    tot_fp = round(sum(float(f.get("amount_paid",0) or 0) for f in in_window), 2)
    print(f"Fee payments with paid_date in window: {len(in_window)} rows, sum ${tot_fp}")

    print("\n--- DEPOSITS (each) with recorded flag ---")
    for a in credits:
        print(f"  {a['txn_date']} ${a['amount']:>8} recorded={a.get('recorded',False)!s:<5} {a['description'][:45]}")

asyncio.run(main())
