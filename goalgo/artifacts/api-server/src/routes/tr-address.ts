import { Router, type IRouter } from "express";
import { db, trIlTable, trIlceTable, trMahalleTable, trSokakTable } from "@workspace/db";
import { asc, eq, and, or, ilike, sql } from "drizzle-orm";

const router: IRouter = Router();

function num(v: unknown): number | null {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : null;
}

function big(v: unknown): bigint | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  try {
    return BigInt(s);
  } catch {
    return null;
  }
}

/** JSON bigint → string */
function ser<T extends Record<string, unknown>>(row: T): T {
  const o = { ...row };
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (typeof v === "bigint") (o as any)[k] = v.toString();
  }
  return o;
}

async function fetchTurkiyeApiJson<T>(url: string): Promise<T | null> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 5000);
  try {
    const r = await fetch(url, { signal: ac.signal });
    if (!r.ok) return null;
    return await r.json() as T;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Genel okuma — kimlik doğrulama gerektirmez (yalnızca kamu adres adları) */
router.get("/tr-address/provinces", async (_req, res): Promise<void> => {
  const rows = await db.select().from(trIlTable).orderBy(asc(trIlTable.adi));
  res.json(rows.map(ser));
});

router.get("/tr-address/districts", async (req, res): Promise<void> => {
  const plaka = num(req.query.plaka);
  if (plaka == null) {
    res.status(400).json({ error: "plaka zorunlu" });
    return;
  }
  const rows = await db
    .select()
    .from(trIlceTable)
    .where(eq(trIlceTable.ilPlaka, plaka))
    .orderBy(asc(trIlceTable.adi));
  if (rows.length > 0) {
    res.json(rows.map(ser));
    return;
  }

  // Fallback: DB'de ilce yoksa turkiyeapi.dev ile tamamla
  const ilRow = await db.select({ adi: trIlTable.adi }).from(trIlTable).where(eq(trIlTable.plaka, plaka)).limit(1);
  const ilAdi = ilRow[0]?.adi;
  if (!ilAdi) {
    res.json([]);
    return;
  }
  type TurkiyeProvinceRespSingle = {
    status?: string;
    data?: { districts?: Array<{ id: number; name: string }> };
  };
  type TurkiyeProvinceRespByName = {
    status?: string;
    data?: Array<{ districts?: Array<{ id: number; name: string }> }>;
  };
  const remoteByPlate = await fetchTurkiyeApiJson<TurkiyeProvinceRespSingle>(`https://api.turkiyeapi.dev/v1/provinces/${encodeURIComponent(String(plaka))}`);
  const remoteByName = await fetchTurkiyeApiJson<TurkiyeProvinceRespByName>(`https://api.turkiyeapi.dev/v1/provinces?name=${encodeURIComponent(ilAdi)}`);
  const districts = Array.isArray(remoteByPlate?.data?.districts)
    ? remoteByPlate!.data!.districts!
    : (Array.isArray(remoteByName?.data?.[0]?.districts) ? remoteByName!.data![0]!.districts! : []);
  res.json(
    districts.map((d) => ({
      kimlikNo: String(d.id),
      ilPlaka: plaka,
      adi: d.name,
      kayitNo: null,
    })),
  );
});

router.get("/tr-address/neighborhoods", async (req, res): Promise<void> => {
  const ilceKimlik = big(req.query.ilceKimlik);
  if (ilceKimlik == null) {
    res.status(400).json({ error: "ilceKimlik zorunlu" });
    return;
  }
  const q = String(req.query.q ?? "").trim().replace(/[%_\\]/g, "").slice(0, 80);
  const lim = Math.min(120, Math.max(10, num(req.query.limit) ?? 60));
  const filters = [eq(trMahalleTable.ilceKimlik, ilceKimlik)];
  if (q.length >= 1) {
    filters.push(
      or(ilike(trMahalleTable.adi, `%${q}%`), ilike(trMahalleTable.bilesen, `%${q}%`))!,
    );
  }
  const where = and(...filters);
  const rows = await db
    .select({
      kimlikNo: trMahalleTable.kimlikNo,
      ilPlaka: trMahalleTable.ilPlaka,
      ilceKimlik: trMahalleTable.ilceKimlik,
      adi: trMahalleTable.adi,
      bilesen: trMahalleTable.bilesen,
    })
    .from(trMahalleTable)
    .where(where)
    .orderBy(asc(trMahalleTable.adi))
    .limit(lim);
  if (rows.length > 0) {
    res.json(rows.map(ser));
    return;
  }

  // Fallback: DB'de mahalle yoksa turkiyeapi.dev districtId ile tamamla
  type TurkiyeNeighborhoodResp = {
    status?: string;
    data?: Array<{ id: number; name: string; district?: string; province?: string }>;
  };
  const remote = await fetchTurkiyeApiJson<TurkiyeNeighborhoodResp>(
    `https://api.turkiyeapi.dev/v1/neighborhoods?districtId=${encodeURIComponent(String(ilceKimlik))}`,
  );
  const list = Array.isArray(remote?.data) ? remote!.data! : [];
  const filtered = q.length >= 1
    ? list.filter((x) => (x.name || "").toLocaleLowerCase("tr-TR").includes(q.toLocaleLowerCase("tr-TR")))
    : list;
  res.json(
    filtered.slice(0, lim).map((x) => ({
      kimlikNo: String(x.id),
      ilPlaka: null,
      ilceKimlik: String(ilceKimlik),
      adi: x.name,
      bilesen: [x.district, x.province].filter(Boolean).join(" / "),
    })),
  );
});

router.get("/tr-address/streets", async (req, res): Promise<void> => {
  const mahalleKimlik = big(req.query.mahalleKimlik);
  if (mahalleKimlik == null) {
    res.status(400).json({ error: "mahalleKimlik zorunlu" });
    return;
  }
  const q = String(req.query.q ?? "").trim().replace(/[%_\\]/g, "").slice(0, 80);
  const lim = Math.min(150, Math.max(10, num(req.query.limit) ?? 80));
  const filters = [eq(trSokakTable.mahalleKimlik, mahalleKimlik)];
  if (q.length >= 1) {
    filters.push(or(ilike(trSokakTable.adi, `%${q}%`), ilike(trSokakTable.bilesen, `%${q}%`))!);
  }
  const where = and(...filters);
  const rows = await db
    .select({
      kimlikNo: trSokakTable.kimlikNo,
      mahalleKimlik: trSokakTable.mahalleKimlik,
      ilceKimlik: trSokakTable.ilceKimlik,
      ilPlaka: trSokakTable.ilPlaka,
      adi: trSokakTable.adi,
      bilesen: trSokakTable.bilesen,
    })
    .from(trSokakTable)
    .where(where)
    .orderBy(asc(trSokakTable.adi))
    .limit(lim);
  res.json(rows.map(ser));
});

router.get("/tr-address/stats", async (_req, res): Promise<void> => {
  const [[ilc], [ilcec], [mahc], [sokc]] = await Promise.all([
    db.select({ c: sql<number>`count(*)::int` }).from(trIlTable),
    db.select({ c: sql<number>`count(*)::int` }).from(trIlceTable),
    db.select({ c: sql<number>`count(*)::int` }).from(trMahalleTable),
    db.select({ c: sql<number>`count(*)::int` }).from(trSokakTable),
  ]);
  res.json({
    provinces: ilc?.c ?? 0,
    districts: ilcec?.c ?? 0,
    neighborhoods: mahc?.c ?? 0,
    streets: sokc?.c ?? 0,
  });
});

/** Mahalle seçmeden ilçe içinde cadde/sokak araması (yazarken öneri) */
router.get("/tr-address/streets-in-ilce", async (req, res): Promise<void> => {
  const ilceKimlik = big(req.query.ilceKimlik);
  const q = String(req.query.q ?? "").trim().replace(/[%_\\]/g, "").slice(0, 80);
  const lim = Math.min(45, Math.max(5, num(req.query.limit) ?? 22));
  if (ilceKimlik == null || q.length < 2) {
    res.json([]);
    return;
  }
  const pattern = `%${q}%`;
  const rows = await db
    .select({
      kimlikNo: trSokakTable.kimlikNo,
      mahalleKimlik: trSokakTable.mahalleKimlik,
      ilceKimlik: trSokakTable.ilceKimlik,
      ilPlaka: trSokakTable.ilPlaka,
      adi: trSokakTable.adi,
      bilesen: trSokakTable.bilesen,
    })
    .from(trSokakTable)
    .innerJoin(trMahalleTable, eq(trMahalleTable.kimlikNo, trSokakTable.mahalleKimlik))
    .where(
      and(
        eq(trMahalleTable.ilceKimlik, ilceKimlik),
        or(ilike(trSokakTable.adi, pattern), ilike(trSokakTable.bilesen, pattern))!,
      ),
    )
    .orderBy(asc(trSokakTable.bilesen))
    .limit(lim);
  res.json(rows.map(ser));
});

/**
 * İl / ilçe / (isteğe bağlı) mahalle adları + q — ulaşım “sokak satırı” ve harita arama kutusu için.
 * Mahalle tek eşleşirse daraltır; aksi halde tüm ilçe içinde arar.
 */
router.get("/tr-address/street-suggest-context", async (req, res): Promise<void> => {
  const city = String(req.query.city ?? "").trim().replace(/[%_\\]/g, "").slice(0, 64);
  const district = String(req.query.district ?? "").trim().replace(/[%_\\]/g, "").slice(0, 64);
  const mahalle = String(req.query.mahalle ?? "").trim().replace(/[%_\\]/g, "").slice(0, 96);
  const q = String(req.query.q ?? "").trim().replace(/[%_\\]/g, "").slice(0, 64);
  const lim = Math.min(35, Math.max(5, num(req.query.limit) ?? 18));
  if (city.length < 2 || district.length < 2 || q.length < 2) {
    res.json([]);
    return;
  }
  const cityPat = `%${city}%`;
  const distPat = `%${district}%`;
  const qp = `%${q}%`;
  const ilRows = await db.select().from(trIlTable).where(ilike(trIlTable.adi, cityPat)).limit(6);
  if (!ilRows.length) {
    res.json([]);
    return;
  }
  const plaka = ilRows[0].plaka;
  const ilceRows = await db
    .select()
    .from(trIlceTable)
    .where(and(eq(trIlceTable.ilPlaka, plaka), ilike(trIlceTable.adi, distPat)))
    .limit(10);
  if (!ilceRows.length) {
    res.json([]);
    return;
  }
  const ilce = ilceRows[0];
  let mahalleKimlik: bigint | null = null;
  if (mahalle.length >= 2) {
    const mhRows = await db
      .select()
      .from(trMahalleTable)
      .where(
        and(
          eq(trMahalleTable.ilceKimlik, ilce.kimlikNo),
          or(ilike(trMahalleTable.adi, `%${mahalle}%`), ilike(trMahalleTable.bilesen, `%${mahalle}%`))!,
        ),
      )
      .limit(8);
    if (mhRows.length === 1) mahalleKimlik = mhRows[0].kimlikNo;
  }
  const parts = [
    eq(trMahalleTable.ilceKimlik, ilce.kimlikNo),
    or(ilike(trSokakTable.adi, qp), ilike(trSokakTable.bilesen, qp))!,
  ] as const;
  const where =
    mahalleKimlik != null
      ? and(...parts, eq(trSokakTable.mahalleKimlik, mahalleKimlik))
      : and(...parts);
  const rows = await db
    .select({
      kimlikNo: trSokakTable.kimlikNo,
      mahalleKimlik: trSokakTable.mahalleKimlik,
      ilceKimlik: trSokakTable.ilceKimlik,
      ilPlaka: trSokakTable.ilPlaka,
      adi: trSokakTable.adi,
      bilesen: trSokakTable.bilesen,
    })
    .from(trSokakTable)
    .innerJoin(trMahalleTable, eq(trMahalleTable.kimlikNo, trSokakTable.mahalleKimlik))
    .where(where)
    .orderBy(asc(trSokakTable.bilesen))
    .limit(lim);
  res.json(rows.map(ser));
});

const NOMINATIM_UA = "Yekpare/1.0 (+https://yekpare.net)";

function cleanAddrToken(s: string): string {
  return s
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function streetVariants(streetLine: string): string[] {
  const c = cleanAddrToken(streetLine);
  if (!c) return [];
  const out = new Set<string>([c]);
  const hasType = /\b(sokak|cadde|bulvar|mahalle|sk\.?|cd\.?)\b/i.test(c);
  if (!hasType) {
    out.add(`${c} Sokak`);
    out.add(`${c} Caddesi`);
  }
  return [...out];
}

function uniqCandidates(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of arr) {
    const k = x.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(x);
    }
  }
  return out;
}

