/**
 * Yekpare AI yüzen sohbet — görünürlük ve yerleşim kuralları.
 *
 * - home-inline: anasayfa/demo — hero içinde inline panel (FAB toggle)
 * - fab-dock: /ara — FAB ile sol alt dock
 * - dock: servis modülleri (yemek, keşfet, haritalar vb.)
 */

export type YekpareAiLayout = "home-inline" | "fab-dock" | "dock";

const HOME_INLINE_EXACT = new Set(["/", "/home", "/demo"]);
const FAB_DOCK_EXACT = new Set(["/ara"]);

const SERVICE_DOCK_PREFIXES = [
  "/siparis",
  "/yemek",
  "/market",
  "/isletmeler",
  "/turizm",
  "/otomotiv",
  "/haritalar",
  "/kesfet",
  "/ulasim",
  "/magaza",
  "/habermerkezi",
  "/haberler",
  "/yektube",
  "/bilgiagaci",
  "/firma-rehberi",
  "/ai-cagri-merkezi",
  "/destek",
  "/siparis-takip",
  "/siparislerim",
] as const;

const HIDDEN_PREFIXES = [
  "/admin",
  "/editor",
  "/pbx",
  "/map",
  "/haritalar/tam-ekran",
  "/servis-saglayici-paneli",
  "/turizm-paneli",
  "/ulasim-paneli",
  "/isletme-paneli",
  "/firma-rehberi-paneli",
  "/surucu-paneli",
  "/kurye-paneli",
  "/kasiyer",
  "/siparis/qr-menu/",
] as const;

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function isHiddenPath(pathNoQuery: string): boolean {
  for (const prefix of HIDDEN_PREFIXES) {
    if (matchesPrefix(pathNoQuery, prefix)) return true;
  }
  return false;
}

export function getYekpareAiLayout(pathNoQuery: string): YekpareAiLayout | null {
  const p = (pathNoQuery || "/").trim();
  if (isHiddenPath(p)) return null;
  if (HOME_INLINE_EXACT.has(p)) return "home-inline";
  if (FAB_DOCK_EXACT.has(p)) return "fab-dock";
  for (const prefix of SERVICE_DOCK_PREFIXES) {
    if (matchesPrefix(p, prefix)) return "dock";
  }
  return null;
}

export function isYekpareAiRoute(pathNoQuery: string): boolean {
  return getYekpareAiLayout(pathNoQuery) !== null;
}

export function isYekpareAiCenterModal(_pathNoQuery: string): boolean {
  return false;
}

export function isYekpareAiDock(pathNoQuery: string): boolean {
  const layout = getYekpareAiLayout(pathNoQuery);
  return layout === "dock" || layout === "fab-dock";
}

export function shouldShowYekpareAi(pathNoQuery: string): boolean {
  return getYekpareAiLayout(pathNoQuery) !== null;
}

export function isYekpareAiFabNavigate(_pathNoQuery: string): boolean {
  return false;
}

export function isYekpareAiHomeInline(pathNoQuery: string): boolean {
  return getYekpareAiLayout(pathNoQuery) === "home-inline";
}
