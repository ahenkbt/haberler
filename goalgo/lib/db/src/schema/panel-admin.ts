import { pgTable, text, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/** Yönetim paneli (Haritalar / sipariş admin API oturumu) kullanıcıları — şifre bcrypt ile saklanır. */
export const panelAdminUsersTable = pgTable("panel_admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email"),
  passwordHash: text("password_hash").notNull(),
  /** NULL = tam yetkili; JSON string dizi = alt yönetici izinleri */
  permissionsJson: text("permissions_json"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
