import {
  TURIZM_CATEGORY_INTRO,
  turizmIntroTitleToSlug,
  type TurizmCategorySlug,
  type TurizmIntroCard,
} from "./turizmCategoryIntroConfig";
import { TURIZM } from "./turizmRoutes";

export type TurizmBlogSeedPost = {
  slug: string;
  title: string;
  meta_title: string;
  meta_description: string;
  excerpt: string;
  body_html: string;
  cover_image_url: string;
  category_slug: string | null;
  is_featured: boolean;
  is_published: boolean;
  published_at: string;
};

const CATEGORY_LABELS: Record<TurizmCategorySlug, string> = {
  hub: "Seyahat",
  yat: "Yat & Tekne",
  konaklama: "Konaklama",
  "villa-ev": "Villa & Ev",
  turlar: "Tur",
  arac: "Araç Kiralama",
  ucus: "Uçuş",
  servis: "VIP Transfer",
  otobus: "Otobüs",
  etkinlik: "Etkinlik",
  "gezi-seyahat": "Gezi & Seyahat",
};

const CATEGORY_HOME: Partial<Record<TurizmCategorySlug, string>> = {
  yat: TURIZM.yat.home,
  konaklama: TURIZM.konaklama.home,
  "villa-ev": TURIZM.villaEv.home,
  turlar: TURIZM.turlar.home,
  arac: TURIZM.arac.home,
  ucus: TURIZM.stubs.ucus,
  servis: TURIZM.stubs.servis,
  otobus: TURIZM.stubs.otobus,
  etkinlik: TURIZM.stubs.etkinlik,
  "gezi-seyahat": TURIZM.geziSeyahat,
};

const HUB_FEATURED: Array<{
  slug: string;
  title: string;
  excerpt: string;
  cover_image_url: string;
  meta_description: string;
  body_html: string;
}> = [
  {
    slug: "kapadokya-da-bir-gun",
    title: "Kapadokya'da bir gün",
    excerpt: "Balon turu, vadiler ve yerel lezzetlerle dolu örnek rota.",
    cover_image_url:
      "https://images.unsplash.com/photo-1570633774822-44f52c0b3455?w=800&q=80",
    meta_description:
      "Kapadokya'da bir gün geçirmek için balon, vadi yürüyüşü ve konaklama önerileri — Yekpare Seyahat rehberi.",
    body_html: `<p>Kapadokya, Türkiye'nin en fotojenik rotalarından biridir. Sabah erken saatlerde balon turu, gün içinde Aşk, Güvercinlik veya Kızılçukur vadilerinde yürüyüş, akşam ise Göreme veya Ürgüp'te yerel mutfak deneyimi tipik bir gün planıdır.</p>
<p>Yekpare Seyahat'te Kapadokya turları, konaklama ve transfer ilanlarını karşılaştırabilirsiniz. Rezervasyon ve ödeme listelenen tur operatörü veya otel ile doğrudan yapılır; platform satıcı değildir.</p>
<h2>Pratik ipuçları</h2>
<ul>
<li>Balon turları hava koşullarına bağlıdır; seyahatinize yedek gün bırakın.</li>
<li>Mağara otelleri ve butik tesisler için erken rezervasyon avantajlıdır.</li>
<li>Havalimanı transferi için VIP transfer ilanlarını inceleyin.</li>
</ul>
<p><a href="${TURIZM.turlar.home}?city=Kapadokya">Kapadokya turlarını inceleyin →</a></p>`,
  },
  {
    slug: "bodrum-koylari-rehberi",
    title: "Bodrum koyları rehberi",
    excerpt: "Tekne turları ve yat kiralama için en iyi duraklar.",
    cover_image_url:
      "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=800&q=80",
    meta_description:
      "Bodrum koyları, tekne turu ve yat kiralama rehberi — Yekpare Seyahat vitrini.",
    body_html: `<p>Bodrum yarımadası; Yalıkavak, Türkbükü, Gümüşlük ve Orak Adası gibi duraklarla Ege'nin en popüler deniz tatili rotalarından biridir. Günübirlik tekne turları ve haftalık yat kiralama seçenekleri yaz sezonunda yoğun talep görür.</p>
<p>Yekpare Seyahat'te Bodrum çıkışlı yat, gulet ve tekne kiralama ilanlarını; ayrıca konaklama ve VIP transfer firmalarını tek vitrinde bulabilirsiniz.</p>
<h2>Öne çıkan koylar</h2>
<ul>
<li><strong>Orak Adası</strong> — Turkuaz su ve yüzme molaları</li>
<li><strong>Gümüşlük</strong> — Sakin koy ve balık restoranları</li>
<li><strong>Yalıkavak</strong> — Marina ve lüks konaklama</li>
</ul>
<p><a href="${TURIZM.yat.home}?city=Bodrum">Bodrum yat ilanlarını görüntüleyin →</a></p>`,
  },
  {
    slug: "istanbul-da-hafta-sonu",
    title: "İstanbul'da hafta sonu",
    excerpt: "Tarihi yarımada, Boğaz ve gastronomi durakları.",
    cover_image_url:
      "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&q=80",
    meta_description:
      "İstanbul'da hafta sonu gezisi için rota, konaklama ve ulaşım önerileri.",
    body_html: `<p>İstanbul'da iki günlük bir kaçamak için Tarihi Yarımada (Ayasofya, Topkapı, Kapalıçarşı), Karaköy–Galata hattı ve Boğaz hattı klasik bir program oluşturur. Akşam ise Kadıköy veya Bebek'te yemek molası planlayabilirsiniz.</p>
<p>Yekpare Seyahat'te İstanbul otelleri, şehir turları, araç kiralama ve havalimanı VIP transfer ilanlarını karşılaştırın. Bilet ve rezervasyon işlemleri listelenen işletmeler üzerinden tamamlanır.</p>
<h2>Ulaşım</h2>
<ul>
<li>IST ve SAW havalimanlarından şehir merkezine VIP transfer seçenekleri</li>
<li>Şehir içi turlar ve rehberli geziler</li>
<li>Hafta sonu otel ve butik konaklama ilanları</li>
</ul>
<p><a href="${TURIZM.konaklama.home}?city=İstanbul">İstanbul konaklama ilanları →</a></p>`,
  },
];

