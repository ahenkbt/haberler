/** Yekpare içi mağaza vitrini — özel alan adı yerine SPA rotası kullanılır. */
export function yekpareEcommerceStoreHref(slug: string | null | undefined): string {
  const s = String(slug ?? "").trim();
  return s ? `/alisveris/magaza/${encodeURIComponent(s)}` : "/alisveris";
}

/** Pazaryeri Sellzy kabuğu içindeki hafif satıcı sayfası */
export function sellzyMarketplaceStoreHref(slug: string | null | undefined): string {
  const s = String(slug ?? "").trim();
  return s ? `/magaza/magaza/${encodeURIComponent(s)}` : "/magaza/magazalar";
}

/** Kart tıklaması: tam vitrin (ürün listesi) tercih edilir; yoksa pazaryeri iç sayfa. */
export function resolveMarketplaceStoreCardHref(input: {
  slug?: string | null;
  vendorType?: string | null;
  storefrontHref?: string | null;
  yekpareStoreHref?: string | null;
}): string {
  if (input.yekpareStoreHref?.startsWith("/")) return input.yekpareStoreHref;
  const slug = String(input.slug ?? "").trim();
  const vt = String(input.vendorType ?? "ecommerce").toLowerCase();
  if (slug && (vt === "ecommerce" || vt === "alisveris")) {
    return yekpareEcommerceStoreHref(slug);
  }
  const href = String(input.storefrontHref ?? "").trim();
  if (href.startsWith("/")) return href;
  if (slug) return yekpareEcommerceStoreHref(slug);
  return "/magaza/magazalar";
}
