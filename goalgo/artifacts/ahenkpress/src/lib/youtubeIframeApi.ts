/** Tek seferlik YouTube IFrame API yüklemesi (ses / programatik oynatma için). */

const QUEUE: Array<() => void> = [];
let hooked = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;

function flushQueue() {
  while (QUEUE.length) {
    const fn = QUEUE.shift();
    try {
      fn?.();
    } catch {
      /* ignore */
    }
  }
}

function stopPoll() {
  if (pollTimer != null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function ensureGlobalReadyHook() {
  if (hooked) return;
  hooked = true;
  const prev = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => {
    try {
      prev?.();
    } finally {
      stopPoll();
      flushQueue();
    }
  };
}

function waitForPlayerReady(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();

  return new Promise((resolve) => {
    QUEUE.push(resolve);
    ensureGlobalReadyHook();

    const scriptExists = Boolean(
      document.querySelector('script[src="https://www.youtube.com/iframe_api"]'),
    );

    if (window.YT?.Player) {
      flushQueue();
      return;
    }

    if (scriptExists) {
      /** Script var ama callback kaçırılmış olabilir — YT.Player gelene kadar poll et */
      if (!pollTimer) {
        let attempts = 0;
        pollTimer = setInterval(() => {
          attempts += 1;
          if (window.YT?.Player) {
            stopPoll();
            flushQueue();
            return;
          }
          if (attempts >= 120) {
            stopPoll();
            flushQueue();
          }
        }, 50);
      }
      return;
    }

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    document.head.appendChild(tag);
  });
}

export function loadYoutubeIframeApi(): Promise<void> {
  return waitForPlayerReady();
}
