import { useEffect, useState } from "react";
import api from "@/lib/api";
import { fmtMoney, fmtDate, MONTHS } from "@/lib/utils";
import { Check, X, Loader2, AlertTriangle, Trash2, Plus, StickyNote, Pencil } from "lucide-react";
import { toast } from "sonner";
import { MakeupModal } from "@/components/MakeupModal";
import { EditFeeModal } from "@/components/EditFeeModal";

export default function Fees() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [showMakeup, setShowMakeup] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get(`/fees?year=${year}&month=${month}`);
    setFees(data);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [year, month]);

  const generate = async () => {
    setGenLoading(true);
    try {
      const { data } = await api.post(`/fees/generate?year=${year}&month=${month}`);
      toast.success(`${data.created} fee record(s) created`);
      load();
    } catch (e) {
      toast.error("Could not generate fees");
    }
    setGenLoading(false);
  };

  const togglePaid = async (f) => {
    const newPaid = !f.paid;
    await api.put(`/fees/${f.id}`, {
      paid: newPaid,
      amount_paid: newPaid ? f.amount_due : 0,
      paid_date: newPaid ? new Date().toISOString() : null,
      method: newPaid && !f.method ? "check" : f.method,
    });
    load();
  };

  const updateMethod = async (f, method) => {
    await api.put(`/fees/${f.id}`, { method });
    load();
  };

  const toggleWaive = async (f) => {
    await api.put(`/fees/${f.id}`, { late_fee_charged: !f.late_fee_applied });
    load();
  };

  const onDelete = async (f) => {
    if (!confirm(`Delete the ${MONTHS[f.period_month - 1]} ${f.period_year} fee row for unit ${f.unit_number}?`)) return;
    await api.delete(`/fees/${f.id}`);
    toast.success("Fee row deleted");
    load();
  };

  const total = fees.reduce((a, f) => a + (f.amount_paid || 0), 0);
  const due = fees.reduce((a, f) => a + (f.total_due ?? f.amount_due ?? 0), 0);
  const lateFees = fees.reduce((a, f) => a + (f.late_fee_applied ? f.late_fee || 0 : 0), 0);
  const overdue = fees.filter((f) => !f.paid).length;
  const shortTotal = fees.reduce((a, f) => a + (f.short || 0), 0);

  return (
    <div data-testid="fees-page" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">Monthly tracking</div>
          <h1 className="font-display text-4xl font-bold tracking-tight mt-2">Monthly Fees</h1>
          <p className="text-[#78716C] mt-2">Mark each unit's monthly assessment as paid (check, Zelle, cash, etc.).</p>
        </div>
        <div className="flex gap-3 items-end">
          <div>
            <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C] mb-1.5">Month</div>
            <select data-testid="fee-month" value={month} onChange={(e) => setMonth(Number(e.target.value))} className={inp}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C] mb-1.5">Year</div>
            <input data-testid="fee-year" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className={`${inp} w-24`} />
          </div>
          <button
            data-testid="record-makeup-btn"
            onClick={() => setShowMakeup(true)}
            className="border border-[#166534] text-[#166534] hover:bg-[#F0FDF4] px-4 py-2.5 rounded-md font-semibold flex items-center gap-2"
          >
            <Plus size={16} /> Make-up payment
          </button>
          <button
            data-testid="generate-fees-btn"
            onClick={generate}
            disabled={genLoading}
            className="bg-[#166534] hover:bg-[#14532D] text-white px-4 py-2.5 rounded-md font-semibold flex items-center gap-2 disabled:opacity-60"
          >
            {genLoading ? <Loader2 className="animate-spin" size={16} /> : null}
            Generate {MONTHS[month - 1]} fees
          </button>
        </div>
      </div>

      {showMakeup ? <MakeupModal onClose={() => setShowMakeup(false)} onSaved={() => { setShowMakeup(false); load(); }} /> : null}
      {editing ? <EditFeeModal fee={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} /> : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Stat label="Collected" value={fmtMoney(total)} accent="bg-[#F0FDF4] text-[#166534]" testid="fees-stat-collected" />
        <Stat label="Total Due" value={fmtMoney(due)} accent="bg-[#F5F5F4] text-[#1C1917]" testid="fees-stat-due" />
        <Stat label="Late Fees" value={fmtMoney(lateFees)} accent="bg-[#FFFBEB] text-[#B45309]" testid="fees-stat-latefees" />
        <Stat label="Short (rate)" value={fmtMoney(shortTotal)} accent="bg-[#FFFBEB] text-[#B45309]" testid="fees-stat-short" icon={shortTotal > 0 ? AlertTriangle : null} />
        <Stat label="Unpaid Units" value={overdue} accent="bg-[#FEF2F2] text-[#C53030]" testid="fees-stat-unpaid" icon={overdue > 0 ? AlertTriangle : null} />
      </div>

      <div className="bg-white border border-[#E7E5E4] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F5F5F4] text-left text-[11px] uppercase tracking-[0.15em] font-bold text-[#78716C]">
            <tr>
              <th className="px-6 py-3">Unit</th>
              <th className="px-6 py-3">Owner</th>
              <th className="px-6 py-3 text-right">Due</th>
              <th className="px-6 py-3 text-right">Late Fee</th>
              <th className="px-6 py-3 text-right">Paid</th>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Method</th>
              <th className="px-6 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-6 py-12 text-center text-[#78716C]">Loading…</td></tr>
            ) : fees.length === 0 ? (
              <tr><td colSpan={8} className="px-6 py-12 text-center text-[#78716C]">
                No fees for {MONTHS[month - 1]} {year}. Click "Generate" to create one per unit.
              </td></tr>
            ) : fees.map((f) => (
              <tr key={f.id} data-testid={`fee-row-${f.unit_number}`} className={`border-t border-[#E7E5E4] hover:bg-[#F5F5F4] ${f.short > 0 ? "bg-[#FFFBEB]/60" : ""}`}>
                <td className="px-6 py-4 font-semibold">{f.unit_number}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5">
                    {f.owner_name}
                    {f.notes ? (
                      <span data-testid={`fee-note-${f.unit_number}`} title={f.notes} className="text-[#B45309] cursor-help">
                        <StickyNote size={13} />
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-6 py-4 text-right tabular-nums">{fmtMoney(f.amount_due)}</td>
                <td className="px-6 py-4 text-right tabular-nums">
                  {f.late_fee > 0 ? (
                    f.late_fee_applied ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[#B45309] font-semibold" title="Late fee charged to this account">{fmtMoney(f.late_fee)}</span>
                        <button
                          data-testid={`remove-late-fee-${f.unit_number}`}
                          onClick={() => toggleWaive(f)}
                          title="Remove this late fee"
                          className="text-[10px] uppercase tracking-wide font-bold text-[#78716C] hover:text-[#166534] border border-[#E7E5E4] rounded px-1.5 py-0.5"
                        >
                          Remove
                        </button>
                      </div>
                    ) : f.is_late ? (
                      <button
                        data-testid={`apply-late-fee-${f.unit_number}`}
                        onClick={() => toggleWaive(f)}
                        title="This payment is late — apply the late fee manually"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] rounded px-2 py-1 hover:bg-[#FEF3C7]"
                      >
                        Late — Apply {fmtMoney(f.late_fee)}
                      </button>
                    ) : (
                      <span className="text-[#A8A29E]">—</span>
                    )
                  ) : (
                    <span className="text-[#A8A29E]">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right tabular-nums">
                  {fmtMoney(f.amount_paid)}
                  {f.short > 0 ? (
                    <div
                      data-testid={`short-tag-${f.unit_number}`}
                      title={`Paid ${fmtMoney(f.amount_paid)} of ${fmtMoney(f.amount_due)} due — short ${fmtMoney(f.short)} (rate increase). Late fee waived; grace extended.`}
                      className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]"
                    >
                      <AlertTriangle size={10} /> Short {fmtMoney(f.short)}
                    </div>
                  ) : null}
                </td>
                <td className="px-6 py-4 text-[#78716C]">
                  {f.paid_date ? fmtDate(f.paid_date) : "—"}
                  {f.prepaid ? (
                    <span
                      data-testid={`prepaid-tag-${f.unit_number}`}
                      title={`Prepaid — same date covers ${f.prepayment_months} months`}
                      className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-[#F0FDF4] text-[#166534] border border-[#166534]/20"
                    >
                      Prepaid
                    </span>
                  ) : null}
                </td>
                <td className="px-6 py-4">
                  <select
                    data-testid={`fee-method-${f.unit_number}`}
                    value={f.method || ""}
                    onChange={(e) => updateMethod(f, e.target.value)}
                    className="border border-[#E7E5E4] rounded-md px-2 py-1 text-sm bg-white"
                  >
                    <option value="">—</option>
                    <option value="check">Check</option>
                    <option value="zelle">Zelle</option>
                    <option value="cash">Cash</option>
                    <option value="ach">ACH</option>
                    <option value="other">Other</option>
                  </select>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    data-testid={`toggle-paid-${f.unit_number}`}
                    onClick={() => togglePaid(f)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold ${
                      f.paid
                        ? "bg-[#F0FDF4] text-[#166534] border border-[#166534]/20"
                        : "bg-[#FEF2F2] text-[#C53030] border border-[#C53030]/20"
                    }`}
                  >
                    {f.paid ? <Check size={14} /> : <X size={14} />} {f.paid ? "Paid" : "Unpaid"}
                  </button>
                  <button
                    data-testid={`edit-fee-${f.unit_number}`}
                    onClick={() => setEditing(f)}
                    title="Edit paid date, amount, method"
                    className="ml-3 text-[#78716C] hover:text-[#166534] align-middle inline-flex"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    data-testid={`delete-fee-${f.unit_number}`}
                    onClick={() => onDelete(f)}
                    title="Delete this fee row"
                    className="ml-3 text-[#C53030] hover:text-[#9b1c1c] align-middle inline-flex"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inp = "border border-[#E7E5E4] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#166534]/40 focus:border-[#166534] bg-white";

function Stat({ label, value, accent, testid, icon: Icon }) {
  return (
    <div data-testid={testid} className="bg-white border border-[#E7E5E4] rounded-lg p-6">
      <div className="flex items-start justify-between">
        <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">{label}</div>
        {Icon ? <div className={`h-8 w-8 rounded-md flex items-center justify-center ${accent}`}><Icon size={16} /></div> : null}
      </div>
      <div className="font-display text-3xl font-bold mt-3 tabular-nums">{value}</div>
    </div>
  );
}
