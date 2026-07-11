/** Yektube özel alan — API CORS / köken kontrolü */

export const YEKTUBE_HOST = "yektube.com";

export function normalizeYektubeHostKey(host: string | null | undefined): string {
  return (
    String(host ?? "")
      .trim()
      .toLowerCase()
      .replace(/^www\./, "")
      .split(":")[0]
      ?.trim() ?? ""
  );
}

function parseExtraYektubeHosts(): string[] {
  return String(process.env.YEKTUBE_DEDICATED_HOSTS ?? process.env.VITE_YEKTUBE_DEDICATED_HOSTS ?? "")
    .split(",")
    .map((s) => normalizeYektubeHostKey(s))
    .filter(Boolean);
}

export function listYektubeDedicatedHostKeys(): string[] {
  const set = new Set<string>([normalizeYektubeHostKey(YEKTUBE_HOST), ...parseExtraYektubeHosts()]);
  return Array.from(set).filter(Boolean);
}

export function yektubeDedicatedCorsOrigins(): string[] {
  return listYektubeDedicatedHostKeys().flatMap((h) => [
    `https://${h}`,
    `https://www.${h}`,
  ]);
}
