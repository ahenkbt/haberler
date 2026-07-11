import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { newsTable } from "./news";
import { authorsTable } from "./authors";

export const hmNewsSitesTable = pgTable("hm_news_sites", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  domain: text("domain").unique(),
  /** İkinci özel alan adı (www veya alternatif kök); birincil `domain` ile aynı siteye bağlanır. */
  domain2: text("domain2").unique(),
  /** Üçüncü özel alan adı (ör. .org.tr); aynı siteye bağlanır. */
  domain3: text("domain3").unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  contactJson: text("contact_json"),
  layoutJson: text("layout_json"),
  verificationJson: text("verification_json"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const hmSiteEditorsTable = pgTable(
  "hm_site_editors",
  {
    id: serial("id").primaryKey(),
    siteId: integer("site_id")
      .notNull()
      .references(() => hmNewsSitesTable.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    siteEmailUniq: uniqueIndex("hm_site_editors_site_id_email_key").on(t.siteId, t.email),
  }),
);

export const hmContentPoolItemsTable = pgTable("hm_content_pool_items", {
  id: serial("id").primaryKey(),
  sourceSiteId: integer("source_site_id").references(() => hmNewsSitesTable.id, { onDelete: "set null" }),
  sourceNewsId: integer("source_news_id").references(() => newsTable.id, { onDelete: "set null" }),
  kind: text("kind").notNull().default("news"),
  status: text("status").notNull().default("pending"),
  payloadJson: text("payload_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** HM köşe yazıları (news tablosundan ayrı; site + yazar bağlı). */
export const hmMakalelerTable = pgTable(
  "hm_makaleler",
  {
    id: serial("id").primaryKey(),
    siteId: integer("site_id")
      .notNull()
      .references(() => hmNewsSitesTable.id, { onDelete: "cascade" }),
    authorId: integer("author_id").references(() => authorsTable.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    spot: text("spot"),
    content: text("content"),
    imageUrl: text("image_url"),
    status: text("status").notNull().default("draft"),
    views: integer("views").notNull().default(0),
    /** İçe aktarma / tekrar kontrolü (örn. ahb-ky:123). */
    externalKey: text("external_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    siteSlugUniq: uniqueIndex("hm_makaleler_site_id_slug_key").on(t.siteId, t.slug),
  }),
);

export const hmAiJobsTable = pgTable("hm_ai_jobs", {
  id: serial("id").primaryKey(),
  poolItemId: integer("pool_item_id")
    .notNull()
    .references(() => hmContentPoolItemsTable.id, { onDelete: "cascade" }),
  targetSiteId: integer("target_site_id")
    .notNull()
    .references(() => hmNewsSitesTable.id, { onDelete: "cascade" }),
  mode: text("mode").notNull().default("full_ai"),
  /** Hedef sitede oluşturulacak haber durumu (`draft` | `published`). Boş = yayında. */
  postStatus: text("post_status"),
  status: text("status").notNull().default("queued"),
  errorMessage: text("error_message"),
  /** Havuz işi tamamlanınca oluşturulan hedef site haberi (`news.id`). */
  resultNewsId: integer("result_news_id").references(() => newsTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type HmNewsSiteRow = typeof hmNewsSitesTable.$inferSelect;
export type HmSiteEditorRow = typeof hmSiteEditorsTable.$inferSelect;
export type HmContentPoolItemRow = typeof hmContentPoolItemsTable.$inferSelect;
export type HmAiJobRow = typeof hmAiJobsTable.$inferSelect;
export type HmMakaleRow = typeof hmMakalelerTable.$inferSelect;
