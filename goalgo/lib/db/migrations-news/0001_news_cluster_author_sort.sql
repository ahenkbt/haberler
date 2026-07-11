-- Haber cluster: mevcut kurulumlarda HM yazar sırası kolonu
--> statement-breakpoint
ALTER TABLE authors ADD COLUMN IF NOT EXISTS hm_sort_order integer;
