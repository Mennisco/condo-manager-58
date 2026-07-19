import axios from "axios";

// Backend URL - hardcoded for Cloud Run deployment
const BACKEND_URL = "https://condo-manager-58.emergent.host";
export const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  withCredentials: true,
  timeout: 15000,
});

// Token-based auth: cookies are unreliable inside the embedded preview iframe
// (third-party cookies are blocked by modern browsers), so we also send the
// access token via the Authorization header from localStorage.
export const TOKEN_KEY = "io_access_token";
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Endpoints that are *expected* to 401 when the user isn't logged in.
// We don't redirect on these — the AuthContext handles them gracefully.
const SILENT_401_PATHS = ["/auth/me", "/auth/login"];

// Global handler set by AuthProvider to invalidate user state on 401.
let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

api.interceptors.response.use(
  (resp) => resp,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    if (status === 401) {
      const silent = SILENT_401_PATHS.some((p) => url.includes(p));
      if (!silent) {
        localStorage.removeItem(TOKEN_KEY);
        if (typeof onUnauthorized === "function") {
          try { onUnauthorized(); } catch (_) {}
        }
        // Swallow the rejection: the AuthContext is redirecting to /login
        // and the calling component will unmount. Returning a never-settling
        // promise prevents React's dev overlay from flagging an "uncaught 401".
        return new Promise(() => {});
      }
    }
    return Promise.reject(error);
  }
);

export function formatApiError(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export default api;
