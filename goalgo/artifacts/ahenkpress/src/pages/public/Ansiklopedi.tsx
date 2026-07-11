import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ChevronRight, Search } from "lucide-react";
import { BilgiAgaciCategoryPills } from "@/components/BilgiAgaciCategoryPills";
import { BilgiAgaciShell } from "@/components/BilgiAgaciShell";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { BILGI_AGACI_DISPLAY_NAME } from "@/lib/bilgiAgaciBrand";
import { useAnsiklopediBasePath } from "@/lib/ansiklopediPaths";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { wikiTitleToUrlSlug } from "@/lib/wikiArticleSlug";
import {
  applySocialShareMeta,
  applyCollectionPageStructuredData,
  resetSeoToSiteDefaults,
  seoPlainSnippet,
} from "@/lib/pageSeo";
import { fetchPublicJson } from "@/lib/fetchPublicJson";
import {
  DEFAULT_FEATURED,
  normalizeFeaturedGrid,
  topicWikiTitle,
  type FeaturedTopic,
} from "@/lib/wikiFeaturedTopics";
import {
  KNOWLEDGE_CATEGORIES,
  knowledgeCategoryHref,
  knowledgeTopicLabel,
  knowledgeTopicWikiTitle,
  type KnowledgeCategory,
} from "@/lib/bilgiAgaciCategories";

const API = "/api";

interface SearchResult { title: string; snippet: string; pageid: number; }

export type WikiEncyclopediaUi = {
  heroTitle: string;
  heroSubtitle: string;
  heroGradientFrom: string;
  heroGradientTo: string;
  heroTextColor: string;
  mainHeading: string;
  mainSubheading: string;
  searchPlaceholder: string;
  searchButtonLabel: string;
  topicsSectionLabel: string;
  footerNote: string;
  wikiLang: "tr" | "en";
  wikiSearchLimit: number;
  pathSlugHint: string;
};

const FALLBACK_UI: WikiEncyclopediaUi = {
  heroTitle: BILGI_AGACI_DISPLAY_NAME,
  heroSubtitle: "",
  heroGradientFrom: "#039D55",
  heroGradientTo: "#028347",
  heroTextColor: "#ffffff",
  mainHeading: "İstediğiniz konuyu arayın",
  mainSubheading: "Şehirler, tarih, kültür, bilim ve gündem dahil konu sınırı olmadan arama yapın",
  searchPlaceholder: "Araştırmak istediğiniz konuyu yazın...",
  searchButtonLabel: "Ara",
  topicsSectionLabel: "Önerilen konular",
  footerNote: "",
  wikiLang: "tr",
  wikiSearchLimit: 20,
  pathSlugHint: "bilgiagaci",
};

function topicHref(base: string, t: FeaturedTopic): string {
  return `${base}/${wikiTitleToUrlSlug(topicWikiTitle(t))}`;
}

function categoryHref(base: string, category: KnowledgeCategory): string {
  return knowledgeCategoryHref(base, category);
}

