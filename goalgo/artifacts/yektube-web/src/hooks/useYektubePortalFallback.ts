import { useEffect } from "react";
import {
  isYektubeDedicatedHost,
  isYektubePortalSurfaceHost,
  yektubePortalMirrorUrl,
} from "@workspace/yektube-core";

const MIRROR_FLAG = "yektube-mirror-active";

async function isApiHealthy(): Promise<boolean> {
  try {
    const r = await fetch("/api/healthz", {
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
    });
    if (!r.ok) return false;
    if (r.headers.get("x-yekpare-api-degraded") === "1") return false;
    const data = (await r.json()) as { status?: string };
    return data.status === "ok";
  } catch {
    return false;
  }
}

function cancelEarlyMirrorTimer() {
  const w = window as Window & { __YEKTUBE_CANCEL_MIRROR__?: () => void };
  w.__YEKTUBE_CANCEL_MIRROR__?.();
}

/** yektube.com ayakta değilse aynı yolu yekpare.net üzerinde aç */
export function useYektubePortalFallback() {
  useEffect(() => {
    const { hostname } = window.location;
    if (!isYektubeDedicatedHost(hostname)) return;
    if (isYektubePortalSurfaceHost(hostname)) return;
    if (sessionStorage.getItem(MIRROR_FLAG) === "1") return;

    let cancelled = false;

    void (async () => {
      for (let i = 0; i < 4; i++) {
        if (cancelled) return;
        if (await isApiHealthy()) {
          cancelEarlyMirrorTimer();
          return;
        }
        if (i < 3) await new Promise((r) => setTimeout(r, 2500 * (i + 1)));
      }
      if (cancelled) return;
      sessionStorage.setItem(MIRROR_FLAG, "1");
      window.location.replace(yektubePortalMirrorUrl());
    })();

    return () => {
      cancelled = true;
    };
  }, []);
}

export function markYektubeAppReady() {
  cancelEarlyMirrorTimer();
  sessionStorage.removeItem(MIRROR_FLAG);
}
