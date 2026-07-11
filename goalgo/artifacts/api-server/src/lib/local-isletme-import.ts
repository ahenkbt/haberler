import fs from "node:fs";
import path from "node:path";
import xlsx from "xlsx";
import type { ExternalPlatform, ImportedMenuItem, ImportedVendorData } from "./external-delivery-import";

export type LocalImportParsed = {
  imported: ImportedVendorData;
  catalogContactGap: boolean;
};

/** Türkçe ve noktalama toleranslı anahtar */
export function looseRestaurantSlug(name: string): string {
  const s = String(name || "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s;
}

export type ContactHit = {
  phone?: string | null;
  email?: string | null;
  address?: string | null;
};

export type ContactIndex = {
  byFullSlug: Map<string, ContactHit>;
  byShortSlug: Map<string, ContactHit>;
  /** Tablo Import vb. ek eşleşme */
  extraBySlug: Map<string, ContactHit>;
};

/** Sunucuda aladdinyemek.xlsx yokken YS şehir dosyası tek başına içe alınsın diye. */
export function emptyContactIndex(): ContactIndex {
  return { byFullSlug: new Map(), byShortSlug: new Map(), extraBySlug: new Map() };
}

function cellStr(v: unknown): string {
  if (v == null || v === "") return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(Math.trunc(v)) : "";
  return String(v).trim();
}

function normalizePhone(v: unknown): string | null {
  const raw = cellStr(v).replace(/\s/g, "");
  if (!raw) return null;
  let d = raw.replace(/[^\d]/g, "");
  if (!d) return null;
  if (d.length === 10 && !d.startsWith("0")) d = `0${d}`;
  if (d.length < 10) return null;
  return d;
}

function normalizeEmail(v: unknown): string | null {
  const s = cellStr(v);
  if (!s || !s.includes("@") || s.includes("e-posta")) return null;
  return s.length > 255 ? s.slice(0, 255) : s;
}

export function buildAladdinContactIndex(aladdinBuffer: Buffer): ContactIndex {
  const wb = xlsx.read(aladdinBuffer, { type: "buffer" });
  const ws = wb.Sheets["Sayfa1"] ?? wb.Sheets[wb.SheetNames[0]];
  if (!ws) return { byFullSlug: new Map(), byShortSlug: new Map(), extraBySlug: new Map() };
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];
  const byFullSlug = new Map<string, ContactHit>();
  const byShortSlug = new Map<string, ContactHit>();

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] as unknown[];
    if (!r?.length) continue;
    const restoran = cellStr(r[0]);
    if (!restoran) continue;
    const hit: ContactHit = {
      phone: normalizePhone(r[3]) ?? normalizePhone(r[4]),
      email: normalizeEmail(r[9]),
      address:
        cellStr(r[8]) ||
        [cellStr(r[7]), cellStr(r[6]), cellStr(r[5])].filter(Boolean).join(", ") ||
        null,
    };
    byFullSlug.set(looseRestaurantSlug(restoran), hit);
    const shortName = restoran.split(",")[0]?.split("(")[0]?.trim() || restoran;
    const ss = looseRestaurantSlug(shortName);
    if (ss && !byShortSlug.has(ss)) byShortSlug.set(ss, hit);
  }

  return { byFullSlug, byShortSlug, extraBySlug: new Map() };
}

/** restorandataları klasöründeki Tablo Import sayfalarından telefon/adres */
export function enrichContactsFromRestoranKlasoru(rootDir: string): Map<string, ContactHit> {
  const extra = new Map<string, ContactHit>();
  const dir = path.join(rootDir, "restorandataları");
  if (!fs.existsSync(dir)) return extra;
  const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".xlsx"));
  for (const file of files) {
    let wb: xlsx.WorkBook;
    try {
      wb = xlsx.read(fs.readFileSync(path.join(dir, file)), { type: "buffer" });
    } catch {
      continue;
    }
    const ws = wb.Sheets["Tablo Import"];
    if (!ws) continue;
    const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];
    let headerIdx = -1;
    let nameCol = -1;
    let phoneCol = -1;
    let addrCol = -1;
    for (let i = 0; i < Math.min(rows.length, 80); i++) {
      const row = rows[i] as unknown[];
      if (!row?.length) continue;
      const labels = row.map((c) => String(c || "").replace(/\n/g, " ").trim());
      const ri = labels.findIndex((x) => /^restaurant/i.test(x));
      const ti = labels.findIndex((x) => /^telefon/i.test(x));
      const ai = labels.findIndex((x) => /^address$/i.test(x));
      if (ri >= 0 && ti >= 0) {
        headerIdx = i;
        nameCol = ri;
        phoneCol = ti;
        addrCol = ai >= 0 ? ai : -1;
        break;
      }
    }
    if (headerIdx < 0 || nameCol < 0) continue;
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i] as unknown[];
      const nm = cellStr(row[nameCol]);
      if (!nm || nm.length < 3) continue;
      const hit: ContactHit = {
        phone: normalizePhone(row[phoneCol]),
        address: addrCol >= 0 ? cellStr(row[addrCol]) || null : null,
      };
      const sl = looseRestaurantSlug(nm);
      if (!hit.phone && !hit.address) continue;
      const prev = extra.get(sl);
      if (!prev) extra.set(sl, hit);
      else {
        extra.set(sl, {
          phone: prev.phone || hit.phone || null,
          address: prev.address || hit.address || null,
        });
      }
    }
  }
  return extra;
}

