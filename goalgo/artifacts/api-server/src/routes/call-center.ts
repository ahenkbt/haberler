import { Router, type IRouter, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { denyUnlessAdminMaintenance } from "../lib/admin-guard";
import {
  getAgentLabsBearerToken,
  isAgentLabsProxyPathAllowed,
  normalizeAgentLabsApiPath,
  proxyToAgentLabs,
} from "../lib/agentlabs-proxy";
import {
  agentLabsBaseUrl,
  agentLabsHealthPath,
  CALL_CENTER_PLANS,
  ensureCallCenterSettingsColumns,
  isCallCenterSubscriptionActive,
  loadCallCenterSubscription,
  type CallCenterPlanId,
} from "../lib/call-center";
import { isNativeAiCallEnabled } from "../lib/ai-call/config.js";
import { getNativeStatus, ensureAiCallTables } from "../lib/ai-call/service.js";

const router: IRouter = Router();

const AGENTLABS_MODULES = [
  { id: "dashboard", labelTr: "Gösterge paneli", path: "/app", group: "genel" },
  { id: "campaigns", labelTr: "Kampanyalar", path: "/app/campaigns", group: "olustur" },
  { id: "agents", labelTr: "AI asistanlar", path: "/app/agents", group: "olustur" },
  { id: "knowledge-base", labelTr: "Bilgi tabanı", path: "/app/knowledge-base", group: "olustur" },
  { id: "prompt-templates", labelTr: "İstem şablonları", path: "/app/prompt-templates", group: "olustur" },
  { id: "flows", labelTr: "Akış oluşturucu", path: "/app/flows", group: "otomasyon" },
  { id: "appointments", labelTr: "Randevular", path: "/app/flows/appointments", group: "otomasyon" },
  { id: "forms", labelTr: "Formlar", path: "/app/flows/forms", group: "otomasyon" },
  { id: "webhooks", labelTr: "Web kancaları", path: "/app/flows/webhooks", group: "otomasyon" },
  { id: "tools", labelTr: "Araçlar", path: "/app/tools", group: "otomasyon" },
  { id: "contacts", labelTr: "Kişiler", path: "/app/contacts", group: "telefon" },
  { id: "phone-numbers", labelTr: "Telefon numaraları", path: "/app/phone-numbers", group: "telefon" },
  { id: "incoming", labelTr: "Gelen bağlantılar", path: "/app/incoming-connections", group: "telefon" },
  { id: "voices", labelTr: "Sesler", path: "/app/voices", group: "telefon" },
  { id: "conversations", labelTr: "Konuşmalar", path: "/app/conversations", group: "izleme" },
  { id: "calls", labelTr: "Aramalar", path: "/app/calls", group: "izleme" },
  { id: "analytics", labelTr: "Analitik", path: "/app/analytics", group: "izleme" },
  { id: "crm", labelTr: "Hızlı CRM", path: "/app/crm", group: "izleme" },
  { id: "billing", labelTr: "Faturalama", path: "/app/billing", group: "hesap" },
  { id: "settings", labelTr: "Ayarlar", path: "/app/settings", group: "hesap" },
];

function sqlRows<T>(res: unknown): T[] {
  return ((res as { rows?: T[] }).rows ?? res) as T[];
}

/** Herkese açık: tanıtım sayfası paket kartları. */
router.get("/call-center/public/plans", (_req, res): void => {
  res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
  res.json({ ok: true, plans: CALL_CENTER_PLANS });
});

/** Herkese açık: abonelik durumu özeti (embed URL verilmez). */
router.get("/call-center/public/status", async (_req, res): Promise<void> => {
  const sub = await loadCallCenterSubscription();
  const native = isNativeAiCallEnabled();
  const baseUrl = native ? null : agentLabsBaseUrl();
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=120");
  res.json({
    ok: true,
    native,
    platformConfigured: native ? true : Boolean(baseUrl),
    subscriptionActive: isCallCenterSubscriptionActive(sub),
    plan: sub.callCenterPlan,
    status: sub.callCenterStatus,
    expiresAt: sub.callCenterExpiresAt?.toISOString() ?? null,
    landingPath: "/ai-cagri-merkezi",
    adminPath: "/admin/yekpare-ai-call",
  });
});

/** Herkese açık: abonelik / teklif talebi. */
router.post("/call-center/subscribe-request", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const phone = body.phone != null ? String(body.phone).trim().slice(0, 40) : "";
  const company = body.company != null ? String(body.company).trim().slice(0, 200) : "";
  const planId = String(body.planId ?? "pro").trim() as CallCenterPlanId;
  const message = body.message != null ? String(body.message).trim().slice(0, 4000) : "";
  if (!name || !email) {
    res.status(400).json({ error: "Ad ve e-posta zorunludur." });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "Geçerli bir e-posta girin." });
    return;
  }
  const validPlan = CALL_CENTER_PLANS.some((p) => p.id === planId);
  if (!validPlan) {
    res.status(400).json({ error: "Geçersiz paket." });
    return;
  }
  await ensureCallCenterSettingsColumns();
  const hmSiteId = body.hmSiteId != null && Number.isFinite(Number(body.hmSiteId)) ? Number(body.hmSiteId) : null;
  const hmSiteSlug = body.hmSiteSlug != null ? String(body.hmSiteSlug).trim().slice(0, 80) : null;
  await db.execute(sql`
    INSERT INTO call_center_subscription_requests (name, email, phone, company, plan_id, message, hm_site_id, hm_site_slug)
    VALUES (${name}, ${email}, ${phone || null}, ${company || null}, ${planId}, ${message || null}, ${hmSiteId}, ${hmSiteSlug})
  `);
  res.json({
    ok: true,
    message: "Talebiniz alındı. En kısa sürede sizinle iletişime geçeceğiz.",
  });
});

