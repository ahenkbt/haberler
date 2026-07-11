/** Anasayfa inline Yekpare AI paneli — FAB / hero buton senkronu. */

export const YEKPARE_HOME_AI_TOGGLE_EVENT = "yekpare:home-ai-toggle";
export const YEKPARE_HOME_AI_OPEN_EVENT = "yekpare:home-ai-open";
export const YEKPARE_HOME_AI_CLOSE_EVENT = "yekpare:home-ai-close";

export function dispatchHomeAiToggle(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(YEKPARE_HOME_AI_TOGGLE_EVENT));
}

export function dispatchHomeAiOpen(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(YEKPARE_HOME_AI_OPEN_EVENT));
}

export function dispatchHomeAiClose(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(YEKPARE_HOME_AI_CLOSE_EVENT));
}
