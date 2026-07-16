import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { fmtMoney, MONTHS } from "@/lib/utils";
import { Upload, CheckCircle2, AlertTriangle, FileText, Trash2, Loader2, Plus, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { RecordTransactionModal } from "@/components/RecordTransactionModal";

export default function BankReconcile() {
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [units, setUnits] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [sel, setSel] = useState("");
  const [view, setView] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const fileRef = useRef();

  const loadHistory = () => api.get("/bank/statements").then((r) => setHistory(r.data));
  const loadPeriods = () =>
    api.get("/bank/periods").then((r) => {
      setPeriods(r.data);
      if (r.data.length && !sel) setSel(`${r.data[0].year}-${r.data[0].month}`);
    });
  useEffect(() => {
    loadHistory();
    loadPeriods();
    api.get("/units").then((r) => setUnits(r.data));
  }, []);

  useEffect(() => {
    if (!sel) return;
    const [y, m] = sel.split("-").map(Number);
    setViewLoading(true);
    api.get(`/bank/reconcile-view?year=${y}&month=${m}`)
      .then((r) => setView(r.data))
      .finally(() => setViewLoading(false));
  }, [sel]);

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const { data } = await api.post("/bank/reconcile", fd);
      setResult(data);
      toast.success(`Reconciled ${data.summary.deposits_count + data.summary.withdrawals_count} transactions`);
      loadHistory();
      loadPeriods();
      const pe = data.meta?.period_end;
      if (pe) setSel(`${Number(pe.slice(0, 4))}-${Number(pe.slice(5, 7))}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not process the PDF");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const openStatement = async (id) => {
    const { data } = await api.get(`/bank/statements/${id}`);
    setResult(data);
    const pe = data.meta?.period_end;
    if (pe) setSel(`${Number(pe.slice(0, 4))}-${Number(pe.slice(5, 7))}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const del = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Delete this reconciled statement?")) return;
    await api.delete(`/bank/statements/${id}`);
    if (result?.id === id) setResult(null);
    loadHistory();
  };

  const onRecorded = async () => {
    setRecording(null);
    loadPeriods();
    if (sel) {
      const [y, m] = sel.split("-").map(Number);
      api.get(`/bank/reconcile-view?year=${y}&month=${m}`).then((r) => setView(r.data));
    }
    if (!result?.id) return;
    const { data } = await api.post(`/bank/statements/${result.id}/rematch`);
    setResult(data);
    loadHistory();
  };

  return (
    <div data-testid="bank-page" className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">Reconciliation</div>
        <h1 className="font-display text-4xl font-bold tracking-tight mt-2">Bank Reconciliation</h1>
        <p className="text-[#78716C] mt-2 max-w-2xl">
          Upload your Heartland Bank statement PDF. We extract every transaction, match deposits to fee
          payments and withdrawals to expenses, and flag anything that needs a look — record it in one click.
        </p>
      </div>

      <label data-testid="bank-upload-label" className="block border-2 border-dashed border-[#D6D3D1] rounded-lg bg-white hover:border-[#166534] transition-colors cursor-pointer p-10 text-center">
        <input ref={fileRef} data-testid="bank-upload-input" type="file" accept="application/pdf" className="hidden" onChange={onFile} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-[#166534]">
            <Loader2 className="animate-spin" size={28} />
            <span className="font-semibold">Reading statement…</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-[#78716C]">
            <Upload size={28} className="text-[#166534]" />
            <span className="font-semibold text-[#1C1917]">Click to upload a bank statement PDF</span>
            <span className="text-sm">Heartland Bank &amp; Trust · monthly statement</span>
          </div>
        )}
      </label>

      {result ? <ReconcileResult result={result} onRecord={(txn, kind) => setRecording({ txn, kind })} /> : null}

      <SideBySide
        periods={periods}
        sel={sel}
        onSel={setSel}
        view={view}
        loading={viewLoading}
      />

      {history.length > 0 ? (
        <div className="bg-white border border-[#E7E5E4] rounded-lg overflow-hidden">
          <div className="px-6 py-3 text-[11px] uppercase tracking-[0.15em] font-bold text-[#78716C] border-b border-[#E7E5E4]">Reconciled statements</div>
          {history.map((s) => (
            <div key={s.id} data-testid={`bank-history-${s.id}`} onClick={() => openStatement(s.id)} className="flex items-center justify-between px-6 py-3 border-b border-[#F5F5F4] hover:bg-[#F5F5F4] cursor-pointer">
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-[#78716C]" />
                <div>
                  <div className="font-semibold text-sm">{s.meta?.period_start} – {s.meta?.period_end}</div>
                  <div className="text-xs text-[#78716C]">{s.filename}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right text-sm">
                  <div className="tabular-nums">Ending {fmtMoney(s.meta?.ending_balance)}</div>
                  <div className={`text-xs ${s.summary?.balance_ok ? "text-[#166534]" : "text-[#C53030]"}`}>{s.summary?.balance_ok ? "Balanced" : "Out of balance"}{s.summary?.unmatched ? ` · ${s.summary.unmatched} to review` : ""}</div>
                </div>
                <button data-testid={`bank-delete-${s.id}`} onClick={(e) => del(s.id, e)} className="text-[#A8A29E] hover:text-[#C53030]"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {recording ? (
        <RecordTransactionModal recording={recording} units={units} onClose={() => setRecording(null)} onSaved={onRecorded} />
      ) : null}
    </div>
  );
}

function ReconcileResult({ result, onRecord }) {
  const s = result.summary;
  const m = result.meta;
  return (
    <div data-testid="bank-result" className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Statement period" value={`${m.period_start} – ${m.period_end}`} small />
        <Card label="Beginning balance" value={fmtMoney(m.beginning_balance)} />
        <Card label="Ending balance" value={fmtMoney(m.ending_balance)} />
        <div data-testid="bank-balance-check" className={`rounded-lg p-5 border ${s.balance_ok ? "bg-[#F0FDF4] border-[#BBF7D0]" : "bg-[#FEF2F2] border-[#FECACA]"}`}>
          <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">Balance check</div>
          <div className={`font-display text-lg font-bold mt-2 flex items-center gap-2 ${s.balance_ok ? "text-[#166534]" : "text-[#C53030]"}`}>
            {s.balance_ok ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            {s.balance_ok ? "Balanced" : "Out of balance"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card label="Deposits" value={fmtMoney(s.deposits_total)} sub={`${s.matched_credits}/${s.deposits_count} matched`} accent="text-[#166534]" />
        <Card label="Withdrawals" value={fmtMoney(s.withdrawals_total)} sub={`${s.matched_withdrawals}/${s.withdrawals_count} matched`} />
        <Card label="Flagged for review" value={String(s.unmatched)} sub="unmatched transactions" accent={s.unmatched ? "text-[#B45309]" : "text-[#166534]"} />
      </div>

      <TxnTable title="Deposits / Credits" rows={result.credits} kind="credit" onRecord={onRecord} />
      <TxnTable title="Withdrawals / Debits" rows={result.withdrawals} kind="withdrawal" negative onRecord={onRecord} />
    </div>
  );
}

function TxnTable({ title, rows, kind, negative, onRecord }) {
  if (!rows?.length) return null;
  return (
    <div className="bg-white border border-[#E7E5E4] rounded-lg overflow-hidden">
      <div className="px-6 py-3 text-[11px] uppercase tracking-[0.15em] font-bold text-[#78716C] border-b border-[#E7E5E4]">{title}</div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((t, i) => (
            <tr key={i} data-testid={`bank-txn-${kind === "credit" ? "credit" : "debit"}-${i}`} className="border-b border-[#F5F5F4] last:border-0">
              <td className="px-6 py-3 whitespace-nowrap text-[#78716C]">{t.date}</td>
              <td className="px-6 py-3">{t.description}</td>
              <td className={`px-6 py-3 text-right tabular-nums font-semibold ${negative ? "text-[#C53030]" : "text-[#166534]"}`}>{negative ? "-" : ""}{fmtMoney(t.amount)}</td>
              <td className="px-6 py-3 text-right w-72">
                {t.match ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#166534]">
                    <CheckCircle2 size={14} /> {t.match.label}
                  </span>
                ) : (
                  <div className="flex items-center justify-end gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] rounded-full px-2.5 py-1">
                      <AlertTriangle size={13} /> Review
                    </span>
                    <button data-testid={`bank-record-${kind}-${i}`} onClick={() => onRecord(t, kind)} className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-[#166534] hover:bg-[#14532D] rounded-md px-2.5 py-1">
                      <Plus size={13} /> Record
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Card({ label, value, sub, accent, small }) {
  return (
    <div className="bg-white border border-[#E7E5E4] rounded-lg p-5">
      <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">{label}</div>
      <div className={`font-display ${small ? "text-base" : "text-2xl"} font-bold mt-2 tabular-nums ${accent || ""}`}>{value}</div>
      {sub ? <div className="text-xs text-[#78716C] mt-1">{sub}</div> : null}
    </div>
  );
}

function periodLabel(y, m) {
  return `${MONTHS[m - 1]} ${y}`;
}

function SideBySide({ periods, sel, onSel, view, loading }) {
  const s = view?.summary;
  return (
    <div data-testid="reconcile-view" className="bg-white border border-[#E7E5E4] rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-[#E7E5E4] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ArrowLeftRight size={18} className="text-[#166534]" />
          <div>
            <div className="text-[11px] uppercase tracking-[0.15em] font-bold text-[#78716C]">Cross-check</div>
            <div className="font-display text-lg font-semibold">Bank deposits vs. fees log</div>
          </div>
        </div>
        <select
          data-testid="reconcile-period-select"
          value={sel}
          onChange={(e) => onSel(e.target.value)}
          className="border border-[#D6D3D1] rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#166534]"
        >
          {periods.length === 0 ? <option value="">No periods yet</option> : null}
          {periods.map((p) => (
            <option key={`${p.year}-${p.month}`} value={`${p.year}-${p.month}`}>
              {periodLabel(p.year, p.month)}{p.has_statement ? "  · statement" : "  · fees only"}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="p-10 flex items-center justify-center text-[#78716C]"><Loader2 className="animate-spin mr-2" size={18} /> Loading…</div>
      ) : !view ? (
        <div className="p-10 text-center text-sm text-[#78716C]">Pick a period to compare.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#E7E5E4]">
            <Mini label="Matched" value={s.matched} accent="text-[#166534]" />
            <Mini label="Deposit, no record" value={s.deposit_only} accent={s.deposit_only ? "text-[#B45309]" : "text-[#78716C]"} />
            <Mini label="Record, no deposit" value={s.payment_only} accent={s.payment_only ? "text-[#B45309]" : "text-[#78716C]"} />
            <Mini label="Deposits − payments" value={fmtMoney(s.difference)} accent={Math.abs(s.difference) < 0.01 ? "text-[#166534]" : "text-[#C53030]"} />
          </div>
          {!view.statement ? (
            <div className="px-6 py-2 text-xs text-[#B45309] bg-[#FFFBEB] border-b border-[#FDE68A] flex items-center gap-2">
              <AlertTriangle size={13} /> No bank statement uploaded for {periodLabel(view.year, view.month)} — showing recorded payments only. Upload the statement to cross-check.
            </div>
          ) : null}
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#E7E5E4]">
            <SideColumn
              title={`Bank deposits (${view.deposits.length})`}
              sub={fmtMoney(s.deposits_total)}
              empty="No deposits on the statement for this period."
              rows={view.deposits.map((d, i) => ({
                key: `dep-${i}`,
                testid: `reconcile-deposit-${i}`,
                left: d.date,
                mid: d.match_payment ? `Unit ${d.match_payment.unit_number} · ${d.match_payment.owner_name}${d.match_payment.months > 1 ? ` (${d.match_payment.months} mo)` : ""}` : d.description,
                amount: d.amount,
                matched: d.matched,
              }))}
            />
            <SideColumn
              title={`Fees log payments (${view.payments.length})`}
              sub={fmtMoney(s.payments_total)}
              empty="No recorded payments dated in this period."
              rows={view.payments.map((p, i) => ({
                key: `pay-${i}`,
                testid: `reconcile-payment-${i}`,
                left: p.paid_date,
                mid: `Unit ${p.unit_number} · ${p.owner_name}${p.months.length > 1 ? ` (${p.months.length} mo)` : ""}`,
                amount: p.amount,
                matched: p.matched,
              }))}
            />
          </div>
        </>
      )}
    </div>
  );
}

function Mini({ label, value, accent }) {
  return (
    <div className="bg-white p-4">
      <div className="text-[10px] uppercase tracking-[0.12em] font-bold text-[#78716C]">{label}</div>
      <div className={`font-display text-xl font-bold mt-1 tabular-nums ${accent || ""}`}>{value}</div>
    </div>
  );
}

function SideColumn({ title, sub, rows, empty }) {
  return (
    <div>
      <div className="px-6 py-3 flex items-center justify-between border-b border-[#E7E5E4] bg-[#FAFAF9]">
        <span className="text-[11px] uppercase tracking-[0.15em] font-bold text-[#78716C]">{title}</span>
        <span className="text-sm font-semibold tabular-nums">{sub}</span>
      </div>
      {rows.length === 0 ? (
        <div className="px-6 py-8 text-center text-sm text-[#A8A29E]">{empty}</div>
      ) : (
        rows.map((r) => (
          <div key={r.key} data-testid={r.testid} className="flex items-center gap-3 px-6 py-3 border-b border-[#F5F5F4] last:border-0">
            {r.matched ? <CheckCircle2 size={15} className="text-[#166534] shrink-0" /> : <AlertTriangle size={15} className="text-[#B45309] shrink-0" />}
            <div className="min-w-0 flex-1">
              <div className="text-sm truncate">{r.mid}</div>
              <div className="text-xs text-[#78716C]">{r.left}</div>
            </div>
            <div className={`text-right tabular-nums font-semibold text-sm ${r.matched ? "text-[#1C1917]" : "text-[#B45309]"}`}>{fmtMoney(r.amount)}</div>
          </div>
        ))
      )}
    </div>
  );
}