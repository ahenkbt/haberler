import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HM_CONCEPT_TOPICS, normalizeHmConceptTopic } from "./hm-site-kind.js";
import {
  aiEditorConceptType,
  enrollNewNewsSiteAiEditor,
  keywordSqlExpr,
  keywordSqlValue,
  keywordsForConceptTopic,
  loadAiEditorEnrollments,
  normalizeConceptPrompt,
  parseAiEditorEnabled,
  patchAiEditorSite,
  type AiEditorSql,
} from "./hm-ai-editor-enroll.js";

const migration = readFileSync(
  new URL("../../../../lib/db/migrations-news/0018_hm_ai_editor_site_concept.sql", import.meta.url),
  "utf8",
);
const journal = readFileSync(
  new URL("../../../../lib/db/migrations-news/meta/_journal.json", import.meta.url),
  "utf8",
);
const vpsPatch = readFileSync(
  new URL("../../../../../cloudflare/hm-bekci/vps/ai_editor-concept-prompt.patch", import.meta.url),
  "utf8",
);
const vpsScript = readFileSync(
  new URL("../../../../../cloudflare/hm-bekci/vps/patch_concept_prompt.py", import.meta.url),
  "utf8",
);
const worker = readFileSync(new URL("../../../../../cloudflare/hm-bekci/src/index.js", import.meta.url), "utf8");

type Call = { text: string; params: unknown[] };

function fakeSql(opts?: { failInsert?: boolean; noTable?: boolean; existingId?: number | null }): {
  sql: AiEditorSql;
  calls: Call[];
} {
  const calls: Call[] = [];
  const sql: AiEditorSql = async (text, params = []) => {
    calls.push({ text, params });
    if (text.includes("to_regclass")) return opts?.noTable ? [{ rel: null }] : [{ rel: "hm_ai_editor_sites" }];
    if (text.includes("pg_constraint")) return [{ ok: 1 }];
    if (text.startsWith("ALTER")) return [];
    if (text.includes("column_name = 'keywords'")) return [{ data_type: "ARRAY", udt_name: "_text" }];
    if (text.includes("column_name = 'updated_at'")) return [{ ok: 1 }];
    if (text.includes("FROM hm_news_sites")) return [{ id: 77 }];
    if (text.includes("FROM hm_ai_editor_sites WHERE site_id")) {
      return opts?.existingId ? [{ site_id: opts.existingId }] : [];
    }
    if (text.includes("FROM hm_ai_editor_sites WHERE site_slug")) return [];
    if (text.includes("FROM hm_ai_editor_sites") && !text.startsWith("UPDATE") && !text.startsWith("INSERT")) {
      return [
        {
          site_id: 77,
          site_slug: "adana",
          enabled: true,
          concept_prompt: "yalnız ekonomi",
          content_mode: "curate",
          auto_created: true,
        },
      ];
    }
    if (text.startsWith("INSERT")) {
      if (opts?.failInsert) throw new Error("insert boom");
      return [];
    }
    if (text.startsWith("UPDATE")) return [];
    return [];
  };
  return { sql, calls };
}

describe("konsept konu ve anahtar kelime", () => {
  it("ekonomi listeye girer", () => {
    expect(HM_CONCEPT_TOPICS).toContain("ekonomi");
    expect(normalizeHmConceptTopic("Ekonomi")).toBe("ekonomi");
  });

  it("konsept site topical, genel site genel", () => {
    expect(aiEditorConceptType(true)).toBe("topical");
    expect(aiEditorConceptType(false)).toBe("genel");
  });

  it("anahtar kelimeler konudan türer; genel sitede boş", () => {
    expect(keywordsForConceptTopic(false, "ekonomi")).toEqual([]);
    expect(keywordsForConceptTopic(true, "ekonomi")).toContain("enflasyon");
    expect(keywordsForConceptTopic(true, "bilinmeyen")).toEqual([]);
    expect(keywordsForConceptTopic(true, "diger")).toEqual([]);
  });

  it("aiEditorEnabled varsayılanı açık", () => {
    expect(parseAiEditorEnabled(undefined)).toBe(true);
    expect(parseAiEditorEnabled(null)).toBe(true);
    expect(parseAiEditorEnabled(false)).toBe(false);
    expect(parseAiEditorEnabled("false")).toBe(false);
    expect(parseAiEditorEnabled(true)).toBe(true);
  });

  it("boş konsept talimatı null olur", () => {
    expect(normalizeConceptPrompt("  ")).toBeNull();
    expect(normalizeConceptPrompt("  piyasa  ")).toBe("piyasa");
  });
});

