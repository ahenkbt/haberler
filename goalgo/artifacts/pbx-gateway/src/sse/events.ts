import type { Response } from "express";
import { EventEmitter } from "node:events";
import { getLiveAgents, getLiveQueues } from "../ami/ami-client.js";
import { config, isAmiConfigured, isSipBridgeConfigured } from "../config.js";
import { store } from "../store/memory-store.js";

export const pbxEvents = new EventEmitter();

const sseClients = new Set<Response>();

let amiConnectedFlag = false;

export function setAmiConnected(v: boolean): void {
  amiConnectedFlag = v;
}

export function getAmiConnected(): boolean {
  return amiConnectedFlag;
}

function isDemoMode(): boolean {
  return config.demoMode || (!isAmiConfigured() && !isSipBridgeConfigured()) || !amiConnectedFlag;
}

export function broadcastEvent(event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    client.write(payload);
  }
}

export function registerSseClient(res: Response): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write(": connected\n\n");
  sseClients.add(res);
  res.on("close", () => sseClients.delete(res));
}

let pollTimer: ReturnType<typeof setInterval> | null = null;

export function startLivePolling(): void {
  if (pollTimer) return;
  pollTimer = setInterval(async () => {
    const demoMode = isDemoMode();
    const bridgeConnected = amiConnectedFlag || isSipBridgeConfigured();
    const queues = await getLiveQueues(demoMode);
    const agents = await getLiveAgents(demoMode);
    broadcastEvent("live", {
      queues,
      agents,
      summary: store.summary(bridgeConnected, demoMode),
      ts: new Date().toISOString(),
    });
  }, 3000);
}

pbxEvents.on("change", (payload: unknown) => {
  broadcastEvent("change", payload);
});
