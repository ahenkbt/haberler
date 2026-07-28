/**
 * Yalnızca bu e-postalar bilinçli olarak birden fazla HM sitesinde ortak editör hesabıdır (ASG + AHB).
 * Diğer tüm e-postalar site başına bağımsızdır — çapraz senkron yapılmaz.
 */
export const HM_CROSS_SITE_SHARED_EDITOR_EMAILS = new Set([
  "sehirgazetesiankara@gmail.com",
]);

export function isHmCrossSiteSharedEditorEmail(email: unknown): boolean {
  const em = String(email ?? "")
    .trim()
    .toLowerCase();
  return em.includes("@") && HM_CROSS_SITE_SHARED_EDITOR_EMAILS.has(em);
}
