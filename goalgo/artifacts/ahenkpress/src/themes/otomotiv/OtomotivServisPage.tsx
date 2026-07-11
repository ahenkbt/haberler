import { useEffect, useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import { Search, Wrench } from "lucide-react";
import { OtomotivSubNavBar } from "./OtomotivSubNavBar";
import { CATEGORY_HERO, OTOMOTIV_DISCLAIMER } from "./otomotivHubConfig";
import { OTOMOTIV } from "./otomotivRoutes";
import {
  OTOMOTIV_SERVICE_GROUPS,
  OTOMOTIV_SERVICE_ALL_CATEGORIES,
  findOtomotivServiceCategory,
  searchOtomotivServiceCategoriesLocal,
} from "./otomotivServiceCategories";
import { YekpareFooterDisclaimer } from "@/components/YekpareFooterDisclaimer";
import "@/styles/bookingCoreTurizm.css";
import "@/styles/otomotivHub.css";

type ApiCategoryRow = {
  slug: string;
  name: string;
  group_slug: string;
  group_name: string;
  store_type: string;
  tags?: string[];
  icon?: string | null;
};

/** /otomotiv/servis — grup bazlı servis kategorileri, arama ve filtre */
export function OtomotivServisPage() {
  const [, params] = useRoute("/otomotiv/servis/:subSlug");
  const subSlug = params?.subSlug?.trim().toLowerCase() ?? "";
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [apiRows, setApiRows] = useState<ApiCategoryRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/otomotiv/servis/categories")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && Array.isArray(d?.categories)) setApiRows(d.categories as ApiCategoryRow[]);
      })
      .catch(() => {
        if (!cancelled) setApiRows(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!subSlug) return;
    const hit = findOtomotivServiceCategory(subSlug);
    if (hit) setActiveGroup(hit.group.slug);
  }, [subSlug]);

  const hero = CATEGORY_HERO.servis;

  const filteredCategories = useMemo(() => {
    const q = search.trim();
    if (apiRows && apiRows.length > 0) {
      let rows = apiRows;
      if (activeGroup) rows = rows.filter((r) => r.group_slug === activeGroup);
      if (subSlug) rows = rows.filter((r) => r.slug === subSlug);
      if (q) {
        const ql = q.toLocaleLowerCase("tr-TR");
        rows = rows.filter((r) => {
          const hay = [r.name, r.slug, r.group_name, ...(Array.isArray(r.tags) ? r.tags : [])]
            .join(" ")
            .toLocaleLowerCase("tr-TR");
          return hay.includes(ql);
        });
      }
      return rows;
    }
    let local = OTOMOTIV_SERVICE_ALL_CATEGORIES;
    if (activeGroup) local = local.filter((c) => c.groupSlug === activeGroup);
    if (subSlug) local = local.filter((c) => c.slug === subSlug);
    if (q) local = searchOtomotivServiceCategoriesLocal(q);
    return local.map((c) => ({
      slug: c.slug,
      name: c.name,
      group_slug: c.groupSlug,
      group_name: c.groupName,
      store_type: c.storeType,
      tags: c.tags,
      icon: c.icon ?? null,
    }));
  }, [apiRows, activeGroup, subSlug, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; icon: string; items: ApiCategoryRow[] }>();
    for (const row of filteredCategories) {
      const g = OTOMOTIV_SERVICE_GROUPS.find((x) => x.slug === row.group_slug);
      const bucket = map.get(row.group_slug) ?? {
        name: row.group_name,
        icon: g?.icon ?? "🔧",
        items: [],
      };
      bucket.items.push(row);
      map.set(row.group_slug, bucket);
    }
    return [...map.entries()].sort((a, b) => {
      const ga = OTOMOTIV_SERVICE_GROUPS.find((g) => g.slug === a[0])?.sortOrder ?? 99;
      const gb = OTOMOTIV_SERVICE_GROUPS.find((g) => g.slug === b[0])?.sortOrder ?? 99;
      return ga - gb;
    });
  }, [filteredCategories]);

  const selectedCategory = subSlug ? findOtomotivServiceCategory(subSlug) : undefined;

  return (
    <div className="oto-servis" data-page="otomotiv-servis">
      <OtomotivSubNavBar sticky />

      <section
        className="bc-hub-hero bc-hub-hero--bus bc-hub-hero--category oto-stub__hero"
        style={{ backgroundImage: `url(${hero.bg})` }}
      >
        <div className="bc-hub-hero__overlay bc-hub-hero__overlay--light" />
        <div className="bc-hub-hero__inner bc-hub-hero__inner--bus">
          <h1 className="bc-hub-hero__title bc-hub-hero__title--dark">{hero.title}</h1>
          <p className="bc-hub-hero__subtitle">{hero.subtitle}</p>
        </div>
      </section>

      <div className="oto-servis__toolbar">
        <form
          className="oto-servis__search"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <Search className="oto-servis__search-icon" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Örn: "gaz basma", "klima üflüyor", "egzoz"'
            aria-label="Servis kategorisi ara"
          />
        </form>
        <div className="oto-servis__group-filters" role="tablist" aria-label="Servis grupları">
          <button
            type="button"
            role="tab"
            aria-selected={!activeGroup}
            className={`oto-servis__group-pill${!activeGroup ? " oto-servis__group-pill--active" : ""}`}
            onClick={() => setActiveGroup(null)}
          >
            Tümü
          </button>
          {OTOMOTIV_SERVICE_GROUPS.map((g) => (
            <button
              key={g.slug}
              type="button"
              role="tab"
              aria-selected={activeGroup === g.slug}
              className={`oto-servis__group-pill${activeGroup === g.slug ? " oto-servis__group-pill--active" : ""}`}
              onClick={() => setActiveGroup(g.slug)}
            >
              <span aria-hidden>{g.icon}</span> {g.name}
            </button>
          ))}
        </div>
      </div>

      {selectedCategory ? (
        <div className="oto-servis__selected">
          <p>
            <strong>{selectedCategory.category.name}</strong> — {selectedCategory.group.name}
          </p>
          <Link href={OTOMOTIV.servis.home} className="oto-hub__cta oto-hub__cta--ghost">
            Tüm servis kategorileri
          </Link>
        </div>
      ) : null}

      <div className="oto-servis__body">
        {grouped.length === 0 ? (
          <p className="oto-servis__empty">Aramanızla eşleşen servis kategorisi bulunamadı.</p>
        ) : (
          grouped.map(([groupSlug, group]) => (
            <section key={groupSlug} className="oto-servis__group" id={`servis-grup-${groupSlug}`}>
              <h2 className="oto-servis__group-title">
                <span aria-hidden>{group.icon}</span> {group.name}
              </h2>
              <div className="oto-servis__grid">
                {group.items.map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`${OTOMOTIV.servis.home}/${cat.slug}`}
                    className={`oto-servis__card${subSlug === cat.slug ? " oto-servis__card--active" : ""}`}
                  >
                    <span className="oto-servis__card-icon" aria-hidden>
                      {cat.icon || <Wrench size={18} />}
                    </span>
                    <h3>{cat.name}</h3>
                    {Array.isArray(cat.tags) && cat.tags.length > 0 ? (
                      <p className="oto-servis__card-tags">{cat.tags.slice(0, 3).join(" · ")}</p>
                    ) : null}
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      <aside className="oto-hub__disclaimer-wrap">
        <YekpareFooterDisclaimer className="oto-hub__disclaimer" />
        <p className="oto-hub__disclaimer-extra">{OTOMOTIV_DISCLAIMER}</p>
      </aside>
    </div>
  );
}
