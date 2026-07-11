import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { denyUnlessAdminMaintenance } from "../lib/admin-guard.js";
import { isDemoSeedAllowed } from "../lib/demo-credentials.js";
import {
  agentStatusLabelTr,
  extractPbxAgentBearer,
  signPbxAgentToken,
  verifyPbxAgentToken,
} from "../lib/pbx/auth.js";
import {
  acceptPendingTransfer,
  deleteAiCampaignConfig,
  getPbxCampaignRouting,
  handleTransferIn,
  listAiCampaignConfigs,
  listPendingTransfersForAgent,
  loadHybridSettings,
  routingModeLabelTr,
  updateHybridSettings,
  updatePbxCampaignRouting,
  upsertAiCampaignConfig,
  verifyTransferWebhookSecret,
} from "../lib/pbx/hybrid.js";
import {
  agentLabsTeamLogin,
  agentLabsTeamMe,
  buildAgentLabsSnapshot,
  fetchAgentLabsAgents,
  fetchAgentLabsCampaigns,
  fetchAgentLabsExtensions,
  fetchAgentLabsFlows,
  fetchAgentLabsQueues,
  fetchAgentLabsTrunks,
  isPbxAgentLabsMode,
  mapAgentLabsMemberToPbxAgent,
  pbxBackendMode,
  setAgentLabsAgentPresence,
} from "../lib/pbx/agentlabs-bridge.js";
import {
  buildVerimorSnapshot,
  fetchVerimorQueues,
  getVerimorConfig,
  getVerimorSettingsPublic,
  joinVerimorCampaignQueue,
  leaveVerimorCampaignQueue,
  listVerimorCampaigns,
  refreshAgentWebphoneToken,
  storeVerimorReportEvent,
  testVerimorConnection,
  updateVerimorSettings,
  upsertVerimorCampaign,
} from "../lib/pbx/verimor-bridge.js";
import {
  getAgentActiveCampaign,
  getAgentSipCredentials,
  joinAgentCampaign,
  leaveAgentCampaign,
  listAgentAvailableCampaigns,
  upsertVerimorAgent,
  verimorSoftphoneLogin,
} from "../lib/pbx/verimor-softphone.js";
import {
  getThreeCxSettingsPublic,
  isPbxThreeCxActive,
  runThreeCxConnectionTest,
  updateThreeCxSettings,
} from "../lib/pbx/threecx-bridge.js";
import {
  getThreeCxAgentSipCredentials,
  threecxSoftphoneLogin,
  upsertThreeCxAgent,
} from "../lib/pbx/threecx-softphone.js";
import {
  getLocalAgentSipCredentials,
  localSoftphoneLogin,
} from "../lib/pbx/local-softphone.js";
import {
  listAgentDispositionCodes,
  listCallDispositions,
  listDispositionCodesAdmin,
  loadGoogleSheetsConfig,
  saveGoogleSheetsConfig,
  submitAgentDisposition,
  upsertDispositionCode,
} from "../lib/pbx/disposition.js";
import { hangupVerimorCall, originateVerimorCall } from "../lib/pbx/verimor-client.js";
import {
  addCampaignContacts,
  getCampaignById,
  listCampaignContacts,
  listCampaignResults,
  parseContactLines,
  parseCsvBuffer,
  parseXlsxBuffer,
  type ParsedCampaignContact,
} from "../lib/pbx/campaign-contacts.js";
import { startCampaignDialWorker } from "../lib/pbx/campaign-dial-worker.js";
import { registerPbxSseClient, removePbxSseClient } from "../lib/pbx/realtime.js";
import {
  agentLogin,
  buildRealtimeSnapshot,
  ensurePbxTables,
  listAgents,
  listCampaigns,
  listExtensions,
  listIvrFlows,
  listQueues,
  listTrunks,
  loadPbxSettings,
  publishPbxRealtime,
  seedPbxDemoIfEmpty,
  setAgentStatus,
  updatePbxSettings,
  upsertAgent,
  upsertCampaign,
  upsertExtension,
  upsertIvrFlow,
  upsertQueue,
  upsertTrunk,
} from "../lib/pbx/service.js";
import type { PbxAgentStatus } from "../lib/pbx/types.js";

const router: IRouter = Router();

const campaignContactUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const VALID_STATUSES: PbxAgentStatus[] = [
  "offline",
  "available",
  "on_call",
  "wrap_up",
  "break",
  "paused",
];

const AGENTLABS_TOKEN_PREFIX = "al-team:";

function wrapAgentLabsToken(token: string): string {
  return `${AGENTLABS_TOKEN_PREFIX}${token}`;
}

function unwrapAgentLabsToken(token: string): string | null {
  return token.startsWith(AGENTLABS_TOKEN_PREFIX) ? token.slice(AGENTLABS_TOKEN_PREFIX.length) : null;
}

async function resolveAgentFromToken(token: string) {
  const alToken = unwrapAgentLabsToken(token);
  if (alToken) {
    const member = await agentLabsTeamMe(alToken);
    if (!member) return null;
    return mapAgentLabsMemberToPbxAgent(member);
  }
  const payload = verifyPbxAgentToken(token);
  if (!payload) return null;
  const agents = await listAgents();
  return agents.find((a) => a.id === payload.sub) ?? null;
}

