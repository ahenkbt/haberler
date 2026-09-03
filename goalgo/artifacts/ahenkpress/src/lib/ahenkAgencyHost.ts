/** ahenk.net.tr kurumsal ajans vitrini — Yekpare / HM / YekTube hostlarından ayrı. */

import { isAhenkKeywordPath } from "@/lib/ahenkAgencySeo";

const AHENK_AGENCY_HOSTS = new Set(["ahenk.net.tr", "www.ahenk.net.tr"]);

export function normalizeAhenkHost(host: string | null | undefined): string {
  return String(host ?? "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "")
    .split(":")[0] ?? "";
}

export function isAhenkAgencyHost(host?: string | null): boolean {
  const raw =
    host ??
    (typeof window !== "undefined" ? window.location.hostname : "");
  const h = String(raw ?? "")
    .trim()
    .toLowerCase()
    .split(":")[0] ?? "";
  if (!h) return false;
  if (AHENK_AGENCY_HOSTS.has(h)) return true;
  return normalizeAhenkHost(h) === "ahenk.net.tr";
}

/** Ajans vitrin public yolları (admin / editor / yektube / haberler hariç). */
export function isAhenkAgencyPublicPath(path: string): boolean {
  const p = (path.split("?")[0] ?? "").trim().toLowerCase() || "/";
  const n = p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;
  if (n === "/") return true;
  if (n === "/hizmetler" || n.startsWith("/hizmet/")) return true;
  if (n === "/hizmetlerimiz") return true;
  if (n.startsWith("/icerik/")) return true;
  if (n === "/yazilim" || n.startsWith("/yazilim/")) return true;
  if (n === "/ajans") return true;
  if (n === "/haber-merkezi" || n === "/habermerkezi") return true;
  if (n === "/yekpare") return true;
  if (isAhenkKeywordPath(n)) return true;
  if (n === "/hakkimizda" || n === "/about") return true;
  if (n === "/iletisim" || n === "/contact") return true;
  if (n === "/ucretsiz-haber-sitesi") return true;
  if (n === "/aiaddin") return true;
  if (n === "/cagri-merkezi-crm" || n === "/yapay-zeka-cagri-merkezi") return true;
  return false;
}

export function isAhenkAgencySurface(path?: string, host?: string | null): boolean {
  if (!isAhenkAgencyHost(host)) return false;
  if (path == null) {
    if (typeof window === "undefined") return false;
    path = window.location.pathname || "/";
  }
  return isAhenkAgencyPublicPath(path);
}
