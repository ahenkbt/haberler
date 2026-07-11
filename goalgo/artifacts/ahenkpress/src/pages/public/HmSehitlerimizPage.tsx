import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Search } from "lucide-react";
import { apiUrl } from "@/lib/apiBase";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { hmSiteContentShellClass } from "@/lib/hmChromeLayout";
import {
  SADE_EDITORIAL_EYEBROW_CLASS,
  SADE_EDITORIAL_HERO_SECTION_CLASS,
  SADE_HERO_GLOW_CLASS,
} from "@/lib/yekpareSadeTheme";
import { HmSehitSearchModule } from "@/components/HmSehitSearchModule";

type MsbSehitRecord = {
  id: string;
  name: string;
  rank: string;
  registry: string;
  notice: string;
  martyrdomDate: string | null;
  year: number | null;
  imagePath: string;
};

type MsbPayload = {
  items: MsbSehitRecord[];
  fetchedAt: string;
  sourceUrl: string;
  total: number;
  source?: string;
};

const MSB_SOURCE = "https://www.msb.gov.tr/SehitVefat/Sehitlerimiz";

function sehitImageUrl(imagePath: string): string {
  if (!imagePath) return "";
  return apiUrl(`/api/msb/sehitlerimiz/image?path=${encodeURIComponent(imagePath)}`);
}

function formatFetchedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function cardSubtitle(item: MsbSehitRecord): string {
  if (item.notice?.includes(" - ")) return item.notice;
  if (item.martyrdomDate && item.registry) return `${item.martyrdomDate.replace(/\./g, "/")} - ${item.registry}`;
  return item.martyrdomDate ?? item.registry ?? "";
}

