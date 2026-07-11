/** YouTube /podcasts'ten gelen ama video listesi olan başlıklar — frontend süzgeci */

function norm(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function looksLikeVideoPlaylistNotPodcast(title: string): boolean {
  const t = norm(title);
  if (!t.trim()) return true;
  return (
    /\bfilm(ler(i)?)?\b/.test(t) ||
    /\bvideo(lar)?\b/.test(t) ||
    /\bdizi(ler(i)?)?\b/.test(t) ||
    /\bsezon\b/.test(t) ||
    /\bbolum\b/.test(t) ||
    /\bpopuler\b/.test(t) ||
    /\bklasik\b/.test(t) ||
    /\bfragman\b/.test(t) ||
    /\bbenzer\b/.test(t) ||
    /\btum\b.*\bvideo/.test(t) ||
    /\buploads\b/.test(t) ||
    /\bsahneler?\b/.test(t) ||
    /\bkomik\b/.test(t) ||
    /\bshorts?\b/.test(t) ||
    /\balb(ü|u)m(ler(i)?)?\b/.test(t) ||
    /\b(muzik|müzik)\b/.test(t) ||
    /\bklip(ler(i)?)?\b/.test(t) ||
    /\bclip(s)?\b/.test(t) ||
    /\bmv\b/.test(t) ||
    /\bofficial\b/.test(t) ||
    /\bresmi video\b/.test(t) ||
    /\bturk\s*filml/.test(t) ||
    /\btürk\s*filml/.test(t) ||
    /\baksiyon\b.*\bfilm/.test(t) ||
    /\bdram\b.*\bfilm/.test(t) ||
    /\bkorku\b/.test(t) ||
    /\bcem yilmaz\b/.test(t) ||
    /\byabanci\b.*\bfilm/.test(t) ||
    /\|\s*(avrupa muzik|muzik|müzik)\b/.test(t) ||
    /\b(90lar|80ler|2000ler|2010lar)\b/.test(t) ||
    /\bturkce pop\b|\btürkçe pop\b/.test(t) ||
    /\ben cok\b|\bviral\b|\btrend(ing)?\b/.test(t) ||
    /\b(oynat|tumunu oynat)\b/.test(t) ||
    /-\s*komik\s*$/i.test(title.trim()) ||
    /\|\s*[^|]+\s*\|\s*[^|]+\s*#/.test(t)
  );
}

export function looksLikePodcastTitle(title: string): boolean {
  const t = norm(title);
  if (!t.trim()) return false;
  if (looksLikeVideoPlaylistNotPodcast(title)) return false;

  return (
    /\bpodcast(ler(i)?)?\b/.test(t) ||
    /\bpod\b/.test(t) ||
    /\bep(\.|isode)?\s*\d/.test(t) ||
    /\b(bolum|bölüm)\s*\d/.test(t) ||
    /\bsohbet(ler(i)?)?\b/.test(t) ||
    /\bro?portaj(lar(i)?)?\b/.test(t) ||
    /\bsesli\s+(gunluk|günlük|kitap|hikaye|anlat|yayin|yayın)/.test(t) ||
    /\bsesli\s+gunluk\b|\bsesli\s+günlük\b/.test(t) ||
    (/\bsesli\b/.test(t) && !/\bvideo\b/.test(t)) ||
    /\baudiobook\b/.test(t) ||
    /\bsesli\s+kitap\b/.test(t) ||
    /\bradyo\b/.test(t) ||
    /\bdinle\b/.test(t) ||
    (/\b(yayin|yayın)(lar(i)?)?\b/.test(t) && !/\b(canli|canlı|video)\b/.test(t)) ||
    /\btalk\s*show\b/.test(t) ||
    (/\bhikaye(lar(i)?)?\b/.test(t) && /\b(anlat|sesli|podcast|dinle)\b/.test(t)) ||
    (/\bprogram(lar(i)?)?\b/.test(t) && /\b(sesli|radyo|podcast|sohbet)\b/.test(t)) ||
    (/\b(gundem|gündem)\b/.test(t) && /\b(podcast|sesli|sohbet)\b/.test(t)) ||
    /\bmasal(lar(i)?)?\b/.test(t) ||
    (/\bkitap(lar(i)?)?\b/.test(t) && /\b(podcast|sesli|sohbet|okuma)\b/.test(t)) ||
    (/\b101\b/.test(t) && /\b(podcast|sohbet|bolum|bölüm)\b/.test(t))
  );
}

export function shouldImportAsPodcast(title: string): boolean {
  return looksLikePodcastTitle(title);
}

export function isPodcastSource(source: { sourceType: string; name: string }): boolean {
  return source.sourceType === "podcast" && shouldImportAsPodcast(source.name);
}