function KnowledgeCategoryCard({
  base,
  category,
  featured = false,
}: {
  base: string;
  category: KnowledgeCategory;
  featured?: boolean;
}) {
  return (
    <Link
      href={categoryHref(base, category)}
      className={`bilgi-agaci-cat-card group ${featured ? "bilgi-agaci-cat-card--featured" : ""}`}
    >
      <div className="bilgi-agaci-cat-card__frame">
        <img src={category.image} alt="" loading="lazy" />
        <span className="bilgi-agaci-cat-card__quick" aria-hidden>
          <ChevronRight className="h-5 w-5" />
        </span>
        <div className="bilgi-agaci-cat-card__name">{category.title}</div>
      </div>
      <div className="bilgi-agaci-cat-card__footer">
        <div className="flex items-start gap-3">
          <span className="bilgi-agaci-cat-card__icon" aria-hidden>{category.icon}</span>
          <div className="min-w-0">
            <span className="bilgi-agaci-cat-card__badge">Bilgi rotası</span>
            <p>{category.desc}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {category.examples.map((example) => (
            <span
              key={knowledgeTopicWikiTitle(example)}
              className="rounded-full border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600"
            >
              {knowledgeTopicLabel(example)}
            </span>
          ))}
        </div>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-black" style={{ color: category.accent }}>
          Rotayı keşfet <ChevronRight className="h-4 w-4" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

export default function Ansiklopedi() {
  const [, navigate] = useLocation();
  const ansiklopediBase = useAnsiklopediBasePath();
  const hmEmbedded = useHmPublicLinkContextOptional() != null;
  const [ui, setUi] = useState<WikiEncyclopediaUi>(FALLBACK_UI);
  const [query, setQuery] = useState(() => {
    try { return new URLSearchParams(window.location.search).get("q") || ""; } catch { return ""; }
  });
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [featured, setFeatured] = useState<FeaturedTopic[]>(DEFAULT_FEATURED);

  useEffect(() => {
    void fetchPublicJson<{ success?: boolean; data?: Partial<WikiEncyclopediaUi> }>(`${API}/wiki/encyclopedia-ui`)
      .then(({ data: d }) => {
        if (d?.success && d.data && typeof d.data === "object") {
          setUi({ ...FALLBACK_UI, ...d.data });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q && q.trim()) {
      setQuery(q);
      navigate(`${ansiklopediBase}/${wikiTitleToUrlSlug(q.trim())}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ansiklopediBase]);

  useEffect(() => {
    void fetchPublicJson<{ success?: boolean; data?: FeaturedTopic[] }>(`${API}/wiki/featured`)
      .then(({ data: d }) => {
        if (d?.success && Array.isArray(d.data)) {
          setFeatured(normalizeFeaturedGrid(d.data));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const title = `${ui.heroTitle || BILGI_AGACI_DISPLAY_NAME} — Yekpare`;
    const desc = seoPlainSnippet(ui.mainSubheading, 220);
    applySocialShareMeta({
      title,
      descriptionPrimary: desc,
      canonicalPath: ansiklopediBase,
    });
    applyCollectionPageStructuredData({
      name: ui.heroTitle || BILGI_AGACI_DISPLAY_NAME,
      description: ui.mainSubheading.trim(),
      canonicalPath: ansiklopediBase,
      items: featured.map((t) => ({
        name: t.title,
        path: topicHref(ansiklopediBase, t),
        description: t.desc,
      })),
    });
    return () => resetSeoToSiteDefaults();
  }, [ui, featured, ansiklopediBase]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      const lim = Math.min(20, Math.max(1, ui.wikiSearchLimit || 10));
      const lang = ui.wikiLang === "en" ? "en" : "tr";
      fetch(`${API}/wiki/search?q=${encodeURIComponent(query)}&limit=${lim}&lang=${lang}`)
        .then(r => r.json())
        .then(d => { if (d.success) setResults(d.data); })
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(t);
  }, [query, ui.wikiSearchLimit, ui.wikiLang]);

  async function openTopic(rawQuery: string) {
    const term = rawQuery.trim();
    if (!term) return;
    const lang = ui.wikiLang === "en" ? "en" : "tr";
    try {
      const r = await fetch(
        `${API}/wiki/resolve-title?q=${encodeURIComponent(term)}&lang=${lang}`,
      );
      const d = await r.json();
      const title = d?.success && d?.data?.title ? String(d.data.title) : term;
      navigate(`${ansiklopediBase}/${wikiTitleToUrlSlug(title)}`);
    } catch {
      navigate(`${ansiklopediBase}/${wikiTitleToUrlSlug(term)}`);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    void openTopic(query);
  }

  const displayHeroTitle = ui.heroTitle?.trim() || BILGI_AGACI_DISPLAY_NAME;
  const heroSubtitle = ui.heroSubtitle?.trim();
  const categoryCount = KNOWLEDGE_CATEGORIES.length;

  return (
    <BilgiAgaciShell>
      <main className={`ansiklopedi-home pb-10${hmEmbedded ? " ansiklopedi-home--hm" : ""}`}>
        {!hmEmbedded ? (
          <>
            <section className="bilgi-agaci-hero">
              <div className="bilgi-agaci-hero__body">
                <span className="bilgi-agaci-hero__kicker">Keşfet</span>
                <h1 className="bilgi-agaci-hero__title">{displayHeroTitle}</h1>
                <p className="bilgi-agaci-hero__sub">
                  {heroSubtitle || "Bilimden tarihe, coğrafyadan teknolojiye uzanan görsel ve akıcı bilgi deneyimi."}
                </p>
                <BilgiAgaciCategoryPills />
              </div>
            </section>

            <div className="bilgi-agaci-search-dock">
              <div className="bilgi-agaci-search-card">
                <form onSubmit={handleSearch} className="relative">
                  <div className="bilgi-agaci-search-grid">
                    <label className="bilgi-agaci-search-input">
                      <Search className="h-5 w-5 shrink-0 text-[#039D55]" aria-hidden />
                      <input
                        placeholder={ui.searchPlaceholder}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        autoFocus
                      />
                      {searching && (
                        <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                      )}
                    </label>
                    <button type="submit" className="bilgi-agaci-search-btn">
                      <Search className="h-4 w-4 opacity-90" aria-hidden />
                      {ui.searchButtonLabel}
                    </button>
                  </div>

                  {results.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-3 overflow-hidden rounded-2xl border border-emerald-100 bg-white text-left shadow-2xl">
                      {results.map((r, idx) => (
                        <Link
                          key={`${r.pageid || 0}-${r.title}-${idx}`}
                          href={`${ansiklopediBase}/${wikiTitleToUrlSlug(r.title)}`}
                          className="flex items-start gap-3 border-b border-slate-50 px-4 py-3 transition last:border-0 hover:bg-emerald-50/50"
                          onClick={() => { setQuery(""); setResults([]); }}
                        >
                          <span className="mt-0.5 shrink-0 text-emerald-600">📖</span>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{r.title}</p>
                            <p className="line-clamp-1 text-xs text-slate-400" dangerouslySetInnerHTML={{ __html: sanitizeHtml(r.snippet + "...") }} />
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </form>
              </div>
            </div>
          </>
        ) : null}

        <section id="kategoriler" className={`bilgi-agaci-section${hmEmbedded ? "" : " bilgi-agaci-section-after-search"}`}>
          <div className="bilgi-agaci-section-head">
            <p className="eyebrow">Konu kategorileri</p>
            <h2>
              Bilgiyi {categoryCount} ana rotada keşfet
            </h2>
            <p>
              Her rota; hızlı başlıklar, görsel yüzey ve net keşif çağrılarıyla öne çıkar.
            </p>
          </div>
          <div className="bilgi-agaci-cat-grid">
            {KNOWLEDGE_CATEGORIES.map((category, index) => (
              <KnowledgeCategoryCard
                key={category.slug}
                base={ansiklopediBase}
                category={category}
                featured={index === 0 || index === 1}
              />
            ))}
          </div>
        </section>

        {ui.footerNote?.trim() ? (
          <p className="text-center text-xs text-slate-400 leading-relaxed max-w-2xl mx-auto">
            {ui.footerNote}
          </p>
        ) : null}
      </main>
    </BilgiAgaciShell>
  );
}
