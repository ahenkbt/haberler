import crypto from "node:crypto";
import { getHmEdgeBridgeSecret } from "./hm-edge-session-bridge.js";

/** Worker kenar editör → Render medya yükleme köprüsü (HM_EDGE_BRIDGE_SECRET). */
export type HmEdgeMediaBridgePayload = {
  email?: string;
  siteId?: number;
  siteSlug?: string;
  exp?: number;
  nonce?: string;
  dataUrlSha256?: string;
  dataUrl?: string;
  title?: string;
};

export function hmEdgeMediaBridgeCanonical(payload: HmEdgeMediaBridgePayload): string {
  const email = String(payload.email ?? "")
    .trim()
    .toLowerCase();
  const siteId = String(Number(payload.siteId) || 0);
  const siteSlug = String(payload.siteSlug ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
  const exp = String(Number(payload.exp) || 0);
  const nonce = String(payload.nonce ?? "");
  const dataUrlSha256 = String(payload.dataUrlSha256 ?? "")
    .trim()
    .toLowerCase();
  return [email, siteId, siteSlug, exp, nonce, dataUrlSha256].join("\n");
}

export function sha256Hex(raw: string): string {
  return crypto.createHash("sha256").update(raw, "utf8").digest("hex");
}

export function verifyHmEdgeMediaBridgeSignature(
  payload: HmEdgeMediaBridgePayload,
  signatureRaw: string,
): boolean {
  const sig = String(signatureRaw ?? "").trim();
  if (!sig || !payload) return false;
  const secret = getHmEdgeBridgeSecret();
  const expected = crypto
    .createHmac("sha256", secret)
    .update(hmEdgeMediaBridgeCanonical(payload), "utf8")
    .digest("base64url");
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
