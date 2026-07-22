import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { eq, ne, sql as drizzleSql, and as drizzleAnd, and, count, or } from "drizzle-orm";
import { db } from "@workspace/db";
import { siteMembersTable, panelAdminUsersTable } from "@workspace/db/schema";
import { trySendSiteOutboundWhatsApp } from "../lib/whatsapp";
import { denyUnlessFullPanelAdmin, isPanelFullAdminSession } from "../lib/admin-guard.js";
import { hmEditorJwtGrantsHaberlerPanel } from "../lib/hmEditorJwt.js";
import {
  normalizePanelPermissionsInput,
  type PanelPermissionKey,
} from "../lib/panel-permissions.js";

const router = Router();

let siteMembersTierSchemaPromise: Promise<void> | null = null;
/** Eski veritabanlarında `site_members` ilan kotası / işletme premium kolonları yoksa ekler. */
export function ensureSiteMembersListingTierSchema(): Promise<void> {
  if (siteMembersTierSchemaPromise) return siteMembersTierSchemaPromise;
  siteMembersTierSchemaPromise = (async () => {
    await db.execute(
      drizzleSql`ALTER TABLE site_members ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'individual'`,
    );
    await db.execute(
      drizzleSql`ALTER TABLE site_members ADD COLUMN IF NOT EXISTS business_premium BOOLEAN NOT NULL DEFAULT false`,
    );
    await db.execute(
      drizzleSql`ALTER TABLE site_members ADD COLUMN IF NOT EXISTS business_premium_expires_at TIMESTAMP`,
    );
  })().catch((e) => {
    siteMembersTierSchemaPromise = null;
    throw e;
  });
  return siteMembersTierSchemaPromise;
}

export function isPremiumBusinessMember(m: {
  accountType?: string | null;
  businessPremium?: boolean | null;
  businessPremiumExpiresAt?: Date | string | null;
}): boolean {
  const at = String(m.accountType || "individual").toLowerCase();
  if (at !== "business") return false;
  if (!m.businessPremium) return false;
  const exp = m.businessPremiumExpiresAt;
  if (exp == null) return true;
  const t = typeof exp === "string" ? new Date(exp) : exp;
  return t.getTime() > Date.now();
}

let panelAdminSchemaPromise: Promise<void> | null = null;

