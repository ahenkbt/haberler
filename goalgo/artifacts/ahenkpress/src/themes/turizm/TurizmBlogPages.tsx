import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { BookingCoreShell } from "@/themes/bookingcore/BookingCoreShell";
import { apiFetch, apiUrl } from "@/lib/apiBase";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { TURIZM } from "./turizmRoutes";
import type { TurizmBlogPostDetail, TurizmBlogPostListItem } from "./turizmCmsTypes";
import "@/styles/bookingCoreTurizm.css";

function useDocumentMeta(title: string, description?: string | null) {
  useEffect(() => {
    document.title = title;
    if (description) {
      let el = document.querySelector('meta[name="description"]');
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", "description");
        document.head.appendChild(el);
      }
      el.setAttribute("content", description);
    }
  }, [title, description]);
}

export function TurizmBlogListPage() {
  const [posts, setPosts] = useState<TurizmBlogPostListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useDocumentMeta("Turizm Blog | Yekpare Seyahat");

  useEffect(() => {
    void apiFetch(apiUrl("/api/tourism/blog?limit=24"))
      .then((r) => r.json())
      .then((d: { posts?: TurizmBlogPostListItem[] }) => setPosts(d.posts ?? []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <BookingCoreShell module="turlar" title="Turizm Blog">
      <div className="bc-blog">
        <header className="bc-blog__head">
          <h1>Turizm Blog</h1>
          <p>Destinasyon rehberleri, sezon ipuçları ve kategori tanıtım yazıları.</p>
        </header>
        {loading ? (
          <p className="bc-blog__loading">Yükleniyor…</p>
        ) : posts.length === 0 ? (
          <p className="bc-blog__empty">Henüz yayınlanmış blog yazısı yok.</p>
        ) : (
          <div className="bc-blog-grid">
            {posts.map((p) => (
              <Link key={p.id} href={`${TURIZM.blog}/${encodeURIComponent(p.slug)}`} className="bc-blog-card">
                {p.cover_image_url ? (
                  <div className="bc-blog-card__media">
                    <img src={p.cover_image_url} alt="" loading="lazy" />
                  </div>
                ) : null}
                <div className="bc-blog-card__body">
                  {p.is_featured ? <span className="bc-blog-card__badge">Manşet</span> : null}
                  <h2>{p.title}</h2>
                  {p.excerpt ? <p>{p.excerpt}</p> : null}
                </div>
              </Link>
            ))}
          </div>
        )}
        <Link href={TURIZM.hub} className="bc-stub__back">
          ← Seyahat ana sayfa
        </Link>
      </div>
    </BookingCoreShell>
  );
}

export function TurizmBlogDetailPage() {
  const [, params] = useRoute("/turizm/blog/:slug");
  const slug = params?.slug ?? "";
  const [post, setPost] = useState<TurizmBlogPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useDocumentMeta(
    post?.meta_title || post?.title || "Turizm Blog",
    post?.meta_description || post?.excerpt,
  );

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    void apiFetch(apiUrl(`/api/tourism/blog/${encodeURIComponent(slug)}`))
      .then(async (r) => {
        if (r.status === 404) {
          setNotFound(true);
          setPost(null);
          return;
        }
        const d = (await r.json()) as { post?: TurizmBlogPostDetail };
        setPost(d.post ?? null);
        setNotFound(!d.post);
      })
      .catch(() => {
        setNotFound(true);
        setPost(null);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <BookingCoreShell module="turlar" title={post?.title || "Blog"}>
      <article className="bc-blog-article">
        {loading ? (
          <p>Yükleniyor…</p>
        ) : notFound || !post ? (
          <>
            <h1>Yazı bulunamadı</h1>
            <Link href={TURIZM.blog}>Blog listesine dön</Link>
          </>
        ) : (
          <>
            {post.cover_image_url ? (
              <div className="bc-blog-article__cover">
                <img src={post.cover_image_url} alt="" />
              </div>
            ) : null}
            <header>
              <h1>{post.title}</h1>
              {post.excerpt ? <p className="bc-blog-article__lead">{post.excerpt}</p> : null}
            </header>
            {post.body_html ? (
              <div className="bc-blog-article__body" dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.body_html) }} />
            ) : (
              <p>İçerik yakında eklenecek.</p>
            )}
          </>
        )}
        <Link href={TURIZM.blog} className="bc-stub__back">
          ← Tüm blog yazıları
        </Link>
      </article>
    </BookingCoreShell>
  );
}
