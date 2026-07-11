import { createContext, useContext, useMemo, useState } from "react";
import { SellzyFooter } from "./SellzyFooter";
import { SellzyHeader } from "./SellzyHeader";
import { useMarketplaceData } from "./useMarketplaceData";
import type { MarketplacePayload } from "./types";

type SellzyLayoutContext = {
  payload: MarketplacePayload;
  loading: boolean;
  query: string;
  setQuery: (v: string) => void;
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  submitSearch: (e: React.FormEvent) => void;
};

const Ctx = createContext<SellzyLayoutContext | null>(null);

export function useSellzyLayout() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSellzyLayout must be used within SellzyMarketplaceLayout");
  return ctx;
}

/** Sellzy-native chrome — `bodyOnly` skips Sellzy header/footer when Yekpare Sade chrome wraps the route */
export function SellzyMarketplaceLayout({
  children,
  bodyOnly = false,
}: {
  children: React.ReactNode;
  /** Yekpare SadePublicChrome dış kabuğu varken Sellzy üst/alt chrome gösterme */
  bodyOnly?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const { payload, loading } = useMarketplaceData({
    q: searchQuery,
    category: selectedCategory,
    lang: "tr",
    limit: 120,
  });

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(query.trim());
  };

  const value = useMemo(
    () => ({ payload, loading, query, setQuery, selectedCategory, setSelectedCategory, submitSearch }),
    [payload, loading, query, selectedCategory],
  );

  return (
    <div className="sellzy-theme min-h-screen w-full overflow-x-hidden bg-transparent text-foreground">
      <Ctx.Provider value={value}>
        {!bodyOnly ? (
          <SellzyHeader
            categories={payload.categories}
            query={query}
            onQueryChange={setQuery}
            onSearch={submitSearch}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        ) : null}
        <div className="w-full">{children}</div>
        {!bodyOnly ? <SellzyFooter categories={payload.categories} /> : null}
      </Ctx.Provider>
    </div>
  );
}