function categoryTips(slug: TurizmCategorySlug): string[] {
  switch (slug) {
    case "servis":
      return [
        "Uçuş numaranızı ve varış terminalini rezervasyon öncesi paylaşın.",
        "Meet & greet ve bekleme süresi firma profilinde belirtilir.",
        "KDV dahil fiyatlar ilgili transfer firması tarafından yayınlanır.",
      ];
    case "ucus":
      return [
        "Fiyatları karşılaştırın; bileti yetkili acente veya havayolu sitesinde tamamlayın.",
        "Bagaj hakkı ve iptal koşullarını satın alma öncesi kontrol edin.",
        "Son dakika fırsatları için esnek tarih arayın.",
      ];
    case "otobus":
      return [
        "Kalkış ve varış otogarını sefer saatinden önce doğrulayın.",
        "Gece seferlerinde koltuk tipini (2+1, VIP) karşılaştırın.",
        "Bilet satın alma listelenen otobüs firmasında yapılır.",
      ];
    case "etkinlik":
      return [
        "Biletleri partner platform veya resmi satış noktasından alın.",
        "Etkinlik tarihi ve mekân adresini biletinizle birlikte kontrol edin.",
        "İade koşulları organizatöre göre değişir.",
      ];
    case "konaklama":
    case "villa-ev":
      return [
        "Giriş–çıkış saatlerini ilan detayında inceleyin.",
        "İptal ve ön ödeme koşulları tesise göre farklılık gösterir.",
        "Konum ve olanakları harita üzerinden doğrulayın.",
      ];
    case "yat":
      return [
        "Mürettebatlı ve kaptansız seçenekleri ihtiyacınıza göre filtreleyin.",
        "Rota ve yakıt koşullarını kiralama sözleşmesinde netleştirin.",
        "Grup büyüklüğüne uygun tekne tipini seçin.",
      ];
    case "turlar":
      return [
        "Rehberli ve paket turlarda dahil hizmetleri karşılaştırın.",
        "Sezon ve kontenjan durumunu operatörle teyit edin.",
        "Transfer ve yemek dahil paketler zaman kazandırır.",
      ];
    case "arac":
      return [
        "Depozito ve km sınırı koşullarını okuyun.",
        "Havalimanı teslim seçeneği varış saatinize göre planlayın.",
        "Ehliyet ve yaş şartları araç sınıfına göre değişir.",
      ];
    case "gezi-seyahat":
      return [
        "Rota planını mevsim ve bütçenize göre oluşturun.",
        "Yerel rehber ve tur ilanlarını kategori vitrinlerinden keşfedin.",
        "Konaklama ve ulaşımı aynı platformda birleştirin.",
      ];
    default:
      return [
        "Listelenen işletmelerin profil ve fiyat bilgilerini karşılaştırın.",
        "Rezervasyon doğrudan ilgili firma ile yapılır.",
      ];
  }
}

