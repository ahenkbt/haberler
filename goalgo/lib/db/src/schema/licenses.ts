import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const licensesTable = pgTable("licenses", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  phone: text("phone"),
  domain: text("domain"),
  activationCode: text("activation_code").notNull().unique(),
  status: text("status").notNull().default("pending"),
  plan: text("plan").notNull().default("pro"),
  price: integer("price").default(0),
  paymentMethod: text("payment_method"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  notes: text("notes"),
  activatedAt: timestamp("activated_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const siteActivationTable = pgTable("site_activation", {
  id: serial("id").primaryKey(),
  email: text("email"),
  activationCode: text("activation_code"),
  status: text("status").notNull().default("inactive"),
  domain: text("domain"),
  activatedAt: timestamp("activated_at"),
  expiresAt: timestamp("expires_at"),
});

export type License = typeof licensesTable.$inferSelect;
export type SiteActivation = typeof siteActivationTable.$inferSelect;
