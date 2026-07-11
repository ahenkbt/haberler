import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { ChevronLeft } from "lucide-react";
import {
  applySocialShareMeta,
  applyBlogListStructuredData,
  resetSeoToSiteDefaults,
  seoPlainSnippet,
} from "@/lib/pageSeo";
import { VendorThemeShell } from "@/components/VendorThemeShell";
import { resolveClientMediaSrc } from "@/lib/apiBase";

const API = "/api";

type PostListItem = {
  id: number;
  slug: string;
  title: string;
  excerpt?: string | null;
  cover_image_url?: string | null;
  published_at?: string | null;
};

export default function VendorBlogPublicList() {
  const params = useParams<{ slug: string }>();
  const [location, navigate] = useLocation();
  const [meta, setMeta] = useState<{
    enabled: boolean;
    vendorName?: string;
    vendorLogo?: string | null;
    vendorCover?: string | null;
    themeKey?: string | null;
    themeConfig?: Record<string, string> | null;
  } | null>(null);
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const isEcomPath = location.startsWith("/alisveris/magaza/");
  const storeBase = `/${isEcomPath ? "alisveris/magaza" : "siparis/satici"}/${encodeURIComponent(params.slug || "")}`;
  const blogBase = `${storeBase}/blog`;

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      try {
        const m = await fetch(`${API}/delivery/vendors/${encodeURIComponent(params.slug)}/blog-meta`).then((r) => r.json());
        if (c) return;
        setMeta({
          enabled: Boolean(m.enabled),
          vendorName: m.vendorName,
          vendorLogo: m.vendorLogo ?? null,
          vendorCover: m.vendorCover ?? null,
          themeKey: m.themeKey ?? null,
          themeConfig: m.themeConfig ?? null,
        });
        if (!m.enabled) {
          setPosts([]);
          return;
        }
        const p = await fetch(`${API}/delivery/vendors/${encodeURIComponent(params.slug)}/blog/posts`).then((r) => r.json());
        setPosts(Array.isArray(p.posts) ? p.posts : []);
      } catch {
        if (!c) navigate(isEcomPath ? "/alisveris" : "/siparis");
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [params.slug, navigate, isEcomPath]);

  useEffect(() => {
    if (!meta?.enabled) return;
    const vendorName = meta.vendorName || "Mağaza";
    const title = `${vendorName} — Blog`;
    const desc =
      posts.length > 0
        ? `${vendorName} blog yazıları: ${posts.slice(0, 3).map((p) => p.title).join(", ")}`
        : `${vendorName} mağaza blogu — güncel yazılar ve duyurular.`;
    applySocialShareMeta({
      title,
      descriptionPrimary: seoPlainSnippet(desc, 220),
      canonicalPath: blogBase,
    });
    applyBlogListStructuredData({
      name: title,
      description: desc,
      canonicalPath: blogBase,
      posts: posts.map((p) => ({
        path: `${blogBase}/${encodeURIComponent(p.slug)}`,
        headline: p.title,
        datePublished: p.published_at,
      })),
      breadcrumbs: [
        { name: "Ana sayfa", path: "/" },
        { name: isEcomPath ? "Mağazalar" : "Sipariş", path: isEcomPath ? "/alisveris" : "/siparis" },
        { name: vendorName, path: storeBase },
        { name: "Blog", path: blogBase },
      ],
    });
    return () => resetSeoToSiteDefaults();
  }, [meta, posts, blogBase, isEcomPath, storeBase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!meta?.enabled) {
    return (
      <div className="min-h-screen bg-white px-4 py-10 text-center">
        <p className="text-gray-700 font-medium">Bu mağaza için blog şu an kapalı.</p>
        <Link href={storeBase} className="text-indigo-600 font-bold underline mt-4 inline-block">
          Mağazaya dön
        </Link>
      </div>
    );
  }

  return (
    <VendorThemeShell
      themeKey={meta.themeKey}
      themeConfig={meta.themeConfig}
      vendorName={meta.vendorName || "Mağaza"}
      vendorLogo={meta.vendorLogo}
      vendorCover={meta.vendorCover}
      discoverHref="/kesfet"
    >
    <div className="min-h-screen bg-white pb-12">
      <div className="bg-gradient-to-r from-indigo-900 to-violet-900 text-white px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <button type="button" onClick={() => navigate(storeBase)} className="flex items-center gap-1 text-white/80 hover:text-white text-sm mb-4">
            <ChevronLeft className="w-4 h-4" /> Mağaza
          </button>
          <h1 className="text-2xl font-black">{meta.vendorName || "Mağaza"} — Blog</h1>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 -mt-4 space-y-4">
        {posts.map((p) => (
          <Link
            key={p.id}
            href={`${blogBase}/${encodeURIComponent(p.slug)}`}
            className="block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:border-indigo-300 transition"
          >
            {p.cover_image_url ? <img src={resolveClientMediaSrc(p.cover_image_url)} alt="" className="w-full h-40 object-cover" /> : null}
            <div className="p-4">
              <h2 className="font-bold text-lg text-gray-900">{p.title}</h2>
              {p.excerpt ? <p className="text-sm text-gray-600 mt-2 line-clamp-3">{p.excerpt}</p> : null}
              {p.published_at ? <p className="text-xs text-gray-400 mt-2">{new Date(p.published_at).toLocaleString("tr-TR")}</p> : null}
            </div>
          </Link>
        ))}
        {!posts.length ? <p className="text-center text-gray-500 py-8">Henüz yayımlanmış yazı yok.</p> : null}
      </div>
    </div>
    </VendorThemeShell>
  );
}
