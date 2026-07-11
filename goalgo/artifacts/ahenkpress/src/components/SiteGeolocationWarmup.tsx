import { useEffect } from "react";
import { useLocation } from "wouter";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { effectiveMapsGeocodeSettings } from "@/lib/mapsGeocode";
import { shouldSkipSiteGeolocationWarmup } from "@/lib/hmSitePublicPath";
import { readPublicLocation, requestPublicLocation } from "@/lib/publicLocation";
import { GEO_PROMPT_ASKED_KEY } from "./AppEntryLocationPrompt";

const WARMUP_ONCE_KEY = "yekpare_geo_warmup_once_v1";

/**
 * AppEntryLocationPrompt reddedildikten sonra sessiz tek deneme (izin zaten verilmişse).
 * İlk ziyarette modal önceliklidir; burada otomatik izin istenmez.
 */
export function SiteGeolocationWarmup() {
  const [location] = useLocation();
  const { data: settings } = useGetSiteSettings();
  const pathNoQuery = (location.split("?")[0] ?? "").trim();
  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";

  useEffect(() => {
    if (shouldSkipSiteGeolocationWarmup(pathNoQuery, host)) return;
    if (typeof window === "undefined" || !("geolocation" in navigator)) return;
    try {
      if (readPublicLocation() || localStorage.getItem(WARMUP_ONCE_KEY)) return;
      if (!localStorage.getItem(GEO_PROMPT_ASKED_KEY)) return;
    } catch {
      return;
    }
    const timer = window.setTimeout(() => {
      void requestPublicLocation(effectiveMapsGeocodeSettings(settings ?? null), {
        enableHighAccuracy: false,
        maximumAge: 120_000,
        timeout: 10_000,
      })
        .then(() => {
          try {
            localStorage.setItem(WARMUP_ONCE_KEY, "1");
          } catch {
            /* ignore */
          }
        })
        .catch(() => {
          try {
            localStorage.setItem(WARMUP_ONCE_KEY, "1");
          } catch {
            /* ignore */
          }
        });
    }, 2400);
    return () => clearTimeout(timer);
  }, [pathNoQuery, host, settings]);
  return null;
}
