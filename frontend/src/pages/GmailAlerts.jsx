import { useEffect, useState } from "react";
import api, { TOKEN_KEY } from "@/lib/api";
import { fmtMoney } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, RefreshCw, Mail, Loader2, Plus, LogOut } from "lucide-react";
import { toast } from "sonner";
import { RecordTransactionModal } from "@/components/RecordTransactionModal";

const API = process.env.REACT_APP_BACKEND_URL;

export default function GmailAlerts() {
  const [status, setStatus] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [units, setUnits] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [recording, setRecording] = useState(null);

  const loadStatus = () => api.get("/gmail/status").then((r) => setStatus(r.data));
  const loadAlerts = () => api.get("/gmail/alerts").then((r) => setAlerts(r.data));

  useEffect(() => {
    loadStatus();
    api.get("/units").then((r) => setUnits(r.data));
    const p = new URLSearchParams(window.location.search).get("gmail");
    if (p === "connected") { toast.success("Google account connected"); loadAlerts(); }
    if (p === "error") toast.error("Could not connect Google account");
    if (p) window.history.replaceState({}, "", "/gmail");
  }, []);

  useEffect(() => { if (status?.connected) loadAlerts(); }, [status?.connected]);

  const connect = () => {
    const token = localStorage.getItem(TOKEN_KEY);
    window.location.href = `${API}/api/oauth/gmail/login?token=${token}`;
  };

  const disconnect = async () => {
    if (!confirm("Disconnect the Google account?")) return;
    await api.delete("/oauth/gmail");
    setAlerts([]);
    loadStatus();
  };

  const sync = async () => {
    setSyncing(true);
    try {
      const { data } = await api.post("/gmail/sync");
      toast.success(`Synced — ${data.new} new alert transaction${data.new === 1 ? "" : "s"}`);
      loadAlerts();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Sync failed");
    }
    setSyncing(false);
  };

  const onRecorded = () => { setRecording(null); loadAlerts(); };

  const unmatched = alerts.filter((a) => !a.match).length;

  return (
    <div data-testid="gmail-page" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">Automatic feed</div>
          <h1 className="font-display text-4xl font-bold tracking-tight mt-2">Bank Email Alerts</h1>
          <p className="text-[#78716C] mt-2 max-w-2xl">
            Connect the association Gmail to pull Heartland "Transaction Alert" emails automatically, then record each one in a click.
          </p>
        </div>
        {status?.connected ? (
          <div className="flex items-center gap-2">
            <button data-testid="gmail-sync-btn" onClick={sync} disabled={syncing} className="bg-[#166534] hover:bg-[#14532D] text-white px-4 py-2.5 rounded-md font-semibold flex items-center gap-2 disabled:opacity-60">
              {syncing ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />} Sync now
            </button>
            <button data-testid="gmail-disconnect-btn" onClick={disconnect} className="border border-[#E7E5E4] hover:bg-[#F5F5F4] px-3 py-2.5 rounded-md font-semibold flex items-center gap-2 text-[#78716C]">
              <LogOut size={16} />
            </button>
          </div>
        ) : null}
      </div>

      {status && !status.connected ? (
        <div className="bg-white border border-[#E7E5E4] rounded-lg p-10 text-center">
          <Mail size={32} className="mx-auto text-[#166534]" />
          <div className="font-display text-xl font-bold mt-4">Connect your Google account</div>
          <p className="text-[#78716C] mt-2 max-w-md mx-auto">
            Read-only access to InnsbruckOne@gmail.com so the app can read Heartland alert emails. It can never send or delete mail.
          </p>
          <button data-testid="gmail-connect-btn" onClick={connect} className="mt-5 bg-[#166534] hover:bg-[#14532D] text-white px-5 py-2.5 rounded-md font-semibold inline-flex items-center gap-2">
            <Mail size={16} /> Connect Google
          </button>
        </div>
      ) : null}

      {status?.connected ? (
        <>
          <div className="flex items-center justify-between bg-[#F0FDF4] border border-[#BBF7D0] rounded-md px-4 py-3 text-sm">
            <span className="text-[#166534] font-semibold flex items-center gap-2"><CheckCircle2 size={16} /> Connected as {status.email || "Google account"}</span>
            <span className="text-[#78716C]">{alerts.length} alert transactions · {unmatched} to review</span>
          </div>

          {alerts.length === 0 ? (
            <div className="bg-white border border-[#E7E5E4] rounded-lg p-10 text-center text-[#78716C]">
              No alert transactions yet. Click <span className="font-semibold">Sync now</span> to pull recent Heartland emails.
            </div>
          ) : (
            <div className="bg-white border border-[#E7E5E4] rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#F5F5F4] text-left text-[11px] uppercase tracking-[0.15em] font-bold text-[#78716C]">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Description</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((a, i) => (
                    <tr key={a.id} data-testid={`gmail-alert-${i}`} className="border-t border-[#F5F5F4]">
                      <td className="px-6 py-3 whitespace-nowrap text-[#78716C]">{a.txn_date}</td>
                      <td className="px-6 py-3">{a.description} <span className={`ml-2 text-[10px] uppercase font-bold ${a.kind === "credit" ? "text-[#166534]" : "text-[#C53030]"}`}>{a.kind === "credit" ? "Deposit" : "Debit"}</span></td>
                      <td className={`px-6 py-3 text-right tabular-nums font-semibold ${a.kind === "credit" ? "text-[#166534]" : "text-[#C53030]"}`}>{a.kind === "credit" ? "" : "-"}{fmtMoney(a.amount)}</td>
                      <td className="px-6 py-3 text-right w-72">
                        {a.match ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#166534]"><CheckCircle2 size={14} /> {a.match.label}</span>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center justify-end gap-2">
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] rounded-full px-2.5 py-1"><AlertTriangle size={13} /> Review</span>
                              <button data-testid={`gmail-record-${i}`} onClick={() => setRecording({ txn: { date: a.txn_date, description: a.description, amount: a.amount }, kind: a.kind, suggested: a.suggested })} className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-[#166534] hover:bg-[#14532D] rounded-md px-2.5 py-1">
                                <Plus size={13} /> Record
                              </button>
                            </div>
                            {a.suggested ? (
                              <span data-testid={`gmail-suggested-${i}`} className="text-[11px] font-semibold text-[#166534]">Likely: Unit {a.suggested.unit_number} · {a.suggested.owner_name}</span>
                            ) : null}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}

      {recording ? (
        <RecordTransactionModal recording={recording} units={units} onClose={() => setRecording(null)} onSaved={onRecorded} />
      ) : null}
    </div>
  );
}
