import { and, eq } from "drizzle-orm";
import {
  dualWriteInsert,
  dualWriteUpdate,
  getNewsDbForRead,
  hmNewsSitesTable,
  hmSiteEditorsTable,
} from "@workspace/db";

const ASG_SLUG = "asg";
const ASG_EDITOR_EMAIL = "sehirgazetesiankara@gmail.com";
const ASG_EDITOR_DISPLAY = "Ankara Şehir Gazetesi";

export type AsgEditorRepairResult = {
  ok: boolean;
  action: "already" | "copied" | "updated" | "missing_asg" | "missing_source" | "error";
  siteId: number | null;
  editorId: number | null;
  fromSiteId?: number | null;
  detail?: string;
};

/**
 * sehirgazetesiankara@gmail.com hesabını ASG sitesine kopyalar (şifre hash aynı kalır).
 * Kaynak satır (çoğunlukla ankarahabergundemi) silinmez.
 */
export async function repairAsgEditorMisassignment(): Promise<AsgEditorRepairResult> {
  const db = getNewsDbForRead();
  const [asg] = await db
    .select({ id: hmNewsSitesTable.id })
    .from(hmNewsSitesTable)
    .where(eq(hmNewsSitesTable.slug, ASG_SLUG))
    .limit(1);
  if (!asg?.id) {
    return { ok: false, action: "missing_asg", siteId: null, editorId: null };
  }

  const [onAsg] = await db
    .select({
      id: hmSiteEditorsTable.id,
      passwordHash: hmSiteEditorsTable.passwordHash,
    })
    .from(hmSiteEditorsTable)
    .where(
      and(eq(hmSiteEditorsTable.siteId, asg.id), eq(hmSiteEditorsTable.email, ASG_EDITOR_EMAIL)),
    )
    .limit(1);

  const [source] = await db
    .select({
      id: hmSiteEditorsTable.id,
      siteId: hmSiteEditorsTable.siteId,
      passwordHash: hmSiteEditorsTable.passwordHash,
      displayName: hmSiteEditorsTable.displayName,
      isActive: hmSiteEditorsTable.isActive,
    })
    .from(hmSiteEditorsTable)
    .where(and(eq(hmSiteEditorsTable.email, ASG_EDITOR_EMAIL), eq(hmSiteEditorsTable.isActive, true)))
    .limit(1);

  if (!source && !onAsg) {
    return { ok: false, action: "missing_source", siteId: asg.id, editorId: null };
  }

  if (onAsg && source && source.siteId === asg.id) {
    return { ok: true, action: "already", siteId: asg.id, editorId: onAsg.id };
  }

  const hash = source?.passwordHash || onAsg?.passwordHash;
  if (!hash) {
    return {
      ok: false,
      action: "error",
      siteId: asg.id,
      editorId: null,
      detail: "password hash yok",
    };
  }

  if (onAsg) {
    await dualWriteUpdate(
      hmSiteEditorsTable,
      {
        passwordHash: hash,
        displayName: ASG_EDITOR_DISPLAY,
        isActive: true,
        updatedAt: new Date(),
      },
      eq(hmSiteEditorsTable.id, onAsg.id),
    );
    return {
      ok: true,
      action: "updated",
      siteId: asg.id,
      editorId: onAsg.id,
      fromSiteId: source?.siteId ?? null,
    };
  }

  const [created] = await dualWriteInsert(hmSiteEditorsTable, {
    siteId: asg.id,
    email: ASG_EDITOR_EMAIL,
    passwordHash: hash,
    displayName: ASG_EDITOR_DISPLAY,
    isActive: true,
  });

  return {
    ok: Boolean(created?.id),
    action: created?.id ? "copied" : "error",
    siteId: asg.id,
    editorId: created?.id ?? null,
    fromSiteId: source?.siteId ?? null,
  };
}
