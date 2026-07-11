import { wikiTitleToUrlSlug } from "./wikiArticleSlug";

export type HeritageFact = {
  icon: string;
  label: string;
  value: string;
};

export type HeritageTimelineItem = {
  date: string;
  icon: string;
  title: string;
  text: string;
};

export type HeritageCard = {
  icon: string;
  title: string;
  date?: string;
  text: string;
};

export type WarPage = {
  slug: string;
  year: string;
  title: string;
  shortTitle: string;
  eyebrow: string;
  subtitle: string;
  summary: string;
  quote?: string;
  quoteSource?: string;
  stats: { value: string; label: string }[];
  facts: HeritageFact[];
  overview: string[];
  timeline: HeritageTimelineItem[];
  featureTitle: string;
  featureEyebrow: string;
  features: HeritageCard[];
  remembranceTitle: string;
  remembrance: HeritageCard[];
};

export const HM_WAR_PAGES: WarPage[] = [
  {
    slug: "canakkale-savasi",
    year: "1915",
    title: "Çanakkale Savaşları",
    shortTitle: "Çanakkale Savaşı",
    eyebrow: "Savaşlar · Çanakkale",
    subtitle: "1915 - Ölmek İçin Emir",
    summary:
      "Tarihin en çetin savunma muharebelerinden biri. Çanakkale Cephesi'nde Türk askeri, ezici üstünlüğe sahip İtilaf kuvvetlerini sekiz ay boyunca durdurdu ve tarihin akışını değiştirdi.",
    quote:
      "Size taarruzu değil, ölmeyi emrediyorum. Bize taarruz edecek olan düşmana karşı geçecek zaman zarfında, başka kuvvetler ve kumandanlar mevziimize gelebilir.",
    quoteSource: "Mustafa Kemal, Arıburnu, 1915",
    stats: [
      { value: "250.000+", label: "Türk şehit ve yaralı" },
      { value: "8 Ay", label: "Cephe süresi" },
      { value: "500.000+", label: "İtilaf kaybı" },
      { value: "18 Mart", label: "Zafer günü" },
    ],
    facts: [
      { icon: "📅", label: "Tarih", value: "Şubat 1915 - Ocak 1916" },
      { icon: "📍", label: "Yer", value: "Gelibolu Yarımadası, Çanakkale Boğazı" },
      { icon: "⚔️", label: "Taraflar", value: "Osmanlı İmparatorluğu - İngiltere, Fransa, Avustralya, Yeni Zelanda, Hindistan, Kanada" },
      { icon: "🎖️", label: "Türk Komutanlar", value: "Liman von Sanders, Mustafa Kemal, Halil Sami, Cevat Paşa" },
      { icon: "🏳️", label: "İtilaf Komutanlar", value: "Sir Ian Hamilton, Sackville Carden, Frederick Stopford" },
      { icon: "📊", label: "Sonuç", value: "Türk zaferi - İtilaf kuvvetleri yarımadayı tahliye etti" },
      { icon: "🕯️", label: "Türk Kayıpları", value: "Yaklaşık 57.000 şehit, 185.000+ yaralı" },
      { icon: "💔", label: "İtilaf Kayıpları", value: "Yaklaşık 44.000 ölü, 97.000 yaralı" },
    ],
    overview: [
      "Çanakkale Savaşları, I. Dünya Savaşı'nın en kritik cephelerinden birini oluşturur. İngiltere ve Fransa öncülüğündeki İtilaf devletleri, İstanbul Boğazı'nı geçerek Osmanlı İmparatorluğu'nu savaş dışı bırakmayı ve Rusya'ya ikmal yolu açmayı hedefliyordu.",
      "Türk ordusu, sayı ve teçhizat bakımından üstün bir düşmana karşı yarımadayı savundu. Bu savunma yalnızca askeri bir başarı değil, bir milletin yeniden doğuş destanı oldu.",
      "Mustafa Kemal'in Arıburnu, Conk Bayırı ve Anafartalar'da kazandığı ün, ileride Millî Mücadele'yi örgütleyecek liderin tarih sahnesine çıkışını güçlendirdi.",
    ],
    timeline: [
      { date: "19 Şubat 1915", icon: "🚢", title: "Deniz harekâtı başladı", text: "İngiliz ve Fransız savaş gemileri Çanakkale Boğazı'nın dış tahkimatlarını bombalamaya başladı." },
      { date: "18 Mart 1915", icon: "🔴", title: "Büyük deniz taarruzu püskürtüldü", text: "İtilaf filosunun boğazı geçme girişimi, Türk mayın hattı ve topçu ateşiyle büyük bir bozguna uğradı." },
      { date: "25 Nisan 1915", icon: "🪖", title: "Kara çıkarması başladı", text: "ANZAC kuvvetleri Arıburnu'na, İngilizler Seddülbahir'e çıkarma yaptı. Mustafa Kemal, 19. Tümen ile Conk Bayırı'nı tuttu." },
      { date: "6-10 Ağustos 1915", icon: "🏔️", title: "Anafartalar Muharebesi", text: "İtilaf kuvvetlerinin son büyük çıkarma girişimi Mustafa Kemal'in yönettiği savunmayla püskürtüldü." },
      { date: "Aralık 1915", icon: "🚶", title: "İtilaf tahliyesi", text: "ANZAC ve Suvla Koyu'ndaki kuvvetler gece geri çekildi; tahliye savaşın en başarılı geri çekilmelerinden biri sayıldı." },
      { date: "9 Ocak 1916", icon: "🏆", title: "Seddülbahir'in tahliyesi", text: "Son İtilaf kuvvetleri de yarımadayı terk etti ve Çanakkale Cephesi Türk zaferiyle kapandı." },
    ],
    featureEyebrow: "Başlıca Muharebeler",
    featureTitle: "Cephenin Kritik Noktaları",
    features: [
      { icon: "⚓", title: "18 Mart Deniz Muharebesi", date: "1915", text: "Türk topçusu ve mayın hattının İtilaf filosunu bozguna uğrattığı tarihi gün." },
      { icon: "🪖", title: "Arıburnu (ANZAC Koyu)", date: "25 Nisan 1915", text: "ANZAC kuvvetlerinin çıkarma yaptığı ve Mustafa Kemal'in 57. Alay'a tarihi emrini verdiği nokta." },
      { icon: "🔴", title: "Seddülbahir Muharebeleri", date: "Nisan-Haziran 1915", text: "İngiliz kuvvetlerinin yarımadanın ucuna çıkarma yaptığı kanlı cephe hattı." },
      { icon: "🏔️", title: "Conk Bayırı", date: "Ağustos 1915", text: "Yarımadanın en kritik yükseltisi; İtilaf taarruzları burada durduruldu." },
      { icon: "🌊", title: "Anafartalar", date: "6-10 Ağustos 1915", text: "Mustafa Kemal'in Anafartalar Grubu komutanı olarak tüm taarruzları kırdığı cephe." },
      { icon: "🕯️", title: "57. Alay Şehitliği", date: "1915", text: "Tamamı şehit olan 57. Alay'ın hatırası Türk ordusunda yaşatılır." },
    ],
    remembranceTitle: "Çanakkale'yi Anıyoruz",
    remembrance: [
      { icon: "18", title: "Çanakkale Deniz Zaferi & Şehitler Günü", date: "Mart", text: "18 Mart 1915'teki zaferin yıldönümü tüm yurtta törenlerle anılır." },
      { icon: "25", title: "Çanakkale Kara Muharebesi Anma Günü", date: "Nisan", text: "ANZAC çıkarmasının yıldönümünde Gelibolu'da anma törenleri düzenlenir." },
      { icon: "6/9", title: "Anafartalar Muharebesi Anma Günü", date: "Ağustos", text: "Mustafa Kemal'in Anafartalar'da kazandığı zafer saygıyla hatırlanır." },
    ],
  },
  {
    slug: "kurtulus-savasi",
    year: "1919-23",
    title: "Türk Kurtuluş Savaşı",
    shortTitle: "Kurtuluş Savaşı",
    eyebrow: "Savaşlar · Millî Mücadele",
    subtitle: "1919 - 1923",
    summary:
      "Mondros'tan Lozan'a, Samsun'dan İzmir'e uzanan dört yıllık varoluş mücadelesi. Türk milletinin işgale karşı verdiği bağımsızlık savaşı ve modern Türkiye'nin kuruluş destanı.",
    quote: "Ya istiklal, ya ölüm!",
    quoteSource: "Millî Mücadele'nin parolası",
    stats: [
      { value: "1919-23", label: "Mücadele yılları" },
      { value: "30 Ağustos", label: "Zafer Bayramı" },
      { value: "29 Ekim", label: "Cumhuriyet'in ilanı" },
      { value: "Lozan", label: "Zafer antlaşması" },
    ],
    facts: [
      { icon: "📅", label: "Tarihler", value: "19 Mayıs 1919 - 24 Temmuz 1923" },
      { icon: "📍", label: "Cepheler", value: "Batı, Güney, Doğu ve İstanbul cepheleri" },
      { icon: "🎖️", label: "Başkomutan", value: "Mustafa Kemal Atatürk" },
      { icon: "📊", label: "Sonuç", value: "Türk zaferi - Lozan Antlaşması ile tam bağımsızlık" },
      { icon: "🏛️", label: "Siyasi Sonuç", value: "Türkiye Cumhuriyeti'nin 29 Ekim 1923'te ilanı" },
      { icon: "📜", label: "Antlaşmalar", value: "Kars, Ankara ve Lozan antlaşmaları" },
    ],
    overview: [
      "I. Dünya Savaşı'ndan yenik ayrılan Osmanlı İmparatorluğu, Mondros Mütarekesi'nden sonra Anadolu'nun işgaliyle karşı karşıya kaldı. İzmir'in Yunan kuvvetlerince işgali direniş ruhunu güçlendirdi.",
      "Sevr Antlaşması, Anadolu'nun büyük bölümünü parçalamayı öngörüyordu. Osmanlı hükümeti bu antlaşmayı kabul etti; ancak Ankara'da örgütlenen millî irade kabul etmedi.",
      "19 Mayıs 1919'da Samsun'a çıkan Mustafa Kemal, ulusal direnişi örgütledi. TBMM'nin açılmasıyla egemenlik millete geçti; Büyük Taarruz ve Lozan ile tam bağımsızlık kazanıldı.",
    ],
    timeline: [
      { date: "30 Ekim 1918", icon: "🕊️", title: "Mondros Mütarekesi", text: "Osmanlı İmparatorluğu I. Dünya Savaşı'ndan yenik ayrıldı ve işgaller başladı." },
      { date: "15 Mayıs 1919", icon: "⚠️", title: "İzmir'in işgali", text: "Yunan kuvvetleri İzmir'e çıktı; direniş hareketi Anadolu genelinde hızlandı." },
      { date: "19 Mayıs 1919", icon: "🦅", title: "Samsun'a çıkış", text: "Mustafa Kemal, Samsun'a çıkarak Millî Mücadele'yi resmen başlattı." },
      { date: "23 Nisan 1920", icon: "🏛️", title: "TBMM'nin açılışı", text: "Türkiye Büyük Millet Meclisi Ankara'da açıldı; egemenlik millete devredildi." },
      { date: "23 Ağustos-13 Eylül 1921", icon: "🌊", title: "Sakarya Meydan Muharebesi", text: "22 günlük çarpışmada Yunan taarruzu kırıldı; Mustafa Kemal'e Gazi unvanı verildi." },
      { date: "26-30 Ağustos 1922", icon: "🎯", title: "Büyük Taarruz", text: "Afyon-Dumlupınar hattında başlayan taarruz, Yunan ordusunun yenilgisiyle sonuçlandı." },
      { date: "9 Eylül 1922", icon: "🏆", title: "İzmir'in kurtuluşu", text: "Türk süvari birlikleri İzmir'e girdi; Millî Mücadele'nin son büyük hedefi gerçekleşti." },
      { date: "24 Temmuz 1923", icon: "📜", title: "Lozan Antlaşması", text: "Modern Türkiye'nin sınırları tanındı ve kapitülasyonlar kaldırıldı." },
    ],
    featureEyebrow: "Kritik Muharebeler",
    featureTitle: "Zaferlerimiz",
    features: [
      { icon: "🛡️", title: "I. İnönü Muharebesi", date: "11 Ocak 1921", text: "İsmet Paşa komutasında Yunan taarruzunun püskürtüldüğü ilk büyük zafer." },
      { icon: "🛡️", title: "II. İnönü Muharebesi", date: "31 Mart 1921", text: "Yunan'ın ikinci büyük taarruzu da Türk savunmasıyla kırıldı." },
      { icon: "🌊", title: "Sakarya Meydan Muharebesi", date: "23 Ağustos - 13 Eylül 1921", text: "Millî Mücadele'nin kaderini değiştiren büyük savunma savaşı." },
      { icon: "🎯", title: "Büyük Taarruz", date: "26-30 Ağustos 1922", text: "Yunan ordusunu imha eden tarihi harekât." },
      { icon: "🐎", title: "Başkomutan Meydan Muharebesi", date: "30 Ağustos 1922", text: "Büyük Taarruz'un doruk noktası ve Zafer Bayramı'nın temeli." },
      { icon: "🏆", title: "İzmir'in Kurtuluşu", date: "9 Eylül 1922", text: "Türk birliklerinin İzmir'e girişiyle işgal fiilen sona erdi." },
    ],
    remembranceTitle: "Kurtuluş Günleri ve Cumhuriyet",
    remembrance: [
      { icon: "19", title: "Atatürk'ü Anma, Gençlik ve Spor Bayramı", date: "Mayıs", text: "Millî Mücadele'nin başlangıcı her yıl gençliğe armağan edilen bayramla anılır." },
      { icon: "30", title: "Zafer Bayramı", date: "Ağustos", text: "Başkomutan Meydan Muharebesi'nin zaferle sonuçlandığı gün kutlanır." },
      { icon: "29", title: "Cumhuriyet Bayramı", date: "Ekim", text: "Türkiye Cumhuriyeti'nin ilanı tüm yurtta coşkuyla kutlanır." },
    ],
  },
  {
    slug: "kore-savasi",
    year: "1950-53",
    title: "Kore Savaşı",
    shortTitle: "Kore Savaşı",
    eyebrow: "Savaşlar · Kore",
    subtitle: "1950 - 1953",
    summary:
      "Türk Silahlı Kuvvetleri, BM çatısı altında Kore'de savaştı. Kunuri ve Kumyangjang-ni muharebelerindeki kahramanlık, Türk askerini dünyaya bir kez daha tanıttı.",
    stats: [
      { value: "25 Haziran", label: "Savaşın başlangıcı" },
      { value: "25 Ocak", label: "Kumyangjang-ni anma" },
      { value: "741", label: "Türk şehidi" },
      { value: "5.455", label: "İlk tugay mevcudu" },
    ],
    facts: [
      { icon: "📅", label: "Tarihler", value: "25 Haziran 1950 - 27 Temmuz 1953" },
      { icon: "📍", label: "Yer", value: "Kore Yarımadası" },
      { icon: "🎖️", label: "Türk Komutan", value: "Tümgeneral Tahsin Yazıcı" },
      { icon: "🇹🇷", label: "Türk Katkısı", value: "BM kuvvetleri içinde Türk Tugayı" },
      { icon: "🕯️", label: "Türk Kayıpları", value: "741 şehit, 2.068 yaralı, 163 esir ve kayıp" },
      { icon: "📊", label: "Sonuç", value: "Ateşkes - 38. Paralel mevcut sınır olarak kaldı" },
    ],
    overview: [
      "25 Haziran 1950'de Kuzey Kore'nin 38. Paralel'i geçmesiyle başlayan savaş, BM Güvenlik Konseyi kararıyla uluslararası boyut kazandı. Türkiye, çağrıya ilk olumlu yanıt veren ülkelerden biri oldu.",
      "Türk Tugayı, Tümgeneral Tahsin Yazıcı komutasında Ekim 1950'de Kore'ye ulaştı. Türk askeri üç yıl boyunca BM kuvvetleri içinde görev yaptı.",
      "Kunuri ve Kumyangjang-ni muharebelerinde sergilenen kahramanlık, Türk askerine uluslararası saygınlık kazandırdı ve Türkiye'nin NATO üyeliğini pekiştirdi.",
    ],
    timeline: [
      { date: "25 Haziran 1950", icon: "🔴", title: "Savaş patlak verdi", text: "Kuzey Kore kuvvetleri 38. Paralel'i geçerek Güney Kore'ye saldırdı." },
      { date: "25 Temmuz 1950", icon: "🇹🇷", title: "Türkiye katılma kararı aldı", text: "Türkiye, Kore'ye asker gönderilmesini kabul eden ilk BM üyelerinden oldu." },
      { date: "Ekim 1950", icon: "🚢", title: "Türk Tugayı Kore'de", text: "Tümgeneral Tahsin Yazıcı komutasındaki Türk Tugayı Kore'ye ulaştı." },
      { date: "26-30 Kasım 1950", icon: "🔥", title: "Kunuri Muharebesi", text: "Türk Tugayı, BM kuvvetlerinin geri çekilmesini sağlamak için ağır biçimde savaştı." },
      { date: "25 Ocak 1951", icon: "🏆", title: "Kumyangjang-ni Muharebesi", text: "Türk Tugayı'nın en büyük muharebe zaferlerinden biri kazanıldı." },
      { date: "27 Temmuz 1953", icon: "📜", title: "Ateşkes Antlaşması", text: "Panmunjom'da ateşkes imzalandı; Kore Yarımadası fiilen ikiye bölünmüş kaldı." },
    ],
    featureEyebrow: "Kahramanlık",
    featureTitle: "Öne Çıkan Muharebeler",
    features: [
      { icon: "🔥", title: "Kunuri Muharebesi", date: "26-30 Kasım 1950", text: "Çin kuvvetlerinin büyük taarruzunda Türk Tugayı BM hatlarının çökmesini engelledi." },
      { icon: "🏆", title: "Kumyangjang-ni Muharebesi", date: "25 Ocak 1951", text: "Çin birlikleri geri püskürtüldü; Türk askerinin savaş gücü tescillendi." },
      { icon: "🛡️", title: "Nevada Tepeleri Muharebesi", date: "Mayıs 1953", text: "Ateşkesten kısa süre önce Türk birliklerinin görev aldığı son büyük çarpışmalardan biri." },
    ],
    remembranceTitle: "Kore Gazilerini Anıyoruz",
    remembrance: [
      { icon: "25", title: "Kumyangjang-ni Muharebesi Anma Günü", date: "Ocak", text: "Türk Tugayı'nın kazandığı tarihi zafer törenlerle anılır." },
      { icon: "25", title: "Kore Savaşı'nın Başlama Yıldönümü", date: "Haziran", text: "Kore ile Türkiye arasındaki kardeşlik bağı vurgulanır." },
    ],
  },
  {
    slug: "kibris-baris-harekati",
    year: "1974",
    title: "Kıbrıs Barış Harekâtı",
    shortTitle: "Kıbrıs Barış Harekâtı",
    eyebrow: "Savaşlar · Kıbrıs",
    subtitle: "20 Temmuz 1974",
    summary:
      "Türkiye, 1960 Garanti Antlaşması'ndan doğan garantör devlet hakkını kullanarak Kıbrıs Türklerini korumak ve adadaki düzeni yeniden tesis etmek amacıyla 20 Temmuz 1974'te harekât başlattı.",
    stats: [
      { value: "20 Temmuz", label: "Harekât günü" },
      { value: "1974", label: "Yılı" },
      { value: "498", label: "Türk şehidi" },
      { value: "I & II", label: "İki aşamalı harekât" },
    ],
    facts: [
      { icon: "📅", label: "Tarihler", value: "I. Harekât: 20 Temmuz 1974 / II. Harekât: 14 Ağustos 1974" },
      { icon: "📍", label: "Yer", value: "Kıbrıs Adası" },
      { icon: "🎖️", label: "Komutan", value: "Korgeneral Bedrettin Demirel" },
      { icon: "⚖️", label: "Hukuki Dayanak", value: "1960 Garanti Antlaşması, Madde IV" },
      { icon: "🕯️", label: "Türk Kayıpları", value: "498 şehit, 1.200+ yaralı" },
      { icon: "📊", label: "Sonuç", value: "Kıbrıs Türklerinin kuzey bölgede güvence altına alınması" },
    ],
    overview: [
      "1960'ta bağımsızlığını kazanan Kıbrıs Cumhuriyeti, anayasal düzenin Rum tarafınca askıya alınmasıyla istikrarsızlığa sürüklendi. Kıbrıs Türkleri enklavlarda yaşamaya zorlandı.",
      "15 Temmuz 1974'te Yunanistan cuntasının desteğiyle yapılan darbe, Kıbrıs'ı Yunanistan'a bağlamayı hedefliyordu. Kıbrıs Türkleri yaşam tehlikesiyle karşı karşıya kaldı.",
      "Türkiye, 1960 Garanti Antlaşması kapsamında garantör devlet sıfatıyla adaya müdahale etti. Birinci ve İkinci Barış Harekâtı ile adanın kuzeyi güvence altına alındı.",
    ],
    timeline: [
      { date: "15 Temmuz 1974", icon: "⚠️", title: "Yunan darbesi", text: "EOKA-B Kıbrıs'ta darbe yaptı; enosis hedefleyen Nikos Sampson yönetimi kuruldu." },
      { date: "20 Temmuz 1974", icon: "🚢", title: "Birinci Barış Harekâtı", text: "Türk Silahlı Kuvvetleri adaya çıkarma yaptı ve Girne koridorunu güvenceye aldı." },
      { date: "25-30 Temmuz 1974", icon: "🕊️", title: "Cenevre görüşmeleri", text: "Garantör devletler bir araya geldi; çözüm önerileri sonuçsuz kaldı." },
      { date: "14 Ağustos 1974", icon: "🎯", title: "İkinci Barış Harekâtı", text: "Türk kuvvetleri adanın kuzeyinde bugünkü sınıra ulaştı." },
      { date: "16 Ağustos 1974", icon: "🛑", title: "Ateşkes", text: "İkinci ateşkes ilan edildi ve harekât tamamlandı." },
      { date: "15 Kasım 1983", icon: "🏛️", title: "KKTC ilanı", text: "Kuzey Kıbrıs Türk Cumhuriyeti bağımsızlığını ilan etti." },
    ],
    featureEyebrow: "Harekât Aşamaları",
    featureTitle: "Birinci ve İkinci Aşama",
    features: [
      { icon: "🚢", title: "Birinci Barış Harekâtı", date: "20 Temmuz 1974", text: "Deniz ve hava kuvvetleri desteğiyle Girne sahillerine çıkarma yapıldı; BM ateşkesiyle harekât durdu." },
      { icon: "🎯", title: "İkinci Barış Harekâtı", date: "14 Ağustos 1974", text: "Cenevre görüşmelerinin sonuçsuz kalması üzerine Türk kuvvetleri adanın kuzeyini güvenceye aldı." },
    ],
    remembranceTitle: "Barış ve Özgürlük Bayramı",
    remembrance: [
      { icon: "20", title: "Kıbrıs Barış Harekâtı Yıldönümü", date: "Temmuz", text: "Türkiye'de ve KKTC'de törenlerle kutlanır; şehitler ve gaziler saygıyla anılır." },
    ],
  },
];

