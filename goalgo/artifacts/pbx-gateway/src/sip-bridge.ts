/**
 * SIP Bridge — bağımsız sinyalizasyon katmanı.
 * Faz 1: demo mod + WebSocket softphone sinyali
 * Faz 2: sip.js / drachtio ile gerçek trunk kaydı
 */

import { WebSocket } from "ws";
import type { IncomingMessage } from "node:http";
import { config, isSipBridgeConfigured } from "./config.js";

export type BridgeSession = {
  id: string;
  agentId: string;
  extension: string;
  ws: WebSocket;
  connectedAt: string;
};

const sessions = new Map<string, BridgeSession>();

export function sipBridgeStatus(): {
  demoMode: boolean;
  trunkConfigured: boolean;
  activeSessions: number;
  wsPath: string;
} {
  return {
    demoMode: config.demoMode,
    trunkConfigured: isSipBridgeConfigured(),
    activeSessions: sessions.size,
    wsPath: config.wsPath,
  };
}

export function attachSipBridgeWebSocket(ws: WebSocket, req: IncomingMessage): void {
  const url = new URL(req.url ?? "/", "http://localhost");
  const agentId = url.searchParams.get("agentId") ?? "demo";
  const extension = url.searchParams.get("extension") ?? "100";
  const sessionId = crypto.randomUUID();

  const session: BridgeSession = {
    id: sessionId,
    agentId,
    extension,
    ws,
    connectedAt: new Date().toISOString(),
  };
  sessions.set(sessionId, session);

  ws.send(
    JSON.stringify({
      type: "registered",
      sessionId,
      demoMode: config.demoMode,
      trunkConfigured: isSipBridgeConfigured(),
      extension,
      message: config.demoMode
        ? "Demo SIP köprüsü — gerçek ses Faz 2"
        : "SIP köprüsü bağlı",
    }),
  );

  ws.on("message", (raw) => {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(String(raw)) as Record<string, unknown>;
    } catch {
      ws.send(JSON.stringify({ type: "error", error: "Geçersiz JSON" }));
      return;
    }
    handleBridgeMessage(session, msg, ws);
  });

  ws.on("close", () => {
    sessions.delete(sessionId);
  });
}

function handleBridgeMessage(session: BridgeSession, msg: Record<string, unknown>, ws: WebSocket): void {
  const type = String(msg.type ?? "");
  switch (type) {
    case "ping":
      ws.send(JSON.stringify({ type: "pong", ts: new Date().toISOString() }));
      break;
    case "dial": {
      const phone = String(msg.phone ?? "");
      if (!phone) {
        ws.send(JSON.stringify({ type: "error", error: "phone zorunlu" }));
        return;
      }
      if (config.demoMode || !isSipBridgeConfigured()) {
        ws.send(
          JSON.stringify({
            type: "call_progress",
            state: "ringing",
            phone,
            demoMode: true,
          }),
        );
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "call_answered", phone, demoMode: true }));
          }
        }, 1500);
        return;
      }
      ws.send(JSON.stringify({ type: "error", error: "Gerçek SIP araması henüz etkin değil (Faz 2)." }));
      break;
    }
    case "hangup":
      ws.send(JSON.stringify({ type: "call_ended", demoMode: config.demoMode }));
      break;
    default:
      ws.send(JSON.stringify({ type: "error", error: `Bilinmeyen mesaj: ${type}` }));
  }
}

export function listBridgeSessions(): Omit<BridgeSession, "ws">[] {
  return [...sessions.values()].map(({ ws: _, ...rest }) => rest);
}
