import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

function sha256Hex(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

/** Üretimde `OPERATOR_API_KEYS` env: `etiket1:hamanahtar1,etiket2:hamanahtar2` (virgülle). DB hash ile birleştirilecek fazda. */
export function verifyOperatorRequest(): RequestHandler {
  return (req, res, next) => {
    const envKeys = process.env["OPERATOR_API_KEYS"]?.trim();
    if (!envKeys) {
      if (process.env["NODE_ENV"] === "production") {
        res.status(503).json({ error: "OPERATOR_API_KEYS not configured" });
        return;
      }
      next();
      return;
    }
    const auth = String(req.headers.authorization ?? "");
    const m = auth.match(/^Bearer\s+(.+)$/i);
    const token = m?.[1]?.trim();
    if (!token) {
      res.status(401).json({ error: "missing_bearer" });
      return;
    }
    const tokenHash = sha256Hex(token);
    const pairs = envKeys.split(",").map((p) => p.trim()).filter(Boolean);
    let ok = false;
    for (const pair of pairs) {
      const idx = pair.indexOf(":");
      if (idx <= 0) continue;
      const secret = pair.slice(idx + 1).trim();
      if (!secret) continue;
      try {
        const a = Buffer.from(sha256Hex(secret), "hex");
        const b = Buffer.from(tokenHash, "hex");
        if (a.length === b.length && timingSafeEqual(a, b)) {
          ok = true;
          break;
        }
      } catch {
        /* ignore */
      }
    }
    if (!ok) {
      res.status(403).json({ error: "invalid_token" });
      return;
    }
    next();
  };
}

export function randomApiKey(): { full: string; prefix: string; hash: string } {
  const full = `hm_${randomBytes(24).toString("base64url")}`;
  const prefix = full.slice(0, 10);
  const hash = sha256Hex(full);
  return { full, prefix, hash };
}
