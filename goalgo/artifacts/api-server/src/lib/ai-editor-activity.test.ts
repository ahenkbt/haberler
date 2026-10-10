import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import {
  ACTIVITY_DDL,
  classifyArticleRow,
  dedupeCountFromStats,
  loadEditorStatus,
  quotaUsedPercent,
  resetAiEditorActivityCacheForTests,
  scrubSecrets,
  type Sql,
} from "./ai-editor-activity.js";
import {
  applyStoredPlan,
  assertApplyConfirm,
  parseModelPlan,
  parseTurkishCommand,
  prepareChatPlan,
  sanitizeHtml,
  undoEditorActivity,
} from "./ai-editor-chat.js";

const migration = readFileSync(new URL("../../../../lib/db/migrations-news/0017_ai_editor_activity.sql", import.meta.url), "utf8");
const chatSource = readFileSync(new URL("./ai-editor-chat.ts", import.meta.url), "utf8");
const routeSource = readFileSync(new URL("../routes/ai-editor-admin.ts", import.meta.url), "utf8");

beforeEach(() => {
  resetAiEditorActivityCacheForTests();
});

describe("ai editor activity", () => {
  it("creates the event table idempotently and never drops data", () => {
    expect(ACTIVITY_DDL.join("\n")).toContain("CREATE TABLE IF NOT EXISTS ai_editor_activity");
    expect(ACTIVITY_DDL.join("\n")).toContain("CREATE OR REPLACE FUNCTION ai_editor_activity_write");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS ai_editor_activity");
    expect(migration).toContain("IF NOT EXISTS");
    expect(migration.toLowerCase()).not.toContain("drop table");
    expect(chatSource).not.toMatch(/DELETE\s+FROM\s+news/i);
  });

  it("strips secrets from strings and object keys", () => {
    const clean = scrubSecrets({
      apiKey: "sk-live-secretvalue",
      note: "anahtar sk-abcdef123456 kullanıldı",
      nested: { authorization: "Bearer abcdefghijklmnop" },
    });
    expect(clean).not.toHaveProperty("apiKey");
    expect(JSON.stringify(clean)).not.toContain("sk-");
    expect(JSON.stringify(clean)).not.toContain("abcdefghijklmnop");
  });

  it("labels editor rows and quota use", () => {
    expect(classifyArticleRow({ status: "published", ai_model: "deepseek-v4-flash" }).label).toBe("haber yeniden yazdı");
    expect(classifyArticleRow({ status: "published", ai_model: "curate" }).label).toBe("manşete aldı (kaynak metin)");
    expect(classifyArticleRow({ status: "error" }).action).toBe("error");
    expect(classifyArticleRow({ status: "skipped" }).action).toBe("skip");
    expect(classifyArticleRow({ status: "hidden" }).action).toBe("hide");
    expect(classifyArticleRow({ status: "published", category_slug: "kose-yazilari", ai_model: "curate" }).action).toBe("column");
    expect(dedupeCountFromStats({ fetch: { dup_link: 2, dup_title: 3 } })).toBe(5);
    expect(quotaUsedPercent({ daily_tokens_limit: 200, daily_tokens_left: 50 })).toBe(75);
    expect(quotaUsedPercent({})).toBeNull();
  });

  it("keeps the admin route on the existing LLM chain and an admin session", () => {
    expect(routeSource).toContain("callChatWithLlmChain");
    expect(routeSource).toContain('denyUnlessAdminMaintenanceAny(req, res, ["haberler", "hm_sites"])');
    expect(routeSource).toContain("planId: req.body?.planId, confirm: req.body?.confirm");
    expect(routeSource).not.toContain("req.body.actions");
    expect(routeSource).not.toContain("EVREN_API_KEY");
  });
});

