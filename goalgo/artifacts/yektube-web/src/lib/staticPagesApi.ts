export type YektubeStaticPage = {
  id: string;
  slug: string;
  title: string;
  lastUpdated: string;
  body: string;
  sidebarLabel?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type SidebarStaticPage = Pick<YektubeStaticPage, "slug" | "title" | "sidebarLabel">;

async function publicJson<T>(path: string): Promise<T> {
  const r = await fetch(`/api${path}`, { credentials: "same-origin" });
  const data = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) {
    throw new Error(data.error ?? `HTTP ${r.status}`);
  }
  return data;
}

export async function fetchStaticPage(slug: string): Promise<{ page: YektubeStaticPage }> {
  return publicJson(`/video/pages/${encodeURIComponent(slug)}`);
}

export async function fetchSidebarStaticPages(): Promise<{ pages: SidebarStaticPage[] }> {
  return publicJson("/video/pages/sidebar");
}
