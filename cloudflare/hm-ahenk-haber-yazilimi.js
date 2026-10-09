/**
 * ahenk.net.tr/haber-sitesi-yazilimi — "Haber Sitesi Yazılımı" landing page (hsy-landing 2026-10-09).
 * Server-rendered for every UA (SEO: full HTML, FAQPage + Product/SoftwareApplication + Offer TRY).
 * Features listed here exist in the live network (PHP theme + editor panel + AI editor + Worker SEO).
 * Referanslar: active news sites only (no corporate 7/11/61, no closed kirsehirhaber.org).
 */

export const AHENK_HSY_PATH = "/haber-sitesi-yazilimi";

/** Arama niyetli kısa yollar → kalıcı yönlendirme. */
export const AHENK_HSY_ALIASES = new Set([
  "/haber-scripti",
  "/haber-sitesi-scripti",
  "/php-haber-sitesi",
  "/php-haber-scripti",
  "/hazir-haber-sitesi",
  "/haber-yazilimi",
  "/haber-sitesi",
  "/haber-portali",
  "/yazilim/haber-medya-sitesi",
  "/haber-sitesi-yazilimi.html",
]);

export const AHENK_HSY_PRICE = {
  monthly: 3000,
  yearly: 27000,
  yearlyPerMonth: 2250,
  discountPct: 25,
  currency: "TRY",
};

export const AHENK_HSY_REFERENCES = [
  {
    "name": "Vatan Haber",
    "domain": "vatanhaber.net",
    "url": "https://vatanhaber.net/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1/logo?v=e4c2d757"
  },
  {
    "name": "TÜRKATA HABER AJANSI",
    "domain": "turkatahaber.com",
    "url": "https://turkatahaber.com/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/230/logo?v=fe323461"
  },
  {
    "name": "Ankara Şehir Gazetesi",
    "domain": "ankarasehirgazetesi.com",
    "url": "https://ankarasehirgazetesi.com/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/3/logo?v=50d43fb4"
  },
  {
    "name": "Ankara Haber Gündemi",
    "domain": "ankarahabergundemi.com",
    "url": "https://ankarahabergundemi.com/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/8/logo?v=178b741f"
  },
  {
    "name": "Gündem İstanbul",
    "domain": "gundemi.org",
    "url": "https://gundemi.org/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1141/logo?v=3a641d2b"
  },
  {
    "name": "Su Haber Ajansı",
    "domain": "suhaber.net",
    "url": "https://suhaber.net/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/2/logo?v=1083beef"
  },
  {
    "name": "Yerel Haber",
    "domain": "yerel.net.tr",
    "url": "https://yerel.net.tr/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/231/logo?v=6b63aec2"
  },
  {
    "name": "Yeşil Vatan",
    "domain": "yesilvatan.gen.tr",
    "url": "https://yesilvatan.gen.tr/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/236/logo?v=406eda17"
  },
  {
    "name": "Şehit Gazi Haber Portalı",
    "domain": "sehitgazi.org.tr",
    "url": "https://sehitgazi.org.tr/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/232/logo?v=d602d8b1"
  },
  {
    "name": "Dünya Sağlık",
    "domain": "dunyasaglik.org",
    "url": "https://dunyasaglik.org/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/237/logo?v=40411770"
  },
  {
    "name": "Harika Olacak",
    "domain": "harikaolacak.com.tr",
    "url": "https://harikaolacak.com.tr/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1171/logo?v=71ffd32e"
  },
  {
    "name": "TürkSav",
    "domain": "turksav.org",
    "url": "https://turksav.org/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/233/logo?v=3545b144"
  },
  {
    "name": "Sosyal Hizmetler Haber",
    "domain": "sosyalhizmetler.tr",
    "url": "https://sosyalhizmetler.tr/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1145/logo?v=3c573aa9"
  },
  {
    "name": "Fix Haber",
    "domain": "fix.tc",
    "url": "https://fix.tc/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1142/logo?v=75a6498b"
  },
  {
    "name": "Dünya Gündemi",
    "domain": "world.fix.tc",
    "url": "https://world.fix.tc/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1149/logo?v=a3cf3724"
  },
  {
    "name": "Kıbrıs Gündemi",
    "domain": "kibris.gundemi.org",
    "url": "https://kibris.gundemi.org/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1140/logo?v=9877cca3"
  },
  {
    "name": "Marmara Gündemi",
    "domain": "marmara.gundemi.org",
    "url": "https://marmara.gundemi.org/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1143/logo?v=dea51021"
  },
  {
    "name": "Ege Gündemi",
    "domain": "ege.gundemi.org",
    "url": "https://ege.gundemi.org/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1133/logo?v=201d7511"
  },
  {
    "name": "Akdeniz Gündemi",
    "domain": "akdeniz.gundemi.org",
    "url": "https://akdeniz.gundemi.org/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1139/logo?v=b7ec2925"
  },
  {
    "name": "İç Anadolu Gündemi",
    "domain": "icanadolu.gundemi.org",
    "url": "https://icanadolu.gundemi.org/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1136/logo?v=c8a2b51c"
  },
  {
    "name": "Karadeniz Gündemi",
    "domain": "karadeniz.gundemi.org",
    "url": "https://karadeniz.gundemi.org/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1135/logo?v=d715f3f9"
  },
  {
    "name": "Doğu Anadolu Gündemi",
    "domain": "doguanadolu.gundemi.org",
    "url": "https://doguanadolu.gundemi.org/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1137/logo?v=d107e8d5"
  },
  {
    "name": "Güneydoğu Gündemi",
    "domain": "guneydogu.gundemi.org",
    "url": "https://guneydogu.gundemi.org/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1138/logo?v=ee86b06c"
  },
  {
    "name": "Spor Gündemi",
    "domain": "spor.gundemi.org",
    "url": "https://spor.gundemi.org/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1146/logo?v=10a55263"
  },
  {
    "name": "Memur Gündemi",
    "domain": "memur.gundemi.org",
    "url": "https://memur.gundemi.org/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1147/logo?v=70cf10c9"
  },
  {
    "name": "Türk Dünyası Gündemi",
    "domain": "turkdunyasi.gundemi.org",
    "url": "https://turkdunyasi.gundemi.org/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1148/logo?v=fbd9fa69"
  },
  {
    "name": "Emlak Gündemi",
    "domain": "emlak.gundemi.org",
    "url": "https://emlak.gundemi.org/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1170/logo?v=7ae990a9"
  },
  {
    "name": "İş Dünyası Gündemi",
    "domain": "isdunyasi.gundemi.org",
    "url": "https://isdunyasi.gundemi.org/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1171/logo?v=ff8e1de7"
  }
];

