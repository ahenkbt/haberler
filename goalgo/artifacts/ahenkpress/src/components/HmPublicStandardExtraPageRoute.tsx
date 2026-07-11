import { useEffect, type ReactNode } from "react";
import { Link } from "wouter";
import { HmNestedLayout } from "@/components/HmNestedLayout";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { applyHmNewsSiteHomeMeta } from "@/lib/pageSeo";
import { hmPublicHref, hmPublicSeoPath, hmPublicSiteOrigin } from "@/lib/hmPublicLinks";
import { findHmExtraPageBySlug, normalizeHmExtraPageSlug } from "@/lib/hmExtraPageLookup";
import { HmCustomPageContent, type HmCustomPageSite } from "@/pages/public/HmCustomPage";
import HmSehitlerimizPage from "@/pages/public/HmSehitlerimizPage";
import HmCanakkaleSehitleriPage from "@/pages/public/HmCanakkaleSehitleriPage";

function HmSubpageSeo({ segment, label }: { segment: string; label: string }) {
  const ctx = useHmPublicLinkContextOptional();
  useEffect(() => {
    if (!ctx) return;
    const canonicalPath = hmPublicSeoPath(segment.replace(/^\/+|\/+$/g, ""), {
      slug: ctx.slug,
      domain: ctx.domain,
      domain2: ctx.domain2,
      domain3: ctx.domain3,
    });
    applyHmNewsSiteHomeMeta({
      siteName: ctx.displayName,
      browserTitle: `${label} · ${ctx.displayName}`,
      description: `${label} — ${ctx.displayName}`,
      canonicalPath,
      canonicalOrigin: hmPublicSiteOrigin(ctx.domain),
      imageUrl: ctx.layoutPrefs.logoUrl,
      logoUrl: ctx.layoutPrefs.logoUrl,
      faviconUrl: ctx.layoutPrefs.faviconUrl,
    });
    return () => {};
  }, [ctx?.slug, ctx?.displayName, ctx?.domain, ctx?.layoutPrefs.logoUrl, ctx?.layoutPrefs.faviconUrl, segment, label]);
  return null;
}

function hmCustomPageSiteFromCtx(ctx: NonNullable<ReturnType<typeof useHmPublicLinkContextOptional>>): HmCustomPageSite {
  return {
    id: ctx.siteId,
    slug: ctx.slug,
    domain: ctx.domain ?? null,
    displayName: ctx.displayName,
    contact: ctx.contact ?? null,
    layoutPrefs: ctx.layoutPrefs,
  };
}

function HmExtraPageMissing({ segment }: { segment: string }) {
  const ctx = useHmPublicLinkContextOptional();
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-slate-600">
      <p className="font-medium text-slate-800">Bu sayfa henüz yayınlanmamış.</p>
      <p className="mt-2">
        Editör → Sayfalar bölümünden slug&apos;ı <strong>{segment}</strong> olan bir özel sayfa ekleyin ve yayına alın.
      </p>
      {ctx ? (
        <Link
          href={hmPublicHref("/", { domain: ctx.domain, slug: ctx.slug, siteId: ctx.siteId })}
          className="mt-4 inline-block text-red-600 hover:underline"
        >
          ← Vitrine dön
        </Link>
      ) : null}
    </div>
  );
}

/** Site bağlamı yüklendikten sonra özel sayfayı çözer (ctx üst bileşende null olabilir). */
function HmPublicStandardExtraPageBody({
  segment,
  label,
  fallback,
}: {
  segment: string;
  label: string;
  fallback?: ReactNode;
}) {
  const ctx = useHmPublicLinkContextOptional();
  const normalizedSegment = normalizeHmExtraPageSlug(segment);
  const extraPage = ctx ? findHmExtraPageBySlug(ctx.layoutPrefs.hmExtraPages, segment) : undefined;
  const pageLabel = extraPage?.title?.trim() || label;

  useEffect(() => {
    if (!ctx || !extraPage) return;
    const canonicalPath = hmPublicSeoPath(segment.replace(/^\/+|\/+$/g, ""), {
      slug: ctx.slug,
      domain: ctx.domain,
      domain2: ctx.domain2,
      domain3: ctx.domain3,
    });
    applyHmNewsSiteHomeMeta({
      siteName: ctx.displayName,
      browserTitle: `${pageLabel} · ${ctx.displayName}`,
      description: pageLabel,
      canonicalPath,
      canonicalOrigin: hmPublicSiteOrigin(ctx.domain),
      imageUrl: ctx.layoutPrefs.logoUrl,
      logoUrl: ctx.layoutPrefs.logoUrl,
      faviconUrl: ctx.layoutPrefs.faviconUrl,
    });
    return () => {};
  }, [ctx, extraPage, pageLabel, segment]);

  if (normalizedSegment === "sehitlerimiz") {
    return <HmSehitlerimizPage />;
  }

  if (normalizedSegment === "canakkale-sehitleri") {
    return <HmCanakkaleSehitleriPage />;
  }

  if (!ctx) {
    return <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-slate-500">Sayfa yükleniyor…</div>;
  }

  if (extraPage) {
    return <HmCustomPageContent pageSlug={extraPage.slug} site={hmCustomPageSiteFromCtx(ctx)} />;
  }

  return fallback ?? <HmExtraPageMissing segment={segment} />;
}

/** `/tr/:slug/kunye` gibi standart yollar — aynı slug'lı özel sayfa varsa onu gösterir. */
export function HmPublicStandardExtraPageRoute({
  segment,
  label,
  fallback,
}: {
  segment: string;
  label: string;
  fallback?: ReactNode;
}) {
  return (
    <HmNestedLayout>
      <HmSubpageSeo segment={segment} label={label} />
      <HmPublicStandardExtraPageBody segment={segment} label={label} fallback={fallback} />
    </HmNestedLayout>
  );
}
