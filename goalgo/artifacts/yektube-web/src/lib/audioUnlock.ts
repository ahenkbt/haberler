const STORAGE_KEY = "yektube:audio-unlocked";
const SHORTS_SOUND_KEY = "yektube-shorts-sound-v1";

export const AUDIO_UNLOCK_EVENT = "yektube-audio-unlock";
export const SHORTS_SOUND_EVENT = "yektube-shorts-sound";

export function isAudioUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Yekçek — varsayılan ses açık (kullanıcı kapatmadıysa) */
export function readShortsSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(SHORTS_SOUND_KEY) !== "0";
  } catch {
    return true;
  }
}

export function writeShortsSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SHORTS_SOUND_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(SHORTS_SOUND_EVENT));
}

export function enableShortsSound(): void {
  writeShortsSoundEnabled(true);
  unlockAudio();
}

export function unlockAudio(): void {
  if (typeof window === "undefined") return;
  if (isAudioUnlocked()) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(AUDIO_UNLOCK_EVENT));
}

let listenersInstalled = false;

/** İlk dokunuş/tuş ile ses kilidini aç — Shorts kaydırma dahil. */
export function installAudioUnlockListeners(): void {
  if (listenersInstalled || typeof window === "undefined") return;
  listenersInstalled = true;

  const onGesture = () => unlockAudio();

  window.addEventListener("pointerdown", onGesture, { passive: true });
  window.addEventListener("keydown", onGesture);
  window.addEventListener("touchstart", onGesture, { passive: true });
}

export function prefersUnmutedPlayback(audioMode?: boolean, shortsMode?: boolean): boolean {
  return Boolean(audioMode || isAudioUnlocked() || (shortsMode && readShortsSoundEnabled()));
}
