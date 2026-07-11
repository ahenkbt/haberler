import { Link } from "wouter";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  Banknote,
  Briefcase,
  Clock,
  Flame,
  Globe2,
  Landmark,
  MapPin,
  Megaphone,
  Newspaper,
  Trophy,
} from "lucide-react";
import type { HmNewsHomeModuleId } from "@/lib/newsSiteLayout";
import { HmNewsImage, resolveNewsItemImageUrl } from "@/components/HmNewsImage";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { decodeHtmlEntities } from "@/lib/decodeHtmlEntities";
import type { ReactNode } from "react";
import { hmCategorySlug, humanizeNewsCategorySlug } from "@/lib/hmCategorySlug";
import { resolveHmCategoryColor } from "@/lib/hmVitrinThemeTokens";
import { newsItemMatchesCategorySlug } from "@/lib/hmHomeModuleCategories";

export type AhenkHaberBlockContext = {
  moduleId: HmNewsHomeModuleId;
  accent: string;
  hmCategoryColors?: Record<string, string> | null;
  categorySlug: string;
  categoryTitle: string;
  items: any[];
  authors: any[];
  yazarlarHref: string;
  newsHref: (n: any) => string;
  kategoriHref: (slug: string) => string;
};

const AHENK_ICON_ROWS = [
  { slug: "siyaset", label: "Siyaset", icon: Landmark },
  { slug: "ekonomi", label: "Ekonomi", icon: Banknote },
  { slug: "yerel", label: "Yerel", icon: MapPin },
  { slug: "spor", label: "Spor", icon: Trophy },
  { slug: "dunya", label: "Dünya", icon: Globe2 },
  { slug: "magazin", label: "Magazin", icon: Megaphone },
] as const;

function newsTitle(raw: unknown): string {
  return decodeHtmlEntities(String(raw ?? "").trim()) || "Haber";
}

function fmtDateShort(d: string | null | undefined): string {
  if (!d) return "";
  try {
    return format(new Date(d), "d MMM HH:mm", { locale: tr });
  } catch {
    return "";
  }
}

function catColor(item: any, accent: string, hmCategoryColors?: Record<string, string> | null): string {
  const slug = hmCategorySlug(item?.categorySlug, item?.categoryName);
  if (slug && hmCategoryColors?.[slug]) return hmCategoryColors[slug]!;
  return accent;
}

function vitrinImgSrc(url: string | null | undefined): string {
  return resolveClientMediaSrc(url ?? "") || "";
}

function AhenkSectionHead({
  title,
  color,
  href,
}: {
  title: string;
  color: string;
  href?: string;
}) {
  return (
    <div className="hm-ahenk-section-head">
      <h2 className="hm-ahenk-section-title" style={{ borderLeftColor: color, color }}>
        {href ? (
          <Link href={href} className="hover:opacity-90">
            {title}
          </Link>
        ) : (
          title
        )}
      </h2>
      {href ? (
        <Link href={href} className="hm-ahenk-section-more" style={{ color }}>
          Tümü →
        </Link>
      ) : null}
    </div>
  );
}

function AhenkStoryThumb({
  n,
  large,
  badge,
  badgeColor,
}: {
  n: any;
  large?: boolean;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <div className={`hm-ahenk-story-thumb ${large ? "hm-ahenk-story-thumb--large" : ""}`.trim()}>
      <HmNewsImage src={resolveNewsItemImageUrl(n)} alt={newsTitle(n.title)} loading={large ? "eager" : "lazy"} />
      {badge ? (
        <span className="hm-ahenk-story-badge" style={{ background: badgeColor ?? "#cc0000" }}>
          {badge}
        </span>
      ) : null}
    </div>
  );
}

function blockCategoryColor(
  slug: string,
  accent: string,
  hmCategoryColors?: Record<string, string> | null,
): string {
  return resolveHmCategoryColor(slug, hmCategoryColors, accent);
}

function AhenkEmpty({
  title,
  moduleId,
  accent,
  categorySlug,
  hmCategoryColors,
}: {
  title: string;
  moduleId: HmNewsHomeModuleId;
  accent: string;
  categorySlug?: string;
  hmCategoryColors?: Record<string, string> | null;
}) {
  const color = categorySlug ? blockCategoryColor(categorySlug, accent, hmCategoryColors) : accent;
  return (
    <AhenkBlockShell moduleId={moduleId} categorySlug={categorySlug} accent={accent} hmCategoryColors={hmCategoryColors}>
      <AhenkSectionHead title={title} color={color} />
      <div className="hm-ahenk-empty">Bu modül için henüz haber yok.</div>
    </AhenkBlockShell>
  );
}

