import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { isMobileDevice, usePWAInstall } from "@/hooks/usePWAInstall";

const PBX_PWA_DISMISS_KEY = "pbx_pwa_install_dismissed_v1";

function isDismissed() {
  try {
    return !!localStorage.getItem(PBX_PWA_DISMISS_KEY);
  } catch {
    return false;
  }
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

/** PBX panel için ana ekrana ekle / yükle banner'ı. */
export function PbxInstallBanner() {
  const { state, triggerInstall, canPrompt } = usePWAInstall();
  const [visible, setVisible] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const sync = () => setMobile(isMobileDevice());
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    if (isStandalone() || isDismissed() || !mobile) {
      setVisible(false);
      return;
    }
    const t = window.setTimeout(() => setVisible(true), 1500);
    return () => window.clearTimeout(t);
  }, [mobile]);

  if (!visible || state === "hidden") return null;

  const dismiss = () => {
    try {
      localStorage.setItem(PBX_PWA_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  const install = async () => {
    if (canPrompt) {
      await triggerInstall();
      dismiss();
    }
  };

  return (
    <div
      className="rounded-xl border border-[#1e3a5f]/30 bg-[#1e3a5f]/5 p-3 flex items-start gap-3"
      role="region"
      aria-label="Uygulama olarak yükle"
    >
      <div className="rounded-lg bg-[#1e3a5f] p-2 text-white shrink-0">
        <Download className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-semibold text-gray-900">PBX panelini uygulama olarak yükle</p>
        {state === "ios" ? (
          <p className="text-xs text-gray-600 flex items-center gap-1">
            <Share className="w-3 h-3 shrink-0" />
            Safari: Paylaş → Ana Ekrana Ekle
          </p>
        ) : (
          <p className="text-xs text-gray-600">Ana ekrandan tek dokunuşla panele girin; arama sırasında sekme kapanmaz.</p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          {canPrompt ? (
            <button
              type="button"
              onClick={() => void install()}
              className="rounded-lg bg-[#1e3a5f] px-3 py-1.5 text-xs font-semibold text-white"
            >
              Yükle
            </button>
          ) : null}
          <button type="button" onClick={dismiss} className="text-xs text-gray-500 underline">
            Sonra
          </button>
        </div>
      </div>
      <button type="button" onClick={dismiss} className="text-gray-400 hover:text-gray-600 shrink-0" aria-label="Kapat">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
