import { integer, bigint, text, pgTable } from "drizzle-orm/pg-core";

export const trIlTable = pgTable("tr_il", {
  plaka: integer("plaka").primaryKey(),
  adi: text("adi").notNull(),
  kayitNo: integer("kayit_no"),
});

export const trIlceTable = pgTable("tr_ilce", {
  kimlikNo: bigint("kimlik_no", { mode: "bigint" }).primaryKey(),
  ilPlaka: integer("il_plaka")
    .notNull()
    .references(() => trIlTable.plaka),
  adi: text("adi").notNull(),
  kayitNo: integer("kayit_no"),
});

export const trMahalleTable = pgTable("tr_mahalle", {
  kimlikNo: bigint("kimlik_no", { mode: "bigint" }).primaryKey(),
  ilPlaka: integer("il_plaka").notNull(),
  ilceKimlik: bigint("ilce_kimlik", { mode: "bigint" })
    .notNull()
    .references(() => trIlceTable.kimlikNo),
  adi: text("adi").notNull(),
  bilesen: text("bilesen").notNull().default(""),
});

export const trSokakTable = pgTable("tr_sokak", {
  kimlikNo: bigint("kimlik_no", { mode: "bigint" }).primaryKey(),
  ilPlaka: integer("il_plaka").notNull(),
  ilceKimlik: bigint("ilce_kimlik", { mode: "bigint" }).notNull(),
  mahalleKimlik: bigint("mahalle_kimlik", { mode: "bigint" })
    .notNull()
    .references(() => trMahalleTable.kimlikNo),
  adi: text("adi").notNull(),
  bilesen: text("bilesen").notNull().default(""),
});
