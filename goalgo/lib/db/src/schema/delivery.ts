import { pgTable, text, serial, integer, boolean, timestamp, decimal, real, jsonb } from "drizzle-orm/pg-core";

export const vendorCategoriesTable = pgTable("vendor_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  icon: text("icon"),
  imageUrl: text("image_url"),
  position: integer("position").notNull().default(0),
  active: boolean("active").notNull().default(true),
  superCategory: text("super_category").default("siparis"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const vendorsTable = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  categoryId: integer("category_id"),
  imageUrl: text("image_url"),
  coverUrl: text("cover_url"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  city: text("city"),
  district: text("district"),
  lat: real("lat"),
  lng: real("lng"),
  workingHours: text("working_hours"),
  vendorType: text("vendor_type").notNull().default("delivery"),
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  deliveryTime: integer("delivery_time").notNull().default(30),
  shippingFee: decimal("shipping_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  shippingTime: integer("shipping_time").notNull().default(3),
  freeShippingAbove: decimal("free_shipping_above", { precision: 10, scale: 2 }),
  rating: real("rating").notNull().default(0),
  reviewCount: integer("review_count").notNull().default(0),
  isOpen: boolean("is_open").notNull().default(true),
  featured: boolean("featured").notNull().default(false),
  active: boolean("active").notNull().default(true),
  tags: text("tags").array(),
  whatsapp: text("whatsapp"),
  callmebotKey: text("callmebot_key"),
  ownerUserId: integer("owner_user_id"),
  ownerName: text("owner_name"),
  ownerEmail: text("owner_email"),
  status: text("status").default("active"),
  notes: text("notes"),
  /** Yerel içe aktarımda: Yemeksepeti kaynağında olup çapraz dosyalarda iletişim bulunamadı */
  catalogContactGap: boolean("catalog_contact_gap").notNull().default(false),
  /** Yerel içe aktarımda: YS dışı kaynakta olup menü/ürün yok */
  catalogMenuGap: boolean("catalog_menu_gap").notNull().default(false),
  /** Google Place ID (ChIJ…); harita ile eşleştirme */
  googlePlaceId: text("google_place_id"),
  /** `map_businesses.id` (uuid) */
  linkedMapBusinessId: text("linked_map_business_id"),
  /** gmaps_scrape | places_api | osm */
  googleImportKind: text("google_import_kind"),
  /** Servis sağlayıcı panel girişi (bcrypt) — `ALTER` ile eski DB’lere eklenebilir */
  passwordHash: text("password_hash"),
  /** Gelir: `subscription` (abonelik) veya `commission` (site satışından kesinti) */
  revenueModel: text("revenue_model").notNull().default("subscription"),
  /** Komisyon oranı % — yalnızca commission modelinde */
  commissionRatePct: decimal("commission_rate_pct", { precision: 8, scale: 4 }),
  payoutBankHolder: text("payout_bank_holder"),
  payoutBankIban: text("payout_bank_iban"),
  payoutBankBranch: text("payout_bank_branch"),
  /** Geliver kargo API jetonu (app.geliver.io); yalnız sunucu tarafında kullanılır */
  geliverApiToken: text("geliver_api_token"),
  geliverSenderAddressId: text("geliver_sender_address_id"),
  geliverSenderZip: text("geliver_sender_zip"),
  /** Geliver gönderici address1 başı — mahalle (TR zorunluluğu) */
  geliverSenderMahalle: text("geliver_sender_mahalle"),
  /** true: yeni siparişte otomatik kargo fişi (özellikle ecommerce); sipariş/delivery için isteğe bağlı */
  geliverAutoShipOnOrder: boolean("geliver_auto_ship_on_order").notNull().default(false),
  /** Geliver organizations.getBalance(organizationId) — panel veya URL'den */
  geliverOrganizationId: text("geliver_organization_id"),
  /** PayTR Direkt/iFrame — ödeme satıcı PayTR hesabına geçer (abonelik modeli) */
  paytrMerchantId: text("paytr_merchant_id"),
  paytrMerchantKey: text("paytr_merchant_key"),
  paytrMerchantSalt: text("paytr_merchant_salt"),
  paytrTestMode: boolean("paytr_test_mode").notNull().default(true),
  /** iyzico ödeme formu — tutar satıcı iyzico hesabına geçer */
  iyzicoApiKey: text("iyzico_api_key"),
  iyzicoSecretKey: text("iyzico_secret_key"),
  iyzicoSandbox: boolean("iyzico_sandbox").notNull().default(true),
  /** Öncelik: paytr | iyzico | null (ikisi de doluysa) */
  preferredTrGateway: text("preferred_tr_gateway"),
  /** Servis sağlayıcı üyelik: standard | gold | premium */
  membershipTier: text("membership_tier").notNull().default("gold"),
  /** Hakkımızda / tanıtım metni (vitrinde öncelikli) */
  aboutHtml: text("about_html"),
  /** Vitrin teması: foodmart | sarab | vacation-rental | carbook */
  themeKey: text("theme_key"),
  /** Tema slot değerleri (heroTitle, heroImage, …) */
  themeConfig: jsonb("theme_config").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const vendorMenuCategoriesTable = pgTable("vendor_menu_categories", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull(),
  name: text("name").notNull(),
  position: integer("position").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const vendorMenuItemsTable = pgTable("vendor_menu_items", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull(),
  menuCategoryId: integer("menu_category_id"),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0"),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }),
  imageUrl: text("image_url"),
  isVegan: boolean("is_vegan").notNull().default(false),
  isSpicy: boolean("is_spicy").notNull().default(false),
  isPopular: boolean("is_popular").notNull().default(false),
  preparationTime: integer("preparation_time").notNull().default(15),
  stock: integer("stock"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const deliveryOrdersTable = pgTable("delivery_orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  vendorId: integer("vendor_id").notNull(),
  customerId: integer("customer_id"),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  /** Sipariş onayı / kargo bildirimi (isteğe bağlı) */
  customerEmail: text("customer_email"),
  customerAddress: text("customer_address").notNull(),
  customerCity: text("customer_city"),
  customerDistrict: text("customer_district"),
  customerPostalCode: text("customer_postal_code"),
  customerLat: real("customer_lat"),
  customerLng: real("customer_lng"),
  items: text("items").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  discount: decimal("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  couponCode: text("coupon_code"),
  paymentMethod: text("payment_method").notNull().default("cash"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  status: text("status").notNull().default("pending"),
  driverName: text("driver_name"),
  driverPhone: text("driver_phone"),
  estimatedTime: integer("estimated_time"),
  notes: text("notes"),
  adminNote: text("admin_note"),
  confirmedAt: timestamp("confirmed_at"),
  preparedAt: timestamp("prepared_at"),
  pickedUpAt: timestamp("picked_up_at"),
  deliveredAt: timestamp("delivered_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancelReason: text("cancel_reason"),
  deliveryProofUrl: text("delivery_proof_url"),
  vendorNote: text("vendor_note"),
  tableNumber: text("table_number"),
  orderSource: text("order_source"),
  createdByStaff: text("created_by_staff"),
  assignedUstaId: integer("assigned_usta_id"),
  ustaName: text("usta_name"),
  assignedServisId: integer("assigned_servis_id"),
  servisName: text("servis_name"),
  /** Sipariş anında hesaplanan platform komisyonu (komisyonlu sağlayıcı) */
  platformCommissionAmount: decimal("platform_commission_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  commissionBaseAmount: decimal("commission_base_amount", { precision: 10, scale: 2 }),
  commissionRatePctSnapshot: decimal("commission_rate_pct_snapshot", { precision: 8, scale: 4 }),
  revenueModelSnapshot: text("revenue_model_snapshot"),
  geliverShipmentId: text("geliver_shipment_id"),
  geliverTrackingNumber: text("geliver_tracking_number"),
  geliverLabelUrl: text("geliver_label_url"),
  geliverTransactionId: text("geliver_transaction_id"),
  geliverStatus: text("geliver_status"),
  geliverLastError: text("geliver_last_error"),
  /** iyzico: ödeme formu token eşlemesi (callback’te sipariş bulunur) */
  trCheckoutToken: text("tr_checkout_token"),
  /** 6502 kapsamında mesafeli satış sözleşmesi onayı */
  legalDistanceSalesAccepted: boolean("legal_distance_sales_accepted").notNull().default(false),
  /** Ön bilgilendirme formu onayı */
  legalPreinfoAccepted: boolean("legal_preinfo_accepted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** Sipariş durum değişiklikleri — müşteri takip ve denetim için zaman çizelgesi */
export const deliveryOrderStatusEventsTable = pgTable("delivery_order_status_events", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  source: text("source").notNull().default("api"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Kurye/sürücü canlı konum pingi (en son nokta + kısa tarihçe) */
export const driverLocationsTable = pgTable("driver_locations", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id"),
  courierId: integer("courier_id"),
  courierPhone: text("courier_phone").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  accuracy: real("accuracy"),
  heading: real("heading"),
  speed: real("speed"),
  source: text("source").notNull().default("courier_panel"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const vendorCouriersTable = pgTable("vendor_couriers", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  active: boolean("active").notNull().default(true),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderMessagesTable = pgTable("order_messages", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  senderType: text("sender_type").notNull(),
  senderName: text("sender_name").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const vendorReviewsTable = pgTable("vendor_reviews", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull(),
  orderId: integer("order_id"),
  customerName: text("customer_name").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const couponCodesTable = pgTable("coupon_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  vendorId: integer("vendor_id"),
  discountType: text("discount_type").notNull().default("percent"),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: timestamp("expires_at"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const customerFavoritesTable = pgTable("customer_favorites", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  vendorId: integer("vendor_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type VendorCategoryRow = typeof vendorCategoriesTable.$inferSelect;
export type VendorRow = typeof vendorsTable.$inferSelect;
export type VendorMenuCategoryRow = typeof vendorMenuCategoriesTable.$inferSelect;
export type VendorMenuItemRow = typeof vendorMenuItemsTable.$inferSelect;
export type DeliveryOrderRow = typeof deliveryOrdersTable.$inferSelect;
export type DeliveryOrderStatusEventRow = typeof deliveryOrderStatusEventsTable.$inferSelect;
export type DriverLocationRow = typeof driverLocationsTable.$inferSelect;
export type VendorReviewRow = typeof vendorReviewsTable.$inferSelect;
export type CouponCodeRow = typeof couponCodesTable.$inferSelect;
export type CustomerFavoriteRow = typeof customerFavoritesTable.$inferSelect;
export type VendorCourierRow = typeof vendorCouriersTable.$inferSelect;
export type OrderMessageRow = typeof orderMessagesTable.$inferSelect;
