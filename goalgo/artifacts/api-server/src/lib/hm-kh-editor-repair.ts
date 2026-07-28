import { and, eq, ne, sql } from "drizzle-orm";
import {
  dualWriteInsert,
  dualWriteUpdate,
  getNewsDbForRead,
  hmSiteEditorsTable,
} from "@workspace/db";
import { ensureHmSiteEditorUsernameColumn } from "./hm-editor-profile.js";
import { KH_DOMAINS } from "./hm-kh-site-ensure.js";
import { listHmNewsSitesCompat } from "./hm-site-compat.js";

const KH_LEGACY_SLUGS = ["kirsehirhaber", "kirsehir", "kh"] as const;

/** Bilinen Kırşehir editör e-postaları — yanlış siteye eklenmişse KH'ye taşınır. */
const KH_KNOWN_EDITOR_EMAILS = new Set(["kevser@gmail.com"]);

export type KhEditorRepairResult = {
  ok: boolean;
  action: "synced" | "unchanged" | "missing_kh_site" | "error";
  khSiteId: number | null;
  moved: Array<{ email: string; fromSiteId: number; toEditorId: number }>;
  deactivated: number[];
  detail?: string;
};

type EditorRow = {
  id: number;
  siteId: number;
  email: string;
  username: string | null;
  displayName: string | null;
  passwordHash: string;
  isActive: boolean | null;
};

function normSlug(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
}

function normHost(raw: string | null | undefined): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "")
    .split(":")[0] ?? "";
}

function hostMatches(rowHost: string | null | undefined, target: string): boolean {
  const h = normHost(rowHost);
  const t = normHost(target);
  return !!h && (h === t || h === `www.${t}`);
}

export function isKhNewsSiteRow(site: {
  slug: string | null;
  domain?: string | null;
  domain2?: string | null;
  domain3?: string | null;
}): boolean {
  const slug = normSlug(site.slug);
  if (KH_LEGACY_SLUGS.includes(slug as (typeof KH_LEGACY_SLUGS)[number])) return true;
  return KH_DOMAINS.some(
    (host) =>
      hostMatches(site.domain, host) ||
      hostMatches(site.domain2, host) ||
      hostMatches(site.domain3, host),
  );
}

function isKhEditorCandidate(editor: { email: string; displayName: string | null }): boolean {
  const email = editor.email.trim().toLowerCase();
  const dn = String(editor.displayName ?? "")
    .trim()
    .toLowerCase();
  if (KH_KNOWN_EDITOR_EMAILS.has(email)) return true;
  if (email.includes("kirsehirhaber") || email.includes("kirsehri")) return true;
  if (dn.includes("kırşehir") || dn.includes("kirsehir") || dn.includes("kirşehir")) return true;
  return false;
}

async function findKhSiteId(): Promise<number | null> {
  const sites = await listHmNewsSitesCompat();
  const hit = sites.find((s) => isKhNewsSiteRow(s));
  return hit?.id ?? null;
}

async function upsertKhEditor(
  khSiteId: number,
  source: EditorRow,
): Promise<{ editorId: number; created: boolean }> {
  const email = source.email.trim().toLowerCase();
  const [existing] = await getNewsDbForRead()
    .select({ id: hmSiteEditorsTable.id })
    .from(hmSiteEditorsTable)
    .where(and(eq(hmSiteEditorsTable.siteId, khSiteId), sql`lower(${hmSiteEditorsTable.email}) = ${email}`))
    .limit(1);

  const displayName =
    source.displayName?.trim() ||
    (KH_KNOWN_EDITOR_EMAILS.has(email) ? "Kırşehir Haber" : null);

  if (existing) {
    await dualWriteUpdate(
      hmSiteEditorsTable,
      {
        passwordHash: source.passwordHash,
        username: source.username,
        displayName,
        isActive: true,
        updatedAt: new Date(),
      },
      eq(hmSiteEditorsTable.id, existing.id),
    );
    return { editorId: existing.id, created: false };
  }

  const [created] = await dualWriteInsert(hmSiteEditorsTable, {
    siteId: khSiteId,
    email,
    username: source.username,
    passwordHash: source.passwordHash,
    displayName,
    isActive: true,
  });
  if (!created?.id) throw new Error("KH editör kaydı oluşturulamadı");
  return { editorId: created.id, created: true };
}

