/**
 * Yekpare Servisler tanıtım merkezi — modül içerikleri ve rotalar.
 * Canonical: /servisler + /servisler/:slug
 */

export type ServiceMarketingSlug =
  | "siparis"
  | "alisveris"
  | "ulasim"
  | "turizm"
  | "haber-merkezi"
  | "ai-cagri-merkezi";

export type ServiceFeatureBlock = {
  title: string;
  desc: string;
};

export type ServicePanelBlock = {
  title: string;
  subtitle: string;
  items: string[];
};

export type ServiceCtaLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type ServiceMarketingModule = {
  slug: ServiceMarketingSlug;
  title: string;
  navLabel: string;
  tagline: string;
  description: string;
  heroCta: ServiceCtaLink;
  secondaryCta?: ServiceCtaLink;
  extraCtas?: ServiceCtaLink[];
  highlights: string[];
  customerFeatures: ServiceFeatureBlock[];
  providerPanel: ServicePanelBlock;
  editorPanel?: ServicePanelBlock;
  operations: ServicePanelBlock;
  opportunities: ServiceFeatureBlock[];
  platformExtras: string[];
  /** Kullanıcıya yönelik ek açıklama paragrafları */
  audienceNotes?: string[];
  /** Tipik kullanım senaryoları */
  useCases?: ServiceFeatureBlock[];
};

export const SERVICES_MARKETING_BASE = "/servisler";

export const SERVICES_MARKETING_ORDER: ServiceMarketingSlug[] = [
  "siparis",
  "alisveris",
  "ulasim",
  "turizm",
  "haber-merkezi",
  "ai-cagri-merkezi",
];

/** Kısa / eski URL takma adları → kanonik slug */
export const SERVICES_MARKETING_SLUG_ALIASES: Record<string, ServiceMarketingSlug> = {
  haberler: "haber-merkezi",
  ai: "ai-cagri-merkezi",
};