function mergeContactHits(base: ContactHit, ...hits: (ContactHit | null | undefined)[]): ContactHit {
  const out: ContactHit = { ...base };
  for (const h of hits) {
    if (!h) continue;
    if (!out.phone && h.phone) out.phone = h.phone;
    if (!out.email && h.email) out.email = h.email;
    if (!out.address && h.address) out.address = h.address;
  }
  return out;
}

export function resolveContactForRestaurant(displayKey: string, idx: ContactIndex): ContactHit & { catalogContactGap: boolean } {
  const full = looseRestaurantSlug(displayKey);
  let hit = idx.byFullSlug.get(full) ?? null;
  const shortName = displayKey.split(",")[0]?.split("(")[0]?.trim() || displayKey;
  const short = looseRestaurantSlug(shortName);
  if (!hit?.phone && !hit?.email) hit = idx.byShortSlug.get(short) ?? hit;
  let merged = mergeContactHits(hit || {}, idx.extraBySlug.get(full), idx.extraBySlug.get(short));
  merged = mergeContactHits(merged);
  const catalogContactGap = !(merged.phone || merged.email);
  return { ...merged, catalogContactGap };
}

export type ProviderRow = {
  displayKey: string;
  mutfak: string;
  city: string;
  district: string;
  mahalle: string;
  addressLine: string;
  phone: string | null;
  email: string | null;
  sector: string;
};

function synthesizeAktifKey(row: unknown[]): string | null {
  const tabela = cellStr(row[11]);
  const ilce = cellStr(row[24]);
  const mah = cellStr(row[25]);
  if (!tabela || !ilce || !mah) return null;
  return `${tabela}, ${ilce} (${mah})`;
}

/** Tek şehir dosyasından işletme + ürünleri çıkarır */
export function parseYemeksepetiCityWorkbook(
  buf: Buffer,
  cityFileBasename: string,
  contactIdx: ContactIndex,
): LocalImportParsed[] {
  const wb = xlsx.read(buf, { type: "buffer" });
  const cityHint = cityFileBasename.replace(/\.xlsx$/i, "").trim();

  const providers = new Map<string, ProviderRow>();

  const wsPasif = wb.Sheets["Servis Saglayici Pasifler Tablo"];
  if (wsPasif) {
    const rows = xlsx.utils.sheet_to_json(wsPasif, { header: 1, defval: "" }) as unknown[][];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i] as unknown[];
      const displayKey = cellStr(r[1]);
      if (!displayKey) continue;
      providers.set(displayKey, {
        displayKey,
        mutfak: cellStr(r[2]) || "Restoranlar",
        city: cellStr(r[6]) || cityHint.toUpperCase(),
        district: cellStr(r[7]),
        mahalle: cellStr(r[8]),
        addressLine: [cellStr(r[8]), cellStr(r[9])].filter(Boolean).join(", "),
        phone: normalizePhone(r[4]),
        email: normalizeEmail(r[13]),
        sector: cellStr(r[2]) || "Menü",
      });
    }
  }

  const wsAktif = wb.Sheets["Servis Sağlayıcı Aktif"];
  if (wsAktif) {
    const rows = xlsx.utils.sheet_to_json(wsAktif, { header: 1, defval: "" }) as unknown[][];
    for (let i = 3; i < rows.length; i++) {
      const r = rows[i] as unknown[];
      const synth = synthesizeAktifKey(r);
      const iconAlt = cellStr(r[30]);
      const listeAlt = cellStr(r[29]);
      const displayKey = synth || iconAlt || listeAlt;
      if (!displayKey) continue;
      const sector = cellStr(r[33]) || cellStr(r[27]) || "Menü";
      const rowCity = cellStr(r[22]) || cityHint.toUpperCase();
      const district = cellStr(r[24]);
      const mahalle = cellStr(r[25]);
      const aktifPhone = normalizePhone(r[9]);
      const existing = providers.get(displayKey);
      if (existing) {
        if (!existing.phone && aktifPhone) existing.phone = aktifPhone;
        if (!existing.sector && sector) existing.sector = sector;
      } else {
        providers.set(displayKey, {
          displayKey,
          mutfak: sector,
          city: rowCity,
          district,
          mahalle,
          addressLine: cellStr(r[26]) || [mahalle, district, rowCity].filter(Boolean).join(", "),
          phone: aktifPhone,
          email: null,
          sector,
        });
      }
    }
  }

  const productsByRestaurant = new Map<string, ImportedMenuItem[]>();
  const wsUrun = wb.Sheets["Ürünler"];
  if (wsUrun) {
    const rows = xlsx.utils.sheet_to_json(wsUrun, { header: 1, defval: "" }) as unknown[][];
    for (let i = 2; i < rows.length; i++) {
      const r = rows[i] as unknown[];
      const rk = cellStr(r[0]);
      const itemName = cellStr(r[1]);
      if (!rk || !itemName) continue;
      const desc = cellStr(r[3]);
      const cat = providers.get(rk)?.sector || providers.get(rk)?.mutfak || "Menü";
      const list = productsByRestaurant.get(rk) ?? [];
      list.push({
        name: itemName,
        description: desc || null,
        price: 0,
        category: cat,
        imageUrl: null,
      });
      productsByRestaurant.set(rk, list);
    }
  }

  const sourceUrlBase = `local-xlsx://Yemeksepeti data/${cityFileBasename}`;
  const out: LocalImportParsed[] = [];

  for (const [displayKey, prov] of providers) {
    const menu = productsByRestaurant.get(displayKey) ?? [];
    const cx = resolveContactForRestaurant(displayKey, contactIdx);
    const mergedPhone = prov.phone || cx.phone || null;
    const mergedEmail = prov.email || cx.email || null;
    const mergedAddr =
      [prov.addressLine, cx.address].filter((x) => x && String(x).trim()).join(" · ") || prov.addressLine || cx.address || null;

    const imported: ImportedVendorData = {
      platform: "yemeksepeti",
      sourceUrl: `${sourceUrlBase}#${encodeURIComponent(displayKey.slice(0, 120))}`,
      sourceId: looseRestaurantSlug(displayKey).slice(0, 200),
      name: displayKey,
      description: `${prov.mutfak} · ${cityHint}`,
      phone: mergedPhone,
      email: mergedEmail,
      address: mergedAddr,
      city: prov.city || cityHint.toUpperCase(),
      district: prov.district || null,
      neighborhood: prov.mahalle || null,
      lat: null,
      lng: null,
      imageUrl: null,
      coverUrl: null,
      workingHours: null,
      isOpen: false,
      menu,
    };

    const catalogContactGap = !(mergedPhone || mergedEmail);

    out.push({ imported, catalogContactGap });
  }

  return out;
}