describe("hm_ai_editor_sites yazımı", () => {
  it("yeni haber sitesine curate ve auto_created yazar", async () => {
    const { sql, calls } = fakeSql();
    const result = await enrollNewNewsSiteAiEditor(sql, {
      siteId: 9,
      siteSlug: "adana",
      domain: "adana.gundemi.org",
      conceptSite: true,
      conceptTopic: "ekonomi",
      conceptPrompt: "Yalnız piyasa",
      enabled: undefined,
    });
    expect(result.ok).toBe(true);
    expect(result.warning).toBeUndefined();
    const insert = calls.find((c) => c.text.startsWith("INSERT INTO hm_ai_editor_sites"));
    expect(insert?.text).toContain("'curate'");
    expect(insert?.text).toContain("true");
    expect(insert?.text).not.toMatch(/content_mode\s*=/);
    expect(insert?.params[0]).toBe(77);
    expect(insert?.params[3]).toBe("topical");
    expect(insert?.params[4]).toEqual(expect.arrayContaining(["enflasyon"]));
    expect(insert?.params[5]).toBe(true);
    expect(insert?.params[6]).toBe("Yalnız piyasa");
    expect(calls.some((c) => c.text.startsWith("UPDATE"))).toBe(false);
  });

  it("genel sitede concept_type genel ve kelime boş", async () => {
    const { sql, calls } = fakeSql();
    await enrollNewNewsSiteAiEditor(sql, {
      siteId: 9,
      siteSlug: "genel",
      domain: "genel.gundemi.org",
      conceptSite: false,
      enabled: false,
    });
    const insert = calls.find((c) => c.text.startsWith("INSERT"));
    expect(insert?.params[3]).toBe("genel");
    expect(insert?.params[4]).toEqual([]);
    expect(insert?.params[5]).toBe(false);
    expect(insert?.params[6]).toBeNull();
  });

  it("insert hatası warning döner, fırlatmaz", async () => {
    const { sql } = fakeSql({ failInsert: true });
    const result = await enrollNewNewsSiteAiEditor(sql, {
      siteId: 3,
      siteSlug: "x",
      domain: "x.gundemi.org",
      conceptSite: false,
    });
    expect(result.ok).toBe(false);
    expect(result.warning).toMatch(/yazılamadı/);
  });

  it("tablo yoksa site akışını bozmaz", async () => {
    const { sql, calls } = fakeSql({ noTable: true });
    const result = await enrollNewNewsSiteAiEditor(sql, {
      siteId: 3,
      siteSlug: "x",
      domain: null,
      conceptSite: false,
    });
    expect(result.ok).toBe(false);
    expect(result.warning).toMatch(/tablosu yok/);
    expect(calls.some((c) => c.text.startsWith("INSERT"))).toBe(false);
  });

  it("sql yoksa warning", async () => {
    const result = await enrollNewNewsSiteAiEditor(null, {
      siteId: 1,
      siteSlug: "a",
      domain: null,
      conceptSite: false,
    });
    expect(result.ok).toBe(false);
    expect(result.warning).toMatch(/yapılandırılmamış/);
  });
});

