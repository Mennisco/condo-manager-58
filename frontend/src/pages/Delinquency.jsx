import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { fmtMoney, fmtDate } from "@/lib/utils";
import { Printer, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function Delinquency() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/reports/delinquency").then((r) => setData(r.data));
  }, []);

  if (!data) return <div className="text-[#78716C]">Loading…</div>;
  const { rows, totals } = data;

  return (
    <div data-testid="delinquency-page" className="space-y-6">
      <div className="no-print flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">Board meeting sheet</div>
          <h1 className="font-display text-4xl font-bold tracking-tight mt-2">Delinquency Report</h1>
          <p className="text-[#78716C] mt-2 max-w-2xl">Who owes what — past-due balances only (future months not yet due are excluded).</p>
        </div>
        <button
          data-testid="print-delinquency-btn"
          onClick={() => window.print()}
          className="bg-[#166534] hover:bg-[#14532D] text-white px-4 py-2.5 rounded-md font-semibold flex items-center gap-2"
        >
          <Printer size={16} /> Print / Save as PDF
        </button>
      </div>

      <div className="print-area bg-white border border-[#E7E5E4] rounded-lg p-6 md:p-8 print:border-none print:p-0">
        <div className="hidden print:block border-b-2 border-[#166534] pb-3 mb-4">
          <div className="text-xs uppercase tracking-[0.2em] font-bold text-[#166534]">Innsbruck One Condominium Association</div>
          <h2 className="font-display text-2xl font-bold mt-1">Delinquency Report</h2>
          <div className="text-sm text-[#78716C]">Generated {fmtDate(data.generated_at)}</div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Stat label="Delinquent units" value={totals.delinquent_units} accent={totals.delinquent_units ? "text-[#C53030]" : "text-[#166534]"} />
          <Stat label="Total overdue" value={fmtMoney(totals.total_overdue)} accent="text-[#C53030]" />
          <Stat label="Billed (all-time)" value={fmtMoney(totals.grand_billed)} />
          <Stat label="Collected (all-time)" value={fmtMoney(totals.grand_collected)} accent="text-[#166534]" />
        </div>

        {rows.length === 0 ? (
          <div data-testid="delinquency-empty" className="flex items-center gap-2 text-[#166534] py-8 justify-center">
            <CheckCircle2 size={18} /> No past-due balances. Every owner is current.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.15em] font-bold text-[#78716C] border-b border-[#E7E5E4]">
                <th className="py-2 pr-3">Unit</th>
                <th className="py-2 pr-3">Owner</th>
                <th className="py-2 pr-3">Contact</th>
                <th className="py-2 pr-3">Oldest owed</th>
                <th className="py-2 pr-3 text-center">Months</th>
                <th className="py-2 text-right">Overdue</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.unit_id} data-testid={`delinquency-row-${r.unit_number}`} onClick={() => navigate(`/units/${r.unit_id}`)} className="border-b border-[#F5F5F4] cursor-pointer hover:bg-[#F5F5F4] print:cursor-auto">
                  <td className="py-3 pr-3 font-semibold">{r.unit_number}</td>
                  <td className="py-3 pr-3">{r.owner_name}</td>
                  <td className="py-3 pr-3 text-[#78716C] text-xs">
                    <div>{r.owner_email || "—"}</div>
                    <div>{r.owner_phone || ""}</div>
                  </td>
                  <td className="py-3 pr-3 text-[#78716C]">{r.oldest_owed || "—"}</td>
                  <td className="py-3 pr-3 text-center tabular-nums">{r.months_overdue}</td>
                  <td className="py-3 text-right">
                    <span className="inline-flex items-center gap-1 font-bold text-[#C53030] tabular-nums">
                      <AlertTriangle size={13} className="print:hidden" /> {fmtMoney(r.overdue)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#166534] font-bold">
                <td className="py-3" colSpan={5}>Total overdue</td>
                <td className="py-3 text-right tabular-nums text-[#C53030]">{fmtMoney(totals.total_overdue)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="border border-[#E7E5E4] rounded-lg p-4 print:border-none print:p-0">
      <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">{label}</div>
      <div className={`font-display text-2xl font-bold mt-1 tabular-nums ${accent || ""}`}>{value}</div>
    </div>
  );
}
