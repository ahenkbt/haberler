/**
 * HM haber siteleri PHP şablon bayrağı.
 * Panelde yeni site oluşturulunca layout_json'a yazılır; Worker / bekçi
 * host tanımayı static wrangler listesine ek olarak bu bayraktan okur.
 */

export const HM_PHP_THEME_FRONTEND = "php" as const;

/** layout_json phpTheme / frontend alanından PHP şablon mu? */
export function layoutMarksPhpTheme(layout: unknown): boolean {
  if (!layout || typeof layout !== "object" || Array.isArray(layout)) return false;
  const o = layout as Record<string, unknown>;
  if (o.phpTheme === false) return false;
  if (o.phpTheme === true) return true;
  const frontend = String(o.frontend ?? "")
    .trim()
    .toLowerCase();
  if (frontend === "spa" || frontend === "react" || frontend === "worker") return false;
  return frontend === HM_PHP_THEME_FRONTEND;
}

/**
 * Yeni site varsayılanı: PHP şablon.
 * Açık opt-out: phpTheme:false veya frontend spa/react/worker.
 */
export function ensurePhpThemeLayoutDefaults(layout: Record<string, unknown>): Record<string, unknown> {
  const frontendRaw = String(layout.frontend ?? "")
    .trim()
    .toLowerCase();
  const optOut =
    layout.phpTheme === false ||
    frontendRaw === "spa" ||
    frontendRaw === "react" ||
    frontendRaw === "worker";
  if (optOut) {
    return {
      ...layout,
      phpTheme: false,
      ...(frontendRaw ? { frontend: frontendRaw } : {}),
    };
  }
  return {
    ...layout,
    phpTheme: true,
    frontend:
      typeof layout.frontend === "string" && layout.frontend.trim()
        ? String(layout.frontend).trim()
        : HM_PHP_THEME_FRONTEND,
  };
}

/** domain / domain2 / domain3 normalleştirilmiş host listesi (www dahil). */
export function phpThemeHostCandidatesFromDomains(
  domain?: string | null,
  domain2?: string | null,
  domain3?: string | null,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of [domain, domain2, domain3]) {
    const h = String(raw || "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//i, "")
      .split("/")[0]
      ?.replace(/\.$/, "")
      .replace(/^www\./, "");
    if (!h || seen.has(h)) continue;
    seen.add(h);
    out.push(h);
  }
  return out;
}
