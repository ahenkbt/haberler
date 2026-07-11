/** API `panel-permissions.ts` ile aynı anahtarlar (ön yüz yetki etiketleri). */
export const PANEL_PERMISSION_CATALOG = [
  { id: "dashboard", label: "Kontrol paneli özeti" },
  { id: "haberler", label: "Haber, kategori, yazar, RSS, medya, video TV, AI, ansiklopedi" },
  { id: "hm_sites", label: "Haber merkezi (HM) + içerik havuzu" },
  { id: "servis_saglayicilar", label: "Servis sağlayıcı başvuruları" },
  { id: "haritalar", label: "Harita & işletme / seri ilan (admin)" },
  { id: "teslimat", label: "Dükkan, teslimat, sipariş, kupon, alışveriş admin" },
  { id: "site_ayarlari", label: "Genel ayarlar, tema, modül, reklam, lisans" },
  { id: "destek", label: "Destek talepleri" },
  { id: "comms", label: "Posta & iletişim merkezi (comms)" },
  { id: "duyurular", label: "Platform duyuruları" },
  { id: "iletisim", label: "İletişim mesajları (site)" },
  { id: "ulasim", label: "Ulaşım yönetimi" },
  { id: "premium", label: "Premium / ücretlendirme" },
  { id: "is_ortaklari", label: "İş ortağı başvuruları" },
  { id: "kariyer", label: "Kariyer başvuruları" },
  { id: "turizm", label: "Turizm & rezervasyon" },
  { id: "otomotiv", label: "Otomotiv ekosistemi" },
] as const;

export type PanelPermissionId = (typeof PANEL_PERMISSION_CATALOG)[number]["id"];
