/** GSC/Bing/Yandex alanlarına yapıştırılan ham HTML meta veya content değerini ayıklar. */

function cleanContent(raw: string, max = 500): string {
  return raw
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function parseVerificationFieldInput(raw: unknown, metaName: string): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";

  const escaped = metaName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const metaRe1 = new RegExp(`<meta\\s+[^>]*name=["']${escaped}["'][^>]*content=["']([^"']+)["']`, "i");
  const metaRe2 = new RegExp(`<meta\\s+[^>]*content=["']([^"']+)["'][^>]*name=["']${escaped}["']`, "i");
  const match = s.match(metaRe1) || s.match(metaRe2);
  if (match?.[1]) return cleanContent(match[1]);

  if (metaName === "google-site-verification") {
    const fileLine = s.match(/google-site-verification:\s*(google[a-z0-9]+\.html)/i);
    if (fileLine?.[1]) return fileLine[1];
    if (/^google[a-z0-9]+\.html$/i.test(s)) return s;
  }

  return cleanContent(s);
}

export function parseCustomMetaLineInput(line: string): { name: string; content: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const metaMatch =
    trimmed.match(/<meta\s+[^>]*name=["']([^"']+)["'][^>]*content=["']([^"']+)["']/i) ||
    trimmed.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*name=["']([^"']+)["']/i);
  if (metaMatch) {
    const name = (metaMatch[1]?.includes("=") ? metaMatch[2] : metaMatch[1])?.trim() ?? "";
    const content = (metaMatch[1]?.includes("=") ? metaMatch[1] : metaMatch[2])?.trim() ?? "";
    if (!/^[a-zA-Z0-9._:-]{1,80}$/.test(name) || !content) return null;
    return { name, content: cleanContent(content) };
  }

  const idx = trimmed.indexOf("=");
  if (idx <= 0) return null;
  const name = trimmed.slice(0, idx).trim();
  const content = trimmed.slice(idx + 1).trim();
  if (!/^[a-zA-Z0-9._:-]{1,80}$/.test(name) || !content) return null;
  return { name, content: cleanContent(content) };
}

export function parseCustomMetaLinesInput(raw: string): { name: string; content: string }[] {
  return raw
    .split(/\r?\n/)
    .map(parseCustomMetaLineInput)
    .filter((item): item is { name: string; content: string } => item != null)
    .slice(0, 10);
}

export type PortalHostVerificationRow = {
  host: string;
  googleSiteVerification?: string;
};

export function normalizeHostKey(host: string): string {
  return host.trim().toLowerCase().replace(/^www\./, "").split(":")[0]?.trim() ?? "";
}

export function normalizeSeoVerificationFormInput(input: {
  googleSiteVerification?: string;
  bingSiteVerification?: string;
  yandexVerification?: string;
  customMetaTagLines?: string;
  portalHostVerifications?: PortalHostVerificationRow[];
}): {
  googleSiteVerification?: string;
  bingSiteVerification?: string;
  yandexVerification?: string;
  customMetaTags?: { name: string; content: string }[];
  byHost?: Record<string, { googleSiteVerification?: string; bingSiteVerification?: string; yandexVerification?: string }>;
} {
  const google = parseVerificationFieldInput(input.googleSiteVerification, "google-site-verification");
  const bing = parseVerificationFieldInput(input.bingSiteVerification, "msvalidate.01");
  const yandex = parseVerificationFieldInput(input.yandexVerification, "yandex-verification");
  const customMetaTags = parseCustomMetaLinesInput(input.customMetaTagLines ?? "");

  const byHost: Record<string, { googleSiteVerification?: string; bingSiteVerification?: string; yandexVerification?: string }> = {};
  for (const row of input.portalHostVerifications ?? []) {
    const host = normalizeHostKey(row.host);
    if (!host) continue;
    const g = parseVerificationFieldInput(row.googleSiteVerification, "google-site-verification");
    if (g) byHost[host] = { ...(byHost[host] ?? {}), googleSiteVerification: g };
  }

  return {
    googleSiteVerification: google || undefined,
    bingSiteVerification: bing || undefined,
    yandexVerification: yandex || undefined,
    customMetaTags: customMetaTags.length ? customMetaTags : undefined,
    byHost: Object.keys(byHost).length ? byHost : undefined,
  };
}

export function parsePortalHostVerificationsFromStore(
  store: { byHost?: Record<string, { googleSiteVerification?: string }> } | null | undefined,
): PortalHostVerificationRow[] {
  if (!store?.byHost) return [];
  return Object.entries(store.byHost).map(([host, v]) => ({
    host,
    googleSiteVerification: v.googleSiteVerification ?? "",
  }));
}
