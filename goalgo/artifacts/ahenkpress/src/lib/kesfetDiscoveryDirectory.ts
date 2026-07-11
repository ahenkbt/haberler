export type KesfetDiscoveryCity = {
  slug: string;
  label: string;
  lat: number;
  lng: number;
  zoom?: number;
};

export type KesfetDiscoveryRegion = {
  slug: string;
  label: string;
  cities: KesfetDiscoveryCity[];
};

export type KesfetDiscoveryCategory = {
  slug: string;
  label: string;
  icon: string;
  homepageSuperCategory: string;
  storeType: string;
  googlePlaceType?: string;
  googleKeyword: string;
  autoImport: boolean;
  children: Array<{
    slug: string;
    label: string;
    icon: string;
    googlePlaceType?: string;
    googleKeyword: string;
    storeType?: string;
    autoImport?: boolean;
  }>;
};

export const KESFET_DISCOVERY_REGIONS: KesfetDiscoveryRegion[] = [
  {
    slug: "turkiye",
    label: "Türkiye",
    cities: [
      { slug: "adana", label: "Adana", lat: 37.0, lng: 35.3213, zoom: 12 },
      { slug: "adiyaman", label: "Adıyaman", lat: 37.7648, lng: 38.2786, zoom: 12 },
      { slug: "afyonkarahisar", label: "Afyonkarahisar", lat: 38.7569, lng: 30.5387, zoom: 12 },
      { slug: "agri", label: "Ağrı", lat: 39.7191, lng: 43.0503, zoom: 12 },
      { slug: "amasya", label: "Amasya", lat: 40.6533, lng: 35.8331, zoom: 12 },
      { slug: "ankara", label: "Ankara", lat: 39.9334, lng: 32.8597, zoom: 12 },
      { slug: "antalya", label: "Antalya", lat: 36.8969, lng: 30.7133, zoom: 12 },
      { slug: "artvin", label: "Artvin", lat: 41.1828, lng: 41.8183, zoom: 12 },
      { slug: "aydin", label: "Aydın", lat: 37.856, lng: 27.8416, zoom: 12 },
      { slug: "balikesir", label: "Balıkesir", lat: 39.6484, lng: 27.8826, zoom: 12 },
      { slug: "bilecik", label: "Bilecik", lat: 40.1506, lng: 29.9792, zoom: 12 },
      { slug: "bingol", label: "Bingöl", lat: 38.8855, lng: 40.4983, zoom: 12 },
      { slug: "bitlis", label: "Bitlis", lat: 38.3938, lng: 42.1232, zoom: 12 },
      { slug: "bolu", label: "Bolu", lat: 40.576, lng: 31.5788, zoom: 12 },
      { slug: "burdur", label: "Burdur", lat: 37.7183, lng: 30.2823, zoom: 12 },
      { slug: "bursa", label: "Bursa", lat: 40.1885, lng: 29.061, zoom: 12 },
      { slug: "canakkale", label: "Çanakkale", lat: 40.1553, lng: 26.4142, zoom: 12 },
      { slug: "cankiri", label: "Çankırı", lat: 40.6013, lng: 33.6134, zoom: 12 },
      { slug: "corum", label: "Çorum", lat: 40.5506, lng: 34.9556, zoom: 12 },
      { slug: "denizli", label: "Denizli", lat: 37.7765, lng: 29.0864, zoom: 12 },
      { slug: "diyarbakir", label: "Diyarbakır", lat: 37.9144, lng: 40.2306, zoom: 12 },
      { slug: "edirne", label: "Edirne", lat: 41.6771, lng: 26.5557, zoom: 12 },
      { slug: "elazig", label: "Elazığ", lat: 38.6748, lng: 39.2225, zoom: 12 },
      { slug: "erzincan", label: "Erzincan", lat: 39.75, lng: 39.5, zoom: 12 },
      { slug: "erzurum", label: "Erzurum", lat: 39.9043, lng: 41.2679, zoom: 12 },
      { slug: "eskisehir", label: "Eskişehir", lat: 39.7767, lng: 30.5206, zoom: 12 },
      { slug: "gaziantep", label: "Gaziantep", lat: 37.0662, lng: 37.3833, zoom: 12 },
      { slug: "giresun", label: "Giresun", lat: 40.9128, lng: 38.3895, zoom: 12 },
      { slug: "gumushane", label: "Gümüşhane", lat: 40.4603, lng: 39.4814, zoom: 12 },
      { slug: "hakkari", label: "Hakkari", lat: 37.5833, lng: 43.7333, zoom: 12 },
      { slug: "hatay", label: "Hatay", lat: 36.2023, lng: 36.1613, zoom: 12 },
      { slug: "isparta", label: "Isparta", lat: 37.7648, lng: 30.5566, zoom: 12 },
      { slug: "mersin", label: "Mersin", lat: 36.8121, lng: 34.6415, zoom: 12 },
      { slug: "istanbul", label: "İstanbul", lat: 41.0082, lng: 28.9784, zoom: 11 },
      { slug: "izmir", label: "İzmir", lat: 38.4237, lng: 27.1428, zoom: 12 },
      { slug: "kars", label: "Kars", lat: 40.6013, lng: 43.0975, zoom: 12 },
      { slug: "kastamonu", label: "Kastamonu", lat: 41.3887, lng: 33.7827, zoom: 12 },
      { slug: "kayseri", label: "Kayseri", lat: 38.7205, lng: 35.4826, zoom: 12 },
      { slug: "kirklareli", label: "Kırklareli", lat: 41.7351, lng: 27.2252, zoom: 12 },
      { slug: "kirsehir", label: "Kırşehir", lat: 39.1458, lng: 34.1606, zoom: 12 },
      { slug: "kocaeli", label: "Kocaeli", lat: 40.8533, lng: 29.8815, zoom: 12 },
      { slug: "konya", label: "Konya", lat: 37.8746, lng: 32.4932, zoom: 12 },
      { slug: "kutahya", label: "Kütahya", lat: 39.4167, lng: 29.9833, zoom: 12 },
      { slug: "malatya", label: "Malatya", lat: 38.3552, lng: 38.3095, zoom: 12 },
      { slug: "manisa", label: "Manisa", lat: 38.614, lng: 27.4296, zoom: 12 },
      { slug: "kahramanmaras", label: "Kahramanmaraş", lat: 37.5753, lng: 36.9228, zoom: 12 },
      { slug: "mardin", label: "Mardin", lat: 37.3122, lng: 40.735, zoom: 12 },
      { slug: "mugla", label: "Muğla", lat: 37.2153, lng: 28.3636, zoom: 12 },
      { slug: "mus", label: "Muş", lat: 38.9462, lng: 41.7539, zoom: 12 },
      { slug: "nevsehir", label: "Nevşehir", lat: 38.6244, lng: 34.7144, zoom: 12 },
      { slug: "nigde", label: "Niğde", lat: 37.9667, lng: 34.6833, zoom: 12 },
      { slug: "ordu", label: "Ordu", lat: 40.9862, lng: 37.8797, zoom: 12 },
      { slug: "rize", label: "Rize", lat: 41.0201, lng: 40.5234, zoom: 12 },
      { slug: "sakarya", label: "Sakarya", lat: 40.7569, lng: 30.3781, zoom: 12 },
      { slug: "samsun", label: "Samsun", lat: 41.2867, lng: 36.33, zoom: 12 },
      { slug: "siirt", label: "Siirt", lat: 37.9274, lng: 41.9453, zoom: 12 },
      { slug: "sinop", label: "Sinop", lat: 42.0231, lng: 35.1531, zoom: 12 },
      { slug: "sivas", label: "Sivas", lat: 39.7477, lng: 37.0179, zoom: 12 },
      { slug: "tekirdag", label: "Tekirdağ", lat: 40.978, lng: 27.511, zoom: 12 },
      { slug: "tokat", label: "Tokat", lat: 40.3167, lng: 36.55, zoom: 12 },
      { slug: "trabzon", label: "Trabzon", lat: 41.0027, lng: 39.7168, zoom: 12 },
      { slug: "tunceli", label: "Tunceli", lat: 39.1083, lng: 39.5483, zoom: 12 },
      { slug: "sanliurfa", label: "Şanlıurfa", lat: 37.1591, lng: 38.7969, zoom: 12 },
      { slug: "usak", label: "Uşak", lat: 38.6823, lng: 29.4082, zoom: 12 },
      { slug: "van", label: "Van", lat: 38.5012, lng: 43.3729, zoom: 12 },
      { slug: "yozgat", label: "Yozgat", lat: 39.82, lng: 34.8044, zoom: 12 },
      { slug: "zonguldak", label: "Zonguldak", lat: 41.4564, lng: 31.7987, zoom: 12 },
      { slug: "aksaray", label: "Aksaray", lat: 38.3687, lng: 34.037, zoom: 12 },
      { slug: "bayburt", label: "Bayburt", lat: 40.2552, lng: 40.2249, zoom: 12 },
      { slug: "karaman", label: "Karaman", lat: 37.1811, lng: 33.215, zoom: 12 },
      { slug: "kirikkale", label: "Kırıkkale", lat: 39.8468, lng: 33.5153, zoom: 12 },
      { slug: "batman", label: "Batman", lat: 37.8812, lng: 41.1351, zoom: 12 },
      { slug: "sirnak", label: "Şırnak", lat: 37.4187, lng: 42.4918, zoom: 12 },
      { slug: "bartin", label: "Bartın", lat: 41.5811, lng: 32.461, zoom: 12 },
      { slug: "ardahan", label: "Ardahan", lat: 41.1105, lng: 42.7022, zoom: 12 },
      { slug: "igdir", label: "Iğdır", lat: 39.9237, lng: 44.045, zoom: 12 },
      { slug: "yalova", label: "Yalova", lat: 40.65, lng: 29.2667, zoom: 12 },
      { slug: "karabuk", label: "Karabük", lat: 41.2061, lng: 32.6204, zoom: 12 },
      { slug: "kilis", label: "Kilis", lat: 36.7184, lng: 37.1212, zoom: 12 },
      { slug: "osmaniye", label: "Osmaniye", lat: 37.0742, lng: 36.2478, zoom: 12 },
      { slug: "duzce", label: "Düzce", lat: 40.8438, lng: 31.1565, zoom: 12 },
    ],
  },
  { slug: "kktc", label: "KKTC", cities: [
    { slug: "lefkosa", label: "Lefkoşa", lat: 35.1856, lng: 33.3823, zoom: 13 },
    { slug: "girne", label: "Girne", lat: 35.3417, lng: 33.3167, zoom: 13 },
    { slug: "gazimagusa", label: "Gazimağusa", lat: 35.125, lng: 33.95, zoom: 13 },
    { slug: "guzelyurt", label: "Güzelyurt", lat: 35.1987, lng: 32.9949, zoom: 13 },
    { slug: "iskele", label: "İskele", lat: 35.2872, lng: 33.8917, zoom: 13 },
    { slug: "lefke", label: "Lefke", lat: 35.1106, lng: 32.8497, zoom: 13 },
  ] },
  { slug: "gurcistan", label: "GÜRCİSTAN", cities: [
    { slug: "tiflis", label: "Tiflis", lat: 41.7151, lng: 44.8271, zoom: 12 },
    { slug: "batum", label: "Batum", lat: 41.6168, lng: 41.6367, zoom: 12 },
    { slug: "kutaisi", label: "Kutaisi", lat: 42.2679, lng: 42.6946, zoom: 12 },
    { slug: "rustavi", label: "Rustavi", lat: 41.5495, lng: 44.9932, zoom: 12 },
  ] },
  { slug: "azerbaycan", label: "AZERBAYCAN", cities: [
    { slug: "baku", label: "Bakü", lat: 40.4093, lng: 49.8671, zoom: 12 },
    { slug: "gence", label: "Gence", lat: 40.6828, lng: 46.3606, zoom: 12 },
    { slug: "sumgayit", label: "Sumgayıt", lat: 40.5855, lng: 49.6317, zoom: 12 },
    { slug: "seki", label: "Şeki", lat: 41.1919, lng: 47.1706, zoom: 12 },
    { slug: "lenkeran", label: "Lenkeran", lat: 38.7543, lng: 48.8506, zoom: 12 },
    { slug: "nahcivan", label: "Nahçıvan", lat: 39.2089, lng: 45.4122, zoom: 12 },
  ] },
  { slug: "arnavutluk", label: "ARNAVUTLUK", cities: [
    { slug: "tiran", label: "Tiran", lat: 41.3275, lng: 19.8187, zoom: 12 },
    { slug: "dirac", label: "Dıraç", lat: 41.3231, lng: 19.4414, zoom: 12 },
    { slug: "vlora", label: "Vlora", lat: 40.4661, lng: 19.4914, zoom: 12 },
    { slug: "iskodra", label: "İşkodra", lat: 42.0683, lng: 19.5126, zoom: 12 },
    { slug: "elbasan", label: "Elbasan", lat: 41.1125, lng: 20.0822, zoom: 12 },
  ] },
  { slug: "bosna-hersek", label: "BOSNA HERSEK", cities: [
    { slug: "saraybosna", label: "Saraybosna", lat: 43.8563, lng: 18.4131, zoom: 12 },
    { slug: "mostar", label: "Mostar", lat: 43.3438, lng: 17.8078, zoom: 12 },
    { slug: "banja-luka", label: "Banja Luka", lat: 44.7722, lng: 17.191, zoom: 12 },
    { slug: "tuzla", label: "Tuzla", lat: 44.5384, lng: 18.6671, zoom: 12 },
    { slug: "zenica", label: "Zenica", lat: 44.2034, lng: 17.9077, zoom: 12 },
  ] },
  { slug: "kosova", label: "KOSOVA", cities: [
    { slug: "pristine", label: "Priştine", lat: 42.6629, lng: 21.1655, zoom: 12 },
    { slug: "prizren", label: "Prizren", lat: 42.2139, lng: 20.7397, zoom: 12 },
    { slug: "peja-ipek", label: "Peja/İpek", lat: 42.6591, lng: 20.2883, zoom: 12 },
    { slug: "gjakova-yakova", label: "Gjakova/Yakova", lat: 42.3803, lng: 20.4308, zoom: 12 },
    { slug: "mitrovica", label: "Mitroviça", lat: 42.8906, lng: 20.8667, zoom: 12 },
  ] },
  { slug: "makedonya", label: "MAKEDONYA", cities: [
    { slug: "uskup", label: "Üsküp", lat: 41.9981, lng: 21.4254, zoom: 12 },
    { slug: "ohri", label: "Ohri", lat: 41.1231, lng: 20.8016, zoom: 12 },
    { slug: "manastir-bitola", label: "Manastır/Bitola", lat: 41.0314, lng: 21.3347, zoom: 12 },
    { slug: "kalkandelen-tetovo", label: "Kalkandelen/Tetovo", lat: 42.0069, lng: 20.9715, zoom: 12 },
    { slug: "gostivar", label: "Gostivar", lat: 41.8009, lng: 20.9142, zoom: 12 },
  ] },
  { slug: "sirbistan", label: "SIRBİSTAN", cities: [
    { slug: "belgrad", label: "Belgrad", lat: 44.7866, lng: 20.4489, zoom: 12 },
    { slug: "novi-sad", label: "Novi Sad", lat: 45.2671, lng: 19.8335, zoom: 12 },
    { slug: "nis", label: "Niş", lat: 43.3209, lng: 21.8958, zoom: 12 },
    { slug: "novi-pazar", label: "Novi Pazar", lat: 43.1367, lng: 20.5122, zoom: 12 },
    { slug: "subotica", label: "Subotica", lat: 46.1005, lng: 19.6651, zoom: 12 },
  ] },
];

