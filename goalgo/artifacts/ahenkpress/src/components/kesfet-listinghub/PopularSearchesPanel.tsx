import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import {
  KESFET_DISCOVER_GROUPS,
  type KesfetDiscoverGroup,
} from "@/lib/kesfetDiscoverCategories";
import { fetchPublicJson } from "@/lib/fetchPublicJson";
import type { InsaatfirmalarimCatalogCategory } from "@/lib/sariSayfalarUtils";
import "@/styles/sariSayfalar.css";

const API = "/api";

export type PopularSearchSelection = {
  label: string;
  /** Sarı Sayfalar `?category=` — insaatfirmalarim alt kategorileri */
  category?: string;
  /** Anahtar kelime araması — Keşfet dizin alt kategorileri */
  keyword?: string;
};

type Props = {
  onSelect?: (selection: PopularSearchSelection) => void;
  /** `ss` → Sarı Sayfalar yeşil chip/tabs; `kesfet` → Keşfet glass panel */
  variant?: "kesfet" | "ss";
  /** Sarı Sayfalar landing içinde: başlık kutusu olmadan yalnız tabs + chips */
  embedded?: boolean;
  /** insaatfirmalarim.com 29 alt kategori — İnşaat sekmesi */
  insaatCatalog?: InsaatfirmalarimCatalogCategory[];
  className?: string;
};

function buildInsaatDiscoverGroup(catalog: InsaatfirmalarimCatalogCategory[]): KesfetDiscoverGroup {
  return {
    id: "insaat",
    key: "insaat",
    label: "İnşaat",
    icon: "🏗️",
    subcategories: catalog.map((cat) => ({
      id: `insaat:${cat.slug}`,
      name: cat.label,
      slug: cat.slug,
      googleKeyword: cat.slug,
    })),
  };
}

export function PopularSearchesPanel({
  onSelect,
  variant = "kesfet",
  embedded = false,
  insaatCatalog = [],
  className = "",
}: Props) {
  const [groups, setGroups] = useState<KesfetDiscoverGroup[]>(KESFET_DISCOVER_GROUPS);
  const [activeKey, setActiveKey] = useState(KESFET_DISCOVER_GROUPS[0]?.key ?? "saglik");
  const isSs = variant === "ss";

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { ok, data } = await fetchPublicJson<{ success?: boolean; data?: KesfetDiscoverGroup[] }>(
        `${API}/map/discover-categories`,
      );
      if (cancelled || !ok || !data?.success || !Array.isArray(data.data) || !data.data.length) return;
      setGroups(data.data);
      setActiveKey(data.data[0]?.key ?? "saglik");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayGroups = useMemo(() => {
    if (!insaatCatalog.length) return groups;
    const insaatGroup = buildInsaatDiscoverGroup(insaatCatalog);
    const next = [...groups];
    const idx = next.findIndex((g) => g.key === "insaat");
    if (idx >= 0) {
      next[idx] = { ...next[idx], subcategories: insaatGroup.subcategories };
      return next;
    }
    return [...next, insaatGroup];
  }, [groups, insaatCatalog]);

  const active = displayGroups.find((g) => g.key === activeKey) ?? displayGroups[0];
  const rootClass = isSs
    ? `ss-popular-inline${embedded ? " embedded" : ""}`
    : "lh-popular-searches";

  const handleSubSelect = (sub: KesfetDiscoverGroup["subcategories"][number]) => {
    if (active?.key === "insaat") {
      onSelect?.({ label: sub.name, category: sub.slug });
      return;
    }
    if (active?.key === "otomotiv") {
      onSelect?.({ label: sub.name, category: "otomotiv", keyword: sub.googleKeyword || sub.name });
      return;
    }
    const siparisCategoryMap: Record<string, string> = {
      Yemek: "restoranlar",
      Market: "marketler",
      Kafe: "kafeler",
    };
    if (active?.key === "siparis" && siparisCategoryMap[sub.name]) {
      onSelect?.({ label: sub.name, category: siparisCategoryMap[sub.name] });
      return;
    }
    if (active?.key === "seyahat" && (sub.name === "Otel" || sub.name === "Villa")) {
      onSelect?.({ label: sub.name, category: "oteller", keyword: sub.googleKeyword || sub.name });
      return;
    }
    if (active?.key === "ulasim") {
      onSelect?.({ label: sub.name, keyword: sub.googleKeyword || sub.name, category: "hizmetler" });
      return;
    }
    onSelect?.({ label: sub.name, keyword: sub.googleKeyword || sub.name });
  };

  return (
    <div className={`${rootClass}${className ? ` ${className}` : ""}`}>
      {!embedded ? (
        <div className={isSs ? "ss-panel-card-head" : "lh-popular-searches-head"}>
          <div className={isSs ? "ss-panel-card-head-icon" : "lh-popular-searches-head-icon"} aria-hidden>
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className={isSs ? "ss-panel-card-title" : "lh-popular-searches-title"}>Popüler Aramalar</h3>
            <p className={isSs ? "ss-panel-card-sub" : "lh-popular-searches-sub"}>
              Kategori seçin, alt aramalardan birini tıklayın
            </p>
          </div>
        </div>
      ) : null}

      <div
        className={
          isSs
            ? "ss-hscroll-row ss-popular-inline-tabs"
            : "lh-popular-searches-tabs"
        }
        role="tablist"
        aria-label="Popüler arama kategorileri"
      >
        {displayGroups.map((g) => (
          <button
            key={g.key}
            type="button"
            role="tab"
            aria-selected={activeKey === g.key}
            className={
              isSs
                ? `ss-popular-inline-tab${activeKey === g.key ? " active" : ""}`
                : `lh-popular-searches-tab${activeKey === g.key ? " active" : ""}`
            }
            onClick={() => setActiveKey(g.key)}
          >
            <span className={isSs ? "ss-popular-inline-tab-icon" : "lh-popular-searches-tab-icon"} aria-hidden>
              {g.icon}
            </span>
            <span>{g.label}</span>
          </button>
        ))}
      </div>

      <div className={isSs ? "ss-popular-inline-body" : "lh-popular-searches-body"} role="tabpanel">
        {active?.subcategories?.length ? (
          <div
            className={
              isSs
                ? "ss-hscroll-row ss-popular-inline-chips"
                : "lh-popular-searches-pills"
            }
          >
            {active.subcategories.map((sub) => (
              <button
                key={sub.id}
                type="button"
                className={isSs ? "ss-landing-quick-chip" : "lh-popular-searches-pill"}
                onClick={() => handleSubSelect(sub)}
              >
                {sub.name}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Alt kategori bulunamadı.</p>
        )}
      </div>
    </div>
  );
}