export function corporateWarPath(slug: string): string {
  return `/savaslar/${slug}`;
}

export const NATIONAL_DAY_HIGHLIGHTS = [
  { day: "10 OCAK", title: "Çalışan Gazeteciler Günü" },
  { day: "12 MART", title: "İstiklâl Marşı'nın Kabulü" },
  { day: "18 MART", title: "Çanakkale Zaferi ve Şehitleri Anma Günü" },
  { day: "23 NİSAN", title: "Ulusal Egemenlik ve Çocuk Bayramı" },
  { day: "19 MAYIS", title: "Atatürk'ü Anma, Gençlik ve Spor Bayramı" },
  { day: "1 TEMMUZ", title: "Denizcilik ve Kabotaj Bayramı" },
  { day: "15 TEMMUZ", title: "Demokrasi ve Millî Birlik Günü" },
  { day: "26 AĞUSTOS", title: "Büyük Taarruz'un Başlangıcı" },
  { day: "30 AĞUSTOS", title: "Zafer Bayramı" },
  { day: "9 EYLÜL", title: "İzmir'in Kurtuluşu" },
  { day: "29 EKİM", title: "Cumhuriyet Bayramı" },
  { day: "10 KASIM", title: "Atatürk'ü Anma Günü" },
  { day: "24 KASIM", title: "Öğretmenler Günü" },
  { day: "27 ARALIK", title: "Atatürk'ün Ankara'ya Gelişi" },
] as const;