describe("PATCH mevcut kaydı günceller, yenisini açmaz", () => {
  it("kayıt yoksa INSERT yapmaz", async () => {
    const { sql, calls } = fakeSql({ existingId: null });
    const result = await patchAiEditorSite(sql, {
      siteId: 9,
      siteSlug: "eski",
      domain: "eski.gundemi.org",
      enabled: false,
      conceptPrompt: null,
    });
    expect(result.ok).toBe(true);
    expect(result.updated).toBe(false);
    expect(result.warning).toBeUndefined();
    expect(calls.some((c) => c.text.startsWith("INSERT"))).toBe(false);
    expect(calls.some((c) => c.text.startsWith("UPDATE"))).toBe(false);
  });

  it("açmak isteyip kayıt yoksa uyarır, yine de eklemez", async () => {
    const { sql, calls } = fakeSql();
    const result = await patchAiEditorSite(sql, {
      siteId: 9,
      siteSlug: "eski",
      domain: "eski.gundemi.org",
      enabled: true,
      conceptPrompt: "ekonomi",
    });
    expect(result.updated).toBe(false);
    expect(result.warning).toMatch(/otomatik eklenmez/);
    expect(calls.some((c) => c.text.startsWith("INSERT"))).toBe(false);
  });

  it("var olan satırda talimat ve enabled güncellenir; mod ve auto_created sabit", async () => {
    const { sql, calls } = fakeSql({ existingId: 77 });
    const result = await patchAiEditorSite(sql, {
      siteId: 9,
      siteSlug: "adana",
      domain: "adana.gundemi.org",
      enabled: false,
      conceptPrompt: "yeni talimat",
    });
    expect(result.ok).toBe(true);
    expect(result.updated).toBe(true);
    const update = calls.find((c) => c.text.startsWith("UPDATE hm_ai_editor_sites"));
    expect(update?.text).toContain("concept_prompt");
    expect(update?.text).toContain("enabled");
    expect(update?.text).not.toContain("content_mode");
    expect(update?.text).not.toContain("auto_created");
    expect(update?.text).toContain("WHERE site_id = $1");
    expect(update?.params[0]).toBe(77);
  });
});

describe("okuma", () => {
  it("kayıtları döner", async () => {
    const { sql } = fakeSql();
    const loaded = await loadAiEditorEnrollments(sql);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.rows[0]).toMatchObject({
      siteSlug: "adana",
      enabled: true,
      conceptPrompt: "yalnız ekonomi",
      contentMode: "curate",
      autoCreated: true,
    });
  });
});

describe("migration 0018", () => {
  it("IF NOT EXISTS kolon ekler, satır güncellemez, yedek gerekmez", () => {
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS concept_prompt text");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS content_mode text NOT NULL DEFAULT 'curate'");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS auto_created boolean NOT NULL DEFAULT false");
    expect(migration).toContain("hm_ai_editor_sites_content_mode_chk");
    expect(migration).toContain("('curate', 'generate')");
    expect(migration).toMatch(/yedek gerekmez/i);
    expect(migration).toContain("to_regclass");
    expect(migration).not.toMatch(/^\s*UPDATE\b/im);
    expect(migration).not.toMatch(/^\s*DELETE\b/im);
    expect(migration).not.toMatch(/^\s*DROP\b/im);
    expect(journal).toContain("0018_hm_ai_editor_site_concept");
  });
});

describe("VPS yaması ve robot sayfası", () => {
  it("concept_prompt topic kuralına ve manşet promptuna girer; generate değilse yazım yok", () => {
    for (const src of [vpsPatch, vpsScript]) {
      expect(src).toContain("concept_prompt");
      expect(src).toContain("content_mode");
      expect(src).toContain("site_rewrites");
      expect(src).toContain("SİTE KONSEPTİ");
    }
    expect(vpsScript).toContain('mode == "generate"');
    expect(vpsPatch).toContain("if site_rewrites(cn) else curate_result(it)");
  });

  it("robot sayfasında konsept talimatı alanı var", () => {
    expect(worker).toContain('id="conceptPrompt"');
    expect(worker).toContain("/api/bekci/ai-editor/concept");
    expect(worker).toContain("concept_prompt");
  });
});

describe("kelime SQL türü", () => {
  it("dizi, jsonb ve metin", () => {
    expect(keywordSqlExpr(5, "text[]")).toBe("$5::text[]");
    expect(keywordSqlExpr(3, "jsonb")).toBe("$3::jsonb");
    expect(keywordSqlValue("jsonb", ["faiz"])).toBe('["faiz"]');
    expect(keywordSqlValue("text", ["faiz", "borsa"])).toBe("faiz, borsa");
    expect(keywordSqlValue("text[]", ["faiz"])).toEqual(["faiz"]);
  });
});
