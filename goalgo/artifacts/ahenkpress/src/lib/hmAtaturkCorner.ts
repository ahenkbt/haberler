export type AtaturkPageSlug = "kose" | "hayati" | "kronoloji" | "ilkeler" | "sozleri";

export type AtaturkCornerLink = {
  slug: AtaturkPageSlug;
  sourceSlug: string;
  title: string;
  eyebrow: string;
  summary: string;
  icon: string;
  number: string;
};

export const ATATURK_CORNER_LINKS: AtaturkCornerLink[] = [
  {
    slug: "kose",
    sourceSlug: "ataturk-kosesi",
    title: "Atatürk Köşesi",
    eyebrow: "Genel Bakış",
    summary: "Mustafa Kemal Atatürk'ün hayatı, ilkeleri, kronolojisi ve sözlerine giriş.",
    icon: "TR",
    number: "01",
  },
  {
    slug: "hayati",
    sourceSlug: "ataturk-hayati",
    title: "Atatürk'ün Hayatı",
    eyebrow: "Biyografi",
    summary: "Selanik'ten Cumhuriyetin kuruluşuna uzanan büyük hayatın beş bölümlük özeti.",
    icon: "MK",
    number: "02",
  },
  {
    slug: "kronoloji",
    sourceSlug: "ataturk-kronoloji",
    title: "Atatürk Kronolojisi",
    eyebrow: "Zaman Çizgisi",
    summary: "1881'den Anıtkabir'e kadar önemli tarih ve olayların kronolojik akışı.",
    icon: "19",
    number: "03",
  },
  {
    slug: "ilkeler",
    sourceSlug: "ataturk-ilkeler",
    title: "Atatürk İlkeleri",
    eyebrow: "Altı Ok",
    summary: "Cumhuriyetçilik, Milliyetçilik, Halkçılık, Devletçilik, Laiklik ve Devrimcilik.",
    icon: "6",
    number: "04",
  },
  {
    slug: "sozleri",
    sourceSlug: "ataturk-sozleri",
    title: "Atatürk Sözleri",
    eyebrow: "Seçkiler",
    summary: "Barış, eğitim, demokrasi, gençlik ve Cumhuriyet üzerine seçilmiş sözler.",
    icon: "AA",
    number: "05",
  },
];

export const ATATURK_CORNER_HOME_QUOTES = [
  "Dünyada ve tarihte Türk'ten daha büyük, ondan daha eski, ondan daha temiz bir millet yoktur.",
  "Hayatta en hakiki mürşit ilimdir.",
  "Yurtta sulh, cihanda sulh.",
  "Egemenlik kayıtsız şartsız milletindir.",
  "Ne mutlu Türküm diyene!",
  "Türk Cumhuriyeti ilelebet payidar kalacaktır.",
  "Özgürlük ve bağımsızlık benim karakterimdir.",
  "Millete efendilik yoktur; hizmet vardır.",
  "Büyük işler, önemli atılımlar ancak birlikte çalışma ile elde edilebilir.",
  "Cumhuriyet, düşüncesi hür, anlayışı hür, vicdanı hür nesiller ister.",
  "Benim naçiz vücudum elbet bir gün toprak olacaktır; fakat Türkiye Cumhuriyeti ilelebet payidar kalacaktır.",
  "Beni görmek demek mutlaka yüzümü görmek değildir; benim fikirlerimi, benim duygularımı anlıyorsanız bu yeterlidir.",
] as const;

export const ATATURK_CORNER_HOME_QUOTE = ATATURK_CORNER_HOME_QUOTES[0];

export const ATATURK_CORNER_PORTRAIT_SRC = "/hm/ataturk-portre.png";

export function pickAtaturkCornerHomeQuote(): string {
  const index = Math.floor(Math.random() * ATATURK_CORNER_HOME_QUOTES.length);
  return ATATURK_CORNER_HOME_QUOTES[index] ?? ATATURK_CORNER_HOME_QUOTE;
}

export const ATATURK_CORNER_HOME_ACTION_SLUGS: AtaturkPageSlug[] = ["hayati", "kronoloji", "ilkeler"];

export const ATATURK_CORNER_HOME_ACTION_LABELS: Partial<Record<AtaturkPageSlug, string>> = {
  hayati: "HAYATI",
  kronoloji: "KRONOLOJİ",
  ilkeler: "İLKELERİ",
};

export function ataturkCornerPath(slug: AtaturkPageSlug): string {
  return slug === "kose" ? "/ataturk" : `/ataturk/${slug}`;
}

export const ATATURK_FACTS = [
  { value: "1881", label: "Doğum Yılı" },
  { value: "1919", label: "Samsun'a Çıkış" },
  { value: "1923", label: "Cumhuriyetin İlanı" },
  { value: "1938", label: "Vefat Yılı" },
  { value: "40+", label: "Büyük Reform" },
];

