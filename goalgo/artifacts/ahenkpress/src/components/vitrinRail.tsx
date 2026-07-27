import { useRef } from "react";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { resolveClientMediaSrc } from "@/lib/apiBase";

const GREEN = "#039D55";
const GREEN_DEEP = "#026034";
const GREEN_LIGHT = "#EBFDF2";

export interface RailItem {
  id: number;
  name: string;
  description?: string | null;
  price: string;
  salePrice?: string | null;
  imageUrl?: string | null;
  isPopular?: boolean;
  vendorId: number;
  vendorName: string;
  vendorSlug: string;
  vendorRating: number;
  vendorReviewCount: number;
  vendorCity?: string | null;
  vendorDistrict?: string | null;
  vendorIsOpen?: boolean;
  vendorDeliveryTime?: number;
  vendorImageUrl?: string | null;
  href?: string | null;
}

function tl(value: string | number | null | undefined): string {
  const n = typeof value === "number" ? value : parseFloat(String(value ?? "0"));
  if (!Number.isFinite(n)) return "0₺";
  return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}₺`;
}

function discountPercent(price: string, salePrice?: string | null): number | null {
  const p = parseFloat(price);
  const s = parseFloat(String(salePrice ?? ""));
  if (!Number.isFinite(p) || !Number.isFinite(s) || s <= 0 || s >= p) return null;
  return Math.round(((p - s) / p) * 100);
}

export function SectionHeading({
  title,
  subtitle,
  onSeeAll,
}: {
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-gray-900 md:text-xl">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-gray-500 md:text-sm">{subtitle}</p> : null}
      </div>
      {onSeeAll ? (
        <button
          type="button"
          onClick={onSeeAll}
          className="flex shrink-0 items-center gap-1 text-sm font-semibold hover:underline"
          style={{ color: GREEN }}
        >
          Tümünü Gör <ChevronRight className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

export function Rail({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  return (
    <div className="group/rail relative">
      <button
        type="button"
        aria-label="Geri kaydır"
        onClick={() => scroll(-1)}
        className="absolute -left-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md transition hover:bg-gray-50 sm:flex"
      >
        <ChevronLeft className="h-4 w-4 text-gray-600" />
      </button>
      <div ref={ref} className="yekpare-scrollbar flex gap-3 overflow-x-auto scroll-smooth pb-2">
        {children}
      </div>
      <button
        type="button"
        aria-label="İleri kaydır"
        onClick={() => scroll(1)}
        className="absolute -right-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white shadow-md transition hover:bg-gray-50 sm:flex"
      >
        <ChevronRight className="h-4 w-4 text-gray-600" />
      </button>
    </div>
  );
}

export function ItemCardVertical({ item }: { item: RailItem }) {
  const img = resolveClientMediaSrc(item.imageUrl ?? "");
  const pct = discountPercent(item.price, item.salePrice);
  const href =
    item.href?.trim() ||
    (item.vendorSlug ? `/alisveris/magaza/${encodeURIComponent(item.vendorSlug)}` : "/magaza");
  return (
    <Link href={href}>
      <div className="group w-44 shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
        <div className="relative h-32 overflow-hidden bg-gray-50">
          {img ? (
            <img
              src={img}
              alt={item.name}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-3xl" style={{ background: GREEN_LIGHT }}>
              🛍️
            </div>
          )}
          {pct != null ? (
            <span
              className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
              style={{ background: GREEN }}
            >
              %{pct} indirim
            </span>
          ) : null}
        </div>
        <div className="p-3">
          <h3 className="line-clamp-1 text-sm font-bold text-gray-900">{item.name}</h3>
          <p className="mt-0.5 line-clamp-1 text-[11px] text-gray-400">{item.vendorName}</p>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-amber-500">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {Number(item.vendorRating ?? 0).toFixed(1)}
            <span className="font-normal text-gray-400">({item.vendorReviewCount ?? 0})</span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            {pct != null ? <span className="text-[11px] text-gray-400 line-through">{tl(item.price)}</span> : null}
            <span className="text-sm font-black" style={{ color: GREEN_DEEP }}>
              {tl(pct != null ? item.salePrice : item.price)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