export const SERVICES_MARKETING_MODULES: Record<ServiceMarketingSlug, ServiceMarketingModule> = {
  siparis: {
    slug: "siparis",
    title: "Sipariş",
    navLabel: "Sipariş",
    tagline: "Restoran, market ve yerel işletmeler için uçtan uca sipariş altyapısı",
    description:
      "Menüden teslimata kadar tüm akışı tek panelden yönetin. Kurye, servis personeli ve mutfak ekibi atamaları; POS, stok, kasa ve personel maaş takibi ile operasyonu ölçeklendirin.",
    heroCta: { label: "Sipariş vitrinine git", href: "/siparis" },
    secondaryCta: { label: "İşletme paneli", href: "/servis-saglayici-giris" },
    highlights: [
      "Çoklu şube ve servis alanı",
      "Kurye & mutfak ekip yönetimi",
      "POS, kasa ve stok entegrasyonu",
      "Kampanya, kupon ve CRM",
    ],
    customerFeatures: [
      { title: "Menü ve seçenekler", desc: "Varyant, ekstra, porsiyon ve alerjen bilgisiyle zengin menü deneyimi." },
      { title: "Sepet ve ödeme", desc: "Online ödeme, kapıda ödeme ve POS ile uyumlu kasa akışı." },
      { title: "Sipariş takibi", desc: "Hazırlanıyor, yolda ve teslim edildi durumları; canlı bildirimler." },
      { title: "Konum ve teslimat", desc: "Servis alanı, minimum sepet ve bölgesel teslimat kuralları." },
      { title: "QR menü", desc: "Masada QR ile menü ve hızlı sipariş; şube bazlı özelleştirme." },
      { title: "Kampanyalar", desc: "İndirim, kupon ve sadakat programlarıyla tekrar siparişi artırın." },
    ],
    providerPanel: {
      title: "Servis sağlayıcı paneli",
      subtitle: "Restoran, kafe ve market işletmeleri için operasyon merkezi",
      items: [
        "Şube, servis alanı ve çalışma saatleri yönetimi",
        "Menü, kategori, fiyat ve stok senkronizasyonu",
        "Sipariş kuyruğu, mutfak ekranı ve hazırlık süreleri",
        "Kurye, servis personeli ve vardiya atamaları",
        "POS / kasa, gün sonu ve ödeme yöntemleri",
        "Personel maaş takibi, prim ve vardiya raporları",
        "Müşteri CRM, notlar ve sipariş geçmişi",
        "Kampanya, kupon ve promosyon yönetimi",
        "Özel domain ve kurumsal e-posta bağlama",
      ],
    },
    operations: {
      title: "Operasyonel imkanlar",
      subtitle: "Sahada ve kasada ihtiyaç duyduğunuz her araç",
      items: [
        "Stok takibi ve kritik seviye uyarıları",
        "Kasiyer / kasa modu ve fiş yazdırma",
        "Çoklu ödeme kanalı (nakit, kart, online)",
        "Şube performans ve satış raporları",
        "Teslimat rotası ve kurye konum takibi",
        "WhatsApp ve telefon entegrasyonu",
      ],
    },
    opportunities: [
      { title: "Yerel görünürlük", desc: "Keşfet ve haritalar üzerinden yakındaki müşterilere ulaşın." },
      { title: "Çoklu kanal", desc: "Web, mobil PWA ve QR menü ile aynı menüyü her yerde sunun." },
      { title: "Ölçeklenebilir ekip", desc: "Mutfak, servis ve kurye ekiplerini panelden büyütün." },
    ],
    platformExtras: ["Özel e-posta adresi", "Domain ekleme", "Şube yönetimi", "Sipariş API"],
    audienceNotes: [
      "Restoran ve market işletmeleri menü, stok ve teslimat operasyonunu tek panelden yönetir; müşteriler web ve mobil PWA üzerinden sipariş verir.",
      "Çoklu şube yapısında her lokasyon için ayrı menü, servis alanı ve kurye ataması tanımlanabilir.",
    ],
    useCases: [
      { title: "Restoran zinciri", desc: "Şubeler, mutfak ekranı ve kurye filosu tek merkezden izlenir." },
      { title: "Mahalle marketi", desc: "Stok, kasa ve kapıda teslimat aynı gün operasyona alınır." },
      { title: "Kafe & pastane", desc: "QR menü ve masa siparişi ile fiziksel ve dijital kanallar birleşir." },
    ],
  },
  alisveris: {
    slug: "alisveris",
    title: "Alışveriş",
    navLabel: "Alışveriş",
    tagline: "Pazaryeri ve mağaza vitrini — çoklu kargo, stok ve satıcı paneli",
    description:
      "Ürün kataloğundan ödemeye, çoklu kargo gönderiminden iade süreçlerine kadar e-ticaret altyapısı. Satıcı paneli, domain ve kurumsal e-posta ile markanızı büyütün.",
    heroCta: { label: "Mağazaya git", href: "/magaza" },
    secondaryCta: { label: "Satıcı olun", href: "/magaza/satici-ol" },
    highlights: [
      "Pazaryeri ve tek mağaza",
      "Çoklu kargo / gönderi",
      "Stok ve varyant yönetimi",
      "Satıcı ve admin paneli",
    ],
    customerFeatures: [
      { title: "Ürün vitrini", desc: "Kategori, marka, filtre ve arama ile zengin katalog deneyimi." },
      { title: "Sepet ve ödeme", desc: "Güvenli ödeme, taksit ve kapıda ödeme seçenekleri." },
      { title: "Çoklu kargo", desc: "Farklı kargo firmalarıyla gönderi; takip numarası ve durum bildirimi." },
      { title: "İade ve değişim", desc: "İade talebi, onay akışı ve müşteri bildirimleri." },
      { title: "Kampanyalar", desc: "İndirim, kupon, flash satış ve sepette indirim kuralları." },
      { title: "Mağaza sayfaları", desc: "Satıcı vitrini, hakkımızda, blog ve iletişim sayfaları." },
    ],
    providerPanel: {
      title: "Satıcı / servis sağlayıcı paneli",
      subtitle: "Mağaza sahipleri ve pazaryeri satıcıları için",
      items: [
        "Ürün, kategori, marka ve varyant yönetimi",
        "Stok, depo ve kritik seviye takibi",
        "Sipariş, kargo etiketi ve çoklu gönderi planlama",
        "İade, değişim ve müşteri mesajları",
        "POS entegrasyonu ve kasa raporları",
        "Kampanya, kupon ve fiyat listesi",
        "Müşteri CRM ve sipariş geçmişi",
        "Özel domain ve kurumsal e-posta",
        "Mağaza teması ve vitrin düzeni",
      ],
    },
    operations: {
      title: "Operasyonel imkanlar",
      subtitle: "Satıştan teslimata uçtan uca kontrol",
      items: [
        "Çoklu kargo firması ve gönderi şablonları",
        "Toplu ürün içe/dışa aktarma",
        "Kasiyer modu ve mağaza içi satış",
        "Komisyon ve satıcı ödeme raporları",
        "Envanter sayımı ve stok hareketleri",
        "Ödeme geçidi ve POS uyumluluğu",
      ],
    },
    opportunities: [
      { title: "Pazaryeri büyümesi", desc: "Çoklu satıcı modeliyle katalog genişletin." },
      { title: "Marka bağımsızlığı", desc: "Kendi domain ve e-postanızla profesyonel vitrin." },
      { title: "Lojistik esnekliği", desc: "Sipariş başına farklı kargo seçenekleri sunun." },
    ],
    platformExtras: ["Özel domain", "Kurumsal e-posta", "Çoklu kargo", "Satıcı API"],
    audienceNotes: [
      "Tek mağaza veya çok satıcılı pazaryeri modelinde ürün kataloğu, ödeme ve kargo süreçleri uçtan uca yönetilir.",
      "Satıcılar kendi vitrinlerini özelleştirir; yönetici paneli komisyon ve performans raporlarını sunar.",
    ],
    useCases: [
      { title: "Yerel üretici pazarı", desc: "Çoklu satıcı, tek sepet ve birleşik ödeme deneyimi." },
      { title: "Marka mağazası", desc: "Özel domain ile kurumsal e-ticaret vitrini." },
      { title: "Hibrit perakende", desc: "Mağaza içi kasa ve online sipariş aynı stoktan düşer." },
    ],
  },
  ulasim: {
    slug: "ulasim",
    title: "Ulaşım",
    navLabel: "Ulaşım",
    tagline: "Çekici, taksi, kurye, kargo ve nakliyat — talep, teklif ve filo yönetimi",
    description:
      "Müşteri taleplerini anında karşılayın; sürücü ve filo paneliyle iş atama, rota takibi ve teklif akışını tek yerden yönetin.",
    heroCta: { label: "Ulaşım sayfası", href: "/ulasim" },
    secondaryCta: { label: "Sağlayıcı paneli", href: "/ulasim-saglayici-giris" },
    highlights: [
      "Çekici, taksi, kurye, kargo",
      "Sürücü ve filo paneli",
      "Teklif ve iş takibi",
      "Anlık bildirimler",
    ],
    customerFeatures: [
      { title: "Hizmet seçimi", desc: "Çekici, taksi, kurye, kargo ve nakliyat için ayrı akışlar." },
      { title: "Konum ve rota", desc: "Alış ve varış noktası; harita üzerinde görselleştirme." },
      { title: "Teklif alma", desc: "Anlık fiyat tahmini ve sağlayıcı teklifleri." },
      { title: "Talep takibi", desc: "Atanan sürücü, tahmini varış ve durum güncellemeleri." },
      { title: "Bildirimler", desc: "SMS ve uygulama içi durum bildirimleri." },
      { title: "Çoklu araç tipi", desc: "Paket boyutu, araç sınıfı ve özel ihtiyaç seçenekleri." },
    ],
    providerPanel: {
      title: "Ulaşım sağlayıcı paneli",
      subtitle: "Filo, sürücü ve lojistik işletmeleri için",
      items: [
        "Sürücü ve araç kayıt yönetimi",
        "İş kuyruğu ve otomatik atama kuralları",
        "Teklif verme ve fiyatlandırma şablonları",
        "Canlı konum ve rota takibi",
        "Günlük / haftalık iş ve gelir raporları",
        "Müşteri CRM ve tekrarlayan talepler",
        "Bildirim ve mesaj şablonları",
        "Çoklu hizmet tipi (çekici, taksi, kurye…)",
      ],
    },
    operations: {
      title: "Operasyonel imkanlar",
      subtitle: "Saha operasyonunu dijitalleştirin",
      items: [
        "Filo ve araç bakım takibi",
        "Vardiya ve sürücü performansı",
        "Komisyon ve ödeme mutabakatı",
        "Acil talep önceliklendirme",
        "Entegre harita ve navigasyon",
        "API ile üçüncü parti entegrasyon",
      ],
    },
    opportunities: [
      { title: "Hızlı teklif", desc: "Müşteriye saniyeler içinde fiyat ve süre sunun." },
      { title: "Filo ölçekleme", desc: "Yeni sürücü ve araçları panelden ekleyin." },
      { title: "Çoklu hizmet", desc: "Tek işletmede çekici, kurye ve nakliyatı birleştirin." },
    ],
    platformExtras: ["Sürücü uygulaması", "Canlı takip", "Teklif API", "Bildirim merkezi"],
    audienceNotes: [
      "Müşteriler çekici, taksi, kurye veya nakliyat talebini konum seçerek oluşturur; sağlayıcılar teklif ve atama yapar.",
      "Filo işletmeleri sürücü, araç ve iş kuyruğunu gerçek zamanlı takip eder.",
    ],
    useCases: [
      { title: "Çekici operatörü", desc: "Acil talepler önceliklendirilir, sürücü konumu canlı izlenir." },
      { title: "Kurye ağı", desc: "Paket boyutu ve rota bazlı fiyatlandırma şablonları." },
      { title: "Nakliyat firması", desc: "Teklif, sözleşme ve teslimat durumu tek panelde." },
    ],
  },
  turizm: {
    slug: "turizm",
    title: "Turizm",
    navLabel: "Turizm",
    tagline: "Otel, tur, villa, yat ve araç kiralama — rezervasyon ve paket yönetimi",
    description:
      "Konaklama ve deneyim işletmeleri için rezervasyon, oda/paket fiyatlandırması, müsaitlik takvimi ve müşteri CRM — hepsi turizm sağlayıcı panelinde.",
    heroCta: { label: "Turizm vitrini", href: "/turizm" },
    secondaryCta: { label: "Sağlayıcı paneli", href: "/turizm-saglayici-giris" },
    highlights: [
      "Otel, villa, tur, yat",
      "Rezervasyon ve müsaitlik",
      "Paket ve oda fiyatları",
      "Müşteri CRM",
    ],
    customerFeatures: [
      { title: "Konaklama vitrini", desc: "Otel, villa ve apart seçenekleri; fotoğraf galerisi ve özellikler." },
      { title: "Tur ve deneyim", desc: "Günlük turlar, aktiviteler ve özel paketler." },
      { title: "Araç ve yat kiralama", desc: "Tarih, süre ve kapasiteye göre rezervasyon." },
      { title: "Müsaitlik takvimi", desc: "Gerçek zamanlı doluluk ve fiyat güncellemesi." },
      { title: "Rezervasyon talebi", desc: "Online talep, onay ve ödeme adımları." },
      { title: "Kampanyalar", desc: "Sezon indirimi, erken rezervasyon ve kupon kodları." },
    ],
    providerPanel: {
      title: "Turizm sağlayıcı paneli",
      subtitle: "Otel, tur operatörü ve kiralama işletmeleri için",
      items: [
        "Oda, paket ve tur tanımları",
        "Müsaitlik ve fiyat takvimi",
        "Rezervasyon onay ve iptal akışı",
        "Müşteri CRM ve iletişim geçmişi",
        "Kampanya ve kupon yönetimi",
        "Çoklu dil ve para birimi desteği",
        "Özel domain ve kurumsal e-posta",
        "Galeri ve içerik düzenleme",
      ],
    },
    operations: {
      title: "Operasyonel imkanlar",
      subtitle: "Rezervasyondan check-out'a kadar",
      items: [
        "Doluluk ve gelir raporları",
        "Ek hizmet ve upsell tanımları",
        "Ön ödeme ve kapora yönetimi",
        "Personel ve resepsiyon notları",
        "Entegre harita ve konum",
        "Sezon bazlı fiyat kuralları",
      ],
    },
    opportunities: [
      { title: "Dijital vitrin", desc: "Kendi domaininizle profesyonel turizm sitesi." },
      { title: "Paket satışı", desc: "Konaklama + tur + transfer paketleri oluşturun." },
      { title: "Müşteri sadakati", desc: "CRM ile tekrar rezervasyonu artırın." },
    ],
    platformExtras: ["Özel domain", "Rezervasyon API", "Çoklu para birimi", "Galeri yönetimi"],
    audienceNotes: [
      "Otel, tur operatörü ve kiralama işletmeleri müsaitlik takvimi ve fiyat kurallarını panelden günceller.",
      "Ziyaretçiler vitrin üzerinden rezervasyon talebi oluşturur; onay ve ödeme akışı işletmeye özel yapılandırılır.",
    ],
    useCases: [
      { title: "Butik otel", desc: "Oda tipleri, sezon fiyatları ve galeri tek vitrinde." },
      { title: "Tur operatörü", desc: "Günlük turlar, kontenjan ve ön ödeme kuralları." },
      { title: "Araç kiralama", desc: "Tarih aralığı, depozito ve teslim noktası yönetimi." },
    ],
  },
  "haber-merkezi": {
    slug: "haber-merkezi",
    title: "Haber Merkezi",
    navLabel: "Haber Merkezi",
    tagline: "Editör paneli, çoklu site senkronu ve SEO uyumlu haber yayını",
    description:
      "Ajans ve kurumsal yayınlar için haber sitesi altyapısı. Yazarlar, kategoriler, RSS/manuel haber akışı, özel domain ve kurumsal e-posta ile editoryal gücünüzü ölçeklendirin.",
    heroCta: { label: "Haber Merkezi'ni aç", href: "/habermerkezi" },
    secondaryCta: { label: "Editör girişi", href: "/editor/giris" },
    extraCtas: [
      { label: "Haberler vitrini", href: "/haberler" },
      { label: "Sitene ekle", href: "/sitene-ekle" },
    ],
    highlights: [
      "Editör paneli",
      "Çoklu site senkronu",
      "Yazar ve kategori yönetimi",
      "Domain ve SEO",
    ],
    customerFeatures: [
      { title: "Haber vitrini", desc: "Manşet, kategori bölümleri ve son dakika bandı." },
      { title: "Yazar sayfaları", desc: "Köşe yazarları ve makale arşivi." },
      { title: "Kategori yapısı", desc: "Gündem, ekonomi, spor ve özel kategoriler." },
      { title: "Arama ve SEO", desc: "Yapılandırılmış veri ve arama motoru uyumu." },
      { title: "RSS ve embed", desc: "Dış kaynaklardan haber ve sitene ekle widget'ı." },
      { title: "Mobil uyum", desc: "Responsive tasarım ve hızlı sayfa yükleme." },
    ],
    providerPanel: {
      title: "Yayın / işletme paneli",
      subtitle: "Medya kuruluşları ve kurumsal iletişim ekipleri için",
      items: [
        "Site oluşturma ve şablon seçimi",
        "Özel domain bağlama",
        "Kurumsal e-posta adresi",
        "Reklam ve sponsor alanları",
        "Abonelik ve bülten entegrasyonu",
        "Analitik ve okunma raporları",
      ],
    },
    editorPanel: {
      title: "Editör paneli",
      subtitle: "İçerik üretimi ve yayın akışı",
      items: [
        "Makale ve haber editörü (zengin metin)",
        "Çoklu site haber senkronizasyonu",
        "Yazar, editör ve yetki yönetimi",
        "RSS kaynağı ve manuel haber girişi",
        "Kategori, etiket ve manşet atama",
        "Görsel kütüphane ve medya yönetimi",
        "Taslak, zamanlama ve yayın onayı",
        "SEO başlık, özet ve Open Graph",
      ],
    },
    operations: {
      title: "Editoryal imkanlar",
      subtitle: "Yayın kalitesi ve operasyonel verimlilik",
      items: [
        "Son dakika ve ticker bandı",
        "Köşe yazarları vitrini",
        "Kültürel ve özel gün modülleri",
        "Çoklu dil içerik desteği",
        "Otomatik haber havuzu (AI destekli)",
        "Sitene ekle / embed widget",
      ],
    },
    opportunities: [
      { title: "Anında yayın", desc: "Sunucu kurulumu olmadan haber siteniz canlıda." },
      { title: "Çoklu marka", desc: "Birden fazla haber sitesini tek panelden yönetin." },
      { title: "AI destekli içerik", desc: "Haber havuzu ve özet üretimi ile hız kazanın." },
    ],
    platformExtras: ["Özel domain", "Kurumsal e-posta", "RSS entegrasyonu", "SEO araçları"],
    audienceNotes: [
      "Yayıncılar ve kurumsal iletişim ekipleri haber sitesini dakikalar içinde yayına alır; editörler zengin metin editörü ile içerik üretir.",
      "Çoklu site senkronu ile aynı haber birden fazla marka sitesinde tutarlı biçimde yayınlanabilir.",
    ],
    useCases: [
      { title: "Yerel haber portalı", desc: "Manşet, kategori ve köşe yazarları vitrini." },
      { title: "Kurumsal bülten", desc: "RSS, embed widget ve SEO uyumlu yayın." },
      { title: "Ajans ağı", desc: "Çoklu site ve yazar yetki yönetimi tek panelde." },
    ],
  },
  "ai-cagri-merkezi": {
    slug: "ai-cagri-merkezi",
    title: "AI Çağrı Merkezi",
    navLabel: "AI Çağrı Merkezi",
    tagline: "Yekpare AI asistan — web, sipariş, alışveriş ve turizm desteği",
    description:
      "Yapay zekâ destekli sesli ve yazılı asistan; müşteri rehberliği, sipariş desteği, lead yakalama ve insan operatöre yönlendirme. CRM bağlamı ve bilgi tabanı ile 7/24 hizmet.",
    heroCta: { label: "Tanıtım sayfası", href: "/ai-cagri-merkezi" },
    secondaryCta: { label: "Canlı platform", href: "https://call.yekpare.net/", external: true },
    extraCtas: [
      { label: "Yekpare AI sohbet", href: "/destek" },
      { label: "Başvuru formu", href: "/ai-cagri-merkezi#basvuru" },
    ],
    highlights: [
      "Sesli ve yazılı AI",
      "Sipariş & alışveriş desteği",
      "CRM ve lead yakalama",
      "İnsan operatöre aktarım",
    ],
    customerFeatures: [
      { title: "Web sitesi rehberliği", desc: "Ziyaretçilere hizmet ve sayfa yönlendirmesi." },
      { title: "Sipariş desteği", desc: "Menü, sepet ve sipariş durumu hakkında yanıt." },
      { title: "Alışveriş asistanı", desc: "Ürün arama, stok ve kargo bilgisi." },
      { title: "Turizm danışmanlığı", desc: "Rezervasyon ve müsaitlik sorularına yanıt." },
      { title: "SSS ve bilgi tabanı", desc: "Dokümanlardan öğrenen RAG tabanlı yanıtlar." },
      { title: "Çok kanallı erişim", desc: "Web sohbet, sesli arama ve mesajlaşma." },
    ],
    providerPanel: {
      title: "Yönetim paneli",
      subtitle: "Çağrı merkezi ve AI operasyonları için",
      items: [
        "Asistan ve ses profili yapılandırması",
        "Bilgi tabanı ve doküman yükleme",
        "Kampanya ve toplu arama akışları",
        "CRM entegrasyonu ve müşteri kartları",
        "Çağrı transkripti ve kayıt arşivi",
        "Performans ve dönüşüm analitiği",
        "Webhook ve otomasyon kuralları",
        "İnsan operatöre eskalasyon kuralları",
      ],
    },
    operations: {
      title: "Operasyonel imkanlar",
      subtitle: "Otomasyon ve ölçeklenebilir destek",
      items: [
        "7/24 otomatik yanıt",
        "Lead formu ve randevu planlama",
        "Sipariş / rezervasyon özet aktarımı",
        "Duygu analizi ve kalite skoru",
        "Çoklu dil görüşme desteği",
        "API ile üçüncü parti CRM",
      ],
    },
    opportunities: [
      { title: "Maliyet optimizasyonu", desc: "Tekrarlayan soruları AI ile otomatikleştirin." },
      { title: "Dönüşüm artışı", desc: "Anlık rehberlikle sepet ve rezervasyon tamamlama." },
      { title: "Ölçülebilir kalite", desc: "Transkript ve analitik ile sürekli iyileştirme." },
    ],
    platformExtras: ["Sesli AI", "Bilgi tabanı RAG", "CRM bağlamı", "Eskalasyon kuralları"],
    audienceNotes: [
      "İşletmeler yapay zekâ destekli sesli ve yazılı asistanla müşteri taleplerini 7/24 karşılar; tekrarlayan sorular otomatik yanıtlanır.",
      "Canlı çağrı merkezi platformu call.yekpare.net üzerinden kampanya, hat yönetimi ve transkript arşivine erişim sağlar.",
    ],
    useCases: [
      { title: "Restoran sipariş hattı", desc: "Menü ve sipariş durumu sorularına anlık yanıt." },
      { title: "E-ticaret destek", desc: "Ürün, stok ve kargo bilgisi otomatik aktarımı." },
      { title: "Turizm danışma", desc: "Rezervasyon ve müsaitlik sorgularında lead yakalama." },
    ],
  },
};

