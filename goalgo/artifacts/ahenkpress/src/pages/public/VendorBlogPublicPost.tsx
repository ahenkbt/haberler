import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { ChevronLeft, Share2 } from "lucide-react";
import {
  applySocialShareMeta,
  applyBlogPostStructuredData,
  resetSeoToSiteDefaults,
  seoPlainSnippet,
} from "@/lib/pageSeo";
import type { VendorBlogBlock } from "@/pages/public/providerPanels/VendorBlogPanel";
import { VendorThemeShell } from "@/components/VendorThemeShell";
import { resolveClientMediaSrc } from "@/lib/apiBase";

const API = "/api";

function parseBlocks(raw: unknown): VendorBlogBlock[] {
  if (Array.isArray(raw)) return raw as VendorBlogBlock[];
  if (typeof raw === "string") {
    try {
      const j = JSON.parse(raw);
      return Array.isArray(j) ? (j as VendorBlogBlock[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function youtubeEmbed(url: string): string | null {
  const u = url.trim();
  const m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export default function VendorBlogPublicPost() {
  const params = useParams<{ slug: string; postSlug: string }>();
  const [location, navigate] = useLocation();
  const [meta, setMeta] = useState<{
    vendorName?: string;
    vendorLogo?: string | null;
    vendorCover?: string | null;
    themeKey?: string | null;
    themeConfig?: Record<string, string> | null;
  } | null>(null);
  const [post, setPost] = useState<Record<string, unknown> | null>(null);
  const [comments, setComments] = useState<Array<{ id: number; author_name: string; body: string; created_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [authorName, setAuthorName] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const isEcomPath = location.startsWith("/alisveris/magaza/");
  const storeBase = `/${isEcomPath ? "alisveris/magaza" : "siparis/satici"}/${encodeURIComponent(params.slug || "")}`;
  const blogBase = `${storeBase}/blog`;

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      try {
        const m = await fetch(`${API}/delivery/vendors/${encodeURIComponent(params.slug)}/blog-meta`).then((r) => r.json());
        if (!c) {
          setMeta({
            vendorName: m.vendorName,
            vendorLogo: m.vendorLogo ?? null,
            vendorCover: m.vendorCover ?? null,
            themeKey: m.themeKey ?? null,
            themeConfig: m.themeConfig ?? null,
          });
        }
        const r = await fetch(
          `${API}/delivery/vendors/${encodeURIComponent(params.slug)}/blog/posts/${encodeURIComponent(params.postSlug)}`,
        );
        const d = await r.json();
        if (!r.ok) {
          if (!c) navigate(blogBase);
          return;
        }
        if (!c) {
          setPost(d.post);
          setComments(Array.isArray(d.comments) ? d.comments : []);
        }
      } catch {
        if (!c) navigate(blogBase);
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [params.slug, params.postSlug, navigate, blogBase]);

  useEffect(() => {
    if (!post) return;
    const path = `${blogBase}/${encodeURIComponent(String(post.slug || params.postSlug || ""))}`;
    const title = String(post.title || "Blog");
    const excerpt = seoPlainSnippet(String(post.excerpt || ""), 220) || title;
    applySocialShareMeta({
      title: `${title} — Blog`,
      descriptionPrimary: excerpt,
      canonicalPath: path,
    imageUrl: resolveClientMediaSrc(String(post.cover_image_url || "")),
    });
    applyBlogPostStructuredData({
      headline: title,
      description: excerpt,
      canonicalPath: path,
      imageUrl: resolveClientMediaSrc(String(post.cover_image_url || "")),
      datePublished: post.published_at ? String(post.published_at) : null,
      authorName: String(post.vendor_name || ""),
      breadcrumbs: [
        { name: "Ana sayfa", path: "/" },
        { name: location.startsWith("/alisveris/") ? "Mağazalar" : "Sipariş", path: location.startsWith("/alisveris/") ? "/alisveris" : "/siparis" },
        { name: String(post.vendor_name || "Mağaza"), path: storeBase },
        { name: "Blog", path: blogBase },
        { name: title, path },
      ],
    });
    return () => resetSeoToSiteDefaults();
  }, [post, blogBase, params.postSlug, storeBase, location]);

  async function sharePage() {
    const url = window.location.href;
    const title = String(post?.title || "Blog");
    try {
      if (navigator.share) await navigator.share({ title, url });
      else await navigator.clipboard.writeText(url);
    } catch {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        /* noop */
      }
    }
  }

  async function submitComment() {
    if (!authorName.trim() || !body.trim()) return;
    setSending(true);
    try {
      const r = await fetch(
        `${API}/delivery/vendors/${encodeURIComponent(params.slug)}/blog/posts/${encodeURIComponent(params.postSlug)}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ authorName: authorName.trim(), body: body.trim() }),
        },
      );
      if (r.ok) {
        setAuthorName("");
        setBody("");
        const d = await fetch(
          `${API}/delivery/vendors/${encodeURIComponent(params.slug)}/blog/posts/${encodeURIComponent(params.postSlug)}`,
        ).then((x) => x.json());
        setComments(Array.isArray(d.comments) ? d.comments : []);
      }
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) return null;

  const blocks = parseBlocks(post.content_json);
  const title = String(post.title || "");
  const cover = resolveClientMediaSrc(post.cover_image_url ? String(post.cover_image_url) : "");

  return (
    <VendorThemeShell
      themeKey={meta?.themeKey}
      themeConfig={meta?.themeConfig}
      vendorName={meta?.vendorName || String(post.vendor_name || "Mağaza")}
      vendorLogo={meta?.vendorLogo}
      vendorCover={meta?.vendorCover || cover}
      discoverHref="/kesfet"
    >
    <article className="min-h-screen bg-white pb-16">
      <div className="bg-gradient-to-r from-indigo-900 to-violet-900 text-white px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <Link href={blogBase} className="inline-flex items-center gap-1 text-white/80 hover:text-white text-sm mb-3">
            <ChevronLeft className="w-4 h-4" /> Blog listesi
          </Link>
          <h1 className="text-2xl font-black leading-tight">{title}</h1>
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              type="button"
              onClick={() => void sharePage()}
              className="inline-flex items-center gap-2 rounded-full bg-white/15 hover:bg-white/25 px-4 py-2 text-sm font-bold"
            >
              <Share2 className="w-4 h-4" /> Paylaş / kopyala
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${title} ${typeof window !== "undefined" ? window.location.href : ""}`)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500/90 hover:bg-emerald-500 px-4 py-2 text-sm font-bold"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {cover ? <img src={cover} alt="" className="w-full max-h-80 object-cover" /> : null}
          <div className="p-5 space-y-6">
            {blocks.map((b, i) => {
              if (b.type === "paragraph") {
                return (
                  <p key={i} className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {b.text}
                  </p>
                );
              }
              if (b.type === "image" && b.url) {
                return (
                  <figure key={i}>
                    <img src={resolveClientMediaSrc(b.url)} alt={b.caption || ""} className="rounded-xl w-full object-cover max-h-[480px]" />
                    {b.caption ? <figcaption className="text-xs text-gray-500 mt-2">{b.caption}</figcaption> : null}
                  </figure>
                );
              }
              if (b.type === "gallery" && b.urls?.length) {
                return (
                  <div key={i} className="grid grid-cols-2 gap-2">
                    {b.urls.map((u, j) => (
                      <img key={j} src={resolveClientMediaSrc(u)} alt="" className="rounded-lg w-full h-36 object-cover bg-gray-100" />
                    ))}
                  </div>
                );
              }
              if (b.type === "youtube") {
                const src = youtubeEmbed(b.url);
                return src ? (
                  <div key={i} className="aspect-video rounded-xl overflow-hidden bg-black">
                    <iframe title="YouTube" src={src} className="w-full h-full border-0" allowFullScreen />
                  </div>
                ) : null;
              }
              return null;
            })}
          </div>
        </div>

        <section className="mt-8 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">Yorumlar</h2>
          <ul className="space-y-3 mb-6">
            {comments.map((c) => (
              <li key={c.id} className="border-b border-gray-100 pb-3 last:border-0">
                <p className="text-xs font-bold text-indigo-700">{c.author_name}</p>
                <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">{c.body}</p>
                <p className="text-[10px] text-gray-400 mt-1">{new Date(c.created_at).toLocaleString("tr-TR")}</p>
              </li>
            ))}
            {!comments.length ? <li className="text-sm text-gray-500">İlk yorumu siz yazın.</li> : null}
          </ul>
          <div className="space-y-2">
            <input
              className="w-full border rounded-xl px-3 py-2 text-sm"
              placeholder="Adınız"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
            />
            <textarea
              className="w-full border rounded-xl px-3 py-2 text-sm min-h-[90px]"
              placeholder="Yorumunuz"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <button
              type="button"
              disabled={sending}
              onClick={() => void submitComment()}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm disabled:opacity-50"
            >
              {sending ? "Gönderiliyor…" : "Yorum gönder"}
            </button>
          </div>
        </section>
      </div>
    </article>
    </VendorThemeShell>
  );
}
