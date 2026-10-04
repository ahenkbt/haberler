import { toHmInternalTrPath } from "@/lib/hmCustomDomainCleanPath";
import { resolveKnownHmEditorSlug } from "@/lib/hmEditorDomains";
import { isDefaultPortalHost } from "@/lib/hmPortalHosts";
import { isTurkataHaberHost } from "@/lib/turkataHaber";

/**
 * Portal haber detayı (SixAmMart) — ahenk.net.tr ve turkatahaber.com.
 * Diğer kök HM alanları editör vitrinini kullanır.
 */
export function usesPortalHybridNewsDetail(host: string | null | undefined): boolean {
  const h = String(host ?? "")
    .trim()
    .toLowerCase()
    .split(":")[0] ?? "";
  if (!h) return true;
  if (isDefaultPortalHost(h)) return true;
  if (isTurkataHaberHost(h)) return true;
  return false;
}

/**
 * Kök modda tarayıcı yolu → wouter iç yolu.
 * ASG / Kırşehir Haber: `/haber|kategori|yazar|makale|video|özel sayfa` → `/tr/{slug}/...`
 * ahenk.net.tr ve turkatahaber.com aynı adreste kalır (`/haberler` öneki eklenmez, `/tr` eklenmez).
 */
export function resolveRootModeWouterPath(
  host: string | null | undefined,
  pathWithQuery: string,
  siteSlug?: string | null,
): string {
  const raw = String(pathWithQuery ?? "").trim() || "/";
  const normalized = raw.startsWith("/") ? raw : `/${raw}`;
  if (usesPortalHybridNewsDetail(host)) return normalized;
  const slug =
    String(siteSlug ?? "").trim() ||
    resolveKnownHmEditorSlug(String(host ?? "")) ||
    "";
  if (!slug) return normalized;
  return toHmInternalTrPath(normalized, slug) ?? normalized;
}
