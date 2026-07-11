import { useEffect } from "react";
import { Link, Redirect, useParams } from "wouter";
import { ChevronRight } from "lucide-react";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { hmSiteContentShellClass } from "@/lib/hmChromeLayout";
import {
  ATATURK_CORNER_LINKS,
  ATATURK_FACTS,
  ATATURK_LIFE_CHAPTERS,
  ATATURK_PRINCIPLES,
  ATATURK_QUOTES,
  ATATURK_REFORMS,
  ATATURK_TIMELINE,
  ataturkCornerPath,
  type AtaturkPageSlug,
} from "@/lib/hmAtaturkCorner";
import {
  SADE_EDITORIAL_EYEBROW_CLASS,
  SADE_EDITORIAL_HERO_SECTION_CLASS,
  SADE_EDITORIAL_NAV_ACTIVE_CLASS,
  SADE_EDITORIAL_NAV_IDLE_CLASS,
  SADE_EDITORIAL_PAGE_BG,
  SADE_HERO_GLOW_CLASS,
} from "@/lib/yekpareSadeTheme";

const VALID_SLUGS = new Set<AtaturkPageSlug>(["kose", "hayati", "kronoloji", "ilkeler", "sozleri"]);

function isAtaturkPageSlug(raw: string): raw is AtaturkPageSlug {
  return VALID_SLUGS.has(raw as AtaturkPageSlug);
}

function normalizeAtaturkPageSlug(raw: string): AtaturkPageSlug | null {
  const clean = raw.trim().toLowerCase().replace(/^ataturk-/, "");
  if (clean === "kosesi") return "kose";
  return isAtaturkPageSlug(clean) ? clean : null;
}

function SectionShell({
  eyebrow,
  title,
  children,
  innerClass,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  innerClass: string;
}) {
  return (
    <section className="py-10 md:py-14">
      <div className={innerClass}>
        <div className="mb-6">
          <div className="text-[11px] font-black uppercase tracking-[0.24em] text-[#0f766e]">{eyebrow}</div>
          <h2 className="mt-2 font-serif text-2xl font-bold text-slate-950 md:text-3xl">{title}</h2>
        </div>
        {children}
      </div>
    </section>
  );
}

function AtaturkNav({ activeSlug }: { activeSlug: AtaturkPageSlug }) {
  const h = useHmPublicHref();
  return (
    <div className="mt-8 flex flex-wrap gap-2">
      {ATATURK_CORNER_LINKS.map((item) => (
        <Link
          key={item.slug}
          href={h(ataturkCornerPath(item.slug))}
          className={`transition ${
            activeSlug === item.slug ? SADE_EDITORIAL_NAV_ACTIVE_CLASS : SADE_EDITORIAL_NAV_IDLE_CLASS
          }`}
        >
          {item.title}
        </Link>
      ))}
    </div>
  );
}

