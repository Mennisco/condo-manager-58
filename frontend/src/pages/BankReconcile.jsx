import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { fmtMoney } from "@/lib/utils";
import { Upload, CheckCircle2, AlertTriangle, FileText, Trash2, Loader2, Landmark } from "lucide-react";
import { toast } from "sonner";

export default function BankReconcile() {
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const loadHistory = () => api.get("/bank/statements").then((r) => setHistory(r.data));
  useEffect(() => { loadHistory(); }, []);

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
    } catch (err) {
      toast.error(err.response?.data?.detail || "Could not process the PDF");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const openStatement = async (id) => {
    const { data } = await api.get(`/bank/statements/${id}`);
    setResult(data);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const del = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Delete this reconciled statement?")) return;
    await api.delete(`/bank/statements/${id}`);
    if (result?.id === id) setResult(null);
    loadHistory();
  };

  return (
    <div data-testid="bank-page" className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C]">Reconciliation</div>
        <h1 className="font-display text-4xl font-bold tracking-tight mt-2">Bank Reconciliation</h1>
        <p className="text-[#78716C] mt-2 max-w-2xl">
          Upload your Heartland Bank statement PDF. We extract every transaction, match deposits to fee
          payments and withdrawals to expenses, and flag anything that needs a look.
        </p>
      </div>

      <label
        data-testid="bank-upload-label"
        className="block border-2 border-dashed border-[#D6D3D1] rounded-lg bg-white hover:border-[#166534] transition-colors cursor-pointer p-10 text-center"
      >
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

      {result ? <ReconcileResult result={result} /> : null}

      {history.length > 0 ? (
        <div className="bg-white border border-[#E7E5E4] rounded-lg overflow-hidden">
          <div className="px-6 py-3 text-[11px] uppercase tracking-[0.15em] font-bold text-[#78716C] border-b border-[#E7E5E4]">Reconciled statements</div>
          {history.map((s) => (
            <div
              key={s.id}
              data-testid={`bank-history-${s.id}`}
              onClick={() => openStatement(s.id)}
              className="flex items-center justify-between px-6 py-3 border-b border-[#F5F5F4] hover:bg-[#F5F5F4] cursor-pointer"
            >
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
    </div>
  );
}

function ReconcileResult({ result }) {
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

      <TxnTable title="Deposits / Credits" rows={result.credits} />
      <TxnTable title="Withdrawals / Debits" rows={result.withdrawals} negative />
    </div>
  );
}

function TxnTable({ title, rows, negative }) {
  if (!rows?.length) return null;
  return (
    <div className="bg-white border border-[#E7E5E4] rounded-lg overflow-hidden">
      <div className="px-6 py-3 text-[11px] uppercase tracking-[0.15em] font-bold text-[#78716C] border-b border-[#E7E5E4]">{title}</div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((t, i) => (
            <tr key={i} data-testid={`bank-txn-${title.includes("Deposit") ? "credit" : "debit"}-${i}`} className="border-b border-[#F5F5F4] last:border-0">
              <td className="px-6 py-3 whitespace-nowrap text-[#78716C]">{t.date}</td>
              <td className="px-6 py-3">{t.description}</td>
              <td className={`px-6 py-3 text-right tabular-nums font-semibold ${negative ? "text-[#C53030]" : "text-[#166534]"}`}>{negative ? "-" : ""}{fmtMoney(t.amount)}</td>
              <td className="px-6 py-3 text-right w-64">
                {t.match ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#166534]">
                    <CheckCircle2 size={14} /> {t.match.label}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] rounded-full px-2.5 py-1">
                    <AlertTriangle size={13} /> Review
                  </span>
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
