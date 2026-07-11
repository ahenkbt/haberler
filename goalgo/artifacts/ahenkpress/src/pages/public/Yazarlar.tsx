import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { Link, useLocation } from "wouter";
import { User, Feather } from "lucide-react";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { useMemo, useEffect } from "react";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { applyHmNewsSiteHomeMeta } from "@/lib/pageSeo";
import { hmPublicSiteOrigin } from "@/lib/hmPublicLinks";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import {
  resolveSadeAccent,
  SADE_BTN_PRIMARY_CLASS,
  SADE_HERO_EYEBROW_CLASS,
  SADE_HERO_GLOW_CLASS,
  SADE_HERO_SHELL_CLASS,
  SADE_PUBLIC_POST_HERO_BODY_CLASS,
  YEKPARE_SADE_ACCENT_DARK,
} from "@/lib/yekpareSadeTheme";

export default function Yazarlar() {
  const { data: settings } = useGetSiteSettings();
  const hmCtx = useHmPublicLinkContextOptional();
  const accent = hmCtx
    ? settings?.primaryColor?.trim() || resolveSadeAccent()
    : resolveSadeAccent(settings?.primaryColor);
  const [loc] = useLocation();
  const h = useHmPublicHref();
  const hmSiteId = useMemo(() => {
    if (hmCtx?.siteId != null && hmCtx.siteId > 0) return hmCtx.siteId;
    const q = new URLSearchParams((loc.split("?")[1] ?? "").trim());
    const fromHm = parseInt(String(q.get("hmSiteId") ?? ""), 10);
    const fromSid = parseInt(String(q.get("siteId") ?? ""), 10);
    if (Number.isFinite(fromHm) && fromHm > 0) return fromHm;
    if (Number.isFinite(fromSid) && fromSid > 0) return fromSid;
    return null;
  }, [loc, hmCtx?.siteId]);

  useEffect(() => {
    if (!hmCtx) return;
    applyHmNewsSiteHomeMeta({
      siteName: hmCtx.displayName,
      browserTitle: `Köşe yazarları · ${hmCtx.displayName}`,
      description: `Köşe yazarları — ${hmCtx.displayName}`,
      canonicalPath: `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(hmCtx.slug)}/yazarlar`,
      canonicalOrigin: hmPublicSiteOrigin(hmCtx.domain),
      imageUrl: hmCtx.layoutPrefs.logoUrl,
      logoUrl: hmCtx.layoutPrefs.logoUrl,
      faviconUrl: hmCtx.layoutPrefs.faviconUrl,
    });
    return () => {};
  }, [hmCtx]);

  const { data: rawAuthors, isLoading } = useQuery<any[]>({
    queryKey: ["/api/authors", hmSiteId ?? "global"],
    queryFn: () =>
      hmSiteId != null
        ? apiRequest(`/api/authors?hmSiteId=${encodeURIComponent(String(hmSiteId))}`)
        : apiRequest("/api/authors"),
    staleTime: 10 * 60 * 1000,
    placeholderData: (previous) => previous,
  });
  const { data: globalAuthorsFallback } = useQuery<any[]>({
    queryKey: ["/api/authors", "global-fallback", hmSiteId ?? "portal"],
    queryFn: () => apiRequest("/api/authors"),
    enabled: hmSiteId != null,
    staleTime: 10 * 60 * 1000,
    placeholderData: (previous) => previous,
  });

  const primaryAuthors = Array.isArray(rawAuthors) ? rawAuthors : (rawAuthors as any)?.authors ?? [];
  const fallbackAuthors = Array.isArray(globalAuthorsFallback)
    ? globalAuthorsFallback
    : (globalAuthorsFallback as any)?.authors ?? [];
  const authors = primaryAuthors.length > 0 ? primaryAuthors : fallbackAuthors;

  return (
    <div className="sade-public-page min-h-screen">
      <main className={`mx-auto max-w-screen-xl px-4 pb-8 md:pb-10 ${SADE_PUBLIC_POST_HERO_BODY_CLASS}`}>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link href={h("/")} className="hover:opacity-80 font-medium" style={{ color: accent }}>
            Anasayfa
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-semibold">Yazarlar</span>
        </div>

        <div className={`sade-public-hero mb-8 md:mb-10 ${SADE_HERO_SHELL_CLASS} rounded-[2rem] p-6 md:p-8 shadow-sm`}>
          <div className={SADE_HERO_GLOW_CLASS} aria-hidden />
          <p className={SADE_HERO_EYEBROW_CLASS}>Köşe Yazıları</p>
          <div className="mt-3">
            <h1 className="text-2xl md:text-3xl font-black text-slate-950 tracking-tight">Köşe Yazarlarımız</h1>
            <p className="text-sm text-slate-600 mt-1">Görüş ve analiz yazılarıyla gündemi takip edin.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-100 p-6 text-center animate-pulse shadow-sm">
                <div className="w-24 h-24 bg-slate-200 rounded-full mx-auto mb-4" />
                <div className="h-4 bg-slate-200 rounded w-2/3 mx-auto mb-2" />
                <div className="h-3 bg-slate-200 rounded w-1/2 mx-auto" />
              </div>
            ))}
          </div>
        ) : authors.length === 0 ? (
          <div className="text-center py-20 text-slate-400 rounded-2xl border border-dashed border-slate-200 bg-white">
            <User className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium text-slate-600">Henüz yazar eklenmemiş</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {authors.map((author: any) => (
              <div
                key={author.id}
                className="bg-white rounded-xl shadow-sm border border-emerald-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow"
              >
                <div className="p-6 pb-4 text-center flex-1">
                  <div
                    className="w-24 h-24 rounded-full mx-auto overflow-hidden bg-slate-100 mb-4 ring-4 ring-offset-2 ring-offset-white ring-emerald-100"
                    style={{ boxShadow: `0 0 0 4px ${accent}22` }}
                  >
                    {author.avatarUrl ? (
                      <img
                        src={resolveClientMediaSrc(author.avatarUrl) || author.avatarUrl}
                        alt={author.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-white font-black text-2xl"
                        style={{ background: `linear-gradient(135deg, ${accent}, ${YEKPARE_SADE_ACCENT_DARK})` }}
                      >
                        {author.name?.[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <h2 className="font-black text-slate-900 text-lg leading-tight">{author.name}</h2>
                  {!hmSiteId ? (
                    <p className="mt-1.5 text-xs text-slate-500 leading-snug">
                      Yekpare Haber Merkezi tarafından eklenmiştir.
                    </p>
                  ) : null}
                </div>

                <div className="mt-auto border-t border-emerald-50 bg-emerald-50/40 px-5 py-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                    <Feather className="w-3.5 h-3.5 shrink-0 text-[#0f766e]" />
                    <span>{author.articleCount ?? "—"} yazı</span>
                  </div>
                  <Link
                    href={h(`/yazar/${author.id}`)}
                    className={`${SADE_BTN_PRIMARY_CLASS} text-xs font-black px-3 py-1.5 shrink-0`}
                  >
                    Tüm Yazıları
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
