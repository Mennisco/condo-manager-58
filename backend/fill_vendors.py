"""Best-effort: fill the Vendor field on imported expenses by matching known
vendor names found in the embedded notes. Only sets vendor when a clear name
matches; leaves the full note text intact."""
import os
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(Path(__file__).parent / ".env")
c = MongoClient(os.environ["MONGO_URL"])
db = c[os.environ["DB_NAME"]]

# (substring to look for in note, canonical vendor name)
PATTERNS = [
    ("elm city", "Elm City Lawn"),
    ("best quality seal", "Best Quality Seal Coating"),
    ("brite-way", "Brad's Brite-Way"),
    ("brad's brite", "Brad's Brite-Way"),
    ("ellburg", "Ellburg P&H"),
    ("ellsberg", "Ellsberg Plumbing"),
    ("bill kaiser", "Bill Kaiser Painting"),
    ("dan lederberger", "Dan Lederberger"),
    ("taylor spraying", "Taylor Spraying"),
]

updated = 0
hits = {}
for e in db.expenses.find({"source": "xlsx_paid_expenses"}):
    if e.get("vendor"):
        continue
    note = (e.get("notes") or "").lower()
    if not note or note == "imported from spreadsheet":
        continue
    for sub, vendor in PATTERNS:
        if sub in note:
            db.expenses.update_one({"_id": e["_id"]}, {"$set": {"vendor": vendor}})
            updated += 1
            hits[vendor] = hits.get(vendor, 0) + 1
            break

print(f"vendor filled on {updated} expenses")
for v, n in sorted(hits.items(), key=lambda x: -x[1]):
    print(f"  {v}: {n}")
