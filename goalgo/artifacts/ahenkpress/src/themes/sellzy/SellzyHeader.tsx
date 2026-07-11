import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  ChevronDown,
  ChevronRight,
  CirclePercent,
  Headset,
  Heart,
  LayoutGrid,
  LogIn,
  Menu,
  PhoneCall,
  Search,
  ShoppingBag,
  ShoppingCart,
  User,
  UserPlus,
} from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { SellzyContainer } from "./SellzyContainer";
import type { SellzyCategory } from "./types";

function categoryHref(cat: SellzyCategory): string {
  const slug = cat.slug || String(cat.name).toLocaleLowerCase("tr-TR");
  return `/magaza/kategori/${encodeURIComponent(slug)}`;
}

/** Ported from Sellzy TopHeader + MiddleHeader + BottomHeader (apps/web/src/components/common/header/*) */
export function SellzyHeader({
  categories = [],
  query = "",
  onQueryChange,
  onSearch,
  selectedCategory = "",
  onCategoryChange,
}: {
  categories?: SellzyCategory[];
  query?: string;
  onQueryChange?: (v: string) => void;
  onSearch?: (e: React.FormEvent) => void;
  selectedCategory?: string;
  onCategoryChange?: (v: string) => void;
}) {
  const { count: cartCount } = useCart();
  const [isSticky, setIsSticky] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const supportRef = useRef<HTMLDivElement>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const visibleCategories = categories.slice(0, 12);

  useEffect(() => {
    const onScroll = () => setIsSticky(window.scrollY > 200);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (supportRef.current && !supportRef.current.contains(e.target as Node)) setSupportOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const navLinks = [
    { label: "Ana Sayfa", href: "/magaza" },
    { label: "Ürünler", href: "/magaza/urunler" },
    { label: "Mağazalar", href: "/magaza/magazalar" },
    { label: "Kampanyalar", href: "/magaza/kampanyalar" },
    { label: "Markalar", href: "/magaza/markalar" },
    { label: "Blog", href: "/magaza/blog" },
  ];

  return (
    <header className="w-full">
      {/* TopHeader */}
      <div className="bg-primary-light header-top relative z-[60]">
        <SellzyContainer>
          <div className="flex flex-col xl:flex-row items-center justify-between gap-y-2">
            <div className="xl:flex items-center gap-x-6 hidden">
              <p className="flex items-center gap-x-2 text-primary-foreground text-sm font-thin line-clamp-1">
                <Headset className="size-5 text-primary-foreground" />
                Destek hattı
                <Link href="tel:08500000000" className="bg-warning py-px px-2 text-xs leading-4.5 rounded-[60px] text-foreground">
                  0850 000 00 00
                </Link>
              </p>
            </div>
            <div className="text-center py-2 xl:py-3.5">
              <p className="flex items-center justify-center gap-x-1.75 text-primary-foreground text-xs sm:text-sm font-thin line-clamp-1">
                <CirclePercent className="text-primary-foreground size-4 sm:size-5" />
                Seçili kategorilerde
                <span className="bg-warning py-px px-2 text-[10px] sm:text-xs leading-4.5 rounded-[60px] text-foreground font-medium">%40</span>
                varan indirim fırsatı
              </p>
            </div>
            <div className="hidden lg:flex">
              <ul className="flex items-center text-primary-foreground">
                <li><Link href="/destek" className="topHeaderNavBtn">Hakkımızda</Link></li>
                <li><Link href="/hesabim" className="topHeaderNavBtn">Hesabım</Link></li>
                <li><Link href="/magaza/sepet" className="topHeaderNavBtn">Favoriler</Link></li>
                <li><Link href="/siparis-takip" className="topHeaderNavBtn border-r-0">Sipariş takip</Link></li>
              </ul>
            </div>
          </div>
        </SellzyContainer>
      </div>

      {/* MiddleHeader */}
      <div className="py-4 border border-gray-300 xl:border-0 bg-white hidden xl:block header-middle relative z-50">
        <SellzyContainer>
          <div className="flex items-center w-full">
            <Link href="/magaza" className="shrink-0 mr-8">
              <img src="/sellzy/logo.png" alt="Yekpare Pazaryeri" className="h-11 w-auto object-contain" />
            </Link>
            <div className="flex items-center w-full justify-end gap-x-[54px]">
              <form onSubmit={onSearch} className="flex items-center w-full max-w-[640px] rounded-full border-2 border-primary bg-white p-1 pl-4 gap-2">
                <select
                  value={selectedCategory}
                  onChange={(e) => onCategoryChange?.(e.target.value)}
                  className="hidden lg:block max-w-[180px] bg-transparent text-sm font-semibold text-foreground outline-none"
                >
                  <option value="">Tüm kategoriler</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.slug || cat.name}>{cat.name}</option>
                  ))}
                </select>
                <span className="hidden lg:block h-7 w-px bg-gray-200" />
                <Search className="size-4 text-muted-foreground shrink-0" />
                <input
                  value={query}
                  onChange={(e) => onQueryChange?.(e.target.value)}
                  className="flex-1 min-w-0 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
                  placeholder="Ürün, marka veya mağaza ara..."
                />
                <button type="submit" className="shrink-0 rounded-full bg-primary-light hover:bg-primary-dark text-white font-semibold px-6 py-3 text-sm hoverEffect">
                  Ara
                </button>
              </form>
              <div className="flex items-center gap-x-6 shrink-0">
                <Link href="/hesabim" className="flex items-center gap-x-3 group py-2">
                  <span className="inline-flex items-center justify-center bg-warning w-12 h-12 rounded-xl text-primary group-hover:bg-primary group-hover:text-white hoverEffect">
                    <User className="size-6" />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[12px] font-medium text-muted-foreground leading-tight">Hesap</span>
                    <span className="text-[15px] font-bold text-foreground leading-tight">Giriş yap</span>
                  </span>
                </Link>
                <Link href="/magaza/sepet" className="flex items-center gap-x-3 group py-2 relative">
                  <span className="inline-flex items-center justify-center bg-warning w-12 h-12 rounded-xl text-primary group-hover:bg-primary group-hover:text-white hoverEffect">
                    <ShoppingCart className="size-6" />
                  </span>
                  {cartCount > 0 ? (
                    <span className="absolute -top-1 left-9 flex h-5 min-w-5 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white px-1">
                      {cartCount}
                    </span>
                  ) : null}
                  <span className="flex flex-col">
                    <span className="text-[12px] font-medium text-muted-foreground leading-tight">Sepet</span>
                    <span className="text-[15px] font-bold text-foreground leading-tight">{cartCount} ürün</span>
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </SellzyContainer>
      </div>

      {/* BottomHeader */}
      <div
        className={`border-y border-border hidden xl:flex header-bottom bg-background z-40 transition-all duration-300 w-full ${
          isSticky ? "fixed top-0 left-0 shadow-md animate-fadeInDown" : "relative"
        }`}
      >
        <SellzyContainer className="flex items-center justify-between w-full">
          <div className="flex items-center gap-x-8">
            <div className="relative group">
              <button type="button" className="flex items-center gap-x-2 bg-primary-light hover:bg-primary text-primary-foreground px-6 py-4 rounded-lg font-semibold transition-colors duration-300">
                <LayoutGrid className="size-5" />
                Tüm kategoriler
                <ChevronDown className="size-5 transition-transform duration-300 group-hover:rotate-180" />
              </button>
              <ul className="absolute left-0 top-full w-[280px] bg-background shadow-dark-z-24 rounded-b-lg border-x border-b border-border z-50 transition-all duration-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-2 group-hover:translate-y-0 max-h-[70vh] overflow-y-auto">
                {visibleCategories.map((cat) => (
                  <li key={cat.id} className="border-b last:border-b-0 border-border/50 group/item relative">
                    <Link href={categoryHref(cat)} className="flex items-center justify-between px-6 py-3 text-sm font-medium text-foreground hover:text-primary hover:bg-muted">
                      <span className="flex items-center gap-x-3">
                        <span className="size-8 rounded-full bg-icon-bg inline-flex items-center justify-center text-xs font-bold text-primary">
                          {cat.name.charAt(0)}
                        </span>
                        {cat.name}
                      </span>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <nav className="main-menu">
              <ul>
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div className="relative" ref={supportRef}>
            <button
              type="button"
              onClick={() => setSupportOpen((o) => !o)}
              className="flex items-center gap-x-2 text-sm font-semibold text-foreground hover:text-primary"
            >
              <PhoneCall className="size-4" />
              Canlı destek
              <ChevronDown className={`size-4 transition-transform ${supportOpen ? "rotate-180" : ""}`} />
            </button>
            {supportOpen ? (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-white p-4 shadow-dark-z-24 z-50">
                <p className="text-sm font-bold text-foreground">0850 000 00 00</p>
                <p className="mt-1 text-xs text-muted-foreground">Haftanın 7 günü 09:00–22:00</p>
              </div>
            ) : null}
          </div>
        </SellzyContainer>
      </div>

      {/* Mobile header */}
      <div className="xl:hidden border-b border-border bg-white px-4 py-3 flex items-center justify-between gap-3">
        <button type="button" onClick={() => setMobileOpen((o) => !o)} aria-label="Menü">
          <Menu className="size-6 text-primary" />
        </button>
        <Link href="/magaza" className="font-bold text-lg text-primary">Yekpare</Link>
        <Link href="/magaza/sepet" className="relative">
          <ShoppingCart className="size-6 text-foreground" />
          {cartCount > 0 ? (
            <span className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[9px] text-white">{cartCount}</span>
          ) : null}
        </Link>
      </div>
      {mobileOpen ? (
        <div className="xl:hidden border-b border-border bg-white px-4 py-3 flex flex-col gap-2">
          <form onSubmit={onSearch} className="flex gap-2">
            <input
              value={query}
              onChange={(e) => onQueryChange?.(e.target.value)}
              className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
              placeholder="Ürün, marka veya mağaza ara"
            />
            <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm text-white">Ara</button>
          </form>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="py-2 text-sm font-semibold text-foreground" onClick={() => setMobileOpen(false)}>
              {link.label}
            </Link>
          ))}
          <Link href="/hesabim" className="flex items-center gap-2 py-2 text-sm"><LogIn className="size-4" /> Giriş</Link>
          <Link href="/magaza/satici-ol" className="flex items-center gap-2 py-2 text-sm"><UserPlus className="size-4" /> Mağaza aç</Link>
          <Link href="/magaza/sepet" className="flex items-center gap-2 py-2 text-sm"><Heart className="size-4" /> Favoriler</Link>
        </div>
      ) : null}
    </header>
  );
}
