import crypto from "node:crypto";

/**
 * Worker kenar girişi → Render JWT köprüsü.
 * wrangler.toml [vars].HM_EDGE_BRIDGE_SECRET ile aynı fallback.
 */
export const HM_EDGE_BRIDGE_SECRET_FALLBACK = "yekpare-hm-kh-bridge-20260727-v1";

export function getHmEdgeBridgeSecret(): string {
  const s = String(process.env["HM_EDGE_BRIDGE_SECRET"] ?? "").trim();
  return s || HM_EDGE_BRIDGE_SECRET_FALLBACK;
}

export type HmEdgeSessionBridgePayload = {
  email?: string;
  passwordHash?: string;
  displayName?: string | null;
  username?: string | null;
  siteSlug?: string;
  siteDomain?: string;
  exp?: number;
  nonce?: string;
};

const KH_SLUGS = new Set(["kh", "kirsehir"]);
const KH_HOSTS = new Set(["kirsehirhaber.org", "kirsehri.com", "kirsehir.net"]);

function normalizeHost(raw: string | null | undefined): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    ?.split(":")[0]
    ?.replace(/^www\./, "")
    ?.replace(/\.$/, "") ?? "";
}

function normalizeSlug(raw: string | null | undefined): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
}

export function isKhBridgeTarget(siteSlug: string, siteDomain: string): boolean {
  const slug = normalizeSlug(siteSlug);
  const host = normalizeHost(siteDomain);
  return KH_SLUGS.has(slug) || KH_HOSTS.has(host);
}

/** İmza için sabit alan sırası (Express JSON parse sıra değiştirse bile). */
export function hmEdgeBridgeCanonical(payload: HmEdgeSessionBridgePayload): string {
  const email = String(payload.email ?? "")
    .trim()
    .toLowerCase();
  const siteSlug = String(payload.siteSlug ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
  const siteDomain = normalizeHost(String(payload.siteDomain ?? ""));
  const exp = String(Number(payload.exp) || 0);
  const nonce = String(payload.nonce ?? "");
  const passwordHash = String(payload.passwordHash ?? "");
  return [email, siteSlug, siteDomain, exp, nonce, passwordHash].join("\n");
}

export function verifyHmEdgeBridgeSignature(
  payload: HmEdgeSessionBridgePayload,
  signatureRaw: string,
): boolean {
  const sig = String(signatureRaw ?? "").trim();
  if (!sig || !payload) return false;
  const secret = getHmEdgeBridgeSecret();
  const expected = crypto
    .createHmac("sha256", secret)
    .update(hmEdgeBridgeCanonical(payload), "utf8")
    .digest("base64url");
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
