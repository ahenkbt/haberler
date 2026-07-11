import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { PORTAL_ORIGIN } from "@/lib/portalBrand";
import { useQuery } from "@tanstack/react-query";
import {
  Rss,
  MapPinned,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Globe,
  FileCode2,
} from "lucide-react";
import { apiUrl } from "@/lib/apiBase";
import { applySocialShareMeta, resetSeoToSiteDefaults } from "@/lib/pageSeo";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type FeedListItem = { label: string; url: string };
type FeedListGroup = { title: string; items: FeedListItem[] };
type FeedsList = {
  indexUrl?: string;
  groups?: FeedListGroup[];
  rssGroups?: FeedListGroup[];
};

function normalizeFeedsList(raw: unknown): { indexUrl: string; rssGroups: FeedListGroup[]; sitemapGroups: FeedListGroup[] } {
  const data = (raw && typeof raw === "object" ? raw : {}) as FeedsList;
  const indexUrl = String(data.indexUrl ?? "").trim() || `${typeof window !== "undefined" ? window.location.origin : PORTAL_ORIGIN}/sitemap.xml`;
  const rssGroups = Array.isArray(data.rssGroups) ? data.rssGroups.filter((g) => g?.items?.length) : [];
  const sitemapGroups = Array.isArray(data.groups) ? data.groups.filter((g) => g?.items?.length) : [];
  return { indexUrl, rssGroups, sitemapGroups };
}

function CopyUrlButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          /* ignore */
        }
      }}
      className="shrink-0 rounded-lg p-2 text-zinc-400 hover:text-[#0f766e] hover:bg-emerald-50 transition-colors"
      title="URL kopyala"
      aria-label="URL kopyala"
    >
      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

