import { googleTranslateIncludedLanguages, SITE_PAGE_LANGUAGE, type SiteTranslateLangCode } from "@/lib/siteTranslateLocales";

const SCRIPT_ID = "google-translate-script";
const ELEMENT_ID = "google_translate_element";
const LOAD_TIMEOUT_MS = 12_000;

let loadPromise: Promise<void> | null = null;

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate?: {
        TranslateElement: {
          new (
            options: {
              pageLanguage: string;
              includedLanguages?: string;
              autoDisplay?: boolean;
              layout?: number;
            },
            elementId: string,
          ): void;
          InlineLayout: { SIMPLE: number; HORIZONTAL: number; VERTICAL: number };
        };
      };
    };
  }
}

function readGoogTransTarget(): SiteTranslateLangCode | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)googtrans=([^;]+)/);
  if (!match?.[1]) return null;
  const parts = decodeURIComponent(match[1]).split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const target = parts[parts.length - 1];
  return target && target !== SITE_PAGE_LANGUAGE ? target : null;
}

export function currentGoogleTranslateTarget(): SiteTranslateLangCode | null {
  return readGoogTransTarget();
}

export function isGoogleTranslateActive(): boolean {
  return currentGoogleTranslateTarget() != null;
}

function setGoogTransCookie(targetLang: SiteTranslateLangCode | null): void {
  const host = window.location.hostname;
  const value = targetLang ? `/${SITE_PAGE_LANGUAGE}/${targetLang}` : "";
  const expire = targetLang ? "" : ";expires=Thu, 01 Jan 1970 00:00:00 GMT";
  document.cookie = `googtrans=${value};path=/${expire}`;
  if (host !== "localhost" && host !== "127.0.0.1") {
    document.cookie = `googtrans=${value};path=/;domain=${host}${expire}`;
    const parts = host.split(".");
    if (parts.length >= 2) {
      document.cookie = `googtrans=${value};path=/;domain=.${parts.slice(-2).join(".")}${expire}`;
    }
  }
}

function waitForTranslateCombo(timeoutMs: number): Promise<HTMLSelectElement | null> {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      const combo = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
      if (combo) {
        resolve(combo);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        resolve(null);
        return;
      }
      window.setTimeout(tick, 80);
    };
    tick();
  });
}

export function ensureGoogleTranslateElement(): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      fn();
    };

    const timeoutId = window.setTimeout(
      () => finish(() => reject(new Error("Google Translate init timeout"))),
      LOAD_TIMEOUT_MS,
    );

    if (document.getElementById(ELEMENT_ID) == null) {
      const mount = document.createElement("div");
      mount.id = ELEMENT_ID;
      mount.className = "site-google-translate-mount";
      mount.setAttribute("aria-hidden", "true");
      document.body.appendChild(mount);
    }

    window.googleTranslateElementInit = () => {
      try {
        const layout = window.google?.translate?.TranslateElement.InlineLayout.SIMPLE ?? 0;
        new window.google!.translate!.TranslateElement(
          {
            pageLanguage: SITE_PAGE_LANGUAGE,
            includedLanguages: googleTranslateIncludedLanguages(),
            autoDisplay: false,
            layout,
          },
          ELEMENT_ID,
        );
        finish(resolve);
      } catch (err) {
        finish(() => reject(err instanceof Error ? err : new Error(String(err))));
      }
    };

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (window.google?.translate?.TranslateElement) {
        window.googleTranslateElementInit?.();
        return;
      }
      existing.addEventListener("load", () => window.googleTranslateElementInit?.(), { once: true });
      existing.addEventListener("error", () => finish(() => reject(new Error("Google Translate script failed"))), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    script.onerror = () => finish(() => reject(new Error("Google Translate script failed")));
    document.head.appendChild(script);
  }).catch((err) => {
    loadPromise = null;
    throw err;
  });

  return loadPromise;
}

export async function applyGoogleTranslate(targetLang: SiteTranslateLangCode | null): Promise<void> {
  if (typeof window === "undefined") return;

  if (!targetLang || targetLang === SITE_PAGE_LANGUAGE) {
    setGoogTransCookie(null);
    window.location.reload();
    return;
  }

  setGoogTransCookie(targetLang);
  try {
    await ensureGoogleTranslateElement();
    const combo = await waitForTranslateCombo(4_000);
    if (combo) {
      combo.value = targetLang;
      combo.dispatchEvent(new Event("change"));
      return;
    }
  } catch {
    /* cookie already set — reload fallback */
  }
  window.location.reload();
}
