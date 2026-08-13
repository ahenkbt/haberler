import { useCallback, useState } from "react";
import {
  VKD_CONTACT_ADDRESS,
  VKD_CONTACT_PHONE_DISPLAY,
  VKD_CONTACT_PHONE_TEL,
  VKD_DONATION_ACCOUNTS,
  compactIban,
  formatIbanDisplay,
} from "@/lib/vkdPublicContact";

export function VkdNavStripContact() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyIban = useCallback(async (iban: string) => {
    const text = compactIban(iban);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(iban);
    window.setTimeout(() => setCopied((cur) => (cur === iban ? null : cur)), 1800);
  }, []);

  return (
    <aside className="vkd-nav-contact" aria-label="Bağış hesapları ve iletişim">
      {VKD_DONATION_ACCOUNTS.map((account) => (
        <div key={account.iban} className="vkd-nav-contact__account">
          <p className="vkd-nav-contact__bank">{account.bank}</p>
          <p className="vkd-nav-contact__name">{account.accountName}</p>
          <button
            type="button"
            className="vkd-nav-contact__iban"
            title="IBAN kopyala"
            onClick={() => void copyIban(account.iban)}
          >
            IBAN: {formatIbanDisplay(account.iban)}
            {copied === account.iban ? " · kopyalandı" : ""}
          </button>
        </div>
      ))}
      <p className="vkd-nav-contact__meta">
        <a href={`tel:${VKD_CONTACT_PHONE_TEL}`}>{VKD_CONTACT_PHONE_DISPLAY}</a>
        <span aria-hidden> · </span>
        <span>{VKD_CONTACT_ADDRESS}</span>
      </p>
    </aside>
  );
}
