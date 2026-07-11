function envTruthy(raw: string | undefined): boolean {
  const v = raw?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/** Yektube v2 geçiş bayrağı — build/runtime env */
export function isYektubeV2Enabled(): boolean {
  try {
    const vite = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
    if (envTruthy(vite?.VITE_YEKTUBE_V2_ENABLED)) return true;
  } catch {
    /* SSR / Node */
  }
  if (typeof process !== "undefined") {
    if (envTruthy(process.env.VITE_YEKTUBE_V2_ENABLED)) return true;
    if (envTruthy(process.env.YEKTUBE_V2_ENABLED)) return true;
  }
  return false;
}
