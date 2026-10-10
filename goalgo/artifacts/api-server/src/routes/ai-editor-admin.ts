import { Router, type IRouter, type Request, type Response } from "express";
import { newsPool } from "@workspace/db";
import { denyUnlessAdminMaintenanceAny } from "../lib/admin-guard.js";
import { callChatWithLlmChain } from "../lib/hm-llm-chat.js";
import { loadEditorStatus, type Sql } from "../lib/ai-editor-activity.js";
import { applyStoredPlan, prepareChatPlan, undoEditorActivity } from "../lib/ai-editor-chat.js";

const router: IRouter = Router();

function phpSql(): Sql | null {
  const pool = newsPool;
  if (!pool) return null;
  return async (text, params = []) => {
    const result = await pool.query(text, params as never[]);
    return result.rows as Record<string, unknown>[];
  };
}

function allow(req: Request, res: Response): boolean {
  return denyUnlessAdminMaintenanceAny(req, res, ["haberler", "hm_sites"]);
}

/** Canlı durum: mevcut editör tabloları + olay günlüğü. Anahtar dönülmez. */
router.get("/hm/admin/ai-editor-status", async (req, res): Promise<void> => {
  if (!allow(req, res)) return;
  const sql = phpSql();
  if (!sql) {
    res.json({
      ok: true,
      warnings: ["PHP haber veritabanı (NEWS_DATABASE_URL) yapılandırılmamış"],
      running: [],
      providers: [],
      recent: [],
      sites: [],
      rss: [],
      daily: { rewritten: 0, published: 0, deduped: 0, hidden: 0, errors: 0, skipped: 0, columns: 0 },
      catalog: [],
    });
    return;
  }
  try {
    res.json(await loadEditorStatus(sql));
  } catch (err) {
    console.error("[ai-editor-status]", err instanceof Error ? err.message : err);
    res.status(500).json({ ok: false, error: "Durum raporu okunamadı" });
  }
});

/** Komutu eylem planına çevirir. Uygulamaz. */
router.post("/hm/admin/ai-editor-chat/plan", async (req, res): Promise<void> => {
  if (!allow(req, res)) return;
  const sql = phpSql();
  if (!sql) {
    res.status(503).json({ ok: false, error: "PHP haber veritabanı yapılandırılmamış" });
    return;
  }
  const message = String(req.body?.message || "");
  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  try {
    const plan = await prepareChatPlan(sql, { message, history }, async (system, user) => {
      const out = await callChatWithLlmChain({ siteId: null, system, user, temperature: 0.1 });
      return { text: out.text, provider: out.llmProvider, model: out.model };
    });
    res.status(plan.ok === false ? 400 : 200).json(plan);
  } catch (err) {
    console.error("[ai-editor-chat-plan]", err instanceof Error ? err.message : err);
    res.status(500).json({ ok: false, error: "Plan oluşturulamadı" });
  }
});

/** Kayıtlı planı ancak confirm:true ile uygular. İstek gövdesindeki eylem listesi yok sayılır. */
router.post("/hm/admin/ai-editor-chat/apply", async (req, res): Promise<void> => {
  if (!allow(req, res)) return;
  const sql = phpSql();
  if (!sql) {
    res.status(503).json({ ok: false, error: "PHP haber veritabanı yapılandırılmamış" });
    return;
  }
  try {
    const result = await applyStoredPlan(sql, { planId: req.body?.planId, confirm: req.body?.confirm });
    res.status(result.ok === false ? 400 : 200).json(result);
  } catch (err) {
    console.error("[ai-editor-chat-apply]", err instanceof Error ? err.message : err);
    res.status(500).json({ ok: false, error: "Plan uygulanamadı" });
  }
});

router.post("/hm/admin/ai-editor-chat/undo", async (req, res): Promise<void> => {
  if (!allow(req, res)) return;
  const sql = phpSql();
  if (!sql) {
    res.status(503).json({ ok: false, error: "PHP haber veritabanı yapılandırılmamış" });
    return;
  }
  try {
    const result = await undoEditorActivity(sql, Number(req.body?.id));
    res.status(result.ok === false ? 400 : 200).json(result);
  } catch (err) {
    console.error("[ai-editor-chat-undo]", err instanceof Error ? err.message : err);
    res.status(500).json({ ok: false, error: "Geri alınamadı" });
  }
});

export default router;
