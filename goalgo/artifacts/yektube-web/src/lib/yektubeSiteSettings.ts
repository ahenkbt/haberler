/** Video TV / Yektube görünüm ayarları (tarayıcıda saklanır). */
export const YEKTUBE_SITE_SETTINGS_KEY = "yektube-v2-site-settings";

export type YektubeSiteSettings = {
  siteTitle: string;
  popularLimit: number;
  categoryLimit: number;
  featuredLimit: number;
  bannerVideoUrl: string;
  autoAddChannels: boolean;
};

export const DEFAULT_YEKTUBE_SITE_SETTINGS: YektubeSiteSettings = {
  siteTitle: "Yektube",
  popularLimit: 6,
  categoryLimit: 8,
  featuredLimit: 4,
  bannerVideoUrl: "",
  autoAddChannels: false,
};

export function loadYektubeSiteSettings(): YektubeSiteSettings {
  try {
    const legacy = localStorage.getItem("vtv_settings");
    const raw = localStorage.getItem(YEKTUBE_SITE_SETTINGS_KEY) ?? legacy;
    if (raw) return { ...DEFAULT_YEKTUBE_SITE_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_YEKTUBE_SITE_SETTINGS };
}

export function saveYektubeSiteSettings(settings: YektubeSiteSettings): void {
  localStorage.setItem(YEKTUBE_SITE_SETTINGS_KEY, JSON.stringify(settings));
}
