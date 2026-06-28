import { useEffect, useState } from "react";
import api from "@/lib/api";
import { fmtDate } from "@/lib/utils";
import { Sparkles, Plus, Trash2, X, Building, Receipt, ClipboardList } from "lucide-react";
import { toast } from "sonner";

const CATEGORY_META = {
  IL_NFP: { label: "Illinois NFP (Annual Report)", icon: Building, color: "text-[#166534]", bg: "bg-[#F0FDF4]" },
  IRS: { label: "Federal Tax (IRS)", icon: Receipt, color: "text-[#B45309]", bg: "bg-[#FFFBEB]" },
  Internal: { label: "Internal / Operational", icon: ClipboardList, color: "text-[#1C1917]", bg: "bg-[#F5F5F4]" },
};

const empty = { title: "", category: "Internal", due_date: "", year: new Date().getFullYear(), completed: false, notes: "" };

export default function Compliance() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [tasks, setTasks] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...empty, year });

  const load = () => api.get(`/compliance?year=${year}`).then((r) => setTasks(r.data));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [year]);

  const seed = async () => {
    const { data } = await api.post(`/compliance/seed?year=${year}`);
    toast.success(`${data.created} default tasks loaded`);
    load();
  };

  const toggle = async (t) => {
    await api.put(`/compliance/${t.id}`, { completed: !t.completed, completed_date: !t.completed ? new Date().toISOString() : null });
    load();
  };

  const setDue = async (t, date) => { await api.put(`/compliance/${t.id}`, { due_date: date || null }); load(); };
  const setNotes = async (t, notes) => { await api.put(`/compliance/${t.id}`, { notes }); };
  const onDelete = async (id) => { if (!confirm("Delete task?")) return; await api.delete(`/compliance/${id}`); load(); };

  const onSubmit = async (e) => {
    e.preventDefault();
    await api.post("/compliance", { ...form, year, due_date: form.due_date || null });
    toast.success("Task added");
    setOpen(false);
    setForm({ ...empty, year });
    load();
  };

  const groups = ["IL_NFP", "IRS", "Internal"];
  const totalDone = tasks.filter((t) => t.completed).length;

  return (
    <div data-testid="compliance-page" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">Tax & state filings</div>
          <h1 className="font-display text-4xl font-bold tracking-tight mt-2">Tax &amp; Compliance</h1>
          <p className="text-[#78716C] mt-2">Track Illinois NFP, IRS, and internal year-end checklists.</p>
        </div>
        <div className="flex gap-3 items-end">
          <div>
            <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C] mb-1.5">Year</div>
            <input data-testid="compliance-year" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className={`${inp} w-24`} />
          </div>
          <button data-testid="seed-compliance-btn" onClick={seed} className="border border-[#E7E5E4] hover:bg-[#F5F5F4] px-4 py-2.5 rounded-md font-semibold flex items-center gap-2">
            <Sparkles size={16} /> Load defaults
          </button>
          <button data-testid="add-compliance-btn" onClick={() => { setForm({ ...empty, year }); setOpen(true); }} className="bg-[#166534] hover:bg-[#14532D] text-white px-4 py-2.5 rounded-md font-semibold flex items-center gap-2">
            <Plus size={16} /> Add task
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E7E5E4] rounded-lg p-6">
        <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">Progress · {year}</div>
        <div className="font-display text-3xl font-bold mt-2 tabular-nums" data-testid="compliance-progress">
          {totalDone}/{tasks.length} <span className="text-[#78716C] font-normal text-base">completed</span>
        </div>
        <div className="mt-3 h-2 bg-[#F5F5F4] rounded-full overflow-hidden">
          <div className="h-full bg-[#166534]" style={{ width: tasks.length ? `${(totalDone / tasks.length) * 100}%` : 0 }} />
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-white border border-[#E7E5E4] rounded-lg p-12 text-center text-[#78716C]">
          No tasks for {year}. Click <span className="font-semibold">Load defaults</span> to populate the IL NFP, IRS, and internal checklists.
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((g) => {
            const list = tasks.filter((t) => t.category === g);
            if (list.length === 0) return null;
            const M = CATEGORY_META[g];
            const Icon = M.icon;
            return (
              <section key={g} data-testid={`compliance-section-${g}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`h-9 w-9 rounded-md flex items-center justify-center ${M.bg} ${M.color}`}>
                    <Icon size={18} />
                  </div>
                  <h2 className="font-display text-xl font-semibold">{M.label}</h2>
                </div>
                <div className="bg-white border border-[#E7E5E4] rounded-lg divide-y divide-[#E7E5E4]">
                  {list.map((t) => (
                    <div key={t.id} data-testid={`compliance-task-${t.id}`} className="p-5 flex flex-col md:flex-row md:items-start gap-4">
                      <button
                        data-testid={`toggle-task-${t.id}`}
                        onClick={() => toggle(t)}
                        className={`mt-0.5 h-5 w-5 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                          t.completed ? "bg-[#166534] border-[#166534]" : "bg-white border-[#E7E5E4]"
                        }`}
                      >
                        {t.completed && <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none"><path d="M2 6l2.5 2.5L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium ${t.completed ? "line-through text-[#78716C]" : ""}`}>{t.title}</div>
                        {t.completed_date && <div className="text-xs text-[#166534] mt-1">Completed {fmtDate(t.completed_date)}</div>}
                        <textarea
                          defaultValue={t.notes || ""}
                          onBlur={(e) => setNotes(t, e.target.value)}
                          placeholder="Notes…"
                          rows={2}
                          className="mt-2 w-full text-sm border border-[#E7E5E4] rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#166534]/30"
                        />
                      </div>
                      <div className="flex flex-col items-end gap-2 md:w-48">
                        <label className="block w-full">
                          <span className="text-[11px] uppercase tracking-[0.15em] font-bold text-[#78716C]">Due</span>
                          <input
                            type="date"
                            defaultValue={t.due_date || ""}
                            onBlur={(e) => setDue(t, e.target.value)}
                            className="mt-1 w-full border border-[#E7E5E4] rounded-md px-2 py-1.5 text-sm"
                          />
                        </label>
                        <button onClick={() => onDelete(t.id)} className="text-[#C53030] text-xs flex items-center gap-1"><Trash2 size={12} /> Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={onSubmit} className="bg-white border border-[#E7E5E4] rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="font-display text-xl font-semibold">Add task</div>
              <button type="button" onClick={() => setOpen(false)}><X size={18} /></button>
            </div>
            <Field label="Title" required>
              <input data-testid="task-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inp} />
            </Field>
            <Field label="Category">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inp}>
                <option value="IL_NFP">Illinois NFP</option>
                <option value="IRS">IRS</option>
                <option value="Internal">Internal</option>
              </select>
            </Field>
            <Field label="Due date">
              <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className={inp} />
            </Field>
            <Field label="Notes">
              <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inp} />
            </Field>
            <div className="mt-6 flex gap-3 justify-end">
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-md border border-[#E7E5E4]">Cancel</button>
              <button data-testid="save-task-btn" type="submit" className="px-4 py-2 rounded-md bg-[#166534] text-white font-semibold">Save</button>
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
      <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C] mb-1.5">{label} {required && <span className="text-[#C53030]">*</span>}</div>
      {children}
    </label>
  );
}
