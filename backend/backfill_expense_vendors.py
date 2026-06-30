"""Back-fill vendor on historical expenses where the vendor is blank, for
categories with one clear directory vendor. Mowing/Snow Removal split by date:
KS Lawn and Snow before 2026-03-01, JC Land Services from 2026-03-01."""
import os
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(Path(__file__).parent / ".env")
c = MongoClient(os.environ["MONGO_URL"])
db = c[os.environ["DB_NAME"]]

SIMPLE = {
    "Utilities": "City of Princeton",
    "Trash Removal": "Republic Services",
    "Insurance": "Honeycomb Insurance",
}
SPLIT_CATS = {"Mowing", "Snow Removal"}
CUTOFF = "2026-03-01"

updated = {}
for e in db.expenses.find({"$or": [{"vendor": None}, {"vendor": ""}]}):
    cat = e.get("category")
    vendor = None
    if cat in SIMPLE:
        vendor = SIMPLE[cat]
    elif cat in SPLIT_CATS:
        vendor = "KS Lawn and Snow" if (e.get("date") or "") < CUTOFF else "JC Land Services"
    if vendor:
        db.expenses.update_one({"_id": e["_id"]}, {"$set": {"vendor": vendor}})
        updated[vendor] = updated.get(vendor, 0) + 1

print("back-filled vendors:")
for v, n in sorted(updated.items(), key=lambda x: -x[1]):
    print(f"  {v}: {n}")
remaining = db.expenses.count_documents({"$or": [{"vendor": None}, {"vendor": ""}]})
print("expenses still without vendor:", remaining)
