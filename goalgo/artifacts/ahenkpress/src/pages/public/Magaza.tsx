import { Link } from "wouter";
import { SellzyHero } from "@/themes/sellzy/SellzyHero";
import {
  SellzyLatestBlogs,
  SellzyProductTabs,
  SellzyPromoBanners,
  SellzyShopByCategory,
  SellzySupportInfo,
} from "@/themes/sellzy/SellzyHomeSections";
import {
  SellzyBestSelling,
  SellzyBottomPromoBanners,
  SellzyHotDealsWeek,
  SellzyNotchedProductCarousel,
  SellzyTopSelling,
} from "@/themes/sellzy/SellzyHomeExtraSections";
import { useSellzyLayout } from "@/themes/sellzy/SellzyMarketplaceLayout";

/**
 * Marketplace home — section order matches Sellzy apps/web page.tsx (home-1):
 * Hero → SupportInfo → BestSelling → ShopByCategory → TopSelling → OurProducts tabs
 * → HomePromoBanners → NewlyLaunched → HotDealsWeek → Beauty → LatestBlogs
 * (BottomPromoBanners after HomePromo when API provides split)
 */
export default function Magaza() {
  const { payload, loading } = useSellzyLayout();

  const bestSelling = payload.bestSelling.length ? payload.bestSelling : payload.products.slice(0, 10);
  const topSelling = payload.topSelling?.length ? payload.topSelling : bestSelling.slice(0, 25);
  const newest = payload.newest.length ? payload.newest : payload.products.slice(0, 10);
  const dailyDeals = payload.dailyDeals?.length
    ? payload.dailyDeals
    : payload.products.filter((p) => (p.discountPercent ?? 0) > 0).slice(0, 12);
  const beauty = payload.highDiscountProducts?.length
    ? payload.highDiscountProducts
    : payload.products.filter((p) => /kozmetik|bakım|güzellik/i.test(`${p.categoryName ?? ""} ${p.name}`)).slice(0, 8);
  const fresh = payload.featuredProducts.length
    ? payload.featuredProducts
    : payload.products.filter((p) => /market|gıda|organik/i.test(`${p.categoryName ?? ""} ${p.name}`)).slice(0, 10);

  const hasListedProducts =
    payload.products.length > 0
    || bestSelling.length > 0
    || topSelling.length > 0
    || newest.length > 0
    || dailyDeals.length > 0;

  const homePromos = (payload.promoBanners ?? []).slice(0, 2);
  const bottomPromos = payload.bottomPromoBanners?.length
    ? payload.bottomPromoBanners
    : (payload.promoBanners ?? []).slice(2, 4);

  return (
    <main className="w-full">
      <SellzyHero
        banners={payload.heroBanners ?? []}
        hideModuleHeroSearch
      />
      <SellzySupportInfo />

      <SellzyBestSelling
        products={bestSelling}
        loading={loading}
        title="Çok satan ürünler"
        description="En çok tercih edilen ürünler ve popüler kategoriler"
        bgColor="#A7E973"
      />

      <SellzyShopByCategory categories={payload.categories} loading={loading} />

      <SellzyTopSelling
        products={topSelling}
        loading={loading}
        title="En çok satanlar"
        description="Sınırlı süre için özel indirimler"
        bgColor="#FDE047"
      />

      <SellzyProductTabs
        products={payload.products}
        bestSelling={bestSelling}
        newest={newest}
        deals={dailyDeals}
        loading={loading}
      />

      <SellzyPromoBanners banners={homePromos} />

      <SellzyNotchedProductCarousel
        products={fresh.length ? fresh : newest}
        title="Yeni çıkan ürünler"
        description="Pazaryerine yeni eklenen seçkiler"
        bgColor="#A0E2E0"
        href="/magaza/urunler"
        loading={loading}
      />

      <SellzyHotDealsWeek products={dailyDeals} loading={loading} />

      <SellzyNotchedProductCarousel
        products={beauty.length ? beauty : newest.slice(0, 8)}
        title="Moda & aksesuar"
        description="Giyim, ayakkabı ve aksesuar kategorilerinde indirimler"
        bgColor="#FFD6EF"
        href="/magaza/urunler"
        loading={loading}
      />

      <SellzyLatestBlogs posts={payload.blogPosts ?? []} />

      <SellzyBottomPromoBanners banners={bottomPromos} />

      {!loading && !hasListedProducts && Number(payload.stats?.productCount ?? 0) === 0 ? (
        <section className="w-full py-10">
          <div className="max-w-screen-2xl mx-auto px-4 text-center">
            <p className="rounded-3xl border border-dashed border-border bg-white p-10 text-sm font-semibold text-muted-foreground">
              Henüz listelenecek ürün bulunamadı.{" "}
              <Link href="/magaza/satici-ol" className="text-primary underline">Satıcı olarak katılın</Link>
            </p>
          </div>
        </section>
      ) : null}
    </main>
  );
}
