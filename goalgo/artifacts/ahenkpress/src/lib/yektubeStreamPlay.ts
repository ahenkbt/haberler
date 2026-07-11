/** HTML5 video proxy — embed kapalı YouTube videoları dahil */
export function yektubeStreamPlayUrl(videoId: string, attempt = 0): string {
  const base = `/api/video/youtube-stream/${encodeURIComponent(videoId)}/play`;
  if (attempt <= 0) return base;
  return `${base}?force=1&_=${attempt}`;
}
