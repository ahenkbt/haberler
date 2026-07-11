/**
 * AHB köşe JSON → HM (CLI). Panel: /admin/hm-kose-ice-aktar
 *
 *   pnpm run import:hm-kose -- --site-slug=asg "C:/path/yazarlar.json" "C:/path/makaleler.json"
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as dotenvConfig } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenvConfig({ path: path.join(__dirname, "../../../.env") });
dotenvConfig({ path: path.join(__dirname, "../.env") });

import type { AhbMakaleExport, AhbYazarExport } from "../src/lib/hm-ahb-kose-import";
import { runHmAhbKoseImport } from "../src/lib/hm-ahb-kose-import";
import { getMediaUploadRoot } from "../src/lib/mediaUploadRoot";

function argVal(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`));
  return p ? p.slice(name.length + 1) : undefined;
}

async function main() {
  const siteSlug = (argVal("--site-slug") ?? "asg").trim().toLowerCase();
  const posArgs = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const yPath = posArgs[0];
  const mPath = posArgs[1];
  if (!yPath || !mPath) {
    console.error(
      "Kullanım: pnpm run import:hm-kose -- --site-slug=asg <yazarlar.json> <makaleler.json>",
    );
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL tanımlı değil.");
    process.exit(1);
  }

  const { db, hmNewsSitesTable } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");

  const [site] = await db
    .select()
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.slug, siteSlug))
    .limit(1);
  if (!site) {
    console.error(`HM site bulunamadı: slug=${siteSlug}`);
    process.exit(1);
  }

  const yRaw = JSON.parse(await readFile(yPath, "utf8")) as AhbYazarExport;
  const mRaw = JSON.parse(await readFile(mPath, "utf8")) as AhbMakaleExport;

  const r = await runHmAhbKoseImport({
    siteId: site.id,
    authorsExport: yRaw,
    postsExport: mRaw,
    mode: "full",
    mediaUploadDir: getMediaUploadRoot(),
  });

  console.log(
    `\nBitti. Site: ${siteSlug} (id ${site.id}). Yazar eşlemesi: ${r.authorsMapped}, makale +${r.postsAdded}, atlanan ${r.postsSkipped}.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
