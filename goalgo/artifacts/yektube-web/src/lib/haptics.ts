/** Hafif dokunsal geri bildirim — destekleyen cihazlarda */
export function hapticTap(ms = 12) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* ignore */
  }
}

export function hapticSuccess() {
  try {
    navigator.vibrate?.([8, 40, 12]);
  } catch {
    /* ignore */
  }
}
