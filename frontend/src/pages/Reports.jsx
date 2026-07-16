import { useEffect, useState } from "react";
import api from "@/lib/api";
import { fmtMoney, fmtDate, MONTHS } from "@/lib/utils";
import { Printer, FileBarChart2, Download } from "lucide-react";
import { toast } from "sonner";

async function downloadCsv(path, fallbackName) {
  try {
    const res = await api.get(path, { responseType: "blob" });
    const cd = res.headers?.["content-disposition"] || "";
    const m = cd.match(/filename="?([^"]+)"?/);
    const name = m ? m[1] : fallbackName;
    const url = window.URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    toast.success(`Exported ${name}`);
  } catch (e) {
    toast.error("Export failed");
  }
}

export default function Reports() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [report, setReport] = useState(null);

  useEffect(() => {
    api.get(`/reports/annual?year=${year}`).then((r) => setReport(r.data));
  }, [year]);

  if (!report) return <div className="text-[#78716C]">Loading…</div>;

  const s = report.summary;
  const totalBudget = report.budget.reduce((a, b) => a + b.budgeted_amount, 0);

  return (
    <div data-testid="reports-page" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">Year-end summary</div>
          <h1 className="font-display text-4xl font-bold tracking-tight mt-2">Annual Report</h1>
          <p className="text-[#78716C] mt-2">Print-friendly summary you can hand to the board, attach to filings, or save as PDF.</p>
        </div>
        <div className="flex gap-3 items-end">
          <div>
            <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C] mb-1.5">Year</div>
            <input data-testid="reports-year" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className="border border-[#E7E5E4] rounded-md px-3 py-2 w-24 bg-white" />
          </div>
          <button
            data-testid="print-report-btn"
            onClick={() => window.print()}
            className="bg-[#166534] hover:bg-[#14532D] text-white px-4 py-2.5 rounded-md font-semibold flex items-center gap-2"
          >
            <Printer size={16} /> Print / Save as PDF
          </button>
        </div>
      </div>

      <div data-testid="data-exports" className="no-print bg-white border border-[#E7E5E4] rounded-lg p-6">
        <div className="flex items-center gap-2 mb-1">
          <Download size={16} className="text-[#166534]" />
          <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">Data exports (CSV)</div>
        </div>
        <p className="text-sm text-[#78716C] mb-4">Download spreadsheets for records, backup, or handoff to the next treasurer. Fees &amp; expenses use the year selected above; the owner summary is all-time.</p>
        <div className="flex flex-wrap gap-3">
          <button
            data-testid="export-fees-btn"
            onClick={() => downloadCsv(`/export/fees.csv?year=${year}`, `innsbruck_fees_${year}.csv`)}
            className="border border-[#E7E5E4] hover:border-[#166534] hover:text-[#166534] rounded-md px-4 py-2.5 font-semibold text-sm flex items-center gap-2"
          >
            <Download size={15} /> Fees · {year}
          </button>
          <button
            data-testid="export-fees-all-btn"
            onClick={() => downloadCsv(`/export/fees.csv`, `innsbruck_fees_all.csv`)}
            className="border border-[#E7E5E4] hover:border-[#166534] hover:text-[#166534] rounded-md px-4 py-2.5 font-semibold text-sm flex items-center gap-2"
          >
            <Download size={15} /> Fees · all years
          </button>
          <button
            data-testid="export-expenses-btn"
            onClick={() => downloadCsv(`/export/expenses.csv?year=${year}`, `innsbruck_expenses_${year}.csv`)}
            className="border border-[#E7E5E4] hover:border-[#166534] hover:text-[#166534] rounded-md px-4 py-2.5 font-semibold text-sm flex items-center gap-2"
          >
            <Download size={15} /> Expenses · {year}
          </button>
          <button
            data-testid="export-owner-summary-btn"
            onClick={() => downloadCsv(`/export/owner-summary.csv`, `innsbruck_owner_summary.csv`)}
            className="border border-[#E7E5E4] hover:border-[#166534] hover:text-[#166534] rounded-md px-4 py-2.5 font-semibold text-sm flex items-center gap-2"
          >
            <Download size={15} /> Per-owner summary
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E7E5E4] rounded-lg p-8 md:p-12 print:border-none print:p-0">
        <div className="relative h-40 -mx-8 md:-mx-12 -mt-8 md:-mt-12 mb-6 rounded-t-lg overflow-hidden print:hidden">
          <img
            src="https://customer-assets.emergentagent.com/job_assoc-admin-3/artifacts/k5io5897_I1clean.png"
            alt="Innsbruck One"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[#166534]/40" />
        </div>
        <div className="border-b border-[#E7E5E4] pb-6 mb-6">
          <div className="flex items-center gap-3 text-[#166534]">
            <FileBarChart2 size={20} />
            <div className="text-xs uppercase tracking-[0.15em] font-bold">Annual Report · {year}</div>
          </div>
          <h2 className="font-display text-3xl font-bold mt-2">{report.association_name}</h2>
          <div className="text-sm text-[#78716C] mt-1">Generated {fmtDate(report.generated_at)}</div>
        </div>

        <section className="mb-8">
          <h3 className="font-display text-xl font-semibold mb-4">Financial Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Box label="Income" value={fmtMoney(s.ytd_income)} />
            <Box label="Expenses" value={fmtMoney(s.ytd_expenses)} />
            <Box label="Net Balance" value={fmtMoney(s.balance_ytd)} />
            <Box label="Budgeted" value={fmtMoney(totalBudget)} />
          </div>
        </section>

        <section className="mb-8">
          <h3 className="font-display text-xl font-semibold mb-4">Monthly Activity</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.15em] font-bold text-[#78716C] border-b border-[#E7E5E4]">
                <th className="py-2">Month</th>
                <th className="py-2 text-right">Income</th>
                <th className="py-2 text-right">Expenses</th>
                <th className="py-2 text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              {s.monthly.map((m) => (
                <tr key={m.month} className="border-b border-[#E7E5E4]">
                  <td className="py-2">{MONTHS[m.month - 1]}</td>
                  <td className="py-2 text-right tabular-nums">{fmtMoney(m.income)}</td>
                  <td className="py-2 text-right tabular-nums">{fmtMoney(m.expenses)}</td>
                  <td className="py-2 text-right tabular-nums">{fmtMoney(m.income - m.expenses)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mb-8">
          <h3 className="font-display text-xl font-semibold mb-4">Expenses by Category</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.15em] font-bold text-[#78716C] border-b border-[#E7E5E4]">
                <th className="py-2">Category</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {s.expenses_by_category.length === 0 ? (
                <tr><td colSpan={2} className="py-4 text-[#78716C]">No expenses recorded.</td></tr>
              ) : s.expenses_by_category.map((c) => (
                <tr key={c.category} className="border-b border-[#E7E5E4]">
                  <td className="py-2">{c.category}</td>
                  <td className="py-2 text-right tabular-nums">{fmtMoney(c.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {report.budget.length > 0 && (
          <section className="mb-8">
            <h3 className="font-display text-xl font-semibold mb-4">{year} Budget</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.15em] font-bold text-[#78716C] border-b border-[#E7E5E4]">
                  <th className="py-2">Category</th>
                  <th className="py-2 text-right">Budgeted</th>
                </tr>
              </thead>
              <tbody>
                {report.budget.map((b) => (
                  <tr key={b.id} className="border-b border-[#E7E5E4]">
                    <td className="py-2">{b.category}</td>
                    <td className="py-2 text-right tabular-nums">{fmtMoney(b.budgeted_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section>
          <h3 className="font-display text-xl font-semibold mb-4">Recorded Expenses</h3>
          {report.expenses.length === 0 ? (
            <div className="text-sm text-[#78716C]">No expenses recorded for {year}.</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left uppercase tracking-[0.15em] font-bold text-[#78716C] border-b border-[#E7E5E4]">
                  <th className="py-2">Date</th>
                  <th className="py-2">Category</th>
                  <th className="py-2">Vendor</th>
                  <th className="py-2">Description</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {report.expenses.map((e) => (
                  <tr key={e.id} className="border-b border-[#E7E5E4]">
                    <td className="py-1.5">{fmtDate(e.date)}</td>
                    <td className="py-1.5">{e.category}</td>
                    <td className="py-1.5 text-[#78716C]">{e.vendor || "—"}</td>
                    <td className="py-1.5">{e.description}</td>
                    <td className="py-1.5 text-right tabular-nums">{fmtMoney(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}

function Box({ label, value }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">{label}</div>
      <div className="font-display text-2xl font-bold mt-2 tabular-nums">{value}</div>
    </div>
  );
}
