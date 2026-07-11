import { Link } from "wouter";

export type VendorBlogPostRow = Record<string, unknown>;

function normalizePost(row: VendorBlogPostRow): {
  slug: string;
  title: string;
  excerpt: string;
  coverUrl: string | null;
  publishedLabel: string;
} | null {
  const slug = String(row.slug ?? "").trim();
  if (!slug) return null;
  const title = String(row.title ?? "").trim() || "Blog yazısı";
  const excerpt = String(row.excerpt ?? "").trim();
  const coverRaw = row.cover_image_url ?? row.coverImageUrl;
  const coverUrl = typeof coverRaw === "string" && coverRaw.trim() ? coverRaw.trim() : null;
  const pubRaw = row.published_at ?? row.publishedAt;
  let publishedLabel = "";
  if (typeof pubRaw === "string" && pubRaw.trim()) {
    const d = new Date(pubRaw);
    publishedLabel = Number.isNaN(d.getTime())
      ? pubRaw.trim()
      : d.toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
  }
  return { slug, title, excerpt, coverUrl, publishedLabel };
}

/** Mağaza vitrininde blog özet bloğu (EcomSatici + tema renderer). */
export function VendorBlogStorefrontSection(props: {
  blogBasePath: string;
  blogEnabled: boolean;
  blogPreviewPosts: VendorBlogPostRow[];
  blogPreviewLoading: boolean;
  className?: string;
}) {
  if (!props.blogEnabled || !props.blogBasePath) return null;

  return (
    <section className={props.className ?? "bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-3"}>
      <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide">Blog</h2>
      <p className="text-xs text-gray-600 leading-snug">
        Tüm yazılar için blog sayfasına gidin; burada son yayınlar özetlenir.
      </p>
      <Link
        href={`${props.blogBasePath}/blog`}
        className="inline-flex rounded-full bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700 transition"
      >
        Blog&apos;a git
      </Link>
      {props.blogPreviewLoading ? (
        <p className="text-xs text-gray-500">Yükleniyor…</p>
      ) : props.blogPreviewPosts.length > 0 ? (
        <div className="space-y-2 pt-1">
          <h3 className="text-[11px] font-black uppercase tracking-wide text-violet-800">Son eklenen yazılar</h3>
          <VendorBlogPreviewSection posts={props.blogPreviewPosts} postHrefPrefix={props.blogBasePath} />
        </div>
      ) : (
        <p className="text-xs text-gray-500 leading-relaxed">Henüz listelenecek yayınlanmış yazı yok.</p>
      )}
    </section>
  );
}

export function VendorBlogPreviewSection(props: {
  posts: VendorBlogPostRow[];
  /** Tek yazı: `${prefix}/blog/yazi-slug` */
  postHrefPrefix: string;
  compact?: boolean;
}) {
  const items = props.posts
    .slice(0, 5)
    .map(normalizePost)
    .filter((x): x is NonNullable<typeof x> => x != null);

  if (items.length === 0) return null;

  return (
    <div className={props.compact ? "space-y-2" : "space-y-3"}>
      <div className={`grid gap-3 ${props.compact ? "sm:grid-cols-1" : "sm:grid-cols-2"}`}>
        {items.map((p) => (
          <Link
            key={p.slug}
            href={`${props.postHrefPrefix.replace(/\/$/, "")}/blog/${encodeURIComponent(p.slug)}`}
            className="group flex gap-3 rounded-xl border border-violet-100 bg-gradient-to-br from-white to-violet-50/40 p-3 shadow-sm hover:border-violet-200 hover:shadow transition text-left"
          >
            <div className="w-24 h-20 shrink-0 rounded-lg overflow-hidden bg-violet-100 border border-violet-100">
              {p.coverUrl ? (
                <img src={p.coverUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl text-violet-300">📝</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-gray-900 line-clamp-2 group-hover:text-violet-800 transition">{p.title}</h4>
              {p.excerpt ? <p className="text-xs text-gray-600 line-clamp-2 mt-1">{p.excerpt}</p> : null}
              {p.publishedLabel ? <p className="text-[11px] text-violet-600/80 mt-1.5 font-medium">{p.publishedLabel}</p> : null}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
