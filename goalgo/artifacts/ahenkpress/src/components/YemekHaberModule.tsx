import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronRight, Clock, MapPin, PlayCircle, Star } from "lucide-react";
import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import { apiRequest } from "@/lib/queryClient";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { mapPublicHybridNewsLinkFields } from "@/lib/hybridNewsHref";
import { ItemCardVertical, SectionHeading, type RailItem } from "@/pages/public/SiparisModulVitrin";
import { HmNewsImage } from "@/components/HmNewsImage";

const GREEN = "#039D55";
const GREEN_DEEP = "#027A42";

type VendorRow = {
  id: number;
  name: string;
  slug: string;
  imageUrl?: string | null;
  coverUrl?: string | null;
  city?: string | null;
  district?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  deliveryTime?: number | null;
  deliveryFee?: number | null;
  featured?: boolean | null;
  storefrontHref?: string | null;
};

type SubcategoryRow = { id: number; name: string; slug: string; icon?: string | null };
type ModuleRailItem = RailItem;

type RecipeNewsItem = {
  id: number | string;
  title: string;
  slug?: string | null;
  spot?: string | null;
  imageUrl?: string | null;
  foodRecipeCategorySlug?: string | null;
  href?: string | null;
};

type RecipeVideoItem = {
  id: number | string;
  title: string;
  slug?: string | null;
  thumbnailUrl?: string | null;
  youtubeVideoId?: string | null;
};

export type YemekHaberModuleProps = {
  siteId?: number | null;
  accent?: string;
  className?: string;
};

function vendorHref(v: VendorRow): string {
  return v.storefrontHref || `/siparis/satici/${v.slug}`;
}

function VendorCard({ vendor }: { vendor: VendorRow }) {
  const href = vendorHref(vendor);
  const logo = resolveClientMediaSrc(vendor.imageUrl || vendor.coverUrl || "");
  const card = (
    <div className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
        {vendor.coverUrl || vendor.imageUrl ? (
          <img
            src={resolveClientMediaSrc(vendor.coverUrl || vendor.imageUrl || "")}
            alt={vendor.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-4xl" style={{ background: "#E4FFF3" }}>
            🍽️
          </div>
        )}
        {vendor.featured ? (
          <span className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: GREEN }}>
            Öne Çıkan
          </span>
        ) : null}
        {logo ? (
          <span className="absolute bottom-2 left-2 grid h-10 w-10 place-items-center overflow-hidden rounded-full border-2 border-white bg-white shadow">
            <img src={logo} alt="" className="h-full w-full object-cover" />
          </span>
        ) : null}
      </div>
      <div className="p-3">
        <h3 className="line-clamp-1 text-sm font-bold text-gray-900">{vendor.name}</h3>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500">
          <MapPin className="h-3 w-3 shrink-0" />
          {[vendor.district, vendor.city].filter(Boolean).join(", ") || "Türkiye"}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-600">
          <span className="flex items-center gap-0.5 font-semibold text-amber-500">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {(vendor.rating ?? 0).toFixed(1)}
          </span>
          <span className="flex items-center gap-0.5">
            <Clock className="h-3 w-3" /> {vendor.deliveryTime ?? 30} dk
          </span>
        </div>
      </div>
    </div>
  );
  return /^https?:\/\//i.test(href) ? (
    <a href={href} className="block">
      {card}
    </a>
  ) : (
    <Link href={href}>{card}</Link>
  );
}

function mapDbNews(row: Record<string, unknown>, h: (path: string) => string): RecipeNewsItem {
  const { id, slug, href } = mapPublicHybridNewsLinkFields(row);
  return {
    id,
    slug,
    title: String(row.title ?? ""),
    spot: (row.spot as string | null) ?? null,
    imageUrl: (row.imageUrl as string | null) ?? null,
    foodRecipeCategorySlug: (row.foodRecipeCategorySlug as string | null) ?? null,
    href: href ? h(href) : slug ? h(`/haber/${slug}`) : null,
  };
}