describe("editor chat plan", () => {
  it("parses fenced JSON and turns delete into hide", () => {
    const parsed = parseModelPlan('```json\n{"note":"tamam","actions":[{"action":"delete_article"}]}\n```');
    expect("error" in parsed).toBe(false);
    if ("error" in parsed) return;
    expect(parsed.note).toBe("tamam");
    expect(parsed.actions).toHaveLength(1);
    const tr = parseTurkishCommand("123 numaralı haberi vatanhaber.com sitesinden sil");
    expect(tr?.actions[0]).toMatchObject({ action: "hide_article", site: "vatanhaber.com" });
    expect(parseTurkishCommand("vatanhaber.com künye metnini güncelle: Yeni künye")?.actions[0]).toMatchObject({
      action: "edit_page",
    });
    expect(assertApplyConfirm({ planId: 4, confirm: false })).toEqual({ ok: false, error: "Onay gerekli. Plan uygulanmadı." });
    expect(sanitizeHtml('<script>alert(1)</script><p onclick="x">metin</p>')).not.toContain("script");
    expect(sanitizeHtml('<p onclick="x">metin</p>')).not.toContain("onclick");
  });

  it("hides a news row only after confirm and does not delete it", async () => {
    const db = memory();
    const llm = async () => ({
      text: JSON.stringify({
        note: "gizlenecek",
        actions: [{ action: "delete_article", site: "vatanhaber.com", target: { id: 123 } }],
      }),
      provider: "evren",
      model: "deepseek-v4-flash",
    });
    const plan = await prepareChatPlan(db.sql, { message: "123 numaralı haberi sil" }, llm);
    expect(plan.confirmAllowed).toBe(true);
    expect(JSON.stringify(plan.actions)).toContain("Silme yok");
    const refused = await applyStoredPlan(db.sql, { planId: plan.planId, confirm: false });
    expect(refused.ok).toBe(false);
    expect(db.hidden).toHaveLength(0);
    const applied = await applyStoredPlan(db.sql, { planId: plan.planId, confirm: true });
    expect(applied.ok).toBe(true);
    expect(db.hidden).toHaveLength(1);
    expect(db.hidden[0].reason).toBe("editor_pasif");
    expect(db.news.find((n) => n.id === 123)?.status).toBe("published");
    expect(db.log.join("\n")).not.toMatch(/DELETE\s+FROM\s+news/i);
    const hideRow = db.activity.find((row) => row.action === "hide_article" && row.undo);
    expect(hideRow?.id).toBeTruthy();
    const undone = await undoEditorActivity(db.sql, Number(hideRow?.id));
    expect(undone.ok).toBe(true);
    expect(db.hidden).toHaveLength(0);
  });

  it("copies a site-only article, edits a page, and leaves soon actions unapplied", async () => {
    const db = memory();
    const copyPlan = await prepareChatPlan(db.sql, { message: "dağıt" }, async () => ({
      text: JSON.stringify({
        note: "dağıt",
        actions: [{ action: "distribute_article", sites: ["yesilvatan.gen.tr"], target: { id: 123 } }],
      }),
      provider: "evren2",
      model: "deepseek-v4-flash",
    }));
    expect(copyPlan.confirmAllowed).toBe(true);
    const copied = await applyStoredPlan(db.sql, { planId: copyPlan.planId, confirm: true });
    expect(copied.ok).toBe(true);
    expect(db.news.some((n) => n.id === 2100000001 && n.site_id === 2 && n.status === "published")).toBe(true);
    const dist = db.activity.find((row) => row.action === "distribute_article");
    expect((await undoEditorActivity(db.sql, Number(dist?.id))).ok).toBe(true);
    expect(db.news.find((n) => n.id === 2100000001)?.status).toBe("draft");

    const pagePlan = await prepareChatPlan(db.sql, { message: "künye" }, async () => ({
      text: JSON.stringify({
        note: "künye",
        actions: [{ action: "edit_page", site: "vatanhaber.com", params: { pageKey: "kunye", html: "Yeni künye metni" } }],
      }),
      provider: "nvidia",
      model: "nemotron",
    }));
    expect(pagePlan.confirmAllowed).toBe(true);
    expect((await applyStoredPlan(db.sql, { planId: pagePlan.planId, confirm: true })).ok).toBe(true);
    expect((db.sites[0].layout_json as { hmCorporatePageHtml: { kunye: string } }).hmCorporatePageHtml.kunye).toBe("<p>Yeni künye metni</p>");

    const soon = await prepareChatPlan(db.sql, { message: "reklam ekle" }, async () => ({
      text: "",
      provider: null,
      model: null,
    }));
    expect(soon.confirmAllowed).toBe(false);
    expect(JSON.stringify(soon.actions)).toContain("yakında");
    const before = db.news.length;
    if (soon.planId) await applyStoredPlan(db.sql, { planId: soon.planId, confirm: true });
    expect(db.news).toHaveLength(before);
    expect(db.log.join("\n")).not.toMatch(/DELETE\s+FROM\s+news/i);
  });

  it("reads a status report without failing when optional tables are empty", async () => {
    const db = memory();
    const report = await loadEditorStatus(db.sql);
    expect(report.ok).toBe(true);
    const providers = report.providers as Array<{ provider: string }>;
    expect(providers.map((p) => p.provider)).toEqual(expect.arrayContaining(["evren", "evren2", "nvidia", "gemini", "openai"]));
    expect(JSON.stringify(report)).not.toMatch(/sk-|apiKey|BEGIN /);
    expect((report.daily as { rewritten: number; deduped: number }).rewritten).toBe(3);
    expect((report.daily as { deduped: number }).deduped).toBe(3);
  });
});

