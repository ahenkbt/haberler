/** Ahenk Bilgi Teknolojileri ajans vitrini — arşiv içeriği + admin override. */

export type AhenkAgencyOffice = {
  id: string;
  country: string;
  flag: string;
  address: string;
};

export type AhenkAgencySlide = {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
};

export type AhenkAgencyService = {
  slug: string;
  title: string;
  excerpt: string;
  icon: string;
  bodyHtml: string;
  aliases?: string[];
};

export type AhenkAgencySite = {
  version: 1;
  brandName: string;
  tagline: string;
  phone: string;
  phoneTel: string;
  email: string;
  hoursWeekday: string;
  hoursSunday: string;
  aboutTitle: string;
  aboutHtml: string;
  ctaTitle: string;
  ctaText: string;
  offices: AhenkAgencyOffice[];
  slides: AhenkAgencySlide[];
  services: AhenkAgencyService[];
};

function str(v: unknown, fallback: string): string {
  return typeof v === "string" && v.trim() ? v : fallback;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

export function defaultAhenkAgencySite(): AhenkAgencySite {
  return {
    version: 1,
    brandName: "Ahenk Bilgi Teknolojileri",
    tagline: "Teknoloji, operasyon ve kurumsal hizmetlerde deneyimli çözüm ortağı.",
    phone: "0541 313 62 45",
    phoneTel: "+905413136245",
    email: "ahenkbilgiteknoloji@gmail.com",
    hoursWeekday: "Pazartesi - Cumartesi 09:00 - 18:00",
    hoursSunday: "Pazar: Kapalı",
    aboutTitle: "Küresel Markalarla Çalışıyoruz",
    aboutHtml: `<p>Ahenk Bilgi Teknolojileri olarak Getir Yemek, Getir Çarşı, Migros Yemek ve Yemeksepeti gibi start up firmalarına verdiğimiz hizmetlerle tecrübe sahibiyiz. Teknolojik girişim şirketlerinin ihtiyaç duydukları tüm bilgi ve birikime sahibiz; birçok alanda hizmet sağlıyoruz.</p>
<p>Hedefimiz; yenilikçi uygulamalarıyla ülkemizin kamu kurumları ve özel sektör kuruluşlarına bilgi teknolojileri alanında en üst seviyede hizmet verebilmektir. Teknolojik girişim tekliflerine açığız.</p>
<p>Profesyonel ekiplerimiz işyeri üyelik, çağrı merkezi, ajans, insan kaynakları, e-ticaret destek ve kurumsal organizasyon süreçlerini tek çatı altında yönetir.</p>`,
    ctaTitle: "Kurumsal Organizasyon",
    ctaText:
      "Projelerimiz hakkında daha detaylı bilgi sahibi olmanız adına, sizi ofisimizde misafir etmekten mutluluk duyarız.",
    offices: [
      {
        id: "tr",
        country: "Türkiye",
        flag: "🇹🇷",
        address: "Meşrutiyet Mah. Karanfik Sokak 4/91 Çankaya - Ankara",
      },
      {
        id: "ge",
        country: "Gürcistan",
        flag: "🇬🇪",
        address: "Kutaisi St. No:11 Batum / Gürcistan",
      },
      {
        id: "uk",
        country: "İngiltere",
        flag: "🇬🇧",
        address: "71-75 Shelton Street, Covent Garden, London, United Kingdom, WC2H 9JQ",
      },
      {
        id: "us",
        country: "ABD",
        flag: "🇺🇸",
        address: "1621 CENTRAL AVE CHEYENNE, WY 82001",
      },
      {
        id: "az",
        country: "Azerbaycan",
        flag: "🇦🇿",
        address: "Caferov Qardaşları Küçesi No: 20/1 Bakü",
      },
    ],
    slides: [
      {
        id: "odeme",
        title: "Ödeme Kuruluşları İşyeri Üyelik Hizmetleri",
        subtitle:
          "Profesyonel ekiplerimiz, işyerlerinin platformunuza hızlı ve sorunsuz bir şekilde kaydını gerçekleştirir.",
        ctaLabel: "Hizmetleri İncele",
        ctaHref: "/hizmetler",
      },
      {
        id: "startup",
        title: "Start Up Tecrübesi",
        subtitle:
          "Getir Yemek, Getir Çarşı, Migros Yemek ve Yemeksepeti gibi girişimlere verdiğimiz hizmetlerle yanınızdayız. Teknolojik girişim tekliflerine açığız.",
        ctaLabel: "Hakkımızda",
        ctaHref: "/hakkimizda",
      },
      {
        id: "ik",
        title: "İnsan Kaynakları",
        subtitle:
          "Belirli süreli / süresiz personel hizmeti. Organizasyonel esneklik ile firmanıza benzersiz hareket kabiliyeti kazandırırız.",
        ctaLabel: "İK Hizmetleri",
        ctaHref: "/hizmet/insan-kaynaklari-hizmetleri",
      },
      {
        id: "kralpos",
        title: "KRAL POS — Pratik Otomatik Sistem",
        subtitle:
          "Restoran otomasyon sistemi KRAL POS ile restoranlarınızı ve siparişlerinizi tek program üzerinden yönetin.",
        ctaLabel: "İletişime Geçin",
        ctaHref: "/iletisim",
      },
      {
        id: "kuresel",
        title: "Küresel Markalarla Çalışıyoruz",
        subtitle:
          "Teknolojik girişim şirketlerinin ihtiyaç duydukları tüm bilgi ve birikime sahibiz. Birçok alanda hizmet sağlıyoruz.",
        ctaLabel: "Hizmetlerimiz",
        ctaHref: "/hizmetler",
      },
    ],
    services: [
      {
        slug: "musteri-hizmetleri",
        title: "Müşteri Hizmetleri",
        excerpt:
          "Kurumsal ve bireysel müşteri hizmetleri, şikayet/talep yönetimi ve 7/24 çağrı merkezi çözümleri.",
        icon: "headphones",
        bodyHtml: `<h2>Müşteri Hizmetleri</h2>
<p>Nihai müşterilerinizin memnuniyetini artırmak amacıyla şikayet, talep, öneri ve teşekkürlerinin telefon, e-posta, web ve benzeri kanallar aracılığı ile karşılanması ve yönetilmesidir.</p>
<h3>Kurumsal Müşteri Hizmetleri Çözümleri</h3>
<ul>
<li>Çağrı merkezi hizmetleri ve sipariş alma</li>
<li>Şikayet, talep ve öneri yönetimi</li>
<li>Üyelik ve sadakat programı operasyonu</li>
</ul>
<h3>Bireysel Müşteri Hizmetleri Çözümleri</h3>
<p>Profesyonel sekreterya ve asistanlık hizmeti sunuyoruz. Talebinize göre özelleştirilmiş, ekonomik ve işlevsel seçeneklerle işinize özel santal ve sabit hat kurgulanabilir.</p>
<h3>Genel Çağrı Merkezi Hizmetleri</h3>
<p>Müşterilerinize, konusunda uzman müşteri hizmet yetkililerimiz ile 7 gün 24 saat talep ve önerilerini karşılıyor; şikayet yönetimi, sipariş yönetimi, üyelik yönetimi ve sadakat programı gibi hizmetler sunuyoruz.</p>
<h3>Müşteri Elde Tutma, Kalite ve Backoffice</h3>
<p>Web sayfası, sosyal medya veya telefon ile iletilen tüm öneri, şikayet ve teşekkür kayıtlarını değerlendirir, cevaplarız. Kayıtları düzenli olarak ilgili birimlerle paylaşır, kalite yönetim sistemini destekleriz. Satış ve pazarlama, tahsilat, lokasyon kiralama, sosyal medya takibi ve raporlama bu kapsamda yer alır.</p>`,
      },
      {
        slug: "urun-fotograf-cekimi",
        title: "Ürün Fotoğraf Çekimi",
        excerpt:
          "E-ticaret, katalog ve tanıtım için yüksek çözünürlüklü endüstriyel ve ürün fotoğraf çekimi.",
        icon: "camera",
        bodyHtml: `<h2>Ürün Fotoğraf Çekimi</h2>
<p>E-ticaret ile ürün veya hizmetlerinizi doğru anlatmanın yolu profesyonel fotoğraflardır. Endüstriyel fotoğraf çekimi ile üretim yaptığınız ürünleri ve üretim alanlarınızı yüksek çözünürlükte görselleştiriyoruz.</p>
<p>Görsel uzmanlarımız, son teknoloji ekipmanlarla ürünlerinize en doğru açıdan yaklaşarak firmanızın imajını yansıtan çekimler gerçekleştirir. Ürün katalogları, sosyal medya, reklam ve tanıtım çalışmaları için kullanılacak görseller çekim sonrası profesyonel olarak düzenlenir.</p>
<ul>
<li>Ödeme kolaylığı</li>
<li>Kurumsallık ve profesyonellik</li>
<li>Her alanda hizmet yetkinliği</li>
<li>Kreatif grafik ve tasarım ekibi</li>
<li>Alanında uzman fotoğrafçılar</li>
<li>Son teknoloji ekipman</li>
<li>Türkiye’nin her yerinde çekim hizmeti</li>
</ul>
<p>Detaylı bilgi ve fiyat için bizi arayın: <strong>0541 313 62 45</strong></p>`,
      },
      {
        slug: "cagri-merkezi-siparis-sistemi",
        title: "Çağrı Merkezi Sipariş Sistemi",
        excerpt:
          "Sipariş alma, üyelik ve müşteri kayıtlarını tek operasyonel sistemde yönetin.",
        icon: "phone",
        bodyHtml: `<h2>Çağrı Merkezi Sipariş Sistemi</h2>
<p>Restoran, e-ticaret ve hizmet işletmeleri için çağrı merkezi üzerinden sipariş alma altyapısı kuruyoruz. Gelen aramalar, sipariş fişleri, müşteri kayıtları ve raporlama aynı süreçte ilerler.</p>
<p>KRAL POS ve dijital menü çözümlerimizle entegre çalışabilen sipariş sistemi; yoğun saatlerde kaçırılan çağrıları azaltır, operasyonu standartlaştırır ve müşteri memnuniyetini yükseltir.</p>
<ul>
<li>7/24 sipariş alma ve yönlendirme</li>
<li>Müşteri kayıt ve tekrar sipariş</li>
<li>Kampanya ve üyelik yönetimi</li>
<li>Raporlama ve kalite dinleme</li>
</ul>`,
      },
      {
        slug: "e-ticaret-destek-hizmetleri",
        title: "E-Ticaret Destek Hizmetleri",
        excerpt:
          "Personel tedariki, kurye çözümleri ve e-ticaret operasyon desteği.",
        icon: "cart",
        bodyHtml: `<h2>E-Ticaret Destek Hizmetleri</h2>
<p>Dönemsel veya sürekli personel temin tedarik hizmetlerimiz ile işe alım ve yerleştirme hizmetleri sunuyoruz. Mükemmel adayın ihtiyaç duyduğunuz becerilerden daha fazlasına sahip olması gerektiğini biliyoruz; inisiyatif, güvenilirlik ve ekip uyumu başarının önemli göstergeleridir.</p>
<h3>Kurye Servisi (Paket Teslimatları)</h3>
<p>Teslimat hizmetlerinde sürat, bireyselleştirme ve uzmanlık önemli olduğunda kurye servisi en uygun taşıma modu haline gelir. Kurumsal e-ticaret firmalarına ve e-ticarette ürün satan işletmelere kurye tedarik hizmeti sağlıyoruz.</p>
<h3>E-ticaret depo personel tedarik hizmetleri</h3>
<p>Kara Cuma, Siber Pazartesi veya Noel gibi yoğun dönemlerde paketleme, depo ve teslimat ekiplerine duyulan ihtiyaç artar. Bu dönemlerde deneyimli personel ve kurye desteği sağlarız.</p>
<h3>E-ticaret uzmanlarının işe alınması</h3>
<p>Ahenk Bilgi Teknolojileri olarak başta e-ticaret şirketlerinin kalifiye insana ihtiyaç duydukları alanlarda ve bu ekosistemde yer almak isteyen firmaların internete taşınmasında, pazara açıldıktan sonra da teknoloji odaklı ihtiyaç duyulan birçok alanda uzman çalışanlarımızla hizmet sunuyoruz.</p>`,
      },
      {
        slug: "temizlik-hizmetleri",
        title: "Temizlik Hizmetleri",
        excerpt:
          "Ev, ofis, işyeri ve inşaat sonrası temizlik için aynı gün profesyonel ekip yönlendirmesi.",
        icon: "sparkle",
        bodyHtml: `<h2>Temizlik Hizmetleri</h2>
<p>Yüzlerce profesyonel temizlikçi ağımız ile size yakınız. Yoğunluğa göre aynı gün içerisinde 1–3 saat gibi kısa bir sürede temizlikçi, istemiş olduğunuz adreste hazır bulunarak hizmete başlayabilir.</p>
<p>Kimlik ve adres bilgileri doğrulanmış, ciddi şikayet almamış, gerçek müşteri referanslarına sahip profesyoneller yönlendirilir. Gelişmiş eşleştirme ile ihtiyacınıza uygun temizlikçi bulunur.</p>
<h3>Sıfır Risk Sistemi</h3>
<p>Ödemenizi kart veya havale ile yapabilirsiniz. Temizlik sırasında oluşabilecek herhangi bir durumda ödemeniz aktarılmadan müdahale edilir; hizmet alamamanız durumunda paranız iade edilir. Satın aldığınız süre boyunca sürpriz ek ücret yoktur.</p>
<h3>Temizlik Hizmetlerimiz</h3>
<p>Ev, ofis, işyeri, villa ya da inşaat sonrası temizlik işleriniz için haftanın 7 günü rezervasyon yapılabilir.</p>`,
      },
      {
        slug: "ajans-hizmetleri",
        title: "Ajans Hizmetleri",
        excerpt:
          "Grafik tasarım, web yazılım, SEO, sosyal medya, video ve dijital reklam yönetimi.",
        icon: "pen",
        bodyHtml: `<h2>Ajans Hizmetleri</h2>
<h3>Grafik Tasarım Hizmetleri</h3>
<p>Markanızın basılı ya da dijital mecralarda ihtiyaç duyduğu bütün tasarım işlerini, markanızı en iyi şekilde tanıtacak yenilikçi bir bakış açısıyla oluşturuyoruz. Firmanızın değerlerini yansıtan tasarımlarla markanızı sıfırdan oluşturmanıza ya da var olan markanızı ileriye taşımanıza profesyonel katkı sağlıyoruz.</p>
<h3>Sosyal Medya Yönetimi</h3>
<p>Ekibimiz, firmaların sosyal medya hesaplarının yönetimi konusunda en kaliteli ve yaratıcı hizmeti vermeyi hedefler. Duyurular, kampanyalar, tebrikler veya çekilişler gibi etkinliklerin kurgusu, düzenlenmesi ve yönetimi ile dijital imajınızı güçlendiririz.</p>
<h3>Web Tasarım &amp; Yazılım</h3>
<p>Kurumsal web sitesi, e-ticaret, mobil uygulama, SEO, işletme ve harita kaydı, mobil uyumlu arayüzler geliştiriyoruz. Web sitenizin Google’da üst sıralarda yer alması için site içi SEO, mobil uyumluluk, site haritası, Open Graph ve analitik alanları kurgulanır.</p>
<h3>Video Çekimi</h3>
<p>Reklam filmi, kurgu-montaj, marka ve ürün tanıtım filmi, kurumsal intro üretiyoruz.</p>
<h3>Dijital Reklam Yönetimi</h3>
<p>Google anahtar kelime reklamları, YouTube reklam yönetimi, görüntülü reklamlar, mobil reklam ve e-posta pazarlama süreçlerini planlar, yönetir ve raporlarız.</p>
<p>Web tasarım, hosting, domain ve sunucu seçenekleri için ayrıca görüşebilirsiniz.</p>`,
      },
      {
        slug: "insan-kaynaklari-hizmetleri",
        title: "İnsan Kaynakları Hizmetleri",
        excerpt:
          "Belirli süreli ve süresiz personel tedariki ile organizasyonel esneklik.",
        icon: "users",
        bodyHtml: `<h2>İnsan Kaynakları Hizmetleri</h2>
<p>Belirli süreli / süresiz personel hizmeti sunuyoruz. Süreli ve süresiz eleman hizmetleri ile sağlanan organizasyonel esneklik, firmanıza benzersiz bir hareket kabiliyeti kazandırır.</p>
<p>İşe alım, yerleştirme, dönemsel kampanya ekipleri, çağrı merkezi ve saha personeli tedarikinde deneyimli ekibimizle yanınızdayız. Start-up ve ölçeklenen teknoloji şirketlerinin operasyonel insan kaynağı ihtiyacını hızlı karşılarız.</p>`,
      },
      {
        slug: "dijital-menu-qr-menu",
        title: "Dijital Menü — QR Menü",
        excerpt:
          "Kağıt menü maliyetini kaldırın; QR kod ile temassız, anlık güncellenen dijital menü.",
        icon: "qr",
        aliases: ["dijital-menu-qr-menu"],
        bodyHtml: `<h2>Dijital Menü — QR Menü</h2>
<p>Klasik kâğıt menülerdeki baskı maliyetlerini unutun. İhtiyacınız olduğunda yönetim panelinden birkaç dakikada ürünlerinizi dilediğiniz gibi düzenleyebilirsiniz. Böylece maliyetten ve zamandan tasarruf sağlarsınız.</p>
<p>Müşterileriniz masadaki QR kodu telefonlarına okutarak ürünlerinize erişir ve hiçbir fiziksel temasa gerek kalmadan kolaylıkla siparişlerini verir.</p>
<p>Dijital QR menü, ürünlerinizi düzenli, anlaşılır ve etkileyici şekilde sunmanıza yardımcı olur. Akıllı telefonlara özel tasarımı sayesinde müşterileriniz ürünlerinizi görselleri ve açıklamaları ile inceler; satışlarınız artar.</p>
<p>Menulux Dijital QR Menü uygulaması ile menülerinizi etkileşimli ve görsel bir şekilde sunarak müşterilerinizi mutlu edin. Ürünleri fotoğraflarıyla sosyal ağlarda paylaşarak yeni müşteri kazanabilirsiniz.</p>`,
      },
      {
        slug: "kurumsal-organizasyon",
        title: "Kurumsal Organizasyon",
        excerpt:
          "Şirket etkinlikleri, fuar, festival ve kurumsal davetlerin uçtan uca planlanması.",
        icon: "building",
        bodyHtml: `<h2>Kurumsal Organizasyon</h2>
<p>Ahenk Bilgi Teknolojileri olarak firmaların kurumsal değer ve prensiplerini analiz ederek onların beklentileri doğrultusunda hareket etmekteyiz.</p>
<p>Hayalinizdeki organizasyonun oluşturulma aşamasında size her adımda yardımcı olacak tecrübeli, eğitimli ve yenilikçi bir ekip olarak davet planınızın en başından en sonuna kadar yanınızdayız.</p>
<p>Hizmet verdiğimiz kuruluşların kendi yapıları içinde bir ekipmişiz hissi yaratarak etkinliklerin kusursuz planlanmasını ve başarıyla gerçekleşmesini sağlarız. İş hedeflerinize ulaşmak, personelinizi motive etmek ve iş birliği içinde olduğunuz kurumları ağırlamak için sonuç odaklı etkinlikler düzenleriz.</p>
<p>Şirket organizasyonlarının yanı sıra belediyeler, meslek odaları, dernekler ve vakıflar ile sergi, konser, tiyatro, fuar, yerel ve yöresel festival organizasyonu hizmeti de vermekteyiz. Tüm organizasyonların fotoğraf ve video çekimlerini gerçekleştirmekteyiz.</p>`,
      },
    ],
  };
}

function mergeOffices(raw: unknown, defaults: AhenkAgencyOffice[]): AhenkAgencyOffice[] {
  if (!Array.isArray(raw) || raw.length === 0) return defaults;
  const items = raw
    .filter(isRecord)
    .map((o, i) => ({
      id: str(o.id, `office-${i}`),
      country: str(o.country, ""),
      flag: str(o.flag, "📍"),
      address: str(o.address, ""),
    }))
    .filter((o) => o.country && o.address);
  return items.length ? items : defaults;
}

function mergeSlides(raw: unknown, defaults: AhenkAgencySlide[]): AhenkAgencySlide[] {
  if (!Array.isArray(raw) || raw.length === 0) return defaults;
  const items = raw
    .filter(isRecord)
    .map((s, i) => ({
      id: str(s.id, `slide-${i}`),
      title: str(s.title, ""),
      subtitle: str(s.subtitle, ""),
      ctaLabel: str(s.ctaLabel, "İncele"),
      ctaHref: str(s.ctaHref, "/hizmetler"),
    }))
    .filter((s) => s.title);
  return items.length ? items : defaults;
}

function mergeServices(raw: unknown, defaults: AhenkAgencyService[]): AhenkAgencyService[] {
  if (!Array.isArray(raw) || raw.length === 0) return defaults;
  const items = raw
    .filter(isRecord)
    .map((s) => ({
      slug: str(s.slug, "")
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-+|-+$/g, ""),
      title: str(s.title, ""),
      excerpt: str(s.excerpt, ""),
      icon: str(s.icon, "sparkle"),
      bodyHtml: str(s.bodyHtml, ""),
      aliases: Array.isArray(s.aliases)
        ? s.aliases.map((a) => String(a || "").trim()).filter(Boolean)
        : undefined,
    }))
    .filter((s) => s.slug && s.title);
  return items.length ? items : defaults;
}

