import { pgTable, serial, integer, text, index, uniqueIndex } from "drizzle-orm/pg-core";

export const vkdMsbSehitlerTable = pgTable(
  "vkd_msb_sehitler",
  {
    id: serial("id").primaryKey(),
    msbId: text("msb_id").notNull(),
    name: text("name").notNull(),
    rank: text("rank").notNull().default(""),
    registry: text("registry").notNull().default(""),
    notice: text("notice").notNull().default(""),
    martyrdomDate: text("martyrdom_date").notNull().default(""),
    year: integer("year"),
    imagePath: text("image_path").notNull().default(""),
    searchText: text("search_text").notNull().default(""),
    firstSeenAt: text("first_seen_at").notNull().default(""),
    updatedAt: text("updated_at").notNull().default(""),
  },
  (t) => ({
    msbIdIdx: uniqueIndex("vkd_msb_sehitler_msb_id_idx").on(t.msbId),
    yearIdx: index("vkd_msb_sehitler_year_idx").on(t.year),
    searchIdx: index("vkd_msb_sehitler_search_idx").on(t.searchText),
  }),
);