/**
 * Kırşehir editörleri yanlış HM sitesine (ör. ASG #3) eklenmişse KH sitesine kopyalar;
 * kaynak kaydı pasifleştirir — kirsehirhaber.org girişinde ASG uyarısı çıkmaz.
 */
export async function repairKhEditorMisassignment(): Promise<KhEditorRepairResult> {
  await ensureHmSiteEditorUsernameColumn().catch(() => undefined);
  const khSiteId = await findKhSiteId();
  if (!khSiteId) {
    return { ok: false, action: "missing_kh_site", khSiteId: null, moved: [], deactivated: [] };
  }

  const db = getNewsDbForRead();
  const misplaced = await db
    .select({
      id: hmSiteEditorsTable.id,
      siteId: hmSiteEditorsTable.siteId,
      email: hmSiteEditorsTable.email,
      username: hmSiteEditorsTable.username,
      displayName: hmSiteEditorsTable.displayName,
      passwordHash: hmSiteEditorsTable.passwordHash,
      isActive: hmSiteEditorsTable.isActive,
    })
    .from(hmSiteEditorsTable)
    .where(
      and(
        ne(hmSiteEditorsTable.siteId, khSiteId),
        eq(hmSiteEditorsTable.isActive, true),
      ),
    );

  const moved: KhEditorRepairResult["moved"] = [];
  const deactivated: number[] = [];

  for (const row of misplaced) {
    if (!isKhEditorCandidate(row)) continue;
    const { editorId } = await upsertKhEditor(khSiteId, row as EditorRow);
    await dualWriteUpdate(
      hmSiteEditorsTable,
      { isActive: false, updatedAt: new Date() },
      eq(hmSiteEditorsTable.id, row.id),
    );
    moved.push({ email: row.email, fromSiteId: row.siteId, toEditorId: editorId });
    deactivated.push(row.id);
  }

  return {
    ok: true,
    action: moved.length > 0 ? "synced" : "unchanged",
    khSiteId,
    moved,
    deactivated,
    detail: moved.length ? `${moved.length} editör KH sitesine taşındı` : "taşınacak editör yok",
  };
}

/**
 * Giriş anında: e-posta başka sitede KH adayı olarak duruyorsa tek seferlik onar ve editör döndür.
 */
export async function repairKhEditorForLogin(
  emailRaw: string,
  khSiteId: number,
): Promise<typeof hmSiteEditorsTable.$inferSelect | null> {
  const email = emailRaw.trim().toLowerCase();
  if (!email.includes("@")) return null;

  const db = getNewsDbForRead();
  const [onKh] = await db
    .select()
    .from(hmSiteEditorsTable)
    .where(
      and(
        eq(hmSiteEditorsTable.siteId, khSiteId),
        eq(hmSiteEditorsTable.isActive, true),
        sql`lower(${hmSiteEditorsTable.email}) = ${email}`,
      ),
    )
    .limit(1);
  if (onKh) return onKh;

  const [elsewhere] = await db
    .select()
    .from(hmSiteEditorsTable)
    .where(
      and(
        ne(hmSiteEditorsTable.siteId, khSiteId),
        eq(hmSiteEditorsTable.isActive, true),
        sql`lower(${hmSiteEditorsTable.email}) = ${email}`,
      ),
    )
    .limit(1);
  if (!elsewhere || !isKhEditorCandidate(elsewhere)) return null;

  const { editorId } = await upsertKhEditor(khSiteId, elsewhere as EditorRow);
  await dualWriteUpdate(
    hmSiteEditorsTable,
    { isActive: false, updatedAt: new Date() },
    eq(hmSiteEditorsTable.id, elsewhere.id),
  );

  const [fixed] = await db
    .select()
    .from(hmSiteEditorsTable)
    .where(eq(hmSiteEditorsTable.id, editorId))
    .limit(1);
  return fixed ?? null;
}
