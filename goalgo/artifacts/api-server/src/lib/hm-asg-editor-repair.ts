import bcrypt from "bcryptjs";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
  dualWriteInsert,
  dualWriteUpdate,
  getNewsDbForRead,
  hmNewsSitesTable,
  hmSiteEditorsTable,
} from "@workspace/db";
import { ensureHmSiteEditorUsernameColumn } from "./hm-editor-profile.js";
import { isHmCrossSiteSharedEditorEmail } from "./hm-editor-shared-email.js";

export const ASG_SHARED_EMAIL = "sehirgazetesiankara@gmail.com";
const SHARED_USERNAME = "sehirgazetesi";
const TARGET_SLUGS = ["asg", "ankarahabergundemi"] as const;

export type AsgEditorRepairResult = {
  ok: boolean;
  action: "synced" | "missing_source" | "error";
  siteIds: number[];
  editorIds: number[];
  detail?: string;
};

type HmSiteBrief = {
  id: number;
  slug: string | null;
  domain?: string | null;
  domain2?: string | null;
  domain3?: string | null;
  displayName?: string | null;
};

function normSlug(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
}

function normHost(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "")
    .replace(/^www\./, "");
}

/** ASG veya Ankara Haber Gündemi HM sitesi mi? */
export function isAsgHmNewsSiteRow(site: {
  slug?: string | null;
  domain?: string | null;
  domain2?: string | null;
  domain3?: string | null;
}): boolean {
  const slug = normSlug(site.slug);
  if (
    slug === "asg" ||
    slug === "ankarahabergundemi" ||
    slug.includes("ankarasehirgazetesi") ||
    slug.includes("ankarahabergundemi")
  ) {
    return true;
  }
  for (const raw of [site.domain, site.domain2, site.domain3]) {
    const h = normHost(raw);
    if (h.includes("ankarasehirgazetesi") || h.includes("ankarahabergundemi")) return true;
  }
  return false;
}

async function listAsgTargetSites(db: ReturnType<typeof getNewsDbForRead>): Promise<HmSiteBrief[]> {
  const bySlug = await db
    .select({
      id: hmNewsSitesTable.id,
      slug: hmNewsSitesTable.slug,
      domain: hmNewsSitesTable.domain,
      domain2: hmNewsSitesTable.domain2,
      domain3: hmNewsSitesTable.domain3,
      displayName: hmNewsSitesTable.displayName,
    })
    .from(hmNewsSitesTable)
    .where(inArray(hmNewsSitesTable.slug, [...TARGET_SLUGS]));

  const all = await db
    .select({
      id: hmNewsSitesTable.id,
      slug: hmNewsSitesTable.slug,
      domain: hmNewsSitesTable.domain,
      domain2: hmNewsSitesTable.domain2,
      domain3: hmNewsSitesTable.domain3,
      displayName: hmNewsSitesTable.displayName,
    })
    .from(hmNewsSitesTable);

  const seen = new Set<number>();
  const out: HmSiteBrief[] = [];
  for (const site of [...bySlug, ...all]) {
    if (seen.has(site.id)) continue;
    if (!isAsgHmNewsSiteRow(site)) continue;
    seen.add(site.id);
    out.push(site);
  }
  return out;
}

/** En güncel şifre hash'ini kaynak al — eski düşük id kayıtları doğru şifreyi ezmesin. */
async function pickCanonicalSharedEditorSource(db: ReturnType<typeof getNewsDbForRead>) {
  const rows = await db
    .select()
    .from(hmSiteEditorsTable)
    .where(and(eq(hmSiteEditorsTable.email, ASG_SHARED_EMAIL), eq(hmSiteEditorsTable.isActive, true)));

  if (rows.length === 0) return null;

  const sites = await listAsgTargetSites(db);
  const asgSiteId = sites.find((s) => normSlug(s.slug) === "asg")?.id ?? null;

  const sorted = [...rows].sort((a, b) => {
    const aOnAsg = asgSiteId != null && a.siteId === asgSiteId ? 1 : 0;
    const bOnAsg = asgSiteId != null && b.siteId === asgSiteId ? 1 : 0;
    if (aOnAsg !== bOnAsg) return bOnAsg - aOnAsg;
    const at = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
    const bt = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
    if (bt !== at) return bt - at;
    return (b.id ?? 0) - (a.id ?? 0);
  });
  return sorted[0] ?? null;
}

