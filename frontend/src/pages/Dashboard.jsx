import { useEffect, useState } from "react";
import api from "@/lib/api";
import { fmtMoney, monthShort, MONTHS } from "@/lib/utils";
import { TrendingUp, TrendingDown, AlertTriangle, Home, CheckCircle2, CircleDollarSign, Clock } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#166534", "#15803D", "#65A30D", "#CA8A04", "#B45309", "#C53030", "#0F766E"];

function KPI({ icon: Icon, label, value, sub, accent, testid }) {
  return (
    <div
      data-testid={testid}
      className="bg-white border border-[#E7E5E4] rounded-lg p-6"
    >
      <div className="flex items-start justify-between">
        <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">
          {label}
        </div>
        <div className={`h-8 w-8 rounded-md flex items-center justify-center ${accent}`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="mt-3 font-display text-3xl font-bold tabular-nums">{value}</div>
      {sub ? <div className="text-xs text-[#78716C] mt-1">{sub}</div> : null}
    </div>
  );
}

function TrendStrip({ trends }) {
  if (!trends || trends.length === 0) return null;
  return (
    <div data-testid="trend-strip" className="bg-white border border-[#E7E5E4] rounded-lg p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">Multi-Year Trend</div>
        <div className="text-xs text-[#78716C]">Fees collected · on-time rate · expenses</div>
      </div>
      <div className="font-display text-xl font-semibold mb-5">How the association has tracked over time</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {trends.map((t, i) => {
          const prev = trends[i - 1];
          const growth = prev && prev.expenses ? ((t.expenses - prev.expenses) / prev.expenses) * 100 : null;
          return (
            <div key={t.year} data-testid={`trend-year-${t.year}`} className="border border-[#E7E5E4] rounded-lg p-4 bg-[#FAFAF9]">
              <div className="font-display text-2xl font-bold">{t.year}</div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#78716C]">Collected</span>
                  <span className="tabular-nums font-semibold text-[#166534]">{fmtMoney(t.collected)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#78716C]">Expenses</span>
                  <span className="tabular-nums font-semibold">{fmtMoney(t.expenses)}</span>
                </div>
                <div className="flex justify-between border-t border-[#E7E5E4] pt-2 mt-1">
                  <span className="text-[#78716C]">Net</span>
                  <span className={`tabular-nums font-semibold ${(t.collected - t.expenses) >= 0 ? "text-[#166534]" : "text-[#C53030]"}`}>
                    {(t.collected - t.expenses) < 0 ? "(" + fmtMoney(Math.abs(t.collected - t.expenses)) + ")" : fmtMoney(t.collected - t.expenses)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#78716C]">On-time</span>
                  <span className="tabular-nums font-semibold">{t.on_time_rate != null ? `${t.on_time_rate}%` : "—"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#78716C]">YoY exp.</span>
                  <span className={`tabular-nums text-xs font-semibold ${growth == null ? "text-[#A8A29E]" : growth > 0 ? "text-[#B45309]" : "text-[#166534]"}`}>
                    {growth == null ? "—" : `${growth > 0 ? "+" : ""}${growth.toFixed(0)}%`}
                  </span>
                </div>
                {t.late_count > 0 ? (
                  <div className="text-[11px] text-[#A8A29E] pt-1">{t.late_count} late payment{t.late_count > 1 ? "s" : ""}</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ThisMonthTile({ tm }) {
  if (!tm) return null;
  const label = `${MONTHS[tm.month - 1]} ${tm.year}`;
  if (!tm.generated) {
    return (
      <div data-testid="this-month-tile" className="bg-white border border-[#E7E5E4] rounded-lg p-6">
        <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">This Month · {label}</div>
        <div className="text-sm text-[#78716C] mt-3">No fees generated yet for this month. Generate them under <span className="font-semibold">Monthly Fees</span> to track posting.</div>
      </div>
    );
  }
  const stats = [
    { key: "posted", label: "Posted", value: tm.posted, icon: CheckCircle2, cls: "text-[#166534] bg-[#F0FDF4] border-[#BBF7D0]" },
    { key: "short", label: "Short", value: tm.short, icon: CircleDollarSign, cls: "text-[#B45309] bg-[#FFFBEB] border-[#FDE68A]" },
    { key: "unpaid", label: "Unpaid", value: tm.unpaid, icon: AlertTriangle, cls: "text-[#C53030] bg-[#FEF2F2] border-[#FECACA]" },
    { key: "late", label: "Late", value: tm.late, icon: Clock, cls: "text-[#78716C] bg-[#F5F5F4] border-[#E7E5E4]" },
  ];
  return (
    <div data-testid="this-month-tile" className="bg-white border border-[#E7E5E4] rounded-lg p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">This Month · {label}</div>
        <div className="text-xs text-[#78716C] tabular-nums">Collected {fmtMoney(tm.total_collected)} / {fmtMoney(tm.total_due)}</div>
      </div>
      <div className="font-display text-xl font-semibold mb-5">{tm.posted}/{tm.total_units} units posted this month</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.key} data-testid={`this-month-${s.key}`} className={`rounded-lg border p-4 ${s.cls}`}>
            <div className="flex items-center gap-2">
              <s.icon size={15} />
              <span className="text-xs uppercase tracking-[0.12em] font-bold">{s.label}</span>
            </div>
            <div className="font-display text-3xl font-bold mt-2 tabular-nums">{s.value}</div>
          </div>
        ))}
      </div>
      {tm.attention.length > 0 ? (
        <div className="mt-5 border-t border-[#E7E5E4] pt-4">
          <div className="text-[11px] uppercase tracking-[0.15em] font-bold text-[#78716C] mb-2">Needs attention</div>
          <div className="space-y-1.5">
            {tm.attention.map((a, i) => (
              <div key={i} data-testid={`this-month-attention-${a.unit_number}`} className="flex items-center justify-between text-sm">
                <span className="text-[#1C1917]">
                  <span className="font-semibold">Unit {a.unit_number}</span>
                  <span className="text-[#78716C]"> · {a.owner_name}</span>
                  {a.is_late ? <span className="ml-2 text-[11px] font-bold text-[#B45309]">LATE</span> : null}
                </span>
                <span className={`tabular-nums font-semibold ${a.status === "unpaid" ? "text-[#C53030]" : "text-[#B45309]"}`}>
                  {a.status === "unpaid" ? `Unpaid ${fmtMoney(a.amount_due)}` : `Short ${fmtMoney(a.short)}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-5 border-t border-[#E7E5E4] pt-4 flex items-center gap-2 text-sm text-[#166534]">
          <CheckCircle2 size={16} /> Everyone is fully posted for this month.
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const year = new Date().getFullYear();
  const [data, setData] = useState(null);
  const [trends, setTrends] = useState(null);
  const [thisMonth, setThisMonth] = useState(null);

  useEffect(() => {
    api.get(`/dashboard/summary?year=${year}`).then((r) => setData(r.data));
    api.get(`/dashboard/trends`).then((r) => setTrends(r.data.years || []));
    api.get(`/dashboard/this-month`).then((r) => setThisMonth(r.data));
  }, [year]);

  if (!data) {
    return (
      <div data-testid="dashboard-loading" className="text-[#78716C]">
        Loading…
      </div>
    );
  }

  const monthly = data.monthly.map((m) => ({
    name: monthShort(m.month),
    Income: m.income,
    Expenses: m.expenses,
  }));

  return (
    <div data-testid="dashboard-page" className="space-y-8">
      <div className="relative h-72 md:h-96 rounded-lg overflow-hidden border border-[#E7E5E4]">
        <img
          src="https://customer-assets.emergentagent.com/job_assoc-admin-3/artifacts/k5io5897_I1clean.png"
          alt="Innsbruck One"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />
        <div className="absolute bottom-5 left-6 text-white drop-shadow-md">
          <div className="text-xs uppercase tracking-[0.15em] font-bold opacity-90">Dashboard</div>
          <div className="font-display text-2xl md:text-3xl font-bold mt-1">Innsbruck One Manager</div>
        </div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">
          Year-to-Date · {year}
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mt-2">
          Year-at-a-glance
        </h1>
        <p className="text-[#78716C] mt-2 max-w-2xl">
          A calm, paper-clear view of your association's money — income from fees,
          operating expenses, balance and anything overdue.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPI
          testid="kpi-income"
          icon={TrendingUp}
          label="YTD Income"
          value={fmtMoney(data.ytd_income)}
          sub="From paid monthly fees"
          accent="bg-[#F0FDF4] text-[#166534]"
        />
        <KPI
          testid="kpi-expenses"
          icon={TrendingDown}
          label="YTD Expenses"
          value={fmtMoney(data.ytd_expenses)}
          sub="Across all categories"
          accent="bg-[#FFFBEB] text-[#B45309]"
        />
        <KPI
          testid="kpi-balance"
          icon={TrendingUp}
          label="Net Balance"
          value={fmtMoney(data.balance_ytd)}
          sub="Income − Expenses"
          accent="bg-[#F5F5F4] text-[#1C1917]"
        />
        <KPI
          testid="kpi-overdue"
          icon={AlertTriangle}
          label="Overdue Fees"
          value={fmtMoney(data.overdue_amount)}
          sub={`${data.overdue_count} payment(s) past due`}
          accent="bg-[#FEF2F2] text-[#C53030]"
        />
      </div>

      <ThisMonthTile tm={thisMonth} />

      <TrendStrip trends={trends} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-[#E7E5E4] rounded-lg p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">Monthly Cashflow</div>
              <div className="font-display text-xl font-semibold mt-1">Income vs. Expenses · {year}</div>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#E7E5E4" vertical={false} />
                <XAxis dataKey="name" stroke="#78716C" tick={{ fontSize: 12 }} />
                <YAxis stroke="#78716C" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: "#fff", border: "1px solid #E7E5E4", borderRadius: 8 }}
                  formatter={(v) => fmtMoney(v)}
                />
                <Legend />
                <Bar dataKey="Income" fill="#166534" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="#B45309" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-[#E7E5E4] rounded-lg p-6">
          <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">Expenses by Category</div>
          <div className="font-display text-xl font-semibold mt-1 mb-4">{year}</div>
          {data.expenses_by_category.length === 0 ? (
            <div className="text-sm text-[#78716C] py-12 text-center">No expenses yet.</div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.expenses_by_category}
                    dataKey="total"
                    nameKey="category"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {data.expenses_by_category.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmtMoney(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-[#E7E5E4] rounded-lg p-6">
        <div className="flex items-center gap-3">
          <Home size={18} className="text-[#166534]" />
          <div className="font-display text-lg font-semibold">{data.units_count} Units Tracked</div>
        </div>
        <p className="text-sm text-[#78716C] mt-2">
          Add or edit owner details under <span className="font-semibold">Units &amp; Owners</span>,
          generate monthly fees from there, and reconcile against payments in <span className="font-semibold">Monthly Fees</span>.
        </p>
      </div>
    </div>
  );
}