function FeedLinkRow({ item, badge }: { item: FeedListItem; badge: "RSS" | "XML" }) {
  const badgeClass =
    badge === "RSS"
      ? "bg-orange-100 text-orange-700 border-orange-200"
      : "bg-sky-100 text-sky-700 border-sky-200";
  return (
    <li className="flex items-start gap-2 rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-3 hover:border-zinc-200 hover:bg-white transition-colors">
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex flex-1 min-w-0 items-start gap-2 text-sm"
      >
        <ExternalLink className="w-4 h-4 shrink-0 mt-0.5 text-zinc-400 group-hover:text-[#0f766e]" aria-hidden />
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${badgeClass}`}>
              {badge}
            </span>
            <span className="font-semibold text-zinc-800 group-hover:text-[#0f766e]">{item.label}</span>
          </span>
          <span className="block text-xs text-zinc-400 break-all mt-1 leading-relaxed">{item.url}</span>
        </span>
      </a>
      <CopyUrlButton url={item.url} />
    </li>
  );
}

function TopicAccordion({
  groups,
  badge,
  defaultOpen,
}: {
  groups: FeedListGroup[];
  badge: "RSS" | "XML";
  defaultOpen?: string;
}) {
  if (groups.length === 0) return null;
  return (
    <Accordion type="multiple" defaultValue={defaultOpen ? [defaultOpen] : [groups[0]?.title].filter(Boolean)} className="space-y-3">
      {groups.map((group) => (
        <AccordionItem
          key={`${badge}-${group.title}`}
          value={group.title}
          className="rounded-2xl border border-zinc-200/80 bg-white shadow-sm overflow-hidden px-0 data-[state=open]:shadow-md data-[state=open]:border-zinc-300 transition-shadow"
        >
          <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-zinc-50/50 [&[data-state=open]]:bg-gradient-to-r [&[data-state=open]]:from-red-50/50 [&[data-state=open]]:to-transparent">
            <span className="flex items-center gap-3 text-left">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white shrink-0">
                {badge === "RSS" ? <Rss className="w-4 h-4" /> : <FileCode2 className="w-4 h-4" />}
              </span>
              <span>
                <span className="block font-bold text-zinc-900 text-base">{group.title}</span>
                <span className="block text-xs text-zinc-500 font-normal mt-0.5">
                  {group.items.length} {badge === "RSS" ? "besleme" : "site haritası"}
                </span>
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-4">
            <ul className="space-y-2">
              {group.items.map((item) => (
                <FeedLinkRow key={item.url} item={item} badge={badge} />
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export default function SiteHaritalari() {
  const { data, isLoading, isError, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["/api/sitemap/list.json"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/sitemap/list.json"), { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error("Liste yüklenemedi");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const { indexUrl, rssGroups, sitemapGroups } = useMemo(
    () => normalizeFeedsList(data),
    [data],
  );

  const totalRss = useMemo(() => rssGroups.reduce((n, g) => n + g.items.length, 0), [rssGroups]);
  const totalMaps = useMemo(() => sitemapGroups.reduce((n, g) => n + g.items.length, 0), [sitemapGroups]);

  useEffect(() => {
    applySocialShareMeta({
      title: "RSS ve Site Haritaları — Yekpare",
      descriptionPrimary:
        "Yekpare RSS haber beslemeleri ve XML site haritaları. İçerik güncellendikçe liste otomatik yenilenir.",
      canonicalPath: "/site-haritalari",
    });
    return () => resetSeoToSiteDefaults();
  }, []);

  const updatedLabel = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })
    : null;

  return (
    <div className="sade-public-page min-h-[60vh] bg-gradient-to-b from-emerald-50/40 via-white to-zinc-50">
      <div className="sade-public-hero sade-public-hero-surface relative overflow-hidden border-b border-emerald-100 text-slate-950">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(3,157,85,0.12), transparent 45%), radial-gradient(circle at 80% 0%, rgba(15,118,110,0.1), transparent 40%)",
          }}
        />
        <div className="relative max-w-4xl mx-auto px-4 py-10 sm:py-14">
          <nav className="text-sm text-slate-500 mb-6">
            <Link href="/" className="hover:text-[#0f766e] transition-colors">
              Ana sayfa
            </Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">RSS ve site haritaları</span>
          </nav>
          <div className="flex items-start gap-4">
            <div className="hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0f766e] text-white shadow-lg shadow-emerald-900/15 shrink-0">
              <Sparkles className="w-7 h-7" aria-hidden />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">RSS ve Site Haritaları</h1>
              <p className="mt-3 text-slate-600 leading-relaxed max-w-2xl text-sm sm:text-base">
                Tüm RSS beslemeleri ve XML site haritaları tek sayfada. Yeni haber, işletme veya kategori eklendikçe
                listeler sunucudan otomatik güncellenir.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={indexUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-white text-zinc-900 px-4 py-2.5 text-sm font-bold hover:bg-zinc-100 transition-colors shadow"
                >
                  <Globe className="w-4 h-4 text-[#0f766e]" />
                  Ana sitemap dizini
                </a>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  disabled={isFetching}
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-600 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
                  Yenile
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-4 py-8 sm:py-10">
        {!isLoading && !isError ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">RSS</p>
              <p className="text-2xl font-black text-zinc-900 mt-1">{totalRss}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Site haritası</p>
              <p className="text-2xl font-black text-zinc-900 mt-1">{totalMaps}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm col-span-2 sm:col-span-1">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Son güncelleme</p>
              <p className="text-sm font-semibold text-zinc-800 mt-2">{updatedLabel ?? "—"}</p>
            </div>
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
            <RefreshCw className="w-8 h-8 text-zinc-300 animate-spin mx-auto mb-3" />
            <p className="text-sm text-zinc-500">Beslemeler yükleniyor…</p>
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <p className="text-sm text-red-700 font-medium">Liste şu an yüklenemedi.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="sade-btn-primary mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold"
            >
              <RefreshCw className="w-4 h-4" />
              Tekrar dene
            </button>
          </div>
        ) : (
          <div className="space-y-10">
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Rss className="w-5 h-5 text-[#0f766e]" />
                <h2 className="text-lg font-black text-zinc-900">RSS beslemeleri</h2>
              </div>
              {rssGroups.length > 0 ? (
                <TopicAccordion groups={rssGroups} badge="RSS" defaultOpen={rssGroups[0]?.title} />
              ) : (
                <p className="text-sm text-zinc-500 rounded-xl border border-dashed border-zinc-200 p-6 text-center">
                  Henüz RSS beslemesi yok.
                </p>
              )}
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <MapPinned className="w-5 h-5 text-[#0f766e]" />
                <h2 className="text-lg font-black text-zinc-900">XML site haritaları</h2>
              </div>
              <p className="text-sm text-zinc-600 mb-4 leading-relaxed">
                Google Search Console&apos;a yalnızca{" "}
                <a href={indexUrl} className="text-[#0f766e] font-semibold hover:underline break-all">
                  {indexUrl}
                </a>{" "}
                eklemeniz yeterlidir; alt haritalar otomatik keşfedilir. RSS beslemelerini site haritası olarak
                eklemeyin — RSS okuyucular içindir, Google site haritası formatı değildir.
              </p>
              {sitemapGroups.length > 0 ? (
                <TopicAccordion groups={sitemapGroups} badge="XML" defaultOpen={sitemapGroups[0]?.title} />
              ) : (
                <p className="text-sm text-zinc-500 rounded-xl border border-dashed border-zinc-200 p-6 text-center">
                  Site haritası listesi boş.
                </p>
              )}
            </section>
          </div>
        )}
      </article>
    </div>
  );
}