export const ATATURK_LIFE_CHAPTERS = [
  {
    years: "1881 - 1904",
    title: "Erken Yaşam ve Eğitim",
    text: "Mustafa Kemal, 1881'de Selanik'te doğdu. Selanik Askeri Rüştiyesi, Manastır Askeri İdadisi, Harp Okulu ve Harp Akademisi'nde aldığı eğitim; askerlik, matematik ve düşünce dünyasını şekillendirdi.",
  },
  {
    years: "1905 - 1918",
    title: "Askeri Kariyer ve I. Dünya Savaşı",
    text: "Şam, Makedonya, Trablusgarp, Balkan Savaşları ve Çanakkale cephelerinde görev aldı. 1915 Çanakkale savunması, onu ulusal kahraman yapan dönüm noktalarından biri oldu.",
  },
  {
    years: "1919 - 1923",
    title: "Milli Mücadele",
    text: "19 Mayıs 1919'da Samsun'a çıkarak Milli Mücadele'yi başlattı. Erzurum ve Sivas Kongreleri, TBMM'nin açılışı, Sakarya ve Büyük Taarruz zaferleri bağımsızlık yolunu açtı.",
  },
  {
    years: "1923 - 1934",
    title: "Cumhuriyetin İnşası",
    text: "29 Ekim 1923'te Türkiye Cumhuriyeti ilan edildi. Halifeliğin kaldırılması, Medeni Kanun, Latin alfabesi, eğitim ve kadın hakları reformları modern devletin temelini attı.",
  },
  {
    years: "1934 - 1938",
    title: "Son Yılları ve Mirası",
    text: "TBMM tarafından kendisine Atatürk soyadı verildi. 10 Kasım 1938'de Dolmabahçe Sarayı'nda vefat etti; mirası bağımsız, laik ve çağdaş Türkiye Cumhuriyeti olarak yaşamaya devam ediyor.",
  },
];

export const ATATURK_TIMELINE = [
  { year: "1881", period: "Erken Yaşam", title: "Selanik'te Doğdu", text: "Ali Rıza Efendi ve Zübeyde Hanım'ın oğlu olarak Selanik'te dünyaya geldi." },
  { year: "1893", period: "Eğitim", title: "Mustafa Kemal Adını Aldı", text: "Selanik Askeri Rüştiyesi'nde matematik öğretmeni ona Kemal adını verdi." },
  { year: "1905", period: "Askerlik", title: "Kurmay Yüzbaşı Oldu", text: "Harp Akademisi'nden mezun olarak Osmanlı ordusunda kurmay subaylık görevine başladı." },
  { year: "1911", period: "Askerlik", title: "Trablusgarp Savaşı", text: "Osmanlı Libyası'nın İtalyan işgaline karşı gönüllü olarak görev yaptı." },
  { year: "1915", period: "I. Dünya Savaşı", title: "Çanakkale Muharebeleri", text: "19. Tümen komutanı olarak Arıburnu ve Conkbayırı savunmalarında belirleyici rol üstlendi." },
  { year: "1919", period: "Milli Mücadele", title: "Samsun'a Çıkış", text: "19 Mayıs 1919'da Samsun'a çıkarak ulusal direnişi örgütleme sürecini başlattı." },
  { year: "1920", period: "Milli Mücadele", title: "TBMM Açıldı", text: "23 Nisan 1920'de Ankara'da Türkiye Büyük Millet Meclisi açıldı." },
  { year: "1921", period: "Milli Mücadele", title: "Sakarya Meydan Muharebesi", text: "Başkomutan olarak yönettiği savaş, Milli Mücadele'nin kaderini değiştirdi." },
  { year: "1922", period: "Milli Mücadele", title: "Büyük Taarruz", text: "26 Ağustos'ta başlayan taarruz 9 Eylül'de İzmir'in kurtuluşuyla sonuçlandı." },
  { year: "1923", period: "Cumhuriyet", title: "Cumhuriyetin İlanı", text: "29 Ekim'de Türkiye Cumhuriyeti ilan edildi; Atatürk ilk Cumhurbaşkanı seçildi." },
  { year: "1924", period: "Reform", title: "Halifeliğin Kaldırılması", text: "Laik devlet düzeninin önünü açan en önemli adımlardan biri atıldı." },
  { year: "1926", period: "Reform", title: "Medeni Kanun", text: "Çağdaş hukuk düzeni ve kadın-erkek eşitliği için temel bir düzenleme kabul edildi." },
  { year: "1928", period: "Reform", title: "Latin Alfabesine Geçiş", text: "Yeni Türk harfleri kabul edildi ve okuma-yazma seferberliği başlatıldı." },
  { year: "1934", period: "Reform", title: "Kadınlara Milletvekilliği Hakkı", text: "Türk kadınları milletvekili seçme ve seçilme hakkını kazandı." },
  { year: "1934", period: "Miras", title: "Atatürk Soyadı", text: "TBMM, Mustafa Kemal'e yalnızca ona ait olan Atatürk soyadını verdi." },
  { year: "1938", period: "Miras", title: "Vefatı", text: "10 Kasım 1938 saat 09.05'te Dolmabahçe Sarayı'nda hayata gözlerini yumdu." },
  { year: "1953", period: "Miras", title: "Anıtkabir", text: "Naaşı Ankara'daki Anıtkabir'e nakledildi." },
];

