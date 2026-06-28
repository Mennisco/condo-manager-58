import { useEffect, useState } from "react";
import api from "@/lib/api";
import { fmtDate, todayISO } from "@/lib/utils";
import { Plus, Pencil, Trash2, X, ArrowDownLeft, ArrowUpRight, MessageSquare, Check } from "lucide-react";
import { toast } from "sonner";

const empty = {
  date: todayISO(),
  direction: "outgoing",
  audience: "homeowner",
  contact: "",
  subject: "",
  body: "",
  follow_up_date: "",
  resolved: false,
};

export default function Communications() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);

  const load = () => {
    const q = filter === "all" ? "" : `?audience=${filter}`;
    api.get(`/communications${q}`).then((r) => setItems(r.data));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const onSubmit = async (e) => {
    e.preventDefault();
    const body = { ...form, follow_up_date: form.follow_up_date || null };
    if (editing) await api.put(`/communications/${editing}`, body);
    else await api.post("/communications", body);
    toast.success("Saved");
    setOpen(false); setEditing(null); setForm(empty); load();
  };

  const onEdit = (c) => {
    setEditing(c.id);
    setForm({
      date: c.date,
      direction: c.direction,
      audience: c.audience,
      contact: c.contact,
      subject: c.subject,
      body: c.body,
      follow_up_date: c.follow_up_date || "",
      resolved: c.resolved,
    });
    setOpen(true);
  };

  const onDelete = async (id) => { if (!confirm("Delete log?")) return; await api.delete(`/communications/${id}`); load(); };
  const toggleResolved = async (c) => { await api.put(`/communications/${c.id}`, { ...c, resolved: !c.resolved }); load(); };

  return (
    <div data-testid="comms-page" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">Logged correspondence</div>
          <h1 className="font-display text-4xl font-bold tracking-tight mt-2">Communications</h1>
          <p className="text-[#78716C] mt-2">Keep a record of every conversation with homeowners and vendors.</p>
        </div>
        <div className="flex gap-3 items-end">
          <div>
            <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C] mb-1.5">Filter</div>
            <select data-testid="comm-filter" value={filter} onChange={(e) => setFilter(e.target.value)} className={inp}>
              <option value="all">All</option>
              <option value="homeowner">Homeowners</option>
              <option value="vendor">Vendors</option>
            </select>
          </div>
          <button data-testid="add-comm-btn" onClick={() => { setEditing(null); setForm(empty); setOpen(true); }} className="bg-[#166534] hover:bg-[#14532D] text-white px-4 py-2.5 rounded-md font-semibold flex items-center gap-2">
            <Plus size={16} /> Log entry
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="bg-white border border-[#E7E5E4] rounded-lg p-12 text-center text-[#78716C]">
            <MessageSquare size={24} className="mx-auto mb-2 opacity-50" />
            No communications logged yet.
          </div>
        ) : items.map((c) => (
          <div key={c.id} data-testid={`comm-row-${c.id}`} className="bg-white border border-[#E7E5E4] rounded-lg p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold uppercase tracking-wide ${
                    c.direction === "incoming" ? "bg-[#F0FDF4] text-[#166534]" : "bg-[#FFFBEB] text-[#B45309]"
                  }`}>
                    {c.direction === "incoming" ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                    {c.direction}
                  </span>
                  <span className="text-[#78716C]">·</span>
                  <span className="text-[#78716C]">{c.audience}</span>
                  <span className="text-[#78716C]">·</span>
                  <span className="text-[#78716C]">{fmtDate(c.date)}</span>
                  {c.follow_up_date && (
                    <>
                      <span className="text-[#78716C]">·</span>
                      <span className="text-[#B45309]">Follow-up: {fmtDate(c.follow_up_date)}</span>
                    </>
                  )}
                </div>
                <div className="font-display text-lg font-semibold mt-2">{c.subject}</div>
                <div className="text-sm text-[#78716C] mt-1">With: <span className="text-[#1C1917]">{c.contact}</span></div>
                <p className="text-sm mt-3 whitespace-pre-wrap">{c.body}</p>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <button
                  data-testid={`resolve-comm-${c.id}`}
                  onClick={() => toggleResolved(c)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${
                    c.resolved ? "bg-[#F0FDF4] text-[#166534] border border-[#166534]/20" : "bg-[#F5F5F4] text-[#78716C] border border-[#E7E5E4]"
                  }`}
                >
                  <Check size={12} /> {c.resolved ? "Resolved" : "Open"}
                </button>
                <div className="flex gap-2">
                  <button onClick={() => onEdit(c)} className="text-[#166534]"><Pencil size={16} /></button>
                  <button onClick={() => onDelete(c.id)} className="text-[#C53030]"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={onSubmit} className="bg-white border border-[#E7E5E4] rounded-lg w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="font-display text-xl font-semibold">{editing ? "Edit log entry" : "Log communication"}</div>
              <button type="button" onClick={() => setOpen(false)}><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date" required>
                <input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inp} />
              </Field>
              <Field label="Follow-up date">
                <input type="date" value={form.follow_up_date} onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })} className={inp} />
              </Field>
              <Field label="Direction">
                <select data-testid="comm-direction" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })} className={inp}>
                  <option value="outgoing">Outgoing</option>
                  <option value="incoming">Incoming</option>
                </select>
              </Field>
              <Field label="Audience">
                <select data-testid="comm-audience" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} className={inp}>
                  <option value="homeowner">Homeowner</option>
                  <option value="vendor">Vendor</option>
                </select>
              </Field>
              <Field label="Contact (name or unit #)" required full>
                <input data-testid="comm-contact" required value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className={inp} />
              </Field>
              <Field label="Subject" required full>
                <input data-testid="comm-subject" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={inp} />
              </Field>
              <Field label="Message / notes" required full>
                <textarea data-testid="comm-body" required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={5} className={inp} />
              </Field>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-md border border-[#E7E5E4]">Cancel</button>
              <button data-testid="save-comm-btn" type="submit" className="px-4 py-2 rounded-md bg-[#166534] text-white font-semibold">Save</button>
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
