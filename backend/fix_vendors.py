"""Apply user's vendor corrections to expense vendor fields, and add the
named vendors to the Vendors directory with expense categories."""
import os
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(Path(__file__).parent / ".env")
c = MongoClient(os.environ["MONGO_URL"])
db = c[os.environ["DB_NAME"]]


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# 1) Correct vendor text on expenses (consolidate Elberg spellings, rename Taylor)
renames = {
    "Ellburg P&H": "Elberg Plumbing & HVAC",
    "Ellsberg Plumbing": "Elberg Plumbing & HVAC",
    "Taylor Spraying": "Taylor's Way Lawncare",
}
for old, new in renames.items():
    r = db.expenses.update_many({"vendor": old}, {"$set": {"vendor": new}})
    print(f"expenses '{old}' -> '{new}': {r.modified_count}")

# 2) Add vendors to the directory (idempotent by name). (name, category, service)
vendors = [
    ("Elberg Plumbing & HVAC", "Maintenance", "Plumbing & HVAC"),
    ("Taylor's Way Lawncare", "Landscaping", "Lawn care & spraying"),
    ("City of Princeton", "Utilities", "Municipal utilities"),
    ("KS Lawn and Snow", "", "Lawn & snow"),
    ("JC Land Services", "Mowing", "Mowing & snow removal"),
    ("Republic Services", "Trash Removal", "Trash & recycling"),
    ("Honeycomb Insurance", "Insurance", "Association insurance"),
]
added = 0
for name, category, service in vendors:
    if db.vendors.find_one({"name": name}):
        print(f"vendor exists, skipping: {name}")
        continue
    db.vendors.insert_one({
        "name": name,
        "service": service,
        "category": category,
        "contact_name": None,
        "email": None,
        "phone": None,
        "notes": None,
        "created_at": now_iso(),
    })
    added += 1
print(f"vendors added: {added}")
print("directory now:", [v["name"] for v in db.vendors.find().sort("name", 1)])
