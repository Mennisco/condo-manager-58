import { useEffect, useState } from "react";
import api from "@/lib/api";
import { fmtMoney, fmtDate, todayISO } from "@/lib/utils";
import { Plus, Pencil, Trash2, X, Receipt } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  "Utilities", "Insurance", "Landscaping", "Cleaning", "Repairs & Maintenance",
  "Trash & Recycling", "Snow Removal", "Pest Control", "Property Management",
  "Legal & Accounting", "Reserves", "Taxes & Filings", "Other",
];

const empty = {
  date: todayISO(),
  category: "Utilities",
  vendor: "",
  description: "",
  amount: "",
  method: "check",
  date_paid: "",
  notes: "",
};

export default function Expenses() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);

  const load = () => api.get(`/expenses?year=${year}`).then((r) => setItems(r.data));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [year]);

  const onSubmit = async (e) => {
    e.preventDefault();
    const body = { ...form, amount: parseFloat(form.amount) || 0 };
    if (editing) {
      await api.put(`/expenses/${editing}`, body);
      toast.success("Expense updated");
    } else {
      await api.post("/expenses", body);
      toast.success("Expense added");
    }
    setOpen(false);
    setEditing(null);
    setForm(empty);
    load();
  };

  const onEdit = (x) => {
    setEditing(x.id);
    setForm({
      date: x.date,
      category: x.category,
      vendor: x.vendor || "",
      description: x.description,
      amount: x.amount,
      method: x.method || "check",
      date_paid: x.date_paid || "",
      notes: x.notes || "",
    });
    setOpen(true);
  };

  const onDelete = async (id) => {
    if (!confirm("Delete this expense?")) return;
    await api.delete(`/expenses/${id}`);
    toast.success("Deleted");
    load();
  };

  const total = items.reduce((a, x) => a + x.amount, 0);
  const byCat = items.reduce((acc, x) => {
    acc[x.category] = (acc[x.category] || 0) + x.amount;
    return acc;
  }, {});

  return (
    <div data-testid="expenses-page" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">Operating expenses</div>
          <h1 className="font-display text-4xl font-bold tracking-tight mt-2">Expenses</h1>
          <p className="text-[#78716C] mt-2">Log every payment the association makes — receipts, utilities, vendor invoices.</p>
        </div>
        <div className="flex gap-3 items-end">
          <div>
            <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C] mb-1.5">Year</div>
            <input data-testid="expense-year" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className={`${inp} w-24`} />
          </div>
          <button
            data-testid="add-expense-btn"
            onClick={() => { setEditing(null); setForm(empty); setOpen(true); }}
            className="bg-[#166534] hover:bg-[#14532D] text-white px-4 py-2.5 rounded-md font-semibold flex items-center gap-2"
          >
            <Plus size={16} /> Add expense
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-[#E7E5E4] rounded-lg p-6 md:col-span-1">
          <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">Total · {year}</div>
          <div className="font-display text-3xl font-bold mt-3 tabular-nums">{fmtMoney(total)}</div>
          <div className="text-xs text-[#78716C] mt-1">{items.length} entries</div>
        </div>
        <div className="bg-white border border-[#E7E5E4] rounded-lg p-6 md:col-span-2">
          <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C] mb-3">By Category</div>
          {Object.keys(byCat).length === 0 ? (
            <div className="text-sm text-[#78716C]">No expenses yet.</div>
          ) : (
            <div className="grid grid-cols-2 gap-y-2 gap-x-6">
              {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, v]) => (
                <div key={c} className="flex justify-between text-sm">
                  <span className="text-[#1C1917]">{c}</span>
                  <span className="tabular-nums font-semibold">{fmtMoney(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-[#E7E5E4] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F5F5F4] text-left text-[11px] uppercase tracking-[0.15em] font-bold text-[#78716C]">
            <tr>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Category</th>
              <th className="px-6 py-3">Vendor</th>
              <th className="px-6 py-3">Description</th>
              <th className="px-6 py-3 text-right">Amount</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-[#78716C]">
                <Receipt size={24} className="mx-auto mb-2 opacity-50" />
                No expenses for {year}.
              </td></tr>
            ) : items.map((x) => (
              <tr key={x.id} data-testid={`expense-row-${x.id}`} className="border-t border-[#E7E5E4] hover:bg-[#F5F5F4]">
                <td className="px-6 py-4">{fmtDate(x.date)}</td>
                <td className="px-6 py-4">{x.category}</td>
                <td className="px-6 py-4 text-[#78716C]">{x.vendor || "—"}</td>
                <td className="px-6 py-4">{x.description}</td>
                <td className="px-6 py-4 text-right tabular-nums font-semibold">{fmtMoney(x.amount)}</td>
                <td className="px-6 py-4 text-right">
                  <button data-testid={`edit-expense-${x.id}`} onClick={() => onEdit(x)} className="text-[#166534] mr-3"><Pencil size={16} /></button>
                  <button data-testid={`delete-expense-${x.id}`} onClick={() => onDelete(x.id)} className="text-[#C53030]"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" data-testid="expense-modal">
          <form onSubmit={onSubmit} className="bg-white border border-[#E7E5E4] rounded-lg w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="font-display text-xl font-semibold">{editing ? "Edit expense" : "Add expense"}</div>
              <button type="button" onClick={() => setOpen(false)}><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date" required>
                <input data-testid="expense-date" required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inp} />
              </Field>
              <Field label="Amount" required>
                <input data-testid="expense-amount" required type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inp} />
              </Field>
              <Field label="Category" required>
                <select data-testid="expense-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inp}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Method">
                <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className={inp}>
                  <option value="check">Check</option><option value="ach">ACH</option>
                  <option value="card">Card</option><option value="cash">Cash</option><option value="other">Other</option>
                </select>
              </Field>
              <Field label="Vendor">
                <input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} className={inp} />
              </Field>
              <Field label="Paid date">
                <input data-testid="expense-date-paid" type="date" value={form.date_paid} onChange={(e) => setForm({ ...form, date_paid: e.target.value })} className={inp} />
              </Field>
              <Field label="Description" required full>
                <input data-testid="expense-description" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inp} />
              </Field>
              <Field label="Notes" full>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={inp} />
              </Field>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-md border border-[#E7E5E4]">Cancel</button>
              <button data-testid="save-expense-btn" type="submit" className="px-4 py-2 rounded-md bg-[#166534] text-white font-semibold">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const inp = "w-full border border-[#E7E5E4] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#166534]/40 focus:border-[#166534] bg-white";

function Field({ label, children, full, required }) {
  return (
    <label className={`block ${full ? "col-span-2" : ""}`}>
      <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C] mb-1.5">
        {label} {required && <span className="text-[#C53030]">*</span>}
      </div>
      {children}
    </label>
  );
}
