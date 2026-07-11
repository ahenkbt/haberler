import { ytMainRoute } from "@/lib/routes";
import { appendQueryParam } from "@/lib/runtimeConfig";
import { isAdminEmbedLight } from "./adminEmbedTheme";

/** Yektube Studio rota — yekpare.net/yp/admin, yektube.com/yp/admin, /yektube-v2/admin */
export function adminRoute(suffix = ""): string {
  const path = ytMainRoute(`/admin${suffix}`);
  return isAdminEmbedLight() ? appendQueryParam(path, "embed", "1") : path;
}

const ADMIN_SUFFIX_TITLES: Record<string, string> = {
  "": "Panel",
  "/yektube": "Yektube İçerik",
  "/kaynaklar": "Kaynaklar",
  "/canli-yayinlar": "Canlı Yayınlar",
  "/kaziyici": "Sosyal medya kazıyıcı",
  "/videolar": "Videolar",
  "/hazir-kanallar": "Hazır kanallar",
  "/muzik": "Müzik Yönetimi",
  "/cocuk": "Çocuk Yönetimi",
  "/editorler": "Editörler",
  "/sayfalar": "Sayfalar",
  "/moduller": "Modüller",
  "/araclar": "Araçlar",
  "/ayarlar": "Ayarlar",
};

export function adminPageTitle(path: string): string {
  const clean = path.replace(/\/$/, "") || "/";
  const match = clean.match(/\/admin(\/.*|$)/);
  const suffix = match ? match[1] || "" : "";
  return ADMIN_SUFFIX_TITLES[suffix] ?? "Yektube Studio";
}
