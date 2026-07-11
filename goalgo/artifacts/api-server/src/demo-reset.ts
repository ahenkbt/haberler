import {
  db,
  categoriesTable,
  authorsTable,
  newsTable,
  rssCampaignsTable,
  videoSourcesTable,
  homepageModulesTable,
  adSlotsTable,
  siteSettingsTable,
  photoGalleriesTable,
  photoGalleryItemsTable,
  videoGalleriesTable,
  videoGalleryItemsTable,
  resmiIlanlarTable,
  productsTable,
  productCategoriesTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[ıİ]/g, "i")
    .replace(/[şŞ]/g, "s")
    .replace(/[çÇ]/g, "c")
    .replace(/[öÖ]/g, "o")
    .replace(/[üÜ]/g, "u")
    .replace(/[ğĞ]/g, "g")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const PICSUM = (id: number, w = 800, h = 500) =>
  `https://picsum.photos/id/${id}/${w}/${h}`;

async function truncateAll() {
  await db.execute(sql`TRUNCATE TABLE
    resmi_ilanlar,
    video_gallery_items, video_galleries,
    photo_gallery_items, photo_galleries,
    ad_slots, homepage_modules,
    video_sources, rss_logs, rss_campaigns,
    news, authors, categories,
    site_settings,
    products, product_categories
    RESTART IDENTITY CASCADE`);
  console.log("Truncated all tables.");
}