export function parseAhenkAgencySiteFromJson(raw: string | null | undefined): AhenkAgencySite {
  const defaults = defaultAhenkAgencySite();
  if (!raw || !String(raw).trim()) return defaults;
  try {
    const data = JSON.parse(String(raw)) as unknown;
    if (!isRecord(data)) return defaults;
    return {
      version: 1,
      brandName: str(data.brandName, defaults.brandName),
      tagline: str(data.tagline, defaults.tagline),
      phone: str(data.phone, defaults.phone),
      phoneTel: str(data.phoneTel, defaults.phoneTel),
      email: str(data.email, defaults.email),
      hoursWeekday: str(data.hoursWeekday, defaults.hoursWeekday),
      hoursSunday: str(data.hoursSunday, defaults.hoursSunday),
      aboutTitle: str(data.aboutTitle, defaults.aboutTitle),
      aboutHtml: str(data.aboutHtml, defaults.aboutHtml),
      ctaTitle: str(data.ctaTitle, defaults.ctaTitle),
      ctaText: str(data.ctaText, defaults.ctaText),
      offices: mergeOffices(data.offices, defaults.offices),
      slides: mergeSlides(data.slides, defaults.slides),
      services: mergeServices(data.services, defaults.services),
    };
  } catch {
    return defaults;
  }
}

export function serializeAhenkAgencySite(site: AhenkAgencySite): string {
  return JSON.stringify({ ...site, version: 1 });
}

export function findAhenkAgencyService(
  site: AhenkAgencySite,
  slug: string,
): AhenkAgencyService | null {
  const key = String(slug || "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
  if (!key) return null;
  return (
    site.services.find((s) => s.slug === key || s.aliases?.includes(key)) ?? null
  );
}

export function ahenkAgencyJsonFromSettings(settings: unknown): string | null {
  const rec = settings as { ahenkAgencyJson?: string | null } | null | undefined;
  const v = rec?.ahenkAgencyJson;
  return typeof v === "string" && v.trim() ? v : null;
}