/** Yönetim: abonelik durumu ve manuel etkinleştirme. */
router.get("/call-center/admin/subscription", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  const sub = await loadCallCenterSubscription();
  res.setHeader("Cache-Control", "private, no-store");
  res.json({
    ok: true,
    ...sub,
    active: isCallCenterSubscriptionActive(sub),
    expiresAt: sub.callCenterExpiresAt?.toISOString() ?? null,
    plans: CALL_CENTER_PLANS,
  });
});

router.put("/call-center/admin/subscription", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  await ensureCallCenterSettingsColumns();
  const body = req.body as {
    enabled?: boolean;
    plan?: string | null;
    status?: string;
    expiresAt?: string | null;
  };
  const enabled = body.enabled === true;
  const plan = body.plan != null ? String(body.plan).trim().slice(0, 32) : null;
  const status = body.status != null ? String(body.status).trim().slice(0, 32) : enabled ? "active" : "none";
  let expiresAt: Date | null = null;
  if (body.expiresAt) {
    const d = new Date(body.expiresAt);
    if (!Number.isNaN(d.getTime())) expiresAt = d;
  } else if (enabled && status === "active" && !body.expiresAt) {
    expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);
  }
  await db.execute(sql`
    UPDATE site_settings SET
      call_center_enabled = ${enabled},
      call_center_subscription_plan = ${plan},
      call_center_subscription_status = ${status},
      call_center_subscription_expires_at = ${expiresAt}
    WHERE id = (SELECT id FROM site_settings ORDER BY id LIMIT 1)
  `);
  const sub = await loadCallCenterSubscription();
  res.json({
    ok: true,
    ...sub,
    active: isCallCenterSubscriptionActive(sub),
    expiresAt: sub.callCenterExpiresAt?.toISOString() ?? null,
  });
});

/** Yönetim: abonelik talepleri listesi. */
router.get("/call-center/admin/requests", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  await ensureCallCenterSettingsColumns();
  const rows = sqlRows<{
    id: number;
    name: string;
    email: string;
    phone: string | null;
    company: string | null;
    plan_id: string;
    message: string | null;
    status: string;
    created_at: Date;
  }>(
    await db.execute(sql`
      SELECT id, name, email, phone, company, plan_id, message, status, created_at
      FROM call_center_subscription_requests
      ORDER BY created_at DESC
      LIMIT 100
    `),
  );
  res.json({ ok: true, requests: rows });
});

