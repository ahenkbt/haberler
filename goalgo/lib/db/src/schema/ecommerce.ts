import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";

export const productCategoriesTable = pgTable("product_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  imageUrl: text("image_url"),
  parentId: integer("parent_id"),
  position: integer("position").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  shortDescription: text("short_description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0"),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }),
  sku: text("sku"),
  stock: integer("stock").notNull().default(0),
  imageUrl: text("image_url"),
  images: text("images").array(),
  categoryId: integer("category_id"),
  tags: text("tags").array(),
  featured: boolean("featured").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  trackingCode: text("tracking_code").unique(),
  userId: integer("user_id"),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone"),
  customerAddress: text("customer_address"),
  customerCity: text("customer_city"),
  customerPostal: text("customer_postal"),
  customerDistrict: text("customer_district"),
  billingName: text("billing_name"),
  billingAddress: text("billing_address"),
  billingCity: text("billing_city"),
  billingTaxId: text("billing_tax_id"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  paymentMethod: text("payment_method").notNull().default("credit_card"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  cargoCompany: text("cargo_company"),
  cargoTrackingNumber: text("cargo_tracking_number"),
  cargoTrackingUrl: text("cargo_tracking_url"),
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
  estimatedDelivery: text("estimated_delivery"),
  notes: text("notes"),
  adminNote: text("admin_note"),
  items: text("items"),
  legalDistanceSalesAccepted: boolean("legal_distance_sales_accepted").notNull().default(false),
  legalPreinfoAccepted: boolean("legal_preinfo_accepted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** Stripe webhook idempotency + denetim (MVP M4) */
export const stripeWebhookEventsTable = pgTable("stripe_webhook_events", {
  id: serial("id").primaryKey(),
  stripeEventId: text("stripe_event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  outcome: text("outcome").notNull(),
  detail: text("detail"),
  relatedOrderId: integer("related_order_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const shopUsersTable = pgTable("shop_users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  district: text("district"),
  postal: text("postal"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const paymentSettingsTable = pgTable("payment_settings", {
  id: serial("id").primaryKey(),
  stripeEnabled: boolean("stripe_enabled").notNull().default(false),
  stripePublishableKey: text("stripe_publishable_key"),
  stripeSecretKey: text("stripe_secret_key"),
  stripeWebhookSecret: text("stripe_webhook_secret"),
  bankTransferEnabled: boolean("bank_transfer_enabled").notNull().default(false),
  bankName: text("bank_name"),
  bankIban: text("bank_iban"),
  bankAccountName: text("bank_account_name"),
  bankBranch: text("bank_branch"),
  currency: text("currency").notNull().default("TRY"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).notNull().default("20"),
  orderEmailFrom: text("order_email_from"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const shopSettingsTable = pgTable("shop_settings", {
  id: serial("id").primaryKey(),
  storeName: text("store_name").default("Mağaza"),
  storeDescription: text("store_description"),
  bannerImageUrl: text("banner_image_url"),
  returnPolicy: text("return_policy").default("Ürünü teslim aldıktan sonra 14 gün içinde iade edebilirsiniz. İade edilecek ürünlerin kullanılmamış, orijinal ambalajında ve fatura ile birlikte gönderilmesi gerekmektedir."),
  shippingInfo: text("shipping_info").default("Siparişleriniz 1-3 iş günü içinde kargoya verilir. 500₺ ve üzeri siparişlerde kargo ücretsizdir."),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  contactAddress: text("contact_address"),
  workingHours: text("working_hours").default("Pazartesi - Cuma: 09:00 - 18:00"),
  whatsapp: text("whatsapp"),
  featuredCategorySlug: text("featured_category_slug"),
  bannerSubtext: text("banner_subtext"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type ProductCategoryRow = typeof productCategoriesTable.$inferSelect;
export type ProductRow = typeof productsTable.$inferSelect;
export type OrderRow = typeof ordersTable.$inferSelect;
export type StripeWebhookEventRow = typeof stripeWebhookEventsTable.$inferSelect;

/** PayTR teslimat callback idempotency + denetim (Stripe M4 deseni) */
export const paytrWebhookEventsTable = pgTable("paytr_webhook_events", {
  id: serial("id").primaryKey(),
  paytrEventHash: text("paytr_event_hash").notNull().unique(),
  merchantOid: text("merchant_oid").notNull(),
  paytrStatus: text("paytr_status").notNull(),
  totalAmount: text("total_amount"),
  outcome: text("outcome").notNull(),
  detail: text("detail"),
  relatedOrderId: integer("related_order_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PaytrWebhookEventRow = typeof paytrWebhookEventsTable.$inferSelect;
export type ShopUserRow = typeof shopUsersTable.$inferSelect;
export type PaymentSettingsRow = typeof paymentSettingsTable.$inferSelect;
export type ShopSettingsRow = typeof shopSettingsTable.$inferSelect;
