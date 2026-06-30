import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { fmtMoney } from "@/lib/utils";
import { Printer, TrendingUp } from "lucide-react";

const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function rangeFor(period, year, custom) {
  const now = new Date();
  if (period === "month") {
    const m = now.getMonth();
    return { start: iso(new Date(now.getFullYear(), m, 1)), end: iso(new Date(now.getFullYear(), m + 1, 0)) };
  }
  if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    return { start: iso(new Date(now.getFullYear(), q * 3, 1)), end: iso(new Date(now.getFullYear(), q * 3 + 3, 0)) };
  }
  if (period === "ytd") {
    return { start: iso(new Date(now.getFullYear(), 0, 1)), end: iso(now) };
  }
  if (period === "year") {
    return { start: `${year}-01-01`, end: `${year}-12-31` };
  }
  return { start: custom.start, end: custom.end };
}

const LABELS = { month: "This Month", quarter: "This Quarter", ytd: "Year-to-Date", year: "Full Year", custom: "Custom Range" };

export default function PnL() {
  const [period, setPeriod] = useState("ytd");
  const [basis, setBasis] = useState("accrual");
  const [year, setYear] = useState(new Date().getFullYear());
  const [custom, setCustom] = useState({ start: `${new Date().getFullYear()}-01-01`, end: iso(new Date()) });
  const [data, setData] = useState(null);

  const range = useMemo(() => rangeFor(period, year, custom), [period, year, custom]);

  useEffect(() => {
    if (!range.start || !range.end) return;
    api.get(`/reports/pnl?start=${range.start}&end=${range.end}&basis=${basis}`).then((r) => setData(r.data));
  }, [range.start, range.end, basis]);

  const inp = "border border-[#E7E5E4] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#166534]/40 focus:border-[#166534]";

  return (
    <div data-testid="pnl-page" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 no-print">
        <div>
          <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">Monthly reporting</div>
          <h1 className="font-display text-4xl font-bold tracking-tight mt-2">P&amp;L Statement</h1>
          <p className="text-[#78716C] mt-2 max-w-2xl">Income and expenses for any period, with a budget comparison.</p>
        </div>
        <button data-testid="pnl-print-btn" onClick={() => window.print()} className="bg-[#1C1917] hover:bg-black text-white px-4 py-2.5 rounded-md font-semibold flex items-center gap-2">
          <Printer size={16} /> Print / PDF
        </button>
      </div>

      <div className="flex flex-wrap gap-4 items-end no-print">
        <div>
          <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C] mb-1.5">Period</div>
          <select data-testid="pnl-period" value={period} onChange={(e) => setPeriod(e.target.value)} className={`${inp} w-44`}>
            {Object.entries(LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {period === "year" ? (
          <div>
            <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C] mb-1.5">Year</div>
            <input data-testid="pnl-year" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className={`${inp} w-24`} />
          </div>
        ) : null}
        {period === "custom" ? (
          <>
            <div>
              <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C] mb-1.5">From</div>
              <input data-testid="pnl-start" type="date" value={custom.start} onChange={(e) => setCustom({ ...custom, start: e.target.value })} className={inp} />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C] mb-1.5">To</div>
              <input data-testid="pnl-end" type="date" value={custom.end} onChange={(e) => setCustom({ ...custom, end: e.target.value })} className={inp} />
            </div>
          </>
        ) : null}
        <div>
          <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C] mb-1.5">Basis</div>
          <div className="inline-flex rounded-md border border-[#E7E5E4] overflow-hidden">
            <button data-testid="pnl-basis-accrual" onClick={() => setBasis("accrual")} className={`px-3 py-2 text-sm font-semibold ${basis === "accrual" ? "bg-[#166534] text-white" : "bg-white text-[#78716C]"}`}>Earned (accrual)</button>
            <button data-testid="pnl-basis-cash" onClick={() => setBasis("cash")} className={`px-3 py-2 text-sm font-semibold ${basis === "cash" ? "bg-[#166534] text-white" : "bg-white text-[#78716C]"}`}>Cash</button>
          </div>
        </div>
      </div>

      {data ? (
        <div className="bg-white border border-[#E7E5E4] rounded-lg p-8 print-area">
          <div className="mb-6">
            <div className="font-display text-2xl font-bold">Innsbruck One — Profit &amp; Loss</div>
            <div className="text-sm text-[#78716C] mt-1">
              {data.start} to {data.end} · {basis === "accrual" ? "Earned (accrual) basis" : "Cash basis"}
            </div>
          </div>

          {/* Income */}
          <SectionTitle>Income</SectionTitle>
          <Row label="Monthly fees" value={data.income.fees} testid="pnl-income-fees" />
          {data.income.late_fees > 0 ? <Row label="Late fees assessed" value={data.income.late_fees} testid="pnl-income-late" /> : null}
          <TotalRow label="Total income" value={data.income.total} testid="pnl-total-income" />

          {/* Expenses */}
          <SectionTitle className="mt-8">Expenses</SectionTitle>
          <div className="grid grid-cols-12 text-[11px] uppercase tracking-[0.12em] font-bold text-[#A8A29E] pb-2 border-b border-[#E7E5E4]">
            <div className="col-span-6">Category</div>
            <div className="col-span-2 text-right">Actual</div>
            <div className="col-span-2 text-right">Budget</div>
            <div className="col-span-2 text-right">Variance</div>
          </div>
          {data.expense_lines.map((l) => (
            <div key={l.category} data-testid={`pnl-exp-${l.category}`} className="grid grid-cols-12 py-2 text-sm border-b border-[#F5F5F4]">
              <div className="col-span-6">{l.category}</div>
              <div className="col-span-2 text-right tabular-nums">{fmtMoney(l.actual)}</div>
              <div className="col-span-2 text-right tabular-nums text-[#78716C]">{fmtMoney(l.budget)}</div>
              <div className={`col-span-2 text-right tabular-nums ${l.variance < 0 ? "text-[#C53030]" : "text-[#166534]"}`}>{l.variance < 0 ? "(" + fmtMoney(Math.abs(l.variance)) + ")" : fmtMoney(l.variance)}</div>
            </div>
          ))}
          <div className="grid grid-cols-12 py-3 text-sm font-bold border-b-2 border-[#1C1917]">
            <div className="col-span-6">Total expenses</div>
            <div className="col-span-2 text-right tabular-nums" data-testid="pnl-total-expenses">{fmtMoney(data.total_expenses)}</div>
            <div className="col-span-2 text-right tabular-nums text-[#78716C]">{fmtMoney(data.total_budget)}</div>
            <div className={`col-span-2 text-right tabular-nums ${data.total_budget - data.total_expenses < 0 ? "text-[#C53030]" : "text-[#166534]"}`}>{fmtMoney(data.total_budget - data.total_expenses)}</div>
          </div>

          {/* Net */}
          <div className="flex items-center justify-between mt-8 bg-[#FAFAF9] rounded-lg px-6 py-5 border border-[#E7E5E4]">
            <div className="font-display text-lg font-bold">Net Income {data.net_income >= 0 ? "(Surplus)" : "(Deficit)"}</div>
            <div data-testid="pnl-net-income" className={`font-display text-2xl font-bold tabular-nums ${data.net_income >= 0 ? "text-[#166534]" : "text-[#C53030]"}`}>
              {data.net_income < 0 ? "(" + fmtMoney(Math.abs(data.net_income)) + ")" : fmtMoney(data.net_income)}
            </div>
          </div>
          <p className="text-xs text-[#A8A29E] mt-4 flex items-center gap-1.5">
            <TrendingUp size={13} />
            Budget figures are the annual budget prorated across {data.months} month{data.months > 1 ? "s" : ""} in this period.
          </p>
        </div>
      ) : (
        <div className="text-[#78716C] py-12 text-center">Loading…</div>
      )}
    </div>
  );
}

const SectionTitle = ({ children, className = "" }) => (
  <div className={`font-display text-lg font-bold mb-2 ${className}`}>{children}</div>
);

function Row({ label, value, testid }) {
  return (
    <div className="flex justify-between py-2 text-sm border-b border-[#F5F5F4]">
      <span>{label}</span>
      <span data-testid={testid} className="tabular-nums">{fmtMoney(value)}</span>
    </div>
  );
}

function TotalRow({ label, value, testid }) {
  return (
    <div className="flex justify-between py-3 text-sm font-bold border-b-2 border-[#1C1917]">
      <span>{label}</span>
      <span data-testid={testid} className="tabular-nums">{fmtMoney(value)}</span>
    </div>
  );
}
