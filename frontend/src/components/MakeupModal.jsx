import { useEffect, useState } from "react";
import api from "@/lib/api";
import { fmtMoney, MONTHS } from "@/lib/utils";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

const inp = "border border-[#E7E5E4] rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#166534]/40";

export function MakeupModal({ onClose, onSaved }) {
  const [units, setUnits] = useState([]);
  const [unitId, setUnitId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [sf, setSf] = useState({ months: [], total_short: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/units").then(({ data }) => {
      const sorted = [...data].sort((a, b) => a.unit_number.localeCompare(b.unit_number));
      setUnits(sorted);
      if (sorted[0]) setUnitId(sorted[0].id);
    });
  }, []);

  useEffect(() => {
    if (!unitId) return;
    api.get(`/fees/shortfall/${unitId}`).then(({ data }) => {
      setSf(data);
      setAmount(data.total_short ? String(data.total_short) : "");
    });
  }, [unitId]);

  const submit = async () => {
    const amt = parseFloat(amount);
    if (!unitId || !amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    setSaving(true);
    try {
      const { data } = await api.post("/fees/makeup", { unit_id: unitId, amount: amt, paid_date: new Date(date).toISOString() });
      const n = data.months_cleared.length;
      toast.success(`Applied ${fmtMoney(data.applied)} across ${n} month${n !== 1 ? "s" : ""}${data.remaining_credit > 0 ? ` · ${fmtMoney(data.remaining_credit)} credit left` : ""}`);
      onSaved();
    } catch (e) {
      toast.error("Could not record make-up payment");
    }
    setSaving(false);
  };

  return (
    <div data-testid="makeup-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-xl font-bold">Record make-up payment</h3>
          <button data-testid="makeup-close" onClick={onClose} className="text-[#78716C] hover:text-[#1C1917]"><X size={18} /></button>
        </div>
        <p className="text-sm text-[#78716C] mb-4">Apply one check across an owner's underpaid months (oldest first) to clear their shortfall.</p>

        <label className="block text-xs uppercase tracking-wide font-bold text-[#78716C] mb-1.5">Unit / Owner</label>
        <select data-testid="makeup-unit" value={unitId} onChange={(e) => setUnitId(e.target.value)} className={`${inp} w-full mb-3`}>
          {units.map((u) => <option key={u.id} value={u.id}>{u.unit_number} · {u.owner_name}</option>)}
        </select>

        <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-md p-3 mb-3 text-sm">
          <div className="flex justify-between font-semibold text-[#B45309]">
            <span>Current shortfall</span>
            <span data-testid="makeup-total-short">{fmtMoney(sf.total_short)}</span>
          </div>
          {sf.months.length ? (
            <ul className="mt-2 space-y-0.5 text-[#78716C] text-xs">
              {sf.months.map((m, i) => (
                <li key={i} className="flex justify-between"><span>{MONTHS[m.period_month - 1]} {m.period_year}</span><span>short {fmtMoney(m.short)}</span></li>
              ))}
            </ul>
          ) : <div className="text-xs text-[#78716C] mt-1">No shortfall for this owner.</div>}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs uppercase tracking-wide font-bold text-[#78716C] mb-1.5">Amount received</label>
            <input data-testid="makeup-amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inp} w-full`} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide font-bold text-[#78716C] mb-1.5">Date</label>
            <input data-testid="makeup-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${inp} w-full`} />
          </div>
        </div>

        <button data-testid="makeup-submit" onClick={submit} disabled={saving || !sf.months.length}
          className="w-full bg-[#166534] hover:bg-[#14532D] text-white py-2.5 rounded-md font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
          {saving ? <Loader2 className="animate-spin" size={16} /> : null} Apply payment
        </button>
      </div>
    </div>
  );
}
