import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { fmtMoney } from "@/lib/utils";
import { Calculator, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

const LATE_PCT = 0.25;

export default function FeeIncrease() {
  const [units, setUnits] = useState([]);
  const [target, setTarget] = useState(0);
  const [applying, setApplying] = useState(false);

  const load = async () => {
    const { data } = await api.get("/units");
    setUnits(data);
    const currentAnnual = data.reduce((a, u) => a + (u.monthly_fee || 0), 0) * 12;
    setTarget(Math.round(currentAnnual));
  };
  useEffect(() => { load(); }, []);

  const rows = useMemo(() => {
    const monthlyBudget = (Number(target) || 0) / 12;
    return units.map((u) => {
      const pct = u.ownership_pct || 0;
      const newDues = monthlyBudget * pct;
      const increase = newDues - (u.monthly_fee || 0);
      const newLate = newDues * LATE_PCT;
      return { ...u, pct, newDues, increase, newLate };
    });
  }, [units, target]);

  const totals = rows.reduce(
    (a, r) => ({
      pct: a.pct + r.pct,
      current: a.current + (r.monthly_fee || 0),
      newDues: a.newDues + r.newDues,
      increase: a.increase + r.increase,
      newLate: a.newLate + r.newLate,
    }),
    { pct: 0, current: 0, newDues: 0, increase: 0, newLate: 0 }
  );

  const apply = async () => {
    if (!confirm("Apply these new monthly dues and late fees to all units? This updates each unit's Monthly Fee and Late Fee.")) return;
    setApplying(true);
    try {
      const payload = rows.map((r) => ({
        unit_id: r.id,
        monthly_fee: Number(r.newDues.toFixed(2)),
        late_fee: Number(r.newLate.toFixed(2)),
      }));
      const { data } = await api.post("/units/apply-fees", payload);
      toast.success(`Updated ${data.updated} units`);
      load();
    } catch (e) {
      toast.error("Could not apply new fees");
    }
    setApplying(false);
  };

  return (
    <div data-testid="fee-increase-page" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">Planning tool</div>
          <h1 className="font-display text-4xl font-bold tracking-tight mt-2">Fee Increase Worksheet</h1>
          <p className="text-[#78716C] mt-2 max-w-2xl">
            Enter next year's target annual budget. Each unit's new monthly dues are calculated from its
            percentage of ownership, with a late fee set at 25% of the new monthly dues.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-[#E7E5E4] rounded-lg p-6">
          <label className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">Target annual budget</label>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-2xl font-display font-bold text-[#78716C]">$</span>
            <input
              data-testid="target-budget-input"
              type="number"
              step="1"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full border border-[#E7E5E4] rounded-md px-3 py-2 text-2xl font-display font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-[#166534]/40 focus:border-[#166534]"
            />
          </div>
          <div className="text-xs text-[#78716C] mt-2 tabular-nums">
            Monthly budget: {fmtMoney((Number(target) || 0) / 12)}
          </div>
        </div>
        <Stat label="New monthly total" value={fmtMoney(totals.newDues)} testid="fi-new-total" />
        <Stat label="Total monthly increase" value={fmtMoney(totals.increase)} testid="fi-total-increase" accent={totals.increase >= 0 ? "text-[#B45309]" : "text-[#166534]"} />
      </div>

      <div className="bg-white border border-[#E7E5E4] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F5F5F4] text-left text-[11px] uppercase tracking-[0.15em] font-bold text-[#78716C]">
            <tr>
              <th className="px-6 py-3">Unit</th>
              <th className="px-6 py-3">Owner</th>
              <th className="px-6 py-3 text-right">% Ownership</th>
              <th className="px-6 py-3 text-right">Current Dues</th>
              <th className="px-6 py-3 text-right">New Monthly Dues</th>
              <th className="px-6 py-3 text-right">Monthly Increase</th>
              <th className="px-6 py-3 text-right">New Late Fee</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} data-testid={`fi-row-${r.unit_number}`} className="border-t border-[#E7E5E4] hover:bg-[#F5F5F4]">
                <td className="px-6 py-4 font-semibold">{r.unit_number}</td>
                <td className="px-6 py-4">{r.owner_name}</td>
                <td className="px-6 py-4 text-right tabular-nums text-[#78716C]">{(r.pct * 100).toFixed(1)}%</td>
                <td className="px-6 py-4 text-right tabular-nums">{fmtMoney(r.monthly_fee)}</td>
                <td className="px-6 py-4 text-right tabular-nums font-semibold text-[#166534]">{fmtMoney(r.newDues)}</td>
                <td className={`px-6 py-4 text-right tabular-nums ${r.increase >= 0 ? "text-[#B45309]" : "text-[#166534]"}`}>
                  {r.increase >= 0 ? "+" : ""}{fmtMoney(r.increase)}
                </td>
                <td className="px-6 py-4 text-right tabular-nums text-[#78716C]">{fmtMoney(r.newLate)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#E7E5E4] bg-[#FAFAF9] font-bold">
              <td className="px-6 py-4" colSpan={2}>Totals</td>
              <td className="px-6 py-4 text-right tabular-nums">{(totals.pct * 100).toFixed(1)}%</td>
              <td className="px-6 py-4 text-right tabular-nums">{fmtMoney(totals.current)}</td>
              <td className="px-6 py-4 text-right tabular-nums">{fmtMoney(totals.newDues)}</td>
              <td className="px-6 py-4 text-right tabular-nums">{fmtMoney(totals.increase)}</td>
              <td className="px-6 py-4 text-right tabular-nums">{fmtMoney(totals.newLate)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-[#78716C] flex items-center gap-2">
          <Calculator size={16} className="text-[#166534]" />
          Applying will overwrite each unit's Monthly Fee and Late Fee with the new values above.
        </p>
        <button
          data-testid="apply-fees-btn"
          onClick={apply}
          disabled={applying}
          className="bg-[#166534] hover:bg-[#14532D] text-white px-5 py-2.5 rounded-md font-semibold flex items-center gap-2 disabled:opacity-60"
        >
          {applying ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
          Apply new fees to units
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, testid, accent }) {
  return (
    <div data-testid={testid} className="bg-white border border-[#E7E5E4] rounded-lg p-6">
      <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">{label}</div>
      <div className={`font-display text-2xl font-bold mt-3 tabular-nums ${accent || ""}`}>{value}</div>
    </div>
  );
}
