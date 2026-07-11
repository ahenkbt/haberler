/** Demo: sayfa görünürlüğü; prod’da site ayarı API’sine taşınır. */
export type EditorStandardPageKey = "kunye" | "iletisim" | "reklam" | "abonelik";

export type EditorPageFlags = Record<EditorStandardPageKey, boolean>;

const STORAGE_KEY = "yekpare_editor_page_flags_v1";

const defaultFlags: EditorPageFlags = {
  kunye: true,
  iletisim: true,
  reklam: true,
  abonelik: true,
};

export function readEditorPageFlags(): EditorPageFlags {
  if (typeof window === "undefined") return { ...defaultFlags };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultFlags };
    const j = JSON.parse(raw) as Partial<EditorPageFlags>;
    return { ...defaultFlags, ...j };
  } catch {
    return { ...defaultFlags };
  }
}

export function writeEditorPageFlags(flags: EditorPageFlags): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
  window.dispatchEvent(new Event("yekpare-editor-flags"));
}
