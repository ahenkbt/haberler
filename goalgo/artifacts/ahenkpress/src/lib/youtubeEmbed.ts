/** YouTube iframe: logo / marka daha az görünsün (tamamen kaldırılamaz — Google embed politikası). */
export function enhanceYoutubeIframeSrc(src: string): string {
  if (!src.includes("youtube-nocookie.com") && !src.includes("youtube.com/embed")) {
    return src;
  }
  try {
    const u = new URL(src);
    u.searchParams.set("modestbranding", "1");
    if (!u.searchParams.has("rel")) u.searchParams.set("rel", "0");
    return u.toString();
  } catch {
    const j = src.includes("?") ? "&" : "?";
    return `${src}${j}modestbranding=1&rel=0`;
  }
}
