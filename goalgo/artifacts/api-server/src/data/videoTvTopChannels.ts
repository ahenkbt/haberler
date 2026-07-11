import type { VideoTvPreset } from "./videoTvPresets.js";

/**
 * Kategori başına yüksek aboneli, doğrulanmış Türkiye YouTube kanalları.
 * API anahtarı yoksa veya keşif yetersiz kalırsa yedek olarak kullanılır.
 */
export const VIDEO_TV_TOP_CHANNEL_SUPPLEMENT: VideoTvPreset[] = [
  // Dizi
  { name: "ATV", channelId: "@atv", category: "dizi" },
  { name: "TV8", channelId: "@TV8", category: "dizi" },
  { name: "NOW", channelId: "@NOWTVTurkiye", category: "dizi" },
  { name: "Kanal 7", channelId: "@Kanal7", category: "dizi" },
  { name: "TV4", channelId: "@tv4", category: "dizi" },
  { name: "Euro D", channelId: "@EuroD", category: "dizi" },
  { name: "Teve2", channelId: "@teve2", category: "dizi" },
  { name: "360", channelId: "@360TV", category: "dizi" },

  // Oyun
  { name: "Elraenn", channelId: "@Elraenn", category: "oyun" },
  { name: "Doğu Kapısı", channelId: "@dogukapisi", category: "oyun" },
  { name: "Mami Emre", channelId: "@MamiEmre", category: "oyun" },
  { name: "Uras", channelId: "@Uras", category: "oyun" },
  { name: "Yiğitcan Erdoğan", channelId: "@YigitCanErdogan", category: "oyun" },
  { name: "Hype", channelId: "@Hype", category: "oyun" },
  { name: "Levo", channelId: "@Levo", category: "oyun" },
  { name: "Pque", channelId: "@Pque", category: "oyun" },

  // Eğlence
  { name: "Enes Batur", channelId: "UCB3azBBFDWwIHDIAeRRfcYg", category: "eglence" },
  { name: "Danla Bilic", channelId: "UCJXKKGzjjqnHAEkJsdC7ZKw", category: "eglence" },
  { name: "Orkun Işıtmak", channelId: "UCIXYyHANDvinQMIdauzSNJA", category: "eglence" },
  { name: "Reynmen", channelId: "@Reynmen", category: "eglence" },
  { name: "Sefa Akdoğan", channelId: "@SefaAkdogan", category: "eglence" },
  { name: "Efe Uygaç", channelId: "@EfeUygac", category: "eglence" },
  { name: "Burak Oyunda", channelId: "@BurakOyunda", category: "eglence" },
  { name: "Mertcan Bahadır", channelId: "@MertCanBahadir", category: "eglence" },

  // Komedi
  { name: "Kafalar", channelId: "UCKMr-eDHmppbCCwzfWMghAg", category: "komedi" },
  { name: "Cem Yılmaz", channelId: "@CemYilmaz", category: "komedi" },
  { name: "BKM", channelId: "@BKM", category: "komedi" },
  { name: "CMYLMZ", channelId: "@CMYLMZ", category: "komedi" },
  { name: "Güldür Güldür", channelId: "@GuldurGuldur", category: "komedi" },
  { name: "Çok Güzel Hareketler", channelId: "@CokGuzelHareketler", category: "komedi" },

  // Sinema (ek)
  { name: "Warner Bros Türkiye", channelId: "@WarnerBrosTurkiye", category: "sinema" },
  { name: "Universal Pictures TR", channelId: "@UniversalPicturesTR", category: "sinema" },
  { name: "MUBI Türkiye", channelId: "@MUBITurkiye", category: "sinema" },
  { name: "Paribu Cineverse", channelId: "@ParibuCineverse", category: "sinema" },

  // Müzik (ek)
  { name: "MuzikPlay", channelId: "@MuzikPlay", category: "muzik" },
  { name: "Sony Music Türkiye", channelId: "@SonyMusicTurkiye", category: "muzik" },
  { name: "Emre Aydın", channelId: "@EmreAydin", category: "muzik" },
  { name: "Murda", channelId: "@Murda", category: "muzik" },
  { name: "Blok3", channelId: "@Blok3", category: "muzik" },

  // Spor (ek)
  { name: "S Sport", channelId: "@SSport", category: "spor" },
  { name: "Sporx", channelId: "@Sporx", category: "spor" },
  { name: "A Spor", channelId: "@ASpor", category: "spor" },
  { name: "TRT Spor", channelId: "@TRTSpor", category: "spor" },
  { name: "Basketbol Süper Ligi", channelId: "@BSLOfficial", category: "spor" },

  // Bilim / Teknoloji
  { name: "Meraklısı İçin", channelId: "@MeraklisiIcin", category: "bilim" },
  { name: "AstronotTV", channelId: "@AstronotTV", category: "bilim" },
  { name: "Hardware Plus", channelId: "@HardwarePlus", category: "teknoloji" },
  { name: "Meraklısına Teknoloji", channelId: "@MeraklisiTeknoloji", category: "teknoloji" },
  { name: "Chip Online", channelId: "@ChipOnline", category: "teknoloji" },

  // Eğitim
  { name: "YKS Pro", channelId: "@YKSPro", category: "egitim" },
  { name: "Kenan Kara", channelId: "@KenanKara", category: "egitim" },
  { name: "Uğur Böceği", channelId: "@UgurBocegi", category: "egitim" },
  { name: "Rehber Matematik", channelId: "@RehberMatematik", category: "egitim" },
  { name: "Tonguç Akademi", channelId: "@TongucAkademi", category: "egitim" },

  // Seyahat
  { name: "Onuralp", channelId: "@Onuralp", category: "seyahat" },
  { name: "Gezginler Kulübü", channelId: "@GezginlerKulubu", category: "seyahat" },
  { name: "Go Türkiye", channelId: "@GoTurkiye", category: "seyahat" },
  { name: "Kültür ve Turizm Bakanlığı", channelId: "@GoTurkiyeOfficial", category: "seyahat" },

  // Otomobil
  { name: "Garaj11", channelId: "@Garaj11", category: "otomobil" },
  { name: "Otomobil Günlüklerim", channelId: "@OtomobilGunluklerim", category: "otomobil" },
  { name: "Motor1 Türkiye", channelId: "@Motor1Turkiye", category: "otomobil" },
  { name: "Arabalar.com.tr", channelId: "@Arabalarcomtr", category: "otomobil" },

  // Evcil hayvan / Doğa
  { name: "Nat Geo Wild Türkiye", channelId: "@NatGeoWildTurkiye", category: "evcil-hayvan" },
  { name: "Hayvan Dostu", channelId: "@HayvanDostu", category: "evcil-hayvan" },
  { name: "BBC Earth Türkçe", channelId: "@BBCEarthTurkce", category: "doga" },
  { name: "TRT Belgesel", channelId: "@trtbelgesel", category: "doga" },

  // Nasıl yapılır
  { name: "Harun Mumcu", channelId: "@HarunMumcu", category: "nasil-yapilir" },
  { name: "Refika'nın Mutfağı", channelId: "@RefikaninMutfagi", category: "nasil-yapilir" },
  { name: "Yemek.com", channelId: "@Yemekcom", category: "nasil-yapilir" },
  { name: "Nusret", channelId: "@Nusret", category: "nasil-yapilir" },

  // Vlog
  { name: "Mesut Süre", channelId: "@MesutSure", category: "vlog" },
  { name: "Sefa Akdoğan", channelId: "@SefaAkdoganOfficial", category: "vlog" },

  // Tarih
  { name: "Belgesel TV", channelId: "@BelgeselTV", category: "tarih" },
  { name: "Tarih Profesörü", channelId: "@TarihProfesoru", category: "tarih" },
  { name: "Tarih Vakfı", channelId: "@TarihVakfi", category: "tarih" },

  // Sağlık
  { name: "Acıbadem", channelId: "@Acibadem", category: "saglik" },
  { name: "Memorial Sağlık", channelId: "@MemorialSaglik", category: "saglik" },
  { name: "Anadolu Sağlık", channelId: "@AnadoluSaglik", category: "saglik" },

  // Çocuk
  { name: "DreamWorks Türkiye", channelId: "@DreamWorksTurkiye", category: "cocuk" },
  { name: "Nickelodeon Türkiye", channelId: "@NickelodeonTurkiye", category: "cocuk" },
  { name: "BabyTV Türkiye", channelId: "@BabyTVTurkiye", category: "cocuk" },
  { name: "Da Vinci Kids TR", channelId: "@DaVinciKidsTR", category: "cocuk" },
];

