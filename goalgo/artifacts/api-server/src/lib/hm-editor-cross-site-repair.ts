import { and, eq, ne, sql } from "drizzle-orm";
import {
  dualWriteUpdate,
  getNewsDbForRead,
  hmSiteEditorsTable,
} from "@workspace/db";
import { isHmCrossSiteSharedEditorEmail } from "./hm-editor-shared-email.js";
import { isKhNewsSiteRow, repairKhEditorMisassignment } from "./hm-kh-editor-repair.js";
import { listHmNewsSitesCompat } from "./hm-site-compat.js";

export type HmEditorCrossSiteRepairResult = {
  ok: boolean;
  deactivated: Array<{ editorId: number; siteId: number; email: string; reason: string }>;
  kh: Awaited<ReturnType<typeof repairKhEditorMisassignment>>;
  detail?: string;
};

function normEmail(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase();
}

/** Admin: e-posta başka aktif sitede kayıtlı mı (ortak ASG hesabı hariç). */
export async function assertHmEditorEmailAllowedForSite(
  emailRaw: string,
  siteId: number,
  excludeEditorId?: number,
): Promise<{ ok: true } | { ok: false; error: string; otherSiteId: number; otherSiteName: string }> {
  const email = normEmail(emailRaw);
  if (!email.includes("@")) {
    return { ok: false, error: "Geçerli editör e-postası gerekli", otherSiteId: 0, otherSiteName: "" };
  }
  if (isHmCrossSiteSharedEditorEmail(email)) return { ok: true };

  const db = getNewsDbForRead();
  const conds = [
    sql`lower(${hmSiteEditorsTable.email}) = ${email}`,
    eq(hmSiteEditorsTable.isActive, true),
    ne(hmSiteEditorsTable.siteId, siteId),
  ];
  if (excludeEditorId != null) conds.push(ne(hmSiteEditorsTable.id, excludeEditorId));

  const [other] = await db
    .select({
      id: hmSiteEditorsTable.id,
      siteId: hmSiteEditorsTable.siteId,
    })
    .from(hmSiteEditorsTable)
    .where(and(...conds))
    .limit(1);

  if (!other) return { ok: true };

  const sites = await listHmNewsSitesCompat();
  const otherSite = sites.find((s) => s.id === other.siteId);
  const otherSiteName = otherSite?.displayName || otherSite?.slug || `Site #${other.siteId}`;
  return {
    ok: false,
    error: `Bu e-posta zaten «${otherSiteName}» (Site #${other.siteId}) altında kayıtlı. Her haber sitesi için ayrı editör e-postası kullanın.`,
    otherSiteId: other.siteId,
    otherSiteName,
  };
}

/**
 * Aynı e-postanın birden fazla aktif sitede olması (ortak ASG hesabı hariç) — fazlalıkları pasifleştirir.
 * KH adayları önce kirsehirhaber sitesine taşınır (repairKhEditorMisassignment).
 */
export async function repairHmEditorCrossSiteEmailConflicts(): Promise<HmEditorCrossSiteRepairResult> {
  const kh = await repairKhEditorMisassignment();
  const sites = await listHmNewsSitesCompat();

  const db = getNewsDbForRead();
  const rows = await db
    .select({
      id: hmSiteEditorsTable.id,
      siteId: hmSiteEditorsTable.siteId,
      email: hmSiteEditorsTable.email,
      createdAt: hmSiteEditorsTable.createdAt,
    })
    .from(hmSiteEditorsTable)
    .where(eq(hmSiteEditorsTable.isActive, true));

  const byEmail = new Map<string, typeof rows>();
  for (const row of rows) {
    const email = normEmail(row.email);
    if (!email.includes("@")) continue;
    const arr = byEmail.get(email) ?? [];
    arr.push(row);
    byEmail.set(email, arr);
  }

  const deactivated: HmEditorCrossSiteRepairResult["deactivated"] = [];

  for (const [email, group] of byEmail) {
    if (group.length < 2) continue;
    if (isHmCrossSiteSharedEditorEmail(email)) continue;

    const siteIds = [...new Set(group.map((g) => g.siteId))];
    if (siteIds.length < 2) continue;

    const khSite = sites.find((s) => isKhNewsSiteRow(s));
    const khSiteId = khSite?.id ?? null;
    const preferKh =
      khSiteId != null &&
      (email === "kevser@gmail.com" || email.includes("kirsehirhaber") || email.includes("kirsehri"));

    let keepId: number;
    if (preferKh) {
      const onKh = group.find((g) => g.siteId === khSiteId);
      if (!onKh) continue;
      keepId = onKh.id;
    } else {
      const sorted = [...group].sort(
        (a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime(),
      );
      keepId = sorted[0]!.id;
    }

    for (const row of group) {
      if (row.id === keepId) continue;
      await dualWriteUpdate(
        hmSiteEditorsTable,
        { isActive: false, updatedAt: new Date() },
        eq(hmSiteEditorsTable.id, row.id),
      );
      deactivated.push({
        editorId: row.id,
        siteId: row.siteId,
        email,
        reason: preferKh ? "kh-canonical" : "duplicate-email",
      });
    }
  }

  return {
    ok: true,
    deactivated,
    kh,
    detail:
      deactivated.length > 0
        ? `${deactivated.length} çift kayıt pasifleştirildi`
        : kh.detail || "çakışma yok",
  };
}
