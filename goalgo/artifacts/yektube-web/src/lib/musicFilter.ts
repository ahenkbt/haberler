import type { YektubeVideo } from "@workspace/yektube-core";
import { parseDurationSeconds } from "@/lib/yektubeVideoClassify";

/** Müzik sayfası minimum süre — altı Yekçek */
export const MUSIC_MIN_DURATION_SECONDS = 60;

/** Tipik parça üst sınırı — konser/albüm formatı hariç */
export const MUSIC_TYPICAL_MAX_DURATION_SECONDS = 5 * 60;

const NON_MUSIC = [
  /pijama/i,
  /pj\s?masks?/i,
  /peppa/i,
  /çocuk/i,
  /\bcocuk\b/i,
  /\bkids?\b/i,
  /dizi/i,
  /\bfilm\b/i,
  /haber/i,
  /spor/i,
  /sezon\s*\d/i,
  /\bbölüm\b/i,
  /episode/i,
  /netflix/i,
  /disney/i,
  /çizgi\s*film/i,
  /cizgi\s*film/i,
  /oyuncak/i,
  /cartoon/i,
  /nursery/i,
  /masal/i,
  /hikaye/i,
  /toy\s+unboxing/i,
  /minecraft/i,
  /roblox/i,
  /gameplay/i,
  /oyun/i,
  /futbol/i,
  /basketbol/i,
  /gündem/i,
  /gundem/i,
  /son\s*dakika/i,
  /canlı\s*yayın/i,
  /canli\s*yayin/i,
  /tartışma/i,
  /tartisma/i,
  /\bprogram\b/i,
  /\bbolum\b/i,
  /\bepisode\b/i,
  /talk\s*show/i,
  /siyaset/i,
  /\btv8\b/i,
  /\batv\b/i,
  /\bstar\s*tv\b/i,
  /\bkanal\s*d\b/i,
  /magazin/i,
  /yarışma/i,
  /yarisma/i,
  /reality/i,
  /müzik\s*program/i,
  /muzik\s*program/i,
  /eğlence\s*program/i,
  /eglence\s*program/i,
  /\bpodcast\b/i,
  /\bsohbet\b/i,
  /röportaj/i,
  /roportaj/i,
];

const SHORT_CLIP = [
  /\bshorts?\b/i,
  /\bteaser\b/i,
  /\bclip\b/i,
  /\bsnippet\b/i,
  /\bpreview\b/i,
  /\bfragman\b/i,
  /\btanıtım\b/i,
  /\btanitim\b/i,
  /\bkısa\b/i,
  /\bkisa\b/i,
  /\bvertical\b/i,
];

const LONG_MUSIC_FORMAT = [
  /\balbüm\b/i,
  /\balbum\b/i,
  /full\s*album/i,
  /konser/i,
  /concert/i,
  /canlı\s*performans/i,
  /canli\s*performans/i,
  /live\s*(at|performance|concert|session)/i,
  /unplugged/i,
  /dj\s*set/i,
  /mixtape/i,
  /megamix/i,
  /medley/i,
  /derleme/i,
  /compilation/i,
  /full\s*show/i,
  /operasi/i,
  /\bopera\b/i,
  /senfoni/i,
  /symphony/i,
  /soundtrack/i,
  /\bost\b/i,
  /set\s*list/i,
];

const TRACK_LIKE =
  /\b(klip|official|lyric|lyrics|audio|mv|ft\.|feat\.|şarkı|sarki|single|remix|cover|performans)\b/i;

export type MusicMood = {
  id: string;
  label: string;
  keywords?: string[];
};