async function requireAgent(req: Request, res: Response): Promise<{ agentId: string } | null> {
  const token = extractPbxAgentBearer(req);
  if (!token) {
    res.status(401).json({ ok: false, error: "Oturum gerekli." });
    return null;
  }
  const alToken = unwrapAgentLabsToken(token);
  if (alToken) {
    const member = await agentLabsTeamMe(alToken);
    if (!member) {
      res.status(401).json({ ok: false, error: "Geçersiz oturum." });
      return null;
    }
    return { agentId: member.id };
  }
  const payload = verifyPbxAgentToken(token);
  if (!payload) {
    res.status(401).json({ ok: false, error: "Geçersiz oturum." });
    return null;
  }
  return { agentId: payload.sub };
}

/** Herkese açık: PBX durumu */
router.get("/pbx/public/status", async (_req, res): Promise<void> => {
  await ensurePbxTables();
  const settings = await loadPbxSettings();
  const hybrid = await loadHybridSettings();
  const mode = await pbxBackendMode();
  res.setHeader("Cache-Control", "public, max-age=30");
  res.json({
    ok: true,
    demoMode: mode === "demo" && settings.demoMode,
    backend: mode,
    agentLabsConfigured: isPbxAgentLabsMode(),
    verimorConfigured: mode === "verimor",
    verimorDomain: settings.verimorDomain ?? null,
    hybridModeEnabled: hybrid.hybridModeEnabled,
    transferWebhookUrl: hybrid.transferWebhookUrl,
    agentPortalPath: "/pbx",
    adminPath: "/admin/yekpare-ai-call",
    hybridAdminPath: "/admin/yekpare-ai-call/hibrit",
    verimorAdminPath: "/admin/yekpare-ai-call/verimor",
    threecxAdminPath: "/admin/yekpare-ai-call/3cx",
    threecxConfigured: await isPbxThreeCxActive(),
    workspaceTeamPath: "/call-center-app/team",
    apiPrefix: "/api/pbx",
  });
});

/** Demo veriyi yükle (geliştirme). */
router.post("/pbx/admin/seed-demo", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  if (!isDemoSeedAllowed()) {
    res.status(403).json({ ok: false, error: "Demo seed production ortamında kapalı (ENABLE_DEMO_SEED=1 gerekir)." });
    return;
  }
  const result = await seedPbxDemoIfEmpty();
  await publishPbxRealtime();
  res.json({ ok: true, ...result });
});

/** Admin: ayarlar */
router.get("/pbx/admin/settings", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  const settings = await loadPbxSettings();
  res.json({ ok: true, settings });
});

router.put("/pbx/admin/settings", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  const body = req.body as Record<string, unknown>;
  const settings = await updatePbxSettings({
    demoMode: body.demoMode === true ? true : body.demoMode === false ? false : undefined,
    sipBridgeUrl: body.sipBridgeUrl != null ? String(body.sipBridgeUrl) : undefined,
    sipBridgeWsUrl: body.sipBridgeWsUrl != null ? String(body.sipBridgeWsUrl) : undefined,
  });
  res.json({ ok: true, settings });
});

/** Canlı izleme — özet + kuyruk + agent */
router.get("/pbx/admin/live", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  const mode = await pbxBackendMode();
  if (mode === "agentlabs") {
    const snapshot = await buildAgentLabsSnapshot();
    res.setHeader("Cache-Control", "private, no-store");
    res.json({ ok: true, ...snapshot });
    return;
  }
  if (mode === "verimor") {
    const snapshot = await buildVerimorSnapshot();
    res.setHeader("Cache-Control", "private, no-store");
    res.json({ ok: true, ...snapshot });
    return;
  }
  await seedPbxDemoIfEmpty();
  const snapshot = await buildRealtimeSnapshot();
  res.setHeader("Cache-Control", "private, no-store");
  res.json({ ok: true, ...snapshot });
});

