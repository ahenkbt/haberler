import { type ReactNode } from "react";
import { Search, Sparkles, Star } from "lucide-react";
import { Link } from "wouter";
import {
  SearchLocationRightPanel,
  isCityLocationHeroQuery,
  type SearchLocationContext,
} from "@/components/search/SearchLocationRightPanel";

type RelatedSearch = { query: string; href: string };

export type CityQuickFacts = {
  population?: number | null;
  plateCode?: string | null;
  areaCode?: string | null;
  areaKm2?: number | null;
  founded?: string | null;
  region?: string | null;
};

export type PanelSearchItem = {
  id: string;
  name: string;
  href: string;
  description?: string | null;
  photoUrl?: string | null;
  coverPhotoUrl?: string | null;
  rating?: number | null;
};

type SearchResultsRightPanelProps = {
  context: SearchLocationContext;
  aiSummary: string | null;
  quickFacts: CityQuickFacts | null;
  newsItems: PanelSearchItem[];
  placesItems: PanelSearchItem[];
  relatedSearches?: RelatedSearch[];
  cityCount?: number;
};

function mapEmbedUrl(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.04}%2C${lat - 0.03}%2C${lng + 0.04}%2C${lat + 0.03}&layer=mapnik&marker=${lat}%2C${lng}`;
}

function Carousel({
  title,
  items,
  renderItem,
}: {
  title: string;
  items: PanelSearchItem[];
  renderItem: (item: PanelSearchItem) => ReactNode;
}) {
  if (!items.length) return null;
  return (
    <section className="usr-rpanel-block yekpare-home-glass" aria-label={title}>
      <div className="usr-rpanel-block-head">
        <h3>{title}</h3>
      </div>
      <div className="usr-rpanel-carousel">
        {items.map((item) => (
          <div key={item.id} className="usr-rpanel-carousel-item">
            {renderItem(item)}
          </div>
        ))}
      </div>
    </section>
  );
}

function QuickFactsTable({ facts }: { facts: CityQuickFacts }) {
  const rows: Array<{ label: string; value: string }> = [];
  if (facts.founded) rows.push({ label: "Kuruluş", value: facts.founded });
  if (facts.population) rows.push({ label: "Nüfus", value: facts.population.toLocaleString("tr-TR") });
  if (facts.areaCode) rows.push({ label: "Alan kodu", value: facts.areaCode });
  if (facts.areaKm2) rows.push({ label: "Yüzölçümü", value: `${facts.areaKm2.toLocaleString("tr-TR")} km²` });
  if (facts.plateCode) rows.push({ label: "Plaka", value: facts.plateCode });
  if (facts.region) rows.push({ label: "Bölge", value: facts.region });
  if (!rows.length) return null;

  return (
    <section className="usr-rpanel-block yekpare-home-glass" aria-label="Kısa bilgiler">
      <div className="usr-rpanel-block-head">
        <h3>Kısa bilgiler</h3>
      </div>
      <dl className="usr-rpanel-facts">
        {rows.map((row) => (
          <div key={row.label} className="usr-rpanel-fact-row">
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function AiSummaryBlock({ summary }: { summary: string }) {
  return (
    <section
      id="yekpare-ai-summary"
      className="usr-rpanel-block usr-rpanel-ai yekpare-home-glass"
      aria-label="Yekpare AI özeti"
    >
      <div className="usr-rpanel-block-head">
        <Sparkles className="h-4 w-4" style={{ color: "var(--usr-accent)" }} aria-hidden />
        <h3>Yekpare AI</h3>
        <span className="usr-ai-model-badge">Yerli model</span>
      </div>
      <p className="usr-rpanel-ai-text">{summary}</p>
    </section>
  );
}

function PlaceCard({ item }: { item: PanelSearchItem }) {
  const img = item.coverPhotoUrl ?? item.photoUrl;
  return (
    <Link href={item.href} className="usr-rpanel-place-card">
      <div className="usr-rpanel-place-media">
        {img ? <img src={img} alt="" loading="lazy" /> : <span className="usr-rpanel-place-fallback">📍</span>}
        {item.rating ? (
          <span className="usr-rpanel-place-rating">
            <Star className="h-3 w-3 fill-current" />
            {Number(item.rating).toFixed(1)}
          </span>
        ) : null}
      </div>
      <span className="usr-rpanel-place-name">{item.name}</span>
    </Link>
  );
}

function NewsCard({ item }: { item: PanelSearchItem }) {
  const img = item.coverPhotoUrl ?? item.photoUrl;
  return (
    <Link href={item.href} className="usr-rpanel-news-card">
      {img ? (
        <div className="usr-rpanel-news-thumb">
          <img src={img} alt="" loading="lazy" />
        </div>
      ) : null}
      <span className="usr-rpanel-news-title">{item.name}</span>
    </Link>
  );
}

function RelatedSearchesBlock({ items }: { items: RelatedSearch[] }) {
  if (!items.length) return null;
  return (
    <section className="usr-rpanel-block yekpare-home-glass" aria-label="İlgili aramalar">
      <div className="usr-rpanel-block-head">
        <Search className="h-4 w-4" style={{ color: "var(--usr-accent)" }} aria-hidden />
        <h3>İlgili aramalar</h3>
      </div>
      <div className="usr-rpanel-related">
        {items.slice(0, 6).map((item) => (
          <Link key={item.query} href={item.href} className="usr-rpanel-related-pill">
            {item.query}
          </Link>
        ))}
      </div>
    </section>
  );
}

export function SearchResultsRightPanel({
  context,
  aiSummary,
  quickFacts,
  newsItems,
  placesItems,
  relatedSearches = [],
  cityCount = 0,
}: SearchResultsRightPanelProps) {
  const isCityQuery = isCityLocationHeroQuery({
    locationContext: context,
    cityCount,
    cityQuickFacts: quickFacts,
  });

  const showLocationCards = Boolean(
    context.city ||
      (isCityQuery && (context.wiki || context.mapPreview)) ||
      (!isCityQuery && context.businesses.length > 0) ||
      context.wiki,
  );

  const panelContext: SearchLocationContext = isCityQuery
    ? { ...context, businesses: [] }
    : {
        ...context,
        mapPreview: null,
        city: null,
        district: null,
      };

  const locationPanel = showLocationCards ? (
    <SearchLocationRightPanel context={panelContext} cityQuery={isCityQuery} />
  ) : null;

  return (
    <aside className="usr-rpanel" aria-label="Bilgi paneli">
      {isCityQuery ? locationPanel : null}
      {aiSummary ? <AiSummaryBlock summary={aiSummary} /> : null}
      {isCityQuery && quickFacts ? <QuickFactsTable facts={quickFacts} /> : null}
      {!isCityQuery ? locationPanel : null}

      {newsItems.length > 0 ? (
        <Carousel title="İlgili gündem" items={newsItems.slice(0, 4)} renderItem={(item) => <NewsCard item={item} />} />
      ) : null}

      {isCityQuery && placesItems.length > 0 ? (
        <Carousel
          title="Gezilecek yerler"
          items={placesItems.slice(0, 6)}
          renderItem={(item) => <PlaceCard item={item} />}
        />
      ) : null}

      <RelatedSearchesBlock items={relatedSearches} />
    </aside>
  );
}
