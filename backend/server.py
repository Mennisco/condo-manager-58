from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Annotated, Any

import bcrypt
import jwt
from bson import ObjectId
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, EmailStr, Field, BeforeValidator

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
ACCESS_MIN = 60 * 12  # 12h (small internal app)
REFRESH_DAYS = 7

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Innsbruck One Manager")
api = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("condo")

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
def _oid(v: Any) -> str:
    if isinstance(v, ObjectId):
        return str(v)
    return str(v)

PyObjectId = Annotated[str, BeforeValidator(_oid)]


class BaseDoc(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    @classmethod
    def from_mongo(cls, doc):
        if not doc:
            return None
        doc = dict(doc)
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])
        return cls(**doc)


class UserPublic(BaseDoc):
    email: EmailStr
    name: str
    role: str = "admin"
    created_at: Optional[str] = None


class LoginReq(BaseModel):
    email: EmailStr
    password: str


class RegisterReq(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "admin"


class Unit(BaseDoc):
    unit_number: str
    owner_name: str
    owner_email: Optional[str] = None
    owner_phone: Optional[str] = None
    monthly_fee: float = 0.0
    late_fee: float = 0.0
    ownership_pct: float = 0.0
    notes: Optional[str] = None
    created_at: Optional[str] = None


class UnitIn(BaseModel):
    unit_number: str
    owner_name: str
    owner_email: Optional[str] = None
    owner_phone: Optional[str] = None
    monthly_fee: float = 0.0
    late_fee: float = 0.0
    ownership_pct: float = 0.0
    notes: Optional[str] = None


class ApplyFeeRow(BaseModel):
    unit_id: str
    monthly_fee: float
    late_fee: float


class FeePayment(BaseDoc):
    unit_id: str
    unit_number: str
    owner_name: str
    period_year: int
    period_month: int  # 1-12
    amount_due: float
    amount_paid: float = 0.0
    paid: bool = False
    paid_date: Optional[str] = None
    method: Optional[str] = None  # check / zelle / cash / other
    late_fee_waived: bool = False
    notes: Optional[str] = None
    created_at: Optional[str] = None


class FeePaymentIn(BaseModel):
    unit_id: str
    period_year: int
    period_month: int
    amount_due: float
    amount_paid: float = 0.0
    paid: bool = False
    paid_date: Optional[str] = None
    method: Optional[str] = None
    late_fee_waived: bool = False
    notes: Optional[str] = None


class Expense(BaseDoc):
    date: str  # ISO date
    category: str
    vendor: Optional[str] = None
    description: str
    amount: float
    method: Optional[str] = None
    date_paid: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None


class ExpenseIn(BaseModel):
    date: str
    category: str
    vendor: Optional[str] = None
    description: str
    amount: float
    method: Optional[str] = None
    date_paid: Optional[str] = None
    notes: Optional[str] = None


class BudgetItem(BaseDoc):
    year: int
    category: str
    budgeted_amount: float
    notes: Optional[str] = None
    created_at: Optional[str] = None


class BudgetItemIn(BaseModel):
    year: int
    category: str
    budgeted_amount: float
    notes: Optional[str] = None


class Vendor(BaseDoc):
    name: str
    service: Optional[str] = None
    categories: List[str] = []
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None


class VendorIn(BaseModel):
    name: str
    service: Optional[str] = None
    categories: List[str] = []
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None


class CommLog(BaseDoc):
    date: str
    direction: str  # incoming / outgoing
    audience: str  # vendor / homeowner
    contact: str  # name or unit
    subject: str
    body: str
    follow_up_date: Optional[str] = None
    resolved: bool = False
    created_at: Optional[str] = None


class CommLogIn(BaseModel):
    date: str
    direction: str
    audience: str
    contact: str
    subject: str
    body: str
    follow_up_date: Optional[str] = None
    resolved: bool = False


class ComplianceTask(BaseDoc):
    title: str
    category: str  # IRS / IL_NFP / Internal
    due_date: Optional[str] = None
    year: int
    completed: bool = False
    completed_date: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None


class ComplianceTaskIn(BaseModel):
    title: str
    category: str
    due_date: Optional[str] = None
    year: int
    completed: bool = False
    completed_date: Optional[str] = None
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_access_token(uid: str, email: str) -> str:
    payload = {
        "sub": uid,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_MIN),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def create_refresh_token(uid: str) -> str:
    payload = {
        "sub": uid,
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_DAYS),
        "type": "refresh",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def set_auth_cookies(resp: Response, access: str, refresh: str):
    resp.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=ACCESS_MIN * 60, path="/")
    resp.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=REFRESH_DAYS * 86400, path="/")


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------
@api.post("/auth/login")
async def login(req: LoginReq, response: Response):
    email = req.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    uid = str(user["_id"])
    access = create_access_token(uid, email)
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    return {"id": uid, "email": email, "name": user["name"], "role": user.get("role", "admin"), "access_token": access}