export function resolveServiceMarketingSlug(slug: string): ServiceMarketingSlug | null {
  const normalized = slug.trim().toLowerCase();
  if (normalized in SERVICES_MARKETING_MODULES) {
    return normalized as ServiceMarketingSlug;
  }
  const alias = SERVICES_MARKETING_SLUG_ALIASES[normalized];
  return alias ?? null;
}

export function getServiceMarketingModule(slug: string): ServiceMarketingModule | null {
  const resolved = resolveServiceMarketingSlug(slug);
  if (!resolved) return null;
  return SERVICES_MARKETING_MODULES[resolved];
}

export function isServicesMarketingPath(path: string): boolean {
  const p = path.split("?")[0] ?? "";
  return p === SERVICES_MARKETING_BASE || p.startsWith(`${SERVICES_MARKETING_BASE}/`);
}

export const SERVICES_PLATFORM_BENEFITS = [
  {
    title: "Tek platform, çoklu hizmet",
    desc: "Sipariş, alışveriş, ulaşım, turizm, haber ve AI desteği tek Yekpare hesabında.",
  },
  {
    title: "Özel domain ve e-posta",
    desc: "Markanıza özel web adresi ve kurumsal e-posta kutusu bağlayın.",
  },
  {
    title: "Servis sağlayıcı panelleri",
    desc: "Her modül için özelleştirilmiş yönetim paneli ve raporlama.",
  },
  {
    title: "CRM ve müşteri takibi",
    desc: "Sipariş geçmişi, notlar ve sadakat programları tek yerde.",
  },
  {
    title: "POS ve kasa entegrasyonu",
    desc: "Fiziksel ve online satışları aynı stok ve kasa akışında birleştirin.",
  },
  {
    title: "Personel ve maaş takibi",
    desc: "Vardiya, prim ve bordro raporları operasyon panelinde.",
  },
] as const;
