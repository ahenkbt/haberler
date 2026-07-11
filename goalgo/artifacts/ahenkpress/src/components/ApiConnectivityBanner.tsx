import { useEffect, useState, type ReactElement } from "react";
import { apiUrl } from "@/lib/apiBase";
import { isDefaultPortalHost } from "@/lib/hmPortalHosts";

const PROBE_PATHS = ["/api/healthz/live", "/api/healthz"] as const;
const PROBE_ATTEMPTS = 3;
const PROBE_TIMEOUT_MS = 12_000;
const PROBE_GAP_MS = 2_000;

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const tid = window.setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(tid);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

async function probeOnce(signal: AbortSignal): Promise<"ok" | "limited" | "down"> {
  const ctrl = new AbortController();
  const onParentAbort = () => ctrl.abort();
  signal.addEventListener("abort", onParentAbort, { once: true });
  const tid = window.setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);

  try {
    for (const path of PROBE_PATHS) {
      if (signal.aborted) return "down";
      try {
        const r = await fetch(apiUrl(path), { signal: ctrl.signal, cache: "no-store" });
        if (r.status === 429) return "limited";
        if (r.ok) return "ok";
        if (path === "/api/healthz/live" && r.status === 404) continue;
        if (r.status >= 500) return "down";
      } catch {
        if (path === "/api/healthz/live") continue;
      }
    }
    return "down";
  } finally {
    window.clearTimeout(tid);
    signal.removeEventListener("abort", onParentAbort);
  }
}

async function probeApiReachable(signal: AbortSignal): Promise<"ok" | "limited" | "down"> {
  for (let attempt = 0; attempt < PROBE_ATTEMPTS; attempt++) {
    if (signal.aborted) return "down";
    const result = await probeOnce(signal);
    if (result === "ok") return "ok";
    if (result === "limited") return "limited";
    if (attempt < PROBE_ATTEMPTS - 1) {
      try {
        await sleep(PROBE_GAP_MS, signal);
      } catch {
        return "down";
      }
    }
  }
  return "down";
}

/**
 * Portal kökünde API vekili yanıt vermiyorsa kısa uyarı. HM özel alanlarda gösterilmez.
 */
const RECOVERY_REPROBE_MS = 20_000;

export function ApiConnectivityBanner(): ReactElement | null {
  const [status, setStatus] = useState<null | "down" | "limited">(null);

  useEffect(() => {
    const h = typeof window !== "undefined" ? (window.location.hostname.toLowerCase().split(":")[0] ?? "") : "";
    if (!h || !isDefaultPortalHost(h)) return;

    const ctrl = new AbortController();

    void (async () => {
      const result = await probeApiReachable(ctrl.signal);
      if (result === "ok") return;
      setStatus(result);
      /* Soğuk başlangıç (Render vb.) sonrası sunucu uyandığında banner kendiliğinden kapansın. */
      while (!ctrl.signal.aborted) {
        try {
          await sleep(RECOVERY_REPROBE_MS, ctrl.signal);
        } catch {
          return;
        }
        const again = await probeApiReachable(ctrl.signal);
        if (again === "ok") {
          setStatus(null);
          return;
        }
        setStatus(again);
      }
    })();

    return () => ctrl.abort();
  }, []);

  if (!status) return null;

  return (
    <div
      role="alert"
      className="border-b border-red-800 bg-red-600 px-3 py-2.5 text-center text-sm font-semibold leading-snug text-white"
    >
      {status === "limited" ? (
        <>Sunucu geçici olarak meşgul. Birkaç dakika sonra sayfayı yenileyin.</>
      ) : (
        <>Sunucuya şu an ulaşılamıyor. Bir dakika bekleyip sayfayı yenileyin (Ctrl+Shift+R).</>
      )}
    </div>
  );
}
