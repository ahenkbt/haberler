import { Router, type IRouter } from "express";
import { denyUnlessAdminMaintenance } from "../lib/admin-guard.js";
import { startCampaign, stopCampaign } from "../lib/ai-call/campaign-runner.js";
import { isNativeAiCallEnabled } from "../lib/ai-call/config.js";
import { testProviderConnection, chatWithProvider } from "../lib/ai-call/provider-router.js";
import {
  deleteAssistant,
  deleteCampaign,
  deleteFlow,
  ensureAiCallTables,
  getAssistant,
  getNativeStatus,
  getSettingsPublic,
  listAssistants,
  listCampaignContacts,
  listCampaigns,
  listFlows,
  listLogs,
  seedDemoIfEmpty,
  updateSettings,
  upsertAssistant,
  upsertCampaign,
  upsertFlow,
} from "../lib/ai-call/service.js";

const router: IRouter = Router();

function nativeDisabled(_req: import("express").Request, res: import("express").Response): boolean {
  if (isNativeAiCallEnabled()) return false;
  res.status(503).json({
    ok: false,
    error: "Yerel AI Call devre dışı (USE_NATIVE_AI_CALL=false). AgentLabs vekili kullanın.",
  });
  return true;
}

/** Herkese açık: yerel platform durumu */
router.get("/ai-call/public/status", async (_req, res): Promise<void> => {
  if (!isNativeAiCallEnabled()) {
    res.json({ ok: true, native: false, message: "AgentLabs modu aktif." });
    return;
  }
  await ensureAiCallTables();
  const status = await getNativeStatus();
  res.setHeader("Cache-Control", "public, max-age=30");
  res.json({ ok: true, ...status });
});

/** Yönetim: genel durum */
router.get("/ai-call/admin/status", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  if (nativeDisabled(req, res)) return;
  await ensureAiCallTables();
  const status = await getNativeStatus();
  res.json({ ok: true, ...status });
});

/** Yönetim: ayarlar */
router.get("/ai-call/admin/settings", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  if (nativeDisabled(req, res)) return;
  const settings = await getSettingsPublic();
  res.json({ ok: true, settings });
});

router.put("/ai-call/admin/settings", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  if (nativeDisabled(req, res)) return;
  try {
    const settings = await updateSettings(req.body as Record<string, unknown>);
    res.json({ ok: true, settings });
  } catch (err) {
    res.status(400).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

router.post("/ai-call/admin/settings/test-openai", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  if (nativeDisabled(req, res)) return;
  const body = req.body as { apiKey?: string; model?: string };
  const result = await testProviderConnection("openai", body.apiKey, body.model);
  res.status(result.ok ? 200 : 400).json(result);
});

router.post("/ai-call/admin/settings/test-gemini", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  if (nativeDisabled(req, res)) return;
  const body = req.body as { apiKey?: string; model?: string };
  const result = await testProviderConnection("gemini", body.apiKey, body.model);
  res.status(result.ok ? 200 : 400).json(result);
});

router.post("/ai-call/admin/seed-demo", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  if (nativeDisabled(req, res)) return;
  const result = await seedDemoIfEmpty();
  res.json({ ok: true, ...result });
});

/** Asistanlar CRUD */
router.get("/ai-call/admin/assistants", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  if (nativeDisabled(req, res)) return;
  res.json({ ok: true, assistants: await listAssistants() });
});

router.post("/ai-call/admin/assistants", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  if (nativeDisabled(req, res)) return;
  try {
    const assistant = await upsertAssistant(req.body as Record<string, unknown>);
    res.json({ ok: true, assistant });
  } catch (err) {
    res.status(400).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

router.delete("/ai-call/admin/assistants/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  if (nativeDisabled(req, res)) return;
  await deleteAssistant(String(req.params.id));
  res.json({ ok: true });
});

/** Kampanyalar CRUD */
router.get("/ai-call/admin/campaigns", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  if (nativeDisabled(req, res)) return;
  res.json({ ok: true, campaigns: await listCampaigns() });
});

router.post("/ai-call/admin/campaigns", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  if (nativeDisabled(req, res)) return;
  try {
    const campaign = await upsertCampaign(req.body as Record<string, unknown>);
    res.json({ ok: true, campaign });
  } catch (err) {
    res.status(400).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/ai-call/admin/campaigns/:id/contacts", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  if (nativeDisabled(req, res)) return;
  res.json({ ok: true, contacts: await listCampaignContacts(String(req.params.id)) });
});

router.delete("/ai-call/admin/campaigns/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  if (nativeDisabled(req, res)) return;
  await stopCampaign(String(req.params.id));
  await deleteCampaign(String(req.params.id));
  res.json({ ok: true });
});

router.post("/ai-call/admin/campaigns/:id/start", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  if (nativeDisabled(req, res)) return;
  const result = await startCampaign(String(req.params.id));
  res.status(result.ok ? 200 : 400).json(result);
});

router.post("/ai-call/admin/campaigns/:id/stop", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  if (nativeDisabled(req, res)) return;
  await stopCampaign(String(req.params.id));
  res.json({ ok: true });
});

/** Akışlar / IVR */
router.get("/ai-call/admin/flows", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  if (nativeDisabled(req, res)) return;
  res.json({ ok: true, flows: await listFlows() });
});

router.post("/ai-call/admin/flows", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  if (nativeDisabled(req, res)) return;
  try {
    const flow = await upsertFlow(req.body as Record<string, unknown>);
    res.json({ ok: true, flow });
  } catch (err) {
    res.status(400).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});

router.delete("/ai-call/admin/flows/:id", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  if (nativeDisabled(req, res)) return;
  await deleteFlow(String(req.params.id));
  res.json({ ok: true });
});

/** Çağrı kayıtları */
router.get("/ai-call/admin/logs", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  if (nativeDisabled(req, res)) return;
  const limit = req.query.limit != null ? Number(req.query.limit) : 100;
  res.json({ ok: true, logs: await listLogs(limit) });
});

/** Sağlık kontrolü (yerel) */
router.get("/ai-call/health", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  if (nativeDisabled(req, res)) return;
  const started = Date.now();
  await ensureAiCallTables();
  const status = await getNativeStatus();
  res.json({
    ...status,
    ok: status.configured,
    status: status.configured ? "ok" : "needs_setup",
    latencyMs: Date.now() - started,
  });
});

/** Demo sohbet — asistan testi */
router.post("/ai-call/admin/assistants/:id/chat", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "comms")) return;
  if (nativeDisabled(req, res)) return;
  const assistant = await getAssistant(String(req.params.id));
  if (!assistant) {
    res.status(404).json({ ok: false, error: "Asistan bulunamadı." });
    return;
  }
  const message = String((req.body as { message?: string }).message ?? "").trim();
  if (!message) {
    res.status(400).json({ ok: false, error: "Mesaj zorunludur." });
    return;
  }
  const result = await chatWithProvider(assistant, message);
  res.status(result.ok ? 200 : 400).json(result);
});

export default router;