function AhenkBlockShell({
  moduleId,
  categorySlug,
  accent,
  hmCategoryColors,
  className,
  children,
}: {
  moduleId: HmNewsHomeModuleId;
  categorySlug?: string;
  accent: string;
  hmCategoryColors?: Record<string, string> | null;
  className?: string;
  children: ReactNode;
}) {
  const slug = categorySlug?.trim().toLowerCase() || undefined;
  const boxColor = slug ? blockCategoryColor(slug, accent, hmCategoryColors) : accent;
  return (
    <section
      className={`hm-ahenk-block mb-6 ${className ?? ""}`.trim()}
      data-hm-home-module={moduleId}
      data-hm-cat-slug={slug}
      style={{ ["--hm-cat-box-accent" as string]: boxColor }}
    >
      {children}
    </section>
  );
}

export function HmAhenkIconCategoryRow({ kategoriHref }: Pick<AhenkHaberBlockContext, "kategoriHref">) {
  return (
    <section className="hm-ahenk-block hm-ahenk-icon-row mb-6" data-hm-home-module="ahenkIconCategoryRow">
      <div className="hm-ahenk-icon-grid">
        {AHENK_ICON_ROWS.map((row) => {
          const Icon = row.icon;
          return (
            <Link key={row.slug} href={kategoriHref(row.slug)} className="hm-ahenk-icon-item">
              <span className="hm-ahenk-icon-circle">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="hm-ahenk-icon-label">
                <strong>{row.label}</strong>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function HmAhenkGununSesiAuthors(ctx: AhenkHaberBlockContext) {
  const lead = ctx.items[0];
  if (!lead) {
    return (
      <AhenkEmpty
        title="GÜNÜN SESİ"
        moduleId="ahenkGununSesiAuthors"
        accent={ctx.accent}
        categorySlug="gundem"
        hmCategoryColors={ctx.hmCategoryColors}
      />
    );
  }
  const boxColor = blockCategoryColor("gundem", ctx.accent, ctx.hmCategoryColors);
  const authorColor = blockCategoryColor("dunya", ctx.accent, ctx.hmCategoryColors);
  return (
    <AhenkBlockShell
      moduleId="ahenkGununSesiAuthors"
      categorySlug="gundem"
      accent={ctx.accent}
      hmCategoryColors={ctx.hmCategoryColors}
      className="hm-ahenk-gunun-sesi"
    >
      <div className="hm-ahenk-gunun-sesi-grid">
        <article className="hm-ahenk-gunun-sesi-main">
          <AhenkSectionHead title="GÜNÜN SESİ" color={boxColor} href={ctx.newsHref(lead)} />
          <Link href={ctx.newsHref(lead)} className="hm-ahenk-gunun-sesi-hero group">
            <AhenkStoryThumb n={lead} large badge={lead.categoryName} badgeColor={catColor(lead, ctx.accent, ctx.hmCategoryColors)} />
            <div className="hm-ahenk-gunun-sesi-body">
              <h3>{newsTitle(lead.title)}</h3>
              {lead.summary || lead.excerpt ? (
                <p>{decodeHtmlEntities(String(lead.summary ?? lead.excerpt ?? "").slice(0, 180))}</p>
              ) : null}
              <span className="hm-ahenk-meta">
                <Clock className="h-3 w-3" aria-hidden />
                {fmtDateShort(lead.createdAt)}
              </span>
            </div>
          </Link>
        </article>
        <aside className="hm-ahenk-gunun-sesi-authors">
          <AhenkSectionHead title="Köşe Yazarları" color={authorColor} href={ctx.yazarlarHref} />
          <div className="hm-ahenk-authors-list">
            {ctx.authors.slice(0, 6).map((a) => (
              <Link key={a.id ?? a.slug ?? a.name} href={ctx.yazarlarHref} className="hm-ahenk-author-row">
                {a.avatarUrl ? (
                  <img src={vitrinImgSrc(a.avatarUrl)} alt={String(a.name ?? "")} loading="lazy" />
                ) : (
                  <span className="hm-ahenk-author-fallback">{String(a.name ?? "?").slice(0, 1)}</span>
                )}
                <span>
                  <strong>{String(a.name ?? "Yazar")}</strong>
                  {a.latestTitle ? <small>{decodeHtmlEntities(String(a.latestTitle))}</small> : null}
                </span>
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </AhenkBlockShell>
  );
}

export function HmAhenkAnkaraGrid(ctx: AhenkHaberBlockContext) {
  const items = ctx.items.slice(0, 4);
  if (items.length === 0) {
    return (
      <AhenkEmpty
        title={ctx.categoryTitle || "ANKARA"}
        moduleId="ahenkAnkaraGrid"
        accent={ctx.accent}
        categorySlug={ctx.categorySlug}
        hmCategoryColors={ctx.hmCategoryColors}
      />
    );
  }
  const boxColor = blockCategoryColor(ctx.categorySlug, ctx.accent, ctx.hmCategoryColors);
  return (
    <AhenkBlockShell
      moduleId="ahenkAnkaraGrid"
      categorySlug={ctx.categorySlug}
      accent={ctx.accent}
      hmCategoryColors={ctx.hmCategoryColors}
      className="hm-ahenk-ankara-grid"
    >
      <AhenkSectionHead title={ctx.categoryTitle || "ANKARA"} color={boxColor} href={ctx.kategoriHref(ctx.categorySlug)} />
      <div className="hm-ahenk-quad-grid">
        {items.map((n) => (
          <Link key={n.id ?? n.slug} href={ctx.newsHref(n)} className="hm-ahenk-quad-card group">
            <AhenkStoryThumb n={n} badge={n.categoryName} badgeColor={catColor(n, ctx.accent, ctx.hmCategoryColors)} />
            <h3>{newsTitle(n.title)}</h3>
            <span className="hm-ahenk-meta">
              <Clock className="h-3 w-3" aria-hidden />
              {fmtDateShort(n.createdAt)}
            </span>
          </Link>
        ))}
      </div>
    </AhenkBlockShell>
  );
}

export function HmAhenkGundemLeadSide(ctx: AhenkHaberBlockContext) {
  const quadItems = ctx.items.slice(0, 4);
  const lead = ctx.items[0];
  const side = ctx.items.slice(1, 4);
  if (!lead) {
    return (
      <AhenkEmpty
        title={ctx.categoryTitle || "GÜNDEM"}
        moduleId="ahenkGundemLeadSide"
        accent={ctx.accent}
        categorySlug={ctx.categorySlug || "gundem"}
        hmCategoryColors={ctx.hmCategoryColors}
      />
    );
  }
  const boxColor = blockCategoryColor(ctx.categorySlug || "gundem", ctx.accent, ctx.hmCategoryColors);
  return (
    <AhenkBlockShell
      moduleId="ahenkGundemLeadSide"
      categorySlug={ctx.categorySlug || "gundem"}
      accent={ctx.accent}
      hmCategoryColors={ctx.hmCategoryColors}
      className="hm-ahenk-gundem-lead"
    >
      <AhenkSectionHead title={ctx.categoryTitle || "GÜNDEM"} color={boxColor} href={ctx.kategoriHref(ctx.categorySlug)} />
      <div className="hm-ahenk-gundem-quad grid grid-cols-2 gap-0 sm:hidden">
        {quadItems.map((n) => (
          <Link key={`m-${n.id ?? n.slug}`} href={ctx.newsHref(n)} className="hm-ahenk-quad-card group border-b border-r border-[#f0f0f0] p-2">
            <AhenkStoryThumb n={n} badge={n.categoryName} badgeColor={catColor(n, ctx.accent, ctx.hmCategoryColors)} />
            <h3 className="mt-1 line-clamp-2 text-[11px] font-bold leading-snug">{newsTitle(n.title)}</h3>
          </Link>
        ))}
      </div>
      <div className="hm-ahenk-gundem-grid hidden sm:grid">
        <Link href={ctx.newsHref(lead)} className="hm-ahenk-gundem-main group">
          <AhenkStoryThumb n={lead} large badge={lead.categoryName} badgeColor={catColor(lead, ctx.accent, ctx.hmCategoryColors)} />
          <div className="hm-ahenk-gundem-main-body">
            <h3>{newsTitle(lead.title)}</h3>
            {lead.summary || lead.excerpt ? (
              <p>{decodeHtmlEntities(String(lead.summary ?? lead.excerpt ?? "").slice(0, 140))}</p>
            ) : null}
            <span className="hm-ahenk-meta">
              <Clock className="h-3 w-3" aria-hidden />
              {fmtDateShort(lead.createdAt)}
            </span>
          </div>
        </Link>
        <div className="hm-ahenk-gundem-side">
          {side.map((n) => (
            <Link key={n.id ?? n.slug} href={ctx.newsHref(n)} className="hm-ahenk-gundem-side-row group">
              <AhenkStoryThumb n={n} />
              <div>
                <h4>{newsTitle(n.title)}</h4>
                <span className="hm-ahenk-meta">
                  <Clock className="h-3 w-3" aria-hidden />
                  {fmtDateShort(n.createdAt)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AhenkBlockShell>
  );
}

export function HmAhenkSporGrid(ctx: AhenkHaberBlockContext) {
  const items = ctx.items.slice(0, 6);
  if (items.length === 0) {
    return (
      <AhenkEmpty
        title={ctx.categoryTitle || "SPOR"}
        moduleId="ahenkSporGrid"
        accent={ctx.accent}
        categorySlug={ctx.categorySlug || "spor"}
        hmCategoryColors={ctx.hmCategoryColors}
      />
    );
  }
  const boxColor = blockCategoryColor(ctx.categorySlug || "spor", ctx.accent, ctx.hmCategoryColors);
  return (
    <AhenkBlockShell
      moduleId="ahenkSporGrid"
      categorySlug={ctx.categorySlug || "spor"}
      accent={ctx.accent}
      hmCategoryColors={ctx.hmCategoryColors}
      className="hm-ahenk-spor-grid"
    >
      <AhenkSectionHead title={ctx.categoryTitle || "SPOR"} color={boxColor} href={ctx.kategoriHref(ctx.categorySlug)} />
      <div className="hm-ahenk-spor-grid-inner">
        {items.map((n) => (
          <Link key={n.id ?? n.slug} href={ctx.newsHref(n)} className="hm-ahenk-spor-card group">
            <AhenkStoryThumb n={n} badge={n.categoryName} badgeColor={catColor(n, ctx.accent, ctx.hmCategoryColors)} />
            <h3>{newsTitle(n.title)}</h3>
          </Link>
        ))}
      </div>
    </AhenkBlockShell>
  );
}

export function HmAhenkDunyaBlock(ctx: AhenkHaberBlockContext) {
  const lead = ctx.items[0];
  const rest = ctx.items.slice(1, 5);
  if (!lead) {
    return (
      <AhenkEmpty
        title={ctx.categoryTitle || "DÜNYA"}
        moduleId="ahenkDunyaBlock"
        accent={ctx.accent}
        categorySlug={ctx.categorySlug || "dunya"}
        hmCategoryColors={ctx.hmCategoryColors}
      />
    );
  }
  const boxColor = blockCategoryColor(ctx.categorySlug || "dunya", ctx.accent, ctx.hmCategoryColors);
  return (
    <AhenkBlockShell
      moduleId="ahenkDunyaBlock"
      categorySlug={ctx.categorySlug || "dunya"}
      accent={ctx.accent}
      hmCategoryColors={ctx.hmCategoryColors}
      className="hm-ahenk-dunya-block"
    >
      <AhenkSectionHead title={ctx.categoryTitle || "DÜNYA"} color={boxColor} href={ctx.kategoriHref(ctx.categorySlug)} />
      <div className="hm-ahenk-dunya-grid">
        <Link href={ctx.newsHref(lead)} className="hm-ahenk-dunya-main group">
          <AhenkStoryThumb n={lead} large badge={lead.categoryName} badgeColor={catColor(lead, ctx.accent, ctx.hmCategoryColors)} />
          <h3>{newsTitle(lead.title)}</h3>
        </Link>
        <div className="hm-ahenk-dunya-list">
          {rest.map((n) => (
            <Link key={n.id ?? n.slug} href={ctx.newsHref(n)} className="hm-ahenk-dunya-row group">
              <AhenkStoryThumb n={n} />
              <h4>{newsTitle(n.title)}</h4>
            </Link>
          ))}
        </div>
      </div>
    </AhenkBlockShell>
  );
}

export function HmAhenkEkonomiGrid(ctx: AhenkHaberBlockContext) {
  const items = ctx.items.slice(0, 8);
  if (items.length === 0) {
    return (
      <AhenkEmpty
        title={ctx.categoryTitle || "EKONOMİ"}
        moduleId="ahenkEkonomiGrid"
        accent={ctx.accent}
        categorySlug={ctx.categorySlug || "ekonomi"}
        hmCategoryColors={ctx.hmCategoryColors}
      />
    );
  }
  const boxColor = blockCategoryColor(ctx.categorySlug || "ekonomi", ctx.accent, ctx.hmCategoryColors);
  return (
    <AhenkBlockShell
      moduleId="ahenkEkonomiGrid"
      categorySlug={ctx.categorySlug || "ekonomi"}
      accent={ctx.accent}
      hmCategoryColors={ctx.hmCategoryColors}
      className="hm-ahenk-ekonomi-grid"
    >
      <AhenkSectionHead title={ctx.categoryTitle || "EKONOMİ"} color={boxColor} href={ctx.kategoriHref(ctx.categorySlug)} />
      <div className="hm-ahenk-ekonomi-grid-inner">
        {items.map((n) => (
          <Link key={n.id ?? n.slug} href={ctx.newsHref(n)} className="hm-ahenk-ekonomi-card group">
            <AhenkStoryThumb n={n} />
            <h3>{newsTitle(n.title)}</h3>
            <span className="hm-ahenk-meta">
              <Briefcase className="h-3 w-3" aria-hidden />
              {fmtDateShort(n.createdAt)}
            </span>
          </Link>
        ))}
      </div>
    </AhenkBlockShell>
  );
}

export function HmAhenkSonEklenenler({
  items,
  newsHref,
  accent = "#1a4a8a",
  hmCategoryColors,
}: Pick<AhenkHaberBlockContext, "items" | "newsHref" | "accent" | "hmCategoryColors">) {
  const list = items.slice(0, 10);
  const boxColor = blockCategoryColor("teknoloji", accent, hmCategoryColors);
  if (list.length === 0) {
    return (
      <AhenkEmpty
        title="Son Eklenenler"
        moduleId="ahenkSonEklenenler"
        accent={accent}
        categorySlug="teknoloji"
        hmCategoryColors={hmCategoryColors}
      />
    );
  }
  return (
    <AhenkBlockShell
      moduleId="ahenkSonEklenenler"
      categorySlug="teknoloji"
      accent={accent}
      hmCategoryColors={hmCategoryColors}
      className="hm-ahenk-latest-list"
    >
      <AhenkSectionHead title="Son Eklenenler" color={boxColor} />
      <ul className="hm-ahenk-list-panel">
        {list.map((n) => (
          <li key={n.id ?? n.slug}>
            <Link href={newsHref(n)} className="hm-ahenk-list-row group">
              <AhenkStoryThumb n={n} />
              <div>
                <h3>{newsTitle(n.title)}</h3>
                <span className="hm-ahenk-meta">
                  <Newspaper className="h-3 w-3" aria-hidden />
                  {fmtDateShort(n.createdAt)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </AhenkBlockShell>
  );
}

export function HmAhenkPopulerHaberler({
  items,
  newsHref,
  accent = "#cc0000",
  hmCategoryColors,
}: Pick<AhenkHaberBlockContext, "items" | "newsHref" | "accent" | "hmCategoryColors">) {
  const list = items.slice(0, 8);
  const boxColor = blockCategoryColor("gundem", accent, hmCategoryColors);
  if (list.length === 0) {
    return (
      <AhenkEmpty
        title="Popüler Haberler"
        moduleId="ahenkPopulerHaberler"
        accent={accent}
        categorySlug="gundem"
        hmCategoryColors={hmCategoryColors}
      />
    );
  }
  return (
    <AhenkBlockShell
      moduleId="ahenkPopulerHaberler"
      categorySlug="gundem"
      accent={accent}
      hmCategoryColors={hmCategoryColors}
      className="hm-ahenk-popular-list"
    >
      <AhenkSectionHead title="Popüler Haberler" color={boxColor} />
      <ol className="hm-ahenk-popular-panel">
        {list.map((n, index) => (
          <li key={n.id ?? n.slug}>
            <span className="hm-ahenk-popular-rank">{index + 1}</span>
            <Link href={newsHref(n)} className="hm-ahenk-popular-row group">
              <div>
                <h3>{newsTitle(n.title)}</h3>
                <span className="hm-ahenk-meta">
                  <Flame className="h-3 w-3" aria-hidden />
                  {fmtDateShort(n.createdAt)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </AhenkBlockShell>
  );
}

export function resolveAhenkCategorySlug(
  moduleId: HmNewsHomeModuleId,
  manualSlug: string,
  defaults: Partial<Record<HmNewsHomeModuleId, string>>,
): string {
  if (moduleId === "sporModule") return "spor";
  if (manualSlug) return manualSlug;
  return defaults[moduleId] ?? "";
}

export function filterNewsByAhenkSlug(items: readonly any[], slug: string): any[] {
  if (!slug) return [...items];
  return items.filter((item) => newsItemMatchesCategorySlug(item, slug));
}

export function titleForAhenkSlug(slug: string, fallback: string): string {
  if (!slug) return fallback;
  return humanizeNewsCategorySlug(slug).toLocaleUpperCase("tr-TR");
}