export type NationalDayEntry = {
  color: string;
  day: string;
  month: string;
  title: string;
  /** Vikipedi madde başlığı (boşsa `title` kullanılır). */
  wikiTitle?: string;
  type: string;
  text: string;
};

export const NATIONAL_DAYS: NationalDayEntry[] = [
  { color: "navy", day: "10", month: "Ocak", title: "Çalışan Gazeteciler Günü", type: "Meslek Günü", text: "Basın emekçilerinin kamuoyunu bilgilendirme sorumluluğu ve gazetecilik emeği anılır." },
  {
    color: "red",
    day: "25",
    month: "Ocak",
    title: "Kumyangjang-ni (Kore)",
    wikiTitle: "Kumyangjang-ni Muharebesi",
    type: "Askeri Anma",
    text: "25 Ocak 1951'de Türk Tugayı Kore'de Çin kuvvetlerine karşı tarihi bir zafer kazandı.",
  },
  {
    color: "red",
    day: "12",
    month: "Mart",
    title: "İstiklâl Marşı'nın Kabulü",
    wikiTitle: "İstiklâl Marşı",
    type: "Millî Anma",
    text: "Mehmet Âkif Ersoy'un kaleme aldığı İstiklâl Marşı'nın TBMM'de kabul edildiği gün.",
  },
  {
    color: "red",
    day: "18",
    month: "Mart",
    title: "Çanakkale Zaferi ve Şehitleri Anma Günü",
    wikiTitle: "18 Mart Çanakkale Zaferi ve Şehitleri Anma Günü",
    type: "Şehitler Günü",
    text: "18 Mart 1915'te Türk topçu ve mayın hatları İtilaf filosunu büyük bir bozguna uğrattı; şehitlerimiz saygıyla anılır.",
  },
  { color: "gold", day: "23", month: "Nisan", title: "Ulusal Egemenlik ve Çocuk Bayramı", type: "Ulusal Bayram", text: "TBMM'nin açılışı ve millî egemenliğin ilanı, Atatürk'ün çocuklara armağan ettiği bayramla kutlanır." },
  {
    color: "dark",
    day: "25",
    month: "Nisan",
    title: "Çanakkale Kara Muharebesi",
    wikiTitle: "Çanakkale Savaşı",
    type: "Askeri Anma",
    text: "ANZAC kuvvetlerinin Arıburnu çıkarması ve Mustafa Kemal'in tarihi emrinin yıldönümü.",
  },
  { color: "gold", day: "19", month: "Mayıs", title: "Atatürk'ü Anma, Gençlik ve Spor Bayramı", type: "Ulusal Bayram", text: "Mustafa Kemal'in Samsun'a çıkışının ve Millî Mücadele'yi başlatmasının yıldönümü." },
  {
    color: "dark",
    day: "25",
    month: "Haziran",
    title: "Kore Savaşı Başlangıcı",
    wikiTitle: "Kore Savaşı",
    type: "Askeri Anma",
    text: "Kuzey Kore'nin 38. Paralel'i geçmesiyle başlayan Kore Savaşı'nın yıldönümü.",
  },
  { color: "navy", day: "1", month: "Temmuz", title: "Denizcilik ve Kabotaj Bayramı", type: "Millî Gün", text: "Türk denizlerinde egemenlik hakkını güçlendiren Kabotaj Kanunu'nun yürürlüğe girişi kutlanır." },
  { color: "red", day: "15", month: "Temmuz", title: "Demokrasi ve Millî Birlik Günü", type: "Resmî Anma", text: "15 Temmuz'da demokrasiye sahip çıkan vatandaşlarımız ve şehitlerimiz törenlerle anılır." },
  { color: "red", day: "20", month: "Temmuz", title: "Kıbrıs Barış Harekâtı", type: "Millî Gün", text: "Türkiye'nin Garanti Antlaşması kapsamında Kıbrıs'a çıkarma yapmasının yıldönümü." },
  { color: "navy", day: "6-9", month: "Ağustos", title: "Anafartalar Muharebesi", type: "Askeri Anma", text: "Mustafa Kemal'in Anafartalar Grubu komutanı olarak İtilaf'ın son büyük taarruzunu kırdığı muharebe." },
  {
    color: "red",
    day: "26",
    month: "Ağustos",
    title: "Büyük Taarruz'un Başlangıcı",
    wikiTitle: "Büyük Taarruz",
    type: "Zafer Haftası",
    text: "26 Ağustos 1922'de başlayan Büyük Taarruz, Millî Mücadele'nin nihai zafer yürüyüşünü başlattı.",
  },
  { color: "gold", day: "30", month: "Ağustos", title: "Zafer Bayramı", wikiTitle: "30 Ağustos Zafer Bayramı", type: "Ulusal Bayram", text: "Büyük Taarruz ve Başkomutan Meydan Muharebesi'nin zaferle sonuçlandığı gün." },
  { color: "red", day: "9", month: "Eylül", title: "İzmir'in Kurtuluşu", type: "Mahalli Kurtuluş", text: "Türk ordusunun İzmir'e girişiyle işgalin sona erdiği gün, Millî Mücadele'nin simge tarihlerindendir." },
  { color: "dark", day: "13", month: "Eylül", title: "Sakarya Meydan Muharebesi", type: "Askeri Anma", text: "Sakarya Meydan Muharebesi'nin zaferle sonuçlandığı gün." },
  { color: "navy", day: "19", month: "Eylül", title: "Gaziler Günü", type: "Millî Anma", text: "Tüm savaşlarda yaralanan veya sakat kalan gazilerimiz törenlerle onurlandırılır." },
  { color: "gold", day: "29", month: "Ekim", title: "Cumhuriyet Bayramı", wikiTitle: "29 Ekim Cumhuriyet Bayramı", type: "Ulusal Bayram", text: "Türkiye Cumhuriyeti'nin 29 Ekim 1923'teki ilanının yıldönümü." },
  {
    color: "dark",
    day: "10",
    month: "Kasım",
    title: "Atatürk'ü Anma Günü",
    wikiTitle: "Atatürk'ün ölümü ve anılması",
    type: "Millî Anma",
    text: "Atatürk'ün 10 Kasım 1938 saat 09:05'te vefatının yıldönümü.",
  },
  { color: "navy", day: "24", month: "Kasım", title: "Öğretmenler Günü", type: "Meslek Günü", text: "Atatürk'e Başöğretmen unvanının verilişi vesilesiyle öğretmenlerin emeği onurlandırılır." },
  {
    color: "red",
    day: "27",
    month: "Aralık",
    title: "Atatürk'ün Ankara'ya Gelişi",
    wikiTitle: "Atatürk'ün Ankara'ya gelişi",
    type: "Millî Anma",
    text: "Mustafa Kemal Paşa'nın Ankara'ya gelişi ve Millî Mücadele merkezinin güçlenişi anılır.",
  },
  { color: "grey", day: "—", month: "Çeşitli", title: "Mahalli Kurtuluş Günleri", type: "İl Törenleri", text: "Millî Mücadele sürecinde işgalden kurtulan il ve ilçelerde mahalli törenler düzenlenir." },
  { color: "grey", day: "—", month: "Çeşitli", title: "Diğer Kahramanlık Günleri", type: "Askerî Anma", text: "Malazgirt, Mohaç, Preveze ve diğer tarihi zaferler çeşitli etkinliklerle anılır." },
];

