import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const authorsTable = pgTable("authors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  title: text("title"),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  /** Haber merkezi sitesi; null = genel (eski) yazarlar */
  hmSiteId: integer("hm_site_id"),
  /** HM site içinde köşe yazarı vitrin sırası; küçük değer önce gelir. */
  hmSortOrder: integer("hm_sort_order"),
  /** HM köşe yazarı girişi (e-posta site içinde benzersiz) */
  email: text("email"),
  passwordHash: text("password_hash"),
  pwResetToken: text("pw_reset_token"),
  pwResetExpiresAt: timestamp("pw_reset_expires_at"),
});

export type Author = typeof authorsTable.$inferSelect;
