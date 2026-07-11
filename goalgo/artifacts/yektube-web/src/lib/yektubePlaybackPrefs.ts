const LOW_BANDWIDTH_KEY = "yektube-low-bandwidth-v1";
const PLAYBACK_VOLUME_KEY = "yektube-playback-volume-v1";
const BACKGROUND_PLAYBACK_KEY = "yektube-background-playback-v1";

export function readLowBandwidthMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(LOW_BANDWIDTH_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeLowBandwidthMode(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOW_BANDWIDTH_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** 0–1 arası kayıtlı oynatıcı ses seviyesi */
export function readPlaybackVolume(): number {
  if (typeof window === "undefined") return 0.85;
  try {
    const raw = localStorage.getItem(PLAYBACK_VOLUME_KEY);
    if (raw == null) return 0.85;
    const n = Number(raw);
    if (!Number.isFinite(n)) return 0.85;
    return Math.min(1, Math.max(0, n));
  } catch {
    return 0.85;
  }
}

export function writePlaybackVolume(level: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PLAYBACK_VOLUME_KEY, String(Math.min(1, Math.max(0, level))));
  } catch {
    /* ignore */
  }
}

/** Sekme/uygulama arka plandayken oynatmayı sürdür (varsayılan: açık) */
export function readBackgroundPlayback(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(BACKGROUND_PLAYBACK_KEY) !== "0";
  } catch {
    return true;
  }
}

export function writeBackgroundPlayback(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BACKGROUND_PLAYBACK_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}
