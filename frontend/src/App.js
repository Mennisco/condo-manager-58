import "@/App.css";
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet, Link } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppShell from "@/components/layout/AppShell";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Units from "@/pages/Units";
import Fees from "@/pages/Fees";
import Expenses from "@/pages/Expenses";
import Budget from "@/pages/Budget";
import FeeIncrease from "@/pages/FeeIncrease";
import PnL from "@/pages/PnL";
import BankReconcile from "@/pages/BankReconcile";
import Vendors from "@/pages/Vendors";
import Communications from "@/pages/Communications";
import Compliance from "@/pages/Compliance";
import Reports from "@/pages/Reports";

function Protected() {
  const { user } = useAuth();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (user !== null) return;
    const t = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(t);
  }, [user]);

  if (user === null) {
    return (
      <div
        data-testid="auth-loading"
        className="min-h-screen flex flex-col items-center justify-center text-[#78716C] gap-4 px-6"
      >
        <div className="h-8 w-8 border-2 border-[#166534] border-t-transparent rounded-full animate-spin" />
        <div>Loading…</div>
        {slow && (
          <Link
            to="/login"
            data-testid="loading-go-to-login"
            className="text-sm text-[#166534] underline mt-2"
          >
            Taking too long? Go to sign-in
          </Link>
        )}
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Protected />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/units" element={<Units />} />
            <Route path="/fees" element={<Fees />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/budget" element={<Budget />} />
            <Route path="/fee-increase" element={<FeeIncrease />} />
            <Route path="/pnl" element={<PnL />} />
            <Route path="/bank" element={<BankReconcile />} />
            <Route path="/vendors" element={<Vendors />} />
            <Route path="/communications" element={<Communications />} />
            <Route path="/compliance" element={<Compliance />} />
            <Route path="/reports" element={<Reports />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