/**
 * sehirgazetesiankara@gmail.com — ASG + Ankara Haber Gündemi ortak hesap.
 * Aynı şifre hash + kullanıcı adı (sehirgazetesi) her iki sitede.
 */
export async function repairAsgEditorMisassignment(): Promise<AsgEditorRepairResult> {
  await ensureHmSiteEditorUsernameColumn().catch(() => undefined);
  const db = getNewsDbForRead();

  const sites = await listAsgTargetSites(db);
  if (sites.length === 0) {
    return { ok: false, action: "missing_source", siteIds: [], editorIds: [], detail: "hedef site yok" };
  }

  const source = await pickCanonicalSharedEditorSource(db);
  if (!source?.passwordHash) {
    return { ok: false, action: "missing_source", siteIds: sites.map((s) => s.id), editorIds: [] };
  }

  const editorIds: number[] = [];
  for (const site of sites) {
    const [existing] = await db
      .select({ id: hmSiteEditorsTable.id })
      .from(hmSiteEditorsTable)
      .where(and(eq(hmSiteEditorsTable.siteId, site.id), eq(hmSiteEditorsTable.email, ASG_SHARED_EMAIL)))
      .limit(1);

    const displayName =
      normSlug(site.slug) === "asg"
        ? "Ankara Şehir Gazetesi"
        : source.displayName || site.displayName || "Editör";

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
      email: ASG_SHARED_EMAIL,
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

/** Giriş: ortak ASG hesabını hedef sitede oluştur / senkronla. */
export async function repairAsgEditorForLogin(
  emailRaw: string,
  siteId: number,
): Promise<(typeof hmSiteEditorsTable.$inferSelect) | null> {
  const email = String(emailRaw ?? "")
    .trim()
    .toLowerCase();
  if (!isHmCrossSiteSharedEditorEmail(email)) return null;
  await repairAsgEditorMisassignment().catch(() => undefined);
  const db = getNewsDbForRead();
  const [editor] = await db
    .select()
    .from(hmSiteEditorsTable)
    .where(
      and(
        eq(hmSiteEditorsTable.siteId, siteId),
        eq(hmSiteEditorsTable.email, email),
        eq(hmSiteEditorsTable.isActive, true),
      ),
    )
    .limit(1);
  return editor ?? null;
}

/**
 * Ortak ASG hesabında site bazlı hash uyumsuzluğu: başka sitedeki doğru hash ile girişe izin ver,
 * tüm eşlerde senkronla.
 */
export async function tryHmSharedEditorLoginPassword(
  emailRaw: string,
  password: string,
  siteId: number,
): Promise<boolean> {
  const email = String(emailRaw ?? "")
    .trim()
    .toLowerCase();
  if (!isHmCrossSiteSharedEditorEmail(email) || !password) return false;

  const db = getNewsDbForRead();
  const peers = await db
    .select()
    .from(hmSiteEditorsTable)
    .where(and(sql`lower(${hmSiteEditorsTable.email}) = ${email}`, eq(hmSiteEditorsTable.isActive, true)));

  let matchedHash: string | null = null;
  for (const peer of peers) {
    if (!peer.passwordHash) continue;
    if (await bcrypt.compare(password, peer.passwordHash)) {
      matchedHash = peer.passwordHash;
      break;
    }
  }
  if (!matchedHash) return false;

  const now = new Date();
  for (const peer of peers) {
    if (peer.passwordHash === matchedHash) continue;
    await dualWriteUpdate(
      hmSiteEditorsTable,
      { passwordHash: matchedHash, username: SHARED_USERNAME, isActive: true, updatedAt: now },
      eq(hmSiteEditorsTable.id, peer.id),
    );
  }

  const onSite = peers.find((p) => p.siteId === siteId);
  if (!onSite) {
    await repairAsgEditorForLogin(email, siteId);
    return true;
  }
  if (onSite.passwordHash !== matchedHash) {
    await dualWriteUpdate(
      hmSiteEditorsTable,
      { passwordHash: matchedHash, username: SHARED_USERNAME, isActive: true, updatedAt: now },
      eq(hmSiteEditorsTable.id, onSite.id),
    );
  }
  return true;
}