/** SSE canlı güncelleme */
router.get("/pbx/admin/live/stream", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  await seedPbxDemoIfEmpty();
  const clientId = registerPbxSseClient(res);
  const heartbeat = setInterval(() => {
    try {
      res.write(`event: ping\ndata: ${JSON.stringify({ ts: new Date().toISOString() })}\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 25000);
  req.on("close", () => {
    clearInterval(heartbeat);
    removePbxSseClient(clientId);
  });
});

router.get("/pbx/admin/trunks", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  try {
    await ensurePbxTables();
    await seedPbxDemoIfEmpty();
    res.json({ ok: true, trunks: await listTrunks() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ ok: false, error: msg || "Trunk listesi alınamadı." });
  }
});

router.post("/pbx/admin/trunks", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  try {
    await ensurePbxTables();
    const trunk = await upsertTrunk(req.body as Record<string, unknown>);
    res.json({ ok: true, trunk });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(400).json({ ok: false, error: msg || "Trunk kaydedilemedi." });
  }
});

router.get("/pbx/admin/extensions", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  if ((await pbxBackendMode()) === "agentlabs") {
    res.json({ ok: true, extensions: await fetchAgentLabsExtensions() });
    return;
  }
  await seedPbxDemoIfEmpty();
  res.json({ ok: true, extensions: await listExtensions(true) });
});

router.post("/pbx/admin/extensions", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  try {
    const extension = await upsertExtension(req.body as Record<string, unknown>);
    res.json({ ok: true, extension });
  } catch (e) {
    res.status(400).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

router.get("/pbx/admin/queues", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  if ((await pbxBackendMode()) === "agentlabs") {
    res.json({ ok: true, queues: await fetchAgentLabsQueues() });
    return;
  }
  await seedPbxDemoIfEmpty();
  res.json({ ok: true, queues: await listQueues() });
});

router.post("/pbx/admin/queues", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  try {
    const queue = await upsertQueue(req.body as Record<string, unknown>);
    res.json({ ok: true, queue });
  } catch (e) {
    res.status(400).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

router.get("/pbx/admin/agents", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  await seedPbxDemoIfEmpty();
  res.json({ ok: true, agents: await listAgents() });
});

router.post("/pbx/admin/agents", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  try {
    const agent = await upsertAgent(req.body as Record<string, unknown>);
    res.json({ ok: true, agent });
  } catch (e) {
    res.status(400).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

router.get("/pbx/admin/campaigns", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  const mode = await pbxBackendMode();
  if (mode === "agentlabs") {
    res.json({ ok: true, campaigns: await fetchAgentLabsCampaigns() });
    return;
  }
  await seedPbxDemoIfEmpty();
  res.json({ ok: true, campaigns: await listCampaigns() });
});

router.post("/pbx/admin/campaigns", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  try {
    const campaign = await upsertCampaign(req.body as Record<string, unknown>);
    res.json({ ok: true, campaign });
  } catch (e) {
    res.status(400).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

router.get("/pbx/admin/campaigns/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  await seedPbxDemoIfEmpty();
  const campaign = await getCampaignById(String(req.params.id));
  if (!campaign) {
    res.status(404).json({ ok: false, error: "Kampanya bulunamadı." });
    return;
  }
  res.json({ ok: true, campaign });
});

router.get("/pbx/admin/campaigns/:id/contacts", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  try {
    const contacts = await listCampaignContacts(String(req.params.id));
    res.json({ ok: true, contacts });
  } catch (e) {
    res.status(400).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

router.post("/pbx/admin/campaigns/:id/contacts", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  try {
    const body = req.body as { contacts?: { phone: string; name?: string }[]; text?: string };
    let contacts = Array.isArray(body.contacts) ? body.contacts : [];
    if (body.text) {
      contacts = [...contacts, ...parseContactLines(String(body.text))];
    }
    if (contacts.length === 0) {
      res.status(400).json({ ok: false, error: "En az bir telefon numarası gerekli." });
      return;
    }
    const result = await addCampaignContacts(String(req.params.id), contacts);
    const campaign = await getCampaignById(String(req.params.id));
    res.json({ ok: true, ...result, campaign });
  } catch (e) {
    res.status(400).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

router.post(
  "/pbx/admin/campaigns/:id/contacts/import",
  campaignContactUpload.single("file"),
  async (req, res): Promise<void> => {
    if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
    try {
      const file = req.file;
      if (!file?.buffer?.length) {
        res.status(400).json({ ok: false, error: "CSV veya Excel dosyası gerekli (field: file)." });
        return;
      }
      const name = (file.originalname ?? "").toLowerCase();
      let parsed: ParsedCampaignContact[];
      if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        parsed = parseXlsxBuffer(file.buffer);
      } else {
        parsed = parseCsvBuffer(file.buffer);
      }
      if (parsed.length === 0) {
        res.status(400).json({ ok: false, error: "Dosyada geçerli telefon satırı bulunamadı." });
        return;
      }
      const result = await addCampaignContacts(String(req.params.id), parsed);
      const campaign = await getCampaignById(String(req.params.id));
      res.json({ ok: true, ...result, campaign, parsedCount: parsed.length });
    } catch (e) {
      res.status(400).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  },
);

router.get("/pbx/admin/campaigns/:id/results", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  try {
    const results = await listCampaignResults(String(req.params.id));
    res.json({ ok: true, results });
  } catch (e) {
    res.status(400).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

router.get("/pbx/admin/ivr", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  if ((await pbxBackendMode()) === "agentlabs") {
    res.json({ ok: true, flows: await fetchAgentLabsFlows() });
    return;
  }
  await seedPbxDemoIfEmpty();
  res.json({ ok: true, flows: await listIvrFlows() });
});

router.post("/pbx/admin/ivr", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  try {
    const flow = await upsertIvrFlow(req.body as Record<string, unknown>);
    res.json({ ok: true, flow });
  } catch (e) {
    res.status(400).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

/** Sonlandırma (disposition) kodları ve Google Sheets raporu */
router.get("/pbx/admin/disposition-codes", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  try {
    const codes = await listDispositionCodesAdmin();
    res.json({ ok: true, codes });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ ok: false, error: msg || "Sonlandırma kodları alınamadı." });
  }
});

router.post("/pbx/admin/disposition-codes", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  try {
    const code = await upsertDispositionCode(req.body as Record<string, unknown>);
    res.json({ ok: true, code });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(400).json({ ok: false, error: msg || "Sonlandırma kodu kaydedilemedi." });
  }
});

router.get("/pbx/admin/disposition-log", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  try {
    const log = await listCallDispositions();
    res.json({ ok: true, log });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ ok: false, error: msg || "Sonlandırma kayıtları alınamadı." });
  }
});

router.get("/pbx/admin/google-sheets", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  try {
    const config = await loadGoogleSheetsConfig();
    res.json({ ok: true, config });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ ok: false, error: msg || "Google Sheets ayarları alınamadı." });
  }
});

router.put("/pbx/admin/google-sheets", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  try {
    const config = await saveGoogleSheetsConfig(req.body as Record<string, unknown>);
    res.json({ ok: true, config });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(400).json({ ok: false, error: msg || "Google Sheets ayarları kaydedilemedi." });
  }
});

/** Hibrit AI ↔ PBX ayarları */
router.get("/pbx/admin/hybrid-settings", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  await ensurePbxTables();
  const settings = await loadHybridSettings();
  res.json({ ok: true, settings, routingModeLabels: { ai_only: routingModeLabelTr("ai_only"), human_only: routingModeLabelTr("human_only"), hybrid: routingModeLabelTr("hybrid") } });
});

router.put("/pbx/admin/hybrid-settings", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  const body = req.body as Record<string, unknown>;
  const settings = await updateHybridSettings({
    hybridModeEnabled: body.hybridModeEnabled === true ? true : body.hybridModeEnabled === false ? false : undefined,
    defaultRoutingMode: body.defaultRoutingMode != null ? String(body.defaultRoutingMode) as "ai_only" | "human_only" | "hybrid" : undefined,
    defaultPbxQueueId: body.defaultPbxQueueId !== undefined ? (body.defaultPbxQueueId ? String(body.defaultPbxQueueId) : null) : undefined,
    transferWebhookSecret: body.transferWebhookSecret !== undefined ? (body.transferWebhookSecret ? String(body.transferWebhookSecret) : null) : undefined,
  });
  res.json({ ok: true, settings });
});

/** AI kampanya ↔ PBX kuyruk eşlemesi */
router.get("/pbx/admin/ai-queue-mapping", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  await ensurePbxTables();
  const mappings = await listAiCampaignConfigs();
  res.json({ ok: true, mappings });
});

router.put("/pbx/admin/ai-queue-mapping", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  try {
    const mapping = await upsertAiCampaignConfig(req.body as Record<string, unknown>);
    res.json({ ok: true, mapping });
  } catch (e) {
    res.status(400).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

router.delete("/pbx/admin/ai-queue-mapping/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  await deleteAiCampaignConfig(String(req.params.id));
  res.json({ ok: true });
});

/** PBX kampanya yönlendirme modu */
router.get("/pbx/admin/campaigns/:id/routing", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  await ensurePbxTables();
  const routing = await getPbxCampaignRouting(String(req.params.id));
  if (!routing) {
    res.status(404).json({ ok: false, error: "Kampanya bulunamadı." });
    return;
  }
  res.json({ ok: true, routing: { ...routing, routingModeLabelTr: routingModeLabelTr(routing.routingMode) } });
});

router.put("/pbx/admin/campaigns/:id/routing", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  const mode = String((req.body as { routingMode?: string }).routingMode ?? "") as "ai_only" | "human_only" | "hybrid";
  if (!["ai_only", "human_only", "hybrid"].includes(mode)) {
    res.status(400).json({ ok: false, error: "Geçersiz yönlendirme modu." });
    return;
  }
  const routing = await updatePbxCampaignRouting(String(req.params.id), mode);
  res.json({ ok: true, routing: { ...routing, routingModeLabelTr: routingModeLabelTr(routing.routingMode) } });
});

/** AgentLabs webhook: AI → canlı temsilci aktarımı */
router.post("/pbx/transfer-in", async (req, res): Promise<void> => {
  await ensurePbxTables();
  const secret = String(req.headers["x-pbx-transfer-secret"] ?? req.headers["x-webhook-secret"] ?? "");
  if (!(await verifyTransferWebhookSecret(secret || undefined))) {
    res.status(401).json({ ok: false, error: "Geçersiz webhook anahtarı." });
    return;
  }
  const result = await handleTransferIn(req.body as Record<string, unknown>);
  if (!result.ok) {
    res.status(422).json({ ok: false, error: result.error });
    return;
  }
  res.json({ ok: true, transfer: result.transfer });
});

/** Verimor Bulutsantralim ayarları */
router.get("/pbx/admin/verimor-settings", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  const settings = await getVerimorSettingsPublic();
  res.json({ ok: true, settings });
});

router.put("/pbx/admin/verimor-settings", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  const body = req.body as Record<string, unknown>;
  const settings = await updateVerimorSettings({
    enabled: body.enabled === true ? true : body.enabled === false ? false : undefined,
    softphoneEnabled: body.softphoneEnabled === true ? true : body.softphoneEnabled === false ? false : undefined,
    domain: body.domain !== undefined ? (body.domain ? String(body.domain) : null) : undefined,
    apiKey: body.apiKey != null ? String(body.apiKey) : undefined,
  });
  res.json({ ok: true, settings });
});

/** Verimor agent + dahili tek formda (API key gerekmez) */
router.post("/pbx/admin/verimor-agents", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  try {
    await ensurePbxTables();
    const result = await upsertVerimorAgent(req.body as Record<string, unknown>);
    res.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isUnique =
      /unique|duplicate key|already exists/i.test(msg);
    res.status(isUnique ? 409 : 400).json({ ok: false, error: msg });
  }
});

router.post("/pbx/admin/verimor-settings/test", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  const config = await getVerimorConfig();
  if (!config) {
    res.status(400).json({ ok: false, error: "Verimor API anahtarı tanımlı değil." });
    return;
  }
  const result = await testVerimorConnection(config);
  res.status(result.ok ? 200 : 400).json({ ok: result.ok, message: result.message, queueCount: result.queueCount });
});

/** 3CX Configuration API ayarları */
router.get("/pbx/admin/3cx/settings", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  const settings = await getThreeCxSettingsPublic();
  res.json({ ok: true, settings });
});

router.put("/pbx/admin/3cx/settings", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  const body = req.body as Record<string, unknown>;
  const settings = await updateThreeCxSettings({
    enabled: body.enabled === true ? true : body.enabled === false ? false : undefined,
    fqdn: body.fqdn !== undefined ? (body.fqdn ? String(body.fqdn) : null) : undefined,
    clientId: body.clientId != null ? String(body.clientId) : undefined,
    clientSecret: body.clientSecret != null ? String(body.clientSecret) : undefined,
  });
  res.json({ ok: true, settings });
});

router.post("/pbx/admin/3cx/test", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  const result = await runThreeCxConnectionTest();
  res.status(result.ok ? 200 : 400).json({ ok: result.ok, message: result.message, userCount: result.userCount });
});

/** 3CX agent + dahili (isteğe bağlı API ile otomatik oluşturma) */
router.post("/pbx/admin/3cx/provision-extension", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  try {
    await ensurePbxTables();
    const result = await upsertThreeCxAgent(req.body as Record<string, unknown>);
    res.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isUnique = /unique|duplicate key|already exists/i.test(msg);
    res.status(isUnique ? 409 : 400).json({ ok: false, error: msg });
  }
});

router.get("/pbx/admin/verimor/queues", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  const config = await getVerimorConfig();
  if (!config) {
    res.status(400).json({ ok: false, error: "Verimor yapılandırılmamış." });
    return;
  }
  const queues = await fetchVerimorQueues(config);
  res.json({ ok: true, queues });
});

router.get("/pbx/admin/verimor/campaigns", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  res.json({ ok: true, campaigns: await listVerimorCampaigns() });
});

router.post("/pbx/admin/verimor/campaigns", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  try {
    const campaign = await upsertVerimorCampaign(req.body as Record<string, unknown>);
    res.json({ ok: true, campaign });
  } catch (e) {
    res.status(400).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

/** Verimor report_event webhook (OIM'den gelen arama olayları) */
router.post("/pbx/webhooks/verimor/report-event", async (req, res): Promise<void> => {
  const payload = (req.body ?? {}) as Record<string, unknown>;
  await storeVerimorReportEvent(payload);
  res.status(200).send("OK");
});

/** Demo: sahte AI aktarımı (admin) */
router.post("/pbx/admin/transfer-in/mock", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  await ensurePbxTables();
  const body = req.body as Record<string, unknown>;
  const result = await handleTransferIn({
    callId: String(body.callId ?? `demo-${Date.now()}`),
    phone: String(body.phone ?? "+905551234567"),
    campaignId: String(body.campaignId ?? body.aiCampaignId ?? "demo-ai-campaign"),
    campaignName: String(body.campaignName ?? "Demo AI Kampanyası"),
    summary: String(body.summary ?? "Müşteri fatura itirazı hakkında konuştu. Canlı temsilci talep etti."),
    context: (body.context as Record<string, unknown>) ?? { demo: true, topic: "fatura" },
    transferReason: String(body.transferReason ?? "keyword: temsilci"),
  });
  if (!result.ok) {
    res.status(422).json({ ok: false, error: result.error });
    return;
  }
  res.json({ ok: true, transfer: result.transfer, message: "Demo aktarım kuyruğa eklendi." });
});

/** Temsilci: bekleyen AI aktarımları */
router.get("/pbx/agent/transfers/pending", async (req, res): Promise<void> => {
  const auth = await requireAgent(req, res);
  if (!auth) return;
  const agents = await listAgents();
  const agent = agents.find((a) => a.id === auth.agentId);
  if (!agent) {
    res.status(404).json({ ok: false, error: "Agent bulunamadı." });
    return;
  }
  const transfers = await listPendingTransfersForAgent(agent.queueIds);
  res.json({ ok: true, transfers });
});

router.post("/pbx/agent/transfers/:id/accept", async (req, res): Promise<void> => {
  const auth = await requireAgent(req, res);
  if (!auth) return;
  const transfer = await acceptPendingTransfer(String(req.params.id), auth.agentId);
  if (!transfer) {
    res.status(404).json({ ok: false, error: "Aktarım bulunamadı veya zaten alındı." });
    return;
  }
  res.json({ ok: true, transfer, message: "AI aktarımı kabul edildi." });
});

/** Agent oturumu */
router.post("/pbx/agent/login", async (req, res): Promise<void> => {
  try {
    await ensurePbxTables();
    const body = req.body as { username?: string; email?: string; password?: string };
    const username = String(body.username ?? body.email ?? "").trim();
    const password = String(body.password ?? "");
    if (!username || !password) {
      res.status(400).json({ ok: false, error: "Kullanıcı adı/e-posta ve şifre zorunludur." });
      return;
    }

    const mode = await pbxBackendMode();
    if (mode === "verimor") {
      const vm = await verimorSoftphoneLogin(username, password);
      if (vm) {
        const token = signPbxAgentToken(vm.agent);
        res.json({
          ok: true,
          token,
          backend: "verimor",
          agent: vm.agent,
          sip: {
            extension: vm.sip.extension,
            password: vm.sip.password,
            domain: vm.sip.domain,
            wssUrl: vm.sip.wssUrl,
            sipUri: vm.sip.sipUri,
            wsUrl: vm.sip.wssUrl,
            sipSecret: vm.sip.password,
            demoMode: false,
          },
        });
        return;
      }

      const tcx = await threecxSoftphoneLogin(username, password);
      if (tcx) {
        const token = signPbxAgentToken(tcx.agent);
        res.json({
          ok: true,
          token,
          backend: "3cx",
          agent: tcx.agent,
          sip: {
            extension: tcx.sip.extension,
            password: tcx.sip.password,
            domain: tcx.sip.domain,
            wssUrl: tcx.sip.wssUrl,
            sipUri: tcx.sip.sipUri,
            wsUrl: tcx.sip.wssUrl,
            sipSecret: tcx.sip.password,
            demoMode: false,
          },
        });
        return;
      }

      // SIP trunk / yerel dahili temsilci — tarayıcı softphone (sip.js + Asterisk WSS)
      const localResult = await localSoftphoneLogin(username, password);
      if (localResult) {
        const token = signPbxAgentToken(localResult.agent);
        const sip = localResult.sip;
        res.json({
          ok: true,
          token,
          backend: "local",
          agent: localResult.agent,
          sip: sip?.wssUrl
            ? {
                extension: sip.extension,
                password: sip.password,
                domain: sip.domain,
                wssUrl: sip.wssUrl,
                sipUri: sip.sipUri,
                callerId: sip.callerId,
              }
            : null,
          sipError: sip && !sip.wssUrl ? "SIP WSS yapılandırın" : sip ? undefined : "Dahili tanımlı değil",
        });
        return;
      }

      res.status(401).json({
        ok: false,
        error:
          "Geçersiz kullanıcı adı veya şifre. Yekpare şifrenizi kullanın (SIP dahili şifresi değil). Admin panelden temsilci tanımlayın.",
      });
      return;
    }

    if (mode === "agentlabs") {
      const email = username.includes("@") ? username : `${username}@yekpare.local`;
      const al = await agentLabsTeamLogin(email, password);
      if (al) {
        const agent = mapAgentLabsMemberToPbxAgent(al.member);
        res.json({
          ok: true,
          token: wrapAgentLabsToken(al.token),
          backend: "agentlabs",
          agent,
          sip: { wsUrl: null, extension: agent.extension, sipSecret: null, demoMode: false },
          workspaceUrl: "/call-center-app/team",
        });
        return;
      }
    }

    await seedPbxDemoIfEmpty();
    const result = await agentLogin(username, password);
    if (!result) {
      res.status(401).json({ ok: false, error: "Geçersiz kullanıcı adı veya şifre." });
      return;
    }
    const settings = await loadPbxSettings();
    const token = signPbxAgentToken(result.agent);
    res.json({
      ok: true,
      token,
      backend: "demo",
      agent: result.agent,
      sip: {
        wsUrl: settings.sipBridgeWsUrl,
        extension: result.agent.extension,
        sipSecret: result.extensionSecret,
        demoMode: settings.demoMode,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ ok: false, error: msg || "Sunucu hatası" });
  }
});

router.get("/pbx/agent/sip-credentials", async (req, res): Promise<void> => {
  const auth = await requireAgent(req, res);
  if (!auth) return;
  const verimorSip = await getAgentSipCredentials(auth.agentId);
  if (verimorSip) {
    res.json({ ok: true, sip: verimorSip, backend: "verimor" });
    return;
  }
  const threecxSip = await getThreeCxAgentSipCredentials(auth.agentId);
  if (threecxSip) {
    res.json({ ok: true, sip: threecxSip, backend: "3cx" });
    return;
  }
  const localSip = await getLocalAgentSipCredentials(auth.agentId);
  if (!localSip) {
    res.status(404).json({ ok: false, error: "SIP dahili tanımlı değil." });
    return;
  }
  if (!localSip.wssUrl) {
    res.status(503).json({ ok: false, error: "SIP WSS yapılandırın", backend: "local", sip: null });
    return;
  }
  res.json({
    ok: true,
    backend: "local",
    sip: {
      extension: localSip.extension,
      password: localSip.password,
      domain: localSip.domain,
      wssUrl: localSip.wssUrl,
      sipUri: localSip.sipUri,
      callerId: localSip.callerId,
    },
  });
});

router.get("/pbx/agent/campaigns", async (req, res): Promise<void> => {
  const auth = await requireAgent(req, res);
  if (!auth) return;
  const campaigns = await listAgentAvailableCampaigns(auth.agentId);
  const active = await getAgentActiveCampaign(auth.agentId);
  res.json({ ok: true, campaigns, activeCampaign: active });
});

router.post("/pbx/agent/campaigns/:id/join", async (req, res): Promise<void> => {
  const auth = await requireAgent(req, res);
  if (!auth) return;
  try {
    const agent = await joinAgentCampaign(auth.agentId, String(req.params.id));
    res.json({ ok: true, agent, message: "Kampanyaya katıldınız. Çağrı almaya hazırsınız." });
  } catch (e) {
    res.status(400).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

router.post("/pbx/agent/campaigns/leave", async (req, res): Promise<void> => {
  const auth = await requireAgent(req, res);
  if (!auth) return;
  const agent = await leaveAgentCampaign(auth.agentId);
  res.json({ ok: true, agent, message: "Kampanyadan ayrıldınız." });
});

router.post("/pbx/agent/campaigns/:id/leave", async (req, res): Promise<void> => {
  const auth = await requireAgent(req, res);
  if (!auth) return;
  const agent = await leaveAgentCampaign(auth.agentId);
  res.json({ ok: true, agent, message: "Kampanyadan ayrıldınız." });
});

router.get("/pbx/agent/webphone-token", async (req, res): Promise<void> => {
  const auth = await requireAgent(req, res);
  if (!auth) return;
  const agents = await listAgents();
  const agent = agents.find((a) => a.id === auth.agentId);
  if (!agent?.extension) {
    res.status(404).json({ ok: false, error: "Dahili bulunamadı." });
    return;
  }
  const refreshed = await refreshAgentWebphoneToken(agent.extension);
  if (!refreshed) {
    res.status(503).json({ ok: false, error: "Web telefon token alınamadı." });
    return;
  }
  res.json({ ok: true, webphone: refreshed });
});

router.get("/pbx/agent/verimor/campaigns", async (req, res): Promise<void> => {
  const auth = await requireAgent(req, res);
  if (!auth) return;
  const campaigns = (await listVerimorCampaigns()).filter((c) => c.enabled && c.queueNumber != null);
  res.json({ ok: true, campaigns });
});

router.post("/pbx/agent/verimor/campaigns/:queueNumber/join", async (req, res): Promise<void> => {
  const auth = await requireAgent(req, res);
  if (!auth) return;
  const agents = await listAgents();
  const agent = agents.find((a) => a.id === auth.agentId);
  if (!agent?.extension) {
    res.status(400).json({ ok: false, error: "Dahili atanmamış." });
    return;
  }
  const queueNumber = Number(req.params.queueNumber);
  const result = await joinVerimorCampaignQueue(agent.extension, queueNumber);
  if (!result.ok) {
    res.status(400).json({ ok: false, error: result.error ?? "Kuyruğa katılım başarısız." });
    return;
  }
  await setAgentStatus(auth.agentId, "available");
  res.json({ ok: true, message: `Kuyruk ${queueNumber} kampanyasına katıldınız.` });
});

router.post("/pbx/agent/verimor/campaigns/:queueNumber/leave", async (req, res): Promise<void> => {
  const auth = await requireAgent(req, res);
  if (!auth) return;
  const agents = await listAgents();
  const agent = agents.find((a) => a.id === auth.agentId);
  if (!agent?.extension) {
    res.status(400).json({ ok: false, error: "Dahili atanmamış." });
    return;
  }
  const queueNumber = Number(req.params.queueNumber);
  const result = await leaveVerimorCampaignQueue(agent.extension, queueNumber);
  if (!result.ok) {
    res.status(400).json({ ok: false, error: result.error ?? "Kuyruktan ayrılma başarısız." });
    return;
  }
  res.json({ ok: true, message: `Kuyruk ${queueNumber} kampanyasından ayrıldınız.` });
});

router.get("/pbx/agent/me", async (req, res): Promise<void> => {
  const auth = await requireAgent(req, res);
  if (!auth) return;
  const token = extractPbxAgentBearer(req);
  if (!token) {
    res.status(401).json({ ok: false, error: "Oturum gerekli." });
    return;
  }
  const agent = await resolveAgentFromToken(token);
  if (!agent) {
    res.status(404).json({ ok: false, error: "Agent bulunamadı." });
    return;
  }
  res.json({ ok: true, agent });
});

router.get("/pbx/agent/queues", async (req, res): Promise<void> => {
  const auth = await requireAgent(req, res);
  if (!auth) return;
  if ((await pbxBackendMode()) === "agentlabs") {
    res.json({ ok: true, queues: await fetchAgentLabsQueues() });
    return;
  }
  const agents = await listAgents();
  const agent = agents.find((a) => a.id === auth.agentId);
  if (!agent) {
    res.status(404).json({ ok: false, error: "Agent bulunamadı." });
    return;
  }
  const allQueues = await listQueues();
  const queues = allQueues.filter((q) => agent.queueIds.includes(q.id) && q.enabled);
  res.json({ ok: true, queues });
});

router.post("/pbx/agent/status", async (req, res): Promise<void> => {
  const auth = await requireAgent(req, res);
  if (!auth) return;
  const status = String((req.body as { status?: string }).status ?? "") as PbxAgentStatus;
  if (!VALID_STATUSES.includes(status)) {
    res.status(400).json({ ok: false, error: "Geçersiz durum." });
    return;
  }
  const token = extractPbxAgentBearer(req);
  const alToken = token ? unwrapAgentLabsToken(token) : null;
  if (alToken) {
    const member = await agentLabsTeamMe(alToken);
    if (!member) {
      res.status(401).json({ ok: false, error: "Oturum geçersiz." });
      return;
    }
    setAgentLabsAgentPresence(member.id, status);
    const agent = mapAgentLabsMemberToPbxAgent(member);
    agent.status = status;
    agent.statusLabelTr = agentStatusLabelTr(status);
    res.json({ ok: true, agent, statusLabelTr: agent.statusLabelTr });
    return;
  }
  const agent = await setAgentStatus(auth.agentId, status);
  res.json({ ok: true, agent, statusLabelTr: agent ? agentStatusLabelTr(agent.status) : null });
});

router.post("/pbx/agent/dial", async (req, res): Promise<void> => {
  const auth = await requireAgent(req, res);
  if (!auth) return;
  const phone = String((req.body as { phone?: string }).phone ?? "").trim();
  if (!phone) {
    res.status(400).json({ ok: false, error: "Telefon numarası zorunludur." });
    return;
  }
  const mode = await pbxBackendMode();
  if (mode === "verimor") {
    res.json({
      ok: true,
      clientSide: true,
      message: "Aramayı tarayıcı softphone ile başlatın.",
    });
    return;
  }
  const settings = await loadPbxSettings();
  if (settings.demoMode) {
    await setAgentStatus(auth.agentId, "on_call");
    res.json({
      ok: true,
      demoMode: true,
      message: `Demo arama başlatıldı: ${phone}`,
      callId: crypto.randomUUID(),
    });
    return;
  }
  res.status(503).json({
    ok: false,
    error: "SIP köprüsü yapılandırılmadı. PBX_BRIDGE_URL ayarlayın veya demo modunu açık tutun.",
  });
});

router.post("/pbx/agent/hangup", async (req, res): Promise<void> => {
  const auth = await requireAgent(req, res);
  if (!auth) return;
  const callUuid = String((req.body as { callId?: string }).callId ?? "").trim();
  const mode = await pbxBackendMode();
  if (mode === "verimor" && callUuid) {
    const config = await getVerimorConfig();
    if (config) await hangupVerimorCall(config, callUuid);
  }
  const agent = await setAgentStatus(auth.agentId, "wrap_up");
  res.json({ ok: true, agent, message: mode === "verimor" ? "Çağrı sonlandırıldı." : "Çağrı sonlandırıldı (demo)." });
});

router.get("/pbx/agent/disposition-codes", async (req, res): Promise<void> => {
  const auth = await requireAgent(req, res);
  if (!auth) return;
  try {
    const codes = await listAgentDispositionCodes(auth.agentId);
    res.json({ ok: true, codes });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ ok: false, error: msg || "Sonlandırma kodları alınamadı." });
  }
});

router.post("/pbx/agent/disposition", async (req, res): Promise<void> => {
  const auth = await requireAgent(req, res);
  if (!auth) return;
  try {
    const disposition = await submitAgentDisposition(auth.agentId, req.body as Record<string, unknown>);
    res.json({ ok: true, disposition });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(400).json({ ok: false, error: msg || "Sonlandırma kaydedilemedi." });
  }
});

/** İsteğe bağlı: ham PBX Gateway vekili (AMI / SIP köprü servisi) */
async function proxyPbxGateway(req: Request, res: Response, subPath: string): Promise<void> {
  const base = String(process.env.PBX_GATEWAY_URL ?? "").trim().replace(/\/+$/, "");
  if (!base) {
    res.status(503).json({ ok: false, error: "PBX Gateway yapılandırılmamış (PBX_GATEWAY_URL)." });
    return;
  }
  const url = `${base}/api/${subPath}`;
  const upper = req.method.toUpperCase();
  const hasBody = !["GET", "HEAD"].includes(upper) && req.body !== undefined;
  try {
    const upstream = await fetch(url, {
      method: upper,
      headers: {
        Accept: "application/json",
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        ...(req.headers.authorization ? { Authorization: String(req.headers.authorization) } : {}),
      },
      body: hasBody ? JSON.stringify(req.body) : undefined,
    });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") ?? "application/json");
    res.send(text);
  } catch (e) {
    res.status(502).json({
      ok: false,
      error: "PBX Gateway sunucusuna ulaşılamadı.",
      detail: e instanceof Error ? e.message : String(e),
    });
  }
}

router.get("/pbx/gateway/health", (req, res) => void proxyPbxGateway(req, res, "health"));
router.get("/pbx/gateway/events", (req, res) => void proxyPbxGateway(req, res, "events"));
router.get("/pbx/gateway/live/queue", (req, res) => void proxyPbxGateway(req, res, "live/queue"));
router.get("/pbx/gateway/live/agents", (req, res) => void proxyPbxGateway(req, res, "live/agents"));

startCampaignDialWorker();

export default router;
