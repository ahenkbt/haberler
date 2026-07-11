import type { Request } from "express";
import jwt from "jsonwebtoken";
import { getSessionSecret } from "./secrets.js";

const HM_EDITOR_JWT_TYP = "hm_editor";

function hmJwtSecret(): string {
  const s = String(process.env["HM_EDITOR_JWT_SECRET"] ?? "").trim();
  if (s) return s;
  return getSessionSecret();
}

export type HmEditorJwtContext = { editorId: number; siteId: number };

export function parseHmEditorFromRequest(req: Request): HmEditorJwtContext | null {
  const h = String(req.headers.authorization ?? "").trim();
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (!token) return null;
  try {
    const p = jwt.verify(token, hmJwtSecret()) as { typ?: string; eid?: number; sid?: number };
    if (p.typ !== HM_EDITOR_JWT_TYP || typeof p.eid !== "number" || typeof p.sid !== "number") return null;
    return { editorId: p.eid, siteId: p.sid };
  } catch {
    return null;
  }
}

/** HM editör JWT geçerliyse Yektube Studio / haberler panel erişimi (çerez olmadan iframe). */
export function hmEditorJwtGrantsHaberlerPanel(req: Request): boolean {
  return parseHmEditorFromRequest(req) != null;
}
