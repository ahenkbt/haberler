import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const newsTable = pgTable("news", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  spot: text("spot"),
  content: text("content"),
  imageUrl: text("image_url"),
  categoryId: integer("category_id"),
  authorId: integer("author_id"),
  senderFullName: text("sender_full_name"),
  senderEmail: text("sender_email"),
  senderPhone: text("sender_phone"),
  status: text("status").notNull().default("draft"),
  isFeatured: boolean("is_featured").notNull().default(false),
  /** Alt (site) manşet slider — tepe manşet (`isFeatured`) ayrıdır. */
  isSiteManset: boolean("is_site_manset").notNull().default(false),
  isBreaking: boolean("is_breaking").notNull().default(false),
  views: integer("views").notNull().default(0),
  tags: text("tags").array().notNull().default([]),
  isAiGenerated: boolean("is_ai_generated").notNull().default(false),
  /** HM çoklu site; null = merkez veya migrasyon öncesi kayıt. FK migrasyonda tanımlı. */
  siteId: integer("site_id"),
  /** RSS öğesi `link` vb. — aynı siteye tekrar eklemeyi önlemek için (0040). */
  rssSourceUrl: text("rss_source_url"),
  /** Panelden manuel eklenen haber (RSS değil); İçerik Havuzu \"Editör Haberleri\". */
  isEditorManual: boolean("is_editor_manual").notNull().default(false),
  /**
   * Siteye özel haber: true ise SADECE `ownerSiteId` sitesinde görünür;
   * yekpare.net/haberler ve diğer editör sitelerine dahil edilmez / senkron edilmez.
   */
  siteOnly: boolean("site_only").notNull().default(false),
  /** `siteOnly` haberin sahibi editör site. */
  ownerSiteId: integer("owner_site_id"),
  /** Yemek tarifi modülü — `/yemek` alt kategori slug'ı ile eşleşir. */
  isFoodRecipe: boolean("is_food_recipe").notNull().default(false),
  foodRecipeCategorySlug: text("food_recipe_category_slug"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type NewsRow = typeof newsTable.$inferSelect;
