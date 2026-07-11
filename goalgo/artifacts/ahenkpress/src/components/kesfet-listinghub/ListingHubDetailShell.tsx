import { type ReactNode } from "react";
import { Link } from "wouter";
import {
  BarChart3,
  Briefcase,
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  Send,
  ShoppingBag,
  Star,
  UtensilsCrossed,
  Wallet,
  X,
} from "lucide-react";
import { SADE_PUBLIC_HERO_LIGHT_GRADIENT } from "@/lib/yekpareSadeTheme";

export type ListingHubNavItem = {
  id: string;
  label: string;
  icon: ReactNode;
};

export const LISTING_HUB_NAV: ListingHubNavItem[] = [
  { id: "lh-genel-bakis", label: "Genel Bakış", icon: <Briefcase className="h-4 w-4" /> },
  { id: "lh-urunler", label: "Ürünler", icon: <ShoppingBag className="h-4 w-4" /> },
  { id: "lh-ozellikler", label: "Özellikler", icon: <UtensilsCrossed className="h-4 w-4" /> },
  { id: "lh-galeri", label: "Galeri", icon: <ImageIcon className="h-4 w-4" /> },
  { id: "lh-haritalar", label: "Haritalar", icon: <MapPin className="h-4 w-4" /> },
  { id: "lh-istatistik", label: "İstatistikler", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "lh-yorumlar", label: "Yorumlar", icon: <Star className="h-4 w-4" /> },
];

type HeroProps = {
  coverUrl: string | null;
  logoUrl: string | null;
  name: string;
  verified?: boolean;
  location: string;
  category: string;
  priceLevel?: string;
  rating?: number | null;
  reviewCount?: number | null;
  priceRange?: string;
  onMessage: () => void;
  mapsHref: string;
};

