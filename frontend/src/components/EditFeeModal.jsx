import { useState } from "react";
import api from "@/lib/api";
import { MONTHS } from "@/lib/utils";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";

const inp = "border border-[#E7E5E4] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#166534]/40 focus:border-[#166534] bg-white";

export function EditFeeModal({ fee, onClose, onSaved }) {
  const [paid, setPaid] = useState(!!fee.paid);
  const [amountPaid, setAmountPaid] = useState(fee.amount_paid ?? 0);
  const [amountDue, setAmountDue] = useState(fee.amount_due ?? 0);
  const [paidDate, setPaidDate] = useState((fee.paid_date || "").slice(0, 10));
  const [method, setMethod] = useState(fee.method || "");
  const [notes, setNotes] = useState(fee.notes || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        paid,
        amount_due: parseFloat(amountDue) || 0,
        amount_paid: paid ? (parseFloat(amountPaid) || 0) : 0,
        method: method || null,
        notes: notes.trim() || null,
        // store at noon UTC so the calendar date is stable across timezones
        paid_date: paid ? (paidDate ? `${paidDate}T12:00:00Z` : new Date().toISOString()) : null,
      };
      await api.put(`/fees/${fee.id}`, body);
      toast.success("Fee updated");
      onSaved();
    } catch (e) {
      toast.error("Could not save changes");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" data-testid="edit-fee-modal">
      <div className="bg-white border border-[#E7E5E4] rounded-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="font-display text-xl font-semibold">Edit payment</div>
          <button onClick={onClose} data-testid="close-edit-fee"><X size={18} /></button>
        </div>
        <div className="text-sm text-[#78716C] mb-5">
          Unit {fee.unit_number} · {fee.owner_name?.trim()} — {MONTHS[fee.period_month - 1]} {fee.period_year}
        </div>

        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input data-testid="edit-fee-paid" type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="h-4 w-4 accent-[#166534]" />
            Marked as paid
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C] mb-1.5">Amount due</div>
              <input data-testid="edit-fee-due" type="number" step="0.01" value={amountDue} onChange={(e) => setAmountDue(e.target.value)} className={`${inp} w-full`} />
            </label>
            <label className="block">
              <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C] mb-1.5">Amount paid</div>
              <input data-testid="edit-fee-amount" type="number" step="0.01" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} disabled={!paid} className={`${inp} w-full disabled:bg-[#F5F5F4]`} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C] mb-1.5">Paid date</div>
              <input data-testid="edit-fee-date" type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} disabled={!paid} className={`${inp} w-full disabled:bg-[#F5F5F4]`} />
            </label>
            <label className="block">
              <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C] mb-1.5">Method</div>
              <select data-testid="edit-fee-method" value={method} onChange={(e) => setMethod(e.target.value)} className={`${inp} w-full`}>
                <option value="">—</option>
                <option value="check">Check</option>
                <option value="zelle">Zelle</option>
                <option value="cash">Cash</option>
                <option value="ach">ACH</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>

          <label className="block">
            <div className="text-xs uppercase tracking-[0.15em] font-bold text-[#78716C] mb-1.5">Note (optional)</div>
            <textarea data-testid="edit-fee-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${inp} w-full`} />
          </label>
          <p className="text-xs text-[#78716C]">Tip: the "late" flag is based on the paid date vs. the 10th of the month. Correcting the date here clears a false "late" mark.</p>
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-md border border-[#E7E5E4]">Cancel</button>
          <button data-testid="save-edit-fee" onClick={save} disabled={saving} className="px-4 py-2 rounded-md bg-[#166534] text-white font-semibold flex items-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 size={15} className="animate-spin" /> : null} Save
          </button>
        </div>
      </div>
    </div>
  );
}