export const AHENK_HSY_IL_REFERENCES = [
  {
    "name": "Fix Adana Haber",
    "domain": "adana.fix.tc",
    "url": "https://adana.fix.tc/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1154/logo?v=984b5f49"
  },
  {
    "name": "Fix Antalya Haber",
    "domain": "antalya.fix.tc",
    "url": "https://antalya.fix.tc/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1152/logo?v=6eec95cd"
  },
  {
    "name": "Fix Aydın Haber",
    "domain": "aydin.fix.tc",
    "url": "https://aydin.fix.tc/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1166/logo?v=b808e351"
  },
  {
    "name": "Fix Balıkesir Haber",
    "domain": "balikesir.fix.tc",
    "url": "https://balikesir.fix.tc/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1164/logo?v=f772aa49"
  },
  {
    "name": "Fix Bursa Haber",
    "domain": "bursa.fix.tc",
    "url": "https://bursa.fix.tc/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1151/logo?v=d8ea0b71"
  },
  {
    "name": "Fix Diyarbakır Haber",
    "domain": "diyarbakir.fix.tc",
    "url": "https://diyarbakir.fix.tc/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1159/logo?v=bbd778a3"
  },
  {
    "name": "Fix Gaziantep Haber",
    "domain": "gaziantep.fix.tc",
    "url": "https://gaziantep.fix.tc/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1156/logo?v=b4b11359"
  },
  {
    "name": "Fix Hatay Haber",
    "domain": "hatay.fix.tc",
    "url": "https://hatay.fix.tc/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1160/logo?v=7e425789"
  },
  {
    "name": "Fix Mersin Haber",
    "domain": "mersin.fix.tc",
    "url": "https://mersin.fix.tc/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1158/logo?v=451ebedb"
  },
  {
    "name": "Fix İzmir Haber",
    "domain": "izmir.fix.tc",
    "url": "https://izmir.fix.tc/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1150/logo?v=ca941362"
  },
  {
    "name": "Fix Kayseri Haber",
    "domain": "kayseri.fix.tc",
    "url": "https://kayseri.fix.tc/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1162/logo?v=2359ab29"
  },
  {
    "name": "Fix Kocaeli Haber",
    "domain": "kocaeli.fix.tc",
    "url": "https://kocaeli.fix.tc/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1157/logo?v=d7159095"
  },
  {
    "name": "Fix Konya Haber",
    "domain": "konya.fix.tc",
    "url": "https://konya.fix.tc/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1153/logo?v=c7259bed"
  },
  {
    "name": "Fix Manisa Haber",
    "domain": "manisa.fix.tc",
    "url": "https://manisa.fix.tc/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1161/logo?v=17ef6ac9"
  },
  {
    "name": "Fix Kahramanmaraş Haber",
    "domain": "kahramanmaras.fix.tc",
    "url": "https://kahramanmaras.fix.tc/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1168/logo?v=bbcb75ed"
  },
  {
    "name": "Fix Sakarya Haber",
    "domain": "sakarya.fix.tc",
    "url": "https://sakarya.fix.tc/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1169/logo?v=e134e24d"
  },
  {
    "name": "Fix Samsun Haber",
    "domain": "samsun.fix.tc",
    "url": "https://samsun.fix.tc/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1163/logo?v=4c13475d"
  },
  {
    "name": "Fix Tekirdağ Haber",
    "domain": "tekirdag.fix.tc",
    "url": "https://tekirdag.fix.tc/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1165/logo?v=83381989"
  },
  {
    "name": "Fix Şanlıurfa Haber",
    "domain": "sanliurfa.fix.tc",
    "url": "https://sanliurfa.fix.tc/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1155/logo?v=36c6939e"
  },
  {
    "name": "Fix Van Haber",
    "domain": "van.fix.tc",
    "url": "https://van.fix.tc/",
    "logo": "https://ahenk.net.tr/api/hm/public/news-sites/1167/logo?v=9bbe903d"
  }
];