export function ListingHubDetailHero({
  coverUrl,
  logoUrl,
  name,
  verified,
  location,
  category,
  priceLevel,
  rating,
  reviewCount,
  priceRange,
  onMessage,
  mapsHref,
}: HeroProps) {
  const heroLight = !coverUrl;
  const heroBg = coverUrl
    ? `linear-gradient(180deg, rgba(0,0,0,.25) 0%, rgba(0,0,0,.72) 100%), url('${coverUrl}')`
    : SADE_PUBLIC_HERO_LIGHT_GRADIENT;

  return (
    <section
      className={`lh-detail-hero${heroLight ? " lh-detail-hero--light" : ""}`}
      style={{ backgroundImage: heroBg, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="lh-detail-hero-inner">
        <div className="mb-4">
          <Link href="/kesfet" className={`text-sm font-semibold ${heroLight ? "text-[#0f766e] hover:text-[#0b5f59]" : "text-white/70 hover:text-white"}`}>
            ← Keşfet
          </Link>
        </div>
        <div className="lh-detail-hero-row">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="lh-detail-logo">
              {logoUrl ? (
                <img src={logoUrl} alt={name} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <span>🏪</span>
              )}
            </div>
            <div>
              <div className="lh-detail-title-row">
                <h1>{name}</h1>
                {verified ? <span className="lh-verified" title="Doğrulanmış">✓</span> : null}
              </div>
              <div className="lh-detail-meta">
                {location ? (
                  <span>
                    <MapPin className="inline h-4 w-4" /> {location}
                  </span>
                ) : null}
                {category ? (
                  <span>
                    <Briefcase className="inline h-4 w-4" /> {category}
                  </span>
                ) : null}
                {priceLevel ? <span>{priceLevel}</span> : null}
                {rating ? (
                  <span className="lh-stars">
                    {"★".repeat(Math.round(rating))}
                    {reviewCount ? ` (${Number(reviewCount).toLocaleString("tr-TR")} yorum)` : ""}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="lh-detail-cta-col">
            {priceRange ? (
              <>
                <div className="lh-price-label">Fiyat aralığı</div>
                <div className="lh-price-value">{priceRange}</div>
              </>
            ) : null}
            <button type="button" className="lh-btn-white" onClick={onMessage}>
              <Send className="h-4 w-4" />
              Mesaj gönder
            </button>
            <Link href={mapsHref} target="_blank" rel="noopener noreferrer" className="lh-btn-white ml-2">
              <MapPin className="h-4 w-4" />
              Konuma git
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ListingHubFeatureNav({ activeId }: { activeId?: string }) {
  return (
    <nav className="lh-feature-nav" aria-label="Bölüm menüsü">
      <ul>
        {LISTING_HUB_NAV.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`} className={activeId === item.id ? "active" : ""}>
              {item.icon}
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

type CartItem = { id: string; name: string; price: number; image?: string };

export function ListingHubCartDrawer({
  open,
  items,
  onClose,
  onRemove,
}: {
  open: boolean;
  items: CartItem[];
  onClose: () => void;
  onRemove: (id: string) => void;
}) {
  const subtotal = items.reduce((s, i) => s + i.price, 0);
  return (
    <>
      <div className={`lh-cart-overlay ${open ? "open" : ""}`} onClick={onClose} role="presentation" />
      <aside className={`lh-cart-drawer ${open ? "open" : ""}`} aria-label="Sepet">
        <div className="lh-cart-header">
          <h4>Sepetinizdeki ürünler</h4>
          <button type="button" onClick={onClose} aria-label="Kapat">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="lh-cart-items">
          {items.length === 0 ? (
            <p className="text-sm text-slate-500">Sepetiniz boş. Ürün eklemek için + düğmesine basın.</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="lh-cart-item">
                {item.image ? <img src={item.image} alt="" /> : <div className="h-14 w-14 rounded-lg bg-slate-100" />}
                <div className="flex-1">
                  <p className="text-sm font-bold">{item.name}</p>
                  <p className="text-sm text-[#c71f37]">{item.price.toLocaleString("tr-TR")} ₺</p>
                </div>
                <button type="button" onClick={() => onRemove(item.id)} className="text-slate-400 hover:text-red-500">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
        <div className="lh-cart-footer">
          <p className="lh-cart-subtotal">Ara toplam: {subtotal.toLocaleString("tr-TR")} ₺</p>
          <button type="button" className="lh-btn-outline" onClick={onClose}>
            Sepeti görüntüle
          </button>
          <button type="button" className="lh-btn-checkout" onClick={onClose}>
            Ödeme (yakında)
          </button>
        </div>
      </aside>
    </>
  );
}

export function ListingHubSectionCard({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="lh-section-card scroll-mt-24">
      <div className="lh-section-card-header">
        <h3>{title}</h3>
      </div>
      <div className="lh-section-card-body">{children}</div>
    </section>
  );
}

export function ListingHubSidebarCard({
  name,
  avatarUrl,
  phone,
  email,
  website,
  address,
  hours,
  openNow,
  onReserve,
  onWhatsApp,
  children,
}: {
  name: string;
  avatarUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  hours?: Array<{ day: string; time: string; today?: boolean }>;
  openNow?: boolean | null;
  onReserve?: () => void;
  onWhatsApp?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="lh-sidebar">
      <div className="lh-sidebar-card">
        <div className="lh-sidebar-banner" />
        <div className="lh-sidebar-avatar-wrap">
          <div className="lh-sidebar-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <span>🏪</span>
            )}
          </div>
          <p className="text-sm text-slate-500">İşletme</p>
          <h6 className="text-base font-bold">{name}</h6>
        </div>
        {email ? (
          <div className="lh-contact-row">
            <div className="lh-contact-icon">
              <MessageCircle className="h-4 w-4" />
            </div>
            <div>
              <p>E-posta</p>
              <strong>{email}</strong>
            </div>
          </div>
        ) : null}
        {phone ? (
          <div className="lh-contact-row">
            <div className="lh-contact-icon">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <p>Telefon</p>
              <strong>{phone}</strong>
            </div>
          </div>
        ) : null}
        {website ? (
          <div className="lh-contact-row">
            <div className="lh-contact-icon">
              <Briefcase className="h-4 w-4" />
            </div>
            <div>
              <p>Web sitesi</p>
              <strong>{website.replace(/^https?:\/\//, "")}</strong>
            </div>
          </div>
        ) : null}
        {address ? (
          <div className="lh-contact-row">
            <div className="lh-contact-icon">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <p>Adres</p>
              <strong>{address}</strong>
            </div>
          </div>
        ) : null}
      </div>

      {onReserve || onWhatsApp ? (
        <div className="lh-sidebar-card p-4">
          <h6 className="mb-3 font-bold">Rezervasyon / İletişim</h6>
          {onWhatsApp ? (
            <button type="button" className="lh-reserve-btn mb-2 bg-[#25D366]" onClick={onWhatsApp}>
              WhatsApp&apos;tan yaz
            </button>
          ) : null}
          {onReserve ? (
            <button type="button" className="lh-reserve-btn" onClick={onReserve}>
              Rezervasyon yap
            </button>
          ) : null}
        </div>
      ) : null}

      {hours && hours.length > 0 ? (
        <div className="lh-sidebar-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h6 className="font-bold">Çalışma saatleri</h6>
            {openNow != null ? (
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${openNow ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                {openNow ? "Şimdi açık" : "Kapalı"}
              </span>
            ) : null}
          </div>
          {hours.map((row) => (
            <div key={row.day} className={`lh-hours-row ${row.today ? "today" : ""}`}>
              <span>{row.day}</span>
              <span>{row.time}</span>
            </div>
          ))}
        </div>
      ) : null}

      {children}
    </div>
  );
}
