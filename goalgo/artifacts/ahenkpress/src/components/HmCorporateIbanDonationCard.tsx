import { useCallback, useState } from "react";
import { Copy } from "lucide-react";
import type { HmCorporateDonationSettings } from "@/lib/newsSiteLayout";

function formatIbanDisplay(iban: string): string {
  const compact = iban.replace(/\s+/g, "").toUpperCase();
  if (compact.length < 8) return iban.trim();
  return compact.replace(/(.{4})/g, "$1 ").trim();
}

type HmCorporateIbanDonationCardProps = {
  donation: HmCorporateDonationSettings;
  className?: string;
  variant?: "corporate" | "news";
  accent?: string;
  showHeading?: boolean;
};

export function HmCorporateIbanDonationCard({
  donation,
  className = "",
  variant = "corporate",
  accent = "#8b1a1a",
  showHeading = true,
}: HmCorporateIbanDonationCardProps) {
  const ibanRaw = (donation.iban ?? "").trim();
  const ibanDisplay = ibanRaw ? formatIbanDisplay(ibanRaw) : "";
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");

  const copyIban = useCallback(async () => {
    if (!ibanRaw) return;
    setCopyError("");
    const text = ibanRaw.replace(/\s+/g, "");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2200);
      } catch {
        setCopyError("IBAN kopyalanamadı. Metni elle seçip kopyalayın.");
      }
    }
  }, [ibanRaw]);

  if (variant === "news") {
    return (
      <div className={`bg-white p-5 ${className}`.trim()}>
        {showHeading ? (
          <>
            <p className="text-xs font-black uppercase tracking-wide" style={{ color: accent }}>
              Banka Hesap Bilgileri
            </p>
            <h3 className="mt-1 text-base font-black text-gray-900">{donation.title || "Kurumsal yayıncılığa destek olun"}</h3>
          </>
        ) : null}
        {donation.accountName ? (
          <p className={`text-xs font-semibold text-slate-700 ${showHeading ? "mt-3" : "mt-0"}`}>{donation.accountName}</p>
        ) : null}
        {ibanDisplay ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">IBAN</p>
            <p className="mt-1 break-all font-mono text-sm font-bold leading-snug text-slate-900">{ibanDisplay}</p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">IBAN bilgisi henüz tanımlanmadı.</p>
        )}
        <button
          type="button"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: accent }}
          disabled={!ibanRaw}
          onClick={() => void copyIban()}
        >
          <Copy className="h-4 w-4" aria-hidden />
          {copied ? "Kopyalandı" : "IBAN Kopyala"}
        </button>
        {copyError ? <p className="mt-2 text-xs text-red-600">{copyError}</p> : null}
      </div>
    );
  }

  return (
    <div className={`vkv-donation-card ${className}`.trim()}>
      <div className="vkv-donation-eyebrow">Banka Hesap Bilgileri</div>
      {showHeading ? <h2>{donation.title || "Kurumsal yayıncılığa destek olun"}</h2> : null}
      {donation.accountName ? <div className="vkv-donation-account">{donation.accountName}</div> : null}
      {ibanDisplay ? (
        <div className="vkv-donation-iban-box">
          <span className="vkv-donation-iban-label">IBAN</span>
          <strong className="vkv-donation-iban-value">{ibanDisplay}</strong>
        </div>
      ) : (
        <p className="vkv-donation-iban-missing">IBAN bilgisi henüz tanımlanmadı.</p>
      )}
      <button type="button" className="vkv-donation-copy" disabled={!ibanRaw} onClick={() => void copyIban()}>
        <Copy className="h-4 w-4" aria-hidden />
        {copied ? "Kopyalandı" : "IBAN Kopyala"}
      </button>
      {copyError ? <div className="vkv-donation-error">{copyError}</div> : null}
    </div>
  );
}
