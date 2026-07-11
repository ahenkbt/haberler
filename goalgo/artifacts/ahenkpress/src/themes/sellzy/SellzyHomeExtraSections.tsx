/**
 * Ported from Sellzy apps/web home-1 section stack:
 * BestSellingProductsClient, TopSellingProductsClient, HotDealsWeekClient,
 * BottomPromoBanners, NewlyLaunchedProductsClient, BeautyProductsClient
 */
import { Link } from "wouter";
import { ArrowUpRight, ChevronLeft, ChevronRight, MoveUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { SellzyContainer } from "./SellzyContainer";
import { SellzyProductCard } from "./SellzyHomeSections";
import type { SellzyProduct, SellzyPromoBanner } from "./types";

const NOTCH_SVG_PATH =
  "M1728 782C1728 808.51 1706.51 830 1680 830H48C21.4904 830 0 808.51 0 782V48C0 21.4904 21.4903 0 48 0H464.229C490.65 0 511.137 22.4607 523.036 46.0506C540.075 79.8315 575.081 120 615.5 120H1112.5C1152.92 120 1187.92 79.8315 1204.96 46.0506C1216.86 22.4607 1237.35 0 1263.77 0H1680C1706.51 0 1728 21.4903 1728 48V782Z";

function currency(value: number): string {
  return value.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 });
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
  return chunks;
}

function useCarouselNav(api: CarouselApi | undefined) {
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  useEffect(() => {
    if (!api) return;
    const update = () => {
      setCanPrev(api.canScrollPrev());
      setCanNext(api.canScrollNext());
    };
    update();
    api.on("select", update);
    api.on("reInit", update);
  }, [api]);
  return { canPrev, canNext };
}

