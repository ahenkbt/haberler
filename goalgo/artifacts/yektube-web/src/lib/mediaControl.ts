export const STOP_ALL_MEDIA_EVENT = "yektube-stop-all-media";

export type StopAllMediaDetail = { includeMusic?: boolean; musicOnly?: boolean };

export function isMusicMediaElement(node: Element): boolean {
  return node instanceof HTMLMediaElement && node.dataset.yektubeMusic === "1";
}

/** Yalnızca arka plan müzik motorunu durdur. Sayfa video player'larını etkilemez. */
export function stopMusicHtmlMedia(): void {
  if (typeof document === "undefined") return;
  document.querySelectorAll("audio[data-yektube-music='1'], video[data-yektube-music='1']").forEach((node) => {
    if (!(node instanceof HTMLMediaElement)) return;
    try {
      node.pause();
      node.currentTime = 0;
    } catch {
      /* ignore */
    }
  });
  window.dispatchEvent(
    new CustomEvent<StopAllMediaDetail>(STOP_ALL_MEDIA_EVENT, {
      detail: { includeMusic: true, musicOnly: true },
    }),
  );
}

/** Sayfadaki tüm HTML5 medyayı durdur (müzik / shorts çakışmasını önler). */
export function stopAllHtmlMedia(options?: { keepMusic?: boolean }): void {
  if (typeof document === "undefined") return;
  document.querySelectorAll("video, audio").forEach((node) => {
    if (!(node instanceof HTMLMediaElement)) return;
    if (options?.keepMusic && isMusicMediaElement(node)) return;
    try {
      node.pause();
      node.currentTime = 0;
    } catch {
      /* ignore */
    }
  });
  window.dispatchEvent(
    new CustomEvent<StopAllMediaDetail>(STOP_ALL_MEDIA_EVENT, {
      detail: { includeMusic: options?.keepMusic ? false : true },
    }),
  );
}
