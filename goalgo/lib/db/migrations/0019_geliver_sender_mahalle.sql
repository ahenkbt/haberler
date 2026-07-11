-- Geliver TR: gönderici address1 satırının başında mahalle zorunluluğu için ayrı alan
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "geliver_sender_mahalle" text;
