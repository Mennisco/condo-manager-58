import { useEffect, useState } from "react";
import api from "@/lib/api";
import { fmtMoney } from "@/lib/utils";
import { Plus, Pencil, Trash2, Home, X } from "lucide-react";
import { toast } from "sonner";

const empty = {
  unit_number: "",
  owner_name: "",
  owner_email: "",
  owner_phone: "",
  monthly_fee: 0,
  notes: "",
};

export default function Units() {
  const [units, setUnits] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);

  const load = () => api.get("/units").then((r) => setUnits(r.data));
  useEffect(() => { load(); }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    const body = { ...form, monthly_fee: parseFloat(form.monthly_fee) || 0 };
    try {
      if (editing) {
        await api.put(`/units/${editing}`, body);
        toast.success("Unit updated");
      } else {
        await api.post("/units", body);
        toast.success("Unit added");
      }
      setOpen(false);
      setForm(empty);
      setEditing(null);
      load();
    } catch (e) {
      toast.error("Save failed");
    }
  };

  const onEdit = (u) => {
    setEditing(u.id);
    setForm({
      unit_number: u.unit_number,
      owner_name: u.owner_name,
      owner_email: u.owner_email || "",
      owner_phone: u.owner_phone || "",
      monthly_fee: u.monthly_fee || 0,
      notes: u.notes || "",
    });
    setOpen(true);
  };

  const onDelete = async (id) => {
    if (!confirm("Delete this unit?")) return;
    await api.delete(`/units/${id}`);
    toast.success("Unit deleted");
    load();
  };

  return (
    <div data-testid="units-page" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">Owners directory</div>
          <h1 className="font-display text-4xl font-bold tracking-tight mt-2">Units &amp; Owners</h1>
          <p className="text-[#78716C] mt-2">Manage the 10 units and their assigned owners.</p>
        </div>
        <button
          data-testid="add-unit-btn"
          onClick={() => { setEditing(null); setForm(empty); setOpen(true); }}
          className="bg-[#166534] hover:bg-[#14532D] text-white px-4 py-2.5 rounded-md font-semibold flex items-center gap-2"
        >
          <Plus size={16} /> Add unit
        </button>
      </div>

      <div className="bg-white border border-[#E7E5E4] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F5F5F4] text-left text-[11px] uppercase tracking-[0.15em] font-bold text-[#78716C]">
            <tr>
              <th className="px-6 py-3">Unit</th>
              <th className="px-6 py-3">Owner</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Phone</th>
              <th className="px-6 py-3 text-right">Monthly Fee</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {units.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-[#78716C]">
                <Home size={24} className="mx-auto mb-2 opacity-50" />
                No units yet. Add your first unit to get started.
              </td></tr>
            ) : units.map((u) => (
              <tr key={u.id} data-testid={`unit-row-${u.unit_number}`} className="border-t border-[#E7E5E4] hover:bg-[#F5F5F4]">
                <td className="px-6 py-4 font-semibold">{u.unit_number}</td>
                <td className="px-6 py-4">{u.owner_name}</td>
                <td className="px-6 py-4 text-[#78716C]">{u.owner_email || "—"}</td>
                <td className="px-6 py-4 text-[#78716C]">{u.owner_phone || "—"}</td>
                <td className="px-6 py-4 text-right tabular-nums">{fmtMoney(u.monthly_fee)}</td>
                <td className="px-6 py-4 text-right">
                  <button data-testid={`edit-unit-${u.unit_number}`} onClick={() => onEdit(u)} className="text-[#166534] mr-3"><Pencil size={16} /></button>
                  <button data-testid={`delete-unit-${u.unit_number}`} onClick={() => onDelete(u.id)} className="text-[#C53030]"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" data-testid="unit-modal">
          <form onSubmit={onSubmit} className="bg-white border border-[#E7E5E4] rounded-lg w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="font-display text-xl font-semibold">{editing ? "Edit unit" : "Add unit"}</div>
              <button type="button" onClick={() => setOpen(false)} data-testid="close-unit-modal"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Unit #" required>
                <input data-testid="unit-number-input" required value={form.unit_number} onChange={(e) => setForm({ ...form, unit_number: e.target.value })} className={inp} />
              </Field>
              <Field label="Monthly fee">
                <input data-testid="unit-fee-input" type="number" step="0.01" value={form.monthly_fee} onChange={(e) => setForm({ ...form, monthly_fee: e.target.value })} className={inp} />
              </Field>
              <Field label="Owner name" required>
                <input data-testid="unit-owner-input" required value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} className={inp} />
              </Field>
              <Field label="Owner email">
                <input data-testid="unit-email-input" type="email" value={form.owner_email} onChange={(e) => setForm({ ...form, owner_email: e.target.value })} className={inp} />
              </Field>
              <Field label="Owner phone">
                <input value={form.owner_phone} onChange={(e) => setForm({ ...form, owner_phone: e.target.value })} className={inp} />
              </Field>
              <Field label="Notes" full>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={inp} />
              </Field>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-md border border-[#E7E5E4]">Cancel</button>
              <button data-testid="save-unit-btn" type="submit" className="px-4 py-2 rounded-md bg-[#166534] text-white font-semibold">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const inp = "w-full border border-[#E7E5E4] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#166534]/40 focus:border-[#166534]";

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
