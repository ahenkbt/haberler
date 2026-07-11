-- İşletme vitrininde gösterilecek Hakkımızda metni (AI veya manuel)
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS about_html TEXT;

COMMENT ON COLUMN vendors.about_html IS 'Hakkımızda / işletme tanıtım metni (düz metin veya hafif HTML); vitrinde description yerine öncelikli';
