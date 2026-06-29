import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Navigate } from "react-router-dom";
import { Building2, Loader2 } from "lucide-react";

export default function Login() {
  const { user, login, error } = useAuth();
  const [email, setEmail] = useState("innsbruckone@gmail.com");
  const [password, setPassword] = useState("1nn58ruck0ne");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (ok) navigate("/");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-paper">
      <div className="hidden lg:block relative">
        <img
          src="https://customer-assets.emergentagent.com/job_assoc-admin-3/artifacts/k5io5897_I1clean.png"
          alt="Innsbruck One"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[#166534]/40" />
        <div className="absolute bottom-0 left-0 right-0 p-12 text-white">
          <div className="font-display text-4xl font-bold leading-tight max-w-md">
            Innsbruck One Manager
          </div>
          <div className="text-sm opacity-90 mt-3 max-w-md">
            Track fees, expenses, budgets, vendor &amp; homeowner communications,
            and the annual Illinois NFP filing — all in one calm place.
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-sm bg-white border border-[#E7E5E4] rounded-lg p-8"
          data-testid="login-form"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-md bg-[#166534] text-white flex items-center justify-center">
              <Building2 size={22} />
            </div>
            <div>
              <div className="font-display font-bold text-lg leading-none">Innsbruck One</div>
              <div className="text-xs text-[#78716C] mt-1">Treasurer sign-in</div>
            </div>
          </div>
          <label className="block text-xs uppercase tracking-[0.15em] font-bold text-[#78716C] mb-2">
            Email
          </label>
          <input
            data-testid="login-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-[#E7E5E4] rounded-md px-3 py-2.5 mb-4 focus:outline-none focus:ring-2 focus:ring-[#166534]/40 focus:border-[#166534]"
          />
          <label className="block text-xs uppercase tracking-[0.15em] font-bold text-[#78716C] mb-2">
            Password
          </label>
          <input
            data-testid="login-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-[#E7E5E4] rounded-md px-3 py-2.5 mb-5 focus:outline-none focus:ring-2 focus:ring-[#166534]/40 focus:border-[#166534]"
          />
          {error ? (
            <div
              data-testid="login-error"
              className="bg-[#FEF2F2] text-[#C53030] text-sm px-3 py-2 rounded-md mb-4 border border-[#C53030]/20"
            >
              {error}
            </div>
          ) : null}
          <button
            data-testid="login-submit"
            type="submit"
            disabled={loading}
            className="w-full bg-[#166534] hover:bg-[#14532D] text-white font-semibold py-2.5 rounded-md flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : null}
            Sign in
          </button>
          <div className="text-xs text-[#78716C] mt-6 text-center leading-relaxed">
            Pre-loaded credentials are filled in for first use. Change them in
            <span className="font-mono"> backend/.env</span>.
          </div>
        </form>
      </div>
    </div>
  );
}