function buildBodyHtml(
  categorySlug: TurizmCategorySlug,
  title: string,
  description: string,
  card: TurizmIntroCard,
): string {
  const label = CATEGORY_LABELS[categorySlug];
  const tips = categoryTips(categorySlug);
  const link = card.href || CATEGORY_HOME[categorySlug] || TURIZM.hub;
  const tipsHtml = tips.map((t) => `<li>${t}</li>`).join("\n");

  return `<p>${description}</p>
<p><strong>${title}</strong>, Yekpare Seyahat ${label} vitrininde listelenen işletmelerle planlanabilecek bir seçenektir. Platform ilanları bir araya getirir; ödeme ve sözleşme listelenen acente, otel, tur operatörü veya transfer firması ile doğrudan yapılır. Yekpare satıcı değildir ve ödeme almaz.</p>
<h2>Planlarken bilmeniz gerekenler</h2>
<ul>
${tipsHtml}
</ul>
<p><a href="${link}">${label} ilanlarını inceleyin →</a></p>`;
}

function blogSlug(categorySlug: TurizmCategorySlug, title: string): string {
  return `${categorySlug}-${turizmIntroTitleToSlug(title)}`;
}

function flatIntroCards(categorySlug: TurizmCategorySlug): TurizmIntroCard[] {
  return TURIZM_CATEGORY_INTRO[categorySlug].sections.flatMap((s) => s.cards);
}

/** Kategori tanıtım kartlarından blog yazıları + anasayfa manşet yazıları */
export function buildTurizmBlogSeedPosts(): TurizmBlogSeedPost[] {
  const posts: TurizmBlogSeedPost[] = [];
  const baseDate = new Date("2026-06-01T10:00:00.000Z");

  HUB_FEATURED.forEach((h, i) => {
    posts.push({
      slug: h.slug,
      title: h.title,
      meta_title: `${h.title} | Yekpare Seyahat`,
      meta_description: h.meta_description,
      excerpt: h.excerpt,
      body_html: h.body_html,
      cover_image_url: h.cover_image_url,
      category_slug: null,
      is_featured: true,
      is_published: true,
      published_at: new Date(baseDate.getTime() - i * 86400000).toISOString(),
    });
  });

  const categorySlugs = Object.keys(TURIZM_CATEGORY_INTRO).filter(
    (s) => s !== "hub",
  ) as TurizmCategorySlug[];

  for (const categorySlug of categorySlugs) {
    const cards = flatIntroCards(categorySlug);
    const label = CATEGORY_LABELS[categorySlug];

    cards.forEach((card, index) => {
      const slug = blogSlug(categorySlug, card.title);
      const excerpt = card.description;
      const date = new Date(baseDate.getTime() - (posts.length + index) * 3600000);

      posts.push({
        slug,
        title: card.title,
        meta_title: `${card.title} | ${label} | Yekpare Seyahat`,
        meta_description: `${card.description} — Yekpare Seyahat ${label} rehberi.`,
        excerpt,
        body_html: buildBodyHtml(categorySlug, card.title, card.description, card),
        cover_image_url: card.image,
        category_slug: categorySlug,
        is_featured: index < 4,
        is_published: true,
        published_at: date.toISOString(),
      });
    });
  }

  return posts;
}

export { TURIZM_BLOG_CATEGORY_DISPLAY, turizmBlogCategoryLabel } from "./turizmCmsTypes";
