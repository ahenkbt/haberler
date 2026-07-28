import { and, eq, ne, sql } from "drizzle-orm";
import {
  dualWriteUpdate,
  executeNewsDbWrite,
  getNewsDbForRead,
  hmSiteEditorsTable,
} from "@workspace/db";
import { isHmCrossSiteSharedEditorEmail } from "./hm-editor-shared-email.js";

let usernameColumnPromise: Promise<void> | null = null;

/** hm_site_editors.username sütunu + site içi benzersiz indeks. */
export function ensureHmSiteEditorUsernameColumn(): Promise<void> {
  if (usernameColumnPromise) return usernameColumnPromise;
  usernameColumnPromise = (async () => {
    await executeNewsDbWrite(sql`
      ALTER TABLE hm_site_editors ADD COLUMN IF NOT EXISTS username text;
    `);
    await executeNewsDbWrite(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS hm_site_editors_site_id_username_key
        ON hm_site_editors (site_id, username)
        WHERE username IS NOT NULL;
    `);
  })()
    .then(() => undefined)
    .catch((e) => {
      usernameColumnPromise = null;
      throw e;
    });
  return usernameColumnPromise;
}

export function normalizeHmEditorUsername(raw: unknown): string | null {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 40);
  if (!s || s.length < 3) return null;
  if (s.includes("@")) return null;
  return s;
}

export function isHmEditorLoginEmail(raw: string): boolean {
  return raw.includes("@");
}

/** Aynı e-postalı ortak hesaplarda (ASG+AHB) şifre / kullanıcı adı / görünen ad senkronu. */
export async function syncSharedHmEditorCredentials(opts: {
  email: string;
  excludeEditorId?: number;
  passwordHash?: string;
  username?: string | null;
  displayName?: string | null;
  nextEmail?: string;
}): Promise<number> {
  const email = String(opts.email ?? "").trim().toLowerCase();
  if (!email.includes("@") || !isHmCrossSiteSharedEditorEmail(email)) return 0;
  const patch: Partial<typeof hmSiteEditorsTable.$inferInsert> = { updatedAt: new Date() };
  if (typeof opts.passwordHash === "string" && opts.passwordHash) patch.passwordHash = opts.passwordHash;
  if (opts.username !== undefined) patch.username = opts.username;
  if (opts.displayName !== undefined) patch.displayName = opts.displayName;
  if (typeof opts.nextEmail === "string" && opts.nextEmail.includes("@")) {
    patch.email = opts.nextEmail.trim().toLowerCase();
  }
  if (Object.keys(patch).length <= 1) return 0;

  const db = getNewsDbForRead();
  const conds = [eq(hmSiteEditorsTable.email, email), eq(hmSiteEditorsTable.isActive, true)];
  if (opts.excludeEditorId != null) conds.push(ne(hmSiteEditorsTable.id, opts.excludeEditorId));
  const rows = await db
    .select({ id: hmSiteEditorsTable.id })
    .from(hmSiteEditorsTable)
    .where(and(...conds));
  let n = 0;
  for (const row of rows) {
    await dualWriteUpdate(hmSiteEditorsTable, patch, eq(hmSiteEditorsTable.id, row.id));
    n += 1;
  }
  return n;
}
