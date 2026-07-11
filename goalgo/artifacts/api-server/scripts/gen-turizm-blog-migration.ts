/**
 * turizmBlogPostsSeed.ts → turizm-blog-seed.json (+ 0084 no-op migration stub)
 * Çalıştır: node --import tsx ./scripts/gen-turizm-blog-migration.ts
 */
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildTurizmBlogSeedPosts } from "../../ahenkpress/src/themes/turizm/turizmBlogPostsSeed.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonPath = resolve(__dirname, "../src/data/turizm-blog-seed.json");
const stubPath = resolve(__dirname, "../../../lib/db/migrations/0084_turizm_blog_seed.sql");

const posts = buildTurizmBlogSeedPosts();

writeFileSync(jsonPath, `${JSON.stringify(posts, null, 2)}\n`, "utf8");
console.log(`Wrote ${posts.length} posts → ${jsonPath}`);

const stub = `-- Turizm blog seed: SQL INSERT kaldırıldı (HTML içindeki noktalı virgüller Drizzle migrate'i bozuyordu).
-- Seed: api-server post-migrate job (seedTurizmBlogPostsIfNeeded).
SELECT 1;
`;
writeFileSync(stubPath, stub, "utf8");
console.log(`Wrote migration stub → ${stubPath}`);
