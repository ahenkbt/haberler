import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { MemberBroadcastStrip } from "@/components/MemberBroadcastStrip";
import { Button } from "@/components/ui/button";
import { parseNewsSiteLayoutFromJson } from "@/lib/newsSiteLayout";
import { hmPublicHref } from "@/lib/hmPublicLinks";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { resolveClientMediaSrc } from "@/lib/apiBase";

type HmMeta = {
  id: number;
  slug: string;
  domain: string | null;
  displayName: string;
  layout?: unknown;
};

export function partnerSiteIdFromLocation(loc: string): number | null {
  const q = new URLSearchParams((loc.split("?")[1] ?? "").trim());
  const a = parseInt(String(q.get("siteId") ?? ""), 10);
  const b = parseInt(String(q.get("hmSiteId") ?? ""), 10);
  if (Number.isFinite(a) && a > 0) return a;
  if (Number.isFinite(b) && b > 0) return b;
  return null;
}

/**
 * Haber merkezi bağlamında (`siteId` veya `hmSiteId` query) Yekpare AppNav/SiteFooter
 * yerine sadece ilgili site şeridi.
 */
export default function HmPartnerPublicShell({ children }: { children: React.ReactNode }) {
  const [loc] = useLocation();
  const siteId = useMemo(() => partnerSiteIdFromLocation(loc), [loc]);

  const { data: meta, isLoading } = useQuery({
    queryKey: ["/api/hm/meta/by-id", siteId],
    queryFn: () => apiRequest(`/api/hm/meta/by-id/${siteId}`) as Promise<HmMeta>,
    enabled: siteId != null,
  });

  const layoutPrefs = useMemo(
    () => parseNewsSiteLayoutFromJson(meta?.layout != null ? JSON.stringify(meta.layout) : null),
    [meta?.layout],
  );

  if (siteId == null) {
    return <>{children}</>;
  }

  const logo = layoutPrefs.logoUrl?.trim();
  const accent = (layoutPrefs.hmPrimaryColor?.trim() ?? "").length >= 3 ? layoutPrefs.hmPrimaryColor!.trim() : "#e61e25";

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-slate-50 to-white">
      <MemberBroadcastStrip />
      <header className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-screen-xl mx-auto px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-3">
            {isLoading ? (
              <div className="h-9 w-40 bg-slate-700 rounded animate-pulse" />
            ) : meta ? (
              <>
                {logo ? (
                  <img
                    src={resolveClientMediaSrc(logo)}
                    alt={meta.displayName}
                    className="h-9 w-auto max-w-[180px] object-contain shrink-0 rounded bg-white/5 px-1"
                  />
                ) : (
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-red-400">Haber merkezi</div>
                  <div className="font-black text-base sm:text-lg truncate">{meta.displayName}</div>
                  <div className="text-[11px] text-slate-400 truncate">
                    <code className="text-slate-300">/{HM_SITE_PUBLIC_PREFIX}/{meta.slug}</code>
                    {meta.domain ? <span> · {meta.domain}</span> : null}
                  </div>
                </div>
                )}
              </>
            ) : (
              <span className="text-sm text-slate-300">Haber sitesi</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {meta ? (
              <>
                <Button size="sm" variant="secondary" className="h-8 bg-white text-slate-900 hover:bg-slate-100" asChild>
                  <Link href={hmPublicHref("/", { domain: meta.domain, slug: meta.slug, siteId: meta.id })}>Site vitrin</Link>
                </Button>
                <Button size="sm" className="h-8 text-white border-0" style={{ background: accent }} asChild>
                  <Link
                    href={hmPublicHref(`/tum-haberler?siteId=${encodeURIComponent(String(meta.id))}`, {
                      domain: meta.domain,
                      slug: meta.slug,
                      siteId: meta.id,
                    })}
                  >
                    Haber akışı
                  </Link>
                </Button>
              </>
            ) : null}
            <Button variant="outline" size="sm" className="h-8 border-slate-600 text-white hover:bg-slate-800" asChild>
              <Link href="/">Yekpare</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      <footer className="mt-auto border-t border-slate-200 bg-slate-100 py-4 text-center text-xs text-slate-500">
        {meta ? <span className="text-slate-600">© {new Date().getFullYear()} {meta.displayName}</span> : null}
      </footer>
    </div>
  );
}
