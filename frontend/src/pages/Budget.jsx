import { useEffect, useState } from "react";
import api from "@/lib/api";
import { fmtMoney } from "@/lib/utils";
import { Plus, Trash2, Pencil, X, Sparkles } from "lucide-react";
import { toast } from "sonner";

const empty = { year: new Date().getFullYear(), category: "", budgeted_amount: "", notes: "" };

export default function Budget() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [genForm, setGenForm] = useState({ source_year: year - 1, uplift_pct: 3 });
  const [form, setForm] = useState({ ...empty, year });
  const [editing, setEditing] = useState(null);

  const load = () => api.get(`/budget?year=${year}`).then((r) => setItems(r.data));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [year]);

  const onSubmit = async (e) => {
    e.preventDefault();
    const body = { ...form, year, budgeted_amount: parseFloat(form.budgeted_amount) || 0 };
    if (editing) {
      await api.put(`/budget/${editing}`, body);
      toast.success("Updated");
    } else {
      await api.post("/budget", body);
      toast.success("Added");
    }
    setOpen(false); setEditing(null); setForm({ ...empty, year });
    load();
  };

  const onEdit = (b) => {
    setEditing(b.id);
    setForm({ year: b.year, category: b.category, budgeted_amount: b.budgeted_amount, notes: b.notes || "" });
    setOpen(true);
  };

  const onDelete = async (id) => {
    if (!confirm("Remove this line?")) return;
    await api.delete(`/budget/${id}`);
    load();
  };

  const generate = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post(
        `/budget/generate-from-prior?target_year=${year}&source_year=${genForm.source_year}&uplift_pct=${genForm.uplift_pct}`
      );
      toast.success(`Generated ${data.categories || 0} categories`);
      setGenOpen(false);
      load();
    } catch (e) {
      toast.error("Generation failed");
    }
  };

  const total = items.reduce((a, b) => a + b.budgeted_amount, 0);

  return (
    <div data-testid="budget-page" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">Planning</div>
          <h1 className="font-display text-4xl font-bold tracking-tight mt-2">Annual Budget</h1>
          <p className="text-[#78716C] mt-2">Build {year}'s budget by category. Auto-fill from last year's actuals.</p>
        </div>
        <div className="flex gap-3 items-end">
          <div>
            <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C] mb-1.5">Year</div>
            <input data-testid="budget-year" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className={`${inp} w-24`} />
          </div>
          <button
            data-testid="generate-budget-btn"
            onClick={() => { setGenForm({ source_year: year - 1, uplift_pct: 3 }); setGenOpen(true); }}
            className="border border-[#E7E5E4] hover:bg-[#F5F5F4] text-[#1C1917] px-4 py-2.5 rounded-md font-semibold flex items-center gap-2"
          >
            <Sparkles size={16} /> From prior year
          </button>
          <button
            data-testid="add-budget-btn"
            onClick={() => { setEditing(null); setForm({ ...empty, year }); setOpen(true); }}
            className="bg-[#166534] hover:bg-[#14532D] text-white px-4 py-2.5 rounded-md font-semibold flex items-center gap-2"
          >
            <Plus size={16} /> Add line
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E7E5E4] rounded-lg p-6">
        <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">Total Budget · {year}</div>
        <div className="font-display text-3xl font-bold mt-2 tabular-nums" data-testid="budget-total">{fmtMoney(total)}</div>
      </div>

      <div className="bg-white border border-[#E7E5E4] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F5F5F4] text-left text-[11px] uppercase tracking-[0.15em] font-bold text-[#78716C]">
            <tr>
              <th className="px-6 py-3">Category</th>
              <th className="px-6 py-3 text-right">Budgeted</th>
              <th className="px-6 py-3">Notes</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-[#78716C]">
                No budget items yet for {year}.
              </td></tr>
            ) : items.map((b) => (
              <tr key={b.id} data-testid={`budget-row-${b.id}`} className="border-t border-[#E7E5E4] hover:bg-[#F5F5F4]">
                <td className="px-6 py-4 font-semibold">{b.category}</td>
                <td className="px-6 py-4 text-right tabular-nums">{fmtMoney(b.budgeted_amount)}</td>
                <td className="px-6 py-4 text-[#78716C]">{b.notes || "—"}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => onEdit(b)} className="text-[#166534] mr-3"><Pencil size={16} /></button>
                  <button onClick={() => onDelete(b.id)} className="text-[#C53030]"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={onSubmit} className="bg-white border border-[#E7E5E4] rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="font-display text-xl font-semibold">{editing ? "Edit line" : "Add budget line"}</div>
              <button type="button" onClick={() => setOpen(false)}><X size={18} /></button>
            </div>
            <Field label="Category" required>
              <input data-testid="budget-category" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inp} />
            </Field>
            <Field label="Budgeted amount" required>
              <input data-testid="budget-amount" required type="number" step="0.01" value={form.budgeted_amount} onChange={(e) => setForm({ ...form, budgeted_amount: e.target.value })} className={inp} />
            </Field>
            <Field label="Notes">
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={inp} />
            </Field>
            <div className="mt-6 flex gap-3 justify-end">
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-md border border-[#E7E5E4]">Cancel</button>
              <button data-testid="save-budget-btn" type="submit" className="px-4 py-2 rounded-md bg-[#166534] text-white font-semibold">Save</button>
            </div>
          </form>
        </div>
      )}

      {genOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={generate} className="bg-white border border-[#E7E5E4] rounded-lg w-full max-w-md p-6">
            <div className="font-display text-xl font-semibold mb-2">Generate from prior year</div>
            <p className="text-sm text-[#78716C] mb-5">
              Roll up {genForm.source_year} expenses by category to seed {year}'s budget, with an optional uplift.
            </p>
            <Field label="Source year">
              <input data-testid="gen-source-year" type="number" value={genForm.source_year} onChange={(e) => setGenForm({ ...genForm, source_year: Number(e.target.value) })} className={inp} />
            </Field>
            <Field label="Uplift %">
              <input data-testid="gen-uplift" type="number" step="0.5" value={genForm.uplift_pct} onChange={(e) => setGenForm({ ...genForm, uplift_pct: Number(e.target.value) })} className={inp} />
            </Field>
            <div className="mt-6 flex gap-3 justify-end">
              <button type="button" onClick={() => setGenOpen(false)} className="px-4 py-2 rounded-md border border-[#E7E5E4]">Cancel</button>
              <button data-testid="confirm-generate-btn" type="submit" className="px-4 py-2 rounded-md bg-[#166534] text-white font-semibold">Generate</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const inp = "w-full border border-[#E7E5E4] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#166534]/40 focus:border-[#166534] bg-white";

function Field({ label, children, required }) {
  return (
    <label className="block mb-4">
      <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C] mb-1.5">
        {label} {required && <span className="text-[#C53030]">*</span>}
      </div>
      {children}
    </label>
  );
}