/** Site içi ansiklopedi yolu — Vikipedi başlığı tercih edilir. */
export function nationalDayEncyclopediaPath(day: Pick<NationalDayEntry, "title" | "wikiTitle">): string {
  const wiki = (day.wikiTitle || day.title).trim();
  return `/bilgiagaci/${wikiTitleToUrlSlug(wiki)}`;
}

/** Türkçe Vikipedi madde URL'si — millî gün detay modalı için. */
export function nationalDayWikipediaUrl(day: Pick<NationalDayEntry, "title" | "wikiTitle">): string {
  const wiki = (day.wikiTitle || day.title).trim();
  return `https://tr.wikipedia.org/wiki/${encodeURIComponent(wiki.replace(/ /g, "_"))}`;
}

export const LIBERATION_DAYS = [
  ["ADANA", "Pozantı", "1918", "25.05.1920", "Fransız"],
  ["ADANA", "Ceyhan", "1918", "05.01.1922", "Fransız"],
  ["ADANA", "Merkez", "1918", "05.01.1922", "Fransız"],
  ["AFYON", "Merkez", "28.03.1920", "27.08.1922", "Yunan"],
  ["AMASYA", "Merkez", "15.03.1919", "28.09.1919", "İngiliz"],
  ["AYDIN", "Merkez", "27.05.1919", "07.09.1922", "Yunan"],
  ["AYDIN", "Nazilli", "03.06.1919", "05.09.1922", "Yunan"],
  ["BALIKESİR", "Merkez", "30.06.1920", "06.09.1922", "Yunan"],
  ["BALIKESİR", "Bandırma", "02.07.1920", "17.09.1922", "Yunan"],
  ["BİLECİK", "Merkez", "06.01.1921", "04.09.1922", "Yunan"],
  ["BURSA", "Merkez", "08.07.1920", "11.09.1922", "Yunan"],
  ["BURSA", "İnegöl", "10.07.1921", "06.09.1922", "Yunan"],
  ["ÇANAKKALE", "Merkez", "1918", "22.09.1922", "İng.-Fr.-İt."],
  ["ÇANAKKALE", "Gelibolu", "04.08.1920", "26.11.1923", "Yunan"],
  ["DENİZLİ", "Buldan", "05.07.1920", "04.09.1922", "Yunan"],
  ["EDİRNE", "Merkez", "1920", "25.11.1922", "Yunan"],
  ["ERZURUM", "Merkez", "16.02.1916", "12.03.1918", "Rus-Ermeni"],
  ["ESKİŞEHİR", "Merkez", "20.07.1921", "02.09.1922", "Yunan"],
  ["GAZİANTEP", "Merkez", "15.01.1919", "25.12.1921", "İngiliz-Fransız"],
  ["HATAY", "Merkez (Antakya)", "07.12.1918", "23.07.1939", "Fransız"],
  ["İÇEL", "Tarsus", "19.12.1918", "05.01.1922", "Fransız"],
  ["İSTANBUL", "Merkez", "16.03.1920", "06.10.1923", "İng.-Fr.-İt."],
  ["İZMİR", "Merkez", "15.05.1919", "09.09.1922", "Yunan"],
  ["İZMİR", "Bergama", "12.06.1919", "14.09.1922", "Yunan"],
  ["İZMİR", "Tire", "30.05.1919", "04.09.1922", "Yunan"],
  ["İZMİR", "Ödemiş", "01.06.1919", "09.03.1922", "Yunan"],
  ["KARS", "Merkez", "—", "30.10.1920", "Rus-Ermeni"],
  ["KIRKLARELİ", "Merkez", "—", "10.11.1922", "Yunan"],
  ["KOCAELİ", "Merkez (İzmit)", "28.04.1921", "28.06.1921", "Yunan"],
  ["KÜTAHYA", "Merkez", "17.07.1921", "30.08.1922", "Yunan"],
  ["MANİSA", "Merkez", "25.05.1919", "08.09.1922", "Yunan"],
  ["MANİSA", "Akhisar", "22.06.1920", "06.09.1922", "Yunan"],
  ["MANİSA", "Turgutlu", "29.05.1919", "07.09.1922", "Yunan"],
  ["KAHRAMANMARAŞ", "Merkez", "29.10.1919", "12.02.1920", "İngiliz-Fransız"],
  ["MARDİN", "Merkez", "21.11.1919", "21.11.1922", "Fransız"],
  ["SAKARYA", "Merkez", "26.03.1921", "21.06.1921", "Yunan"],
  ["TEKİRDAĞ", "Merkez", "20.07.1920", "13.11.1920", "Yunan"],
  ["TRABZON", "Merkez", "18.04.1916", "24.02.1918", "Rus-Ermeni"],
  ["ŞANLIURFA", "Merkez", "1919", "11.04.1920", "İngiliz-Fransız"],
  ["UŞAK", "Merkez", "28.08.1920", "01.09.1922", "Yunan"],
  ["ZONGULDAK", "Merkez", "—", "21.06.1921", "Fransız"],
  ["OSMANİYE", "Merkez", "1918", "07.01.1922", "Fransız"],
] as const;