export const ATATURK_PRINCIPLES = [
  {
    title: "Cumhuriyetçilik",
    subtitle: "Republicanism",
    text: "Egemenliğin kayıtsız şartsız millete ait olduğu yönetim anlayışıdır. Saltanat ve hilafetin kaldırılmasıyla halk egemenliği devletin merkezine yerleşti.",
    reform: "Cumhuriyetin ilanı, 29 Ekim 1923.",
  },
  {
    title: "Milliyetçilik",
    subtitle: "Nationalism",
    text: "Etnik veya dini değil, ortak vatandaşlık ve ortak kader temelinde yükselen sivil milliyetçilik anlayışıdır.",
    reform: "Türk Tarih Kurumu ve Türk Dil Kurumu çalışmaları.",
  },
  {
    title: "Halkçılık",
    subtitle: "Populism",
    text: "Tüm yurttaşların yasa önünde eşit olduğu, sınıf ve zümre ayrıcalıklarının reddedildiği toplum görüşüdür.",
    reform: "Unvan ve lakapların kaldırılması, Medeni Kanun.",
  },
  {
    title: "Devletçilik",
    subtitle: "Statism",
    text: "Özel girişimi yok saymadan, kalkınma için devletin yönlendirici ve yatırımcı rol üstlendiği ekonomik ilkedir.",
    reform: "Birinci Beş Yıllık Sanayi Planı, Sümerbank ve Etibank.",
  },
  {
    title: "Laiklik",
    subtitle: "Secularism",
    text: "Din ve devlet işlerinin ayrılması; kamusal yönetimin akıl, hukuk ve bilim temelinde yürütülmesidir.",
    reform: "Halifeliğin kaldırılması, laik hukuk ve eğitim düzeni.",
  },
  {
    title: "Devrimcilik",
    subtitle: "Reformism",
    text: "Toplumun çağın gereklerine göre sürekli yenilenmesi ve çağdaş uygarlık seviyesine yönelmesidir.",
    reform: "Harf devrimi, eğitim ve hukuk reformları.",
  },
];

export const ATATURK_REFORMS = [
  { year: "1922", title: "Saltanatın Kaldırılması", text: "Egemenlik tamamen millet iradesine devredildi." },
  { year: "1923", title: "Cumhuriyetin İlanı", text: "Modern Türkiye Cumhuriyeti kuruldu ve Ankara başkent oldu." },
  { year: "1924", title: "Halifeliğin Kaldırılması", text: "Laikleşme süreci kurumsal olarak hızlandı." },
  { year: "1926", title: "Medeni Kanun", text: "Kadınlara evlilik, boşanma ve miras alanlarında eşit haklar tanındı." },
  { year: "1928", title: "Latin Alfabesi", text: "Okuryazarlığı yaygınlaştıran yeni harfler kabul edildi." },
  { year: "1934", title: "Kadınlara Milletvekilliği Hakkı", text: "Türk kadınları siyasal temsilde tam hak kazandı." },
  { year: "1937", title: "Altı Ok Anayasa'ya Girdi", text: "Atatürk ilkeleri anayasal çerçevede yer aldı." },
];

export const ATATURK_QUOTES = [
  { category: "Barış", text: "Yurtta sulh, cihanda sulh.", source: "Dış Politika İlkesi", year: "1931" },
  { category: "Eğitim", text: "Hayatta en hakiki mürşit ilimdir.", source: "Sivas Kongresi Açılışı", year: "1919" },
  { category: "Demokrasi", text: "Egemenlik kayıtsız şartsız milletindir.", source: "TBMM", year: "1920" },
  { category: "Milli Gurur", text: "Ne mutlu Türküm diyene!", source: "Cumhuriyetin 10. Yıl Nutku", year: "1933" },
  { category: "Gençlik", text: "Muhtaç olduğun kudret damarlarındaki asil kanda mevcuttur.", source: "Gençliğe Hitabe, Nutuk", year: "1927" },
  { category: "Gençlik", text: "Ey Türk gençliği! Birinci vazifen, Türk istiklalini, Türk Cumhuriyetini ilelebet muhafaza ve müdafaa etmektir.", source: "Gençliğe Hitabe, Nutuk", year: "1927" },
  { category: "Barış", text: "Harp, zaruri ve hayati olduğu ispat edilmedikçe, bir cinayettir.", source: "Konuşma", year: "1921" },
  { category: "Askerlik", text: "Size taarruzu değil, ölmeyi emrediyorum!", source: "Çanakkale", year: "1915" },
  { category: "Cumhuriyet", text: "Türk Cumhuriyeti ilelebet payidar kalacaktır.", source: "Cumhuriyet Bayramı Konuşması", year: "1933" },
  { category: "Miras", text: "Beni görmek demek, mutlaka yüzümü görmek değildir. Benim fikirlerimi, benim duygularımı anlıyorsanız bu yeterlidir.", source: "Atfedilen", year: "" },
];
