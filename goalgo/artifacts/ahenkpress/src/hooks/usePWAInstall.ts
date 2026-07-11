import { useState, useEffect, useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export type PWAInstallState =
  | "chrome-prompt"
  | "android-manual"
  | "ios"
  | "hidden";

export const PWA_INSTALL_DISMISS_KEY = "pwa_banner_dismissed_v6";

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as { MSStream?: unknown }).MSStream;
}

function isAndroid() {
  return /android/i.test(navigator.userAgent);
}

function isInStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export function isMobileDevice() {
  return isIOS() || isAndroid() || window.innerWidth < 768;
}

function isDismissed() {
  try {
    return !!localStorage.getItem(PWA_INSTALL_DISMISS_KEY);
  } catch {
    return false;
  }
}

type PwaInstallSnapshot = {
  state: PWAInstallState;
  canPrompt: boolean;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installState: PWAInstallState = "hidden";
let bridgeReady = false;
const listeners = new Set<() => void>();
let cachedSnapshot: PwaInstallSnapshot = { state: "hidden", canPrompt: false };

function refreshSnapshot() {
  cachedSnapshot = { state: installState, canPrompt: deferredPrompt != null };
}

function notify() {
  refreshSnapshot();
  listeners.forEach((fn) => fn());
}

function snapshot(): PwaInstallSnapshot {
  return cachedSnapshot;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function initPwaInstallBridge() {
  if (typeof window === "undefined" || bridgeReady) return;
  bridgeReady = true;

  if (isInStandalone() || isDismissed()) return;

  if (isIOS()) {
    window.setTimeout(() => {
      if (!isDismissed() && installState === "hidden") {
        installState = "ios";
        notify();
      }
    }, 3000);
  }

  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    installState = "chrome-prompt";
    notify();
  });

  window.addEventListener("appinstalled", () => {
    try {
      localStorage.setItem(PWA_INSTALL_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    deferredPrompt = null;
    installState = "hidden";
    notify();
  });

  window.setTimeout(() => {
    if (isDismissed() || installState !== "hidden") return;
    installState = isMobileDevice() ? "android-manual" : "chrome-prompt";
    notify();
  }, 4000);
}

initPwaInstallBridge();

export function usePWAInstall() {
  const { state, canPrompt } = useSyncExternalStore(subscribe, snapshot, () => ({
    state: "hidden" as PWAInstallState,
    canPrompt: false,
  }));

  useEffect(() => {
    initPwaInstallBridge();
  }, []);

  async function triggerInstall() {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      try {
        localStorage.setItem(PWA_INSTALL_DISMISS_KEY, "1");
      } catch {
        /* ignore */
      }
      installState = "hidden";
    }
    deferredPrompt = null;
    notify();
    return true;
  }

  function dismiss() {
    try {
      localStorage.setItem(PWA_INSTALL_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    installState = "hidden";
    notify();
  }

  return { state, triggerInstall, dismiss, canPrompt };
}
