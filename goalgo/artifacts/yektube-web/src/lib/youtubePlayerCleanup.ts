/** YouTube IFrame API + React birlikte kullanıldığında destroy() DOM çakışması yapabilir. */
export type YoutubePlayerInstance = {
  destroy?: () => void;
  stopVideo?: () => void;
};

export function destroyYoutubePlayer(
  instance: YoutubePlayerInstance | null | undefined,
  host?: HTMLElement | null,
): void {
  try {
    instance?.stopVideo?.();
  } catch {
    /* ignore */
  }
  if (host) {
    try {
      host.replaceChildren();
    } catch {
      try {
        host.innerHTML = "";
      } catch {
        /* ignore */
      }
    }
  }
  try {
    instance?.destroy?.();
  } catch {
    /* YT destroy + React birlikte removeChild hatası verebilir */
  }
}
