import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { apiUrl } from "@/lib/apiBase";
import { getProviderSession, providerAuthHeaders } from "@/lib/providerSession";

function apiJoin(path: string): string {
  const rest = path.replace(/^\/+/, "");
  return apiUrl(`/api/${rest}`);
}

function getSession() {
  return getProviderSession();
}

function authHeaders(): Record<string, string> {
  return providerAuthHeaders(getSession());
}

export type VendorBlogBlock =
  | { type: "paragraph"; text: string }
  | { type: "image"; url: string; caption?: string }
  | { type: "gallery"; urls: string[] }
  | { type: "youtube"; url: string };

type PostRow = {
  id: number;
  slug: string;
  title: string;
  excerpt?: string | null;
  cover_image_url?: string | null;
  published?: boolean;
  published_at?: string | null;
};

export function VendorBlogPanel({
  vendorSlug,
  /** Örn. `/alisveris/magaza/slug` veya `/siparis/satici/slug` — blog public yolu için kök */
  publicBlogPathPrefix,
}: {
  vendorSlug: string;
  publicBlogPathPrefix?: string;
}) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [savingSet, setSavingSet] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [cover, setCover] = useState("");
  const [published, setPublished] = useState(false);
  const [blocks, setBlocks] = useState<VendorBlogBlock[]>([{ type: "paragraph", text: "" }]);
  const [busy, setBusy] = useState(false);

  const blogPathRoot =
    (publicBlogPathPrefix || `/siparis/satici/${encodeURIComponent(vendorSlug)}`).replace(/\/$/, "");
  const publicBlogHref = `${blogPathRoot}/blog`;
  const publicBlogUrl = typeof window !== "undefined" ? `${window.location.origin}${publicBlogHref}` : "";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r1 = await fetch(apiJoin("providers/me/blog-settings"), { headers: authHeaders() });
      const d1 = await r1.json().catch(() => ({}));
      if (r1.ok && d1.success) setEnabled(Boolean(d1.enabled));
      const r2 = await fetch(apiJoin("providers/me/blog-posts"), { headers: authHeaders() });
      const d2 = await r2.json().catch(() => ({}));
      if (r2.ok && d2.success) setPosts(Array.isArray(d2.posts) ? d2.posts : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveBlogEnabled(next: boolean) {
    setSavingSet(true);
    try {
      const r = await fetch(apiJoin("providers/me/blog-settings"), {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ enabled: next }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) return;
      setEnabled(next);
    } finally {
      setSavingSet(false);
    }
  }

  async function createPost() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const r = await fetch(apiJoin("providers/me/blog-posts"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim() || undefined,
          excerpt: excerpt.trim() || undefined,
          coverImageUrl: cover.trim() || undefined,
          contentJson: blocks,
          published,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) {
        alert(d.error || "Kaydedilemedi");
        return;
      }
      setTitle("");
      setSlug("");
      setExcerpt("");
      setCover("");
      setPublished(false);
      setBlocks([{ type: "paragraph", text: "" }]);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function togglePub(p: PostRow) {
    const r = await fetch(apiJoin(`providers/me/blog-posts/${p.id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ published: !p.published }),
    });
    if (r.ok) void load();
  }

  async function delPost(id: number) {
    if (!confirm("Yazı silinsin mi?")) return;
    await fetch(apiJoin(`providers/me/blog-posts/${id}`), { method: "DELETE", headers: authHeaders() });
    void load();
  }

  function setBlock(i: number, b: VendorBlogBlock) {
    setBlocks((prev) => prev.map((x, j) => (j === i ? b : x)));
  }

  function addBlock(t: VendorBlogBlock["type"]) {
    const next: VendorBlogBlock =
      t === "paragraph"
        ? { type: "paragraph", text: "" }
        : t === "image"
          ? { type: "image", url: "", caption: "" }
          : t === "gallery"
            ? { type: "gallery", urls: [""] }
            : { type: "youtube", url: "" };
    setBlocks((prev) => [...prev, next]);
  }

  return (
    <div className="bg-white border border-gray-300 rounded-2xl p-5 shadow-sm space-y-5">
      <h2 className="text-gray-900 font-bold text-lg">📝 Mağaza blogu</h2>
      <p className="text-sm text-gray-700">
        Blogu açtığınızda mağaza sayfasında ve aşağıdaki adreste yayımlanır. Paragraflar, kapak görseli, foto galerisi ve YouTube bağlantısı ekleyebilirsiniz.
      </p>

      {loading ? (
        <p className="text-sm text-gray-500">Yükleniyor…</p>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-900 cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                disabled={savingSet}
                onChange={(e) => void saveBlogEnabled(e.target.checked)}
                className="rounded accent-indigo-600 w-4 h-4"
              />
              Blogu aktif et (mağaza vitrininde link gösterilir)
            </label>
            {enabled && publicBlogUrl ? (
              <div className="sm:ml-auto text-xs">
                <span className="text-gray-600 font-semibold">Mağaza blog linki: </span>
                <Link href={publicBlogHref} className="text-indigo-700 font-bold underline break-all">
                  {publicBlogUrl}
                </Link>
              </div>
            ) : null}
          </div>

          <div className="border-t border-gray-200 pt-4 space-y-3">
            <h3 className="font-bold text-gray-900 text-sm">Yeni yazı</h3>
            <input
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm"
              placeholder="Başlık *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm"
              placeholder="URL slug (boşsa başlıktan üretilir)"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
            <textarea
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm min-h-[60px]"
              placeholder="Kısa özet (liste için)"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
            />
            <input
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm"
              placeholder="Kapak görseli URL"
              value={cover}
              onChange={(e) => setCover(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm text-gray-900">
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="rounded" />
              Hemen yayımla
            </label>

            <p className="text-xs font-bold text-gray-700 pt-2">İçerik blokları</p>
            <div className="space-y-3">
              {blocks.map((b, i) => (
                <div key={i} className="rounded-xl border border-gray-200 p-3 space-y-2 bg-gray-50/80">
                  <div className="flex flex-wrap gap-2 items-center">
                    <select
                      className="border rounded-lg px-2 py-1 text-xs font-semibold"
                      value={b.type}
                      onChange={(e) => {
                        const t = e.target.value as VendorBlogBlock["type"];
                        if (t === "paragraph") setBlock(i, { type: "paragraph", text: (b as { text?: string }).text || "" });
                        else if (t === "image") setBlock(i, { type: "image", url: "", caption: "" });
                        else if (t === "gallery") setBlock(i, { type: "gallery", urls: [""] });
                        else setBlock(i, { type: "youtube", url: "" });
                      }}
                    >
                      <option value="paragraph">Paragraf</option>
                      <option value="image">Tek görsel</option>
                      <option value="gallery">Galeri (URL satır satır)</option>
                      <option value="youtube">YouTube (sayfa veya embed linki)</option>
                    </select>
                    <button type="button" className="text-xs text-rose-700 font-bold underline" onClick={() => setBlocks((p) => p.filter((_, j) => j !== i))}>
                      Bloğu kaldır
                    </button>
                  </div>
                  {b.type === "paragraph" ? (
                    <textarea
                      className="w-full border rounded-lg px-2 py-2 text-sm min-h-[80px]"
                      value={b.text}
                      onChange={(e) => setBlock(i, { type: "paragraph", text: e.target.value })}
                    />
                  ) : null}
                  {b.type === "image" ? (
                    <>
                      <input
                        className="w-full border rounded-lg px-2 py-1 text-sm"
                        placeholder="Görsel URL"
                        value={b.url}
                        onChange={(e) => setBlock(i, { ...b, url: e.target.value })}
                      />
                      <input
                        className="w-full border rounded-lg px-2 py-1 text-sm"
                        placeholder="Alt yazı (isteğe bağlı)"
                        value={b.caption || ""}
                        onChange={(e) => setBlock(i, { ...b, caption: e.target.value })}
                      />
                    </>
                  ) : null}
                  {b.type === "gallery" ? (
                    <textarea
                      className="w-full border rounded-lg px-2 py-2 text-sm font-mono text-xs min-h-[100px]"
                      placeholder={"Her satırda bir görsel URL"}
                      value={b.urls.join("\n")}
                      onChange={(e) =>
                        setBlock(i, {
                          type: "gallery",
                          urls: e.target.value
                            .split("\n")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  ) : null}
                  {b.type === "youtube" ? (
                    <input
                      className="w-full border rounded-lg px-2 py-1 text-sm"
                      placeholder="https://www.youtube.com/watch?v=…"
                      value={b.url}
                      onChange={(e) => setBlock(i, { type: "youtube", url: e.target.value })}
                    />
                  ) : null}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="text-xs bg-gray-200 rounded-lg px-2 py-1 font-bold" onClick={() => addBlock("paragraph")}>
                + Paragraf
              </button>
              <button type="button" className="text-xs bg-gray-200 rounded-lg px-2 py-1 font-bold" onClick={() => addBlock("image")}>
                + Görsel
              </button>
              <button type="button" className="text-xs bg-gray-200 rounded-lg px-2 py-1 font-bold" onClick={() => addBlock("gallery")}>
                + Galeri
              </button>
              <button type="button" className="text-xs bg-gray-200 rounded-lg px-2 py-1 font-bold" onClick={() => addBlock("youtube")}>
                + YouTube
              </button>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void createPost()}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold disabled:opacity-50"
            >
              {busy ? "Kaydediliyor…" : "Yazıyı oluştur"}
            </button>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-bold text-gray-900 text-sm mb-2">Yazılarınız</h3>
            <ul className="space-y-2">
              {posts.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm">
                  <div>
                    <span className="font-bold text-gray-900">{p.title}</span>
                    <span className="text-gray-500 text-xs ml-2">/{p.slug}</span>
                    {p.published ? <span className="ml-2 text-emerald-700 text-xs font-bold">yayında</span> : <span className="ml-2 text-amber-700 text-xs font-bold">taslak</span>}
                  </div>
                  <div className="flex gap-2">
                    {enabled ? (
                      <Link
                        href={`${publicBlogHref}/${encodeURIComponent(p.slug)}`}
                        className="text-xs text-indigo-700 font-bold underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Önizle
                      </Link>
                    ) : null}
                    <button type="button" className="text-xs font-bold text-indigo-700 underline" onClick={() => void togglePub(p)}>
                      {p.published ? "Yayından kaldır" : "Yayınla"}
                    </button>
                    <button type="button" className="text-xs font-bold text-rose-700 underline" onClick={() => void delPost(p.id)}>
                      Sil
                    </button>
                  </div>
                </li>
              ))}
              {!posts.length ? <li className="text-gray-500 text-sm">Henüz yazı yok.</li> : null}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
