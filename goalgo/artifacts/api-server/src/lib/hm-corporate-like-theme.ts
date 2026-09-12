/** Kurumsal vitrin ailesi: `corporate` / `kurumsal` ve VKD hatıra teması `vatan`. Haber/esen değil. */

export function normalizeHmVitrinThemeId(theme: unknown): string {
  return String(theme ?? "")
    .trim()
    .toLowerCase();
}

export function isHmCorporateLikeTheme(theme: unknown): boolean {
  const t = normalizeHmVitrinThemeId(theme);
  return t === "corporate" || t === "kurumsal" || t === "vatan";
}

/** Yeni site varsayılanı: Vatan’ı haber/esen’e düşürme; kurumsal kimliği koru. */
export function resolveDefaultHmNewsSiteLayoutTheme(incomingTheme: unknown): "vatan" | "corporate" | "esen" {
  const t = normalizeHmVitrinThemeId(incomingTheme);
  if (t === "vatan") return "vatan";
  if (t === "corporate" || t === "kurumsal") return "corporate";
  return "esen";
}

export function isHmNewsFallbackVitrinTheme(theme: unknown): boolean {
  const t = normalizeHmVitrinThemeId(theme);
  return t === "news" || t === "haber" || t === "default" || t === "esen" || t === "esenhaber" || t === "esen-home";
}