async function main() {
  console.log("Demo reset başlıyor…");
  await truncateAll();

  // ── Kategoriler ───────────────────────────────────────────
  const catDefs = [
    { name: "Gündem", slug: "gundem", color: "#CC0000" },
    { name: "Politika", slug: "politika", color: "#1E40AF" },
    { name: "Ekonomi", slug: "ekonomi", color: "#047857" },
    { name: "Spor", slug: "spor", color: "#B45309" },
    { name: "Magazin", slug: "magazin", color: "#BE185D" },
    { name: "Teknoloji", slug: "teknoloji", color: "#7C3AED" },
    { name: "Sağlık", slug: "saglik", color: "#0EA5E9" },
    { name: "Dünya", slug: "dunya", color: "#475569" },
    { name: "Kültür-Sanat", slug: "kultur-sanat", color: "#9333EA" },
    { name: "Yaşam", slug: "yasam", color: "#EA580C" },
  ];
  const cats = await db.insert(categoriesTable).values(catDefs).returning();
  const C = Object.fromEntries(cats.map((c) => [c.slug, c]));

  // ── Yazarlar ──────────────────────────────────────────────
  const authorDefs = [
    { name: "Mehmet Yılmaz", title: "Genel Yayın Yönetmeni", bio: "20 yıllık gazetecilik tecrübesiyle Türkiye'nin önde gelen yayın yönetmenlerinden.", imageUrl: PICSUM(1005, 200, 200) },
    { name: "Ayşe Demir", title: "Politika Editörü", bio: "Ankara siyaset kulisini 15 yıldır yakından takip eden deneyimli gazeteci.", imageUrl: PICSUM(1011, 200, 200) },
    { name: "Selim Korkmaz", title: "Ekonomi Editörü", bio: "İstanbul Borsası başta olmak üzere finans gündemini an be an aktarıyor.", imageUrl: PICSUM(1012, 200, 200) },
    { name: "Zeynep Aydın", title: "Spor Yazarı", bio: "Türk futbolunun 4 büyüğünü ve milli takımı yakından takip eden spor gazetecisi.", imageUrl: PICSUM(1027, 200, 200) },
    { name: "Burak Şahin", title: "Teknoloji Editörü", bio: "Silikon Vadisi'nde 3 yıl görev yapmış, teknoloji dünyasının nabzını tutan editör.", imageUrl: PICSUM(1006, 200, 200) },
    { name: "Elif Kaya", title: "Magazin Editörü", bio: "Türkiye'nin tanınan yüzlerini ve magazin dünyasını anlatan editör.", imageUrl: PICSUM(1025, 200, 200) },
    { name: "Hasan Öztürk", title: "Dünya Haberleri Editörü", bio: "Londra ve Brüksel'de muhabirlik yapmış uluslararası haber uzmanı.", imageUrl: PICSUM(1013, 200, 200) },
    { name: "Fatma Çelik", title: "Yaşam & Sağlık Editörü", bio: "Sağlık, beslenme ve yaşam kalitesi üzerine araştırmacı gazetecilik yapıyor.", imageUrl: PICSUM(1014, 200, 200) },
  ];
  const authors = await db.insert(authorsTable).values(authorDefs).returning();
  const A = authors;

  // ── Haberler ──────────────────────────────────────────────
  const body = (spot: string) =>
    `<p>${spot}</p>` +
    `<p>Konuya ilişkin yetkililer açıklamalarını sürdürürken kamuoyunun gündemi de bu gelişmeyle şekilleniyor. ` +
    `Uzmanlar, durumun kısa vadede nasıl bir seyir izleyeceğine dair görüşlerini paylaştı.</p>` +
    `<p>Haberin arka planına bakıldığında, sürecin uzun süredir gündemin yakın takibinde olduğu görülüyor. ` +
    `Detaylı gelişmeler için sayfamızı takip etmeye devam edebilirsiniz.</p>` +
    `<p><strong>Son dakika:</strong> Gelişmeler an be an güncellenmektedir.</p>`;

  type NewsSeed = {
    title: string; spot: string; catSlug: string; authorIdx: number;
    isFeatured?: boolean; isBreaking?: boolean; img?: number; tags?: string[];
    daysAgo?: number;
  };

  const newsList: NewsSeed[] = [
    // ── Featured manşetler (10) ──
    { title: "Cumhurbaşkanı kabinede kapsamlı revizyon sinyali verdi", spot: "Yeni dönem için kapsamlı bakanlar kurulu değişikliğinin yolda olduğu öğrenildi. Detaylar haberimizde.", catSlug: "politika", authorIdx: 1, isFeatured: true, img: 1059, tags: ["kabine", "siyaset"] },
    { title: "Dolar kurunda hafta başı sürprizi: Tarihi rekor kırıldı", spot: "Piyasalar haftaya beklenmedik bir rekor seviyesiyle başladı. Uzmanlar değerlendiriyor.", catSlug: "ekonomi", authorIdx: 2, isFeatured: true, isBreaking: true, img: 1058, tags: ["dolar", "piyasa"] },
    { title: "Galatasaray derbide rakibini 3-0 geçti", spot: "Aslan, ezeli rakibini deplasmanda 3-0'lık üstün skorla mağlup etti, liderliğini pekiştirdi.", catSlug: "spor", authorIdx: 3, isFeatured: true, img: 1043, tags: ["galatasaray", "derbi", "futbol"] },
    { title: "Yapay zekâda Türk imzası: Yerli modelin lansmanı yapıldı", spot: "Türkiye merkezli ekibin geliştirdiği büyük dil modeli kamuoyuna tanıtıldı, dünya gündemine girdi.", catSlug: "teknoloji", authorIdx: 4, isFeatured: true, img: 1069, tags: ["yapay zeka", "yerli teknoloji"] },
    { title: "Karadeniz'de rekor büyüklükte doğalgaz keşfi", spot: "TPAO'nun açıkladığı yeni rezerv, enerji bağımsızlığı yolunda kritik bir adım olarak değerlendiriliyor.", catSlug: "ekonomi", authorIdx: 2, isFeatured: true, img: 1036, tags: ["enerji", "doğalgaz"] },
    { title: "İstanbul'da 7.1 büyüklüğünde deprem!", spot: "Gece saatlerinde İstanbul açıklarında meydana gelen deprem büyük paniğe yol açtı.", catSlug: "gundem", authorIdx: 0, isFeatured: true, isBreaking: true, img: 1076, tags: ["deprem", "istanbul"] },
    { title: "Milli takım Dünya Kupası finallerinde!", spot: "A Milli Futbol Takımı play-off'larda rakibini geçerek tarihi bir başarıya imza attı.", catSlug: "spor", authorIdx: 3, isFeatured: true, img: 1042, tags: ["milli takım", "dünya kupası"] },
    { title: "Dijital lira projesi hayata geçiyor", spot: "Merkez Bankası dijital para biriminin pilot uygulamasını başlattığını resmen duyurdu.", catSlug: "ekonomi", authorIdx: 2, isFeatured: true, img: 1050, tags: ["dijital lira", "CBDC"] },
    { title: "AB Türkiye için kapsamlı üyelik paketi hazırladı", spot: "Brüksel'den gelen resmi açıklamaya göre üyelik müzakereleri yeni bir ivme kazanıyor.", catSlug: "dunya", authorIdx: 6, isFeatured: true, img: 1053, tags: ["AB", "Türkiye", "üyelik"] },
    { title: "Fenerbahçe Şampiyonlar Ligi'nde tarih yazdı", spot: "Sarı-lacivertliler gruplarda üst üste üçüncü galibiyetlerini alarak adından söz ettirdi.", catSlug: "spor", authorIdx: 3, isFeatured: true, img: 1039, tags: ["fenerbahçe", "şampiyonlar ligi"] },

    // ── Son dakika haberleri ──
    { title: "Meteoroloji kırmızı alarm verdi: 48 saate dikkat!", spot: "Marmara ve Ege kıyıları için fırtına ve sağanak uyarısı yapıldı.", catSlug: "gundem", authorIdx: 0, isBreaking: true, img: 1043, tags: ["hava durumu", "uyarı"], daysAgo: 0 },
    { title: "Mahkemeden flaş karar: Tartışmalı düzenleme iptal edildi", spot: "Anayasa Mahkemesi uzun süredir tartışılan düzenleme için nihai kararını açıkladı.", catSlug: "politika", authorIdx: 1, isBreaking: true, img: 1047, tags: ["mahkeme", "anayasa"], daysAgo: 0 },
    { title: "Borsada devre kesici devreye girdi", spot: "İMKB'de sert düşüş üzerine otomatik devre kesici mekanizması tetiklendi.", catSlug: "ekonomi", authorIdx: 2, isBreaking: true, img: 1048, tags: ["borsa", "imkb"], daysAgo: 1 },

    // ── Politika ──
    { title: "Seçim takvimi Meclis'te netleşiyor", spot: "TBMM'de süren görüşmelerde 2025 seçimlerine ilişkin kritik kararlar alınabilir.", catSlug: "politika", authorIdx: 1, img: 1026, tags: ["seçim", "meclis"], daysAgo: 1 },
    { title: "Anayasa değişiklik paketi oylamaya sunuldu", spot: "Uzun süredir hazırlığı yapılan paket bugün TBMM'de oylamaya sunuldu.", catSlug: "politika", authorIdx: 1, img: 1028, tags: ["anayasa", "meclis"], daysAgo: 2 },
    { title: "Muhalefet liderlerinden ortak açıklama", spot: "CHP, İYİP ve diğer muhalefet partilerinin liderlerinden ortak basın açıklaması geldi.", catSlug: "politika", authorIdx: 1, img: 1029, tags: ["muhalefet", "siyaset"], daysAgo: 3 },

    // ── Ekonomi ──
    { title: "Yeni sanayi bölgeleri kurulacak: 50 bin istihdam hedefi", spot: "Sanayi ve Teknoloji Bakanlığı 2026 yatırım teşvik paketini açıkladı.", catSlug: "ekonomi", authorIdx: 2, img: 1031, tags: ["sanayi", "istihdam"], daysAgo: 2 },
    { title: "Enflasyon rakamları açıklandı: Beklentinin altında geldi", spot: "TÜİK'in açıkladığı aylık enflasyon verileri ekonomistleri şaşırttı.", catSlug: "ekonomi", authorIdx: 2, img: 1032, tags: ["enflasyon", "TÜİK"], daysAgo: 3 },
    { title: "Bankacılık sektörüne yeni kredi düzenlemesi", spot: "BDDK'nın yayımladığı yönetmelikle konut kredilerinde önemli değişiklikler geliyor.", catSlug: "ekonomi", authorIdx: 2, img: 1016, tags: ["bankacılık", "kredi"], daysAgo: 4 },
    { title: "Elektrikli araç teşviki yeniden gündemde", spot: "Hazine'nin hazırladığı teşvik paketi elektrikli araçlarda vergi indirimini kapsıyor.", catSlug: "ekonomi", authorIdx: 2, img: 1015, tags: ["elektrikli araç", "teşvik"], daysAgo: 5 },

    // ── Spor ──
    { title: "Beşiktaş transfer bombasını patlattı", spot: "Kartal, Avrupa'nın gözdesi olan orta saha oyuncusunu kadrosuna kattığını duyurdu.", catSlug: "spor", authorIdx: 3, img: 1040, tags: ["beşiktaş", "transfer"], daysAgo: 1 },
    { title: "Türkiye Olimpiyat kotası aldı: Atletizmde tarih", spot: "Milli sporcu dünya şampiyonasında sergilediği performansla olimpiyat kotası elde etti.", catSlug: "spor", authorIdx: 3, img: 1041, tags: ["olimpiyat", "atletizm"], daysAgo: 2 },
    { title: "Trabzonspor ikinci yarıya hazır", spot: "Bordo-mavili ekip, devre arasında yaptığı transferlerle güç kazandı.", catSlug: "spor", authorIdx: 3, img: 1035, tags: ["trabzonspor", "transfer"], daysAgo: 4 },
    { title: "Millî voleybol takımı Avrupa ikincisi!", spot: "Kadın voleybol millî takımı Avrupa Şampiyonası finalinde gümüş madalya kazandı.", catSlug: "spor", authorIdx: 3, img: 1037, tags: ["voleybol", "milli takım"], daysAgo: 6 },

    // ── Teknoloji ──
    { title: "Türkiye'nin yerli çipi üretime girdi", spot: "ASELSAN öncülüğünde geliştirilen yerli mikroişlemci seri üretime geçiş için hazır.", catSlug: "teknoloji", authorIdx: 4, img: 1061, tags: ["yerli çip", "ASELSAN"], daysAgo: 2 },
    { title: "5G altyapısı 81 ile ulaştı", spot: "Türk Telekom ve Turkcell'in ortak projesiyle 5G ağı ülke genelinde yaygınlaştı.", catSlug: "teknoloji", authorIdx: 4, img: 1062, tags: ["5G", "telekom"], daysAgo: 3 },
    { title: "Yerli elektrikli otomobil TOGG yeni model tanıttı", spot: "TOGG'un yeni SUV modeli İstanbul Otomobil Fuarı'nda kamuoyuyla buluştu.", catSlug: "teknoloji", authorIdx: 4, img: 1063, tags: ["TOGG", "elektrikli araç"], daysAgo: 5 },
    { title: "Siber güvenlikte yeni merkez kuruldu", spot: "Cumhurbaşkanlığı Dijital Dönüşüm Ofisi siber güvenlik operasyon merkezini hizmete açtı.", catSlug: "teknoloji", authorIdx: 4, img: 1064, tags: ["siber güvenlik"], daysAgo: 7 },

    // ── Sağlık ──
    { title: "Kanser aşısı araştırmaları umut veriyor", spot: "Yerli biyoteknoloji firmasının geliştirdiği mRNA aşısı klinik denemelere girdi.", catSlug: "saglik", authorIdx: 7, img: 1065, tags: ["kanser", "aşı", "biyoteknoloji"], daysAgo: 1 },
    { title: "Şeker hastalığında yeni ilaç onaylandı", spot: "Tip 2 diyabette son derece etkili olduğu kanıtlanan yeni ilaç Türkiye'de kullanıma girdi.", catSlug: "saglik", authorIdx: 7, img: 1066, tags: ["diyabet", "ilaç"], daysAgo: 4 },
    { title: "Obezite ile mücadelede ulusal plan açıklandı", spot: "Sağlık Bakanlığı 2030 hedeflerini kapsayan kapsamlı obezite eylem planını duyurdu.", catSlug: "saglik", authorIdx: 7, img: 1067, tags: ["obezite", "sağlık"], daysAgo: 6 },

    // ── Dünya ──
    { title: "Ukrayna ateşkes müzakereleri yeniden başladı", spot: "Uluslararası arabulucuların çabalarıyla masaya oturan taraflar kritik görüşmeler yapıyor.", catSlug: "dunya", authorIdx: 6, img: 1070, tags: ["ukrayna", "ateşkes"], daysAgo: 1 },
    { title: "BM iklim zirvesi tarihi kararla kapandı", spot: "New York'taki iklim zirvesinde 150 ülke fosil yakıttan dönüşümü hızlandırma kararı aldı.", catSlug: "dunya", authorIdx: 6, img: 1071, tags: ["iklim", "BM"], daysAgo: 3 },
    { title: "Çin-ABD ticaret gerilimi tırmanıyor", spot: "Washington'ın yeni gümrük tarifeleri Pekin'den sert tepki gördü, yeni kriz kapıda.", catSlug: "dunya", authorIdx: 6, img: 1072, tags: ["Çin", "ABD", "ticaret"], daysAgo: 5 },

    // ── Magazin ──
    { title: "Ünlü oyuncudan sürpriz evlilik haberi", spot: "Türkiye'nin en çok izlenen dizisinin başrol oyuncusu sessiz sedasız evlendi.", catSlug: "magazin", authorIdx: 5, img: 1074, tags: ["magazin", "evlilik"], daysAgo: 1 },
    { title: "Dünyaca ünlü müzisyen İstanbul'da sahne alacak", spot: "Grammy ödüllü sanatçı Türkiye turnesini İstanbul konseriyle açıyor.", catSlug: "magazin", authorIdx: 5, img: 1075, tags: ["konser", "müzik"], daysAgo: 3 },
    { title: "Yerli film Oscar yolunda: Kısa listeye girdi", spot: "Türk sinemasının gururu olan yapım, Akademi'nin ön seçimlerinde yer aldı.", catSlug: "magazin", authorIdx: 5, img: 1056, tags: ["sinema", "oscar"], daysAgo: 5 },

    // ── Kültür-Sanat ──
    { title: "İstanbul Kültür Festivali rekor katılımla kapandı", spot: "12 gün süren etkinliğe 2 milyonun üzerinde ziyaretçi katıldı.", catSlug: "kultur-sanat", authorIdx: 0, img: 1073, tags: ["festival", "istanbul", "kültür"], daysAgo: 2 },
    { title: "Türk ressamın eseri rekor fiyata satıldı", spot: "Christie's müzayedesinde Türk ressamın tablosu 3 milyon dolara alıcı buldu.", catSlug: "kultur-sanat", authorIdx: 0, img: 1057, tags: ["resim", "müzayede"], daysAgo: 4 },

    // ── Yaşam ──
    { title: "Sağlıklı beslenme trendleri: 2026'nın gözdesi ne?", spot: "Dünya genelinde yükselen fermente gıda trendi Türkiye'de de ilgi görüyor.", catSlug: "yasam", authorIdx: 7, img: 1080, tags: ["beslenme", "sağlık"], daysAgo: 2 },
    { title: "Şehirde çiftçilik: Balkon tarımı büyüyor", spot: "Pandemiyle başlayan balkon bahçeciliği hareketi köklü bir yaşam tarzına dönüştü.", catSlug: "yasam", authorIdx: 7, img: 1081, tags: ["yaşam", "tarım"], daysAgo: 4 },
    { title: "Bayram tatili 9 güne uzıyor", spot: "Hükümetin açıkladığı tatil düzenlemesine göre bu yılki bayram 9 gün sürecek.", catSlug: "gundem", authorIdx: 0, img: 1082, tags: ["tatil", "bayram"], daysAgo: 1 },
  ];

  const now = new Date();
  for (const [i, n] of newsList.entries()) {
    const cat = C[n.catSlug];
    const ago = n.daysAgo ?? Math.floor(i * 0.3);
    const createdAt = new Date(now.getTime() - ago * 86400000 - i * 300000);
    await db.insert(newsTable).values({
      title: n.title,
      slug: slugify(n.title) + "-" + (1000 + i),
      spot: n.spot,
      content: body(n.spot),
      imageUrl: n.img ? PICSUM(n.img) : null,
      categoryId: cat?.id ?? null,
      authorId: A[n.authorIdx]?.id ?? null,
      status: "published",
      isFeatured: n.isFeatured ?? false,
      isBreaking: n.isBreaking ?? false,
      views: Math.floor(Math.random() * 15000) + 500,
      tags: n.tags ?? [],
      createdAt,
      updatedAt: createdAt,
    });
  }

  // ── Foto Galeriler ─────────────────────────────────────────
  const [fg1] = await db.insert(photoGalleriesTable).values({
    title: "İstanbul Fotoğraf Sanatı Sergisi 2026",
    description: "Türk fotoğrafçıların gözünden eşsiz İstanbul kareleri.",
    coverImage: PICSUM(1080, 800, 500),
    status: "active",
  }).returning();

  await db.insert(photoGalleryItemsTable).values([
    { galleryId: fg1.id, imageUrl: PICSUM(1080), caption: "Boğaz'da gün batımı", sortOrder: 1 },
    { galleryId: fg1.id, imageUrl: PICSUM(1019), caption: "Tarihi yarımada silueti", sortOrder: 2 },
    { galleryId: fg1.id, imageUrl: PICSUM(1018), caption: "Kapalıçarşı'da ışık oyunları", sortOrder: 3 },
    { galleryId: fg1.id, imageUrl: PICSUM(1074), caption: "Galata Kulesi gece", sortOrder: 4 },
    { galleryId: fg1.id, imageUrl: PICSUM(1053), caption: "Boğaz köprüsü", sortOrder: 5 },
    { galleryId: fg1.id, imageUrl: PICSUM(1073), caption: "Balıkçı tekneleri", sortOrder: 6 },
  ]);

  const [fg2] = await db.insert(photoGalleriesTable).values({
    title: "Teknoloji Fuarı 2026 — En İyi Kareler",
    description: "Bu yılki teknoloji fuarının unutulmaz anları.",
    coverImage: PICSUM(1069, 800, 500),
    status: "active",
  }).returning();

  await db.insert(photoGalleryItemsTable).values([
    { galleryId: fg2.id, imageUrl: PICSUM(1069), caption: "Yerli yapay zekâ lansmanı", sortOrder: 1 },
    { galleryId: fg2.id, imageUrl: PICSUM(1062), caption: "5G demo standı", sortOrder: 2 },
    { galleryId: fg2.id, imageUrl: PICSUM(1063), caption: "TOGG yeni model", sortOrder: 3 },
    { galleryId: fg2.id, imageUrl: PICSUM(1064), caption: "Robot teknolojileri standı", sortOrder: 4 },
    { galleryId: fg2.id, imageUrl: PICSUM(1065), caption: "Biyoteknoloji köşesi", sortOrder: 5 },
  ]);

  const [fg3] = await db.insert(photoGalleriesTable).values({
    title: "Spor Şöleni: Galatasaray Şampiyonluk Kutlaması",
    description: "Süper Lig şampiyonluğunun coşkusu objektife yansıdı.",
    coverImage: PICSUM(1043, 800, 500),
    status: "active",
  }).returning();

  await db.insert(photoGalleryItemsTable).values([
    { galleryId: fg3.id, imageUrl: PICSUM(1043), caption: "Kupa kaldırma töreni", sortOrder: 1 },
    { galleryId: fg3.id, imageUrl: PICSUM(1042), caption: "Taraftarlarla buluşma", sortOrder: 2 },
    { galleryId: fg3.id, imageUrl: PICSUM(1041), caption: "Mücadele anları", sortOrder: 3 },
    { galleryId: fg3.id, imageUrl: PICSUM(1040), caption: "Soyunma odası kutlaması", sortOrder: 4 },
  ]);

  // ── Video Galeriler ────────────────────────────────────────
  const [vg1] = await db.insert(videoGalleriesTable).values({
    title: "Haftanın Spor Özetleri",
    description: "Bu haftanın en dikkat çekici spor anları.",
    coverImage: PICSUM(1043, 800, 500),
    status: "active",
  }).returning();

  await db.insert(videoGalleryItemsTable).values([
    { galleryId: vg1.id, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", thumbnailUrl: PICSUM(1043), title: "Galatasaray 3-0 Özeti", sortOrder: 1 },
    { galleryId: vg1.id, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", thumbnailUrl: PICSUM(1042), title: "Fenerbahçe Avrupa Özeti", sortOrder: 2 },
    { galleryId: vg1.id, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", thumbnailUrl: PICSUM(1041), title: "Milli Takım Gol Anları", sortOrder: 3 },
  ]);

  const [vg2] = await db.insert(videoGalleriesTable).values({
    title: "Ekonomi Haberleri Videoları",
    description: "Piyasaları etkileyen gelişmelerin video analizi.",
    coverImage: PICSUM(1058, 800, 500),
    status: "active",
  }).returning();

  await db.insert(videoGalleryItemsTable).values([
    { galleryId: vg2.id, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", thumbnailUrl: PICSUM(1058), title: "Dolar Analizi: Uzman Yorumu", sortOrder: 1 },
    { galleryId: vg2.id, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", thumbnailUrl: PICSUM(1050), title: "Dijital Lira Nedir?", sortOrder: 2 },
  ]);

  // ── Resmi İlanlar ─────────────────────────────────────────
  await db.insert(resmiIlanlarTable).values([
    { title: "Kırşehir Belediyesi — Park ve Bahçeler Bakım İhalesi 2026", content: "Belediyemize ait parklar ve yeşil alanların bakım, temizlik ve sulama hizmetleri 3 yıllık ihaleye çıkarılmıştır. Teklifler 30 Mayıs 2026 tarihine kadar kabul edilecektir.", institution: "Kırşehir Belediyesi", deadline: "2026-05-30", imageUrl: PICSUM(1026, 400, 300), pdfUrl: "", status: "active" },
    { title: "Kırşehir İl Milli Eğitim Müdürlüğü — Öğretmen Ataması Duyurusu", content: "İl genelinde açık olan öğretmen kadrolarına atama başvuruları 15 Haziran 2026 tarihine kadar alınacaktır.", institution: "Kırşehir İl Milli Eğitim Müdürlüğü", deadline: "2026-06-15", imageUrl: PICSUM(1028, 400, 300), pdfUrl: "", status: "active" },
    { title: "Kırşehir Devlet Hastanesi — Tıbbi Malzeme Alım İhalesi", content: "Hastanemiz bünyesinde kullanılmak üzere tıbbi sarf malzemeleri alımı kapalı teklif usulüyle ihaleye çıkarılmıştır.", institution: "Kırşehir Devlet Hastanesi", deadline: "2026-05-20", imageUrl: PICSUM(1065, 400, 300), pdfUrl: "", status: "active" },
    { title: "OSB Yönetimi — Arsa Tahsis İlanı 2026", content: "Organize Sanayi Bölgesi'nde yatırımcılara tahsis edilmek üzere 8 adet sanayi arsası için başvuru alınmaktadır.", institution: "Kırşehir OSB Müdürlüğü", deadline: "2026-06-01", imageUrl: PICSUM(1031, 400, 300), pdfUrl: "", status: "active" },
    { title: "Karayolları 72. Şube Müdürlüğü — Yol Yapım İhalesi", content: "İl genelindeki belirli güzergâhlarda asfalt kaplama ve onarım çalışmaları için ihale açılmıştır.", institution: "Karayolları 72. Şube Müdürlüğü", deadline: "2026-05-25", imageUrl: PICSUM(1081, 400, 300), pdfUrl: "", status: "active" },
  ]);

  // ── RSS Kampanyaları ───────────────────────────────────────
  await db.insert(rssCampaignsTable).values([
    { name: "NTV — Gündem & Son Dakika", active: true, postType: "news", categorySlug: "gundem", tags: ["ntv", "rss"], feeds: ["https://www.ntv.com.tr/son-dakika.rss", "https://www.ntv.com.tr/gundem.rss"], sourceType: "rss", intervalMinutes: 30, headline: true, addedCount: 47, lastRunAt: new Date(Date.now() - 28 * 60 * 1000), includeYekpareHaber: true },
    { name: "Sabah — Ekonomi", active: true, postType: "news", categorySlug: "ekonomi", tags: ["sabah", "ekonomi"], feeds: ["https://www.sabah.com.tr/rss/ekonomi.xml"], sourceType: "rss", intervalMinutes: 60, addedCount: 33, lastRunAt: new Date(Date.now() - 55 * 60 * 1000), includeYekpareHaber: true },
    { name: "BBC Türkçe — Dünya", active: false, postType: "news", categorySlug: "dunya", tags: ["bbc", "dünya"], feeds: ["https://feeds.bbci.co.uk/turkce/rss.xml"], sourceType: "rss", intervalMinutes: 120, translateEnabled: true, sourceLang: "tr", targetLang: "tr", translateEngine: "google", addedCount: 18, includeYekpareHaber: true },
    { name: "Hürriyet — Spor", active: true, postType: "news", categorySlug: "spor", tags: ["hürriyet", "spor"], feeds: ["https://www.hurriyet.com.tr/rss/spor"], sourceType: "rss", intervalMinutes: 45, addedCount: 29, lastRunAt: new Date(Date.now() - 42 * 60 * 1000), includeYekpareHaber: true },
    { name: "CNN Türk — Teknoloji", active: true, postType: "news", categorySlug: "teknoloji", tags: ["cnnturk", "teknoloji"], feeds: ["https://www.cnnturk.com/feed/rss/teknoloji/news"], sourceType: "rss", intervalMinutes: 90, addedCount: 15, lastRunAt: new Date(Date.now() - 85 * 60 * 1000), includeYekpareHaber: true },
    { name: "TRT Haber — Sağlık", active: false, postType: "news", categorySlug: "saglik", tags: ["trt", "sağlık"], feeds: ["https://www.trthaber.com/sondakika.rss"], sourceType: "rss", intervalMinutes: 180, addedCount: 8, includeYekpareHaber: true },
  ]);

  // ── Video Kaynakları ──────────────────────────────────────
  await db.insert(videoSourcesTable).values([
    { name: "NTV", platform: "youtube", sourceType: "channel", channelId: "UCqgnDFnbn-W19w63ezxxNGQ", categorySlug: "haberler", active: true, isLive: true, videoCount: 0 },
    { name: "TRT Haber", platform: "youtube", sourceType: "channel", channelId: "UCQ65pl4SZWyMc05f6_pVP_g", categorySlug: "haberler", active: true, videoCount: 0 },
    { name: "CNN Türk", platform: "youtube", sourceType: "channel", channelId: "UCFJwRuWTaKP1FUpDXTTOVBQ", categorySlug: "haberler", active: true, isLive: true, videoCount: 0 },
    { name: "A Spor", platform: "youtube", sourceType: "channel", channelId: "UCFSJpBVXsVCq6N69_mvXnZA", categorySlug: "spor", active: true, videoCount: 0 },
    { name: "Evrim Ağacı", platform: "youtube", sourceType: "channel", channelId: "UC4Kk8BvOzQe0hFwEBlzDFQQ", categorySlug: "bilim", active: true, videoCount: 0 },
    { name: "Habertürk", platform: "youtube", sourceType: "channel", channelId: "UCbn8RZhFBLcxe7ELYFGDqeQ", categorySlug: "haberler", active: false, videoCount: 0 },
  ]);

  // ── Anasayfa Modülleri ────────────────────────────────────
  const modules = [
    { key: "son_haberler_bandi", name: "Son Haberler Bandı", description: "Kırmızı son dakika bandı", accentColor: "#DC2626" },
    { key: "finans_bandi", name: "Finans Bandı", description: "Döviz, altın, borsa kayan bandı", accentColor: "#0EA5E9" },
    { key: "manset_slider", name: "Manşet Slider", description: "Büyük 10'lu manşet slider", accentColor: "#CC0000" },
    { key: "ikon_bant", name: "İkon Bant", description: "Kategori hızlı erişim bandı", accentColor: "#7C3AED" },
    { key: "kategori_bloklari", name: "Kategori Blokları", description: "Kategorilere göre haber blokları", accentColor: "#047857" },
    { key: "kose_yazarlari", name: "Köşe Yazarları", description: "Yazar kartları bölümü", accentColor: "#B45309" },
    { key: "video_tv", name: "Video TV", description: "YouTube video şeridi", accentColor: "#BE185D" },
    { key: "reklam_bloku", name: "Reklam Bloğu", description: "Anasayfa banner reklam alanı", accentColor: "#EA580C" },
  ];
  await db.insert(homepageModulesTable).values(
    modules.map((m, i) => ({ ...m, enabled: true, position: i + 1 }))
  );

  // ── Reklam Slotları ───────────────────────────────────────
  await db.insert(adSlotsTable).values([
    { slotKey: "header_top",     name: "Header Üst Banner",   description: "728x90 leaderboard",   html: "", enabled: false },
    { slotKey: "header_bottom",  name: "Header Alt Banner",   description: "Menü altı yatay alan", html: "", enabled: false },
    { slotKey: "home_middle",    name: "Anasayfa Orta",       description: "Modüller arası alan",  html: "", enabled: false },
    { slotKey: "sidebar_top",    name: "Yan Kolon Üst",       description: "300x250 rectangle",    html: "", enabled: false },
    { slotKey: "article_inline", name: "Makale İçi Reklam",   description: "Yazı arasına yerleşir",html: "", enabled: false },
    { slotKey: "footer",         name: "Footer Banner",       description: "Site sonu banner",     html: "", enabled: false },
    { slotKey: "skyscraper_left",name: "Skyscraper Sol",      description: "160x600 dikey alan",   html: "", enabled: false },
    { slotKey: "skyscraper_right",name:"Skyscraper Sağ",      description: "160x600 dikey alan",   html: "", enabled: false },
    { slotKey: "manset_alti",    name: "Manşet Altı",         description: "Slider hemen altı",    html: "", enabled: false },
    { slotKey: "haber_ici_ust",  name: "Haber İçi Üst",      description: "Detay sayfası başlık altı", html: "", enabled: false },
    { slotKey: "siparis_empty",  name: "Sipariş — Boş liste (maskot)", description: "İşletme yokken maskot/banner HTML", html: "", enabled: false },
  ]);

  // ── Site Ayarları ─────────────────────────────────────────
  await db.insert(siteSettingsTable).values({
    siteName: "Yekpare",
    tagline: "Kırşehir'in Haber Sesi",
    address: "Kırşehir, Türkiye",
    phone: "+90 386 000 00 00",
    email: "yekparenet@gmail.com",
    facebook: "https://facebook.com/yekpare",
    twitter: "https://x.com/yekpare",
    instagram: "https://instagram.com/yekpare",
    youtube: "https://youtube.com/@yekpare",
    logoText1: "Yek",
    logoText2: "pare",
    footerText: "Yekpare haber ve süper uygulama portalı.",
    copyrightText: "© Yekpare. Tüm hakları saklıdır.",
  });

  // ── E-Ticaret Kategorileri & Ürünler ─────────────────────
  const [cat_kitap, cat_dijital, cat_giyim] = await db.insert(productCategoriesTable).values([
    { name: "Kitap & Dergi", slug: "kitap-dergi" },
    { name: "Dijital İçerik", slug: "dijital-icerik" },
    { name: "Giyim & Aksesuar", slug: "giyim-aksesuar" },
  ]).returning();

  await db.insert(productsTable).values([
    { name: "Yekpare Yıllık Dijital Abonelik", slug: "yekpare-yillik-dijital-abonelik", description: "Sınırsız haber erişimi, reklamsız deneyim, özel bültenler.", price: "149900", stock: 9999, imageUrl: PICSUM(1064, 400, 300), categoryId: cat_dijital.id, active: true },
    { name: "Yekpare 6 Aylık Abonelik", slug: "yekpare-6-aylik-abonelik", description: "6 aylık dijital içerik paketi.", price: "89900", stock: 9999, imageUrl: PICSUM(1065, 400, 300), categoryId: cat_dijital.id, active: true },
    { name: "Türkiye Analizi 2026 Özel Rapor", slug: "turkiye-analizi-2026-ozel-rapor", description: "Editörlerimizin hazırladığı kapsamlı yıllık analiz raporu (PDF, 120 sayfa).", price: "29900", stock: 999, imageUrl: PICSUM(1058, 400, 300), categoryId: cat_kitap.id, active: true },
    { name: "Yekpare Logolu Kupa", slug: "yekpare-logolu-kupa", description: "Seramik, %100 gıda güvenli, kutulu.", price: "19900", stock: 150, imageUrl: PICSUM(1080, 400, 300), categoryId: cat_giyim.id, active: true },
    { name: "Yekpare T-Shirt Unisex", slug: "yekpare-t-shirt-unisex", description: "Organik pamuk, baskılı, S-XXL bedenler.", price: "24900", stock: 200, imageUrl: PICSUM(1081, 400, 300), categoryId: cat_giyim.id, active: true },
  ]);

  console.log("Demo reset tamamlandı!");
  console.log(`  • ${newsList.length} haber`);
  console.log("  • 10 kategori, 8 yazar");
  console.log("  • 3 foto galeri (toplam 15 fotoğraf)");
  console.log("  • 2 video galeri (toplam 5 video)");
  console.log("  • 10 seri ilan, 5 resmi ilan");
  console.log("  • 6 RSS kampanyası, 6 video kaynağı");
  console.log("  • 5 e-ticaret ürünü, 10 reklam slotu");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
