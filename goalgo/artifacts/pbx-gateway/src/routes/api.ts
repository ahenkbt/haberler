import { Router, type IRouter, type Request, type Response } from "express";
import { createHmac } from "node:crypto";
import { getLiveAgents, getLiveQueues } from "../ami/ami-client.js";
import { config, isAmiConfigured, isSipBridgeConfigured } from "../config.js";
import { getAmiConnected, pbxEvents, registerSseClient } from "../sse/events.js";
import { hashDemoPassword, store } from "../store/memory-store.js";
import type { AgentStatus, ApiResponse, Queue } from "../types.js";

const router: IRouter = Router();

function demoMode(): boolean {
  return config.demoMode || (!isAmiConfigured() && !isSipBridgeConfigured()) || !getAmiConnected();
}

function ok<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ ok: true, data, demoMode: demoMode() } satisfies ApiResponse<T>);
}

function err(res: Response, message: string, status = 400): void {
  res.status(status).json({ ok: false, error: message });
}

function signAgentToken(agentId: string): string {
  const payload = `${agentId}.${Date.now()}`;
  const sig = createHmac("sha256", config.agentJwtSecret).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

function verifyAgentToken(token: string): string | null {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const [agentId, ts, sig] = raw.split(".");
    if (!agentId || !ts || !sig) return null;
    const expected = createHmac("sha256", config.agentJwtSecret).update(`${agentId}.${ts}`).digest("hex");
    if (sig !== expected) return null;
    if (Date.now() - Number(ts) > 12 * 60 * 60 * 1000) return null;
    return agentId;
  } catch {
    return null;
  }
}

router.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "pbx-gateway",
    demoMode: demoMode(),
    sipBridgeConfigured: isSipBridgeConfigured(),
    amiConfigured: isAmiConfigured(),
    amiConnected: getAmiConnected(),
  });
});

router.get("/config", (_req, res) => {
  res.json({
    ok: true,
    demoMode: demoMode(),
    sipBridgeConfigured: isSipBridgeConfigured(),
    amiConfigured: isAmiConfigured(),
    amiConnected: getAmiConnected(),
    features: {
      trunks: true,
      extensions: true,
      queues: true,
      agents: true,
      liveMonitor: true,
      webrtcSoftphone: true,
    },
  });
});

router.get("/events", (req, res) => {
  registerSseClient(res);
  void getLiveQueues(demoMode()).then((queues) =>
    getLiveAgents(demoMode()).then((agents) => {
      res.write(
        `event: live\ndata: ${JSON.stringify({
          queues,
          agents,
          summary: store.summary(isSipBridgeConfigured(), demoMode()),
        })}\n\n`,
      );
    }),
  );
});

router.get("/trunks", (_req, res) => {
  ok(res, store.trunks.map(({ password: _, ...t }) => t));
});

router.post("/trunks", (req, res) => {
  const body = req.body as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  if (!name) {
    err(res, "Trunk adı zorunludur.");
    return;
  }
  const row = store.upsertTrunk({
    id: body.id ? String(body.id) : undefined,
    name,
    provider: String(body.provider ?? ""),
    host: String(body.host ?? ""),
    username: String(body.username ?? ""),
    password: body.password ? String(body.password) : undefined,
    register: Boolean(body.register ?? true),
    outboundCallerId: String(body.outboundCallerId ?? ""),
    maxChannels: Number(body.maxChannels ?? 10),
    enabled: Boolean(body.enabled ?? true),
  });
  pbxEvents.emit("change", { type: "trunk", action: body.id ? "update" : "create", id: row.id });
  const { password: _, ...safe } = row;
  ok(res, safe, body.id ? 200 : 201);
});

router.get("/extensions", (_req, res) => {
  ok(res, store.extensions);
});

router.post("/extensions", (req, res) => {
  const body = req.body as Record<string, unknown>;
  const extension = String(body.extension ?? "").trim();
  const displayName = String(body.displayName ?? "").trim();
  if (!extension || !displayName) {
    err(res, "Dahili numarası ve görünen ad zorunludur.");
    return;
  }
  const row = store.upsertExtension({
    id: body.id ? String(body.id) : undefined,
    extension,
    displayName,
    email: String(body.email ?? ""),
    sipSecret: body.sipSecret ? String(body.sipSecret) : undefined,
    voicemail: Boolean(body.voicemail ?? true),
    queueIds: Array.isArray(body.queueIds) ? body.queueIds.map(String) : [],
    enabled: Boolean(body.enabled ?? true),
  });
  pbxEvents.emit("change", { type: "extension", action: body.id ? "update" : "create", id: row.id });
  ok(res, row, body.id ? 200 : 201);
});

