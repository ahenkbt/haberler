import {
  pgTable,
  serial,
  integer,
  text,
  index,
} from "drizzle-orm/pg-core";

export const vkdCanakkaleSehitleriTable = pgTable(
  "vkd_canakkale_sehitleri",
  {
    id: serial("id").primaryKey(),
    serialNo: integer("serial_no").notNull(),
    name: text("name").notNull(),
    fatherName: text("father_name").notNull().default(""),
    birthYear: integer("birth_year"),
    nickname: text("nickname").notNull().default(""),
    province: text("province").notNull().default(""),
    district: text("district").notNull().default(""),
    bucak: text("bucak").notNull().default(""),
    village: text("village").notNull().default(""),
    branchClass: text("branch_class").notNull().default(""),
    rank: text("rank").notNull().default(""),
    unitText: text("unit_text").notNull().default(""),
    martyrdomPlace: text("martyrdom_place").notNull().default(""),
    martyrdomDate: text("martyrdom_date").notNull().default(""),
    searchText: text("search_text").notNull().default(""),
  },
  (t) => ({
    serialIdx: index("vkd_canakkale_sehitleri_serial_idx").on(t.serialNo),
    provinceIdx: index("vkd_canakkale_sehitleri_province_idx").on(t.province),
    districtIdx: index("vkd_canakkale_sehitleri_district_idx").on(t.province, t.district),
    searchIdx: index("vkd_canakkale_sehitleri_search_idx").on(t.searchText),
  }),
);

export const vkdDataSyncMarkersTable = pgTable("vkd_data_sync_markers", {
  key: text("key").primaryKey(),
  version: integer("version").notNull().default(0),
  recordCount: integer("record_count").notNull().default(0),
  updatedAt: text("updated_at").notNull().default(""),
});