/** Yönetim paneli: Yekpare AI Call yapılandırması ve modül listesi (iframe yok). */
router.get("/call-center/config", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  const native = isNativeAiCallEnabled();
  const baseUrl = native ? "" : agentLabsBaseUrl();
  const sub = await loadCallCenterSubscription();
  const subscriptionActive = isCallCenterSubscriptionActive(sub);
  const hasAuth = native ? true : Boolean(await getAgentLabsBearerToken());
  let nativeStatus = null;
  if (native) {
    await ensureAiCallTables();
    nativeStatus = await getNativeStatus();
  }
  res.setHeader("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  res.json({
    ok: true,
    productName: "Yekpare AI Call",
    native,
    configured: native ? (nativeStatus?.configured ?? true) : Boolean(baseUrl),
    authConfigured: hasAuth,
    subscriptionActive,
    subscription: {
      enabled: sub.callCenterEnabled,
      plan: sub.callCenterPlan,
      status: sub.callCenterStatus,
      expiresAt: sub.callCenterExpiresAt?.toISOString() ?? null,
    },
    nativeStatus,
    healthPath: native ? "/api/ai-call/health" : agentLabsHealthPath(),
    docsPath: native ? "goalgo/docs/YEKPARE_CALL_CENTER.md" : "goalgo/ai-call-center",
    extensions: [
      { id: "settings", labelTr: "Ayarlar", adminPath: "/admin/yekpare-ai-call/ayarlar" },
      { id: "assistants", labelTr: "AI Asistanlar", adminPath: "/admin/yekpare-ai-call/asistanlar" },
      { id: "ai-campaigns", labelTr: "AI Kampanyalar", adminPath: "/admin/yekpare-ai-call/ai-kampanya" },
      { id: "logs", labelTr: "Arama kayıtları", adminPath: "/admin/yekpare-ai-call/kayitlar" },
      { id: "sip", labelTr: "SIP Trunk", adminPath: "/admin/yekpare-ai-call/sip-trunk" },
      { id: "pbx-live", labelTr: "Canlı İzleme", adminPath: "/admin/yekpare-ai-call/canli" },
      { id: "pbx-extensions", labelTr: "Dahililer", adminPath: "/admin/yekpare-ai-call/dahili" },
      { id: "pbx-queues", labelTr: "Kuyruklar", adminPath: "/admin/yekpare-ai-call/kuyruk" },
      { id: "pbx-campaigns", labelTr: "PBX Kampanyalar", adminPath: "/admin/yekpare-ai-call/kampanya" },
      { id: "pbx-hybrid", labelTr: "Hibrit Mod", adminPath: "/admin/yekpare-ai-call/hibrit" },
      { id: "pbx-ivr", labelTr: "IVR", adminPath: "/admin/yekpare-ai-call/ivr" },
    ],
    modules: native ? [] : AGENTLABS_MODULES,
    localeHint: "tr",
    landingPath: "/ai-cagri-merkezi",
    adminPath: "/admin/yekpare-ai-call",
    workspaceAppPrefix: native ? null : "/call-center-app",
    workspaceApiPrefix: native ? null : "/call-center-api",
    workspaceOpenPath: native ? null : "/call-center-app/app",
    legacyAgentLabsAvailable: Boolean(agentLabsBaseUrl()),
  });
});

/** Yönetim: çalışma alanı vekili erişim kapısı (Vercel Edge + yönlendirme). */
router.get("/call-center/workspace-gate", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  const sub = await loadCallCenterSubscription();
  if (!isCallCenterSubscriptionActive(sub)) {
    res.status(403).json({ ok: false, reason: "subscription" });
    return;
  }
  if (isNativeAiCallEnabled()) {
    res.setHeader("Cache-Control", "private, no-store");
    res.json({ ok: true, native: true, workspaceAppPrefix: null, workspaceApiPrefix: null });
    return;
  }
  const baseUrl = agentLabsBaseUrl();
  if (!baseUrl) {
    res.status(503).json({ ok: false, reason: "not_configured" });
    return;
  }
  res.setHeader("Cache-Control", "private, no-store");
  res.json({
    ok: true,
    native: false,
    workspaceAppPrefix: "/call-center-app",
    workspaceApiPrefix: "/call-center-api",
    upstreamConfigured: true,
  });
});