/** Podcast içeriği güçlü kanallar */
export const VIDEO_TV_TOP_PODCAST_CHANNEL_SUPPLEMENT: VideoTvPreset[] = [
  { name: "101 Podcast", channelId: "@101Podcast", category: "eglence" },
  { name: "Medyascope", channelId: "@MedyascopeTV", category: "haberler" },
  { name: "Neva Podcast", channelId: "@NevaPodcast", category: "eglence" },
  { name: "Podcast Türkiye", channelId: "@PodcastTurkiye", category: "eglence" },
  { name: "Acık Radyo", channelId: "@AcikRadyo", category: "haberler" },
  { name: "Bi' Konu", channelId: "@BiKonu", category: "eglence" },
  { name: "Socrates", channelId: "@SocratesDergi", category: "spor" },
  { name: "Spotify Podcast Türkiye", channelId: "@SpotifyPodcastTurkiye", category: "muzik" },
  { name: "Kafa Radyo", channelId: "@KafaRadyo", category: "muzik" },
  { name: "Ekşi Sözlük Podcast", channelId: "@EksoPodcast", category: "eglence" },
  { name: "Onedio", channelId: "@Onedio", category: "eglence" },
  { name: "İşin Aslı", channelId: "@IsinAsli", category: "haberler" },
  { name: "Tarih ve Felsefe", channelId: "@TarihveFelsefe", category: "tarih" },
  { name: "Evrim Ağacı Podcast", channelId: "UCatnasFAiXUvWwH8NlSdd3A", category: "bilim" },
  { name: "Barış Özcan", channelId: "@Barisozcan", category: "teknoloji" },
];

/** Preset + supplement birleşik liste (channelId ile tekilleştirilmiş) */
export function mergeVideoTvChannelPresets(base: VideoTvPreset[], ...extras: VideoTvPreset[][]): VideoTvPreset[] {
  const seen = new Set<string>();
  const out: VideoTvPreset[] = [];
  for (const p of [base, ...extras].flat()) {
    const key = p.channelId.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}