const KESFET_DISCOVERY_VISIBLE_REGION_SLUGS = new Set(["turkiye", "kktc", "azerbaycan"]);

export const KESFET_PUBLIC_DISCOVERY_REGIONS: KesfetDiscoveryRegion[] = KESFET_DISCOVERY_REGIONS.filter((region) =>
  KESFET_DISCOVERY_VISIBLE_REGION_SLUGS.has(region.slug),
);

export const KESFET_DISCOVERY_CATEGORIES: KesfetDiscoveryCategory[] = [
  { slug: "yeme-icme-eglence", label: "Yeme, İçme ve Eğlence", icon: "🍽️", homepageSuperCategory: "siparis", storeType: "mekan_restoran", googlePlaceType: "restaurant", googleKeyword: "restoran lokanta özel işletme", autoImport: true, children: [
    { slug: "restoran-lokanta", label: "Restoranlar ve Lokantalar", icon: "🍽️", googlePlaceType: "restaurant", googleKeyword: "restoran lokanta" },
    { slug: "kafe-kahve", label: "Kafe ve Kahve Dükkanları", icon: "☕", googlePlaceType: "cafe", googleKeyword: "kafe kahve dükkanı" },
    { slug: "fast-food-sokak", label: "Fast Food ve Sokak Lezzetleri", icon: "🥙", googlePlaceType: "meal_takeaway", googleKeyword: "fast food sokak lezzetleri" },
    { slug: "pastane-firin", label: "Pastane, Fırın ve Unlu Mamuller", icon: "🥐", googlePlaceType: "bakery", googleKeyword: "pastane fırın unlu mamuller" },
    { slug: "gece-hayati", label: "Gece Hayatı ve Eğlence", icon: "🎶", googlePlaceType: "bar", googleKeyword: "bar canlı müzik eğlence mekanı", autoImport: false },
    { slug: "catering", label: "Catering", icon: "🍱", googlePlaceType: "meal_delivery", googleKeyword: "catering yemek organizasyonu" },
  ] },
  { slug: "alisveris-perakende", label: "Alışveriş, Perakende ve Mağazacılık", icon: "🛍️", homepageSuperCategory: "alisveris", storeType: "alisveris", googlePlaceType: "store", googleKeyword: "mağaza alışveriş özel işletme", autoImport: true, children: [
    { slug: "giyim-moda", label: "Giyim ve Moda", icon: "👕", googlePlaceType: "clothing_store", googleKeyword: "giyim moda mağazası" },
    { slug: "teknoloji-elektronik", label: "Teknoloji ve Elektronik", icon: "💻", googlePlaceType: "electronics_store", googleKeyword: "elektronik teknoloji mağazası" },
    { slug: "ev-tekstili-mobilya", label: "Ev Tekstili ve Mobilya", icon: "🛋️", googlePlaceType: "furniture_store", googleKeyword: "mobilya ev tekstili" },
    { slug: "gida-alisverisi", label: "Gıda Alışverişi", icon: "🧺", googlePlaceType: "grocery_or_supermarket", googleKeyword: "yerel market şarküteri gıda" },
    { slug: "taki-saat-kozmetik", label: "Takı, Saat ve Kozmetik", icon: "💍", googlePlaceType: "jewelry_store", googleKeyword: "takı saat kozmetik mağazası" },
  ] },
  { slug: "saglik-medikal-bakim", label: "Sağlık, Medikal ve Kişisel Bakım (Özel)", icon: "💆", homepageSuperCategory: "hizmet", storeType: "hizmet_guzellik", googlePlaceType: "beauty_salon", googleKeyword: "özel güzellik bakım medikal optik", autoImport: true, children: [
    { slug: "ozel-saglik", label: "Özel Sağlık Merkezleri", icon: "🏥", googleKeyword: "özel klinik özel sağlık merkezi", autoImport: false },
    { slug: "diyet-psikoloji", label: "Diyet ve Psikoloji", icon: "🧠", googleKeyword: "özel diyetisyen psikolog danışmanlık", autoImport: false },
    { slug: "guzellik-bakim", label: "Güzellik ve Bakım", icon: "✂️", googlePlaceType: "beauty_salon", googleKeyword: "güzellik salonu kuaför bakım" },
    { slug: "medikal-optik", label: "Medikal/Optik", icon: "👓", googlePlaceType: "store", googleKeyword: "medikal optik mağazası" },
  ] },
  { slug: "otomotiv", label: "Otomotiv ve Araç Dünyası", icon: "🚗", homepageSuperCategory: "hizmet", storeType: "hizmet_tamir", googlePlaceType: "car_repair", googleKeyword: "oto servis oto tamir", autoImport: true, children: [
    { slug: "satis-kiralama", label: "Satış ve Kiralama", icon: "🚘", googlePlaceType: "car_rental", googleKeyword: "oto galeri araç kiralama" },
    { slug: "bakim-onarim-servis", label: "Bakım/Onarım/Servis", icon: "🔧", googlePlaceType: "car_repair", googleKeyword: "oto bakım onarım servis" },
    { slug: "kozmetik-aksesuar", label: "Kozmetik/Aksesuar", icon: "✨", googlePlaceType: "car_repair", googleKeyword: "oto kuaför oto aksesuar" },
    { slug: "destek-hizmetleri", label: "Destek Hizmetleri", icon: "🧰", googlePlaceType: "car_repair", googleKeyword: "oto ekspertiz çekici yol yardım" },
  ] },
  { slug: "insaat-emlak-dekorasyon", label: "İnşaat, Emlak ve Ev Dekorasyonu", icon: "🏗️", homepageSuperCategory: "hizmet", storeType: "hizmet_ev", googlePlaceType: "store", googleKeyword: "emlak tadilat dekorasyon yapı", autoImport: true, children: [
    { slug: "emlak", label: "Emlak", icon: "🏠", googlePlaceType: "real_estate_agency", googleKeyword: "emlak ofisi gayrimenkul" },
    { slug: "mimarlik-muhendislik", label: "Mimarlık/Mühendislik", icon: "📐", googlePlaceType: "store", googleKeyword: "mimarlık mühendislik ofisi" },
    { slug: "tadilat-dekorasyon", label: "Tadilat/Dekorasyon", icon: "🧱", googlePlaceType: "home_goods_store", googleKeyword: "tadilat dekorasyon" },
    { slug: "yapi-malzemeleri", label: "Yapı Malzemeleri", icon: "🪚", googlePlaceType: "hardware_store", googleKeyword: "yapı malzemeleri hırdavat" },
    { slug: "iklimlendirme-tesisat", label: "İklimlendirme/Tesisat", icon: "🚿", googlePlaceType: "plumber", googleKeyword: "tesisat iklimlendirme klima" },
  ] },
  { slug: "egitim-kurs", label: "Eğitim, Kurs ve Kişisel Gelişim (Özel)", icon: "📚", homepageSuperCategory: "hizmet", storeType: "hizmet_egitim", googlePlaceType: "store", googleKeyword: "özel kurs eğitim merkezi", autoImport: true, children: [
    { slug: "ozel-okullar", label: "Özel Okullar", icon: "🏫", googleKeyword: "özel okul kolej", autoImport: false },
    { slug: "sinav-hazirlik-kurs", label: "Sınav Hazırlık ve Kurslar", icon: "📝", googlePlaceType: "store", googleKeyword: "özel dershane sınav hazırlık kursu" },
    { slug: "dil-yetenek-kurslari", label: "Dil/Yetenek Kursları", icon: "🎨", googlePlaceType: "store", googleKeyword: "dil kursu sanat müzik kursu" },
    { slug: "mesleki-egitim", label: "Mesleki Eğitimler", icon: "🧑‍🏭", googlePlaceType: "store", googleKeyword: "mesleki eğitim kursu özel" },
  ] },
  { slug: "profesyonel-hizmetler", label: "Profesyonel Hizmetler ve Kurumsal Danışmanlık", icon: "💼", homepageSuperCategory: "hizmet", storeType: "hizmet_kurumsal", googlePlaceType: "store", googleKeyword: "kurumsal danışmanlık ajans hizmet", autoImport: true, children: [
    { slug: "hukuk-maliye", label: "Hukuk ve Maliye", icon: "⚖️", googlePlaceType: "lawyer", googleKeyword: "avukat mali müşavir danışmanlık" },
    { slug: "reklam-dijital", label: "Reklam/Dijital Pazarlama", icon: "📣", googlePlaceType: "store", googleKeyword: "reklam ajansı dijital pazarlama" },
    { slug: "organizasyon", label: "Organizasyon", icon: "🎈", googlePlaceType: "store", googleKeyword: "organizasyon firması etkinlik" },
    { slug: "finans-sigorta", label: "Finans ve Sigorta", icon: "🛡️", googlePlaceType: "insurance_agency", googleKeyword: "sigorta acentesi finans danışmanlığı" },
    { slug: "is-guvenligi-temizlik-tercume", label: "İş Güvenliği/Temizlik/Tercüme", icon: "🧹", googlePlaceType: "store", googleKeyword: "iş güvenliği temizlik tercüme bürosu" },
  ] },
  { slug: "ev-esnaf-hizmetleri", label: "Ev ve Esnaf Hizmetleri", icon: "🛠️", homepageSuperCategory: "mekan_dukkan", storeType: "hizmet_esnaf", googlePlaceType: "store", googleKeyword: "esnaf ev hizmetleri", autoImport: true, children: [
    { slug: "ev-hizmetleri", label: "Ev Hizmetleri", icon: "🏡", googlePlaceType: "plumber", googleKeyword: "ev hizmetleri tesisat elektrik temizlik" },
    { slug: "mahalle-esnafi", label: "Mahalle Esnafı", icon: "🏪", googlePlaceType: "store", googleKeyword: "mahalle esnafı yerel dükkan" },
    { slug: "lojistik-tasima", label: "Lojistik ve Taşıma", icon: "🚚", googlePlaceType: "moving_company", googleKeyword: "nakliyat lojistik taşıma" },
  ] },
  { slug: "spor-yasam-pet", label: "Spor, Yaşam ve Evcil Hayvan Hizmetleri", icon: "🏋️", homepageSuperCategory: "hizmet", storeType: "hizmet_yasam", googlePlaceType: "gym", googleKeyword: "spor salonu pet hizmetleri", autoImport: true, children: [
    { slug: "spor-salonlari", label: "Spor Salonları", icon: "🏋️", googlePlaceType: "gym", googleKeyword: "spor salonu fitness pilates" },
    { slug: "pet-hizmetleri", label: "Pet hizmetleri", icon: "🐾", googlePlaceType: "pet_store", googleKeyword: "pet kuaför veteriner petshop" },
  ] },
  { slug: "turizm-konaklama-seyahat", label: "Turizm, Konaklama ve Seyahat", icon: "✈️", homepageSuperCategory: "turizm", storeType: "turizm", googlePlaceType: "lodging", googleKeyword: "otel seyahat acentesi turizm", autoImport: true, children: [
    { slug: "konaklama", label: "Konaklama", icon: "🏨", googlePlaceType: "lodging", googleKeyword: "otel butik otel pansiyon konaklama" },
    { slug: "seyahat", label: "Seyahat", icon: "🧳", googlePlaceType: "travel_agency", googleKeyword: "seyahat acentesi tur şirketi" },
  ] },
];

