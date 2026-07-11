import jwt from "jsonwebtoken";
import { getPbxJwtSecret } from "../secrets.js";
import type { PbxAgent, PbxAgentStatus } from "./types.js";

export function pbxJwtSecret(): string {
  return getPbxJwtSecret();
}

export type PbxAgentJwtPayload = {
  sub: string;
  username: string;
  role: "pbx_agent";
};

export function signPbxAgentToken(agent: Pick<PbxAgent, "id" | "username">): string {
  const payload: PbxAgentJwtPayload = {
    sub: agent.id,
    username: agent.username,
    role: "pbx_agent",
  };
  return jwt.sign(payload, pbxJwtSecret(), { expiresIn: "12h" });
}

export function verifyPbxAgentToken(token: string): PbxAgentJwtPayload | null {
  try {
    const decoded = jwt.verify(token, pbxJwtSecret()) as PbxAgentJwtPayload;
    if (decoded.role !== "pbx_agent" || !decoded.sub) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function extractPbxAgentBearer(req: { headers: Record<string, unknown> }): string | null {
  const raw = String(req.headers.authorization ?? req.headers.Authorization ?? "").trim();
  if (!raw.toLowerCase().startsWith("bearer ")) return null;
  return raw.slice(7).trim() || null;
}

export function agentStatusLabelTr(status: PbxAgentStatus): string {
  const labels: Record<PbxAgentStatus, string> = {
    offline: "Çevrimdışı",
    available: "Çağrı Bekliyor",
    on_call: "Aktif Çağrıda",
    wrap_up: "Sonuçlandırma",
    break: "Molada",
    paused: "Çağrı Alımı Kapalı",
  };
  return labels[status] ?? status;
}

export function campaignTypeLabelTr(type: string): string {
  if (type === "auto_dial") return "Otomatik Arama";
  return "Manuel Arama";
}
