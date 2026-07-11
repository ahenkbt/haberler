import { Router, type IRouter } from "express";
import { and, asc, count, desc, eq, ilike } from "drizzle-orm";
import { db, vkdCanakkaleSehitleriTable } from "@workspace/db";
import { ensureVkdModuleTables } from "../lib/ensure-vkd-module-tables.js";

const router: IRouter = Router();

function parseLimit(raw: unknown, fallback = 50, max = 200): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(max, Math.floor(n));
}

function parsePage(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.floor(n);
}

router.get("/vkd/canakkale-sehitleri/meta", async (_req, res): Promise<void> => {
  try {
    await ensureVkdModuleTables();
    const [totalRow] = await db.select({ total: count() }).from(vkdCanakkaleSehitleriTable);
    res.json({
      success: true,
      data: {
        total: Number(totalRow?.total ?? 0),
        source: "Çanakkale Cephesi Şehit Listesi (PDF)",
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Meta alınamadı" });
  }
});

router.get("/vkd/canakkale-sehitleri/stats/provinces", async (_req, res): Promise<void> => {
  try {
    const rows = await db
      .select({
        province: vkdCanakkaleSehitleriTable.province,
        total: count(),
      })
      .from(vkdCanakkaleSehitleriTable)
      .groupBy(vkdCanakkaleSehitleriTable.province)
      .orderBy(desc(count()));

    res.json({
      success: true,
      data: rows
        .filter((row) => row.province)
        .map((row) => ({ province: row.province, total: Number(row.total) }))
        .sort((a, b) => b.total - a.total || a.province.localeCompare(b.province, "tr")),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "İl istatistikleri alınamadı" });
  }
});

router.get("/vkd/canakkale-sehitleri/stats/districts", async (req, res): Promise<void> => {
  const province = String(req.query.province ?? "").trim();
  if (!province) {
    res.status(400).json({ success: false, error: "province gerekli" });
    return;
  }

  try {
    const rows = await db
      .select({
        district: vkdCanakkaleSehitleriTable.district,
        total: count(),
      })
      .from(vkdCanakkaleSehitleriTable)
      .where(eq(vkdCanakkaleSehitleriTable.province, province))
      .groupBy(vkdCanakkaleSehitleriTable.district)
      .orderBy(desc(count()));

    res.json({
      success: true,
      data: {
        province,
        districts: rows
          .map((row) => ({
            district: row.district || "—",
            total: Number(row.total),
          }))
          .sort((a, b) => b.total - a.total || a.district.localeCompare(b.district, "tr")),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "İlçe istatistikleri alınamadı" });
  }
});

router.get("/vkd/canakkale-sehitleri/search", async (req, res): Promise<void> => {
  const q = String(req.query.q ?? "").trim();
  const province = String(req.query.province ?? "").trim();
  const district = String(req.query.district ?? "").trim();
  const serialRaw = String(req.query.serialNo ?? "").trim();
  const limit = parseLimit(req.query.limit);
  const page = parsePage(req.query.page);
  const offset = (page - 1) * limit;

  const conditions = [];
  if (province) conditions.push(eq(vkdCanakkaleSehitleriTable.province, province));
  if (district) conditions.push(eq(vkdCanakkaleSehitleriTable.district, district));
  if (serialRaw) {
    const serialNo = Number(serialRaw);
    if (Number.isFinite(serialNo)) conditions.push(eq(vkdCanakkaleSehitleriTable.serialNo, serialNo));
  }
  if (q) {
    const like = `%${q.toLocaleLowerCase("tr-TR")}%`;
    conditions.push(ilike(vkdCanakkaleSehitleriTable.searchText, like));
  }

  const whereClause = conditions.length ? and(...conditions) : undefined;

  try {
    const [totalRow] = await db
      .select({ total: count() })
      .from(vkdCanakkaleSehitleriTable)
      .where(whereClause);

    const rows = await db
      .select({
        id: vkdCanakkaleSehitleriTable.id,
        serialNo: vkdCanakkaleSehitleriTable.serialNo,
        name: vkdCanakkaleSehitleriTable.name,
        fatherName: vkdCanakkaleSehitleriTable.fatherName,
        birthYear: vkdCanakkaleSehitleriTable.birthYear,
        nickname: vkdCanakkaleSehitleriTable.nickname,
        province: vkdCanakkaleSehitleriTable.province,
        district: vkdCanakkaleSehitleriTable.district,
        bucak: vkdCanakkaleSehitleriTable.bucak,
        village: vkdCanakkaleSehitleriTable.village,
        branchClass: vkdCanakkaleSehitleriTable.branchClass,
        rank: vkdCanakkaleSehitleriTable.rank,
        unitText: vkdCanakkaleSehitleriTable.unitText,
        martyrdomPlace: vkdCanakkaleSehitleriTable.martyrdomPlace,
        martyrdomDate: vkdCanakkaleSehitleriTable.martyrdomDate,
      })
      .from(vkdCanakkaleSehitleriTable)
      .where(whereClause)
      .orderBy(asc(vkdCanakkaleSehitleriTable.serialNo))
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      data: {
        items: rows,
        page,
        limit,
        total: Number(totalRow?.total ?? 0),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Arama başarısız" });
  }
});

export default router;