async function denyUnlessCallCenterActive(req: Request, res: Response): Promise<boolean> {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return false;
  const sub = await loadCallCenterSubscription();
  if (!isCallCenterSubscriptionActive(sub)) {
    res.status(403).json({
      ok: false,
      error: "Yekpare AI Call aboneliği aktif değil.",
    });
    return false;
  }
  if (isNativeAiCallEnabled()) {
    res.status(410).json({
      ok: false,
      error: "Yerel mod aktif — AgentLabs vekili devre dışı. /api/ai-call/* kullanın.",
    });
    return false;
  }
  const baseUrl = agentLabsBaseUrl();
  if (!baseUrl) {
    res.status(503).json({
      ok: false,
      error: "AGENTLABS_URL tanımlı değil (Yekpare AI Call sunucusu).",
    });
    return false;
  }
  return true;
}

const callCenterProxyRouter: IRouter = Router();

/** Yekpare → AgentLabs API vekili (oturum eklentileri). */
callCenterProxyRouter.all(/.*/, async (req, res): Promise<void> => {
  if (!(await denyUnlessCallCenterActive(req, res))) return;

  const suffix = (req.path || "/").replace(/^\/+/, "");
  const apiPath = normalizeAgentLabsApiPath(suffix ? `/${suffix}` : "/");

  if (!isAgentLabsProxyPathAllowed(apiPath)) {
    res.status(403).json({ ok: false, error: "İzin verilmeyen yol." });
    return;
  }

  const query: Record<string, string | string[] | undefined> = {};
  for (const [k, v] of Object.entries(req.query)) {
    if (typeof v === "string") query[k] = v;
    else if (Array.isArray(v)) query[k] = v.filter((x): x is string => typeof x === "string");
  }

  const result = await proxyToAgentLabs(req.method, apiPath, {
    query,
    body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
  });

  res.status(result.status).json({
    ok: result.ok,
    ...(typeof result.body === "object" && result.body !== null ? (result.body as object) : { data: result.body }),
  });
});

router.use("/call-center/proxy", callCenterProxyRouter);

/** Yönetim paneli: Yekpare AI Call sağlık kontrolü */
router.get("/call-center/health", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  if (isNativeAiCallEnabled()) {
    const started = Date.now();
    await ensureAiCallTables();
    const status = await getNativeStatus();
    res.json({
      ...status,
      ok: status.configured,
      status: status.configured ? "ok" : "needs_setup",
      latencyMs: Date.now() - started,
    });
    return;
  }
  const baseUrl = agentLabsBaseUrl();
  if (!baseUrl) {
    res.status(503).json({
      ok: false,
      status: "not_configured",
      error: "AGENTLABS_URL tanımlı değil (Yekpare AI Call sunucusu).",
    });
    return;
  }
  const target = `${baseUrl}${agentLabsHealthPath()}`;
  const started = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const upstream = await fetch(target, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": "Yekpare-CallCenter-Health/1.0" },
    });
    const text = await upstream.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { raw: text.slice(0, 500) };
    }
    const latencyMs = Date.now() - started;
    const upstreamOk = upstream.ok;
    res.status(upstreamOk ? 200 : 502).json({
      ok: upstreamOk,
      status: upstreamOk ? "ok" : "upstream_error",
      target,
      latencyMs,
      httpStatus: upstream.status,
      upstream: body,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(502).json({
      ok: false,
      status: "unreachable",
      target,
      latencyMs: Date.now() - started,
      error: message,
    });
  } finally {
    clearTimeout(timer);
  }
});

export default router;
