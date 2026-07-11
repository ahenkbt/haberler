import { useState } from "react";
import type { CSSProperties } from "react";
import { Download } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";

function pwaInstallFallbackMessage(): string {
  if (typeof navigator === "undefined") {
    return "Tarayıcınız destekliyorsa menüden Ana ekrana ekle seçeneğini kullanın.";
  }
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) {
    return "Safari'de Paylaş → Ana Ekrana Ekle";
  }
  if (/android/i.test(ua)) {
    return "Chrome menüsünden Uygulamayı yükle";
  }
  return "Adres çubuğundaki yükle simgesini veya menüden Uygulamayı yükle seçeneğini kullanın.";
}

type Props = {
  accent: string;
  navOnLight: boolean;
  pillIdleBg: string;
  pillText: string;
  activePillText: string;
};

const iconOnlyPillClass =
  "hm-pwa-install-nav__btn inline-flex shrink-0 items-center justify-center rounded-md p-2 transition-colors duration-150";

const ariaLabel = "Uygulamayı yükle";

/** Menü şeridinde kompakt PWA yükle düğmesi — yalnızca ikon. */
export function HmPwaInstallNavButton({ accent, navOnLight, pillIdleBg, pillText, activePillText }: Props) {
  const { triggerInstall, canPrompt, state: pwaInstallState } = usePWAInstall();
  const [installHint, setInstallHint] = useState<string | null>(null);

  async function handlePwaInstallClick() {
    setInstallHint(null);
    if (pwaInstallState === "chrome-prompt" && canPrompt) {
      const prompted = await triggerInstall();
      if (prompted) return;
    }
    setInstallHint(pwaInstallFallbackMessage());
  }

  const idleStyle: CSSProperties = {
    background: navOnLight ? pillIdleBg : "rgba(255, 255, 255, 0.12)",
    color: pillText,
    border: navOnLight ? "1px solid rgba(15, 23, 42, 0.14)" : "1px solid rgba(255, 255, 255, 0.2)",
  };

  const activeStyle: CSSProperties = {
    background: accent,
    color: activePillText,
    border: "1px solid transparent",
  };

  return (
    <div className="hm-pwa-install-nav flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        onClick={() => void handlePwaInstallClick()}
        className={`${iconOnlyPillClass} my-1`}
        style={installHint ? activeStyle : idleStyle}
        aria-label={ariaLabel}
        title={ariaLabel}
      >
        <Download className="h-4 w-4 shrink-0" aria-hidden />
      </button>
      {installHint ? (
        <span
          className="hm-pwa-install-nav__hint hidden max-w-[14rem] truncate text-[10px] font-medium lg:inline"
          style={{ color: navOnLight ? "rgba(15,23,42,0.65)" : "rgba(255,255,255,0.72)" }}
          aria-live="polite"
        >
          {installHint}
        </span>
      ) : null}
    </div>
  );
}
