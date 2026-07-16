import { useState } from "react";
import { X, Copy, Check, ExternalLink, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export function TextMessageModal({ title = "Text message", phone, initialMessage, onClose }) {
  const [msg, setMsg] = useState(initialMessage || "");
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(msg);
      setCopied(true);
      toast.success("Message copied — paste it into Google Voice");
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast.error("Couldn't copy — select the text and copy manually");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" data-testid="text-message-modal">
      <div className="bg-white border border-[#E7E5E4] rounded-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="font-display text-xl font-semibold flex items-center gap-2">
            <MessageSquare size={18} className="text-[#166534]" /> {title}
          </div>
          <button onClick={onClose} data-testid="close-text-modal"><X size={18} /></button>
        </div>

        <div className="text-sm text-[#78716C] mb-3">
          {phone ? <>Owner's phone: <b className="text-[#1C1917]" data-testid="text-phone">{phone}</b><br /></> : <span className="text-[#B45309]">No phone on file for this owner — add one on the unit.</span>}
          Copy the message below, open Google Voice, and paste it into a new text.
        </div>

        <textarea
          data-testid="text-message-body"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          rows={5}
          className="w-full border border-[#E7E5E4] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#166534]/40 focus:border-[#166534]"
        />

        <div className="mt-5 flex flex-wrap gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-md border border-[#E7E5E4]">Close</button>
          <a
            data-testid="open-google-voice"
            href="https://voice.google.com/u/0/messages"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-md border border-[#166534] text-[#166534] font-semibold flex items-center gap-2 hover:bg-[#F0FDF4]"
          >
            <ExternalLink size={15} /> Open Google Voice
          </a>
          <button
            data-testid="copy-text-btn"
            onClick={copy}
            className="px-4 py-2 rounded-md bg-[#166534] text-white font-semibold flex items-center gap-2"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Copy message"}
          </button>
        </div>
      </div>
    </div>
  );
}
