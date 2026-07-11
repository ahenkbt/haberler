import { useEffect, useMemo, useState } from "react";
import { Link, Redirect, useLocation, useParams } from "wouter";
import { ChevronRight, ExternalLink } from "lucide-react";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { hmPublicHref } from "@/lib/hmPublicLinks";
import { useBrowserLocationSearch } from "@/hooks/useBrowserLocationSearch";
import {
  CULTURE_PORTAL_ITEMS,
  HM_WAR_PAGES,
  LIBERATION_DAYS,
  NATIONAL_DAYS,
  nationalDayEncyclopediaPath,
  corporateWarPath,
  culturePortalPath,
  type NationalDayEntry,
  type WarPage,
} from "@/lib/hmCorporateHeritage";
import { hmSiteContentShellClass } from "@/lib/hmChromeLayout";
import {
  SADE_EDITORIAL_EYEBROW_CLASS,
  SADE_EDITORIAL_HERO_SECTION_CLASS,
  SADE_EDITORIAL_PAGE_BG,
  SADE_HERO_GLOW_CLASS,
} from "@/lib/yekpareSadeTheme";

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen text-slate-900" style={{ background: SADE_EDITORIAL_PAGE_BG }}>{children}</div>;
}

function useHeritageContentShell(): string {
  const ctx = useHmPublicLinkContextOptional();
  return hmSiteContentShellClass(ctx?.layoutPrefs);
}

