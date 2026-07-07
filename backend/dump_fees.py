import asyncio, os
from dotenv import load_dotenv
load_dotenv()
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    c = AsyncIOMotorClient(os.environ["MONGO_URL"]); db = c[os.environ["DB_NAME"]]
    for addr in ["607", "613", "617"]:
        u = await db.units.find_one({"unit_number": addr})
        print("="*60)
        print(f"Unit {addr} · {u['owner_name']} · monthly_fee={u.get('monthly_fee')} · id={u['_id']}")
        rows = [f async for f in db.fee_payments.find({"unit_id": str(u["_id"])}).sort([("period_year",1),("period_month",1)])]
        for f in rows:
            print(f"  {f['period_year']}-{f['period_month']:02d} paid={f.get('paid')} amt_paid={f.get('amount_paid')} paid_date={f.get('paid_date')} notes={f.get('notes')!r}")
        print(f"  total rows: {len(rows)}")

asyncio.run(main())
