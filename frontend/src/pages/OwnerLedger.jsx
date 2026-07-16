import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { fmtMoney, fmtDate, MONTHS } from "@/lib/utils";
import { ArrowLeft, Printer, Mail, MessageSquare, CheckCircle2, AlertTriangle, CircleDollarSign, StickyNote, X, Loader2, Repeat } from "lucide-react";
import { toast } from "sonner";
import { TextMessageModal } from "@/components/TextMessageModal";

const STATEMENT_LOGO = "https://customer-assets.emergentagent.com/job_assoc-admin-3/artifacts/k5io5897_I1clean.png";

const STATUS = {
  posted: { label: "Posted", cls: "text-[#166534] bg-[#F0FDF4] border-[#BBF7D0]", Icon: CheckCircle2 },
  short: { label: "Short", cls: "text-[#B45309] bg-[#FFFBEB] border-[#FDE68A]", Icon: CircleDollarSign },
  unpaid: { label: "Unpaid", cls: "text-[#C53030] bg-[#FEF2F2] border-[#FECACA]", Icon: AlertTriangle },
};

export default function OwnerLedger() {
  const { unitId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);
  const [scope, setScope] = useState("all"); // "all" or a year string
  const [emailOpen, setEmailOpen] = useState(false);
  const [textOpen, setTextOpen] = useState(false);

  const load = () => api.get(`/units/${unitId}/ledger`).then((r) => setData(r.data)).catch(() => setErr(true));
  useEffect(() => { load(); }, [unitId]);

  if (err) return <div data-testid="ledger-error" className="text-[#C53030]">Could not load this owner's history.</div>;
  if (!data) return <div className="text-[#78716C]">Loading…</div>;

  const { unit, rows: allRows, totals: allTotals } = data;
  const allYears = [...new Set(allRows.map((r) => r.period_year))].sort((a, b) => b - a);
  const rows = scope === "all" ? allRows : allRows.filter((r) => r.period_year === Number(scope));
  const years = scope === "all" ? allYears : [Number(scope)];
  // Scoped totals
  const totals = scope === "all" ? allTotals : rows.reduce((a, r) => {
    a.total_due += r.amount_due;
    a.total_paid += r.paid ? r.amount_paid : 0;
    if (r.paid) a.months_paid += 1;
    if (r.is_late) a.months_late += 1;
    return a;
  }, { total_due: 0, total_paid: 0, months_paid: 0, months_late: 0 });
  const scopedTotals = scope === "all" ? allTotals : {
    ...totals, total_short: Math.round((totals.total_due - totals.total_paid) * 100) / 100,
  };
  const balance = scopedTotals.total_short;
  const scopeLabel = scope === "all" ? "All years" : scope;

  return (
    <div data-testid="owner-ledger-page" className="space-y-6">
      {/* Screen controls */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4">
        <div>
          <button
            data-testid="ledger-back-btn"
            onClick={() => navigate("/units")}
            className="text-sm text-[#166534] font-semibold inline-flex items-center gap-1.5 hover:underline"
          >
            <ArrowLeft size={15} /> Back to Units &amp; Owners
          </button>
          <h1 className="font-display text-4xl font-bold tracking-tight mt-2">
            Unit {unit.unit_number} · {unit.owner_name?.trim()}
          </h1>
          <p className="text-[#78716C] mt-1">Full payment history and running balance.</p>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.15em] font-bold text-[#78716C] mb-1.5">Coverage</div>
            <select
              data-testid="ledger-year-select"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="border border-[#D6D3D1] rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#166534]"
            >
              <option value="all">All years</option>
              {allYears.map((y) => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          </div>
          <button
            data-testid="email-statement-btn"
            onClick={() => setEmailOpen(true)}
            className="border border-[#166534] text-[#166534] hover:bg-[#F0FDF4] px-4 py-2.5 rounded-md font-semibold flex items-center gap-2"
          >
            <Mail size={16} /> Email statement
          </button>
          <button
            data-testid="text-statement-btn"
            onClick={() => setTextOpen(true)}
            className="border border-[#166534] text-[#166534] hover:bg-[#F0FDF4] px-4 py-2.5 rounded-md font-semibold flex items-center gap-2"
          >
            <MessageSquare size={16} /> Text
          </button>
          <button
            data-testid="print-statement-btn"
            onClick={() => window.print()}
            className="bg-[#166534] hover:bg-[#14532D] text-white px-4 py-2.5 rounded-md font-semibold flex items-center gap-2"
          >
            <Printer size={16} /> Print statement
          </button>
        </div>
      </div>

      {/* Screen summary cards */}
      <div className="no-print grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label={`Total billed · ${scopeLabel}`} value={fmtMoney(scopedTotals.total_due)} />
        <SummaryCard label="Total paid" value={fmtMoney(scopedTotals.total_paid)} accent="text-[#166534]" />
        <SummaryCard label="Balance due" value={fmtMoney(balance)} accent={balance > 0.005 ? "text-[#C53030]" : "text-[#166534]"} />
        <SummaryCard label="Months paid / late" value={`${scopedTotals.months_paid} / ${scopedTotals.months_late}`} />
      </div>

      {unit.autopay ? (
        <div data-testid="autopay-card" className="no-print bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg px-5 py-4 flex items-center gap-3">
          <Repeat size={18} className="text-[#166534] shrink-0" />
          <div>
            <div className="text-[11px] uppercase tracking-[0.15em] font-bold text-[#166534]">Autopay / ACH</div>
            <div className="text-sm text-[#1C1917]">{unit.autopay}</div>
          </div>
        </div>
      ) : null}

      {/* Screen history, grouped by year */}
      <div className="no-print space-y-6">
        {years.map((y) => (
          <div key={y} data-testid={`ledger-year-${y}`} className="bg-white border border-[#E7E5E4] rounded-lg overflow-hidden">
            <div className="px-6 py-3 text-[11px] uppercase tracking-[0.15em] font-bold text-[#78716C] border-b border-[#E7E5E4]">{y}</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.12em] font-bold text-[#A8A29E]">
                  <th className="px-6 py-2">Month</th>
                  <th className="px-6 py-2 text-right">Due</th>
                  <th className="px-6 py-2 text-right">Paid</th>
                  <th className="px-6 py-2">Paid date</th>
                  <th className="px-6 py-2">Status</th>
                  <th className="px-6 py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {rows.filter((r) => r.period_year === y).sort((a, b) => a.period_month - b.period_month).map((r) => {
                  const st = STATUS[r.status];
                  return (
                    <tr key={r.period_month} data-testid={`ledger-row-${y}-${r.period_month}`} className="border-t border-[#F5F5F4]">
                      <td className="px-6 py-3 font-medium">
                        {MONTHS[r.period_month - 1]}
                        {r.is_late ? <span className="ml-2 text-[10px] font-bold text-[#B45309]">LATE</span> : null}
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums">{fmtMoney(r.amount_due)}</td>
                      <td className="px-6 py-3 text-right tabular-nums">{r.paid ? fmtMoney(r.amount_paid) : "—"}</td>
                      <td className="px-6 py-3 text-[#78716C]">{r.paid_date || "—"}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold rounded-full border px-2.5 py-0.5 ${st.cls}`}>
                          <st.Icon size={12} /> {st.label}{r.status === "short" ? ` $${r.short.toFixed(0)}` : ""}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        {r.notes ? (
                          <span title={r.notes} className="inline-flex items-center gap-1 text-xs text-[#B45309]">
                            <StickyNote size={13} /> <span className="max-w-[220px] truncate">{r.notes}</span>
                          </span>
                        ) : <span className="text-[#D6D3D1]">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
        {rows.length === 0 ? (
          <div className="bg-white border border-[#E7E5E4] rounded-lg p-10 text-center text-[#78716C]">
            No fee records for this {scope === "all" ? "unit" : "year"}.
          </div>
        ) : null}
      </div>

      {/* Print-only statement */}
      <StatementDoc unit={unit} rows={rows} totals={scopedTotals} years={years} balance={balance} scopeLabel={scopeLabel} />

      {emailOpen ? (
        <EmailStatementModal
          unit={unit}
          scope={scope}
          scopeLabel={scopeLabel}
          balance={balance}
          onClose={() => setEmailOpen(false)}
        />
      ) : null}

      {textOpen ? (
        <TextMessageModal
          title="Text statement summary"
          phone={unit.owner_phone}
          initialMessage={
            `Innsbruck One — Unit ${unit.unit_number} (${unit.owner_name?.trim()}). ` +
            `Statement ${scopeLabel}: billed ${fmtMoney(scopedTotals.total_due)}, ` +
            `paid ${fmtMoney(scopedTotals.total_paid)}, balance due ${fmtMoney(balance)}. ` +
            `Questions? Reply here. — Innsbruck One`
          }
          onClose={() => setTextOpen(false)}
        />
      ) : null}
    </div>
  );
}

function EmailStatementModal({ unit, scope, scopeLabel, balance, onClose }) {
  const [to, setTo] = useState(unit.owner_email || "");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    api.get("/gmail/status").then((r) => setStatus(r.data)).catch(() => setStatus({ connected: false }));
  }, []);

  const send = async () => {
    if (!to.trim()) { toast.error("Enter a recipient email"); return; }
    setSending(true);
    try {
      const body = { to: to.trim(), note: note.trim() || null };
      if (scope !== "all") body.year = Number(scope);
      const { data } = await api.post(`/units/${unit.id}/statement/email`, body);
      toast.success(`Statement emailed to ${data.to}`);
      onClose();
    } catch (e) {
      const detail = e.response?.data?.detail || "Could not send the email";
      toast.error(detail);
    }
    setSending(false);
  };

  const canSend = status?.can_send;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" data-testid="email-statement-modal">
      <div className="bg-white border border-[#E7E5E4] rounded-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="font-display text-xl font-semibold">Email statement</div>
          <button onClick={onClose} data-testid="close-email-modal"><X size={18} /></button>
        </div>

        {status && !canSend ? (
          <div data-testid="email-needs-reconnect" className="bg-[#FFFBEB] border border-[#FDE68A] rounded-md p-3 text-sm text-[#92400E] mb-4">
            {status.connected
              ? "Reconnect Google to grant permission to send email. Go to Bank Alerts → Reconnect Google (approve the send permission)."
              : "Google isn't connected. Go to Bank Alerts and connect your Gmail (approve the send permission) to email statements."}
          </div>
        ) : null}

        <div className="space-y-4">
          <div className="text-sm text-[#78716C]">
            Sending Unit <b className="text-[#1C1917]">{unit.unit_number}</b> · {unit.owner_name?.trim()} statement
            for <b className="text-[#1C1917]">{scopeLabel}</b>. Balance due: <b className={balance > 0.005 ? "text-[#C53030]" : "text-[#166534]"}>{fmtMoney(balance)}</b>.
            Includes a PDF attachment.
          </div>
          <label className="block">
            <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C] mb-1.5">Recipient</div>
            <input
              data-testid="email-to-input"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="owner@example.com"
              className="w-full border border-[#E7E5E4] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#166534]/40 focus:border-[#166534]"
            />
          </label>
          <label className="block">
            <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C] mb-1.5">Personal note (optional)</div>
            <textarea
              data-testid="email-note-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Add a short message to the owner…"
              className="w-full border border-[#E7E5E4] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#166534]/40 focus:border-[#166534]"
            />
          </label>
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-md border border-[#E7E5E4]">Cancel</button>
          <button
            data-testid="send-statement-btn"
            onClick={send}
            disabled={sending || !canSend}
            className="px-4 py-2 rounded-md bg-[#166534] text-white font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />} Send
          </button>
        </div>
      </div>
    </div>
  );
}

function StatementDoc({ unit, rows, totals, years, balance, scopeLabel }) {
  return (
    <div data-testid="statement-doc" className="hidden print:block print-area">
      <div className="border-b-2 border-[#166534] pb-4 mb-6">
        <img src={STATEMENT_LOGO} alt="Innsbruck One" className="w-48 rounded-md mb-3" />
        <div className="text-xs uppercase tracking-[0.2em] font-bold text-[#166534]">Innsbruck One Condominium Association</div>
        <h2 className="font-display text-2xl font-bold mt-1">Owner Statement</h2>
        <div className="text-sm mt-3 grid grid-cols-2 gap-y-1">
          <div><span className="text-[#78716C]">Unit:</span> <span className="font-semibold">{unit.unit_number}</span></div>
          <div><span className="text-[#78716C]">Statement date:</span> <span className="font-semibold">{fmtDate(new Date().toISOString())}</span></div>
          <div><span className="text-[#78716C]">Owner:</span> <span className="font-semibold">{unit.owner_name?.trim()}</span></div>
          <div><span className="text-[#78716C]">Coverage:</span> <span className="font-semibold">{scopeLabel}</span></div>
          <div><span className="text-[#78716C]">Monthly fee:</span> <span className="font-semibold">{fmtMoney(unit.monthly_fee)}</span></div>
        </div>
      </div>

      {years.map((y) => (
        <div key={y} className="mb-4">
          <div className="font-display text-base font-bold mb-1">{y}</div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left border-b border-[#333]">
                <th className="py-1 pr-3">Month</th>
                <th className="py-1 px-3 text-right">Due</th>
                <th className="py-1 px-3 text-right">Paid</th>
                <th className="py-1 px-3">Paid date</th>
                <th className="py-1 pl-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.filter((r) => r.period_year === y).sort((a, b) => a.period_month - b.period_month).map((r) => (
                <tr key={r.period_month} className="border-b border-[#ddd]">
                  <td className="py-1 pr-3">{MONTHS[r.period_month - 1]}{r.is_late ? " (late)" : ""}</td>
                  <td className="py-1 px-3 text-right tabular-nums">{fmtMoney(r.amount_due)}</td>
                  <td className="py-1 px-3 text-right tabular-nums">{r.paid ? fmtMoney(r.amount_paid) : "—"}</td>
                  <td className="py-1 px-3">{r.paid_date || "—"}</td>
                  <td className="py-1 pl-3 text-right tabular-nums">{r.short > 0 ? fmtMoney(r.short) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <div className="border-t-2 border-[#166534] pt-3 mt-4 text-sm">
        <div className="flex justify-between"><span>Total billed ({scopeLabel})</span><span className="tabular-nums font-semibold">{fmtMoney(totals.total_due)}</span></div>
        <div className="flex justify-between"><span>Total paid</span><span className="tabular-nums font-semibold">{fmtMoney(totals.total_paid)}</span></div>
        <div className="flex justify-between text-base font-bold mt-1 pt-1 border-t border-[#ddd]">
          <span>Balance due</span>
          <span className="tabular-nums">{fmtMoney(balance)}</span>
        </div>
      </div>
      <div className="text-[10px] text-[#78716C] mt-6">
        Late fees, when assessed, are applied manually by the treasurer and are not reflected above unless recorded. Questions? Contact the association treasurer.
      </div>
    </div>
  );
}

function SummaryCard({ label, value, accent }) {
  return (
    <div className="bg-white border border-[#E7E5E4] rounded-lg p-5">
      <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">{label}</div>
      <div className={`font-display text-2xl font-bold mt-2 tabular-nums ${accent || ""}`}>{value}</div>
    </div>
  );
}
