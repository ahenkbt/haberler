import { parseDurationSeconds } from "./yektubeVideoClassify.js";

/** Müzik sayfasında minimum süre — altı Yekçek */
export const MUSIC_CATALOG_MIN_DURATION_SECONDS = 60;

/** Tipik parça üst sınırı — uzun konser/albüm formatı hariç */
export const MUSIC_TYPICAL_MAX_DURATION_SECONDS = 5 * 60;

/** TV / tartışma / haber / dizi formatı — müzik listesinden çıkar */
const MUSIC_TITLE_BLACKLIST: RegExp[] = [
  /\btv\b/i,
  /\btv8\b/i,
  /\batv\b/i,
  /\bshow\s*tv\b/i,
  /\bstar\s*tv\b/i,
  /\bkanal\s*d\b/i,
  /talk\s*show/i,
  /tartışma/i,
  /tartisma/i,
  /\bhaber\b/i,
  /bülten/i,
  /bulten/i,
  /gündem/i,
  /gundem/i,
  /\bprogram\b/i,
  /müzik\s*program/i,
  /muzik\s*program/i,
  /eğlence\s*program/i,
  /eglence\s*program/i,
  /magazin/i,
  /yarışma/i,
  /yarisma/i,
  /reality/i,
  /röportaj/i,
  /roportaj/i,
  /\bpodcast\b/i,
  /\bsohbet\b/i,
  /\bdizi\b/i,
  /\bfilm\b/i,
  /\bfragman\b/i,
  /\btrailer\b/i,
  /\bbölüm\b/i,
  /\bbolum\b/i,
  /\bepisode\b/i,
  /\bsezon\b/i,
  /\bseason\b/i,
  /canlı\s*yayın/i,
  /canli\s*yayin/i,
  /live\s*stream/i,
  /futbol/i,
  /maç\s*özeti/i,
  /mac\s*ozeti/i,
  /derbi/i,
  /spor\s*haber/i,
  /netflix/i,
  /disney/i,
  /çizgi\s*film/i,
  /cizgi\s*film/i,
];

const MUSIC_CHANNEL_WHITELIST: RegExp[] = [
  /netd/i,
  /muzik/i,
  /müzik/i,
  /music/i,
  /vevo/i,
  /official/i,
  /resmi/i,
  /records/i,
  /\bprod\b/i,
];

const TRACK_LIKE: RegExp =
  /\b(klip|official|lyric|lyrics|audio|mv|ft\.|feat\.|şarkı|sarki|single|remix|cover|performans)\b/i;

const SHORT_CLIP: RegExp[] = [
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

/** 5 dk üstü — konser, albüm, DJ set vb. */
const LONG_MUSIC_FORMAT: RegExp[] = [
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

function haystack(video: {
  title?: string | null;
  description?: string | null;
  channelName?: string | null;
}): string {
  return `${video.title ?? ""} ${video.description ?? ""} ${video.channelName ?? ""}`.toLowerCase();
}

export function isMusicAlbumVideo(video: { title?: string | null; description?: string | null }): boolean {
  const text = `${video.title ?? ""} ${video.description ?? ""}`;
  return /\balbüm\b|\balbum\b/i.test(text);
}

function isLongFormMusicFormat(text: string): boolean {
  return LONG_MUSIC_FORMAT.some((re) => re.test(text));
}

function passesMusicDurationRules(video: {
  title?: string | null;
  description?: string | null;
  duration?: string | null;
}): boolean {
  const text = haystack(video);
  const sec = parseDurationSeconds(video.duration);

  if (sec != null && sec > 0) {
    if (sec < MUSIC_CATALOG_MIN_DURATION_SECONDS) return false;
    if (sec > MUSIC_TYPICAL_MAX_DURATION_SECONDS) {
      return isLongFormMusicFormat(text);
    }
    return true;
  }

  if (SHORT_CLIP.some((re) => re.test(text))) return false;
  return TRACK_LIKE.test(text) || isLongFormMusicFormat(text);
}

export function isMusicCatalogVideo(video: {
  title?: string | null;
  description?: string | null;
  duration?: string | null;
  channelName?: string | null;
  categorySlug?: string | null;
}): boolean {
  const text = haystack(video);

  if (MUSIC_TITLE_BLACKLIST.some((re) => re.test(text))) {
    const channel = video.channelName ?? "";
    const whitelisted = MUSIC_CHANNEL_WHITELIST.some((re) => re.test(channel));
    if (!(whitelisted && TRACK_LIKE.test(text))) return false;
  }

  return passesMusicDurationRules(video);
}
