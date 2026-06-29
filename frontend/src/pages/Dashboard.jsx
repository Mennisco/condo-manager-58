import { useEffect, useState } from "react";
import api from "@/lib/api";
import { fmtMoney, monthShort } from "@/lib/utils";
import { TrendingUp, TrendingDown, AlertTriangle, Home } from "lucide-react";
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

export default function Dashboard() {
  const year = new Date().getFullYear();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/dashboard/summary?year=${year}`).then((r) => setData(r.data));
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
      <div className="relative h-48 md:h-56 rounded-lg overflow-hidden border border-[#E7E5E4]">
        <img
          src="https://customer-assets.emergentagent.com/job_assoc-admin-3/artifacts/k5io5897_I1clean.png"
          alt="Innsbruck One"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#166534]/70 via-[#166534]/30 to-transparent" />
        <div className="absolute bottom-5 left-6 text-white">
          <div className="text-xs uppercase tracking-[0.15em] font-bold opacity-80">Innsbruck One</div>
          <div className="font-display text-2xl md:text-3xl font-bold mt-1">Treasurer Dashboard</div>
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
