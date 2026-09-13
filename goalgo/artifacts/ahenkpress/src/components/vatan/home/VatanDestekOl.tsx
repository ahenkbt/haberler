import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import { isHmDonationActive, type NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";
import { VATAN_SUPPORT_LINKS, VATAN_SUPPORT_NOTE } from "@/lib/hmVatanHomeContent";
import { isVkdSiteSlug } from "@/lib/hmVkdFooterNav";
import {
  VKD_ACCOUNT_NAME,
  VKD_CONTACT_PHONE_DISPLAY,
  VKD_CONTACT_PHONE_TEL,
  VKD_DONATION_ACCOUNTS,
  isStaleVkdAccountName,
  isStaleVkdIban,
  type VkdDonationAccount,
} from "@/lib/vkdPublicContact";
import { VatanButton } from "@/components/vatan/ui/VatanButton";
import { VatanIbanAccounts } from "@/components/vatan/ui/VatanIbanAccounts";
import { VatanSectionHead } from "@/components/vatan/ui/VatanSectionHead";

function resolveAccounts(layoutPrefs: NewsSiteLayoutPrefs, slug: string): VkdDonationAccount[] {
  const donation = layoutPrefs.hmCorporateDonation;
  const isVkd = isVkdSiteSlug(slug);
  if (isVkd) return [...VKD_DONATION_ACCOUNTS];
  const stored: VkdDonationAccount[] = [];
  if (donation) {
    for (const row of donation.accounts ?? []) {
      const iban = row.iban?.trim() ?? "";
      if (!iban || isStaleVkdIban(iban)) continue;
      stored.push({
        bank: row.bank?.trim() || "Bağış Hesabı",
        accountName: (isStaleVkdAccountName(row.accountName) ? VKD_ACCOUNT_NAME : row.accountName?.trim()) || VKD_ACCOUNT_NAME,
        iban,
      });
    }
    if (!stored.length && donation.iban?.trim() && !isStaleVkdIban(donation.iban)) {
      stored.push({
        bank: "Bağış Hesabı",
        accountName: (isStaleVkdAccountName(donation.accountName) ? VKD_ACCOUNT_NAME : donation.accountName?.trim()) || VKD_ACCOUNT_NAME,
        iban: donation.iban.trim(),
      });
    }
  }
  return stored;
}

export function VatanDestekOl({ layoutPrefs, slug }: { layoutPrefs: NewsSiteLayoutPrefs; slug: string }) {
  const h = useHmPublicHref();
  const isVkd = isVkdSiteSlug(slug);
  const donationActive = isVkd || isHmDonationActive(layoutPrefs.hmCorporateDonation) || layoutPrefs.hmCorporateDonation == null;
  const accounts = donationActive ? resolveAccounts(layoutPrefs, slug) : [];
  const storedTitle = layoutPrefs.hmCorporateDonation?.title?.trim() ?? "";
  // The platform's generic default is a news-publisher line; never show it on the Vatan home.
  const title =
    !storedTitle ||
    /^kurumsal yayıncılı[ğş]a destek/i.test(storedTitle) ||
    /^çalışmalarımıza destek olun\.?$/i.test(storedTitle)
      ? "Değerli desteklerinize teşekkür ederiz."
      : storedTitle;

  return (
    <section className="vatan-section vatan-section--crimson vatan-support" aria-labelledby="vatan-s9-title">
      <div className="vatan-wrap">
        <VatanSectionHead numeral="07" eyebrow="Destek Ol" title={title} align="stack" id="vatan-s9-title" />
        <div className={`vatan-support__grid${accounts.length ? "" : " vatan-support__grid--no-iban"}`}>
          {accounts.length ? (
            <div className="vatan-reveal">
              <VatanIbanAccounts accounts={accounts} />
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