/**
 * Yalnız Aladdin / rehber Excel’i: Yemeksepeti şehir dosyasında olmayan işletmeler için menü boş kayıt üretir.
 * `Sayfa1` şeması `buildAladdinContactIndex` ile uyumludur.
 */
export function parseAladdinWorkbookAsStandaloneVendors(buf: Buffer): ImportedVendorData[] {
  const wb = xlsx.read(buf, { type: "buffer" });
  const ws = wb.Sheets["Sayfa1"] ?? wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];
  const out: ImportedVendorData[] = [];
  const platform: ExternalPlatform = "local-aladdin";

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i] as unknown[];
    const restoran = cellStr(r[0]);
    if (!restoran) continue;
    const phone = normalizePhone(r[3]) ?? normalizePhone(r[4]);
    const email = normalizeEmail(r[9]);
    const addr =
      cellStr(r[8]) ||
      [cellStr(r[7]), cellStr(r[6]), cellStr(r[5])].filter(Boolean).join(", ") ||
      null;
    const sid = looseRestaurantSlug(restoran).slice(0, 200);
    out.push({
      platform,
      sourceUrl: `local-xlsx://aladdinyemek#${encodeURIComponent(restoran.slice(0, 120))}`,
      sourceId: sid || null,
      name: restoran,
      description: "Yerel rehber (Aladdin) — Yemeksepeti menü dosyasında eşleşme yok; menü ayrıca eklenebilir.",
      phone,
      email,
      address: addr,
      city: null,
      district: null,
      neighborhood: null,
      lat: null,
      lng: null,
      imageUrl: null,
      coverUrl: null,
      workingHours: null,
      isOpen: false,
      menu: [],
    });
  }
  return out;
}

export function resolveIsletmelerRoot(): string | null {
  const env = process.env.ISLETME_DATA_DIR?.trim();
  if (env && fs.existsSync(env)) return env;
  const cand = [
    path.join(process.cwd(), "işletmeler"),
    path.join(process.cwd(), "goalgo", "işletmeler"),
    path.resolve(process.cwd(), "..", "işletmeler"),
    path.resolve(process.cwd(), "..", "..", "işletmeler"),
  ];
  for (const c of cand) {
    if (fs.existsSync(c) && fs.existsSync(path.join(c, "Yemeksepeti data"))) return c;
  }
  return null;
}