export const MUSIC_MOODS: MusicMood[] = [
  { id: "all", label: "Tümü" },
  {
    id: "enerji",
    label: "Enerji",
    keywords: ["enerji", "enerjik", "energy", "power", "upbeat", "edm", "dance"],
  },
  {
    id: "antrenman",
    label: "Antrenman",
    keywords: ["workout", "antrenman", "fitness", "gym", "spor müzik", "cardio", "motivasyon"],
  },
  {
    id: "keyifli",
    label: "Keyifli",
    keywords: ["keyif", "hafif", "summer", "yaz", "feel good", "happy", "neşe"],
  },
  {
    id: "rahatlama",
    label: "Rahatlama",
    keywords: ["chill", "lofi", "lo-fi", "rahat", "sakin", "slow", "ambient", "relax"],
  },
  {
    id: "romantik",
    label: "Romantik",
    keywords: ["romantik", "aşk", "ask", "love", "duygusal", "balad", "ballad"],
  },
  {
    id: "huzunlu",
    label: "Hüzünlü",
    keywords: ["hüzün", "huzun", "melankoli", "melancholy", "sad", "ağlama", "duygusal"],
  },
  {
    id: "parti",
    label: "Parti",
    keywords: ["parti", "party", "club", "remix", "dance", "dj", "gece"],
  },
  {
    id: "commute",
    label: "İşe gidip gelme",
    keywords: ["commute", "yol", "drive", "driving", "arabada", "seyahat"],
  },
  {
    id: "odaklanma",
    label: "Odaklanma",
    keywords: ["focus", "odak", "study", "çalışma", "concentration", "instrumental", "enstrümantal"],
  },
  {
    id: "uyku",
    label: "Uyku",
    keywords: ["uyku", "sleep", "lullaby", "ninn", "gece", "night", "calm"],
  },
  {
    id: "pop",
    label: "Pop",
    keywords: ["pop", "dance pop", "türk pop", "turk pop", "resmi video", "official video", "klip", " mv", " ft ", " feat"],
  },
  {
    id: "rock",
    label: "Rock",
    keywords: ["rock", "metal", "punk", "grunge", "alternatif rock", "hard rock"],
  },
  {
    id: "rap",
    label: "Rap",
    keywords: ["rap", "hip hop", "hip-hop", "trap", "drill", "freestyle"],
  },
  {
    id: "klasik",
    label: "Klasik",
    keywords: ["klasik", "classical", "orkestra", "senfoni", "piyano"],
  },
  {
    id: "akustik",
    label: "Akustik",
    keywords: ["akustik", "acoustic", "unplugged", "cover", "canlı performans", "live session"],
  },
];

function haystack(video: YektubeVideo): string {
  return `${video.title ?? ""} ${video.channelName ?? ""} ${video.description ?? ""}`.toLowerCase();
}

function keywordMatches(text: string, keyword: string): boolean {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return false;
  if (kw.includes(" ")) return text.includes(kw);
  return new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);
}

function isMusicCategorySlug(slug: string | null | undefined): boolean {
  const s = slug?.trim().toLowerCase();
  return s === "muzik" || s === "müzik" || s === "music";
}

function isLongFormMusicFormat(text: string): boolean {
  return LONG_MUSIC_FORMAT.some((re) => re.test(text));
}

export function isMusicAlbumVideo(video: Pick<YektubeVideo, "title" | "description">): boolean {
  const text = `${video.title ?? ""} ${video.description ?? ""}`;
  return /\balbüm\b|\balbum\b/i.test(text);
}

export function matchesMusicDuration(video: YektubeVideo): boolean {
  const text = haystack(video);
  const sec = parseDurationSeconds(video.duration);

  if (sec != null && sec > 0) {
    if (sec < MUSIC_MIN_DURATION_SECONDS) return false;
    if (sec > MUSIC_TYPICAL_MAX_DURATION_SECONDS) {
      return isLongFormMusicFormat(text);
    }
    return true;
  }

  if (SHORT_CLIP.some((re) => re.test(text))) return false;
  return TRACK_LIKE.test(text) || isLongFormMusicFormat(text);
}

export function matchesMusicMood(video: YektubeVideo, moodId: string): boolean {
  if (moodId === "all") return true;
  const mood = MUSIC_MOODS.find((m) => m.id === moodId);
  if (!mood?.keywords?.length) return true;
  const text = haystack(video);
  return mood.keywords.some((kw) => keywordMatches(text, kw));
}

export function filterVideosByMood(videos: YektubeVideo[], moodId: string): YektubeVideo[] {
  if (moodId === "all") return videos;
  return videos.filter((v) => matchesMusicMood(v, moodId));
}

export function isLikelyMusicVideo(video: YektubeVideo, musicSourceIds?: ReadonlySet<number>): boolean {
  const fromMusicCategory = isMusicCategorySlug(video.categorySlug);
  const fromMusicSource =
    musicSourceIds != null &&
    musicSourceIds.size > 0 &&
    video.sourceId != null &&
    musicSourceIds.has(video.sourceId);

  if (!fromMusicCategory && !fromMusicSource) return false;

  const text = haystack(video);
  if (NON_MUSIC.some((re) => re.test(text))) return false;
  if (!matchesMusicDuration(video)) return false;

  return true;
}

export function filterMusicVideos(
  videos: YektubeVideo[],
  musicSourceIds?: ReadonlySet<number>,
): YektubeVideo[] {
  return videos.filter((v) => isLikelyMusicVideo(v, musicSourceIds));
}

export function splitMusicAlbums(videos: YektubeVideo[]): {
  albums: YektubeVideo[];
  tracks: YektubeVideo[];
} {
  const albums: YektubeVideo[] = [];
  const tracks: YektubeVideo[] = [];
  for (const v of videos) {
    if (isMusicAlbumVideo(v)) albums.push(v);
    else tracks.push(v);
  }
  return { albums, tracks };
}
