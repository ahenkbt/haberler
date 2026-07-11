/** Aktif slayt ± N — legacy placeholder penceresi (P3-P1); sanal liste overscan ile değiştirildi */
export const SHORTS_RENDER_RADIUS = 1;

/** react-window FixedSizeList overscan — aktif slayt ± N */
export const SHORTS_VIRTUAL_OVERSCAN = 1;

export const SHORTS_LOOP_STORAGE_KEY = "yektube-shorts-loop-v1";

export function readShortsLoopEnabled(): boolean {
  try {
    return localStorage.getItem(SHORTS_LOOP_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeShortsLoopEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SHORTS_LOOP_STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function isShortsIndexInRenderWindow(index: number, activeIndex: number, total: number): boolean {
  if (total <= 0) return false;
  if (Math.abs(index - activeIndex) <= SHORTS_RENDER_RADIUS) return true;
  if (index === 0 || index === total - 1) return true;
  return false;
}