async function nominatimLookup(q: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=tr&accept-language=tr&q=${encodeURIComponent(q)}`;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 12000);
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": NOMINATIM_UA, "Accept-Language": "tr" },
      signal: ac.signal,
    });
    if (!r.ok) return null;
    const rows = (await r.json()) as Array<{ lat?: string; lon?: string }>;
    const lat = Number(rows?.[0]?.lat);
    const lng = Number(rows?.[0]?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * POST /tr-address/forward-geocode
 * Tarayıcıdan Nominatim çağrısı sık 403/429 verir; sunucu üzerinden yapılandırılmış arama + adaylar.
 */
router.post("/tr-address/forward-geocode", async (req, res): Promise<void> => {
  const city = cleanAddrToken(String(req.body?.city ?? ""));
  const district = cleanAddrToken(String(req.body?.district ?? ""));
  const mahalle = cleanAddrToken(String(req.body?.mahalle ?? ""));
  const street = cleanAddrToken(String(req.body?.street ?? ""));
  const extra = cleanAddrToken(String(req.body?.extra ?? ""));
  const qOnly = cleanAddrToken(String(req.body?.q ?? ""));

  const streetLine = [street, extra].filter((x) => x.length >= 1).join(" ").trim() || street || extra;
  const candidates: string[] = [];

  if (city.length >= 2 && district.length >= 2) {
    const mh = mahalle ? `${mahalle} Mahallesi` : "";
    for (const sv of streetVariants(streetLine)) {
      candidates.push([sv, mh, district, city, "Türkiye"].filter(Boolean).join(", "));
      candidates.push([sv, mahalle, district, city, "Türkiye"].filter(Boolean).join(", "));
    }
    if (mahalle) {
      candidates.push([mahalle, district, city, "Türkiye"].filter(Boolean).join(", "));
      candidates.push([`${mahalle} Mahallesi`, district, city, "Türkiye"].filter(Boolean).join(", "));
    }
    candidates.push([district, city, "Türkiye"].filter(Boolean).join(", "));
  }

  if (qOnly.length >= 2) {
    candidates.push(`${qOnly}, Türkiye`);
    candidates.push(qOnly);
  }

  const list = uniqCandidates(candidates.filter((c) => c.length >= 3));
  if (list.length === 0) {
    res.status(400).json({ success: false, error: "Yetersiz adres bilgisi" });
    return;
  }

  for (let i = 0; i < list.length; i++) {
    const hit = await nominatimLookup(list[i]);
    if (hit) {
      res.json({ success: true, lat: hit.lat, lng: hit.lng, matchedQuery: list[i], tried: i + 1 });
      return;
    }
    if (i < list.length - 1) await sleep(1100);
  }

  res.status(404).json({ success: false, error: "Konum bulunamadi", tried: list.length });
});

export default router;
