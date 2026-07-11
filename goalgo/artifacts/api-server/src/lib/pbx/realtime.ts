import type { Response } from "express";
import type { PbxRealtimeSnapshot } from "./types.js";

type SseClient = { id: string; res: Response };

const clients = new Map<string, SseClient>();
let lastSnapshot: PbxRealtimeSnapshot | null = null;

function sseWrite(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function registerPbxSseClient(res: Response): string {
  const id = crypto.randomUUID();
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
  clients.set(id, { id, res });
  if (lastSnapshot) {
    sseWrite(res, "snapshot", lastSnapshot);
  }
  sseWrite(res, "ping", { ok: true, ts: new Date().toISOString() });
  return id;
}

export function removePbxSseClient(id: string): void {
  clients.delete(id);
}

export function broadcastPbxSnapshot(snapshot: PbxRealtimeSnapshot): void {
  lastSnapshot = snapshot;
  for (const client of clients.values()) {
    try {
      sseWrite(client.res, "snapshot", snapshot);
    } catch {
      clients.delete(client.id);
    }
  }
}

export function broadcastPbxEvent(event: string, payload: unknown): void {
  for (const client of clients.values()) {
    try {
      sseWrite(client.res, event, payload);
    } catch {
      clients.delete(client.id);
    }
  }
}

export function pbxSseClientCount(): number {
  return clients.size;
}
