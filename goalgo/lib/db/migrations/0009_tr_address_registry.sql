-- Türkiye il / ilçe / mahalle / sokak (NVI kaynaklı JSONL → import script ile doldurulur)
CREATE TABLE IF NOT EXISTS "tr_il" (
	"plaka" integer PRIMARY KEY NOT NULL,
	"adi" text NOT NULL,
	"kayit_no" integer
);
CREATE TABLE IF NOT EXISTS "tr_ilce" (
	"kimlik_no" bigint PRIMARY KEY NOT NULL,
	"il_plaka" integer NOT NULL REFERENCES "tr_il" ("plaka"),
	"adi" text NOT NULL,
	"kayit_no" integer
);
CREATE INDEX IF NOT EXISTS "tr_ilce_il_plaka_idx" ON "tr_ilce" ("il_plaka");
CREATE TABLE IF NOT EXISTS "tr_mahalle" (
	"kimlik_no" bigint PRIMARY KEY NOT NULL,
	"il_plaka" integer NOT NULL,
	"ilce_kimlik" bigint NOT NULL REFERENCES "tr_ilce" ("kimlik_no"),
	"adi" text NOT NULL,
	"bilesen" text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS "tr_mahalle_ilce_idx" ON "tr_mahalle" ("ilce_kimlik");
CREATE INDEX IF NOT EXISTS "tr_mahalle_il_plaka_idx" ON "tr_mahalle" ("il_plaka");
CREATE TABLE IF NOT EXISTS "tr_sokak" (
	"kimlik_no" bigint PRIMARY KEY NOT NULL,
	"il_plaka" integer NOT NULL,
	"ilce_kimlik" bigint NOT NULL,
	"mahalle_kimlik" bigint NOT NULL REFERENCES "tr_mahalle" ("kimlik_no"),
	"adi" text NOT NULL,
	"bilesen" text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS "tr_sokak_mahalle_idx" ON "tr_sokak" ("mahalle_kimlik");
CREATE INDEX IF NOT EXISTS "tr_sokak_ilce_idx" ON "tr_sokak" ("ilce_kimlik");
