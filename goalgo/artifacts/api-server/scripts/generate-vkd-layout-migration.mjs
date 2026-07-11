import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const payload = JSON.parse(
  readFileSync(path.join(__dirname, "out/vkd-layout-import.json"), "utf8"),
);
const layoutJson = JSON.stringify(payload.layout);
const tag = "vkd_layout_json";
if (layoutJson.includes(`$${tag}$`)) {
  throw new Error("layout JSON contains dollar-quote delimiter");
}

const description = String(payload.description ?? "").replace(/'/g, "''");
const displayName = String(payload.displayName ?? "").replace(/'/g, "''");
const sql = `-- VKD (slug=vkd) WordPress template sayfalari + kurumsal vitrin ayarlari
UPDATE hm_news_sites
SET
  display_name = '${displayName}',
  description = '${description}',
  layout_json = $${tag}$${layoutJson}$${tag}$,
  updated_at = now()
WHERE slug = 'vkd';
`;

const out = path.resolve(__dirname, "../../../lib/db/migrations/0049_vkd_template_pages_layout.sql");
writeFileSync(out, sql, "utf8");
console.log(`Wrote ${out} (${sql.length} chars)`);
