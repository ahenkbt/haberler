import { and, eq, inArray } from "drizzle-orm";
import {
  dualWriteInsert,
  dualWriteUpdate,
  getNewsDbForRead,
  hmNewsSitesTable,
  hmSiteEditorsTable,
} from "@workspace/db";
import { ensureHmSiteEditorUsernameColumn } from "./hm-editor-profile.js";

const SHARED_EMAIL = "sehirgazetesiankara@gmail.com";
const SHARED_USERNAME = "sehirgazetesi";
const TARGET_SLUGS = ["asg", "ankarahabergundemi"] as const;

export type AsgEditorRepairResult = {
  ok: boolean;
  action: "synced" | "missing_source" | "error";
  siteIds: number[];
  editorIds: number[];
  detail?: string;
};

/**
 * sehirgazetesiankara@gmail.com — ASG + Ankara Haber Gündemi ortak hesap.
 * Aynı şifre hash + kullanıcı adı (sehirgazetesi) her iki sitede.
 */
export async function repairAsgEditorMisassignment(): Promise<AsgEditorRepairResult> {
  await ensureHmSiteEditorUsernameColumn().catch(() => undefined);
  const db = getNewsDbForRead();

  const sites = await db
    .select({ id: hmNewsSitesTable.id, slug: hmNewsSitesTable.slug, displayName: hmNewsSitesTable.displayName })
    .from(hmNewsSitesTable)
    .where(inArray(hmNewsSitesTable.slug, [...TARGET_SLUGS]));

  if (sites.length === 0) {
    return { ok: false, action: "missing_source", siteIds: [], editorIds: [], detail: "hedef site yok" };
  }

  const [source] = await db
    .select()
    .from(hmSiteEditorsTable)
    .where(and(eq(hmSiteEditorsTable.email, SHARED_EMAIL), eq(hmSiteEditorsTable.isActive, true)))
    .limit(1);

  if (!source) {
    return { ok: false, action: "missing_source", siteIds: sites.map((s) => s.id), editorIds: [] };
  }

  const editorIds: number[] = [];
  for (const site of sites) {
    const [existing] = await db
      .select({ id: hmSiteEditorsTable.id })
      .from(hmSiteEditorsTable)
      .where(and(eq(hmSiteEditorsTable.siteId, site.id), eq(hmSiteEditorsTable.email, SHARED_EMAIL)))
      .limit(1);

    const displayName =
      site.slug === "asg" ? "Ankara Şehir Gazetesi" : source.displayName || site.displayName || "Editör";

    if (existing) {
      await dualWriteUpdate(
        hmSiteEditorsTable,
        {
          passwordHash: source.passwordHash,
          username: SHARED_USERNAME,
          displayName,
          isActive: true,
          updatedAt: new Date(),
        },
        eq(hmSiteEditorsTable.id, existing.id),
      );
      editorIds.push(existing.id);
      continue;
    }

    const [created] = await dualWriteInsert(hmSiteEditorsTable, {
      siteId: site.id,
      email: SHARED_EMAIL,
      username: SHARED_USERNAME,
      passwordHash: source.passwordHash,
      displayName,
      isActive: true,
    });
    if (created?.id) editorIds.push(created.id);
  }

  return {
    ok: editorIds.length > 0,
    action: "synced",
    siteIds: sites.map((s) => s.id),
    editorIds,
  };
}
