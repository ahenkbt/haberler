import { useEffect, useState } from "react";
import { Link } from "wouter";
import { isDefaultPortalHost } from "@/lib/hmPortalHosts";
import { PWA_ICON_PATH, PWA_STORE_NAME, PWA_STORE_TAGLINE } from "@/lib/portalBrand";
import { isMobileDevice, usePWAInstall } from "@/hooks/usePWAInstall";

export function PWAInstallBanner() {
  const { state, triggerInstall, dismiss, canPrompt } = usePWAInstall();
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const sync = () => setMobile(isMobileDevice());
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";
  const portal = isDefaultPortalHost(host);

  if (!portal || !mobile || state === "hidden") return null;

  const title = PWA_STORE_NAME;
  const subtitle =
    state === "ios"
      ? "Paylaş → Ana Ekrana Ekle ile yükleyin"
      : PWA_STORE_TAGLINE;

  async function handleInstallClick() {
    if (canPrompt) {
      await triggerInstall();
      return;
    }
    window.location.href = "/uygulamayi-indir";
  }

  return (
    <div
      className="fixed inset-x-0 top-0 z-[1999] px-3 pt-[max(env(safe-area-inset-top,0px),6px)] md:hidden animate-fade-in-up"
      role="region"
      aria-label="Uygulamayı yükle"
    >
      <div className="relative mx-auto w-full max-w-lg">
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-[12px] shadow ring-1 ring-gray-100">
              <img src={PWA_ICON_PATH} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black leading-tight text-gray-900">{title}</p>
              <p className="mt-0.5 text-[10px] text-gray-500 line-clamp-1">{subtitle}</p>
            </div>
            {canPrompt || state === "ios" || state === "android-manual" ? (
              <button
                type="button"
                onClick={handleInstallClick}
                className="shrink-0 whitespace-nowrap rounded-xl bg-green-600 px-3 py-2 text-xs font-black text-white shadow transition active:scale-[0.98] hover:bg-green-700"
              >
                Yükle
              </button>
            ) : (
              <Link
                href="/uygulamayi-indir"
                className="shrink-0 whitespace-nowrap rounded-xl bg-green-600 px-3 py-2 text-xs font-black text-white shadow transition active:scale-[0.98] hover:bg-green-700"
              >
                Yükle
              </Link>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-gray-500 shadow-md transition hover:bg-gray-600"
          aria-label="Kapat"
        >
          <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