export const AHENK_HSY_FEATURES = [
  {
    t: "Anında kurulum, siteniz dolu dolu hazır",
    d: "Alan adınızı bağladığınız an siteniz yayında. Kategoriler, manşet, son dakika bandı, yazar sayfaları ve yüzlerce güncel, resimli haberle açılır; boş bir siteyle uğraşmazsınız.",
  },
  {
    t: "Otomatik haber akışı ve kategorizasyon",
    d: "RSS ve ajans kaynaklarından gelen haberler otomatik çekilir, doğru kategoriye ve ilgili ile yerleşir. Aynı haberin kopyaları ayıklanır, konu dışı içerik vitrine girmez.",
  },
  {
    t: "Yapay zekâ editörü",
    d: "AI editör, gelen haberleri özgün bir dille yeniden yazar, başlık ve özet üretir, her gün özgün manşet haberleri hazırlar. Siteniz kopya içerik yerine kendi metinleriyle büyür.",
  },
  {
    t: "Köşe yazarları ve AI yazarlar",
    d: "Gerçek yazarlarınız için fotoğraflı yazar sayfaları, köşe arşivi ve yazar girişi. İsterseniz yapay zekâ yazarları düzenli köşe yazıları da üretir.",
  },
  {
    t: "Güçlü editör paneli",
    d: "Kod bilmeden haber ekleyin, düzenleyin, manşete alın veya gizleyin. Yazarlar, reklam alanları, RSS kaynakları, medya yükleme ve iletişim formundan gelen mesajlar tek panelde; okur mesajını tek tıkla habere dönüştürün.",
  },
  {
    t: "Manşet slider ve son dakika bandı",
    d: "Otomatik geçişli büyük manşet, ara manşet, kategori blokları ve son dakika şeridi. Farklı manşet düzenleri ve renk temalarıyla sitenize kimlik kazandırın.",
  },
  {
    t: "İl, bölge ve yerel haber altyapısı",
    d: "81 il sayfası, il ve bölge haber kutuları, il bazlı haber eşleştirme. İl siteleri (adana.fix.tc gibi) ve bölge siteleri aynı altyapıdan açılır.",
  },
  {
    t: "Şehir rehberi içerikleri",
    d: "Gezilecek yerler, tarih, kültür ve mekânlar için resimli Rehber yazıları. Yerel aramalarda sitenizi kalıcı içerikle öne çıkarır.",
  },
  {
    t: "Video ve zengin medya",
    d: "Video sayfası ve video arşivi, haber içinde görsel ve video desteği. Kırık görseller otomatik algılanır ve yedek görselle değiştirilir.",
  },
  {
    t: "Hazır widget’lar",
    d: "Hava durumu, namaz vakitleri, döviz ve altın kurları, puan durumu, burç yorumları ve hicri takvim gibi okurun her gün baktığı kutular hazır gelir.",
  },
  {
    t: "Reklam yönetimi",
    d: "Üst, yan ve haber içi reklam alanları panelden yönetilir. Boş kalan alan “Bu alana reklam verin” kutusuna döner; reklam bozulsa bile sayfa düzeni bozulmaz.",
  },
  {
    t: "SEO: Google ve Google News uyumu",
    d: "Otomatik sitemap.xml ve Google News sitemap’i, RSS çıktısı, kanonik adresler, NewsArticle ve NewsMediaOrganization şemaları, IndexNow ile yeni haberin arama motorlarına anında bildirilmesi.",
  },
  {
    t: "GEO: yapay zekâ aramalarında görünürlük",
    d: "llms.txt ve ai.txt dosyaları, yapay zekâ tarayıcılarına açık robots.txt. ChatGPT, Gemini ve Perplexity gibi asistanlar sitenizi kaynak olarak tanır.",
  },
  {
    t: "Cloudflare hızı ve güvenliği",
    d: "Sayfalar Cloudflare kenar ağından önbelleklenerek sunulur, SSL dahildir. Hafif PHP tema sayesinde yoğun trafikte bile hızlı açılır.",
  },
  {
    t: "Mobil uyumlu tasarım",
    d: "Telefon, tablet ve masaüstünde aynı hız ve düzen. Okurlarınızın çoğu mobilden gelir; tema buna göre tasarlandı.",
  },
  {
    t: "Paylaşım kartları",
    d: "Sosyal medyada paylaşılan her haber başlık, görsel ve özetle; köşe yazıları yazar fotoğrafıyla görünür.",
  },
  {
    t: "Çoklu site yönetimi",
    d: "Tek altyapıdan onlarca site: her sitenin kendi alan adı, logosu, renkleri, kategorileri ve yazarları olur; ortak haber havuzundan beslenir.",
  },
  {
    t: "Kurumsal sayfalar hazır",
    d: "Künye, hakkımızda, iletişim formu, tanıtım sayfası ve diğer sitelere haber kutusu ekleten “Sitene ekle” aracı kurulumla birlikte gelir.",
  },
];

