import {
  pgTable,
  text,
  varchar,
  serial,
  boolean,
  integer,
  doublePrecision,
  timestamp,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const mapBusinessAppStatusEnum = pgEnum("map_business_app_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export const mapCitiesTable = pgTable("map_cities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  code: text("code").unique(),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const mapDistrictsTable = pgTable("map_districts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  cityId: varchar("city_id").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const mapNeighborhoodsTable = pgTable("map_neighborhoods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  districtId: varchar("district_id").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const mapCategoriesTable = pgTable("map_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  googlePlaceType: text("google_place_type"),
  icon: text("icon"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  hitCount: integer("hit_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const mapBusinessesTable = pgTable("map_businesses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  googlePlaceId: text("google_place_id").unique(),
  slug: text("slug").unique(),
  name: text("name").notNull(),
  categoryId: varchar("category_id"),
  cityId: varchar("city_id"),
  districtId: varchar("district_id"),
  neighborhoodId: varchar("neighborhood_id"),
  address: text("address"),
  email: text("email"),
  phone: text("phone"),
  whatsappNumber: text("whatsapp_number"),
  website: text("website"),
  instagramUrl: text("instagram_url"),
  facebookUrl: text("facebook_url"),
  twitterUrl: text("twitter_url"),
  youtubeUrl: text("youtube_url"),
  menuUrl: text("menu_url"),
  rating: doublePrecision("rating"),
  userRatingsTotal: integer("user_ratings_total"),
  photoUrl: text("photo_url"),
  coverPhotoUrl: text("cover_photo_url"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  isActive: boolean("is_active").notNull().default(true),
  isPremium: boolean("is_premium").notNull().default(false),
  premiumExpiresAt: timestamp("premium_expires_at"),
  ownerId: varchar("owner_id"),
  stripeCustomerId: text("stripe_customer_id"),
  socialMedia: jsonb("social_media"),
  description: text("description"),
  workingHours: jsonb("working_hours"),
  popularHours: jsonb("popular_hours"),
  priceLevel: integer("price_level"),
  hasDelivery: boolean("has_delivery").notNull().default(false),
  hasReservation: boolean("has_reservation").notNull().default(false),
  hasOnlineOrder: boolean("has_online_order").notNull().default(false),
  tags: text("tags").array(),
  /** Places Details’ten accessibility / hizmet bayrakları vb. (JSON) */
  googlePlacesExtras: jsonb("google_places_extras"),
  scrapedPhotos: jsonb("scraped_photos"),
  scrapedReviews: jsonb("scraped_reviews"),
  scrapedAt: timestamp("scraped_at"),
  /** places_api | gmaps_scrape | osm — Google / OSM kaynağı */
  importSource: text("import_source"),
  sortOrder: integer("sort_order").notNull().default(0),
  homepageFeatured: boolean("homepage_featured").notNull().default(false),
  /** Öne çıkarma süresi bittiğinde anasayfa şeridinden düşürülür (NULL = süresiz / manuel) */
  homepageFeaturedUntil: timestamp("homepage_featured_until"),
  homepageSuperCategory: text("homepage_super_category"),
  storeType: text("store_type"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** Admin tarafından düzenlenen öne çıkarma birim fiyatları (gün / hafta / ay) */
export const mapFeaturePlacementPricingTable = pgTable("map_feature_placement_pricing", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  placementKey: text("placement_key").notNull().unique(),
  labelTr: text("label_tr").notNull(),
  priceDay: doublePrecision("price_day").notNull().default(0),
  priceWeek: doublePrecision("price_week").notNull().default(0),
  priceMonth: doublePrecision("price_month").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** İşletme öne çıkarma talepleri (havale dekontu / online); admin onayı */
export const mapFeaturePromotionRequestsTable = pgTable("map_feature_promotion_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull(),
  ownerUserId: varchar("owner_user_id"),
  placementKey: text("placement_key").notNull(),
  billingPeriod: text("billing_period").notNull(),
  units: integer("units").notNull().default(1),
  totalTry: doublePrecision("total_try").notNull(),
  paymentMethod: text("payment_method").notNull(),
  receiptUrl: text("receipt_url"),
  categorySuper: text("category_super"),
  status: text("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  targetType: text("target_type").notNull().default("business"),
  productId: varchar("product_id"),
  campaignId: varchar("campaign_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const mapBusinessImagesTable = pgTable("map_business_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull(),
  imageUrl: text("image_url").notNull(),
  altText: text("alt_text"),
  sortOrder: integer("sort_order").notNull().default(0),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const mapUsersTable = pgTable("map_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firebaseUid: text("firebase_uid").unique(),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  displayName: text("display_name"),
  photoUrl: text("photo_url"),
  phone: text("phone").unique(),
  provider: text("provider").notNull().default("google"),
  emailVerified: boolean("email_verified").notNull().default(false),
  cityId: varchar("city_id"),
  districtId: varchar("district_id"),
  fcmToken: text("fcm_token"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const mapReviewsTable = pgTable("map_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  googlePlaceId: text("google_place_id").notNull(),
  businessId: varchar("business_id"),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const mapFavoritesTable = pgTable("map_favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  googlePlaceId: text("google_place_id").notNull(),
  businessId: varchar("business_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const mapSavedPlacesTable = pgTable("map_saved_places", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  deviceId: text("device_id"),
  businessId: varchar("business_id"),
  name: text("name").notNull(),
  type: text("type").notNull().default("place"),
  category: text("category"),
  address: text("address"),
  phone: text("phone"),
  website: text("website"),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  source: text("source").notNull().default("map_center"),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const mapUserPlaceDraftsTable = pgTable("map_user_place_drafts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  deviceId: text("device_id"),
  businessId: varchar("business_id"),
  name: text("name").notNull(),
  type: text("type").notNull().default("business"),
  category: text("category"),
  address: text("address"),
  phone: text("phone"),
  website: text("website"),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  source: text("source").notNull().default("user_added"),
  status: text("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const mapShareStatesTable = pgTable("map_share_states", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  userId: varchar("user_id"),
  deviceId: text("device_id"),
  title: text("title"),
  centerLat: doublePrecision("center_lat").notNull(),
  centerLng: doublePrecision("center_lng").notNull(),
  zoom: integer("zoom").notNull().default(6),
  baseLayer: text("base_layer").notNull().default("temel"),
  layers: jsonb("layers").notNull().default(sql`'[]'::jsonb`),
  filters: jsonb("filters").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const mapLayerDefinitionsTable = pgTable("map_layer_definitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  icon: text("icon"),
  kind: text("kind").notNull().default("overlay"),
  sourceType: text("source_type").notNull().default("internal"),
  sourceUrl: text("source_url"),
  isEnabled: boolean("is_enabled").notNull().default(true),
  requiresExternalData: boolean("requires_external_data").notNull().default(false),
  emptyState: text("empty_state"),
  sortOrder: integer("sort_order").notNull().default(0),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const mapOwnershipClaimsTable = pgTable("map_ownership_claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  googlePlaceId: text("google_place_id").notNull(),
  businessId: varchar("business_id"),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  message: text("message"),
  status: mapBusinessAppStatusEnum("status").notNull().default("PENDING"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const mapDeviceTokensTable = pgTable("map_device_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fcmToken: text("fcm_token").notNull().unique(),
  deviceId: text("device_id"),
  userId: varchar("user_id"),
  phone: text("phone"),
  platform: text("platform"),
  appVersion: text("app_version"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const mapSystemSettingsTable = pgTable("map_system_settings", {
  id: text("id").primaryKey().default("system"),
  googlePlacesApiKey: text("google_places_api_key"),
  automaticGoogleDataFetch: boolean("automatic_google_data_fetch")
    .notNull()
    .default(false),
  firebaseProjectId: text("firebase_project_id"),
  eczaneApiKey: text("eczane_api_key"),
  mapLayerConfigJson: text("map_layer_config_json"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const mapProductsTable = pgTable("map_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: doublePrecision("price"),
  discountedPrice: doublePrecision("discounted_price"),
  imageUrl: text("image_url"),
  category: text("category"),
  isAvailable: boolean("is_available").notNull().default(true),
  isDeliverable: boolean("is_deliverable").notNull().default(false),
  homeFeatured: boolean("home_featured").notNull().default(false),
  homeFeaturedUntil: timestamp("home_featured_until"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const mapCampaignsTable = pgTable("map_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  discountPercent: integer("discount_percent"),
  discountAmount: doublePrecision("discount_amount"),
  validFrom: timestamp("valid_from"),
  validUntil: timestamp("valid_until"),
  isActive: boolean("is_active").notNull().default(true),
  homeFeatured: boolean("home_featured").notNull().default(false),
  homeFeaturedUntil: timestamp("home_featured_until"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const mapReservationsTable = pgTable("map_reservations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull(),
  userId: varchar("user_id"),
  guestName: text("guest_name"),
  guestPhone: text("guest_phone"),
  guestEmail: text("guest_email"),
  reservationDate: timestamp("reservation_date").notNull(),
  partySize: integer("party_size").notNull().default(1),
  note: text("note"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const mapOrdersTable = pgTable("map_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull(),
  userId: varchar("user_id"),
  guestName: text("guest_name"),
  guestPhone: text("guest_phone"),
  items: jsonb("items").notNull().default(sql`'[]'::jsonb`),
  totalAmount: doublePrecision("total_amount").notNull().default(0),
  deliveryAddress: text("delivery_address"),
  note: text("note"),
  status: text("status").notNull().default("pending"),
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const mapPremiumPaymentsTable = pgTable("map_premium_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull(),
  stripeSessionId: text("stripe_session_id").unique(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  amount: doublePrecision("amount"),
  currency: text("currency").notNull().default("try"),
  status: text("status").notNull().default("pending"),
  planMonths: integer("plan_months").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const mapBusinessApplicationsTable = pgTable("map_business_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Business info
  businessName: text("business_name").notNull(),
  categoryId: varchar("category_id"),
  address: text("address"),
  phone: text("phone"),
  website: text("website"),
  description: text("description"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  // Owner info
  ownerName: text("owner_name").notNull(),
  ownerPhone: text("owner_phone").notNull(),
  ownerEmail: text("owner_email").notNull(),
  // Payment
  paymentMethod: text("payment_method").notNull().default("stripe"), // "stripe" | "wire"
  planMonths: integer("plan_months").notNull().default(1),
  stripeSessionId: text("stripe_session_id"),
  wireTransferNote: text("wire_transfer_note"),
  // Status: pending | payment_pending | approved | rejected
  status: text("status").notNull().default("pending"),
  businessId: varchar("business_id"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const mapPopularLocationsTable = pgTable("map_popular_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameTr: text("name_tr"),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  zoomLevel: integer("zoom_level").notNull().default(13),
  imageUrl: text("image_url"),
  description: text("description"),
  region: text("region"),
  districts: jsonb("districts"),
  businessCount: integer("business_count").default(0),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** Keşfet — Popüler Aramalar ana sekmeleri (Sağlık, Ev, …) */
export const kesfetDiscoverGroupsTable = pgTable("kesfet_discover_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  label: text("label").notNull(),
  icon: text("icon"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** Keşfet — Popüler Aramalar alt kategorileri (kazıma / arama için) */
export const kesfetDiscoverSubcategoriesTable = pgTable("kesfet_discover_subcategories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  groupId: varchar("group_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  googlePlaceType: text("google_place_type"),
  googleKeyword: text("google_keyword"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type KesfetDiscoverGroup = typeof kesfetDiscoverGroupsTable.$inferSelect;
export type KesfetDiscoverSubcategory = typeof kesfetDiscoverSubcategoriesTable.$inferSelect;

export type MapBusinessApplication = typeof mapBusinessApplicationsTable.$inferSelect;
export type MapPopularLocation = typeof mapPopularLocationsTable.$inferSelect;
export type MapCity = typeof mapCitiesTable.$inferSelect;
export type MapDistrict = typeof mapDistrictsTable.$inferSelect;
export type MapCategory = typeof mapCategoriesTable.$inferSelect;
export type MapBusiness = typeof mapBusinessesTable.$inferSelect;
export type MapUser = typeof mapUsersTable.$inferSelect;
export const mapContactMessagesTable = pgTable("map_contact_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull(),
  senderName: text("sender_name").notNull(),
  senderPhone: text("sender_phone"),
  senderEmail: text("sender_email"),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const mapUserReviewsTable = pgTable("map_user_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull(),
  nickname: text("nickname"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  memberId: varchar("member_id"),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  photos: jsonb("photos").default(sql`'[]'::jsonb`),
  status: text("status").notNull().default("pending"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const siteMembersTable = pgTable("site_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  /** `individual`: ücretsiz ilan hakkı (sınırsız). `business`: sınırsız ilan yalnızca premium işletme ile. */
  accountType: text("account_type").notNull().default("individual").$type<"individual" | "business">(),
  /** İşletme hesabı için sınırsız Seri İlan; süre dolunca yenilenmeli. */
  businessPremium: boolean("business_premium").notNull().default(false),
  businessPremiumExpiresAt: timestamp("business_premium_expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type MapUserReview = typeof mapUserReviewsTable.$inferSelect;
export type MapSavedPlace = typeof mapSavedPlacesTable.$inferSelect;
export type MapUserPlaceDraft = typeof mapUserPlaceDraftsTable.$inferSelect;
export type MapShareState = typeof mapShareStatesTable.$inferSelect;
export type MapLayerDefinition = typeof mapLayerDefinitionsTable.$inferSelect;
export type SiteMember = typeof siteMembersTable.$inferSelect;
export type MapReview = typeof mapReviewsTable.$inferSelect;
export type MapProduct = typeof mapProductsTable.$inferSelect;
export type MapOrder = typeof mapOrdersTable.$inferSelect;
export type MapReservation = typeof mapReservationsTable.$inferSelect;
export type MapCampaign = typeof mapCampaignsTable.$inferSelect;
export type MapContactMessage = typeof mapContactMessagesTable.$inferSelect;
