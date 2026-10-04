import { Router, type IRouter, type Request, type Response } from "express";
import { denyUnlessAdminMaintenanceAny } from "../lib/admin-guard.js";
import { parseHmEditorFromRequest } from "../lib/hmEditorJwt.js";
import { isLlmProviderId, isMaskedKeyPlaceholder, type LlmProviderId } from "../lib/hm-llm-catalog.js";
import { callLlmAttempt } from "../lib/hm-llm-chat.js";
import {
  hmSiteIsCorporate,
  listLlmProvidersPublic,
  resolveStoredKeyForTest,
  saveLlmProviders,
  type LlmProviderPatch,
} from "../lib/hm-llm-store.js";

const router: IRouter = Router();

function editorCtx(req: Request, res: Response): { editorId: number; siteId: number } | null {
  const ctx = parseHmEditorFromRequest(req);
  if (!ctx) {
    res.status(401).json({ error: "Editör oturumu gerekli (Bearer token)." });
    return null;
  }
  return ctx;
}

async function denyCorporateEditor(siteId: number, res: Response): Promise<boolean> {
  if (!(await hmSiteIsCorporate(siteId))) return false;
  res.status(403).json({ error: "Yapay zekâ anahtarları yalnızca haber sitesi panelinde yönetilir." });
  return true;
}

function parsePatches(body: unknown): LlmProviderPatch[] | null {
  const raw = body && typeof body === "object" ? (body as { providers?: unknown }).providers : null;
  if (!Array.isArray(raw)) return null;
  const patches: LlmProviderPatch[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    if (!isLlmProviderId(row.provider)) return null;
    const patch: LlmProviderPatch = { provider: row.provider };
    if (typeof row.enabled === "boolean") patch.enabled = row.enabled;
    if (row.model != null) patch.model = String(row.model);
    if (row.priority != null) patch.priority = Number(row.priority);
    if (typeof row.apiKey === "string") patch.apiKey = row.apiKey;
    if (row.clearKey === true) patch.clearKey = true;
    patches.push(patch);
  }
  return patches;
}

router.get("/hm/llm-keys", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenanceAny(req, res, ["hm_sites", "site_ayarlari"])) return;
  try {
    const data = await listLlmProvidersPublic(null);
    res.setHeader("Cache-Control", "private, no-store");
    res.json({ scope: "global", providers: data.providers });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg.slice(0, 300) });
  }
});

router.put("/hm/llm-keys", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenanceAny(req, res, ["hm_sites", "site_ayarlari"])) return;
  const patches = parsePatches(req.body);
  if (!patches) {
    res.status(400).json({ error: "providers listesi gerekli" });
    return;
  }
  const err = await saveLlmProviders(null, patches);
  if (err) {
    res.status(400).json({ error: err });
    return;
  }
  const data = await listLlmProvidersPublic(null);
  res.json({ ok: true, scope: "global", providers: data.providers });
});

router.post("/hm/llm-keys/test", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenanceAny(req, res, ["hm_sites", "site_ayarlari"])) return;
  await runTest(req, res, null);
});

router.get("/hm/editor/llm-keys", async (req, res): Promise<void> => {
  const ctx = editorCtx(req, res);
  if (!ctx) return;
  if (await denyCorporateEditor(ctx.siteId, res)) return;
  try {
    const data = await listLlmProvidersPublic(ctx.siteId);
    res.setHeader("Cache-Control", "private, no-store");
    res.json({
      scope: "site",
      siteId: ctx.siteId,
      status: data.status,
      statusText: data.statusText,
      providers: data.providers,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg.slice(0, 300) });
  }
});

router.put("/hm/editor/llm-keys", async (req, res): Promise<void> => {
  const ctx = editorCtx(req, res);
  if (!ctx) return;
  if (await denyCorporateEditor(ctx.siteId, res)) return;
  const patches = parsePatches(req.body);
  if (!patches) {
    res.status(400).json({ error: "providers listesi gerekli" });
    return;
  }
  const err = await saveLlmProviders(ctx.siteId, patches);
  if (err) {
    res.status(400).json({ error: err });
    return;
  }
  const data = await listLlmProvidersPublic(ctx.siteId);
  res.json({
    ok: true,
    scope: "site",
    siteId: ctx.siteId,
    status: data.status,
    statusText: data.statusText,
    providers: data.providers,
  });
});

router.post("/hm/editor/llm-keys/test", async (req, res): Promise<void> => {
  const ctx = editorCtx(req, res);
  if (!ctx) return;
  if (await denyCorporateEditor(ctx.siteId, res)) return;
  await runTest(req, res, ctx.siteId);
});

async function runTest(req: Request, res: Response, siteId: number | null): Promise<void> {
  const body = (req.body ?? {}) as { provider?: unknown; apiKey?: unknown; model?: unknown };
  if (!isLlmProviderId(body.provider)) {
    res.status(400).json({ ok: false, error: "Geçersiz sağlayıcı" });
    return;
  }
  const provider: LlmProviderId = body.provider;
  let apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  if (isMaskedKeyPlaceholder(apiKey)) apiKey = "";
  let model = typeof body.model === "string" ? body.model.trim() : "";
  if (!apiKey) {
    const stored = await resolveStoredKeyForTest(siteId, provider);
    if (!stored) {
      res.status(400).json({
        ok: false,
        error:
          siteId == null
            ? "Bu sağlayıcı için kayıtlı merkez anahtarı yok."
            : "Bu sağlayıcı için kayıtlı anahtar yok.",
      });
      return;
    }
    apiKey = stored.apiKey;
    if (!model) model = stored.model;
  }
  const result = await callLlmAttempt(
    {
      provider,
      apiKey,
      model: model || "auto",
      scope: siteId == null ? "global" : "site",
      rowId: null,
    },
    {
      system: "Sen bir test asistanısın.",
      user: "Sadece tam olarak şu iki harfi büyük harfle yaz: OK",
      temperature: 0,
    },
  );
  const text = String(result.text ?? "").trim();
  if (/\bOK\b/i.test(text)) {
    res.json({ ok: true, provider, model: model || provider, message: "Bağlantı başarılı" });
    return;
  }
  const detail = String(result.detail || "Bağlantı kurulamadı").split(apiKey).join("••••");
  res.status(502).json({
    ok: false,
    provider,
    error: detail.slice(0, 280),
  });
}

export default router;
