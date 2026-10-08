/**
 * Worker ↔ API container bridge secret (HMAC key for edge login / media / mirror bridges).
 * Lives ONLY in the Worker secret `HM_EDGE_BRIDGE_KEY` (wrangler secret put). It is no longer in
 * wrangler.toml [vars] and there is no hard-coded fallback: when missing, every bridge fails closed.
 * The container receives it as process.env.HM_EDGE_BRIDGE_SECRET (see container-env.js).
 */
export function hmEdgeBridgeSecret(env) {
  return String(env?.HM_EDGE_BRIDGE_KEY || "").trim();
}
