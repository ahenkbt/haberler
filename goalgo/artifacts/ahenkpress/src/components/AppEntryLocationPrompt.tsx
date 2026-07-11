import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { LocateFixed, MapPin, X } from "lucide-react";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { isDefaultPortalHost } from "@/lib/hmPortalHosts";
import { shouldSkipSiteGeolocationWarmup } from "@/lib/hmSitePublicPath";
import { effectiveMapsGeocodeSettings } from "@/lib/mapsGeocode";
import {
  PUBLIC_LOCATION_UPDATED_EVENT,
  readPublicLocation,
  requestPublicLocation,
} from "@/lib/publicLocation";
import { SadeLocationPickerModal } from "./SadeLocationPickerModal";

export const GEO_PROMPT_ASKED_KEY = "yekpare_geo_prompt_asked_v1";

/**
 * Portal girişinde kayıtlı konum yoksa bir kez yumuşak modal gösterir.
 * Tarayıcı geolocation yalnızca kullanıcı «Konumumu kullan» dediğinde çağrılır.
 */
export function AppEntryLocationPrompt() {
  const [location] = useLocation();
  const { data: settings } = useGetSiteSettings();
  const pathNoQuery = (location.split("?")[0] ?? "").trim();
  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";

  const [showSoft, setShowSoft] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (shouldSkipSiteGeolocationWarmup(pathNoQuery, host)) return;
    if (!host || !isDefaultPortalHost(host)) return;
    if (typeof window === "undefined") return;
    if (readPublicLocation()) return;
    try {
      if (localStorage.getItem(GEO_PROMPT_ASKED_KEY)) return;
    } catch {
      return;
    }
    const timer = window.setTimeout(() => setShowSoft(true), 900);
    return () => window.clearTimeout(timer);
  }, [pathNoQuery, host]);

  useEffect(() => {
    const onSaved = () => {
      markAsked();
      setShowSoft(false);
      setPickerOpen(false);
    };
    window.addEventListener(PUBLIC_LOCATION_UPDATED_EVENT, onSaved);
    return () => window.removeEventListener(PUBLIC_LOCATION_UPDATED_EVENT, onSaved);
  }, []);

  function markAsked() {
    try {
      localStorage.setItem(GEO_PROMPT_ASKED_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  function dismissLater() {
    markAsked();
    setShowSoft(false);
  }

  async function useMyLocation() {
    setLocating(true);
    try {
      await requestPublicLocation(effectiveMapsGeocodeSettings(settings ?? null), {
        enableHighAccuracy: true,
        timeout: 12_000,
      });
      markAsked();
      setShowSoft(false);
    } catch {
      setPickerOpen(true);
    } finally {
      setLocating(false);
    }
  }

  if (!showSoft && !pickerOpen) return null;

  return (
    <>
      {showSoft ? (
        <div
          className="fixed inset-0 z-[11999] flex items-end justify-center p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-entry-location-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
            aria-label="Kapat"
            onClick={dismissLater}
          />
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-[#f7fbf8] px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-[#0f766e]">
                  <MapPin className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h2 id="app-entry-location-title" className="text-sm font-black text-slate-900">
                    Konumunuzu paylaşın
                  </h2>
                  <p className="text-[11px] font-semibold text-slate-500">
                    Yakın işletme ve teslimat önerileri için
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={dismissLater}
                className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
                aria-label="Sonra"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2.5 p-4">
              <p className="text-xs font-semibold leading-5 text-slate-600">
                Konumunuz yalnızca size yakın restoran, market ve hizmetleri göstermek için kullanılır. İstediğiniz
                zaman header&apos;dan değiştirebilirsiniz.
              </p>
              <button
                type="button"
                disabled={locating}
                onClick={() => void useMyLocation()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f766e] px-4 py-3 text-sm font-black text-white hover:bg-[#0b5f59] disabled:opacity-50"
                style={{ color: "#fff" }}
              >
                <LocateFixed className="h-4 w-4" />
                {locating ? "Konum alınıyor…" : "Konumumu kullan"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSoft(false);
                  setPickerOpen(true);
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-black text-[#0f766e] hover:bg-emerald-100"
              >
                Adres yazarak seç
              </button>
              <button
                type="button"
                onClick={dismissLater}
                className="w-full py-1 text-center text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                Sonra hatırlat
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <SadeLocationPickerModal
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          if (!readPublicLocation()) {
            setShowSoft(true);
          }
        }}
        mapsSettings={effectiveMapsGeocodeSettings(settings ?? null)}
      />
    </>
  );
}
