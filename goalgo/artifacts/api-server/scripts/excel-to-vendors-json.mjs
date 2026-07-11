/**
 * Excel → vendors JSON (Sipariş paneli /delivery/admin/vendors-import-json için).
 *
 * Kullanım (api-server klasöründen):
 *   node scripts/excel-to-vendors-json.mjs "C:\yol\isletmeler.xlsx" > isletmeler.json
 *
 * İlk sayfa kullanılır. Sütun başlıkları (Türkçe/İngilizce, büyük/küçük harf duyarsız):
 *   name: isim, ad, name, işletme, firma
 *   address: adres, address
 *   city: il, şehir, sehir, city
 *   district: ilçe, ilce, district
 *   phone: telefon, tel, gsm, phone
 *   email: email, e-posta, eposta
 *   website: web, website, site
 *   lat / lng: enlem, boylam, lat, lng, latitude, longitude
 *   googlePlaceId: google_place_id, place_id
 *   googleImportKind: google_import_kind (yoksa manual)
 *   description: açıklama, aciklama, description
 */
import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.error('Kullanım: node scripts/excel-to-vendors-json.mjs "<dosya.xlsx>"');
  process.exit(1);
}

const norm = (k) =>
  String(k ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[ıİ]/g, "i");

/** @param {string} header */
function canonHeader(header) {
  const h = norm(header);
  const map = new Map([
    [norm("isim"), "name"],
    [norm("ad"), "name"],
    [norm("name"), "name"],
    [norm("işletme"), "name"],
    [norm("firma"), "name"],
    [norm("adres"), "address"],
    [norm("address"), "address"],
    [norm("il"), "city"],
    [norm("şehir"), "city"],
    [norm("sehir"), "city"],
    [norm("city"), "city"],
    [norm("ilçe"), "district"],
    [norm("ilce"), "district"],
    [norm("district"), "district"],
    [norm("telefon"), "phone"],
    [norm("tel"), "phone"],
    [norm("gsm"), "phone"],
    [norm("phone"), "phone"],
    [norm("email"), "email"],
    [norm("e-posta"), "email"],
    [norm("eposta"), "email"],
    [norm("web"), "website"],
    [norm("website"), "website"],
    [norm("site"), "website"],
    [norm("enlem"), "lat"],
    [norm("lat"), "lat"],
    [norm("latitude"), "lat"],
    [norm("boylam"), "lng"],
    [norm("lng"), "lng"],
    [norm("longitude"), "lng"],
    [norm("google_place_id"), "googlePlaceId"],
    [norm("place_id"), "googlePlaceId"],
    [norm("google_import_kind"), "googleImportKind"],
    [norm("açıklama"), "description"],
    [norm("aciklama"), "description"],
    [norm("description"), "description"],
  ]);
  return map.get(h) ?? null;
}

const wb = XLSX.readFile(path.resolve(file));
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });

const items = [];
for (const row of rows) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    const ck = canonHeader(k);
    if (!ck) continue;
    if (ck === "lat" || ck === "lng") {
      const n = parseFloat(String(v).replace(",", ".").replace(/\s/g, ""));
      if (Number.isFinite(n)) out[ck] = n;
      continue;
    }
    const s = String(v ?? "").trim();
    if (s) out[ck] = s;
  }
  if (!out.name) continue;
  if (!out.googleImportKind) out.googleImportKind = "manual";
  items.push(out);
}

process.stdout.write(JSON.stringify(items, null, 2) + "\n");