function Hero({
  eyebrow,
  title,
  subtitle,
  summary,
  children,
  innerClass,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  summary: string;
  children?: React.ReactNode;
  innerClass: string;
}) {
  return (
    <section className={SADE_EDITORIAL_HERO_SECTION_CLASS}>
      <div className={SADE_HERO_GLOW_CLASS} />
      <div className={`relative grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-center ${innerClass}`}>
        <div>
          <div className={SADE_EDITORIAL_EYEBROW_CLASS}>{eyebrow}</div>
          <h1 className="mt-5 max-w-3xl font-serif text-4xl font-bold leading-tight text-slate-950 md:text-5xl">
            {title}
            {subtitle ? <em className="mt-2 block text-[#C9A84C]">{subtitle}</em> : null}
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">{summary}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

function SectionShell({
  eyebrow,
  title,
  dark = false,
  children,
  innerClass,
}: {
  eyebrow: string;
  title: string;
  dark?: boolean;
  children: React.ReactNode;
  innerClass: string;
}) {
  return (
    <section className={`py-10 md:py-14 ${dark ? "bg-[#f4fbf7]" : ""}`}>
      <div className={innerClass}>
        <div className="mb-6">
          <div className={`text-[11px] font-black uppercase tracking-[0.24em] ${dark ? "text-[#C9A84C]" : "text-[#0f766e]"}`}>
            {eyebrow}
          </div>
          <h2 className="mt-2 font-serif text-2xl font-bold text-slate-950 md:text-3xl">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

function StatsGrid({ stats }: { stats: WarPage["stats"] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat) => (
        <div key={`${stat.value}-${stat.label}`} className="rounded-xl border border-emerald-100 bg-white p-5 text-center shadow-sm">
          <div className="text-2xl font-black text-[#0f766e]">{stat.value}</div>
          <div className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

function FactsGrid({ page }: { page: WarPage }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {page.facts.map((fact) => (
        <article key={`${fact.label}-${fact.value}`} className="flex gap-3 border-b border-[#E4E0D8] bg-white p-4">
          <span className="w-8 shrink-0 text-xl">{fact.icon}</span>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{fact.label}</div>
            <p className="mt-1 text-sm leading-6 text-slate-800">{fact.value}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function Timeline({ page }: { page: WarPage }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {page.timeline.map((item) => (
        <article key={`${item.date}-${item.title}`} className="rounded-2xl border border-[#E4E0D8] bg-white p-5 shadow-sm">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#0f766e] text-xl text-white">{item.icon}</div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0f766e]">{item.date}</div>
              <h3 className="mt-1 font-serif text-lg font-bold text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function FeatureCards({ page, dark = false }: { page: WarPage; dark?: boolean }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {page.features.map((item) => (
        <article
          key={`${item.title}-${item.date}`}
          className={`rounded-2xl border p-6 shadow-sm ${
            dark ? "border-emerald-100 bg-white" : "border-[#E4E0D8] bg-white"
          }`}
        >
          <div className="text-3xl">{item.icon}</div>
          {item.date ? (
            <div className={`mt-4 text-[10px] font-black uppercase tracking-[0.18em] ${dark ? "text-[#C9A84C]" : "text-[#0f766e]"}`}>
              {item.date}
            </div>
          ) : null}
          <h3 className="mt-2 font-serif text-lg font-bold text-slate-950">{item.title}</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">{item.text}</p>
        </article>
      ))}
    </div>
  );
}

function Remembrance({ page }: { page: WarPage }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {page.remembrance.map((item) => (
        <article key={`${item.icon}-${item.title}`} className="flex gap-5 rounded-2xl border border-[#E4E0D8] bg-white p-5 shadow-sm">
          <div className="min-w-20 rounded-xl bg-[#0f766e] px-4 py-3 text-center text-white">
            <div className="text-2xl font-black leading-none">{item.icon}</div>
            <div className="mt-1 text-[10px] font-black uppercase tracking-[0.16em]">{item.date}</div>
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-slate-950">{item.title}</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">{item.text}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function WarsIndex() {
  const h = useHmPublicHref();
  const innerClass = useHeritageContentShell();
  return (
    <Shell>
      <Hero
        eyebrow="Tarih · Savaşlar"
        title="Türk Milletinin Savaşları"
        subtitle="Zaferler ve anma sayfaları"
        summary="Çanakkale'den Millî Mücadele'ye, Kore'den Kıbrıs'a uzanan kurumsal tarih sayfaları."
        innerClass={innerClass}
      >
        <StatsGrid stats={HM_WAR_PAGES.map((page) => ({ value: page.year, label: page.shortTitle }))} />
      </Hero>

      <SectionShell eyebrow="Kaynak Sayfalar" title="Savaşlar ve Harekâtlar" innerClass={innerClass}>
        <div className="grid gap-5 md:grid-cols-2">
          {HM_WAR_PAGES.map((page) => (
            <Link key={page.slug} href={h(corporateWarPath(page.slug))} className="group rounded-2xl border border-[#E4E0D8] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0f766e]">{page.eyebrow}</div>
              <h2 className="mt-3 font-serif text-2xl font-bold text-slate-950">{page.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{page.summary}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-xs font-black uppercase tracking-wide text-[#0f766e]">
                Sayfayı Aç <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </SectionShell>
    </Shell>
  );
}

function WarDetail({ page }: { page: WarPage }) {
  const h = useHmPublicHref();
  const ctx = useHmPublicLinkContextOptional();
  const innerClass = hmSiteContentShellClass(ctx?.layoutPrefs);

  useEffect(() => {
    if (typeof document !== "undefined") document.title = `${page.title} | ${ctx?.displayName ?? "Haber Merkezi"}`;
  }, [ctx?.displayName, page.title]);

  return (
    <Shell>
      <Hero eyebrow={page.eyebrow} title={page.title} subtitle={page.subtitle} summary={page.summary} innerClass={innerClass}>
        <StatsGrid stats={page.stats} />
      </Hero>

      {page.quote ? (
        <section className="bg-[#F5F2ED] py-8">
          <blockquote className={`border-l-4 border-[#0f766e] bg-white p-6 font-serif text-lg italic leading-8 text-slate-800 shadow-sm ${innerClass}`}>
            "{page.quote}"
            {page.quoteSource ? <cite className="mt-3 block text-xs not-italic uppercase tracking-[0.2em] text-slate-400">{page.quoteSource}</cite> : null}
          </blockquote>
        </section>
      ) : null}

      <SectionShell eyebrow="Genel Bakış" title="Savaşın Önemi" innerClass={innerClass}>
        <div className="grid gap-8 md:grid-cols-[1fr_1fr]">
          <div className="space-y-4 text-sm leading-7 text-slate-600">
            {page.overview.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <FactsGrid page={page} />
        </div>
      </SectionShell>

      <SectionShell eyebrow="Kronoloji" title="Tarihi Akış" innerClass={innerClass}>
        <Timeline page={page} />
      </SectionShell>

      <SectionShell eyebrow={page.featureEyebrow} title={page.featureTitle} dark={page.slug === "kore-savasi" || page.slug === "kurtulus-savasi"} innerClass={innerClass}>
        <FeatureCards page={page} dark={page.slug === "kore-savasi" || page.slug === "kurtulus-savasi"} />
      </SectionShell>

      <SectionShell eyebrow="Anma" title={page.remembranceTitle} innerClass={innerClass}>
        <Remembrance page={page} />
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={h("/savaslar")} className="rounded bg-[#0f766e] px-5 py-3 text-sm font-black text-white">
            Tüm savaşlar
          </Link>
          <Link href={h("/milli-gunler")} className="rounded border border-[#0f766e]/20 px-5 py-3 text-sm font-black text-[#0f766e]">
            Millî günler
          </Link>
        </div>
      </SectionShell>
    </Shell>
  );
}

export function HmCorporateWarsPage() {
  const params = useParams<{ warSlug?: string }>();
  const h = useHmPublicHref();
  const raw = String(params?.warSlug ?? "").trim();
  if (!raw) return <WarsIndex />;
  const page = HM_WAR_PAGES.find((item) => item.slug === raw);
  if (!page) return <Redirect replace to={h("/savaslar")} />;
  return <WarDetail page={page} />;
}

function openNationalDayBilgiAgaci(
  day: NationalDayEntry,
  ctx: ReturnType<typeof useHmPublicLinkContextOptional>,
) {
  const path = nationalDayEncyclopediaPath(day);
  const url = hmPublicHref(path, {
    domain: ctx?.domain ?? null,
    slug: ctx?.slug ?? null,
    siteId: ctx?.siteId ?? null,
    forceAbsolute: true,
  });
  window.open(url, "_blank", "noopener,noreferrer");
}

export function HmCorporateNationalDaysPage() {
  const h = useHmPublicHref();
  const ctx = useHmPublicLinkContextOptional();
  const innerClass = hmSiteContentShellClass(ctx?.layoutPrefs);

  useEffect(() => {
    if (typeof document !== "undefined") document.title = `Millî Günler | ${ctx?.displayName ?? "Haber Merkezi"}`;
  }, [ctx?.displayName]);

  return (
    <Shell>
      <Hero
        eyebrow="Millî Günler & Anma Törenleri"
        title="Millî ve Zafer Günleri"
        subtitle="Anma Takvimi"
        summary="Türkiye'nin resmî millî günleri, zafer bayramları, anma törenleri ve il il kurtuluş günleri. Şehitlerimizi ve gazilerimizi saygıyla anıyoruz."
        innerClass={innerClass}
      >
        <StatsGrid
          stats={[
            { value: "18 Mart", label: "Şehitler Günü" },
            { value: "19 Mayıs", label: "Millî Mücadele" },
            { value: "30 Ağustos", label: "Zafer Bayramı" },
            { value: "29 Ekim", label: "Cumhuriyet" },
          ]}
        />
      </Hero>

      <SectionShell eyebrow="Millî ve Zafer Günleri" title="Anma, Millî ve Zafer Günleri Takvimi" innerClass={innerClass}>
        <div className="grid gap-4 md:grid-cols-3">
          {NATIONAL_DAYS.map((day) => (
            <article key={`${day.day}-${day.month}-${day.title}`} className="overflow-hidden rounded-2xl border border-[#E4E0D8] bg-white shadow-sm">
              <div
                className={`flex gap-4 p-5 text-white ${
                  day.color === "gold"
                    ? "bg-[#C9A84C]"
                    : day.color === "dark"
                      ? "bg-[#0f766e]"
                      : day.color === "navy"
                        ? "bg-[#0f766e]"
                        : day.color === "grey"
                          ? "bg-slate-500"
                          : "bg-[#0f766e]"
                }`}
              >
                <div className="min-w-16 text-center">
                  <div className="text-3xl font-black leading-none">{day.day}</div>
                  <div className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/70">{day.month}</div>
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold leading-snug">{day.title}</h3>
                  <div className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/60">{day.type}</div>
                </div>
              </div>
              <div className="p-5">
                <p className="text-sm leading-7 text-slate-600">{day.text}</p>
                {day.day !== "—" ? (
                  <button
                    type="button"
                    onClick={() => openNationalDayBilgiAgaci(day, ctx)}
                    className="mt-4 inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.12em] text-[#0f766e] hover:underline"
                  >
                    Bilgi Ağacı <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </SectionShell>

      <SectionShell eyebrow="Kurtuluş Günleri" title="İl ve İlçe Kurtuluş Günleri" innerClass={innerClass}>
        <div className="overflow-x-auto rounded-2xl border border-[#E4E0D8] bg-white shadow-sm">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="bg-emerald-50 text-[10px] uppercase tracking-[0.16em] text-slate-600">
              <tr>
                <th className="px-4 py-3">İl</th>
                <th className="px-4 py-3">İlçe</th>
                <th className="px-4 py-3">İşgal Başlangıcı</th>
                <th className="px-4 py-3">Kurtuluş Tarihi</th>
                <th className="px-4 py-3">İşgal Gücü</th>
              </tr>
            </thead>
            <tbody>
              {LIBERATION_DAYS.map((row) => (
                <tr key={row.join("-")} className="border-t border-[#E4E0D8] odd:bg-[#F5F2ED]/55">
                  <td className="px-4 py-3 font-bold text-slate-950">{row[0]}</td>
                  <td className="px-4 py-3 text-slate-600">{row[1]}</td>
                  <td className="px-4 py-3 text-slate-500">{row[2]}</td>
                  <td className="px-4 py-3 font-black text-[#0f766e]">{row[3]}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-800">{row[4]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs italic leading-6 text-slate-500">
          Kaynak PHP sayfasındaki T.C. İçişleri Bakanlığı verilerine dayalı seçilmiş tablo statik olarak aktarılmıştır.
        </p>
        <div className="mt-8">
          <Link href={h("/savaslar")} className="inline-flex items-center gap-2 rounded bg-[#0f766e] px-5 py-3 text-sm font-black text-white">
            Savaşlar sayfasına git <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </SectionShell>
    </Shell>
  );
}

function parseKpFromSearch(search: string): string {
  const query = search.startsWith("?") ? search.slice(1) : search;
  try {
    return new URLSearchParams(query).get("kp") ?? "";
  } catch {
    return "";
  }
}

function safeDecodeKpValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function culturePortalAliasKey(value: string): string {
  const decoded = safeDecodeKpValue(value).trim();
  let source = decoded;

  try {
    source = new URL(decoded).pathname;
  } catch {
    const withoutQuery = decoded.split("?")[0] ?? decoded;
    source = withoutQuery.split("#")[0] ?? withoutQuery;
  }

  const segment = source.split("/").filter(Boolean).pop() ?? source;
  return segment
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[ıİ]/g, "i")
    .replace(/[ğĞ]/g, "g")
    .replace(/[üÜ]/g, "u")
    .replace(/[şŞ]/g, "s")
    .replace(/[öÖ]/g, "o")
    .replace(/[çÇ]/g, "c")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const CULTURE_PORTAL_IFRAME_SANDBOX = [
  "allow-scripts",
  "allow-same-origin",
  "allow-forms",
  "allow-popups",
  "allow-popups-to-escape-sandbox",
  "allow-top-navigation",
  "allow-top-navigation-by-user-activation",
  "allow-downloads",
].join(" ");

type CulturePortalItem = (typeof CULTURE_PORTAL_ITEMS)[number];

const CULTURE_PORTAL_ALIASES: Array<[CulturePortalItem["slug"], string[]]> = [
  ["gezilecekyer", ["gezilecek-yer", "gezilecek-yerler", "gezilecek yer", "gezilecek yerler"]],
  ["seyahatHatirasi", ["seyahathatirasi", "seyahat-hatirasi", "seyahat-hatırası", "seyahat hatirasi", "seyahat hatırası"]],
  ["neyenir", ["ne-yenir", "ne yenir", "geleneksel-mutfak", "geleneksel mutfak", "yoresel-lezzetler", "yöresel lezzetler"]],
  ["turizmaktiviteleri", ["turizm-aktiviteleri", "turizm aktiviteleri", "etkinlik-deneyim", "etkinlik deneyim"]],
  ["kulturatlasi", ["kultur-atlasi", "kültür-atlası", "kultur atlasi", "kültür atlası"]],
  ["muzeler", ["müzeler", "muzeler", "turkiye-muzeleri", "türkiye müzeleri"]],
  ["sanat", ["turk-sanati", "türk sanatı", "sanat-1-2"]],
];

const CULTURE_PORTAL_ITEM_BY_ALIAS = new Map<string, CulturePortalItem>();

for (const item of CULTURE_PORTAL_ITEMS) {
  for (const value of [item.slug, item.title, item.subtitle, item.url]) {
    CULTURE_PORTAL_ITEM_BY_ALIAS.set(culturePortalAliasKey(value), item);
  }
}

for (const [slug, aliases] of CULTURE_PORTAL_ALIASES) {
  const item = CULTURE_PORTAL_ITEMS.find((candidate) => candidate.slug === slug);
  if (!item) continue;
  for (const alias of aliases) {
    CULTURE_PORTAL_ITEM_BY_ALIAS.set(culturePortalAliasKey(alias), item);
  }
}

function resolveCulturePortalItem(kp: string): CulturePortalItem | null {
  const key = culturePortalAliasKey(kp);
  return key ? (CULTURE_PORTAL_ITEM_BY_ALIAS.get(key) ?? null) : null;
}

function CulturePortalMobileSelect({ activeSlug }: { activeSlug: string }) {
  const h = useHmPublicHref();
  const [, setLocation] = useLocation();

  return (
    <label className="block lg:hidden">
      <span className="sr-only">Kültür portalı kategorisi</span>
      <select
        value={activeSlug}
        onChange={(event) => setLocation(h(culturePortalPath(event.target.value)))}
        className="w-full rounded-xl border border-[#E7DED1] bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/30"
      >
        {CULTURE_PORTAL_ITEMS.map((item) => (
          <option key={item.slug} value={item.slug}>
            {item.title}
          </option>
        ))}
      </select>
    </label>
  );
}

function CulturePortalCategoryNav({ activeSlug }: { activeSlug: string }) {
  const h = useHmPublicHref();

  return (
    <nav className="hidden space-y-1.5 lg:block" aria-label="Kültür portalı kategorileri">
      {CULTURE_PORTAL_ITEMS.map((item) => {
        const active = item.slug === activeSlug;
        return (
          <Link
            key={item.slug}
            href={h(culturePortalPath(item.slug))}
            className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
              active ? "bg-[#0f766e] text-white" : "bg-[#F8F5F0] text-slate-700 hover:bg-[#EFE7DC] hover:text-slate-950"
            }`}
          >
            <span aria-hidden>{item.icon}</span>
            <span className="min-w-0 truncate">{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function HmCorporateCulturePortalPage() {
  const locationSearch = useBrowserLocationSearch();
  const h = useHmPublicHref();
  const ctx = useHmPublicLinkContextOptional();
  const activeKp = parseKpFromSearch(locationSearch);
  const active = useMemo(
    () => resolveCulturePortalItem(activeKp) ?? CULTURE_PORTAL_ITEMS[0],
    [activeKp],
  );

  const innerClass = hmSiteContentShellClass(ctx?.layoutPrefs);

  useEffect(() => {
    if (typeof document !== "undefined") document.title = `Kültür Portalı | ${ctx?.displayName ?? "Haber Merkezi"}`;
  }, [ctx?.displayName]);

  return (
    <Shell>
      <section className="overflow-x-hidden bg-[#F5F2ED] py-3 md:py-6">
        <div className={innerClass}>
          <CulturePortalMobileSelect activeSlug={active.slug} />

          <div className="mt-3 grid gap-4 lg:mt-0 lg:grid-cols-[minmax(0,1fr)_250px] lg:items-start lg:gap-5">
            <div className="min-w-0 w-full">
              <div className="hm-culture-portal-frame mx-auto w-full max-w-full rounded-2xl border border-[#E7DED1] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:rounded-[1.75rem]">
                <div className="hm-culture-portal-iframe-shell">
                  <iframe
                    key={`${active.slug}:${active.url}`}
                    title={`Kültür Portalı - ${active.title}`}
                    src={active.url}
                    className="hm-culture-portal-iframe"
                    sandbox={CULTURE_PORTAL_IFRAME_SANDBOX}
                    allow="fullscreen; clipboard-write; web-share"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1 text-xs leading-6 text-slate-500">
                <span>Kaynak portal canlı olarak gösterilir; bazı iç bağlantılar Bakanlık sitesinin tercihine göre açılabilir.</span>
                <a href={active.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-black uppercase tracking-[0.12em] text-[#0f766e] hover:text-[#6f1323]">
                  Kaynak sitede aç <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            <aside className="hidden lg:block lg:sticky lg:top-6">
              <CulturePortalCategoryNav activeSlug={active.slug} />
            </aside>
          </div>
        </div>
      </section>
    </Shell>
  );
}
