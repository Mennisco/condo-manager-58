import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Plus, Pencil, Trash2, X, Mail, Phone } from "lucide-react";
import { toast } from "sonner";

const empty = { name: "", service: "", categories: [], contact_name: "", email: "", phone: "", notes: "" };

const CATEGORIES = [
  "Utilities", "Insurance", "Landscaping", "Mowing", "Snow Removal", "Trash Removal",
  "Maintenance", "Window Washing", "Bank/Accounting", "Cleaning", "Pest Control",
  "Property Management", "Legal & Accounting", "Taxes & Filings", "Other",
];

export default function Vendors() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);

  const load = () => api.get("/vendors").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (editing) await api.put(`/vendors/${editing}`, form);
    else await api.post("/vendors", form);
    toast.success("Saved");
    setOpen(false); setEditing(null); setForm(empty); load();
  };

  const onEdit = (v) => { setEditing(v.id); setForm({ name: v.name, service: v.service || "", categories: v.categories || (v.category ? [v.category] : []), contact_name: v.contact_name || "", email: v.email || "", phone: v.phone || "", notes: v.notes || "" }); setOpen(true); };
  const onDelete = async (id) => { if (!confirm("Delete vendor?")) return; await api.delete(`/vendors/${id}`); load(); };

  return (
    <div data-testid="vendors-page" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">Service directory</div>
          <h1 className="font-display text-4xl font-bold tracking-tight mt-2">Vendors</h1>
          <p className="text-[#78716C] mt-2">Keep contractor and service-provider contacts handy.</p>
        </div>
        <button data-testid="add-vendor-btn" onClick={() => { setEditing(null); setForm(empty); setOpen(true); }} className="bg-[#166534] hover:bg-[#14532D] text-white px-4 py-2.5 rounded-md font-semibold flex items-center gap-2">
          <Plus size={16} /> Add vendor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.length === 0 ? (
          <div className="md:col-span-2 lg:col-span-3 bg-white border border-[#E7E5E4] rounded-lg p-12 text-center text-[#78716C]">
            No vendors yet.
          </div>
        ) : items.map((v) => (
          <div key={v.id} data-testid={`vendor-card-${v.id}`} className="bg-white border border-[#E7E5E4] rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display text-lg font-semibold">{v.name}</div>
                <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#166534] mt-1">{v.service || "—"}</div>
                {(v.categories && v.categories.length > 0) ? (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {v.categories.map((cat) => (
                      <span key={cat} data-testid={`vendor-category-${v.id}-${cat}`} className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-[#F5F5F4] text-[#78716C] border border-[#E7E5E4]">
                        {cat}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="flex gap-2">
                <button onClick={() => onEdit(v)} className="text-[#166534]"><Pencil size={16} /></button>
                <button onClick={() => onDelete(v.id)} className="text-[#C53030]"><Trash2 size={16} /></button>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm text-[#1C1917]">
              {v.contact_name && <div className="text-[#78716C]">Contact: {v.contact_name}</div>}
              {v.email && <a href={`mailto:${v.email}`} className="flex items-center gap-2 hover:text-[#166534]"><Mail size={14} /> {v.email}</a>}
              {v.phone && <a href={`tel:${v.phone}`} className="flex items-center gap-2 hover:text-[#166534]"><Phone size={14} /> {v.phone}</a>}
              {v.notes && <div className="text-[#78716C] text-xs pt-2 border-t border-[#E7E5E4]">{v.notes}</div>}
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={onSubmit} className="bg-white border border-[#E7E5E4] rounded-lg w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="font-display text-xl font-semibold">{editing ? "Edit vendor" : "Add vendor"}</div>
              <button type="button" onClick={() => setOpen(false)}><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Name" required><input data-testid="vendor-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inp} /></Field>
              <Field label="Service"><input data-testid="vendor-service" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} className={inp} /></Field>
              <Field label="Expense categories" full>
                <div data-testid="vendor-categories" className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => {
                    const on = form.categories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        data-testid={`vendor-cat-toggle-${cat}`}
                        onClick={() => setForm({
                          ...form,
                          categories: on ? form.categories.filter((x) => x !== cat) : [...form.categories, cat],
                        })}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                          on ? "bg-[#166534] text-white border-[#166534]" : "bg-white text-[#78716C] border-[#E7E5E4] hover:border-[#166534]"
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field label="Contact name"><input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className={inp} /></Field>
              <Field label="Email"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inp} /></Field>
              <Field label="Phone"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inp} /></Field>
              <Field label="Notes" full><textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inp} /></Field>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-md border border-[#E7E5E4]">Cancel</button>
              <button data-testid="save-vendor-btn" type="submit" className="px-4 py-2 rounded-md bg-[#166534] text-white font-semibold">Save</button>
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
      <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C] mb-1.5">{label} {required && <span className="text-[#C53030]">*</span>}</div>
      {children}
    </label>
  );
}
