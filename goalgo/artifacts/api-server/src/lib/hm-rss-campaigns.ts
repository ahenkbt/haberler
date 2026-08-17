/** Editör RSS kampanyası: yalnızca kendi HM sitesine yazar; Yekpare/diğer siteler yok. */

export function rssCampaignOwnedByHmSite(
  campaign: { hmSiteIds?: number[] | null; includeYekpareHaber?: boolean | null },
  siteId: number,
): boolean {
  if (!Number.isFinite(siteId) || siteId <= 0) return false;
  if (campaign.includeYekpareHaber === true) return false;
  const ids = (campaign.hmSiteIds ?? [])
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n) && n > 0);
  return ids.length === 1 && ids[0] === siteId;
}

export function parsePositiveInt(raw: unknown): number | null {
  const n = parseInt(String(Array.isArray(raw) ? raw[0] : raw ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
