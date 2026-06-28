import { createContext, useContext, useEffect, useState } from "react";
import api, { formatApiError, setUnauthorizedHandler } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = loading, false = unauthenticated, object = logged in
  const [error, setError] = useState("");

  useEffect(() => {
    // Whenever any API call returns 401 (other than /auth/me, /auth/login)
    // mark the user as logged-out so the app redirects to /login instead of
    // showing an "Uncaught 401" overlay.
    setUnauthorizedHandler(() => setUser(false));

    let cancelled = false;
    // Hard safety: never stay in 'loading' state for more than 10s.
    const safetyTimer = setTimeout(() => {
      if (!cancelled) {
        setUser((u) => (u === null ? false : u));
      }
    }, 10000);
    (async () => {
      try {
        const { data } = await api.get("/auth/me");
        if (!cancelled) setUser(data);
      } catch {
        if (!cancelled) setUser(false);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
      setUnauthorizedHandler(null);
    };
  }, []);

  const login = async (email, password) => {
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setUser(data);
      return true;
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail) || e.message);
      return false;
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (_) {}
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, error, setError }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
