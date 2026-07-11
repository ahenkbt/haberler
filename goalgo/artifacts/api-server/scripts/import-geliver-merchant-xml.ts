/**
 * Google Merchant RSS (export.xml) → e-ticaret mağaza ürünleri
 *
 *   pnpm run import:geliver-xml -- --slug=geliver-demo-magaza "C:/Users/ahenk/Downloads/export.xml"
 *
 * Görseller yalnızca URL olarak kaydedilir (indirilmez).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as dotenvConfig } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenvConfig({ path: path.join(__dirname, "../../../.env") });
dotenvConfig({ path: path.join(__dirname, "../.env") });

function argVal(name: string): string | undefined {
  const p = process.argv.find((a) => a.startsWith(`${name}=`));
  return p ? p.slice(name.length + 1) : undefined;
}

async function main() {
  const slug = (argVal("--slug") ?? "geliver-demo-magaza").trim().toLowerCase();
  const vendorIdRaw = argVal("--vendor-id");
  const clearExisting = !process.argv.includes("--no-clear");
  const posArgs = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const xmlPath = posArgs[0];
  if (!xmlPath && !argVal("--xml-url")) {
    console.error(
      'Kullanım: pnpm run import:geliver-xml -- --vendor-id=123 "C:/path/export.xml"',
    );
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL tanımlı değil.");
    process.exit(1);
  }

  const { importMerchantRssForVendorId, importMerchantRssFileForVendorSlug, importMerchantRssIntoVendor, parseMerchantRssXml } = await import(
    "../src/lib/merchant-rss-import.ts"
  );
  const { readFile } = await import("node:fs/promises");
  const axios = (await import("axios")).default;

  let xml = xmlPath ? await readFile(xmlPath, "utf8") : "";
  const xmlUrl = argVal("--xml-url");
  if (!xml && xmlUrl) {
    const fetched = await axios.get<string>(xmlUrl, { responseType: "text", timeout: 120_000 });
    xml = String(fetched.data ?? "");
  }
  const parsed = parseMerchantRssXml(xml);
  console.log(`XML: ${parsed.length} ürün, ${new Set(parsed.map((p) => p.category)).size} kategori`);

  let result;
  if (vendorIdRaw) {
    result = await importMerchantRssIntoVendor(Number(vendorIdRaw), parsed, { clearExisting });
  } else if (xmlPath) {
    result = await importMerchantRssFileForVendorSlug(slug, xmlPath, { clearExisting });
  } else {
    throw new Error("vendor-id veya slug + xml dosyası gerekli");
  }
  console.log(
    `Tamamlandı — vendor=${result.vendorId} kategori=${result.categories} ürün=${result.items} atlanan=${result.skipped}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
