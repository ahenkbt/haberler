export type HmStaticPagePublic = {
  id: string;
  slug: string;
  title: string;
  lastUpdated: string;
  body: string;
  menuLabel?: string | null;
};

async function publicJson<T>(path: string): Promise<T> {
  const r = await fetch(`/api${path}`, { credentials: "same-origin" });
  const data = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) {
    throw new Error(data.error ?? `HTTP ${r.status}`);
  }
  return data;
}

export async function fetchHmStaticPage(slug: string): Promise<{ page: HmStaticPagePublic }> {
  return publicJson(`/hm/pages/${encodeURIComponent(slug)}`);
}

export async function adminFetchHmStaticPages(): Promise<{ pages: HmStaticPagePublic[] }> {
  const r = await fetch("/api/hm/admin/pages", { credentials: "include" });
  const data = (await r.json().catch(() => ({}))) as { pages?: HmStaticPagePublic[]; error?: string };
  if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
  return { pages: data.pages ?? [] };
}

export async function adminUpdateHmStaticPage(
  id: string,
  input: Partial<Pick<HmStaticPagePublic, "slug" | "title" | "lastUpdated" | "body" | "menuLabel">>,
): Promise<{ page: HmStaticPagePublic }> {
  const r = await fetch(`/api/hm/admin/pages/${encodeURIComponent(id)}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await r.json().catch(() => ({}))) as { page?: HmStaticPagePublic; error?: string };
  if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
  if (!data.page) throw new Error("Sayfa yanıtı eksik");
  return { page: data.page };
}
