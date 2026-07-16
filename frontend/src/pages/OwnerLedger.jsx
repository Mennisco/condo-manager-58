import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { fmtMoney, fmtDate, MONTHS } from "@/lib/utils";
import { ArrowLeft, Printer, CheckCircle2, AlertTriangle, CircleDollarSign, StickyNote } from "lucide-react";

const STATUS = {
  posted: { label: "Posted", cls: "text-[#166534] bg-[#F0FDF4] border-[#BBF7D0]", Icon: CheckCircle2 },
  short: { label: "Short", cls: "text-[#B45309] bg-[#FFFBEB] border-[#FDE68A]", Icon: CircleDollarSign },
  unpaid: { label: "Unpaid", cls: "text-[#C53030] bg-[#FEF2F2] border-[#FECACA]", Icon: AlertTriangle },
};

export default function OwnerLedger() {
  const { unitId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    api.get(`/units/${unitId}/ledger`).then((r) => setData(r.data)).catch(() => setErr(true));
  }, [unitId]);

  if (err) return <div data-testid="ledger-error" className="text-[#C53030]">Could not load this owner's history.</div>;
  if (!data) return <div className="text-[#78716C]">Loading…</div>;

  const { unit, rows, totals } = data;
  const years = [...new Set(rows.map((r) => r.period_year))].sort((a, b) => b - a);
  const balance = totals.total_short;

  return (
    <div data-testid="owner-ledger-page" className="space-y-6">
      {/* Screen controls */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4">
        <div>
          <button
            data-testid="ledger-back-btn"
            onClick={() => navigate("/units")}
            className="text-sm text-[#166534] font-semibold inline-flex items-center gap-1.5 hover:underline"
          >
            <ArrowLeft size={15} /> Back to Units &amp; Owners
          </button>
          <h1 className="font-display text-4xl font-bold tracking-tight mt-2">
            Unit {unit.unit_number} · {unit.owner_name?.trim()}
          </h1>
          <p className="text-[#78716C] mt-1">Full payment history and running balance.</p>
        </div>
        <button
          data-testid="print-statement-btn"
          onClick={() => window.print()}
          className="bg-[#166534] hover:bg-[#14532D] text-white px-4 py-2.5 rounded-md font-semibold flex items-center gap-2"
        >
          <Printer size={16} /> Print statement
        </button>
      </div>

      {/* Screen summary cards */}
      <div className="no-print grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Total billed" value={fmtMoney(totals.total_due)} />
        <SummaryCard label="Total paid" value={fmtMoney(totals.total_paid)} accent="text-[#166534]" />
        <SummaryCard label="Balance due" value={fmtMoney(balance)} accent={balance > 0.005 ? "text-[#C53030]" : "text-[#166534]"} />
        <SummaryCard label="Months paid / late" value={`${totals.months_paid} / ${totals.months_late}`} />
      </div>

      {/* Screen history, grouped by year */}
      <div className="no-print space-y-6">
        {years.map((y) => (
          <div key={y} data-testid={`ledger-year-${y}`} className="bg-white border border-[#E7E5E4] rounded-lg overflow-hidden">
            <div className="px-6 py-3 text-[11px] uppercase tracking-[0.15em] font-bold text-[#78716C] border-b border-[#E7E5E4]">{y}</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.12em] font-bold text-[#A8A29E]">
                  <th className="px-6 py-2">Month</th>
                  <th className="px-6 py-2 text-right">Due</th>
                  <th className="px-6 py-2 text-right">Paid</th>
                  <th className="px-6 py-2">Paid date</th>
                  <th className="px-6 py-2">Status</th>
                  <th className="px-6 py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {rows.filter((r) => r.period_year === y).sort((a, b) => a.period_month - b.period_month).map((r) => {
                  const st = STATUS[r.status];
                  return (
                    <tr key={r.period_month} data-testid={`ledger-row-${y}-${r.period_month}`} className="border-t border-[#F5F5F4]">
                      <td className="px-6 py-3 font-medium">
                        {MONTHS[r.period_month - 1]}
                        {r.is_late ? <span className="ml-2 text-[10px] font-bold text-[#B45309]">LATE</span> : null}
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums">{fmtMoney(r.amount_due)}</td>
                      <td className="px-6 py-3 text-right tabular-nums">{r.paid ? fmtMoney(r.amount_paid) : "—"}</td>
                      <td className="px-6 py-3 text-[#78716C]">{r.paid_date || "—"}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold rounded-full border px-2.5 py-0.5 ${st.cls}`}>
                          <st.Icon size={12} /> {st.label}{r.status === "short" ? ` $${r.short.toFixed(0)}` : ""}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        {r.notes ? (
                          <span title={r.notes} className="inline-flex items-center gap-1 text-xs text-[#B45309]">
                            <StickyNote size={13} /> <span className="max-w-[220px] truncate">{r.notes}</span>
                          </span>
                        ) : <span className="text-[#D6D3D1]">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
        {rows.length === 0 ? (
          <div className="bg-white border border-[#E7E5E4] rounded-lg p-10 text-center text-[#78716C]">
            No fee records yet for this unit.
          </div>
        ) : null}
      </div>

      {/* Print-only statement */}
      <StatementDoc unit={unit} rows={rows} totals={totals} years={years} balance={balance} />
    </div>
  );
}

function StatementDoc({ unit, rows, totals, years, balance }) {
  return (
    <div data-testid="statement-doc" className="hidden print:block print-area">
      <div className="border-b-2 border-[#166534] pb-4 mb-6">
        <div className="text-xs uppercase tracking-[0.2em] font-bold text-[#166534]">Innsbruck One Condominium Association</div>
        <h2 className="font-display text-2xl font-bold mt-1">Owner Statement</h2>
        <div className="text-sm mt-3 grid grid-cols-2 gap-y-1">
          <div><span className="text-[#78716C]">Unit:</span> <span className="font-semibold">{unit.unit_number}</span></div>
          <div><span className="text-[#78716C]">Statement date:</span> <span className="font-semibold">{fmtDate(new Date().toISOString())}</span></div>
          <div><span className="text-[#78716C]">Owner:</span> <span className="font-semibold">{unit.owner_name?.trim()}</span></div>
          <div><span className="text-[#78716C]">Monthly fee:</span> <span className="font-semibold">{fmtMoney(unit.monthly_fee)}</span></div>
        </div>
      </div>

      {years.map((y) => (
        <div key={y} className="mb-4">
          <div className="font-display text-base font-bold mb-1">{y}</div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left border-b border-[#333]">
                <th className="py-1 pr-3">Month</th>
                <th className="py-1 px-3 text-right">Due</th>
                <th className="py-1 px-3 text-right">Paid</th>
                <th className="py-1 px-3">Paid date</th>
                <th className="py-1 pl-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.filter((r) => r.period_year === y).sort((a, b) => a.period_month - b.period_month).map((r) => (
                <tr key={r.period_month} className="border-b border-[#ddd]">
                  <td className="py-1 pr-3">{MONTHS[r.period_month - 1]}{r.is_late ? " (late)" : ""}</td>
                  <td className="py-1 px-3 text-right tabular-nums">{fmtMoney(r.amount_due)}</td>
                  <td className="py-1 px-3 text-right tabular-nums">{r.paid ? fmtMoney(r.amount_paid) : "—"}</td>
                  <td className="py-1 px-3">{r.paid_date || "—"}</td>
                  <td className="py-1 pl-3 text-right tabular-nums">{r.short > 0 ? fmtMoney(r.short) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <div className="border-t-2 border-[#166534] pt-3 mt-4 text-sm">
        <div className="flex justify-between"><span>Total billed (all-time)</span><span className="tabular-nums font-semibold">{fmtMoney(totals.total_due)}</span></div>
        <div className="flex justify-between"><span>Total paid</span><span className="tabular-nums font-semibold">{fmtMoney(totals.total_paid)}</span></div>
        <div className="flex justify-between text-base font-bold mt-1 pt-1 border-t border-[#ddd]">
          <span>Balance due</span>
          <span className="tabular-nums">{fmtMoney(balance)}</span>
        </div>
      </div>
      <div className="text-[10px] text-[#78716C] mt-6">
        Late fees, when assessed, are applied manually by the treasurer and are not reflected above unless recorded. Questions? Contact the association treasurer.
      </div>
    </div>
  );
}

function SummaryCard({ label, value, accent }) {
  return (
    <div className="bg-white border border-[#E7E5E4] rounded-lg p-5">
      <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">{label}</div>
      <div className={`font-display text-2xl font-bold mt-2 tabular-nums ${accent || ""}`}>{value}</div>
    </div>
  );
}
