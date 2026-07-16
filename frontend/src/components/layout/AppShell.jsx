import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Home,
  Receipt,
  CreditCard,
  CalendarRange,
  Calculator,
  LineChart,
  Landmark,
  Mail,
  Users,
  MessageSquare,
  ClipboardCheck,
  FileBarChart2,
  LogOut,
  Building2,
  ListChecks,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/units", label: "Units & Owners", icon: Home, testid: "nav-units" },
  { to: "/fees", label: "Monthly Fees", icon: CreditCard, testid: "nav-fees" },
  { to: "/posting", label: "Posting", icon: ListChecks, testid: "nav-posting" },
  { to: "/expenses", label: "Expenses", icon: Receipt, testid: "nav-expenses" },
  { to: "/budget", label: "Annual Budget", icon: CalendarRange, testid: "nav-budget" },
  { to: "/fee-increase", label: "Fee Increase", icon: Calculator, testid: "nav-fee-increase" },
  { to: "/pnl", label: "P&L Statement", icon: LineChart, testid: "nav-pnl" },
  { to: "/bank", label: "Bank Reconcile", icon: Landmark, testid: "nav-bank" },
  { to: "/gmail", label: "Bank Alerts", icon: Mail, testid: "nav-gmail" },
  { to: "/vendors", label: "Vendors", icon: Users, testid: "nav-vendors" },
  { to: "/communications", label: "Communications", icon: MessageSquare, testid: "nav-comm" },
  { to: "/compliance", label: "Tax & Compliance", icon: ClipboardCheck, testid: "nav-compliance" },
  { to: "/reports", label: "Annual Report", icon: FileBarChart2, testid: "nav-reports" },
];

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-paper">
      {/* Sidebar */}
      <aside
        data-testid="app-sidebar"
        className="hidden md:flex w-64 flex-col border-r border-[#E7E5E4] bg-white"
      >
        <div className="px-6 py-7 border-b border-[#E7E5E4]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-[#166534] text-white flex items-center justify-center">
              <Building2 size={20} />
            </div>
            <div>
              <div className="font-display font-bold text-[#1C1917] leading-tight">Innsbruck One</div>
              <div className="text-[11px] uppercase tracking-[0.15em] text-[#78716C]">Manager</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-5 space-y-1">
          {links.map(({ to, label, icon: Icon, testid }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              data-testid={testid}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-[#F0FDF4] text-[#166534] font-semibold"
                    : "text-[#1C1917] hover:bg-[#F5F5F4]"
                )
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-[#E7E5E4]">
          <div className="text-xs text-[#78716C] mb-2 truncate" data-testid="current-user-email">
            {user?.email}
          </div>
          <button
            data-testid="logout-button"
            onClick={async () => {
              await logout();
              navigate("/login");
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[#1C1917] hover:bg-[#F5F5F4]"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-[#E7E5E4] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-[#166534] text-white flex items-center justify-center">
            <Building2 size={16} />
          </div>
          <span className="font-display font-bold">Innsbruck One</span>
        </div>
        <button
          data-testid="mobile-logout"
          onClick={async () => {
            await logout();
            navigate("/login");
          }}
          className="text-sm text-[#78716C]"
        >
          <LogOut size={16} />
        </button>
      </div>

      <main className="flex-1 min-w-0 md:pt-0 pt-14">
        <div className="md:hidden overflow-x-auto bg-white border-b border-[#E7E5E4]">
          <div className="flex gap-1 px-3 py-2 whitespace-nowrap">
            {links.map(({ to, label, testid }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                data-testid={`m-${testid}`}
                className={({ isActive }) =>
                  cn(
                    "px-3 py-1.5 rounded-md text-xs",
                    isActive ? "bg-[#F0FDF4] text-[#166534] font-semibold" : "text-[#1C1917]"
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </div>
        <div className="p-6 md:p-10 max-w-[1400px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