export const CULTURE_PORTAL_ITEMS = [
  {
    slug: "gezilecekyer",
    icon: "🗺️",
    title: "Gezilecek Yerler",
    subtitle: "Müze & tarihi yapılar",
    url: "https://www.kulturportali.gov.tr/turkiye/genel/gezilecekyer",
  },
  {
    slug: "seyahatHatirasi",
    icon: "📸",
    title: "Seyahat Hatırası",
    subtitle: "Fotoğraf & hikâye",
    url: "https://www.kulturportali.gov.tr/turkiye/genel/seyahatHatirasi",
  },
  {
    slug: "neyenir",
    icon: "🍽️",
    title: "Geleneksel Mutfak",
    subtitle: "Yöresel lezzetler",
    url: "https://www.kulturportali.gov.tr/turkiye/genel/neyenir",
  },
  {
    slug: "turizmaktiviteleri",
    icon: "🎯",
    title: "Turizm Aktiviteleri",
    subtitle: "Etkinlik & deneyim",
    url: "https://www.kulturportali.gov.tr/turkiye/genel/turizmaktiviteleri",
  },
  {
    slug: "kulturatlasi",
    icon: "🏛️",
    title: "Kültür Atlası",
    subtitle: "Kültürel harita",
    url: "https://www.kulturportali.gov.tr/turkiye/genel/kulturatlasi",
  },
  {
    slug: "muzeler",
    icon: "🏺",
    title: "Müzeler",
    subtitle: "Türkiye müzeleri",
    url: "https://www.kulturportali.gov.tr/turkiye/genel/muzeler",
  },
  {
    slug: "sanat",
    icon: "🎨",
    title: "Sanat",
    subtitle: "Türk sanatı",
    url: "https://www.kulturportali.gov.tr/portal/sanat-1-2",
  },
] as const;

export function culturePortalPath(slug?: string): string {
  return slug ? `/kultur-portali?kp=${encodeURIComponent(slug)}` : "/kultur-portali";
}