/** Sellzy BestSellingProductsClient — carousel on green notch background */
export function SellzyBestSelling({
  products,
  title = "Çok satan ürünler",
  description = "En çok tercih edilen ürünler ve popüler kategoriler",
  bgColor = "#A7E973",
  loading,
}: {
  products: SellzyProduct[];
  title?: string;
  description?: string;
  bgColor?: string;
  loading?: boolean;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const { canPrev, canNext } = useCarouselNav(api);
  if (loading) return <SellzyCarouselSkeleton bgColor={bgColor} />;
  if (!products.length) return null;

  return (
    <section className="py-10 md:py-14 lg:py-[70px] w-full">
      <SellzyContainer>
        <div className="relative pt-0 pb-12 overflow-hidden min-h-[500px] rounded-[24px]">
          <div className="absolute inset-0 z-0 pointer-events-none">
            <svg viewBox="0 0 1728 830" fill="none" className="w-full h-full" preserveAspectRatio="xMidYMin slice">
              <path d={NOTCH_SVG_PATH} fill={bgColor} />
            </svg>
          </div>
          <div className="flex justify-center mb-10 relative z-10">
            <div className="relative px-6 sm:px-20 pt-4 pb-16 text-center flex flex-col gap-1 items-center">
              <h4 className="text-2xl md:text-3xl lg:text-[40px] font-bold leading-tight lg:leading-[48px] text-light-primary-text">{title}</h4>
              {description ? <p className="text-gray-600 text-xs sm:text-[14px] max-w-[280px] sm:max-w-none mx-auto">{description}</p> : null}
            </div>
          </div>
          <div className="px-4 sm:px-6 lg:px-10 relative z-10 w-full">
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              <Carousel setApi={setApi} opts={{ align: "start" }} className="w-full">
                <CarouselContent className="-ml-4 sm:-ml-5">
                  {products.map((product) => (
                    <CarouselItem key={product.id} className="pl-4 sm:pl-5 basis-full sm:basis-1/2 lg:basis-1/4 xl:basis-1/6">
                      <SellzyProductCard product={product} />
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </motion.div>
          </div>
          <div className="flex justify-center gap-4 mt-8 md:mt-10 relative z-10">
            <button type="button" onClick={() => api?.scrollPrev()} disabled={!canPrev} className={`size-11 rounded-full flex items-center justify-center shadow-lg ${canPrev ? "bg-primary text-white" : "bg-white/60 text-primary/50 cursor-not-allowed"}`}>
              <ChevronLeft className="size-6" />
            </button>
            <button type="button" onClick={() => api?.scrollNext()} disabled={!canNext} className={`size-11 rounded-full flex items-center justify-center shadow-lg ${canNext ? "bg-white text-primary" : "bg-white/60 text-primary/50 cursor-not-allowed"}`}>
              <ChevronRight className="size-6" />
            </button>
          </div>
        </div>
      </SellzyContainer>
    </section>
  );
}

function SellzyFeaturedProductCard({ product }: { product: SellzyProduct }) {
  const img = resolveClientMediaSrc(product.imageUrl);
  const price = product.salePrice ?? product.price;
  return (
    <div className="bg-white flex flex-col items-center justify-between overflow-hidden p-6 relative rounded-4xl w-full h-full border border-gray-100 group shadow-sm hover:shadow-md transition-shadow">
      <div className="relative w-full rounded-3xl overflow-hidden flex items-center justify-center p-6 flex-1 min-h-[250px]">
        <Link href={product.href} className="w-full h-full relative block">
          {img ? <img src={img} alt={product.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700" /> : null}
        </Link>
      </div>
      <div className="flex flex-col gap-4 items-center w-full mt-8 shrink-0">
        <Link href={product.href} className="px-10 line-clamp-1 font-semibold text-2xl hover:text-primary">{product.name}</Link>
        <p className="leading-6 font-light px-5 text-base text-center line-clamp-2 text-light-secondary-text">
          {product.categoryName ? `${product.categoryName} — tek yerden keşfet.` : "Yekpare pazaryerinde keşfet."}
        </p>
        <Link href={product.href} className="bg-primary hover:bg-primary/90 flex gap-1.5 items-center pl-6 pr-2.5 py-2 mt-2 rounded-full shadow-sm text-white font-semibold text-base">
          Ürünü incele
          <span className="bg-white rounded-full size-8 flex items-center justify-center">
            <ArrowUpRight className="size-4 text-primary" />
          </span>
        </Link>
        <p className="text-lg font-bold text-primary">{currency(price)}</p>
      </div>
    </div>
  );
}

function SellzyHorizontalProductCard({ product }: { product: SellzyProduct }) {
  const img = resolveClientMediaSrc(product.imageUrl);
  const price = product.salePrice ?? product.price;
  const hasDiscount = product.salePrice != null && product.salePrice < product.price;
  return (
    <div className="bg-white flex flex-row gap-4 h-40 items-start overflow-hidden p-4 relative rounded-2xl w-full group border border-transparent hover:border-gray-100 hover:shadow-sm transition-all">
      <Link href={product.href} className="relative rounded-2xl shrink-0 size-32 flex items-center justify-center overflow-hidden bg-[#FAFAFB]">
        {img ? <img src={img} alt={product.name} className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform" /> : null}
      </Link>
      <div className="flex flex-1 flex-col gap-2 justify-center min-w-0 py-1">
        <Link href={product.href} className="font-semibold line-clamp-2 text-light-primary-text text-[15px] hover:text-primary">{product.name}</Link>
        <div className="flex gap-2 items-center mt-auto">
          <span className="font-bold text-primary">{currency(price)}</span>
          {hasDiscount ? <span className="text-sm text-muted-foreground line-through">{currency(product.price)}</span> : null}
        </div>
      </div>
    </div>
  );
}

/** Sellzy TopSellingProductsClient — featured + Top Rate + Top Items columns */
export function SellzyTopSelling({ products, title = "En çok satanlar", description = "Sınırlı süre için %69'a varan indirimler", bgColor = "#FDE047", loading }: { products: SellzyProduct[]; title?: string; description?: string; bgColor?: string; loading?: boolean }) {
  const [api1, setApi1] = useState<CarouselApi>();
  const [api2, setApi2] = useState<CarouselApi>();
  const nav1 = useCarouselNav(api1);
  const nav2 = useCarouselNav(api2);

  const topRatedChunks = useMemo(() => {
    const sorted = [...products].sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price));
    return chunkArray(sorted, 3);
  }, [products]);
  const topItemsChunks = useMemo(() => {
    const sorted = [...products].sort((a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price));
    return chunkArray(sorted, 3);
  }, [products]);

  if (loading) return <SellzyCarouselSkeleton bgColor={bgColor} tall />;
  if (!products.length) return null;

  return (
    <section className="py-10 md:py-14 lg:py-[70px] w-full">
      <SellzyContainer>
        <div className="relative px-0 pt-10 md:pt-0 pb-12 overflow-hidden min-h-[500px] rounded-[24px]" style={{ backgroundColor: bgColor }}>
          <div className="absolute top-0 left-0 right-0 z-0 pointer-events-none hidden md:flex justify-center w-full">
            <svg viewBox="464 0 800 120" fill="none" className="w-[800px] max-w-full" preserveAspectRatio="xMidYTop meet">
              <path d="M464.229 0 C490.65 0 511.137 22.4607 523.036 46.0506 C540.075 79.8315 575.081 120 615.5 120 H1112.5 C1152.92 120 1187.92 79.8315 1204.96 46.0506 C1216.86 22.4607 1237.35 0 1263.77 0 Z" fill="#FFFFFF" />
            </svg>
          </div>
          <div className="flex justify-center mb-6 md:mb-10 relative z-10 w-full">
            <div className="px-6 sm:px-20 text-center">
              <h3 className="font-bold text-light-primary-text text-[32px] leading-[48px]">{title}</h3>
              {description ? <p className="text-light-secondary-text text-base mt-1">{description}</p> : null}
            </div>
          </div>
          <div className="px-4 sm:px-6 lg:px-10 relative z-10 w-full py-10">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:gap-8 w-full items-stretch">
              <div className="h-full w-full">
                <SellzyFeaturedProductCard product={products[0]} />
              </div>
              <div className="w-full flex flex-col h-full overflow-hidden">
                <div className="flex justify-between items-center mb-6 border-b border-border pb-5">
                  <h4 className="font-bold text-light-primary-text text-[24px]">En yüksek puan</h4>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => api1?.scrollPrev()} disabled={!nav1.canPrev} className="size-8 rounded-full border flex items-center justify-center bg-white disabled:opacity-40"><ChevronLeft className="size-4" /></button>
                    <button type="button" onClick={() => api1?.scrollNext()} disabled={!nav1.canNext} className="size-8 rounded-full border flex items-center justify-center bg-white disabled:opacity-40"><ChevronRight className="size-4" /></button>
                  </div>
                </div>
                <Carousel setApi={setApi1} opts={{ align: "start" }} className="w-full grow">
                  <CarouselContent className="-ml-4 h-full">
                    {topRatedChunks.map((chunk, index) => (
                      <CarouselItem key={`tr-${index}`} className="pl-4 basis-full">
                        <div className="flex flex-col gap-4">
                          {chunk.map((p) => <SellzyHorizontalProductCard key={p.id} product={p} />)}
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              </div>
              <div className="w-full flex flex-col h-full overflow-hidden">
                <div className="flex justify-between items-center mb-6 border-b border-border pb-5">
                  <h4 className="font-bold text-light-primary-text text-[24px]">Öne çıkanlar</h4>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => api2?.scrollPrev()} disabled={!nav2.canPrev} className="size-8 rounded-full border flex items-center justify-center bg-white disabled:opacity-40"><ChevronLeft className="size-4" /></button>
                    <button type="button" onClick={() => api2?.scrollNext()} disabled={!nav2.canNext} className="size-8 rounded-full border flex items-center justify-center bg-white disabled:opacity-40"><ChevronRight className="size-4" /></button>
                  </div>
                </div>
                <Carousel setApi={setApi2} opts={{ align: "start" }} className="w-full grow">
                  <CarouselContent className="-ml-4 h-full">
                    {topItemsChunks.map((chunk, index) => (
                      <CarouselItem key={`ti-${index}`} className="pl-4 basis-full">
                        <div className="flex flex-col gap-4">
                          {chunk.map((p) => <SellzyHorizontalProductCard key={p.id} product={p} />)}
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              </div>
            </div>
          </div>
        </div>
      </SellzyContainer>
    </section>
  );
}

function CountdownTimer() {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  useEffect(() => {
    setMounted(true);
    const target = new Date();
    target.setDate(target.getDate() + 3);
    const interval = setInterval(() => {
      const distance = target.getTime() - Date.now();
      if (distance < 0) return clearInterval(interval);
      setTimeLeft({
        days: Math.floor(distance / 86400000),
        hours: Math.floor((distance % 86400000) / 3600000),
        mins: Math.floor((distance % 3600000) / 60000),
        secs: Math.floor((distance % 60000) / 1000),
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  const Box = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center justify-center bg-white rounded-lg px-4 py-3 w-[70px] sm:w-[90px] shadow-md shrink-0 text-center">
      <span className="text-lg sm:text-xl font-bold text-error">{mounted ? value.toString().padStart(2, "0") : "00"}</span>
      <span className="text-sm text-light-secondary-text">{label}</span>
    </div>
  );
  return (
    <div className="flex gap-2 sm:gap-3 items-center w-full overflow-x-auto pb-4 sm:pb-0">
      <Box value={timeLeft.days} label="Gün" />
      <Box value={timeLeft.hours} label="Saat" />
      <Box value={timeLeft.mins} label="Dk" />
      <Box value={timeLeft.secs} label="Sn" />
    </div>
  );
}

/** Sellzy HotDealsWeekClient */
export function SellzyHotDealsWeek({ products, loading }: { products: SellzyProduct[]; loading?: boolean }) {
  const [api, setApi] = useState<CarouselApi>();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  useEffect(() => {
    if (!api) return;
    const onScroll = () => setScrollProgress(Math.max(0, Math.min(1, api.scrollProgress())));
    setScrollSnaps(api.scrollSnapList());
    onScroll();
    api.on("scroll", onScroll);
    api.on("reInit", () => { setScrollSnaps(api.scrollSnapList()); onScroll(); });
    return () => { api.off("scroll", onScroll); };
  }, [api]);

  if (loading) return <section className="py-14"><SellzyContainer><div className="h-64 bg-gray-100 animate-pulse rounded-3xl" /></SellzyContainer></section>;
  if (!products.length) return null;

  return (
    <section className="py-10 md:py-14 lg:py-[70px] w-full">
      <SellzyContainer>
        <div className="flex flex-col lg:flex-row w-full gap-10 xl:gap-14 rounded-[24px] pt-8 lg:pt-0 pb-10">
          <div className="w-full lg:w-[35%] xl:w-[380px] shrink-0 flex flex-col lg:pt-4">
            <h4 className="text-xl font-bold text-primary mb-2">Sınırlı süre fırsatı</h4>
            <h3 className="text-[32px] md:text-[40px] lg:text-[48px] font-bold text-light-primary-text mb-4 leading-tight">Haftanın sıcak fırsatları</h3>
            <p className="text-base text-light-primary-text mb-8">Haftalık indirimler geri döndü. Günlük ihtiyaç ve bakım ürünlerinde kaçırılmayacak fiyatlar.</p>
            <div className="mb-10 w-full"><CountdownTimer /></div>
            <Link href="/magaza/kampanyalar" className="inline-flex gap-1.5 items-center bg-primary text-white font-semibold py-2 px-3 h-12 rounded-full hover:bg-primary/90 w-max pr-2">
              <span className="pl-3">Tüm fırsatlar</span>
              <span className="bg-white rounded-full size-8 flex items-center justify-center"><ArrowUpRight className="size-5 text-primary" /></span>
            </Link>
          </div>
          <div className="flex-1 min-w-0 w-full">
            <Carousel setApi={setApi} opts={{ align: "start", dragFree: true }} className="w-full">
              <CarouselContent className="-ml-4 sm:-ml-6">
                {products.map((product) => (
                  <CarouselItem key={product.id} className="pl-4 sm:pl-6 basis-[85%] sm:basis-1/2 md:basis-[45%] xl:basis-1/4">
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <SellzyProductCard product={product} />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
            <div className="mt-8 h-1.5 w-full bg-light-divider rounded-full overflow-hidden relative">
              <div
                className="absolute inset-y-0 left-0 bg-primary rounded-full transition-transform duration-150"
                style={{
                  width: `${scrollSnaps.length > 0 ? 100 / scrollSnaps.length : 100}%`,
                  transform: `translate3d(${scrollProgress * (scrollSnaps.length > 1 ? (scrollSnaps.length - 1) * 100 : 0)}%, 0, 0)`,
                }}
              />
            </div>
          </div>
        </div>
      </SellzyContainer>
    </section>
  );
}

/** Sellzy BottomPromoBanners */
export function SellzyBottomPromoBanners({ banners }: { banners: SellzyPromoBanner[] }) {
  if (!banners.length) return null;
  return (
    <section className="py-10 md:py-14 lg:py-[70px] w-full">
      <SellzyContainer>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {banners.map((banner) => (
            <div key={banner.id} style={{ backgroundColor: banner.bgColor || "#f3f4f6" }} className="flex flex-col justify-start md:px-8 md:py-12 px-6 py-8 rounded-[24px] relative overflow-hidden min-h-[340px] group">
              <div className="relative z-20 flex flex-col items-start gap-4 max-w-[60%]">
                {banner.name ? <p className="font-semibold text-light-primary-text text-base">{banner.name}</p> : null}
                <h3 className="font-bold text-light-primary-text text-[28px] md:text-[32px] max-w-[345px]">{banner.title}</h3>
                {(banner.description || banner.subtitle) ? <p className="font-semibold text-light-primary-text text-base">{banner.description || banner.subtitle}</p> : null}
                <Link href={banner.buttonHref || banner.href} className="bg-primary hover:bg-primary/90 inline-flex items-center gap-1.5 px-3 py-2 rounded-full mt-2 text-white font-semibold">
                  <span className="pl-3">{banner.buttonTitle || "Keşfet"}</span>
                  <span className="bg-white rounded-full size-8 flex items-center justify-center"><ArrowUpRight className="size-4 text-black" /></span>
                </Link>
              </div>
              {banner.imageUrl ? (
                <div className="absolute top-1/2 -translate-y-1/2 right-4 w-[240px] md:w-[320px] z-10 group-hover:scale-105 transition-transform">
                  <img src={resolveClientMediaSrc(banner.imageUrl)} alt="" className="object-contain w-full" />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </SellzyContainer>
    </section>
  );
}

/** Shared carousel section (NewlyLaunched / Beauty) */
export function SellzyNotchedProductCarousel({
  products,
  title,
  description,
  bgColor,
  href = "/magaza/urunler",
  loading,
}: {
  products: SellzyProduct[];
  title: string;
  description?: string;
  bgColor: string;
  href?: string;
  loading?: boolean;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const { canPrev, canNext } = useCarouselNav(api);
  if (loading) return <SellzyCarouselSkeleton bgColor={bgColor} />;
  if (!products.length) return null;

  return (
    <section className="py-10 md:py-14 lg:py-[70px] w-full">
      <SellzyContainer>
        <div className="relative pb-12 overflow-hidden min-h-[500px] rounded-[24px]">
          <div className="absolute inset-0 z-0 pointer-events-none">
            <svg viewBox="0 0 1728 830" fill="none" className="w-full h-full" preserveAspectRatio="xMidYMin slice">
              <path d={NOTCH_SVG_PATH} fill={bgColor} />
            </svg>
          </div>
          <div className="flex justify-between items-end mb-10 px-6 sm:px-10 pt-8 relative z-10">
            <div>
              <h4 className="text-2xl md:text-[40px] font-bold text-light-primary-text leading-tight">{title}</h4>
              {description ? <p className="text-gray-600 text-sm mt-1">{description}</p> : null}
            </div>
            <Link href={href} className="hidden md:inline-flex items-center gap-2 bg-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-sm hover:shadow-md">
              Tümünü gör <MoveUpRight className="size-4" />
            </Link>
          </div>
          <div className="px-4 sm:px-6 lg:px-10 relative z-10">
            <Carousel setApi={setApi} opts={{ align: "start" }} className="w-full">
              <CarouselContent className="-ml-4">
                {products.map((p) => (
                  <CarouselItem key={p.id} className="pl-4 basis-full sm:basis-1/2 lg:basis-1/4 xl:basis-1/5">
                    <SellzyProductCard product={p} />
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
          <div className="flex justify-center gap-4 mt-8 relative z-10">
            <button type="button" onClick={() => api?.scrollPrev()} disabled={!canPrev} className="size-11 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-40"><ChevronLeft /></button>
            <button type="button" onClick={() => api?.scrollNext()} disabled={!canNext} className="size-11 rounded-full bg-white text-primary flex items-center justify-center disabled:opacity-40"><ChevronRight /></button>
          </div>
        </div>
      </SellzyContainer>
    </section>
  );
}

function SellzyCarouselSkeleton({ bgColor, tall }: { bgColor: string; tall?: boolean }) {
  return (
    <section className="py-10 md:py-14 w-full">
      <SellzyContainer>
        <div className={`rounded-[24px] animate-pulse ${tall ? "h-[520px]" : "h-[480px]"}`} style={{ backgroundColor: bgColor, opacity: 0.35 }} />
      </SellzyContainer>
    </section>
  );
}