type Row = Record<string, unknown>;

function memory() {
  const log: string[] = [];
  let seq = 1;
  const activity: Row[] = [];
  const hidden: Row[] = [];
  const news: Row[] = [{
    id: 123,
    title: "Deneme haber başlığı uzun",
    slug: "deneme-haber",
    spot: "eski özet",
    content: "<p>eski</p>",
    site_id: 1,
    site_only: true,
    image_url: "",
    category_id: 3,
    tags: ["a"],
    status: "published",
  }];
  const sites: Row[] = [
    { id: 1, slug: "vatan", domain: "vatanhaber.com", display_name: "Vatan", active: true, layout_json: { hmCorporatePageHtml: { kunye: "eski künye" } } },
    { id: 2, slug: "yesil", domain: "yesilvatan.gen.tr", display_name: "Yeşil", active: true, layout_json: {} },
  ];
  const sql: Sql = async (text, params = []) => {
    const t = text.replace(/\s+/g, " ").trim();
    log.push(t);
    if (t.startsWith("CREATE")) return [];
    if (t.includes("FROM hm_news_sites") && t.includes("display_name")) return sites;
    if (t.startsWith("INSERT INTO ai_editor_activity")) {
      const id = seq++;
      activity.push({
        id,
        action: params[3],
        status: params[4],
        summary: params[5],
        detail: params[7] ? JSON.parse(String(params[7])) : {},
        undo: params[8] ? JSON.parse(String(params[8])) : null,
        undone_at: null,
        site_id: params[1],
        site_domain: params[2],
      });
      return [{ id }];
    }
    if (t.includes("FROM news WHERE id = $1") && t.includes("site_only")) {
      return news.filter((n) => n.id === Number(params[0])).map((n) => ({ id: n.id, title: n.title, slug: n.slug, site_id: n.site_id, site_only: n.site_only }));
    }
    if (t.includes("title ILIKE")) return [];
    if (t.includes("FROM portal_rss_items")) return [];
    if (t.includes("SELECT reason FROM hm_site_content_hidden")) {
      return hidden.filter((h) => h.site_id === params[0] && h.public_slug === params[1] && h.title === params[2] && (!t.includes("NOT IN") || !["editor_pasif", "chat_editor"].includes(String(h.reason))));
    }
    if (t.startsWith("INSERT INTO hm_site_content_hidden")) {
      hidden.push({ site_id: params[0], public_slug: params[1], title: params[2], kind: params[3], ref_id: params[4], reason: t.includes("'editor_pasif'") ? "editor_pasif" : params[5] });
      return [];
    }
    if (t.startsWith("DELETE FROM hm_site_content_hidden")) {
      const idx = hidden.findIndex((h) => h.site_id === params[0] && h.public_slug === params[1] && h.title === params[2]);
      if (idx < 0) return [];
      const [row] = hidden.splice(idx, 1);
      return [row];
    }
    if (t.includes("status = 'applying'") && t.includes("RETURNING")) {
      const row = activity.find((a) => a.id === Number(params[0]) && a.action === "chat_plan" && a.status === "pending");
      if (!row) return [];
      row.status = "applying";
      return [{ id: row.id, detail: row.detail }];
    }
    if (t.includes("SET status = 'pending'") && t.includes("chat_plan") && t.includes("applying") && !t.includes("WHERE id = $1")) {
      for (const row of activity) if (row.action === "chat_plan" && row.status === "applying") row.status = "pending";
      return [];
    }
    if (t.includes("SET status = 'pending' WHERE id")) {
      const row = activity.find((a) => a.id === Number(params[0]));
      if (row && row.status === "applying") row.status = "pending";
      return [];
    }
    if (t.includes("SET status = 'applied'")) {
      const row = activity.find((a) => a.id === Number(params[0]));
      if (row) row.status = "applied";
      return [];
    }
    if (t.includes("SELECT id, title, spot, content FROM news")) return news.filter((n) => n.id === Number(params[0]));
    if (t.startsWith("UPDATE news SET title")) {
      const row = news.find((n) => n.id === Number(params[0]));
      if (row) {
        row.title = params[1];
        row.spot = params[2];
        row.content = params[3];
      }
      return [];
    }
    if (t.includes("SELECT layout_json FROM hm_news_sites")) {
      return sites.filter((s) => s.id === Number(params[0])).map((s) => ({ layout_json: s.layout_json }));
    }
    if (t.includes("UPDATE hm_news_sites SET layout_json")) {
      const row = sites.find((s) => s.id === Number(params[0]));
      if (row) row.layout_json = JSON.parse(String(params[1]));
      return [];
    }
    if (t.includes("FROM news WHERE site_id = $1")) {
      return news.filter((n) => n.site_id === Number(params[0]) && (n.slug === params[1] || n.title === params[2]));
    }
    if (t.includes("SELECT title, slug, spot, content, image_url")) return news.filter((n) => n.id === Number(params[0]));
    if (t.includes("GREATEST")) return [{ next: 2100000001 }];
    if (t.startsWith("INSERT INTO news")) {
      news.push({
        id: Number(params[0]),
        title: params[1],
        slug: params[2],
        spot: params[3],
        content: params[4],
        image_url: params[5],
        category_id: params[6],
        tags: params[7],
        status: "published",
        site_id: params[8],
        site_only: true,
      });
      return [];
    }
    if (t.includes("SET status = 'draft'")) {
      const ids = Array.isArray(params[0]) ? params[0].map(Number) : [];
      for (const row of news) if (ids.includes(Number(row.id))) row.status = "draft";
      return [];
    }
    if (t.includes("FROM ai_editor_activity WHERE id = $1")) return activity.filter((a) => a.id === Number(params[0]));
    if (t.includes("undone_at = now()")) {
      const row = activity.find((a) => a.id === Number(params[0]));
      if (row) row.undone_at = "now";
      return [];
    }
    if (t.includes("hm_ai_provider_quota")) {
      return [{ scope: "global", provider: "evren", model: "deepseek-v4-flash", status: "ok", remaining: { daily_tokens_limit: 100, daily_tokens_left: 40 }, error: "sk-should-not-leak", checked_at: null }];
    }
    if (t.includes("hm_ai_provider_usage")) return [{ provider: "evren", calls: 2, failed: 1, tokens: 50 }];
    if (t.includes("hm_ai_editor_articles") && t.includes("rewritten")) return [{ rewritten: 3, published: 4, errors: 0, skipped: 0, columns: 0 }];
    if (t.includes("hm_ai_editor_runs") && t.includes("stats")) return [{ stats: { fetch: { dup_link: 2, dup_title: 1 } }, status: "ok" }];
    if (t.includes("hm_ai_editor") || t.includes("hm_bekci_requests") || t.includes("information_schema") || t.includes("ai_editor_activity") || t.includes("rssrw_state_")) return [];
    throw new Error(`unhandled sql: ${t.slice(0, 200)}`);
  };
  return { sql, log, hidden, news, sites, activity };
}