router.get("/queues", (_req, res) => {
  ok(res, store.queues);
});

router.post("/queues", (req, res) => {
  const body = req.body as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  if (!name) {
    err(res, "Kuyruk adı zorunludur.");
    return;
  }
  const row = store.upsertQueue({
    id: body.id ? String(body.id) : undefined,
    name,
    strategy: (body.strategy as Queue["strategy"]) ?? "ringall",
    timeout: Number(body.timeout ?? 30),
    maxlen: Number(body.maxlen ?? 50),
    musicOnHold: String(body.musicOnHold ?? "default"),
    memberExtensionIds: Array.isArray(body.memberExtensionIds) ? body.memberExtensionIds.map(String) : [],
    enabled: Boolean(body.enabled ?? true),
  });
  pbxEvents.emit("change", { type: "queue", action: body.id ? "update" : "create", id: row.id });
  ok(res, row, body.id ? 200 : 201);
});

router.get("/agents", (_req, res) => {
  ok(res, store.agents.map((a) => store.stripAgent(a)));
});

router.post("/agents", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const username = String(body.username ?? "").trim();
    const displayName = String(body.displayName ?? "").trim();
    if (!username || !displayName) {
      err(res, "Kullanıcı adı ve görünen ad zorunludur.");
      return;
    }
    const row = await store.upsertAgent({
      id: body.id ? String(body.id) : undefined,
      username,
      displayName,
      password: body.password ? String(body.password) : undefined,
      extensionId: body.extensionId ? String(body.extensionId) : null,
      queueIds: Array.isArray(body.queueIds) ? body.queueIds.map(String) : [],
      status: (body.status as AgentStatus) ?? undefined,
      enabled: Boolean(body.enabled ?? true),
    });
    pbxEvents.emit("change", { type: "agent", action: body.id ? "update" : "create", id: row.id });
    ok(res, store.stripAgent(row), body.id ? 200 : 201);
  } catch {
    err(res, "Temsilci kaydedilemedi.", 500);
  }
});

router.get("/live/queue", async (_req, res) => {
  const rows = await getLiveQueues(demoMode());
  ok(res, rows);
});

router.get("/live/agents", async (_req, res) => {
  const rows = await getLiveAgents(demoMode());
  ok(res, rows);
});

router.get("/live/summary", (_req, res) => {
  ok(res, store.summary(isSipBridgeConfigured(), demoMode()));
});

router.post("/auth/agent/login", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");
  if (!username || !password) {
    err(res, "Kullanıcı adı ve şifre zorunludur.", 401);
    return;
  }
  const agent = store.agents.find((a) => a.username === username && a.enabled);
  if (!agent) {
    err(res, "Geçersiz kullanıcı adı veya şifre.", 401);
    return;
  }
  const match = agent.passwordHash === hashDemoPassword(password);
  if (!match) {
    err(res, "Geçersiz kullanıcı adı veya şifre.", 401);
    return;
  }
  store.setAgentStatus(agent.id, "available");
  const token = signAgentToken(agent.id);
  ok(res, { token, agent: store.stripAgent(agent) });
});

router.post("/auth/agent/status", (req, res) => {
  const auth = String(req.headers.authorization ?? "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : String(req.body?.token ?? "");
  const agentId = verifyAgentToken(token);
  if (!agentId) {
    err(res, "Oturum geçersiz veya süresi dolmuş.", 401);
    return;
  }
  const status = String(req.body?.status ?? "") as AgentStatus;
  const allowed: AgentStatus[] = ["available", "break", "paused", "wrap_up", "offline"];
  if (!allowed.includes(status)) {
    err(res, "Geçersiz durum.");
    return;
  }
  const agent = store.setAgentStatus(agentId, status);
  if (!agent) {
    err(res, "Temsilci bulunamadı.", 404);
    return;
  }
  pbxEvents.emit("change", { type: "agent_status", agentId, status });
  ok(res, store.stripAgent(agent));
});

router.get("/auth/agent/me", (req, res) => {
  const auth = String(req.headers.authorization ?? "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const agentId = verifyAgentToken(token);
  if (!agentId) {
    err(res, "Oturum geçersiz.", 401);
    return;
  }
  const agent = store.agents.find((a) => a.id === agentId);
  if (!agent) {
    err(res, "Temsilci bulunamadı.", 404);
    return;
  }
  ok(res, store.stripAgent(agent));
});

export default router;