export function YemekHaberModule({ siteId, accent = GREEN, className = "" }: YemekHaberModuleProps) {
  const h = useHmPublicHref();
  const siteQs = siteId != null ? `&siteId=${encodeURIComponent(String(siteId))}` : "";

  const { data: subcategories = [] } = useQuery<SubcategoryRow[]>({
    queryKey: ["/api/delivery/subcategories", "yemek-haber"],
    queryFn: async () => {
      const cats = (await apiRequest("/api/delivery/categories?module=food")) as Array<{ id: number; slug?: string }>;
      const yemek = cats.find((c) => String(c.slug ?? "").toLowerCase() === "yemek") ?? cats[0];
      if (!yemek?.id) return [];
      const rows = (await apiRequest(`/api/delivery/subcategories?categoryId=${encodeURIComponent(String(yemek.id))}`)) as SubcategoryRow[];
      return Array.isArray(rows) ? rows : [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: recommendedVendors = [] } = useQuery<VendorRow[]>({
    queryKey: ["/api/delivery/vendors", "yemek-haber-recommended"],
    queryFn: async () => {
      const rows = (await apiRequest("/api/delivery/vendors?module=food&type=delivery&featured=1&limit=12")) as VendorRow[];
      return Array.isArray(rows) ? rows : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: bestItems = [] } = useQuery<ModuleRailItem[]>({
    queryKey: ["/api/delivery/module-items", "yemek-haber-best"],
    queryFn: async () => {
      const rows = (await apiRequest("/api/delivery/module-items?module=food&limit=12")) as ModuleRailItem[];
      return Array.isArray(rows) ? rows : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: restaurantGrid = [] } = useQuery<VendorRow[]>({
    queryKey: ["/api/delivery/vendors", "yemek-haber-grid"],
    queryFn: async () => {
      const rows = (await apiRequest("/api/delivery/vendors?module=food&type=delivery&limit=8")) as VendorRow[];
      return Array.isArray(rows) ? rows : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: recipeNews = [] } = useQuery<RecipeNewsItem[]>({
    queryKey: ["/api/news", "yemek-recipes", siteId ?? "all"],
    queryFn: async () => {
      const raw = (await apiRequest(
        `/api/news?limit=12&offset=0&status=published&isFoodRecipe=true&includeHiddenCategories=1${siteQs}`,
      )) as { items?: unknown[] };
      const rows = raw?.items ?? [];
      return rows.map((n) => mapDbNews(n as Record<string, unknown>, h));
    },
    staleTime: 60 * 1000,
  });

  const { data: recipeVideos = [] } = useQuery<RecipeVideoItem[]>({
    queryKey: ["/api/video/videos", "yemek-tarifleri"],
    queryFn: async () => {
      const res = await fetch(`/api/video/videos?categorySlug=yemek-tarifleri&limit=8`);
      if (!res.ok) return [];
      const data = (await res.json()) as { items?: RecipeVideoItem[] } | RecipeVideoItem[];
      const rows = Array.isArray(data) ? data : (data.items ?? []);
      return rows;
    },
    staleTime: 5 * 60 * 1000,
  });

  const categoryChips = useMemo(() => subcategories.slice(0, 16), [subcategories]);

  return (
    <section className={`space-y-8 ${className}`.trim()} data-hm-home-module="yemekHaber">
      <div>
        <SectionHeading title="Yemek Kategorileri" />
        <div className="flex gap-3 overflow-x-auto pb-2">
          {categoryChips.map((cat) => (
            <Link
              key={cat.slug}
              href={`/yemek?subcategory=${encodeURIComponent(cat.slug)}`}
              className="flex w-24 shrink-0 flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white p-3 text-center shadow-sm transition hover:border-emerald-200 hover:shadow"
            >
              <span className="grid h-12 w-12 place-items-center rounded-full text-xl" style={{ background: "#E4FFF3" }}>
                {cat.icon || "🍽️"}
              </span>
              <span className="line-clamp-2 text-[11px] font-bold leading-tight text-gray-800">{cat.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {recommendedVendors.length > 0 ? (
        <div>
          <SectionHeading title="Önerilen Restoranlar" onSeeAll={() => window.location.assign("/yemek")} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recommendedVendors.slice(0, 4).map((v) => (
              <VendorCard key={v.id} vendor={v} />
            ))}
          </div>
        </div>
      ) : null}

      {bestItems.length > 0 ? (
        <div>
          <SectionHeading title="En Çok Beğenilen Lezzetler" onSeeAll={() => window.location.assign("/yemek")} />
          <div className="flex gap-3 overflow-x-auto pb-2">
            {bestItems.map((item) => (
              <ItemCardVertical key={item.id} item={item} />
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <SectionHeading title="Restoranlar" />
        {recipeNews.length > 0 ? (
          <div className="mb-6">
            <h3 className="mb-3 text-base font-black text-gray-900" style={{ color: accent }}>
              Yemek Tarifleri
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {recipeNews.map((item) => (
                <Link key={String(item.id)} href={item.href || "#"} className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md">
                  <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                    <HmNewsImage src={item.imageUrl} alt={item.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-sm font-bold text-gray-900 group-hover:underline">{item.title}</p>
                    {item.spot ? <p className="mt-1 line-clamp-2 text-xs text-gray-500">{item.spot}</p> : null}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
        {restaurantGrid.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {restaurantGrid.slice(0, 4).map((v) => (
              <VendorCard key={v.id} vendor={v} />
            ))}
          </div>
        ) : null}
      </div>

      {recipeVideos.length > 0 ? (
        <div>
          <SectionHeading title="Yeni Açılan Restoranlar" />
          <p className="-mt-2 mb-3 text-xs font-semibold text-gray-500">Yemek tarifi videoları — Yektube</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recipeVideos.map((video) => {
              const thumb = resolveClientMediaSrc(video.thumbnailUrl ?? "");
              const href = video.slug ? `/yektube/video/${video.slug}` : video.youtubeVideoId ? `/yektube/watch?v=${video.youtubeVideoId}` : "/yektube";
              return (
                <Link key={String(video.id)} href={href} className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                  <div className="relative aspect-video bg-gray-900">
                    {thumb ? <img src={thumb} alt={video.title} className="h-full w-full object-cover opacity-90" /> : null}
                    <span className="absolute inset-0 grid place-items-center text-white/90">
                      <PlayCircle className="h-10 w-10" />
                    </span>
                  </div>
                  <p className="line-clamp-2 p-3 text-sm font-bold text-gray-900">{video.title}</p>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Link href="/yemek" className="inline-flex items-center gap-1 text-sm font-bold" style={{ color: accent }}>
          Tüm yemek vitrini <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
