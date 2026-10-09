import { useEffect, useState } from "react";
import AhenkAgencyYazilimDetail from "./AhenkAgencyYazilimDetail";

/**
 * hsy-landing 2026-10-09: /haber-sitesi-yazilimi (ve arama yolları) Worker'da sunucu tarafında üretilir.
 * SPA içi tıklamayla gelinirse tam sayfa yükle; Worker yanıt vermezse döngüye girmeden eski karta düş.
 */
export const AHENK_HSY_SPA_PATHS = [
  "/haber-sitesi-yazilimi",
  "/haber-sitesi",
  "/haber-scripti",
  "/haber-yazilimi",
  "/haber-portali",
  "/yazilim/haber-medya-sitesi",
];

const FLAG = "ahenk-hsy-hardnav";

export default function AhenkHsyHardNav() {
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    try {
      const last = Number(sessionStorage.getItem(FLAG) || "0");
      if (Date.now() - last < 15000) {
        setFallback(true);
        return;
      }
      sessionStorage.setItem(FLAG, String(Date.now()));
    } catch {
      /* storage yok: yine de bir kez dene */
    }
    window.location.replace("/haber-sitesi-yazilimi" + window.location.hash);
  }, []);
  return fallback ? <AhenkAgencyYazilimDetail /> : null;
}
