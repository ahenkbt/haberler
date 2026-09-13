import { useCallback, useState } from "react";
import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import { isHmDonationActive, type NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";
import { VATAN_SUPPORT_LINKS, VATAN_SUPPORT_NOTE } from "@/lib/hmVatanHomeContent";
import { isVkdSiteSlug } from "@/lib/hmVkdFooterNav";
import {
  VKD_ACCOUNT_NAME,
  VKD_CONTACT_PHONE_DISPLAY,
  VKD_CONTACT_PHONE_TEL,
  VKD_DONATION_ACCOUNTS,
  compactIban,
  formatIbanDisplay,
  isStaleVkdAccountName,
  isStaleVkdIban,
} from "@/lib/vkdPublicContact";
import { VatanButton } from "@/components/vatan/ui/VatanButton";
import { VatanSectionHead } from "@/components/vatan/ui/VatanSectionHead";

type AccountRow = { bank: string; accountName: string; iban: string };

function resolveAccounts(layoutPrefs: NewsSiteLayoutPrefs, slug: string): AccountRow[] {
  const donation = layoutPrefs.hmCorporateDonation;
  const isVkd = isVkdSiteSlug(slug);
  const stored: AccountRow[] = [];
  if (donation) {
    for (const row of donation.accounts ?? []) {
      const iban = row.iban?.trim() ?? "";
      if (!iban || (isVkd && isStaleVkdIban(iban))) continue;
      stored.push({
        bank: row.bank?.trim() || "Bağış Hesabı",
        accountName: (isVkd && isStaleVkdAccountName(row.accountName) ? VKD_ACCOUNT_NAME : row.accountName?.trim()) || VKD_ACCOUNT_NAME,
        iban,
      });
    }
    if (!stored.length && donation.iban?.trim() && !(isVkd && isStaleVkdIban(donation.iban))) {
      stored.push({
        bank: "Bağış Hesabı",
        accountName: (isVkd && isStaleVkdAccountName(donation.accountName) ? VKD_ACCOUNT_NAME : donation.accountName?.trim()) || VKD_ACCOUNT_NAME,
        iban: donation.iban.trim(),
      });
    }
  }
  if (stored.length) return stored;
  if (isVkd) return VKD_DONATION_ACCOUNTS.map((a) => ({ bank: a.bank, accountName: a.accountName, iban: a.iban }));
  return [];
}

export function VatanDestekOl({ layoutPrefs, slug }: { layoutPrefs: NewsSiteLayoutPrefs; slug: string }) {
  const h = useHmPublicHref();
  const donationActive = isHmDonationActive(layoutPrefs.hmCorporateDonation) || layoutPrefs.hmCorporateDonation == null;
  const accounts = donationActive ? resolveAccounts(layoutPrefs, slug) : [];
  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState("");
  const isVkd = isVkdSiteSlug(slug);
  const storedTitle = layoutPrefs.hmCorporateDonation?.title?.trim() ?? "";
  // The platform's generic default is a news-publisher line; never show it on the Vatan home.
  const title =
    !storedTitle ||
    /^kurumsal yayıncılı[ğş]a destek/i.test(storedTitle) ||
    /^çalışmalarımıza destek olun\.?$/i.test(storedTitle)
      ? "Değerli desteklerinize teşekkür ederiz."
      : storedTitle;

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

  return (
    <section className="vatan-section vatan-section--crimson vatan-support" aria-labelledby="vatan-s9-title">
      <div className="vatan-wrap">
        <VatanSectionHead numeral="07" eyebrow="Destek Ol" title={title} align="stack" id="vatan-s9-title" />
        <div className={`vatan-support__grid${accounts.length ? "" : " vatan-support__grid--no-iban"}`}>
          {accounts.length ? (
            <div className="vatan-iban vatan-reveal" aria-label="Bağış hesapları">
              <p className="vatan-eyebrow vatan-eyebrow--crimson">{accounts[0].accountName}</p>
              <ul role="list">
                {accounts.map((a) => (
                  <li key={a.iban} className="vatan-iban__row">
                    <span className="vatan-iban__bank">{a.bank}</span>
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
          ) : null}
          <div className="vatan-support__actions vatan-reveal" data-reveal-i={1}>
            {VATAN_SUPPORT_LINKS.map((l) => (
              <VatanButton key={l.href} href={h(l.href)} variant="outline" arrow>
                {l.label}
              </VatanButton>
            ))}
            {isVkd ? (
              <p className="vatan-support__note">
                {VATAN_SUPPORT_NOTE}{" "}
                <a href={`tel:${VKD_CONTACT_PHONE_TEL}`}>{VKD_CONTACT_PHONE_DISPLAY}</a>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