export default function HmSehitlerimizPage() {
  const ctx = useHmPublicLinkContextOptional();
  const queryClient = useQueryClient();
  const shellClass = hmSiteContentShellClass(ctx?.layoutPrefs);

  const [activeYear, setActiveYear] = useState<number | "all">("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["/api/msb/sehitlerimiz"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/msb/sehitlerimiz"));
      const j = (await r.json()) as { success?: boolean; data?: MsbPayload; error?: string };
      if (!r.ok || !j.success || !j.data) throw new Error(j.error ?? "Veri alınamadı");
      return j.data;
    },
    staleTime: 30 * 60 * 1000,
    retry: 2,
  });

  async function refreshRecentFromMsb() {
    const r = await fetch(apiUrl("/api/msb/sehitlerimiz?refresh=1"));
    const j = (await r.json()) as { success?: boolean; data?: MsbPayload; error?: string };
    if (!r.ok || !j.success || !j.data) throw new Error(j.error ?? "Güncelleme başarısız");
    queryClient.setQueryData(["/api/msb/sehitlerimiz"], j.data);
  }

  useEffect(() => {
    if (!ctx) return;
    document.title = `Şehitlerimiz · ${ctx.displayName}`;
  }, [ctx]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setSearch(q);
  }, []);

  const years = useMemo(() => {
    const set = new Set<number>();
    for (const item of data?.items ?? []) {
      if (item.year) set.add(item.year);
    }
    return [...set].sort((a, b) => b - a);
  }, [data?.items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");
    return (data?.items ?? []).filter((item) => {
      if (activeYear !== "all" && item.year !== activeYear) return false;
      if (!q) return true;
      const hay = `${item.name} ${item.rank} ${item.registry} ${item.notice} ${item.martyrdomDate ?? ""}`.toLocaleLowerCase("tr-TR");
      return hay.includes(q);
    });
  }, [activeYear, data?.items, search]);

  const stats = useMemo(() => {
    const items = data?.items ?? [];
    const yearCounts = new Map<number, number>();
    for (const item of items) {
      if (!item.year) continue;
      yearCounts.set(item.year, (yearCounts.get(item.year) ?? 0) + 1);
    }
    let peakYear: number | null = null;
    let peakCount = 0;
    for (const [year, count] of yearCounts) {
      if (count > peakCount) {
        peakCount = count;
        peakYear = year;
      }
    }
    return {
      total: items.length,
      yearSpan: years.length ? `${years[years.length - 1]} – ${years[0]}` : "—",
      peakYear,
      peakCount,
    };
  }, [data?.items, years]);

  return (
    <div className="min-w-0 bg-[#F5F1EB] text-[#16181C]">
      <section className={SADE_EDITORIAL_HERO_SECTION_CLASS}>
        <div className={SADE_HERO_GLOW_CLASS} />
        <div className={`${shellClass} relative z-[1]`}>
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-10">
            <div className="min-w-0">
              <div className={`mb-4 ${SADE_EDITORIAL_EYEBROW_CLASS}`}>
                Vatan Kahramanları Derneği
              </div>
              <h1 className="font-serif text-3xl font-bold leading-tight text-slate-950 md:text-5xl">
                Şehitlerimizi
                <span className="mt-1 block bg-gradient-to-br from-[#C9A84C] via-[#e8c96a] to-[#C9A84C] bg-clip-text italic text-transparent">
                  Minnetle Anıyoruz
                </span>
              </h1>
              <div className="mt-6 flex flex-row flex-wrap items-stretch gap-2.5">
                <div className="shrink-0 rounded-xl border border-emerald-100 bg-white px-4 py-3 shadow-sm">
                  <div className="font-serif text-2xl font-bold text-[#0f766e]">{years.length || "…"}</div>
                  <div className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-slate-500">Yıl ({stats.yearSpan})</div>
                </div>
                {stats.peakYear ? (
                  <div className="shrink-0 rounded-xl border border-emerald-100 bg-white px-4 py-3 shadow-sm">
                    <div className="font-serif text-sm font-bold text-[#0f766e]">{stats.peakYear}</div>
                    <div className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
                      En yoğun yıl ({stats.peakCount})
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="mt-6 max-w-xl rounded-xl border border-emerald-100 bg-white px-5 py-4 shadow-sm">
                <p className="font-serif text-sm italic leading-7 text-slate-700">
                  Ne mutlu Türk milletinin bir ferdi olarak bu vatan için canını verebilen kahramanlara.
                </p>
                <span className="mt-2 block text-[10px] font-bold uppercase tracking-[0.2em] text-[#C9A84C]">
                  — Gazi Mustafa Kemal Atatürk
                </span>
              </div>
            </div>
            <div className="w-full min-w-0">
              <HmSehitSearchModule
                variant="embedded"
                activeKind="tsk"
                showKindTabs
                showFullListLinks
                initialQ={search}
                onTskSearch={(q) => setSearch(q.trim())}
              />
            </div>
          </div>
        </div>
      </section>

      <nav className="sticky top-0 z-20 border-b border-[#E4DDD5] bg-white shadow-sm">
        <div className={`${shellClass} flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between`}>
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveYear("all")}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${
                activeYear === "all" ? "bg-[#0f766e] text-white" : "bg-[#F5F1EB] text-[#6B7280] hover:text-[#0f766e]"
              }`}
            >
              Tümü
            </button>
            {years.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => setActiveYear(year)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${
                  activeYear === year ? "bg-[#0f766e] text-white" : "bg-[#F5F1EB] text-[#6B7280] hover:text-[#0f766e]"
                }`}
              >
                {year}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-full border border-[#E4DDD5] bg-[#F5F1EB] px-4 py-2.5 lg:min-w-[300px]">
              <Search className="h-4 w-4 shrink-0 text-[#9CA3AF]" aria-hidden />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Şehit adı, il veya rütbe ara…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-[#9CA3AF]"
                aria-label="Şehit ara"
              />
            </div>
            <button
              type="button"
              onClick={() => void refreshRecentFromMsb().catch(() => void refetch())}
              disabled={isFetching}
              className="shrink-0 rounded-full border border-[#0f766e] px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-[#0f766e] hover:bg-[#FFF5F5] disabled:opacity-50"
            >
              {isFetching ? "…" : "MSB Güncelle"}
            </button>
          </div>
        </div>
      </nav>

      <main className={`${shellClass} py-8 md:py-10`}>
        {isLoading ? (
          <div className="flex flex-col items-center gap-4 py-20 text-sm text-[#6B7280]">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#0f766e] border-t-transparent" />
            Şehit listesi yükleniyor…
          </div>
        ) : null}

        {isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-8 text-center text-sm text-red-800">
            {(error as Error)?.message ?? "Liste yüklenemedi."}
          </div>
        ) : null}

        {!isLoading && !isError && filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-4xl opacity-40">🔍</div>
            <h3 className="mt-3 font-serif text-xl font-bold text-[#3D4451]">Sonuç bulunamadı</h3>
            <p className="mt-2 text-sm text-[#9CA3AF]">Arama veya yıl filtresini değiştirin.</p>
          </div>
        ) : null}

        {!isLoading && !isError && filtered.length > 0 ? (
          <>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-[#E4DDD5] pb-4">
              <div>
                <div className="text-[9px] font-extrabold uppercase tracking-[0.25em] text-[#0f766e]">
                  {activeYear === "all" ? "Tüm yıllar" : activeYear}
                  {search.trim() ? ` · "${search.trim()}"` : ""}
                </div>
                <h2 className="font-serif text-2xl font-bold md:text-3xl">
                  {activeYear === "all" ? "Şehitlerimiz" : `${activeYear} Yılı Şehitlerimiz`}
                </h2>
              </div>
              <div className="text-right">
                <div className="font-serif text-3xl font-bold text-[#0f766e]">{filtered.length}</div>
                <div className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#9CA3AF]">Gösterilen</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filtered.map((item) => (
                <article
                  key={item.id}
                  className="group text-center transition hover:-translate-y-0.5"
                  title={item.notice || item.name}
                >
                  <div className="mx-auto mb-3 aspect-[4/5] w-full max-w-[140px] overflow-hidden rounded-[15px] border border-[#E4DDD5] bg-[#141820] shadow-sm">
                    {item.imagePath ? (
                      <img
                        src={sehitImageUrl(item.imagePath)}
                        alt={item.name}
                        loading="lazy"
                        className="h-full w-full object-cover object-top transition group-hover:scale-[1.02]"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.opacity = "0";
                        }}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-2xl opacity-30">☪</div>
                    )}
                  </div>
                  <h3 className="text-[12px] font-extrabold leading-snug text-[#16181C]">{item.name}</h3>
                  <p className="mt-1 text-[11px] leading-[18px] text-[#6B7280]">
                    {item.rank || "—"}
                    {cardSubtitle(item) ? (
                      <>
                        <br />
                        <span className="text-[#0f766e]/90">{cardSubtitle(item)}</span>
                      </>
                    ) : null}
                  </p>
                </article>
              ))}
            </div>
          </>
        ) : null}

        {data?.fetchedAt ? (
          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[#E4DDD5] pt-5 text-xs leading-6 text-[#6B7280]">
            <span>
              Son güncelleme: <strong className="text-[#3D4451]">{formatFetchedAt(data.fetchedAt)}</strong>
              {data.source === "file-fallback" ? " (dosya)" : ""}
            </span>
            <a
              href={MSB_SOURCE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-extrabold uppercase tracking-[0.12em] text-[#0f766e] hover:text-[#0b5f59]"
            >
              MSB resmi listesi <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        ) : null}
      </main>

      <section className="border-t border-emerald-100 bg-[#f4fbf7] px-4 py-14 text-center text-slate-900">
        <div className={`${shellClass} max-w-3xl`}>
          <div className="mb-4 flex items-center justify-center gap-3 text-2xl text-[#C9A84C]">☽ ★ ☽</div>
          <h2 className="font-serif text-2xl font-bold text-slate-950 md:text-3xl">Ruhları Şad, Mekânları Cennet Olsun</h2>
          <div className="mx-auto my-4 h-px w-16 bg-gradient-to-r from-transparent via-[#0f766e] to-transparent" />
          <p className="text-sm leading-8 text-slate-600">
            Vatan Kahramanları Derneği olarak şehitlerimizin aziz hatırasını daima yaşatıyor, ailelerinin yanında olmayı en büyük görevlerimizden biri sayıyoruz.
          </p>
        </div>
      </section>
    </div>
  );
}
