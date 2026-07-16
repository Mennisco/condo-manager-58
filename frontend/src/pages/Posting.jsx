import { useEffect, useState } from "react";
import api from "@/lib/api";
import { fmtMoney, MONTHS } from "@/lib/utils";
import { Check, X, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function Posting() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    await api.post(`/fees/generate?year=${year}&month=${month}`).catch(() => {});
    const { data } = await api.get(`/fees?year=${year}&month=${month}`);
    setFees([...data].sort((a, b) => a.unit_number.localeCompare(b.unit_number)));
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [year, month]);

  const markPaid = async (f, paid) => {
    await api.put(`/fees/${f.id}`, {
      paid,
      amount_paid: paid ? f.amount_due : 0,
      paid_date: paid ? new Date().toISOString() : null,
      method: paid && !f.method ? "check" : f.method,
    });
    load();
  };
  const setMethod = async (f, method) => { await api.put(`/fees/${f.id}`, { method }); load(); };
  const setLateFee = async (f, charged) => { await api.put(`/fees/${f.id}`, { late_fee_charged: charged }); load(); };

  const posted = fees.filter((f) => f.paid).length;
  const collected = fees.reduce((a, f) => a + (f.amount_paid || 0), 0);
  const lateCount = fees.filter((f) => !f.paid && f.is_late).length;

  return (
    <div data-testid="posting-page" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">Monthly routine</div>
          <h1 className="font-display text-4xl font-bold tracking-tight mt-2">Posting</h1>
          <p className="text-[#78716C] mt-2">Check off each unit as payments arrive — aim to post by the 10th. After that, unpaid units flag as late.</p>
        </div>
        <div className="flex gap-3 items-end">
          <div>
            <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C] mb-1.5">Month</div>
            <select data-testid="posting-month" value={month} onChange={(e) => setMonth(Number(e.target.value))} className={inp}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C] mb-1.5">Year</div>
            <input data-testid="posting-year" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className={`${inp} w-24`} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Stat label={`Posted (${MONTHS[month - 1]})`} value={`${posted} / ${fees.length}`} accent="bg-[#F0FDF4] text-[#166534]" icon={posted === fees.length && fees.length > 0 ? CheckCircle2 : null} testid="posting-stat-posted" />
        <Stat label="Collected" value={fmtMoney(collected)} accent="bg-[#F5F5F4] text-[#1C1917]" testid="posting-stat-collected" />
        <Stat label="Late (unpaid past 10th)" value={lateCount} accent="bg-[#FFFBEB] text-[#B45309]" icon={lateCount > 0 ? AlertTriangle : null} testid="posting-stat-late" />
      </div>

      <div className="bg-white border border-[#E7E5E4] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F5F5F4] text-left text-[11px] uppercase tracking-[0.15em] font-bold text-[#78716C]">
            <tr>
              <th className="px-6 py-3">Unit</th>
              <th className="px-6 py-3">Owner</th>
              <th className="px-6 py-3 text-right">Due</th>
              <th className="px-6 py-3">Method</th>
              <th className="px-6 py-3">Late fee</th>
              <th className="px-6 py-3 text-right">Post</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-[#78716C]">Loading…</td></tr>
            ) : fees.map((f) => (
              <tr key={f.id} data-testid={`posting-row-${f.unit_number}`} className={`border-t border-[#E7E5E4] ${!f.paid && f.is_late ? "bg-[#FFFBEB]/60" : "hover:bg-[#F5F5F4]"}`}>
                <td className="px-6 py-4 font-semibold">{f.unit_number}</td>
                <td className="px-6 py-4">
                  {f.owner_name}
                  {!f.paid && f.is_late ? (
                    <span data-testid={`posting-late-${f.unit_number}`} className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]"><AlertTriangle size={10} /> Late</span>
                  ) : null}
                </td>
                <td className="px-6 py-4 text-right tabular-nums">{fmtMoney(f.amount_due)}</td>
                <td className="px-6 py-4">
                  <select data-testid={`posting-method-${f.unit_number}`} value={f.method || ""} onChange={(e) => setMethod(f, e.target.value)} className="border border-[#E7E5E4] rounded-md px-2 py-1 text-sm bg-white">
                    <option value="">—</option>
                    <option value="check">Check</option>
                    <option value="zelle">Zelle</option>
                    <option value="cash">Cash</option>
                    <option value="ach">ACH</option>
                    <option value="other">Other</option>
                  </select>
                </td>
                <td className="px-6 py-4">
                  {f.late_fee > 0 ? (
                    f.late_fee_applied ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[#B45309] font-semibold">{fmtMoney(f.late_fee)}</span>
                        <button data-testid={`posting-remove-latefee-${f.unit_number}`} onClick={() => setLateFee(f, false)} className="text-[10px] uppercase font-bold text-[#78716C] hover:text-[#166534] border border-[#E7E5E4] rounded px-1.5 py-0.5">Remove</button>
                      </div>
                    ) : f.is_late && !f.paid ? (
                      <button data-testid={`posting-apply-latefee-${f.unit_number}`} onClick={() => setLateFee(f, true)} className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] rounded px-2 py-1 hover:bg-[#FEF3C7]">Apply {fmtMoney(f.late_fee)}</button>
                    ) : <span className="text-[#A8A29E]">—</span>
                  ) : <span className="text-[#A8A29E]">—</span>}
                </td>
                <td className="px-6 py-4 text-right">
                  <button data-testid={`posting-toggle-${f.unit_number}`} onClick={() => markPaid(f, !f.paid)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold ${f.paid ? "bg-[#F0FDF4] text-[#166534] border border-[#166534]/20" : "bg-[#FEF2F2] text-[#C53030] border border-[#C53030]/20"}`}>
                    {f.paid ? <Check size={14} /> : <X size={14} />} {f.paid ? "Paid" : "Mark paid"}
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