export const AHENK_HSY_FAQS = [
  {
    q: "Haber sitesi yazılımı fiyatı ne kadar?",
    a: "Aylık 3.000 TL’dir. Yıllık ödemede %25 indirimle 27.000 TL (aylık 2.250 TL’ye denk gelir). İki pakette de barındırma ve yapay zekâ editörü ile içerik üretimi dahildir.",
  },
  {
    q: "Haber sitem ne kadar sürede yayına girer?",
    a: "Kurulum anında yapılır. Alan adınız bağlandığında siteniz kategorileri, manşeti ve güncel haberleriyle dolu dolu hazır açılır.",
  },
  {
    q: "Bu bir PHP haber sitesi scripti mi?",
    a: "Evet. Ön yüz hızlı ve hafif bir PHP haber teması, arkada editör paneli ve yapay zekâ editörü çalışır. Script kurmak, sunucu ayarlamak veya güncelleme yapmakla uğraşmazsınız; hepsini biz yönetiriz.",
  },
  {
    q: "Haberler kendiliğinden mi geliyor?",
    a: "Evet. RSS ve ajans kaynaklarından gelen haberler otomatik çekilir, kategorilenir ve yapay zekâ editörü tarafından özgünleştirilir. Siz de panelden istediğiniz haberi ekleyebilir, manşete alabilir veya gizleyebilirsiniz.",
  },
  {
    q: "Kendi alan adımı kullanabilir miyim?",
    a: "Evet. Site kendi alan adınızda, kendi logonuz ve renklerinizle yayınlanır.",
  },
  {
    q: "Google News ve arama motorları için uygun mu?",
    a: "Evet. Google News sitemap’i, standart sitemap, RSS, haber şemaları ve IndexNow bildirimi hazır gelir. Yapay zekâ aramaları için llms.txt dosyası da otomatik oluşturulur.",
  },
  {
    q: "Köşe yazarı ekleyebilir miyim?",
    a: "Evet. Yazarlarınız için fotoğraflı yazar sayfaları açılır, yazarlar kendi girişleriyle yazı gönderebilir. İsterseniz yapay zekâ yazarlar da düzenli köşe yazısı üretir.",
  },
  {
    q: "Nasıl başvururum?",
    a: "bilgi@ahenk.net.tr adresine e-posta gönderin ya da 0541 313 62 45 numaralı WhatsApp hattından yazın. En kısa sürede dönüş yapıyoruz.",
  },
];

const ORIGIN = "https://ahenk.net.tr";
const EMAIL = "bilgi@ahenk.net.tr";
const PHONE = "0541 313 62 45";
const WA = "https://wa.me/905413136245?text=" + encodeURIComponent("Merhaba, Ahenk Haber Sitesi Yazılımı hakkında bilgi almak istiyorum.");

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tl(n) {
  return n.toLocaleString("tr-TR").replace(/,/g, ".");
}

export function buildAhenkHsyJsonLd() {
  const url = `${ORIGIN}${AHENK_HSY_PATH}`;
  const p = AHENK_HSY_PRICE;
  const offers = [
    {
      "@type": "Offer",
      name: "Aylık paket",
      price: String(p.monthly),
      priceCurrency: p.currency,
      availability: "https://schema.org/InStock",
      url: `${url}#fiyat`,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: p.monthly,
        priceCurrency: p.currency,
        billingDuration: "P1M",
        unitText: "ay",
      },
      seller: { "@id": `${ORIGIN}/#organization` },
    },
    {
      "@type": "Offer",
      name: "Yıllık paket (%25 indirimli)",
      price: String(p.yearly),
      priceCurrency: p.currency,
      availability: "https://schema.org/InStock",
      url: `${url}#fiyat`,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: p.yearly,
        priceCurrency: p.currency,
        billingDuration: "P1Y",
        unitText: "yıl",
      },
      seller: { "@id": `${ORIGIN}/#organization` },
    },
  ];
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "ProfessionalService"],
        "@id": `${ORIGIN}/#organization`,
        name: "Ahenk Bilgi Teknolojileri",
        url: `${ORIGIN}/`,
        logo: `${ORIGIN}/ahenk-brand/ahenk-logo.png`,
        email: EMAIL,
        telephone: "+905413136245",
      },
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: "Haber Sitesi Yazılımı — PHP Haber Scripti | Ahenk",
        inLanguage: "tr-TR",
        isPartOf: { "@id": `${ORIGIN}/#website`, "@type": "WebSite", url: `${ORIGIN}/`, name: "Ahenk Bilgi Teknolojileri" },
        about: { "@id": `${url}#product` },
        breadcrumb: { "@id": `${url}#breadcrumb` },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Anasayfa", item: `${ORIGIN}/` },
          { "@type": "ListItem", position: 2, name: "Hizmetlerimiz", item: `${ORIGIN}/hizmetlerimiz` },
          { "@type": "ListItem", position: 3, name: "Haber Sitesi Yazılımı", item: url },
        ],
      },
      {
        "@type": ["Product", "SoftwareApplication"],
        "@id": `${url}#product`,
        name: "Ahenk Haber Sitesi Yazılımı",
        alternateName: ["Ahenk PHP Haber Scripti", "Hazır Haber Sitesi"],
        description:
          "Anında kurulan, haberlerle dolu hazır gelen PHP haber sitesi yazılımı: otomatik RSS haber akışı, yapay zekâ editörü, editör paneli, köşe yazarları, manşet, il ve bölge haberleri, Google News uyumlu SEO ve Cloudflare hızı.",
        brand: { "@type": "Brand", name: "Ahenk" },
        image: `${ORIGIN}/ahenk-brand/ahenk-logo.png`,
        url,
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Haber sitesi yazılımı",
        operatingSystem: "Web",
        inLanguage: "tr-TR",
        featureList: AHENK_HSY_FEATURES.map((f) => f.t),
        offers,
        provider: { "@id": `${ORIGIN}/#organization` },
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#sss`,
        mainEntity: AHENK_HSY_FAQS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
}

