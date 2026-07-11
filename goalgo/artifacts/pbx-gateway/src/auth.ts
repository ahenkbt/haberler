import jwt from "jsonwebtoken";
import type { PbxAgentSession } from "./pbx-types";

export type PbxJwtPayload = PbxAgentSession & {
  sub: string;
  iat?: number;
  exp?: number;
};

export function pbxJwtSecret(): string {
  const secret = String(process.env.PBX_JWT_SECRET ?? process.env.SESSION_SECRET ?? "").trim();
  if (secret.length >= 16) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("PBX_JWT_SECRET (min 16 karakter) üretimde zorunludur.");
  }
  return "dev-pbx-jwt-secret-local";
}

export function signPbxToken(session: PbxAgentSession, ttlSec = 12 * 3600): string {
  return jwt.sign(
    {
      sub: session.username,
      username: session.username,
      displayName: session.displayName,
      extension: session.extension,
    },
    pbxJwtSecret(),
    { expiresIn: ttlSec },
  );
}

export function verifyPbxToken(token: string): PbxJwtPayload | null {
  try {
    const payload = jwt.verify(token, pbxJwtSecret()) as PbxJwtPayload;
    if (!payload?.username) return null;
    return payload;
  } catch {
    return null;
  }
}

export function bearerToken(req: { headers?: { authorization?: string } }): string | null {
  const hdr = String(req.headers?.authorization ?? "").trim();
  const m = /^Bearer\s+(.+)$/i.exec(hdr);
  return m?.[1]?.trim() || null;
}
