export type YektubeModuleFlags = {
  longForm: boolean;
  shorts: boolean;
  podcasts: boolean;
  live: boolean;
  music: boolean;
};

export const MODULES_STORAGE_KEY = "yektube-v2-module-flags";

export const DEFAULT_MODULE_FLAGS: YektubeModuleFlags = {
  longForm: true,
  shorts: true,
  podcasts: true,
  live: true,
  music: true,
};

export function loadModuleFlags(): YektubeModuleFlags {
  try {
    const raw = localStorage.getItem(MODULES_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_MODULE_FLAGS, ...(JSON.parse(raw) as Partial<YektubeModuleFlags>) };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_MODULE_FLAGS };
}

export function saveModuleFlags(flags: YektubeModuleFlags): void {
  localStorage.setItem(MODULES_STORAGE_KEY, JSON.stringify(flags));
}
