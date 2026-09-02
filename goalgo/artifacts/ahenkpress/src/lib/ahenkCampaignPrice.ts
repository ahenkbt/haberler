/** Kurumsal web sitesi kampanyası: 2026 sonuna kadar 10.000 TL, 2027’den itibaren 20.000 TL. */

export const AHENK_LOGO_MARK = "/ahenk-brand/ahenk-mark.png";
export const AHENK_LOGO_WORDMARK = "/ahenk-brand/ahenk-logo.png";
export const AHENK_CORPORATE_EMAIL = "bilgi@ahenk.net.tr";

export type AhenkPackageQuote = {
  campaign: boolean;
  amount: string;
  display: string;
  includes: string;
  note: string;
  listDisplay: string;
};

function istanbulYear(now: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric" }).format(now),
  );
}

export function ahenkResolvedPackage(
  opts: {
    title?: string;
    campaignUntilYear?: string | number;
    campaignAmount?: string;
    regularAmount?: string;
    includesNote?: string;
  },
  now = new Date(),
): AhenkPackageQuote {
  const until = Number(opts.campaignUntilYear || 2026) || 2026;
  const campaign = istanbulYear(now) <= until;
  const campaignAmt = String(opts.campaignAmount || "10000").replace(/\D/g, "") || "10000";
  const regularAmt = String(opts.regularAmount || "20000").replace(/\D/g, "") || "20000";
  const amount = campaign ? campaignAmt : regularAmt;
  const n = Number(amount) || (campaign ? 10000 : 20000);
  const listN = Number(regularAmt) || 20000;
  const display = `${n.toLocaleString("tr-TR")} TL`;
  const listDisplay = `${listN.toLocaleString("tr-TR")} TL`;
  const includes = opts.includesNote?.trim() || "Sunucu ve domain dahildir.";
  const title = opts.title?.trim() || "Kurumsal web sitesi";
  const note = campaign
    ? `${title} 3 günde teslim · ${display} kampanya (${listDisplay} yerine) · ${includes}`
    : `${title} · ${display} · ${includes}`;
  return { campaign, amount: String(n), display, includes, note, listDisplay };
}

export function ahenkPackageFromFields(site: {
  priceTitle?: string;
  priceCampaignUntilYear?: string | number;
  priceCampaignAmount?: string;
  priceRegularAmount?: string;
  priceIncludesNote?: string;
}): AhenkPackageQuote {
  return ahenkResolvedPackage({
    title: site.priceTitle,
    campaignUntilYear: site.priceCampaignUntilYear,
    campaignAmount: site.priceCampaignAmount,
    regularAmount: site.priceRegularAmount,
    includesNote: site.priceIncludesNote,
  });
}