export const KESFET_DISCOVERY_META_FILTERS = [
  { slug: "open-now", label: "7/24 Açık / Nöbetçi", enabled: false },
  { slug: "delivery", label: "Evlere Servis Var", enabled: true },
  { slug: "card", label: "Kredi Kartı Geçerli", enabled: false },
] as const;

export function findKesfetDiscoveryRegion(slug: string | null | undefined): KesfetDiscoveryRegion | undefined {
  return KESFET_DISCOVERY_REGIONS.find((region) => region.slug === slug);
}

export function findKesfetDiscoveryCity(regionSlug: string | null | undefined, citySlug: string | null | undefined): KesfetDiscoveryCity | undefined {
  return findKesfetDiscoveryRegion(regionSlug)?.cities.find((city) => city.slug === citySlug);
}

export function findKesfetDiscoveryCategory(slug: string | null | undefined): {
  top: KesfetDiscoveryCategory;
  child?: KesfetDiscoveryCategory["children"][number];
} | undefined {
  for (const top of KESFET_DISCOVERY_CATEGORIES) {
    if (top.slug === slug) return { top };
    const child = top.children.find((item) => item.slug === slug);
    if (child) return { top, child };
  }
  return undefined;
}

export function buildKesfetDiscoveryImportJobs(top: KesfetDiscoveryCategory): Array<{
  slug: string;
  keyword: string;
  googlePlaceType?: string;
  storeType: string;
  homepageSuperCategory: string;
}> {
  const jobs = [
    {
      slug: top.slug,
      keyword: top.googleKeyword,
      googlePlaceType: top.googlePlaceType,
      storeType: top.storeType,
      homepageSuperCategory: top.homepageSuperCategory,
      autoImport: top.autoImport,
    },
    ...top.children.map((child) => ({
      slug: child.slug,
      keyword: child.googleKeyword,
      googlePlaceType: child.googlePlaceType ?? top.googlePlaceType,
      storeType: child.storeType ?? top.storeType,
      homepageSuperCategory: top.homepageSuperCategory,
      autoImport: child.autoImport ?? top.autoImport,
    })),
  ];

  return jobs
    .filter((job) => job.autoImport !== false && job.keyword.trim())
    .map(({ autoImport: _autoImport, ...job }) => job);
}
