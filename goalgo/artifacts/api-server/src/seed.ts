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
} from "@workspace/db";

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

async function main() {
  console.log("Seeding Yekpare…");

  // Idempotency guard: skip if categories already populated.
  const existingCats = await db.select().from(categoriesTable);
  if (existingCats.length > 0) {
    console.log("Already seeded — skipping.");
    return;
  }

  const categories = [
    { name: "Gündem", slug: "gundem", color: "#CC0000" },
    { name: "Politika", slug: "politika", color: "#1E40AF" },
    { name: "Ekonomi", slug: "ekonomi", color: "#047857" },
    { name: "Spor", slug: "spor", color: "#B45309" },
    { name: "Magazin", slug: "magazin", color: "#BE185D" },
    { name: "Teknoloji", slug: "teknoloji", color: "#7C3AED" },
    { name: "Sağlık", slug: "saglik", color: "#0EA5E9" },
    { name: "Dünya", slug: "dunya", color: "#475569" },
    { name: "Global", slug: "global", color: "#0ea5e9" },
    { name: "Kültür-Sanat", slug: "kultur-sanat", color: "#9333EA" },
    { name: "Yaşam", slug: "yasam", color: "#EA580C" },
  ];
  const insertedCats = await db
    .insert(categoriesTable)
    .values(categories)
    .returning();
  const catBySlug = new Map(insertedCats.map((c) => [c.slug, c]));

  const authors = [
    { name: "Mehmet Yılmaz", title: "Genel Yayın Yönetmeni" },
    { name: "Ayşe Demir", title: "Politika Editörü" },
    { name: "Selim Korkmaz", title: "Ekonomi Editörü" },
    { name: "Zeynep Aydın", title: "Spor Yazarı" },
    { name: "Burak Şahin", title: "Teknoloji Editörü" },
    { name: "Elif Kaya", title: "Magazin Editörü" },
  ];
  const insertedAuthors = await db
    .insert(authorsTable)
    .values(authors)
    .returning();

  const newsSeed: Array<{
    title: string;
    spot: string;
    categorySlug: string;
    authorIdx?: number;
    isFeatured?: boolean;
    isBreaking?: boolean;
    imageUrl?: string;
    tags?: string[];
  }> = [
    {
      title: "Cumhurbaşkanı kabinede revizyon sinyali verdi",
      spot: "Yeni dönem için kapsamlı değişikliklerin yolda olduğu açıklandı. Detaylar haberimizde.",
      categorySlug: "politika",
      authorIdx: 1,
      isFeatured: true,
      tags: ["kabine", "siyaset"],
    },
    {
      title: "Dolar kurunda hafta başı sürprizi: Yeni rekor",
      spot: "Piyasalar haftaya beklenmedik bir rekor seviyesiyle başladı. Uzmanlar değerlendiriyor.",
      categorySlug: "ekonomi",
      authorIdx: 2,
      isFeatured: true,
      isBreaking: true,
      tags: ["dolar", "piyasa"],
    },
    {
      title: "Galatasaray derbide farklı kazandı",
      spot: "Aslan, ezeli rakibini deplasmanda 3-0'lık skorla mağlup etti.",
      categorySlug: "spor",
      authorIdx: 3,
      isFeatured: true,
      tags: ["galatasaray", "derbi"],
    },
    {
      title: "Yapay zekâda Türk imzası: Yerli modelin lansmanı yapıldı",
      spot: "Türkiye merkezli ekibin geliştirdiği büyük dil modeli kamuoyuna tanıtıldı.",
      categorySlug: "teknoloji",
      authorIdx: 4,
      isFeatured: true,
      tags: ["yapay zeka", "yerli"],
    },
    {
      title: "Meteoroloji uyardı: Marmara için sağanak alarmı",
      spot: "Hafta ortasında etkili olacak yağışlara karşı dikkatli olunması istendi.",
      categorySlug: "gundem",
      authorIdx: 0,
      isBreaking: true,
      tags: ["hava durumu"],
    },
    {
      title: "Yeni sağlık reformu Meclis gündeminde",
      spot: "Aile hekimliği başta olmak üzere geniş kapsamlı değişiklikler içeren paket görüşülecek.",
      categorySlug: "saglik",
      authorIdx: 1,
      tags: ["sağlık", "reform"],
    },
    {
      title: "Ünlü oyuncudan büyük sürpriz: Sosyal medyayı salladı",
      spot: "Magazin gündemine damga vuran paylaşım, hayranlarını şaşırttı.",
      categorySlug: "magazin",
      authorIdx: 5,
      tags: ["magazin"],
    },
    {
      title: "Türk Lirası'nda toparlanma sinyalleri",
      spot: "Merkez Bankası kararı sonrası piyasada yumuşama yaşandı.",
      categorySlug: "ekonomi",
      authorIdx: 2,
      tags: ["TL", "ekonomi"],
    },
    {
      title: "AB Türkiye için yeni paket hazırlığında",
      spot: "Brüksel'den gelen sızıntılara göre üyelik müzakereleri yeniden ısınıyor.",
      categorySlug: "dunya",
      authorIdx: 1,
      tags: ["AB", "dünya"],
    },
    {
      title: "Fenerbahçe Avrupa'da gruplara kaldı",
      spot: "Sarı-lacivertli ekip, deplasmanda kazandığı maçla turladı.",
      categorySlug: "spor",
      authorIdx: 3,
      tags: ["fenerbahçe", "avrupa"],
    },
    {
      title: "Yeni iPhone modeli Türkiye'de satışa sundu",
      spot: "Apple'ın yeni amiral gemisi telefonu raflardaki yerini aldı.",
      categorySlug: "teknoloji",
      authorIdx: 4,
      tags: ["apple", "iphone"],
    },
    {
      title: "İstanbul'da kültür-sanat haftası başlıyor",
      spot: "Şehrin dört bir yanında ücretsiz etkinlikler düzenlenecek.",
      categorySlug: "kultur-sanat",
      authorIdx: 0,
      tags: ["istanbul", "festival"],
    },
    {
      title: "Bayram tatili kaç gün olacak? Resmi açıklama geldi",
      spot: "Hükümet kaynaklarından yapılan açıklama netlik kazandırdı.",
      categorySlug: "gundem",
      authorIdx: 0,
      tags: ["tatil"],
    },
    {
      title: "Yapay et üretiminde Türkiye atılım yapıyor",
      spot: "Ankara merkezli girişimin ürettiği örnek lansmanda tanıtıldı.",
      categorySlug: "yasam",
      authorIdx: 4,
      tags: ["yaşam"],
    },
    {
      title: "Mahkemeden flaş karar: İptal edildi",
      spot: "Anayasa Mahkemesi tartışmalı düzenleme için kararını açıkladı.",
      categorySlug: "politika",
      authorIdx: 1,
      isBreaking: true,
      tags: ["anayasa"],
    },
    {
      title: "Dijital bankacılıkta yeni dönem başlıyor",
      spot: "BDDK'nın yayımladığı yönetmelikle birlikte sektör yeniden şekilleniyor.",
      categorySlug: "ekonomi",
      authorIdx: 2,
      tags: ["bankacılık"],
    },
    {
      title: "Karadeniz'de büyük doğalgaz keşfi",
      spot: "TPAO'nun açıkladığı yeni rezerv enerji bağımsızlığı yolunda kritik adım.",
      categorySlug: "ekonomi",
      authorIdx: 2,
      tags: ["enerji"],
    },
    {
      title: "İstanbul depreminin yıldönümünde anma törenleri",
      spot: "Marmara depreminin yıldönümünde çeşitli etkinlikler düzenleniyor.",
      categorySlug: "gundem",
      authorIdx: 0,
      tags: ["deprem"],
    },
  ];

  for (const n of newsSeed) {
    const cat = catBySlug.get(n.categorySlug);
    await db.insert(newsTable).values({
      title: n.title,
      slug: slugify(n.title) + "-" + Math.floor(Math.random() * 9999),
      spot: n.spot,
      content:
        `<p>${n.spot}</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. ` +
        `Türkiye'nin gündemini belirleyen bu konuda detaylar netleşmeye devam ediyor. ` +
        `Yetkililer açıklama yaparken vatandaşlar gelişmeleri yakından takip ediyor.</p>` +
        `<p>Konuya ilişkin uzman görüşleri ve son dakika gelişmeleri için sayfamızı takip edebilirsiniz.</p>`,
      imageUrl: n.imageUrl ?? null,
      categoryId: cat?.id ?? null,
      authorId:
        n.authorIdx !== undefined
          ? insertedAuthors[n.authorIdx]?.id ?? null
          : null,
      status: "published",
      isFeatured: n.isFeatured ?? false,
      isBreaking: n.isBreaking ?? false,
      views: Math.floor(Math.random() * 5000),
      tags: n.tags ?? [],
    });
  }

  await db.insert(rssCampaignsTable).values([
    {
      name: "NTV Manşet",
      active: true,
      postType: "news",
      categorySlug: "gundem",
      tags: ["ntv", "rss"],
      feeds: ["https://www.ntv.com.tr/son-dakika.rss"],
      sourceType: "rss",
      intervalMinutes: 30,
      headline: true,
      addedCount: 12,
      lastRunAt: new Date(Date.now() - 25 * 60 * 1000),
      includeYekpareHaber: true,
    },
    {
      name: "Sabah - Ekonomi",
      active: true,
      postType: "news",
      categorySlug: "ekonomi",
      tags: ["sabah"],
      feeds: ["https://www.sabah.com.tr/rss/ekonomi.xml"],
      sourceType: "rss",
      intervalMinutes: 60,
      addedCount: 8,
      lastRunAt: new Date(Date.now() - 50 * 60 * 1000),
      includeYekpareHaber: true,
    },
    {
      name: "BBC Türkçe",
      active: false,
      postType: "news",
      categorySlug: "dunya",
      tags: ["bbc"],
      feeds: ["https://feeds.bbci.co.uk/turkce/rss.xml"],
      sourceType: "rss",
      intervalMinutes: 120,
      translateEnabled: true,
      sourceLang: "en",
      targetLang: "tr",
      translateEngine: "deepl",
      addedCount: 3,
      includeYekpareHaber: true,
    },
  ]);

  await db.insert(videoSourcesTable).values([
    {
      name: "NTV",
      platform: "youtube",
      sourceType: "channel",
      channelId: "UCqgnDFnbn-W19w63ezxxNGQ",
      categorySlug: "haberler",
      active: true,
      isLive: true,
      videoCount: 0,
    },
    {
      name: "TRT Haber",
      platform: "youtube",
      sourceType: "channel",
      channelId: "UCQ65pl4SZWyMc05f6_pVP_g",
      categorySlug: "haberler",
      active: true,
      videoCount: 0,
    },
  ]);

  const modules = [
    { key: "manset_slider", name: "Manşet Slider", description: "Büyük manşet slider alanı", accentColor: "#CC0000" },
    { key: "surgu_manset", name: "Sürgü Manşet", description: "Yan kolon başlık listesi", accentColor: "#1E40AF" },
    { key: "son_haberler_bandi", name: "Son Haberler Bandı", description: "Kırmızı son dakika bandı", accentColor: "#DC2626" },
    { key: "ikon_bant", name: "İkon Bant", description: "Kategori hızlı erişim bandı", accentColor: "#7C3AED" },
    { key: "finans_bandi", name: "Finans Bandı", description: "Döviz, altın, borsa kayan bandı", accentColor: "#0EA5E9" },
    { key: "kategori_bloklari", name: "Kategori Blokları", description: "Kategorilere göre haber blokları", accentColor: "#047857" },
    { key: "kose_yazarlari", name: "Köşe Yazarları", description: "Yazar kartları", accentColor: "#B45309" },
    { key: "video_tv", name: "Video TV", description: "YouTube/Dailymotion video şeridi", accentColor: "#BE185D" },
    { key: "reklam_bloku", name: "Reklam Bloğu", description: "Anasayfa banner reklam alanı", accentColor: "#EA580C" },
  ];
  await db.insert(homepageModulesTable).values(
    modules.map((m, i) => ({ ...m, enabled: true, position: i + 1 })),
  );

  const ads = [
    { slotKey: "header_top", name: "Header Üst Banner", description: "Logo üzeri 728x90 alan" },
    { slotKey: "header_bottom", name: "Header Alt Banner", description: "Menü altı leaderboard" },
    { slotKey: "home_middle", name: "Anasayfa Orta", description: "Modüller arası reklam" },
    { slotKey: "sidebar_top", name: "Yan Kolon Üst", description: "Detay sayfası yan kolonu" },
    { slotKey: "article_inline", name: "Makale İçi", description: "Yazı arasına yerleşen reklam" },
    { slotKey: "footer", name: "Footer Banner", description: "Site sonu banner" },
    {
      slotKey: "siparis_empty",
      name: "Sipariş — Boş liste (maskot)",
      description:
        "Mekan & Dükkan’da işletme yokken: HTML ile görsel veya banner (Medya’dan URL kullanılabilir).",
    },
  ];
  await db.insert(adSlotsTable).values(
    ads.map((a) => ({ ...a, html: "", enabled: false })),
  );

  await db.insert(siteSettingsTable).values({
    siteName: "Yekpare",
    tagline: "Türkiye'nin yerli arama motoru",
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

  console.log("Seed complete.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