function PageCards() {
  const h = useHmPublicHref();
  return (
    <div className="grid gap-4 md:grid-cols-5">
      {ATATURK_CORNER_LINKS.map((item) => (
        <Link
          key={item.slug}
          href={h(ataturkCornerPath(item.slug))}
          className="group rounded-2xl border border-[#E4E0D8] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="font-serif text-3xl font-black text-[#0f766e]/15">{item.number}</span>
            <span className="rounded-full bg-[#0f766e] px-3 py-1 text-xs font-black text-white">{item.icon}</span>
          </div>
          <div className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-[#0f766e]">{item.eyebrow}</div>
          <h3 className="mt-2 font-serif text-lg font-bold text-slate-950">{item.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{item.summary}</p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-black uppercase tracking-wide text-[#0f766e]">
            İncele <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
          </span>
        </Link>
      ))}
    </div>
  );
}

function Facts() {
  return (
    <div className="grid gap-3 sm:grid-cols-5">
      {ATATURK_FACTS.map((fact) => (
        <div key={fact.label} className="rounded-xl border border-[#E4E0D8] bg-white p-5 text-center shadow-sm">
          <div className="text-2xl font-black text-[#0f766e]">{fact.value}</div>
          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{fact.label}</div>
        </div>
      ))}
    </div>
  );
}

function LifeChapters() {
  return (
    <div className="space-y-4">
      {ATATURK_LIFE_CHAPTERS.map((chapter, index) => (
        <article key={chapter.title} className="overflow-hidden rounded-2xl border border-[#E4E0D8] bg-white shadow-sm">
          <div className="grid md:grid-cols-[96px_1fr]">
            <div className="flex items-center justify-center bg-[#0f766e] px-6 py-5 text-2xl font-black text-white">
              {String(index + 1).padStart(2, "0")}
            </div>
            <div className="p-6">
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0f766e]">{chapter.years}</div>
              <h3 className="mt-2 font-serif text-xl font-bold text-slate-950">{chapter.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{chapter.text}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function Timeline({ compact = false }: { compact?: boolean }) {
  const rows = compact ? ATATURK_TIMELINE.slice(0, 8) : ATATURK_TIMELINE;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {rows.map((item) => (
        <article key={`${item.year}-${item.title}`} className="rounded-2xl border border-[#E4E0D8] bg-white p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="min-w-16 rounded-xl bg-[#0f766e] px-3 py-2 text-center text-sm font-black text-white">{item.year}</div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#C9A84C]">{item.period}</div>
              <h3 className="mt-1 font-serif text-lg font-bold text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function Principles({ compact = false }: { compact?: boolean }) {
  const rows = compact ? ATATURK_PRINCIPLES.slice(0, 3) : ATATURK_PRINCIPLES;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {rows.map((item, index) => (
        <article key={item.title} className="rounded-2xl border border-[#E4E0D8] bg-white p-6 shadow-sm">
          <div className="font-serif text-4xl font-black text-[#0f766e]/15">{String(index + 1).padStart(2, "0")}</div>
          <h3 className="mt-3 font-serif text-xl font-bold text-slate-950">{item.title}</h3>
          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#0f766e]">{item.subtitle}</div>
          <p className="mt-4 text-sm leading-7 text-slate-600">{item.text}</p>
          <div className="mt-4 rounded-lg bg-[#F5F2ED] p-3 text-xs leading-6 text-slate-600">
            <strong className="text-[#0f766e]">Temel reform:</strong> {item.reform}
          </div>
        </article>
      ))}
    </div>
  );
}

function Reforms() {
  return (
    <div className="space-y-3">
      {ATATURK_REFORMS.map((item) => (
        <article key={`${item.year}-${item.title}`} className="grid gap-3 rounded-xl border border-[#E4E0D8] bg-white p-4 shadow-sm md:grid-cols-[90px_220px_1fr]">
          <div className="font-black text-[#0f766e]">{item.year}</div>
          <h3 className="font-bold text-slate-950">{item.title}</h3>
          <p className="text-sm leading-6 text-slate-600">{item.text}</p>
        </article>
      ))}
    </div>
  );
}

function Quotes({ compact = false }: { compact?: boolean }) {
  const rows = compact ? ATATURK_QUOTES.slice(0, 4) : ATATURK_QUOTES;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {rows.map((quote) => (
        <article key={`${quote.category}-${quote.text}`} className="rounded-2xl border border-[#E4E0D8] bg-white p-6 shadow-sm">
          <span className="rounded-full border border-[#0f766e]/15 bg-[#0f766e]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#0f766e]">
            {quote.category}
          </span>
          <p className="mt-4 font-serif text-lg italic leading-8 text-slate-950">"{quote.text}"</p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#E4E0D8] pt-3 text-xs text-slate-500">
            <span className="font-bold">{quote.source}</span>
            {quote.year ? <span className="font-black text-[#0f766e]">{quote.year}</span> : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function OverviewPage({ innerClass }: { innerClass: string }) {
  const h = useHmPublicHref();
  return (
    <>
      <SectionShell eyebrow="Kısa Bilgiler" title="Atatürk Hakkında Temel Bilgiler" innerClass={innerClass}>
        <Facts />
      </SectionShell>
      <SectionShell eyebrow="Kaynak Sayfalar" title="Atatürk Köşesi Sayfaları" innerClass={innerClass}>
        <PageCards />
      </SectionShell>
      <SectionShell eyebrow="Önemli Dönüm Noktaları" title="Hayatının Özeti" innerClass={innerClass}>
        <Timeline compact />
        <div className="mt-8 text-center">
          <Link href={h("/ataturk/kronoloji")} className="inline-flex items-center gap-2 rounded bg-[#0f766e] px-5 py-3 text-sm font-black text-white">
            Tam kronolojiye git <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </SectionShell>
      <SectionShell eyebrow="Siyasi Felsefe" title="Altı Ok - Atatürk'ün İlkeleri" innerClass={innerClass}>
        <Principles compact />
      </SectionShell>
      <SectionShell eyebrow="Sözlerinden" title="Seçilmiş Sözler" innerClass={innerClass}>
        <Quotes compact />
      </SectionShell>
    </>
  );
}

function PageBody({ slug, innerClass }: { slug: AtaturkPageSlug; innerClass: string }) {
  if (slug === "hayati") {
    return (
      <>
        <SectionShell eyebrow="Biyografi" title="Beş Bölümde Büyük Bir Hayat" innerClass={innerClass}>
          <LifeChapters />
        </SectionShell>
        <SectionShell eyebrow="Başarıları" title="Atatürk Neden Önemlidir?" innerClass={innerClass}>
          <Principles compact />
        </SectionShell>
      </>
    );
  }
  if (slug === "kronoloji") {
    return (
      <SectionShell eyebrow="Zaman Çizgisi" title="Atatürk Kronolojisi" innerClass={innerClass}>
        <Timeline />
      </SectionShell>
    );
  }
  if (slug === "ilkeler") {
    return (
      <>
        <SectionShell eyebrow="Altı Ok" title="Her İlke Ayrıntılarıyla" innerClass={innerClass}>
          <Principles />
        </SectionShell>
        <SectionShell eyebrow="Uygulama" title="Kronolojik Reform Tablosu" innerClass={innerClass}>
          <Reforms />
        </SectionShell>
      </>
    );
  }
  if (slug === "sozleri") {
    return (
      <SectionShell eyebrow="Seçkiler" title="Atatürk Sözleri" innerClass={innerClass}>
        <Quotes />
      </SectionShell>
    );
  }
  return <OverviewPage innerClass={innerClass} />;
}

export default function HmAtaturkCornerPage() {
  const params = useParams<{ pageSlug?: string }>();
  const h = useHmPublicHref();
  const ctx = useHmPublicLinkContextOptional();
  const rawSlug = String(params?.pageSlug ?? "kose").trim().toLowerCase();
  const activeSlug = normalizeAtaturkPageSlug(rawSlug);
  const page = activeSlug ? ATATURK_CORNER_LINKS.find((item) => item.slug === activeSlug) ?? ATATURK_CORNER_LINKS[0] : null;
  const innerClass = hmSiteContentShellClass(ctx?.layoutPrefs);

  useEffect(() => {
    if (!page || typeof document === "undefined") return;
    document.title = `${page.title} | ${ctx?.displayName ?? "Haber Merkezi"}`;
  }, [ctx?.displayName, page]);

  if (!activeSlug || !page) {
    return <Redirect replace to={h("/ataturk")} />;
  }

  return (
    <div className={`min-h-screen text-slate-900`} style={{ background: SADE_EDITORIAL_PAGE_BG }}>
      <section className={SADE_EDITORIAL_HERO_SECTION_CLASS}>
        <div className={SADE_HERO_GLOW_CLASS} />
        <div className={`relative ${innerClass}`}>
          <div className={SADE_EDITORIAL_EYEBROW_CLASS}>Atatürk Köşesi</div>
          <h1 className="mt-5 max-w-3xl font-serif text-4xl font-bold leading-tight text-slate-950 md:text-5xl">{page.title}</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">{page.summary}</p>
          <AtaturkNav activeSlug={activeSlug} />
        </div>
      </section>
      <PageBody slug={activeSlug} innerClass={innerClass} />
    </div>
  );
}