@api.post("/auth/logout")
async def logout(response: Response, user=Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return {"id": user["_id"], "email": user["email"], "name": user["name"], "role": user.get("role", "admin")}


@api.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    rt = request.cookies.get("refresh_token")
    if not rt:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(rt, JWT_SECRET, algorithms=[JWT_ALG])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(str(user["_id"]), user["email"])
        response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=ACCESS_MIN * 60, path="/")
        return {"ok": True}
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@api.post("/auth/register")
async def register(req: RegisterReq, user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    email = req.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {
        "email": email,
        "password_hash": hash_password(req.password),
        "name": req.name,
        "role": req.role or "admin",
        "created_at": now_iso(),
    }
    res = await db.users.insert_one(doc)
    return {"id": str(res.inserted_id), "email": email, "name": req.name, "role": doc["role"]}


@api.get("/auth/users")
async def list_users(user=Depends(get_current_user)):
    out = []
    async for u in db.users.find().sort("created_at", 1):
        out.append({
            "id": str(u["_id"]),
            "email": u["email"],
            "name": u["name"],
            "role": u.get("role", "admin"),
            "created_at": u.get("created_at"),
        })
    return out


@api.delete("/auth/users/{user_id}")
async def delete_user(user_id: str, user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    if user_id == user["_id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    await db.users.delete_one({"_id": ObjectId(user_id)})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _ser(doc):
    if not doc:
        return doc
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    return doc


# ---------------------------------------------------------------------------
# Units
# ---------------------------------------------------------------------------
@api.get("/units")
async def list_units(user=Depends(get_current_user)):
    out = []
    async for u in db.units.find().sort("unit_number", 1):
        out.append(_ser(u))
    return out


@api.post("/units")
async def create_unit(data: UnitIn, user=Depends(get_current_user)):
    doc = data.model_dump()
    doc["created_at"] = now_iso()
    res = await db.units.insert_one(doc)
    return _ser(await db.units.find_one({"_id": res.inserted_id}))


@api.put("/units/{unit_id}")
async def update_unit(unit_id: str, data: UnitIn, user=Depends(get_current_user)):
    await db.units.update_one({"_id": ObjectId(unit_id)}, {"$set": data.model_dump()})
    return _ser(await db.units.find_one({"_id": ObjectId(unit_id)}))


@api.delete("/units/{unit_id}")
async def delete_unit(unit_id: str, user=Depends(get_current_user)):
    await db.units.delete_one({"_id": ObjectId(unit_id)})
    return {"ok": True}


@api.post("/units/apply-fees")
async def apply_fees(rows: List[ApplyFeeRow], user=Depends(get_current_user)):
    """Apply new monthly fee + late fee to units (from the Fee Increase Worksheet)."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admins only")
    n = 0
    for r in rows:
        await db.units.update_one(
            {"_id": ObjectId(r.unit_id)},
            {"$set": {"monthly_fee": round(r.monthly_fee, 2), "late_fee": round(r.late_fee, 2)}},
        )
        n += 1
    return {"updated": n}


# ---------------------------------------------------------------------------
# Fee payments
# ---------------------------------------------------------------------------
@api.get("/fees")
async def list_fees(year: Optional[int] = None, month: Optional[int] = None, user=Depends(get_current_user)):
    q = {}
    if year is not None:
        q["period_year"] = year
    if month is not None:
        q["period_month"] = month
    out = []
    async for f in db.fee_payments.find(q).sort([("period_year", -1), ("period_month", -1), ("unit_number", 1)]):
        out.append(_ser(f))
    # Late-fee enrichment: a unit's late fee applies if a month's payment isn't made
    # by the 10th of that month (and hasn't been waived).
    late_map = {}
    async for u in db.units.find({}, {"late_fee": 1}):
        late_map[str(u["_id"])] = float(u.get("late_fee", 0) or 0)
    today = datetime.now(timezone.utc).date()
    for r in out:
        lf = late_map.get(r["unit_id"], 0.0)
        r["late_fee"] = lf
        applies = False
        if lf > 0 and not r.get("late_fee_waived"):
            due_by = datetime(r["period_year"], r["period_month"], 10).date()
            if r.get("paid") and r.get("paid_date"):
                try:
                    pd = datetime.fromisoformat(r["paid_date"].replace("Z", "+00:00")).date()
                    applies = pd > due_by
                except Exception:
                    applies = False
            elif not r.get("paid"):
                applies = today > due_by
        r["late_fee_applied"] = applies
        r["total_due"] = round(float(r.get("amount_due", 0)) + (lf if applies else 0.0), 2)
    # Mark prepaid: paid rows whose (unit_id, paid_date) is shared by >1 row anywhere
    paid_keys = [(r["unit_id"], r.get("paid_date")) for r in out if r.get("paid") and r.get("paid_date")]
    if paid_keys:
        # Count occurrences across the entire collection (not just the current filter)
        unique_keys = set(paid_keys)
        for uid, pd in unique_keys:
            cnt = await db.fee_payments.count_documents({"unit_id": uid, "paid_date": pd, "paid": True})
            if cnt > 1:
                for r in out:
                    if r["unit_id"] == uid and r.get("paid_date") == pd:
                        r["prepaid"] = True
                        r["prepayment_months"] = cnt
    return out


@api.post("/fees/generate")
async def generate_fees(year: int, month: int, user=Depends(get_current_user)):
    """Create a fee record per unit for the given month (idempotent)."""
    created = 0
    async for u in db.units.find():
        exists = await db.fee_payments.find_one(
            {"unit_id": str(u["_id"]), "period_year": year, "period_month": month}
        )
        if exists:
            continue
        doc = {
            "unit_id": str(u["_id"]),
            "unit_number": u["unit_number"],
            "owner_name": u["owner_name"],
            "period_year": year,
            "period_month": month,
            "amount_due": float(u.get("monthly_fee", 0)),
            "amount_paid": 0.0,
            "paid": False,
            "paid_date": None,
            "method": None,
            "notes": None,
            "created_at": now_iso(),
        }
        await db.fee_payments.insert_one(doc)
        created += 1
    return {"created": created}


@api.post("/fees")
async def create_fee(data: FeePaymentIn, user=Depends(get_current_user)):
    unit = await db.units.find_one({"_id": ObjectId(data.unit_id)})
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    doc = data.model_dump()
    doc["unit_number"] = unit["unit_number"]
    doc["owner_name"] = unit["owner_name"]
    doc["created_at"] = now_iso()
    res = await db.fee_payments.insert_one(doc)
    return _ser(await db.fee_payments.find_one({"_id": res.inserted_id}))


@api.put("/fees/{fee_id}")
async def update_fee(fee_id: str, data: dict, user=Depends(get_current_user)):
    allowed = {"amount_due", "amount_paid", "paid", "paid_date", "method", "late_fee_waived", "notes"}
    update = {k: v for k, v in data.items() if k in allowed}
    if "paid" in update and update["paid"] and not update.get("paid_date"):
        update["paid_date"] = now_iso()
    await db.fee_payments.update_one({"_id": ObjectId(fee_id)}, {"$set": update})
    return _ser(await db.fee_payments.find_one({"_id": ObjectId(fee_id)}))


@api.delete("/fees/{fee_id}")
async def delete_fee(fee_id: str, user=Depends(get_current_user)):
    await db.fee_payments.delete_one({"_id": ObjectId(fee_id)})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Expenses
# ---------------------------------------------------------------------------
@api.get("/expenses")
async def list_expenses(year: Optional[int] = None, user=Depends(get_current_user)):
    q = {}
    if year is not None:
        q["date"] = {"$gte": f"{year}-01-01", "$lte": f"{year}-12-31"}
    out = []
    async for e in db.expenses.find(q).sort("date", -1):
        out.append(_ser(e))
    return out


@api.post("/expenses")
async def create_expense(data: ExpenseIn, user=Depends(get_current_user)):
    doc = data.model_dump()
    doc["created_at"] = now_iso()
    res = await db.expenses.insert_one(doc)
    return _ser(await db.expenses.find_one({"_id": res.inserted_id}))


@api.put("/expenses/{eid}")
async def update_expense(eid: str, data: ExpenseIn, user=Depends(get_current_user)):
    await db.expenses.update_one({"_id": ObjectId(eid)}, {"$set": data.model_dump()})
    return _ser(await db.expenses.find_one({"_id": ObjectId(eid)}))


@api.delete("/expenses/{eid}")
async def delete_expense(eid: str, user=Depends(get_current_user)):
    await db.expenses.delete_one({"_id": ObjectId(eid)})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Budget
# ---------------------------------------------------------------------------
@api.get("/budget")
async def list_budget(year: int, user=Depends(get_current_user)):
    out = []
    async for b in db.budget_items.find({"year": year}).sort("category", 1):
        out.append(_ser(b))
    return out


@api.post("/budget")
async def create_budget(data: BudgetItemIn, user=Depends(get_current_user)):
    doc = data.model_dump()
    doc["created_at"] = now_iso()
    res = await db.budget_items.insert_one(doc)
    return _ser(await db.budget_items.find_one({"_id": res.inserted_id}))


@api.put("/budget/{bid}")
async def update_budget(bid: str, data: BudgetItemIn, user=Depends(get_current_user)):
    await db.budget_items.update_one({"_id": ObjectId(bid)}, {"$set": data.model_dump()})
    return _ser(await db.budget_items.find_one({"_id": ObjectId(bid)}))


@api.delete("/budget/{bid}")
async def delete_budget(bid: str, user=Depends(get_current_user)):
    await db.budget_items.delete_one({"_id": ObjectId(bid)})
    return {"ok": True}


@api.post("/budget/generate-from-prior")
async def generate_budget_from_prior(target_year: int, source_year: int, uplift_pct: float = 0.0, user=Depends(get_current_user)):
    """Generate a budget for target_year using totals from source_year expenses (+ optional uplift %)."""
    # Aggregate prior-year by category
    pipeline = [
        {"$match": {"date": {"$gte": f"{source_year}-01-01", "$lte": f"{source_year}-12-31"}}},
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}},
    ]
    agg = await db.expenses.aggregate(pipeline).to_list(1000)
    if not agg:
        return {"created": 0, "message": "No expenses found for source year"}
    multiplier = 1 + (uplift_pct / 100.0)
    created = 0
    for row in agg:
        category = row["_id"] or "Uncategorized"
        amount = round(row["total"] * multiplier, 2)
        existing = await db.budget_items.find_one({"year": target_year, "category": category})
        if existing:
            await db.budget_items.update_one(
                {"_id": existing["_id"]}, {"$set": {"budgeted_amount": amount, "notes": f"From {source_year} +{uplift_pct}%"}}
            )
        else:
            await db.budget_items.insert_one({
                "year": target_year,
                "category": category,
                "budgeted_amount": amount,
                "notes": f"From {source_year} +{uplift_pct}%",
                "created_at": now_iso(),
            })
            created += 1
    return {"created": created, "categories": len(agg)}


# ---------------------------------------------------------------------------
# Vendors
# ---------------------------------------------------------------------------
@api.get("/vendors")
async def list_vendors(user=Depends(get_current_user)):
    out = []
    async for v in db.vendors.find().sort("name", 1):
        out.append(_ser(v))
    return out


@api.post("/vendors")
async def create_vendor(data: VendorIn, user=Depends(get_current_user)):
    doc = data.model_dump()
    doc["created_at"] = now_iso()
    res = await db.vendors.insert_one(doc)
    return _ser(await db.vendors.find_one({"_id": res.inserted_id}))


@api.put("/vendors/{vid}")
async def update_vendor(vid: str, data: VendorIn, user=Depends(get_current_user)):
    await db.vendors.update_one({"_id": ObjectId(vid)}, {"$set": data.model_dump()})
    return _ser(await db.vendors.find_one({"_id": ObjectId(vid)}))


@api.delete("/vendors/{vid}")
async def delete_vendor(vid: str, user=Depends(get_current_user)):
    await db.vendors.delete_one({"_id": ObjectId(vid)})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Communications log
# ---------------------------------------------------------------------------
@api.get("/communications")
async def list_comms(audience: Optional[str] = None, user=Depends(get_current_user)):
    q = {}
    if audience:
        q["audience"] = audience
    out = []
    async for c in db.communications.find(q).sort("date", -1):
        out.append(_ser(c))
    return out


@api.post("/communications")
async def create_comm(data: CommLogIn, user=Depends(get_current_user)):
    doc = data.model_dump()
    doc["created_at"] = now_iso()
    res = await db.communications.insert_one(doc)
    return _ser(await db.communications.find_one({"_id": res.inserted_id}))


@api.put("/communications/{cid}")
async def update_comm(cid: str, data: CommLogIn, user=Depends(get_current_user)):
    await db.communications.update_one({"_id": ObjectId(cid)}, {"$set": data.model_dump()})
    return _ser(await db.communications.find_one({"_id": ObjectId(cid)}))


@api.delete("/communications/{cid}")
async def delete_comm(cid: str, user=Depends(get_current_user)):
    await db.communications.delete_one({"_id": ObjectId(cid)})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Compliance tasks
# ---------------------------------------------------------------------------
DEFAULT_TASKS = [
    # IL NFP annual report
    {"title": "File Illinois Annual Report (Form NFP 114.05)", "category": "IL_NFP",
     "due_hint": "Due before the first day of the month of incorporation anniversary"},
    {"title": "Pay Illinois Annual Report fee ($10)", "category": "IL_NFP"},
    {"title": "Confirm Registered Agent & Office address on file with IL SOS", "category": "IL_NFP"},
    {"title": "Update officers/directors list with IL SOS", "category": "IL_NFP"},
    # IRS
    {"title": "Determine filing: IRS Form 1120-H (HOA) vs Form 990/990-EZ", "category": "IRS"},
    {"title": "Compile income vs expense statement for tax year", "category": "IRS"},
    {"title": "Verify 60% of gross income is exempt function income (1120-H test)", "category": "IRS"},
    {"title": "Verify 90% of expenses are exempt function expenses (1120-H test)", "category": "IRS"},
    {"title": "File IRS return by due date (Form 1120-H: 15th day of 4th month after year-end)", "category": "IRS"},
    # Internal
    {"title": "Hold annual board meeting & record minutes", "category": "Internal"},
    {"title": "Distribute annual budget to homeowners", "category": "Internal"},
    {"title": "Reconcile bank statements with ledger", "category": "Internal"},
    {"title": "Renew association insurance policy", "category": "Internal"},
]


@api.get("/compliance")
async def list_compliance(year: int, user=Depends(get_current_user)):
    out = []
    async for t in db.compliance_tasks.find({"year": year}).sort([("category", 1), ("title", 1)]):
        out.append(_ser(t))
    return out


@api.post("/compliance/seed")
async def seed_compliance(year: int, user=Depends(get_current_user)):
    created = 0
    for t in DEFAULT_TASKS:
        exists = await db.compliance_tasks.find_one({"year": year, "title": t["title"]})
        if exists:
            continue
        await db.compliance_tasks.insert_one({
            "title": t["title"],
            "category": t["category"],
            "due_date": None,
            "year": year,
            "completed": False,
            "completed_date": None,
            "notes": t.get("due_hint"),
            "created_at": now_iso(),
        })
        created += 1
    return {"created": created}


@api.post("/compliance")
async def create_compliance(data: ComplianceTaskIn, user=Depends(get_current_user)):
    doc = data.model_dump()
    doc["created_at"] = now_iso()
    res = await db.compliance_tasks.insert_one(doc)
    return _ser(await db.compliance_tasks.find_one({"_id": res.inserted_id}))


@api.put("/compliance/{tid}")
async def update_compliance(tid: str, data: dict, user=Depends(get_current_user)):
    allowed = {"title", "category", "due_date", "year", "completed", "completed_date", "notes"}
    update = {k: v for k, v in data.items() if k in allowed}
    if "completed" in update and update["completed"] and not update.get("completed_date"):
        update["completed_date"] = now_iso()
    await db.compliance_tasks.update_one({"_id": ObjectId(tid)}, {"$set": update})
    return _ser(await db.compliance_tasks.find_one({"_id": ObjectId(tid)}))


@api.delete("/compliance/{tid}")
async def delete_compliance(tid: str, user=Depends(get_current_user)):
    await db.compliance_tasks.delete_one({"_id": ObjectId(tid)})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Dashboard & Reports
# ---------------------------------------------------------------------------
@api.get("/dashboard/summary")
async def dashboard_summary(year: Optional[int] = None, user=Depends(get_current_user)):
    y = year or datetime.now(timezone.utc).year
    # Income (fees paid) ytd
    income_agg = await db.fee_payments.aggregate([
        {"$match": {"period_year": y, "paid": True}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_paid"}}},
    ]).to_list(1)
    income = income_agg[0]["total"] if income_agg else 0.0

    # Expenses ytd
    exp_agg = await db.expenses.aggregate([
        {"$match": {"date": {"$gte": f"{y}-01-01", "$lte": f"{y}-12-31"}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]).to_list(1)
    expenses = exp_agg[0]["total"] if exp_agg else 0.0

    # Overdue: unpaid fees from past months in current year + earlier years
    now = datetime.now(timezone.utc)
    overdue_q = {
        "paid": False,
        "$or": [
            {"period_year": {"$lt": now.year}},
            {"period_year": now.year, "period_month": {"$lt": now.month}},
        ],
    }
    overdue_count = await db.fee_payments.count_documents(overdue_q)
    overdue_amount_agg = await db.fee_payments.aggregate([
        {"$match": overdue_q},
        {"$group": {"_id": None, "total": {"$sum": {"$subtract": ["$amount_due", "$amount_paid"]}}}},
    ]).to_list(1)
    overdue_amount = overdue_amount_agg[0]["total"] if overdue_amount_agg else 0.0

    units_count = await db.units.count_documents({})

    # Expenses by category for the year (chart data)
    by_cat = await db.expenses.aggregate([
        {"$match": {"date": {"$gte": f"{y}-01-01", "$lte": f"{y}-12-31"}}},
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}}},
        {"$sort": {"total": -1}},
    ]).to_list(100)
    expenses_by_category = [{"category": r["_id"] or "Uncategorized", "total": round(r["total"], 2)} for r in by_cat]

    # Monthly income vs expense for current year
    months = []
    for m in range(1, 13):
        inc = await db.fee_payments.aggregate([
            {"$match": {"period_year": y, "period_month": m, "paid": True}},
            {"$group": {"_id": None, "total": {"$sum": "$amount_paid"}}},
        ]).to_list(1)
        mstart = f"{y}-{m:02d}-01"
        mend = f"{y}-{m:02d}-31"
        exp = await db.expenses.aggregate([
            {"$match": {"date": {"$gte": mstart, "$lte": mend}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
        ]).to_list(1)
        months.append({
            "month": m,
            "income": round(inc[0]["total"], 2) if inc else 0.0,
            "expenses": round(exp[0]["total"], 2) if exp else 0.0,
        })

    return {
        "year": y,
        "ytd_income": round(income, 2),
        "ytd_expenses": round(expenses, 2),
        "balance_ytd": round(income - expenses, 2),
        "overdue_count": overdue_count,
        "overdue_amount": round(overdue_amount, 2),
        "units_count": units_count,
        "expenses_by_category": expenses_by_category,
        "monthly": months,
    }


@api.get("/dashboard/trends")
async def dashboard_trends(user=Depends(get_current_user)):
    """Multi-year trend: collected, expenses, on-time payment rate, late count."""
    years = set()
    async for f in db.fee_payments.find({}, {"period_year": 1}):
        years.add(f["period_year"])
    out = []
    for y in sorted(years):
        collected = 0.0
        paid_count = 0
        on_time = 0
        late = 0
        async for f in db.fee_payments.find({"period_year": y}):
            if not f.get("paid"):
                continue
            collected += float(f.get("amount_paid", 0) or 0)
            paid_count += 1
            pd = f.get("paid_date")
            if pd:
                try:
                    d = datetime.fromisoformat(pd.replace("Z", "+00:00")).date()
                    if d <= datetime(y, f["period_month"], 10).date():
                        on_time += 1
                    else:
                        late += 1
                except Exception:
                    pass
        exp_agg = await db.expenses.aggregate([
            {"$match": {"date": {"$gte": f"{y}-01-01", "$lte": f"{y}-12-31"}}},
            {"$group": {"_id": None, "t": {"$sum": "$amount"}}},
        ]).to_list(1)
        expenses = exp_agg[0]["t"] if exp_agg else 0.0
        out.append({
            "year": y,
            "collected": round(collected, 2),
            "expenses": round(expenses, 2),
            "paid_count": paid_count,
            "on_time_count": on_time,
            "late_count": late,
            "on_time_rate": round(on_time / paid_count * 100, 1) if paid_count else None,
        })
    return {"years": out[-4:]}


@api.get("/reports/pnl")
async def pnl(start: str, end: str, basis: str = "accrual", user=Depends(get_current_user)):
    """Profit & Loss for a date range. basis='accrual' recognizes dues in the
    month they cover (neutralizes prepayments); basis='cash' uses paid_date."""
    from datetime import date as _date
    sd = datetime.fromisoformat(start).date()
    ed = datetime.fromisoformat(end).date()
    months = max(1, (ed.year - sd.year) * 12 + (ed.month - sd.month) + 1)

    BUDGET_TO_EXPENSE = {
        "Mowing": "Mowing", "Snow Plowing": "Snow Removal", "Utilities": "Utilities",
        "HOA Insurance": "Insurance", "Tax accounting": "Bank/Accounting",
        "Landscaping/Spraying": "Landscaping", "Trash Removal": "Trash Removal",
        "Maintenance": "Maintenance", "Window washing": "Window Washing",
        "Reserve": "Reserve", "Major Capital Exp": "Maintenance",
    }

    fees_income = 0.0
    late_income = 0.0
    async for f in db.fee_payments.find({}):
        in_scope = False
        if basis == "cash":
            pd = f.get("paid_date")
            if f.get("paid") and pd:
                try:
                    d = datetime.fromisoformat(pd.replace("Z", "+00:00")).date()
                    if sd <= d <= ed:
                        in_scope = True
                        fees_income += float(f.get("amount_paid", 0) or 0)
                except Exception:
                    pass
        else:  # accrual / earned
            pdate = _date(f["period_year"], f["period_month"], 1)
            if sd <= pdate <= ed:
                in_scope = True
                fees_income += float(f.get("amount_due", 0) or 0)
        # late fees assessed within scope (applied + not waived)
        if in_scope and not f.get("late_fee_waived"):
            unit = await db.units.find_one({"_id": ObjectId(f["unit_id"])}, {"late_fee": 1}) if f.get("unit_id") else None
            lf = float(unit.get("late_fee", 0) or 0) if unit else 0.0
            if lf > 0:
                due_by = _date(f["period_year"], f["period_month"], 10)
                applied = False
                pd = f.get("paid_date")
                if f.get("paid") and pd:
                    try:
                        d = datetime.fromisoformat(pd.replace("Z", "+00:00")).date()
                        applied = d > due_by
                    except Exception:
                        applied = False
                elif not f.get("paid"):
                    applied = datetime.now(timezone.utc).date() > due_by
                if applied:
                    late_income += lf

    exp_by_cat = {}
    async for e in db.expenses.find({"date": {"$gte": start, "$lte": end}}):
        c = e.get("category") or "Other"
        exp_by_cat[c] = exp_by_cat.get(c, 0.0) + float(e.get("amount", 0) or 0)

    budget_by_cat = {}
    async for b in db.budget_items.find({"year": ed.year}):
        mapped = BUDGET_TO_EXPENSE.get(b["category"], b["category"])
        budget_by_cat[mapped] = budget_by_cat.get(mapped, 0.0) + float(b.get("budgeted_amount", 0) or 0) * months / 12.0

    cats = sorted(set(list(exp_by_cat.keys()) + list(budget_by_cat.keys())))
    expense_lines = [{
        "category": c,
        "actual": round(exp_by_cat.get(c, 0.0), 2),
        "budget": round(budget_by_cat.get(c, 0.0), 2),
        "variance": round(budget_by_cat.get(c, 0.0) - exp_by_cat.get(c, 0.0), 2),
    } for c in cats]

    total_exp = round(sum(exp_by_cat.values()), 2)
    total_budget = round(sum(budget_by_cat.values()), 2)
    total_income = round(fees_income + late_income, 2)
    return {
        "start": start, "end": end, "basis": basis, "months": months,
        "income": {"fees": round(fees_income, 2), "late_fees": round(late_income, 2), "total": total_income},
        "expense_lines": expense_lines,
        "total_expenses": total_exp,
        "total_budget": total_budget,
        "net_income": round(total_income - total_exp, 2),
    }


@api.get("/reports/annual")
async def annual_report(year: int, user=Depends(get_current_user)):
    """Return a structured annual report for printing/exporting."""
    summary = await dashboard_summary(year=year, user=user)
    expenses = []
    async for e in db.expenses.find({"date": {"$gte": f"{year}-01-01", "$lte": f"{year}-12-31"}}).sort("date", 1):
        expenses.append(_ser(e))
    fees = []
    async for f in db.fee_payments.find({"period_year": year}).sort([("period_month", 1), ("unit_number", 1)]):
        fees.append(_ser(f))
    budget = []
    async for b in db.budget_items.find({"year": year}).sort("category", 1):
        budget.append(_ser(b))
    return {
        "year": year,
        "association_name": os.environ.get("ASSOCIATION_NAME", "Condo Association"),
        "summary": summary,
        "expenses": expenses,
        "fees": fees,
        "budget": budget,
        "generated_at": now_iso(),
    }


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@api.get("/")
async def root():
    return {"status": "ok", "app": "condo-association-manager"}


app.include_router(api)


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def on_startup():
    try:
        await db.users.create_index("email", unique=True)
        await db.units.create_index("unit_number")
        await db.fee_payments.create_index([("period_year", 1), ("period_month", 1)])
        await db.expenses.create_index("date")
        await db.budget_items.create_index([("year", 1), ("category", 1)])
        await db.compliance_tasks.create_index([("year", 1), ("category", 1)])
    except Exception as e:
        log.warning("Index creation failed: %s", e)

    # Seed admin (and remove any legacy admin accounts that no longer match)
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_pw = os.environ["ADMIN_PASSWORD"]
    admin_name = os.environ.get("ADMIN_NAME", "Treasurer")
    await db.users.delete_many({"email": {"$ne": admin_email}})
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_pw),
            "name": admin_name,
            "role": "admin",
            "created_at": now_iso(),
        })
        log.info("Seeded admin %s", admin_email)
    elif not verify_password(admin_pw, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_pw)}})
        log.info("Updated admin password for %s", admin_email)


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