function refTile(r, small) {
  return `<a class="ref${small ? " ref-s" : ""}" href="${esc(r.url)}" target="_blank" rel="noopener" title="${esc(r.name)} — ${esc(r.domain)}"><span class="ref-logo"><img src="${esc(r.logo)}" alt="${esc(r.name)} logosu" loading="lazy" decoding="async" width="200" height="60"></span><span class="ref-name">${esc(r.name)}</span><span class="ref-dom">${esc(r.domain)}</span></a>`;
}

export function buildAhenkHsyHtml() {
  const url = `${ORIGIN}${AHENK_HSY_PATH}`;
  const title = "Haber Sitesi Yazılımı — PHP Haber Scripti, Hazır Haber Sitesi | Ahenk";
  const desc =
    "Ahenk Haber Sitesi Yazılımı: anında kurulum, haberlerle dolu hazır site, yapay zekâ editörü, otomatik RSS, editör paneli, Google News uyumlu SEO. Aylık 3.000 TL, barındırma dahil.";
  const p = AHENK_HSY_PRICE;
  const total = AHENK_HSY_REFERENCES.length + AHENK_HSY_IL_REFERENCES.length;
  const jsonLd = JSON.stringify(buildAhenkHsyJsonLd()).replace(/</g, "\\u003c");
  const features = AHENK_HSY_FEATURES.map(
    (f, i) => `<article class="feat"><span class="num">${String(i + 1).padStart(2, "0")}</span><h3>${esc(f.t)}</h3><p>${esc(f.d)}</p></article>`,
  ).join("");
  const faqs = AHENK_HSY_FAQS.map(
    (f) => `<details class="faq"><summary><h3>${esc(f.q)}</h3></summary><p>${esc(f.a)}</p></details>`,
  ).join("");
  const refs = AHENK_HSY_REFERENCES.map((r) => refTile(r, false)).join("");
  const ilRefs = AHENK_HSY_IL_REFERENCES.map((r) => refTile(r, true)).join("");
  const mail = (subject) => `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}`;
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="keywords" content="haber sitesi yazılımı, php haber sitesi, haber scripti, haber sitesi scripti, hazır haber sitesi, haber yazılımı">
<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<link rel="alternate" hreflang="tr-TR" href="${url}">
<meta property="og:type" content="website">
<meta property="og:locale" content="tr_TR">
<meta property="og:site_name" content="Ahenk Bilgi Teknolojileri">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${ORIGIN}/ahenk-brand/ahenk-logo.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<script type="application/ld+json">${jsonLd}</script>
<style>
:root{--navy:#06101c;--navy2:#0c1d33;--paper:#0a1524;--gold:#d4af37;--gold2:#f3d98a;--ink:#e8eef8;--muted:#9aa8bc;--line:rgba(212,175,55,.22);--cyan:#5eead4}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
a{color:var(--gold2)}img{max-width:100%}
.wrap{max-width:1180px;margin:0 auto;padding:0 20px}
.top{background:var(--navy);font-size:13px;color:var(--muted);border-bottom:1px solid var(--line)}.top .wrap{display:flex;gap:18px;flex-wrap:wrap;padding-top:6px;padding-bottom:6px}.top a{color:var(--gold2);text-decoration:none}
header.hd{background:var(--navy2);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:20}
header.hd .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:68px}
.brand img{height:42px;width:auto;display:block}
nav.nv{display:flex;align-items:center;gap:4px;flex-wrap:wrap}
nav.nv>a,.dd>a{color:var(--ink);text-decoration:none;padding:8px 10px;border-radius:8px;font-size:15px}
nav.nv>a:hover,.dd>a:hover,.dd>a.on{color:var(--gold2)}
.dd{position:relative}.dd .sub{display:none;position:absolute;left:0;top:100%;background:var(--navy);border:1px solid var(--line);border-radius:10px;min-width:240px;padding:6px;box-shadow:0 12px 30px rgba(0,0,0,.4)}
.dd:hover .sub,.dd:focus-within .sub{display:block}.sub a{display:block;color:var(--ink);text-decoration:none;padding:8px 10px;border-radius:6px}.sub a:hover,.sub a.on{background:rgba(212,175,55,.12);color:var(--gold2)}
.wa-btn{background:var(--gold);color:var(--navy)!important;font-weight:700}
.mnav{display:none}
@media (max-width:900px){nav.nv{display:none}.mnav{display:block}.mnav summary{list-style:none;cursor:pointer;border:1px solid var(--line);border-radius:8px;padding:6px 12px;color:var(--gold2)}.mnav summary::-webkit-details-marker{display:none}.mnav[open] .mlist{display:grid}.mlist{display:none;position:absolute;right:12px;left:12px;top:70px;background:var(--navy);border:1px solid var(--line);border-radius:12px;padding:8px;gap:2px}.mlist a{color:var(--ink);text-decoration:none;padding:10px;border-radius:8px}.mlist a.ind{padding-left:26px;color:var(--gold2)}}
.hero{background:radial-gradient(1200px 500px at 80% -10%,rgba(94,234,212,.12),transparent),linear-gradient(180deg,var(--navy2),var(--paper));padding:56px 0 40px;border-bottom:1px solid var(--line)}
.crumb{font-size:13px;color:var(--muted)}.crumb a{color:var(--muted)}
.kicker{display:inline-block;color:var(--cyan);font-weight:600;letter-spacing:.04em;font-size:14px;text-transform:uppercase;margin-top:14px}
h1{font-size:clamp(30px,4.6vw,50px);line-height:1.12;margin:10px 0 14px;color:#fff}
h2{font-size:clamp(24px,3vw,34px);line-height:1.2;margin:0 0 10px;color:#fff}
h3{font-size:18px;margin:0 0 6px;color:var(--gold2)}
.lead{font-size:18px;color:#cfd8e6;max-width:820px}
.btns{display:flex;gap:12px;flex-wrap:wrap;margin-top:22px}
.btn{display:inline-block;padding:12px 20px;border-radius:10px;font-weight:700;text-decoration:none;background:var(--gold);color:var(--navy)}.btn:hover{background:var(--gold2)}
.btn.ghost{background:transparent;border:1px solid var(--gold);color:var(--gold2)}
.stats{display:flex;gap:26px;flex-wrap:wrap;margin-top:28px;color:var(--muted);font-size:14px}.stats b{display:block;font-size:26px;color:#fff}
section.sec{padding:52px 0;border-bottom:1px solid var(--line)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:16px;margin-top:24px}
.feat{background:var(--navy2);border:1px solid var(--line);border-radius:14px;padding:20px}.feat p{margin:0;color:#c7d1df;font-size:15px}.num{display:block;color:var(--cyan);font-weight:700;font-size:13px;margin-bottom:6px}
.prices{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px;margin-top:24px;max-width:860px}
.plan{background:var(--navy2);border:1px solid var(--line);border-radius:16px;padding:26px;position:relative}.plan.best{border:2px solid var(--gold)}
.badge{position:absolute;top:-12px;right:18px;background:var(--gold);color:var(--navy);font-weight:800;font-size:13px;padding:4px 10px;border-radius:999px}
.amt{font-size:40px;font-weight:800;color:#fff;line-height:1.1;margin:8px 0 2px}.amt small{font-size:16px;font-weight:600;color:var(--muted)}
.plan ul{padding-left:20px;margin:14px 0 18px;color:#c7d1df}.plan li{margin:4px 0}.note{color:var(--muted);font-size:14px}
.refs{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px;margin-top:22px}
.ref{display:flex;flex-direction:column;align-items:center;gap:6px;text-decoration:none;background:#fff;border-radius:12px;padding:12px;color:#0b1a2c;border:1px solid #e5e7eb;transition:transform .15s}
.ref:hover{transform:translateY(-2px)}
.ref-logo{height:58px;display:flex;align-items:center;justify-content:center;width:100%}.ref-logo img{max-height:58px;width:auto;object-fit:contain}
.ref-name{font-weight:700;font-size:13px;text-align:center;line-height:1.25}.ref-dom{font-size:12px;color:#4b5563}
.ref-s .ref-logo{height:42px}.ref-s .ref-logo img{max-height:42px}
.faq{background:var(--navy2);border:1px solid var(--line);border-radius:12px;padding:14px 18px;margin-top:10px}.faq summary{cursor:pointer;list-style:none}.faq summary::-webkit-details-marker{display:none}.faq summary h3{display:inline;font-size:17px}.faq p{margin:10px 0 0;color:#c7d1df}
.cta{background:linear-gradient(135deg,var(--navy2),#10294a);border:1px solid var(--gold);border-radius:18px;padding:30px;margin-top:10px}
.prose p{color:#c7d1df;max-width:900px}
footer.ft{background:var(--navy);padding:30px 0;color:var(--muted);font-size:14px}footer.ft a{color:var(--gold2);text-decoration:none}.fgrid{display:flex;gap:30px;flex-wrap:wrap;justify-content:space-between}
.waf{position:fixed;right:16px;bottom:16px;background:#25d366;color:#fff;font-weight:700;padding:12px 16px;border-radius:999px;text-decoration:none;box-shadow:0 8px 24px rgba(0,0,0,.35);z-index:30}
</style>
</head>
<body>
<div class="top"><div class="wrap"><span>GSM: ${PHONE}</span><a href="mailto:${EMAIL}">${EMAIL}</a><span>Pazartesi - Cumartesi 09:00 - 18:00</span></div></div>
<header class="hd"><div class="wrap">
<a class="brand" href="/" aria-label="Ahenk Bilgi Teknolojileri"><img src="/ahenk-brand/ahenk-logo.png" alt="Ahenk Bilgi Teknolojileri" width="210" height="42"></a>
<nav class="nv" aria-label="Ana menü">
<a href="/">Anasayfa</a><a href="/hakkimizda">Hakkımızda</a><a href="/urunlerimiz">Ürünlerimiz</a>
<div class="dd"><a class="on" href="/hizmetlerimiz" aria-haspopup="true">Hizmetlerimiz ▾</a><div class="sub"><a class="on" href="${AHENK_HSY_PATH}">Haber Sitesi Yazılımı</a><a href="/hizmetlerimiz">Tüm hizmetlerimiz</a></div></div>
<a href="/kariyer">Kariyer</a><a href="/turkata-haber-ajansi">TürkAta Haber Ajansı</a><a href="/iletisim">İletişim</a>
<a class="wa-btn" href="${WA}" target="_blank" rel="noopener">WhatsApp</a>
</nav>
<details class="mnav"><summary aria-label="Menü">☰ Menü</summary><div class="mlist">
<a href="/">Anasayfa</a><a href="/hakkimizda">Hakkımızda</a><a href="/urunlerimiz">Ürünlerimiz</a><a href="/hizmetlerimiz">Hizmetlerimiz</a><a class="ind" href="${AHENK_HSY_PATH}">› Haber Sitesi Yazılımı</a><a href="/kariyer">Kariyer</a><a href="/turkata-haber-ajansi">TürkAta Haber Ajansı</a><a href="/iletisim">İletişim</a><a href="${WA}" target="_blank" rel="noopener">WhatsApp</a>
</div></details>
</div></header>

<main>
<section class="hero"><div class="wrap">
<div class="crumb"><a href="/">Anasayfa</a> / <a href="/hizmetlerimiz">Hizmetlerimiz</a> / Haber Sitesi Yazılımı</div>
<span class="kicker">Anında kurulum · Siteniz dolu dolu hazır</span>
<h1>Haber Sitesi Yazılımı</h1>
<p class="lead">Ahenk Haber Sitesi Yazılımı ile haber sitenizi bugün açın. Hızlı bir PHP haber teması, güçlü editör paneli ve yapay zekâ editörü tek pakette. Siteniz ilk günden kategorileri, manşeti ve güncel haberleriyle dolu açılır. Script kurmak, sunucu yönetmek ya da boş sayfalarla uğraşmak yok.</p>
<div class="btns"><a class="btn" href="#fiyat">Fiyatları gör</a><a class="btn ghost" href="${mail("Haber Sitesi Yazılımı başvurusu")}">Hemen başvur</a><a class="btn ghost" href="#referanslar">Referanslar</a></div>
<div class="stats"><span><b>${total}+</b>yayındaki haber sitesi</span><span><b>${AHENK_HSY_FEATURES.length}</b>hazır özellik</span><span><b>Anında</b>kurulum</span><span><b>7/24</b>otomatik haber akışı</span></div>
</div></section>

<section class="sec" id="neden"><div class="wrap">
<h2>Neden Ahenk Haber Sitesi Yazılımı?</h2>
<p class="lead">Bu yazılım bir demo değil. Aşağıdaki sitelerin hepsi bugün bu altyapıyla yayında. Hazır haber sitesi arayan yerel gazeteler, ajanslar, dernekler ve girişimciler için her özellik gerçek bir haber ağında sınanmış durumda.</p>
<div class="grid">${features}</div>
</div></section>

<section class="sec" id="fiyat"><div class="wrap">
<h2>Haber Sitesi Yazılımı Fiyatları</h2>
<p class="lead">Tek paket, iki ödeme seçeneği. İkisinde de barındırma ve yapay zekâ editörü ile içerik üretimi dahildir.</p>
<div class="prices">
<div class="plan"><h3>Aylık</h3><div class="amt">${tl(p.monthly)} TL <small>/ ay</small></div><p class="note">Her ay ödenir.</p>
<ul><li>Haber sitesi yazılımı ve editör paneli</li><li>Barındırma (hosting) dahil</li><li>Yapay zekâ editörü içerik üretimi dahil</li><li>Anında kurulum, haberlerle dolu hazır site</li><li>Kendi alan adınız, logonuz ve renkleriniz</li></ul>
<a class="btn" href="${mail("Haber Sitesi Yazılımı - Aylık paket (3.000 TL)")}">Aylık paketi başlat</a></div>
<div class="plan best"><span class="badge">%${p.discountPct} indirim</span><h3>Yıllık</h3><div class="amt">${tl(p.yearly)} TL <small>/ yıl</small></div><p class="note">Aylık ${tl(p.yearlyPerMonth)} TL’ye denk gelir. Yılda ${tl(p.monthly * 12 - p.yearly)} TL tasarruf.</p>
<ul><li>Aylık paketteki her şey</li><li>Barındırma (hosting) dahil</li><li>Yapay zekâ editörü içerik üretimi dahil</li><li>%${p.discountPct} indirimli yıllık fiyat</li><li>Anında kurulum, haberlerle dolu hazır site</li></ul>
<a class="btn" href="${mail("Haber Sitesi Yazılımı - Yıllık paket (27.000 TL)")}">Yıllık paketi başlat</a></div>
</div>
<p class="note" style="margin-top:14px">Fiyatlar Türk lirasıdır. Teklif ve fatura bilgisi için <a href="mailto:${EMAIL}">${EMAIL}</a> adresine yazabilirsiniz.</p>
</div></section>

<section class="sec" id="referanslar"><div class="wrap">
<h2>Referanslar</h2>
<p class="lead">Ahenk Haber Sitesi Yazılımı ile yayın yapan haber sitelerimizden bazıları. Logolara tıklayıp siteleri canlı inceleyebilirsiniz.</p>
<div class="refs">${refs}</div>
<h3 style="margin-top:30px">İl haber siteleri</h3>
<p class="note">Aynı altyapıyla açılan Fix il haber siteleri.</p>
<div class="refs">${ilRefs}</div>
</div></section>

<section class="sec" id="php-haber-scripti"><div class="wrap prose">
<h2>PHP haber sitesi ve haber scripti arayanlara</h2>
<p>Klasik bir haber scripti satın aldığınızda kurulum, sunucu, güncelleme ve güvenlik size kalır; site de bomboş açılır. Ahenk Haber Sitesi Yazılımı ise hazır haber sitesi olarak teslim edilir. PHP tabanlı hafif tema Cloudflare üzerinden sunulur, yazılım güncellemeleri ve barındırma bizdedir. Siz yalnızca haberinize ve okurunuza odaklanırsınız.</p>
<p>Yerel gazete, il ya da bölge haber portalı, sektör haber sitesi veya dernek bülteni kurmak isteyenler için uygundur. Haber sitesi scripti arayıp kurulumla uğraşmak istemiyorsanız bize yazın, sitenizi hemen açalım.</p>
</div></section>

<section class="sec" id="sss"><div class="wrap">
<h2>Sık sorulan sorular</h2>
${faqs}
</div></section>

<section class="sec" id="iletisim"><div class="wrap">
<div class="cta">
<h2>Haber sitenizi bugün açalım</h2>
<p class="lead">Alan adınızı ve sitenizin konusunu yazmanız yeterli. Kurulumu yapıp sitenizi dolu dolu teslim ediyoruz.</p>
<div class="btns"><a class="btn" href="${mail("Haber Sitesi Yazılımı başvurusu")}">${EMAIL}</a><a class="btn ghost" href="${WA}" target="_blank" rel="noopener">WhatsApp: ${PHONE}</a><a class="btn ghost" href="/iletisim">İletişim sayfası</a></div>
</div>
</div></section>
</main>

<footer class="ft"><div class="wrap fgrid">
<div><strong style="color:#fff">Ahenk Bilgi Teknolojileri</strong><br><a href="mailto:${EMAIL}">${EMAIL}</a> · <a href="tel:+905413136245">${PHONE}</a></div>
<div><a href="/">Anasayfa</a> · <a href="/hizmetlerimiz">Hizmetlerimiz</a> · <a href="${AHENK_HSY_PATH}">Haber Sitesi Yazılımı</a> · <a href="/turkata-haber-ajansi">TürkAta Haber Ajansı</a> · <a href="/iletisim">İletişim</a></div>
<div>© ${new Date().getUTCFullYear()} Ahenk Bilgi Teknolojileri</div>
</div></footer>
<a class="waf" href="${WA}" target="_blank" rel="noopener">WhatsApp</a>
</body>
</html>`;
}

/** Worker hook: GET/HEAD on ahenk.net.tr (and www). Returns null for everything else. */
export function serveAhenkHaberSitesiYazilimi(request, incoming) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const host = String(incoming.hostname || "").toLowerCase().replace(/^www\./, "");
  if (host !== "ahenk.net.tr") return null;
  const path = (incoming.pathname.replace(/\/+$/, "") || "/").toLowerCase();
  if (AHENK_HSY_ALIASES.has(path)) {
    return new Response(null, {
      status: 301,
      headers: {
        location: `${ORIGIN}${AHENK_HSY_PATH}`,
        "cache-control": "public, max-age=86400",
        "x-yekpare-frontend": "cloudflare-ahenk-hsy-redirect",
      },
    });
  }
  if (path !== AHENK_HSY_PATH) return null;
  const headers = new Headers({
    "content-type": "text/html; charset=utf-8",
    "cache-control": "public, max-age=300",
    "x-yekpare-frontend": "cloudflare-ahenk-hsy",
    "x-robots-tag": "index, follow, max-image-preview:large, max-snippet:-1",
  });
  if (request.method === "HEAD") return new Response(null, { status: 200, headers });
  return new Response(buildAhenkHsyHtml(), { status: 200, headers });
}
