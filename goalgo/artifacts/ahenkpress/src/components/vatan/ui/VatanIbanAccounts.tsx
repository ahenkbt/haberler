import { useCallback, useState } from "react";
import {
  VKD_DONATION_ACCOUNTS,
  compactIban,
  formatIbanDisplay,
  type VkdDonationAccount,
} from "@/lib/vkdPublicContact";

export function useCopyIban() {
  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState("");

  const copyIban = useCallback(async (ibanRaw: string) => {
    const text = compactIban(ibanRaw);
    setCopyError("");
    const done = () => {
      setCopied(ibanRaw);
      window.setTimeout(() => setCopied((cur) => (cur === ibanRaw ? null : cur)), 2200);
    };
    try {
      await navigator.clipboard.writeText(text);
      done();
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
        done();
      } catch {
        setCopyError("IBAN kopyalanamadı. Metni elle seçip kopyalayın.");
      }
    }
  }, []);

  return { copied, copyError, copyIban };
}

export function VatanIbanAccounts({
  accounts = VKD_DONATION_ACCOUNTS,
  variant = "card",
}: {
  accounts?: readonly VkdDonationAccount[];
  variant?: "card" | "footer";
}) {
  const { copied, copyError, copyIban } = useCopyIban();
  if (!accounts.length) return null;

  if (variant === "footer") {
    return (
      <ul className="vatan-footer__accounts" role="list" aria-label="Bağış hesapları">
        {accounts.map((a) => (
          <li key={a.iban}>
            <span className="vatan-footer__accounts-bank">{a.bank}: </span>
            <span className="vatan-footer__accounts-iban">{formatIbanDisplay(a.iban)}</span>
            <span className="vatan-footer__accounts-payee">{a.accountName}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="vatan-iban" aria-label="Bağış hesapları">
      <p className="vatan-eyebrow vatan-eyebrow--crimson">Havale / EFT</p>
      <ul role="list">
        {accounts.map((a) => (
          <li key={a.iban} className="vatan-iban__row">
            <span className="vatan-iban__bank">{a.bank}</span>
            <span className="vatan-iban__payee">Alıcı adı: {a.accountName}</span>
            <span className="vatan-iban__code">{formatIbanDisplay(a.iban)}</span>
            <button
              type="button"
              className="vatan-iban__copy"
              onClick={() => void copyIban(a.iban)}
              aria-label={`${a.bank} IBAN kopyala`}
            >
              {copied === a.iban ? "Kopyalandı" : "Kopyala"}
            </button>
          </li>
        ))}
      </ul>
      {copyError ? (
        <p className="vatan-iban__error" role="status">
          {copyError}
        </p>
      ) : null}
    </div>
  );
}
