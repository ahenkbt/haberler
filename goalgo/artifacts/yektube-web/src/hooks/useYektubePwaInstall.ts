import { useEffect, useSyncExternalStore } from "react";
import { isYektubeDedicatedHost } from "@workspace/yektube-core";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type YektubePwaInstallState = "chrome-prompt" | "ios" | "hidden";

export const YEKTUBE_PWA_DISMISS_KEY = "yektube-pwa-install-dismissed-v1";

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installState: YektubePwaInstallState = "hidden";
let bridgeReady = false;
const listeners = new Set<() => void>();
let cachedSnapshot = { state: installState as YektubePwaInstallState, canPrompt: false };

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !(window as { MSStream?: unknown }).MSStream
  );
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

function isDismissed(): boolean {
  try {
    return localStorage.getItem(YEKTUBE_PWA_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function isYektubePwaSurface(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  const path = window.location.pathname;
  if (isYektubeDedicatedHost(host)) return false;
  if (path === "/yp" || path.startsWith("/yp/")) return true;
  const base = (import.meta.env.BASE_URL ?? "/yektube-v2/").replace(/\/$/, "");
  return path === base || path.startsWith(`${base}/`);
}

function refreshSnapshot(): void {
  cachedSnapshot = { state: installState, canPrompt: deferredPrompt != null };
}

function notify(): void {
  refreshSnapshot();
  listeners.forEach((fn) => fn());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): typeof cachedSnapshot {
  return cachedSnapshot;
}

function initYektubePwaBridge(): void {
  if (typeof window === "undefined" || bridgeReady) return;
  bridgeReady = true;

  if (!isYektubePwaSurface() || isStandalone() || isDismissed()) return;

  if (isIOS()) {
    window.setTimeout(() => {
      if (!isDismissed() && installState === "hidden" && isYektubePwaSurface()) {
        installState = "ios";
        notify();
      }
    }, 4000);
  }

  window.addEventListener("beforeinstallprompt", (e: Event) => {
    if (!isYektubePwaSurface()) return;
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    installState = "chrome-prompt";
    notify();
  });

  window.addEventListener("appinstalled", () => {
    try {
      localStorage.setItem(YEKTUBE_PWA_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    deferredPrompt = null;
    installState = "hidden";
    notify();
  });
}

initYektubePwaBridge();

export function useYektubePwaInstall() {
  const { state, canPrompt } = useSyncExternalStore(subscribe, snapshot, () => ({
    state: "hidden" as YektubePwaInstallState,
    canPrompt: false,
  }));

  useEffect(() => {
    initYektubePwaBridge();
  }, []);

  async function triggerInstall(): Promise<boolean> {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      try {
        localStorage.setItem(YEKTUBE_PWA_DISMISS_KEY, "1");
      } catch {
        /* ignore */
      }
      installState = "hidden";
    }
    deferredPrompt = null;
    notify();
    return outcome === "accepted";
  }

  function dismiss(): void {
    try {
      localStorage.setItem(YEKTUBE_PWA_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    installState = "hidden";
    notify();
  }

  return { state, canPrompt, triggerInstall, dismiss, visible: state !== "hidden" && isYektubePwaSurface() };
}
