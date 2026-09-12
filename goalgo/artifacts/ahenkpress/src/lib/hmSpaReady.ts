/** Worker first-paint hold — React içerik hazır olunca klasik kabuğu kaldır. */
export function markHmSpaReady(): void {
  if (typeof window === "undefined") return;
  const release = window.__YEKPARE_HM_RELEASE_FIRST_PAINT__;
  if (typeof release === "function") {
    release();
    return;
  }
  window.__YEKPARE_SPA_READY__ = true;
  document.documentElement.removeAttribute("data-hm-spa-pending");
}
