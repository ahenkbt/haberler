import { pgTable, serial, varchar, boolean, integer, numeric, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { mapBusinessesTable } from "./haritalar";

export const yachtListingExtrasTable = pgTable("yacht_listing_extras", {
  id: serial("id").primaryKey(),
  mapBusinessId: varchar("map_business_id")
    .notNull()
    .unique()
    .references(() => mapBusinessesTable.id, { onDelete: "cascade" }),
  kaptanli: boolean("kaptanli"),
  kabinSayisi: integer("kabin_sayisi"),
  yatakSayisi: integer("yatak_sayisi"),
  wcSayisi: integer("wc_sayisi"),
  uzunlukM: numeric("uzunluk_m", { precision: 8, scale: 2 }),
  yapimYili: integer("yapim_yili"),
  ilanNo: text("ilan_no"),
  featureCategories: jsonb("feature_categories").notNull().default([]),
  sunulanHizmetler: jsonb("sunulan_hizmetler").notNull().default([]),
  ekstraHizmetler: jsonb("ekstra_hizmetler").notNull().default([]),
  teknikDetaylar: jsonb("teknik_detaylar").notNull().default({}),
  limanlar: jsonb("limanlar").notNull().default([]),
  faqItems: jsonb("faq_items").notNull().default([]),
  saatlikFiyat: numeric("saatlik_fiyat", { precision: 12, scale: 2 }),
  gunlukFiyat: numeric("gunluk_fiyat", { precision: 12, scale: 2 }),
  minSureSaat: integer("min_sure_saat").default(2),
  kdvDahil: boolean("kdv_dahil").notNull().default(true),
  kaporaOrani: integer("kapora_orani"),
  rentalTypeDefault: text("rental_type_default").default("saatlik"),
  relatedMapBusinessIds: jsonb("related_map_business_ids").notNull().default([]),
  cancellationPolicy: text("cancellation_policy"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
