/** SEO kabuğunu kaldır — React haber arayüzü boyanınca. */
export function markHmSpaReady(): void {
  if (typeof window === "undefined") return;
  const release = window.__YEKPARE_HM_RELEASE_FIRST_PAINT__;
  if (typeof release === "function") {
    release();
    return;
  }
  window.__YEKPARE_SPA_READY__ = true;
  document.documentElement.classList.add("hm-spa-ready");
  document.documentElement.removeAttribute("data-hm-spa-pending");
  document.getElementById("seo-boot-shell")?.remove();
  document.getElementById("hm-first-paint-hold")?.remove();
  document.getElementById("root")?.removeAttribute("aria-hidden");
}