function ensurePanelAdminUsersSchema(): Promise<void> {
  if (panelAdminSchemaPromise) return panelAdminSchemaPromise;
  panelAdminSchemaPromise = (async () => {
    await db.execute(drizzleSql`
      CREATE TABLE IF NOT EXISTS panel_admin_users (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        username text NOT NULL UNIQUE,
        email text,
        password_hash text NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await db.execute(
      drizzleSql`ALTER TABLE panel_admin_users ADD COLUMN IF NOT EXISTS permissions_json TEXT`,
    );
  })().catch((e) => {
    panelAdminSchemaPromise = null;
    throw e;
  });
  return panelAdminSchemaPromise;
}

/** Eski kurulum: tablo boşsa env’deki ADMIN_PANEL_* ile ilk kayıtları oluşturur (aynı şifre). */
async function seedPanelAdminsFromEnvIfEmpty(): Promise<void> {
  await ensurePanelAdminUsersSchema();
  const [cntRow] = await db.select({ c: count() }).from(panelAdminUsersTable);
  if (Number(cntRow?.c ?? 0) > 0) return;
  const pass = String(process.env["ADMIN_PANEL_PASSWORD"] ?? "").trim();
  const usersRaw = String(process.env["ADMIN_PANEL_USERNAMES"] ?? "").trim();
  if (!pass || !usersRaw) return;
  const allowed = usersRaw.split(",").map((s) => s.trim()).filter(Boolean);
  const hash = await bcrypt.hash(pass, 10);
  for (const a of allowed) {
    const email = a.includes("@") ? a.trim().toLowerCase() : null;
    const username = email ?? a;
    try {
      await db.insert(panelAdminUsersTable).values({
        username,
        email,
        passwordHash: hash,
        isActive: true,
      });
    } catch {
      /* unique vs race */
    }
  }
}

/** Sunucuda tanımlı yönetici listesi + düz şifre (yedek; DB kullanıcıları önceliklidir). */
function verifyAdminPanelCredentialsEnv(username: string, password: string): boolean {
  const pass = String(process.env["ADMIN_PANEL_PASSWORD"] ?? "").trim();
  const usersRaw = String(process.env["ADMIN_PANEL_USERNAMES"] ?? "").trim();
  if (!pass || !usersRaw) return false;
  const allowed = usersRaw.split(",").map((s) => s.trim()).filter(Boolean);
  const u = username.trim();
  const userOk = allowed.some((a) =>
    a.includes("@") ? a.toLowerCase() === u.toLowerCase() : a.toLowerCase() === u.toLowerCase(),
  );
  return userOk && password === pass;
}

async function verifyAdminPanelCredentials(username: string, password: string): Promise<boolean> {
  const r = await resolvePanelLogin(username, password);
  return r != null;
}

type PanelLoginResult = { kind: "full" } | { kind: "limited"; permissions: PanelPermissionKey[] };

async function mapDbRowToPanelLogin(
  row: typeof panelAdminUsersTable.$inferSelect,
  password: string,
): Promise<PanelLoginResult | null> {
  const ok = await bcrypt.compare(password, row.passwordHash);
  if (!ok) return null;
  const raw = row.permissionsJson;
  if (raw == null || !String(raw).trim()) return { kind: "full" };
  try {
    const parsed = JSON.parse(String(raw)) as unknown;
    if (!Array.isArray(parsed)) return { kind: "full" };
    const normalized = normalizePanelPermissionsInput(parsed);
    if (normalized == null || normalized.length === 0) return { kind: "limited", permissions: [] };
    return { kind: "limited", permissions: normalized };
  } catch {
    return { kind: "full" };
  }
}

async function resolvePanelLogin(username: string, password: string): Promise<PanelLoginResult | null> {
  const u = username.trim();
  // Render ortam değişkeni girişi — DB havuzu doluyken bile anında yanıt
  if (verifyAdminPanelCredentialsEnv(u, password)) return { kind: "full" };

  try {
    await seedPanelAdminsFromEnvIfEmpty();
    const uLower = u.toLowerCase();
    const rows = await db
      .select()
      .from(panelAdminUsersTable)
      .where(
        and(
          eq(panelAdminUsersTable.isActive, true),
          or(
            eq(panelAdminUsersTable.username, u),
            drizzleSql`lower(${panelAdminUsersTable.username}) = ${uLower}`,
            drizzleSql`lower(${panelAdminUsersTable.email}) = ${uLower}`,
          ),
        ),
      )
      .limit(5);
    for (const row of rows) {
      const mapped = await mapDbRowToPanelLogin(row, password);
      if (mapped) return mapped;
    }
  } catch {
    /* tablo yoksa veya hata */
  }
  return null;
}

/**
 * POST /api/members/admin-panel-session
 * Yönetim paneli (VITE_ADMIN_*) ile girişten sonra çağrılır; express-session’a panel bayrağı yazar.
 * Production’da Railway’de ADMIN_PANEL_PASSWORD ve ADMIN_PANEL_USERNAMES zorunlu (Vercel ile aynı değerler).
 */
/**
 * PATCH /api/members/admin/:memberId/listing-tier
 * Yönetici oturumu (`panelBootstrap`): işletme premium ve hesap türü.
 */
router.patch("/admin/:memberId/listing-tier", async (req, res): Promise<void> => {
  if (!denyUnlessFullPanelAdmin(req, res)) return;
  const memberId = String(req.params.memberId || "").trim();
  if (!memberId) {
    res.status(400).json({ success: false, error: "Üye kimliği gerekli." });
    return;
  }
  try {
    await ensureSiteMembersListingTierSchema();
    const b = req.body as {
      accountType?: string;
      businessPremium?: boolean;
      businessPremiumExpiresAt?: string | null;
    };
    const patch: Record<string, unknown> = {};
    if (b.accountType === "individual" || b.accountType === "business") {
      patch.accountType = b.accountType;
    }
    if (typeof b.businessPremium === "boolean") patch.businessPremium = b.businessPremium;
    if (b.businessPremiumExpiresAt !== undefined) {
      patch.businessPremiumExpiresAt =
        b.businessPremiumExpiresAt === null || b.businessPremiumExpiresAt === ""
          ? null
          : new Date(b.businessPremiumExpiresAt);
    }
    if (Object.keys(patch).length === 0) {
      res.status(400).json({ success: false, error: "Güncellenecek alan yok." });
      return;
    }
    patch.updatedAt = new Date();
    const [row] = await db.update(siteMembersTable).set(patch as any).where(eq(siteMembersTable.id, memberId)).returning();
    if (!row) {
      res.status(404).json({ success: false, error: "Üye bulunamadı." });
      return;
    }
    res.json({
      success: true,
      data: {
        id: row.id,
        accountType: row.accountType,
        businessPremium: row.businessPremium,
        businessPremiumExpiresAt: row.businessPremiumExpiresAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** GET /api/members/admin-panel-status — SPA, tarayıcı oturumu var mı (panelBootstrap) kontrolü. */
router.get("/admin-panel-status", (req, res): void => {
  const boot = req.session?.panelBootstrap === true || hmEditorJwtGrantsHaberlerPanel(req);
  const perms = req.session?.panelPermissions;
  res.json({
    panelBootstrap: boot,
    panelFullAdmin: boot && isPanelFullAdminSession(req),
    permissions: Array.isArray(perms) ? perms : null,
  });
});

function saveSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });
}

router.post("/admin-panel-session", async (req, res): Promise<void> => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };
    const user = String(username ?? "").trim().replace(/^\uFEFF/, "");
    // Yapıştırma / autofill sondaki boşluk veya satır sonunu sık kırar.
    const pass = String(password ?? "").replace(/^\uFEFF/, "").replace(/[\r\n]+$/g, "");
    if (!user || !pass) {
      res.status(400).json({ success: false, error: "Kullanıcı adı ve şifre gerekli." });
      return;
    }
    const login = await resolvePanelLogin(user, pass);
    if (!login) {
      res.status(401).json({
        success: false,
        error: "Kullanıcı adı veya şifre hatalı.",
      });
      return;
    }
    req.session.panelBootstrap = true;
    if (login.kind === "full") {
      delete req.session.panelPermissions;
    } else {
      req.session.panelPermissions = login.permissions;
    }
    await saveSession(req);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: "Oturum kaydedilemedi. Lütfen tekrar deneyin.",
      ...(process.env.NODE_ENV === "production" ? {} : { detail: String(err) }),
    });
  }
});

function panelPermissionsFromDbJson(json: string | null | undefined): PanelPermissionKey[] | null {
  if (json == null || !String(json).trim()) return null;
  try {
    const a = JSON.parse(String(json)) as unknown;
    return normalizePanelPermissionsInput(a);
  } catch {
    return null;
  }
}

/** GET /api/members/panel-admins — aktif panel kullanıcıları (şifre yok). */
router.get("/panel-admins", async (req, res): Promise<void> => {
  if (!denyUnlessFullPanelAdmin(req, res)) return;
  try {
    await ensurePanelAdminUsersSchema();
    const rows = await db
      .select({
        id: panelAdminUsersTable.id,
        username: panelAdminUsersTable.username,
        email: panelAdminUsersTable.email,
        permissionsJson: panelAdminUsersTable.permissionsJson,
        isActive: panelAdminUsersTable.isActive,
        createdAt: panelAdminUsersTable.createdAt,
        updatedAt: panelAdminUsersTable.updatedAt,
      })
      .from(panelAdminUsersTable)
      .orderBy(panelAdminUsersTable.username);
    res.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        username: r.username,
        email: r.email,
        isActive: r.isActive,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        permissions: panelPermissionsFromDbJson(r.permissionsJson),
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** POST /api/members/panel-admins */
router.post("/panel-admins", async (req, res): Promise<void> => {
  if (!denyUnlessFullPanelAdmin(req, res)) return;
  try {
    await ensurePanelAdminUsersSchema();
    const b = req.body as {
      username?: string;
      email?: string | null;
      password?: string;
      permissions?: unknown;
    };
    const username = String(b.username ?? "").trim();
    const password = String(b.password ?? "");
    if (!username || password.length < 6) {
      res.status(400).json({ success: false, error: "Kullanıcı adı ve en az 6 karakter şifre gerekli." });
      return;
    }
    const email = b.email != null && String(b.email).trim() ? String(b.email).trim().toLowerCase() : null;
    const passwordHash = await bcrypt.hash(password, 10);
    let permissionsJson: string | null = null;
    if (b.permissions !== undefined) {
      const permNorm = normalizePanelPermissionsInput(b.permissions);
      permissionsJson = permNorm == null ? null : JSON.stringify(permNorm);
    }
    const [row] = await db
      .insert(panelAdminUsersTable)
      .values({ username, email, passwordHash, permissionsJson, isActive: true })
      .returning({
        id: panelAdminUsersTable.id,
        username: panelAdminUsersTable.username,
        email: panelAdminUsersTable.email,
        permissionsJson: panelAdminUsersTable.permissionsJson,
        isActive: panelAdminUsersTable.isActive,
        createdAt: panelAdminUsersTable.createdAt,
      });
    res.json({
      success: true,
      data: row
        ? {
            id: row.id,
            username: row.username,
            email: row.email,
            isActive: row.isActive,
            createdAt: row.createdAt,
            permissions: panelPermissionsFromDbJson(row.permissionsJson),
          }
        : null,
    });
  } catch (err: unknown) {
    const msg = String(err);
    if (msg.includes("unique") || msg.includes("duplicate")) {
      res.status(409).json({ success: false, error: "Bu kullanıcı adı zaten kayıtlı." });
      return;
    }
    res.status(500).json({ success: false, error: msg });
  }
});

/** PATCH /api/members/panel-admins/:id */
router.patch("/panel-admins/:id", async (req, res): Promise<void> => {
  if (!denyUnlessFullPanelAdmin(req, res)) return;
  const id = String(req.params.id ?? "").trim();
  if (!id) {
    res.status(400).json({ success: false, error: "Kimlik gerekli." });
    return;
  }
  try {
    await ensurePanelAdminUsersSchema();
    const b = req.body as {
      username?: string;
      email?: string | null;
      password?: string;
      isActive?: boolean;
      permissions?: unknown;
    };
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof b.username === "string" && b.username.trim()) patch.username = b.username.trim();
    if (b.email !== undefined) patch.email = b.email && String(b.email).trim() ? String(b.email).trim().toLowerCase() : null;
    if (typeof b.password === "string" && b.password.length > 0) {
      if (b.password.length < 6) {
        res.status(400).json({ success: false, error: "Şifre en az 6 karakter olmalı." });
        return;
      }
      patch.passwordHash = await bcrypt.hash(b.password, 10);
    }
    if (typeof b.isActive === "boolean") patch.isActive = b.isActive;
    if (b.permissions !== undefined) {
      const permNorm = normalizePanelPermissionsInput(b.permissions);
      patch.permissionsJson = permNorm == null ? null : JSON.stringify(permNorm);
    }
    if (Object.keys(patch).length <= 1) {
      res.status(400).json({ success: false, error: "Güncellenecek alan yok." });
      return;
    }
    if (patch.isActive === false) {
      const [otherActive] = await db
        .select({ c: count() })
        .from(panelAdminUsersTable)
        .where(and(eq(panelAdminUsersTable.isActive, true), ne(panelAdminUsersTable.id, id)));
      if (Number(otherActive?.c ?? 0) < 1) {
        res.status(400).json({ success: false, error: "Son aktif yönetici pasifleştirilemez." });
        return;
      }
    }
    const [row] = await db.update(panelAdminUsersTable).set(patch as any).where(eq(panelAdminUsersTable.id, id)).returning({
      id: panelAdminUsersTable.id,
      username: panelAdminUsersTable.username,
      email: panelAdminUsersTable.email,
      permissionsJson: panelAdminUsersTable.permissionsJson,
      isActive: panelAdminUsersTable.isActive,
      updatedAt: panelAdminUsersTable.updatedAt,
    });
    if (!row) {
      res.status(404).json({ success: false, error: "Kayıt bulunamadı." });
      return;
    }
    res.json({
      success: true,
      data: {
        id: row.id,
        username: row.username,
        email: row.email,
        isActive: row.isActive,
        updatedAt: row.updatedAt,
        permissions: panelPermissionsFromDbJson(row.permissionsJson),
      },
    });
  } catch (err: unknown) {
    const msg = String(err);
    if (msg.includes("unique") || msg.includes("duplicate")) {
      res.status(409).json({ success: false, error: "Bu kullanıcı adı zaten kayıtlı." });
      return;
    }
    res.status(500).json({ success: false, error: msg });
  }
});

/** DELETE /api/members/panel-admins/:id */
router.delete("/panel-admins/:id", async (req, res): Promise<void> => {
  if (!denyUnlessFullPanelAdmin(req, res)) return;
  const id = String(req.params.id ?? "").trim();
  if (!id) {
    res.status(400).json({ success: false, error: "Kimlik gerekli." });
    return;
  }
  try {
    await ensurePanelAdminUsersSchema();
    const [target] = await db.select().from(panelAdminUsersTable).where(eq(panelAdminUsersTable.id, id)).limit(1);
    if (!target) {
      res.status(404).json({ success: false, error: "Kayıt bulunamadı." });
      return;
    }
    if (target.isActive) {
      const [otherActive] = await db
        .select({ c: count() })
        .from(panelAdminUsersTable)
        .where(and(eq(panelAdminUsersTable.isActive, true), ne(panelAdminUsersTable.id, id)));
      if (Number(otherActive?.c ?? 0) < 1) {
        res.status(400).json({ success: false, error: "Son aktif yönetici silinemez." });
        return;
      }
    }
    await db.delete(panelAdminUsersTable).where(eq(panelAdminUsersTable.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** POST /api/members/register */
router.post("/register", async (req, res): Promise<void> => {
  try {
    await ensureSiteMembersListingTierSchema();
    const { firstName, lastName, email, phone, password, accountType: accountTypeRaw } = req.body as {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      password?: string;
      accountType?: string;
    };
    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !password) {
      res.status(400).json({ success: false, error: "Ad, soyad, e-posta ve şifre zorunludur." });
      return;
    }
    const emailNorm = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      res.status(400).json({ success: false, error: "Geçersiz e-posta adresi." });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ success: false, error: "Şifre en az 6 karakter olmalıdır." });
      return;
    }
    const existing = await db.select({ id: siteMembersTable.id })
      .from(siteMembersTable).where(eq(siteMembersTable.email, emailNorm)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ success: false, error: "Bu e-posta adresi zaten kayıtlı." });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const at = String(accountTypeRaw || "individual").toLowerCase() === "business" ? "business" : "individual";
    const [member] = await db.insert(siteMembersTable).values({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: emailNorm,
      phone: phone?.trim() || null,
      passwordHash,
      accountType: at,
      businessPremium: false,
      businessPremiumExpiresAt: null,
    }).returning();
    req.session.memberId = member!.id;
    req.session.memberEmail = member!.email;
    req.session.memberName = `${member!.firstName} ${member!.lastName}`;
    req.session.panelBootstrap = false;
    res.json({
      success: true,
      data: {
        id: member!.id,
        firstName: member!.firstName,
        lastName: member!.lastName,
        email: member!.email,
        phone: member!.phone,
        accountType: member!.accountType ?? "individual",
        businessPremium: member!.businessPremium ?? false,
        businessPremiumExpiresAt: member!.businessPremiumExpiresAt ?? null,
      },
    });

    const phoneTrim = member!.phone?.trim();
    if (phoneTrim) {
      const base = `Yekpare — Merhaba ${member!.firstName}, kaydınız başarıyla oluşturulmuştur.`;
      const extra =
        at === "business"
          ? ` İşletme hesabınız için doğrulama ve ilan özelliklerinde kullanılacak belgeleri profilinizden tamamlamanızı hatırlatırız.`
          : "";
      void trySendSiteOutboundWhatsApp(phoneTrim, `${base}${extra}`).catch(() => {});
    }
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** POST /api/members/login */
router.post("/login", async (req, res): Promise<void> => {
  try {
    await ensureSiteMembersListingTierSchema();
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email?.trim() || !password) {
      res.status(400).json({ success: false, error: "E-posta ve şifre zorunludur." });
      return;
    }
    const emailNorm = email.trim().toLowerCase();
    const [member] = await db.select().from(siteMembersTable)
      .where(eq(siteMembersTable.email, emailNorm)).limit(1);
    if (!member || !member.isActive) {
      res.status(401).json({ success: false, error: "E-posta veya şifre hatalı." });
      return;
    }
    const ok = await bcrypt.compare(password, member.passwordHash);
    if (!ok) {
      res.status(401).json({ success: false, error: "E-posta veya şifre hatalı." });
      return;
    }
    req.session.memberId = member.id;
    req.session.memberEmail = member.email;
    req.session.memberName = `${member.firstName} ${member.lastName}`;
    req.session.panelBootstrap = false;
    res.json({
      success: true,
      data: {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phone: member.phone,
        accountType: member.accountType ?? "individual",
        businessPremium: member.businessPremium ?? false,
        businessPremiumExpiresAt: member.businessPremiumExpiresAt ?? null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** GET /api/members/me */
router.get("/me", async (req, res): Promise<void> => {
  if (!req.session.memberId) {
    res.json({ success: true, data: null });
    return;
  }
  try {
    await ensureSiteMembersListingTierSchema();
    const [member] = await db.select({
      id: siteMembersTable.id,
      firstName: siteMembersTable.firstName,
      lastName: siteMembersTable.lastName,
      email: siteMembersTable.email,
      phone: siteMembersTable.phone,
      createdAt: siteMembersTable.createdAt,
      accountType: siteMembersTable.accountType,
      businessPremium: siteMembersTable.businessPremium,
      businessPremiumExpiresAt: siteMembersTable.businessPremiumExpiresAt,
    }).from(siteMembersTable).where(eq(siteMembersTable.id, req.session.memberId)).limit(1);
    if (!member) {
      req.session.destroy(() => {});
      res.json({ success: true, data: null });
      return;
    }
    const at = String(member.accountType || "individual").toLowerCase();
    const premiumOk = isPremiumBusinessMember(member);
    const activeSeriCount = 0;
    res.json({
      success: true,
      data: {
        ...member,
        accountType: at === "business" ? "business" : "individual",
        seriIlan: {
          /** Bireysel: ücretsiz, sınırsız yayın. İşletme: sınırsız yalnızca premium ile. */
          freeUnlimitedForIndividual: at === "individual",
          businessPremiumActive: premiumOk,
          canPostSeriIlan: false,
          activeCount: at === "business" ? activeSeriCount : undefined,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

/** POST /api/members/logout */
router.post("/logout", (req, res): void => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

export default router;
