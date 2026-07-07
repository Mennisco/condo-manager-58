import { useState } from "react";
import api from "@/lib/api";
import { fmtMoney } from "@/lib/utils";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["Utilities", "Insurance", "Landscaping", "Mowing", "Snow Removal", "Trash Removal", "Maintenance", "Window Washing", "Bank/Accounting", "Reserve", "Other"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function guessExpense(desc) {
  const d = (desc || "").toLowerCase();
  if (d.includes("honeycomb")) return { category: "Insurance", vendor: "Honeycomb Insurance" };
  if (d.includes("republic")) return { category: "Trash Removal", vendor: "Republic Services" };
  if (d.includes("princeto") || d.includes("utility")) return { category: "Utilities", vendor: "City of Princeton" };
  if (d.includes("mensch")) return { category: "Other", vendor: "Bill Mensch" };
  return { category: "Other", vendor: "" };
}

export function RecordTransactionModal({ recording, units, onClose, onSaved }) {
  const { txn, kind } = recording;
  const [saving, setSaving] = useState(false);
  const isExpense = kind === "withdrawal";
  const guess = isExpense ? guessExpense(txn.description) : null;
  const dateStr = txn.date || txn.txn_date || "";
  const [year, month] = dateStr.split("-").map(Number);

  const [form, setForm] = useState(
    isExpense
      ? { date: dateStr, category: guess.category, vendor: guess.vendor, amount: txn.amount, description: txn.description }
      : { unit_id: units[0]?.id || "", period_year: year || new Date().getFullYear(), months: [month || 1], paid_date: dateStr }
  );

  const selCount = !isExpense ? (form.months?.length || 0) : 0;
  const splitAmount = selCount ? Math.round((txn.amount / selCount) * 100) / 100 : 0;
  const toggleMonth = (mn) =>
    setForm((f) => ({
      ...f,
      months: f.months.includes(mn) ? f.months.filter((x) => x !== mn) : [...f.months, mn].sort((a, b) => a - b),
    }));

  const inp = "w-full border border-[#E7E5E4] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#166534]/40 focus:border-[#166534]";

  const save = async () => {
    setSaving(true);
    try {
      if (isExpense) {
        await api.post("/expenses", {
          date: form.date, category: form.category, vendor: form.vendor || null,
          description: form.description, amount: parseFloat(form.amount) || 0, notes: "From bank alert / reconciliation",
        });
        toast.success("Expense recorded");
      } else {
        if (!form.unit_id) { toast.error("Pick a unit"); setSaving(false); return; }
        if (!form.months.length) { toast.error("Pick at least one month"); setSaving(false); return; }
        for (const mn of form.months) {
          await api.post("/fees/record", {
            unit_id: form.unit_id, period_year: Number(form.period_year), period_month: mn,
            amount_paid: splitAmount, paid_date: form.paid_date, method: "bank",
          });
        }
        toast.success(`Recorded ${form.months.length} month${form.months.length > 1 ? "s" : ""} of fees`);
      }
      onSaved();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not record");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div data-testid="record-modal" className="bg-white rounded-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl font-bold">{isExpense ? "Record expense" : "Record fee payment"}</h3>
          <button onClick={onClose} className="text-[#78716C] hover:text-[#1C1917]"><X size={20} /></button>
        </div>
        <div className="text-xs text-[#78716C] bg-[#F5F5F4] rounded-md px-3 py-2 mb-4">
          Source: <span className="font-semibold">{dateStr}</span> · {txn.description} · {fmtMoney(txn.amount)}
        </div>

        {isExpense ? (
          <div className="space-y-3">
            <Field label="Date"><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inp} /></Field>
            <Field label="Category">
              <select data-testid="record-expense-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inp}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Vendor"><input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} className={inp} /></Field>
            <Field label="Description"><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inp} /></Field>
            <Field label="Amount"><input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inp} /></Field>
          </div>
        ) : (
          <div className="space-y-3">
            <Field label="Unit / Owner">
              <select data-testid="record-fee-unit" value={form.unit_id} onChange={(e) => setForm({ ...form, unit_id: e.target.value })} className={inp}>
                <option value="">Select a unit…</option>
                {units.map((u) => <option key={u.id} value={u.id}>Unit {u.unit_number} · {u.owner_name}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Year"><input type="number" value={form.period_year} onChange={(e) => setForm({ ...form, period_year: e.target.value })} className={inp} /></Field>
              <Field label="Paid date"><input type="date" value={form.paid_date} onChange={(e) => setForm({ ...form, paid_date: e.target.value })} className={inp} /></Field>
            </div>
            <Field label="Months covered (tick all that this deposit pays)">
              <div data-testid="record-fee-months" className="grid grid-cols-4 gap-2">
                {MONTHS.map((mn, idx) => {
                  const on = form.months.includes(idx + 1);
                  return (
                    <button key={mn} type="button" data-testid={`record-month-${idx + 1}`} onClick={() => toggleMonth(idx + 1)}
                      className={`px-2 py-1.5 rounded-md text-xs font-semibold border transition-colors ${on ? "bg-[#166534] text-white border-[#166534]" : "bg-white text-[#78716C] border-[#E7E5E4] hover:border-[#166534]"}`}>
                      {mn.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </Field>
            <div className="flex items-center justify-between bg-[#F0FDF4] border border-[#BBF7D0] rounded-md px-3 py-2 text-sm">
              <span className="text-[#166534] font-semibold">{selCount} month{selCount !== 1 ? "s" : ""} · {fmtMoney(txn.amount)} total</span>
              <span data-testid="record-split-amount" className="tabular-nums font-bold text-[#166534]">{fmtMoney(splitAmount)} each</span>
            </div>
            <p className="text-xs text-[#78716C]">Auto-splits the amount evenly across the months you tick.</p>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-md border border-[#E7E5E4] font-semibold text-sm">Cancel</button>
          <button data-testid="record-save-btn" onClick={save} disabled={saving} className="px-4 py-2 rounded-md bg-[#166534] hover:bg-[#14532D] text-white font-semibold text-sm flex items-center gap-2 disabled:opacity-60">
            {saving ? <Loader2 className="animate-spin" size={15} /> : <CheckCircle2 size={15} />} Record
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-[0.12em] font-bold text-[#78716C] mb-1.5">{label}</span>
      {children}
    </label>
  );
}
