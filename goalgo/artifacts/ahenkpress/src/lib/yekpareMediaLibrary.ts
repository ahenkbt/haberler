import { apiUrl } from "@/lib/apiBase";
import { readHmAuthorJwt } from "@/lib/hmAuthorSession";
import { readHmJwt } from "@/lib/hmSession";

/** Tüm siteler ve paneller ortak: yüklenen + elle eklenen görseller + haber kapakları (Medya sayfası). */
export const YEKPARE_MEDIA_LIBRARY_LS_KEY = "ahenkpress-media-custom-v1";

export type YekpareMediaItem = { url: string; title: string };

export function loadYekpareCustomMedia(): YekpareMediaItem[] {
  try {
    const raw = localStorage.getItem(YEKPARE_MEDIA_LIBRARY_LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((row): row is YekpareMediaItem => {
        return (
          row &&
          typeof row === "object" &&
          typeof (row as { url?: unknown }).url === "string" &&
          typeof (row as { title?: unknown }).title === "string"
        );
      })
      .map((row) => ({ url: row.url.trim(), title: row.title.trim() || row.url }))
      .filter((row) => row.url.length > 0);
  } catch {
    return [];
  }
}

export function persistYekpareCustomMedia(items: YekpareMediaItem[]): void {
  try {
    localStorage.setItem(YEKPARE_MEDIA_LIBRARY_LS_KEY, JSON.stringify(items));
  } catch {
    /* quota / private mode */
  }
}

export function appendYekpareCustomMedia(item: YekpareMediaItem): void {
  const cur = loadYekpareCustomMedia();
  persistYekpareCustomMedia([item, ...cur.filter((x) => x.url !== item.url)]);
}

function mediaUploadHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const editorJwt = readHmJwt();
  if (editorJwt) {
    headers.Authorization = `Bearer ${editorJwt}`;
    return headers;
  }
  const authorJwt = readHmAuthorJwt();
  if (authorJwt) {
    headers.Authorization = `Bearer ${authorJwt}`;
    return headers;
  }
  return headers;
}

export async function uploadYekpareMediaDataUrl(dataUrl: string): Promise<string> {
  const res = await fetch(apiUrl("/api/media/upload"), {
    method: "POST",
    credentials: "include",
    headers: mediaUploadHeaders(),
    body: JSON.stringify({ dataUrl }),
  });
  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  if (!data.url) throw new Error("Sunucu URL dönmedi");
  return data.url;
}

export async function uploadYekpareMediaFile(file: File): Promise<{ url: string; title: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      if (typeof r !== "string") reject(new Error("read"));
      else resolve(r);
    };
    reader.onerror = () => reject(new Error("read"));
    reader.readAsDataURL(file);
  });
  const url = await uploadYekpareMediaDataUrl(dataUrl);
  const title = file.name.replace(/\.[^.]+$/, "") || url;
  return { url, title };
}
