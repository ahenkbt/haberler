/**
 * Hazır YouTube kaynakları — YouTube ana kategorilerine göre gruplanmış.
 * category: videoTvCategories slug (haberler, sinema, muzik, oyun, …)
 */
export type VideoTvPreset = {
  name: string;
  channelId: string;
  category: string;
  logoUrl?: string;
};

export const VIDEO_TV_PRESETS: VideoTvPreset[] = [
  // Haberler ve Politika
  { name: "NTV", channelId: "UC9TDTjbOjFB9jADmPhSAPsw", category: "haberler" },
  { name: "CNN Türk", channelId: "UCV6zcRug6Hqp1UX_FdyUeBg", category: "haberler" },
  { name: "TRT Haber", channelId: "UCBgTP2LOFVPmq15W-RH-WXA", category: "haberler" },
  { name: "Sözcü TV", channelId: "UCOulx_rep5O4i9y6AyDqVvw", category: "haberler" },
  { name: "Haber Global", channelId: "UCtc-a9ZUIg0_5HpsPxEO7Qg", category: "haberler" },
  { name: "A Haber", channelId: "UCKQhfw-lzz0uKnE1fY1PsAA", category: "haberler" },
  { name: "Habertürk", channelId: "UClGZC_r-sUcBdElAtDSrQ5g", category: "haberler" },
  { name: "TRT World", channelId: "UC7fWeaHhqgM4Ry-RMpM2YYw", category: "haberler" },
  { name: "Kanal D Haber", channelId: "UCvPn-DTYJmoOqflHDrW7cvQ", category: "haberler" },
  { name: "TV100", channelId: "UCndsdUW_oPLqpQJY9J8oIRg", category: "haberler" },
  { name: "Ulusal Kanal", channelId: "@UlusalKanal", category: "haberler" },

  // Film ve Animasyon (Sinema)
  { name: "Netflix Türkiye", channelId: "@NetflixTurkiye", category: "sinema" },
  { name: "bluTV", channelId: "@blutv", category: "sinema" },
  { name: "Digiturk Play", channelId: "@DigiturkPlay", category: "sinema" },
  { name: "FilmBox Türkiye", channelId: "@FilmBoxTurkiye", category: "sinema" },
  { name: "Komedi Türk", channelId: "@KomediTurk", category: "sinema" },
  { name: "Film Adresi", channelId: "@FilmAdresi", category: "sinema" },
  { name: "Lav Film", channelId: "@LavFilm", category: "sinema" },
  { name: "Fanatik Film", channelId: "@FanatikFilm", category: "sinema" },
  { name: "Sinema Burada", channelId: "@SinemaBurada", category: "sinema" },
  { name: "Disney Türkiye", channelId: "@DisneyTurkiye", category: "sinema" },

  // Dizi
  { name: "puhutv", channelId: "@puhutv", category: "dizi" },
  { name: "Exxen", channelId: "@Exxen", category: "dizi" },
  { name: "Gain Medya", channelId: "@gainmedya", category: "dizi" },
  { name: "Tabii", channelId: "@tabii", category: "dizi" },
  { name: "TRT 1", channelId: "@trt1", category: "dizi" },
  { name: "Kanal D", channelId: "@KanalD", category: "dizi" },
  { name: "Show TV", channelId: "@ShowTV", category: "dizi" },
  { name: "Star TV", channelId: "@StarTV", category: "dizi" },

  // Müzik
  { name: "netd müzik", channelId: "@netdmuzik", category: "muzik" },
  { name: "Poll Production", channelId: "@PollProduction", category: "muzik" },
  { name: "DMC", channelId: "@DMC", category: "muzik" },
  { name: "Türk Telekom Müzik", channelId: "@TurkTelekomMuzik", category: "muzik" },
  { name: "MuzikPlay", channelId: "@MuzikPlay", category: "muzik" },
  { name: "Hadise", channelId: "@Hadise", category: "muzik" },
  { name: "Tarkan", channelId: "@Tarkan", category: "muzik" },
  { name: "Sertab Erener", channelId: "@SertabErener", category: "muzik" },

  // Oyun
  { name: "Pintii", channelId: "@Pintii", category: "oyun" },
  { name: "Mithrain", channelId: "@Mithrain", category: "oyun" },
  { name: "Elwind", channelId: "@Elwind", category: "oyun" },
  { name: "Barış G", channelId: "@BarisG", category: "oyun" },
  { name: "Jahrein", channelId: "@Jahrein", category: "oyun" },
  { name: "WTCN", channelId: "@WTCN", category: "oyun" },
  { name: "Pque", channelId: "@Pque", category: "oyun" },

  // Spor
  { name: "beIN SPORTS Türkiye", channelId: "UCPe9vNjHF1kEExT5kHwc7aw", category: "spor" },
  { name: "NTV Spor", channelId: "UCGMghpDmBAqhz2p7eLHX-eg", category: "spor" },
  { name: "Fenerbahçe SK", channelId: "UCgqlho3-8a6FmDqQm7Q6gJw", category: "spor" },
  { name: "Galatasaray", channelId: "UCQpeujIamj2ZOKXZnrxTRhA", category: "spor" },
  { name: "Beşiktaş JK", channelId: "UCLJVUlpsxZcIMECVDcZaM2g", category: "spor" },
  { name: "Trabzonspor", channelId: "UCnZoe1ncVK7ApLBPfpZ_LEA", category: "spor" },
  { name: "TFF", channelId: "@tfforg", category: "spor" },
  { name: "S Sport", channelId: "@SSport", category: "spor" },

  // Eğlence
  { name: "Tiwi", channelId: "@TiwiWorld", category: "eglence" },
  { name: "Danla Bilic", channelId: "UCJXKKGzjjqnHAEkJsdC7ZKw", category: "eglence" },
  { name: "Enes Batur", channelId: "UCB3azBBFDWwIHDIAeRRfcYg", category: "eglence" },
  { name: "Orkun Işıtmak", channelId: "UCIXYyHANDvinQMIdauzSNJA", category: "eglence" },
  { name: "Sera Hobil", channelId: "@SeraHobil", category: "eglence" },

  // Komedi
  { name: "Kafalar", channelId: "UCKMr-eDHmppbCCwzfWMghAg", category: "komedi" },
  { name: "Reynmen", channelId: "@Reynmen", category: "komedi" },
  { name: "Cem Yılmaz", channelId: "@CemYilmaz", category: "komedi" },
  { name: "BKM", channelId: "@BKM", category: "komedi" },
  { name: "CMYLMZ", channelId: "@CMYLMZ", category: "komedi" },

  // Bilim ve Teknoloji
  { name: "Evrim Ağacı", channelId: "UCatnasFAiXUvWwH8NlSdd3A", category: "bilim" },
  { name: "TÜBİTAK", channelId: "UCVnUU2RGifgyZexLW7_g9Zg", category: "bilim" },
  { name: "Barış Özcan", channelId: "@Barisozcan", category: "teknoloji" },
  { name: "ShiftDelete.Net", channelId: "@ShiftDeleteNet", category: "teknoloji" },
  { name: "Webtekno", channelId: "@Webtekno", category: "teknoloji" },
  { name: "Donanım Arşivi", channelId: "@DonanimArsivi", category: "teknoloji" },
  { name: "Technopat", channelId: "@Technopat", category: "teknoloji" },

  // Eğitim
  { name: "Khan Academy Türkçe", channelId: "@khanacademytr", category: "egitim" },
  { name: "Duolingo Türkiye", channelId: "@DuolingoTurkiye", category: "egitim" },
  { name: "Matematik Fakültesi", channelId: "@MatematikFakultesi", category: "egitim" },
  { name: "Biosem", channelId: "@Biosem", category: "egitim" },
  { name: "Tarih Vakfı", channelId: "@TarihVakfi", category: "egitim" },

  // Seyahat ve Etkinlikler
  { name: "Gezginler Kulübü", channelId: "@GezginlerKulubu", category: "seyahat" },
  { name: "Seyahat Rehberi", channelId: "@SeyahatRehberi", category: "seyahat" },
  { name: "Go Türkiye", channelId: "@GoTurkiye", category: "seyahat" },

  // Otomobiller ve Araçlar
  { name: "Otomobil Günlüklerim", channelId: "@OtomobilGunluklerim", category: "otomobil" },
  { name: "Autoblog Türkiye", channelId: "@AutoblogTurkiye", category: "otomobil" },
  { name: "Motor1 Türkiye", channelId: "@Motor1Turkiye", category: "otomobil" },
  { name: "Arabalar.com.tr", channelId: "@Arabalarcomtr", category: "otomobil" },

  // Evcil Hayvanlar
  { name: "Pati TV", channelId: "@PatiTV", category: "evcil-hayvan" },
  { name: "Hayvan Dostu", channelId: "@HayvanDostu", category: "evcil-hayvan" },
  { name: "Nat Geo Wild Türkiye", channelId: "@NatGeoWildTurkiye", category: "evcil-hayvan" },

  // Doğa
  { name: "National Geographic Türkiye", channelId: "@NationalGeographicTurkiye", category: "doga" },
  { name: "TRT Belgesel", channelId: "@trtbelgesel", category: "doga" },
  { name: "BBC Earth Türkçe", channelId: "@BBCEarthTurkce", category: "doga" },

  // Nasıl Yapılır ve Stil
  { name: "Refika'nın Mutfağı", channelId: "@RefikaninMutfagi", category: "nasil-yapilir" },
  { name: "Yemek.com", channelId: "@Yemekcom", category: "nasil-yapilir" },
  { name: "Muge Yorulmaz", channelId: "@MugeYorulmaz", category: "nasil-yapilir" },
  { name: "Elif Yılmaz", channelId: "@ElifYilmaz", category: "nasil-yapilir" },

  // Kişiler ve Bloglar (Vlog)
  { name: "Nusret", channelId: "@Nusret", category: "vlog" },
  { name: "Mesut Süre", channelId: "@MesutSure", category: "vlog" },
  { name: "Efe Uygaç", channelId: "@EfeUygac", category: "vlog" },

  // Tarih
  { name: "DFT Tarih", channelId: "UCM6yE-Zb4l8hHyz7AsxQpRQ", category: "tarih" },
  { name: "Tarih Profesörü", channelId: "@TarihProfesoru", category: "tarih" },

  // Sağlık
  { name: "Acıbadem", channelId: "@Acibadem", category: "saglik" },
  { name: "Doktor Takvimi", channelId: "@DoktorTakvimi", category: "saglik" },
  { name: "NTV Sağlık", channelId: "@NTVSaglik", category: "saglik" },
  { name: "Memorial Sağlık", channelId: "@MemorialSaglik", category: "saglik" },

  // Çocuk
  { name: "TRT Çocuk", channelId: "@trtcocuk", category: "cocuk" },
  { name: "Minika", channelId: "@Minika", category: "cocuk" },
  { name: "Cartoon Network Türkiye", channelId: "@CartoonNetworkTurkiye", category: "cocuk" },
  { name: "Disney Junior Türkiye", channelId: "@DisneyJuniorTurkiye", category: "cocuk" },
];

/** Admin filtreleri için benzersiz kategori slug listesi (sıralı) */
export function videoTvPresetCategorySlugs(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of VIDEO_TV_PRESETS) {
    if (!seen.has(p.category)) {
      seen.add(p.category);
      out.push(p.category);
    }
  }
  return out.sort((a, b) => a.localeCompare(b, "tr"));
}
