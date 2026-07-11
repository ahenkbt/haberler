import type { VideoTvPreset } from "./videoTvPresets.js";
import { VIDEO_TV_PRESETS } from "./videoTvPresets.js";
import { mergeVideoTvChannelPresets, VIDEO_TV_TOP_CHANNEL_SUPPLEMENT } from "./videoTvTopChannels.js";

/**
 * YouTube Kids tarzı Türkçe çocuk kanalları — müzik, öğrenme, çizgi film ve keşif.
 */
export const VIDEO_TV_KIDS_CHANNEL_SUPPLEMENT: VideoTvPreset[] = [
  // Şovlar / çizgi film
  { name: "Niloya", channelId: "@NiloyaResmi", category: "cocuk" },
  { name: "Kukuli", channelId: "@KukuliTV", category: "cocuk" },
  { name: "Rafadan Tayfa", channelId: "@RafadanTayfa", category: "cocuk" },
  { name: "Elif ve Arkadaşları", channelId: "@ElifveArkadaslari", category: "cocuk" },
  { name: "Adabını Bilen Genç", channelId: "@AdibiniBilenGenc", category: "cocuk" },
  { name: "Peppa Pig Türkçe", channelId: "@PeppaPigTurkce", category: "cocuk" },
  { name: "Masha ve Ayı Türkçe", channelId: "@MashaVeAyiTurkce", category: "cocuk" },
  { name: "PAW Patrol Türkçe", channelId: "@PAWPatrolTurkce", category: "cocuk" },
  { name: "Pocoyo Türkçe", channelId: "@PocoyoTurkce", category: "cocuk" },
  { name: "Oddbods Türkçe", channelId: "@OddbodsTurkce", category: "cocuk" },
  { name: "Larva TUBA", channelId: "@LarvaTUBA", category: "cocuk" },
  { name: "Pororo Türkçe", channelId: "@PororoTurkce", category: "cocuk" },
  { name: "Tayo Küçük Otobüs", channelId: "@TayoTurkce", category: "cocuk" },
  { name: "Robocar Poli Türkçe", channelId: "@RobocarPoliTurkce", category: "cocuk" },
  { name: "Fixies Türkçe", channelId: "@FixiesTurkce", category: "cocuk" },

  // Müzik / bebek
  { name: "CoComelon Türkçe", channelId: "@CoComelonTurkce", category: "cocuk" },
  { name: "Pinkfong Türkçe", channelId: "@PinkfongTurkce", category: "cocuk" },
  { name: "Super Simple Türkçe", channelId: "@SuperSimpleTurkce", category: "cocuk" },
  { name: "Morphle Türkçe", channelId: "@MorphleTurkce", category: "cocuk" },
  { name: "Blippi Türkçe", channelId: "@BlippiTurkce", category: "cocuk" },

  // Öğrenme
  { name: "TRT Okul", channelId: "@trtokul", category: "cocuk" },
  { name: "Da Vinci Kids TR", channelId: "@DaVinciKidsTR", category: "cocuk" },
  { name: "Khan Academy Türkçe", channelId: "@khanacademytr", category: "cocuk" },

  // Masal / hikâye
  { name: "Masal Oku", channelId: "@MasalOku", category: "cocuk" },
  { name: "Sesli Çizgi Filmler", channelId: "@SesliCizgiFilmler", category: "cocuk" },
  { name: "CBeebies Türkçe", channelId: "@CbeebiesTurkce", category: "cocuk" },
];

/** Çocuk alt kategorileri için YouTube arama sorguları (YouTube Kids benzeri) */
export const KIDS_CATEGORY_IMPORT_QUERIES: Record<string, string[]> = {
  onerilen: ["çocuk videoları türkçe", "youtube kids türkçe", "çocuk eğlence türkçe"],
  muzik: ["çocuk şarkıları türkçe", "nursery rhymes türkçe", "bebeler için müzik", "cocomelon türkçe"],
  kesfet: ["çocuk macera türkçe", "çocuk keşfet", "eğlenceli çocuk videoları"],
  ogrenme: ["eğitici çocuk videoları türkçe", "okul öncesi türkçe", "alfabe öğrenme türkçe", "sayılar öğrenme"],
  sovlar: ["çizgi film türkçe", "niloya türkçe", "rafadan tayfa", "peppa pig türkçe", "kukuli türkçe"],
};

export function getKidsChannelPresets(): VideoTvPreset[] {
  const baseKids = VIDEO_TV_PRESETS.filter((p) => p.category === "cocuk");
  const topKids = VIDEO_TV_TOP_CHANNEL_SUPPLEMENT.filter((p) => p.category === "cocuk");
  return mergeVideoTvChannelPresets(baseKids, topKids, VIDEO_TV_KIDS_CHANNEL_SUPPLEMENT);
}
