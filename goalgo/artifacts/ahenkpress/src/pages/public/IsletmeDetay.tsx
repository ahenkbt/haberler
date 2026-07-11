import { useState, useEffect, useRef } from "react";
import { Link, useRoute, useLocation } from "wouter";
import QRCode from "qrcode";
import { useMember } from "../../context/MemberContext";
import { apiUrl, resolveClientMediaSrc } from "@/lib/apiBase";
import { haritalarNavHref, kesfetBusinessMapHref } from "@/lib/haritalarNav";
import { cleanAboutForPublic } from "@/lib/publicAboutText";
import { applySocialShareMeta, resetSeoToSiteDefaults, seoPlainSnippet, applyMapBusinessStructuredData } from "@/lib/pageSeo";
import { VendorAnnouncementsSection } from "@/components/VendorAnnouncementsSection";
import { VendorBlogPreviewSection, type VendorBlogPostRow } from "@/components/VendorBlogPreviewSection";
import {
  ListingHubCartDrawer,
  ListingHubDetailHero,
  ListingHubFeatureNav,
  ListingHubSectionCard,
  ListingHubSidebarCard,
} from "@/components/kesfet-listinghub/ListingHubDetailShell";
import { ShoppingBag } from "lucide-react";
import "@/styles/listinghubKesfet.css";

const api = (path: string) => apiUrl(path.startsWith("/api") ? path : `/api${path.startsWith("/") ? path : `/${path}`}`);

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DAY_TR: Record<string, string> = { sun: "Pazar", mon: "Pazartesi", tue: "Salı", wed: "Çarşamba", thu: "Perşembe", fri: "Cuma", sat: "Cumartesi" };
const TODAY = DAY_KEYS[new Date().getDay()];

interface Business {
  id: string; name: string; slug?: string | null; address?: string | null;
  phone?: string | null; website?: string | null; email?: string | null; whatsappNumber?: string | null;
  rating?: number | null; userRatingsTotal?: number | null;
  latitude?: number | null; longitude?: number | null;
  categoryId?: string | null; photoUrl?: string | null; coverPhotoUrl?: string | null;
  isPremium?: boolean; premiumExpiresAt?: string | null; description?: string | null; storeType?: string | null;
  /** Doğrulanmış/premium/vendor değilse özel sayfa yoktur → haritaya yönlendir. */
  hasPublicProfile?: boolean | null;
  /** Ana sayfa / harita: `ulasim` ise ulaşım firması vitrin şablonu */
  homepageSuperCategory?: string | null;
  workingHours?: Record<string, { open: string; close: string; closed?: boolean }> | null;
  priceLevel?: number | null; hasDelivery?: boolean; hasReservation?: boolean; hasOnlineOrder?: boolean;
  tags?: string[] | null; googlePlaceId?: string | null;
  /** Places New / admin: metinsel yoğunluk özeti (histogram API'de yok). */
  popularHours?: Record<string, unknown> | null;
  googlePlacesExtras?: Record<string, unknown> | null;
  instagramUrl?: string | null; facebookUrl?: string | null; twitterUrl?: string | null; menuUrl?: string | null;
  category?: { id: string; name: string; icon?: string; slug?: string | null } | null;
  city?: { name: string } | null; district?: { name: string } | null;
  images?: Array<{ id: string; imageUrl: string; altText?: string }>;
}

/** Harita işletmesi ile mağaza slug'ı farklı olsa bile `/siparis/satici/...` veya `/alisveris/magaza/...` üret. */
function resolveMapBusinessStoreHref(
  biz: Business,
  linked: { slug: string; vendor_type: string } | null,
): string | null {
  const enc = (x: string) => encodeURIComponent(x.trim());
  if (linked?.slug?.trim()) {
    const vt = String(linked.vendor_type || "").toLowerCase();
    if (vt === "ecommerce") return `/alisveris/magaza/${enc(linked.slug)}`;
    if (vt === "delivery") return `/siparis/satici/${enc(linked.slug)}`;
  }
  const bs = String(biz.slug ?? "").trim();
  const fallback = bs ? `/kesfet/${enc(bs)}?tab=products` : `/kesfet/isletme/${enc(biz.id)}?tab=products`;
  const st = String(biz.storeType ?? "").toLowerCase();
  if (bs && st === "alisveris") return `/alisveris/magaza/${enc(bs)}`;
  if (bs && (st === "siparis" || biz.hasDelivery)) return `/siparis/satici/${enc(bs)}`;
  if (bs && biz.hasOnlineOrder) return `/alisveris/magaza/${enc(bs)}`;
  return fallback;
}

/** Places'ten gelen yorum / editoryal özet metinleri (histogram/popüler saat yok; puan üst başlıkta). */
function popularHoursTextLines(ph: unknown): string[] {
  if (!ph || typeof ph !== "object") return [];
  const o = ph as Record<string, unknown>;
  const lines: string[] = [];
  for (const key of ["reviewSummary", "editorialSummary"] as const) {
    const v = o[key];
    if (typeof v === "string" && v.trim()) lines.push(v.trim());
  }
  return lines;
}

function boolFromUnknown(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true") return true;
    if (s === "false") return false;
  }
  return null;
}

function pickPlacesNewExtras(b: Business | null): Record<string, unknown> | null {
  if (!b?.googlePlacesExtras || typeof b.googlePlacesExtras !== "object") return null;
  const root = b.googlePlacesExtras as Record<string, unknown>;
  const nested = root.placesApiNew;
  if (nested && typeof nested === "object") return nested as Record<string, unknown>;
  return root;
}

/** Places `accessibilityOptions` nesnesi veya kök seviyedeki bayraklar. */
function accessibilityYes(extras: Record<string, unknown>, key: string): boolean {
  if (boolFromUnknown(extras[key]) === true) return true;
  const ao = extras.accessibilityOptions;
  if (ao && typeof ao === "object") return boolFromUnknown((ao as Record<string, unknown>)[key]) === true;
  return false;
}

function featureGroupsFromPlacesNew(extras: Record<string, unknown> | null): Array<{ title: string; items: string[] }> {
  if (!extras) return [];
  const yes = (key: string) => boolFromUnknown(extras[key]) === true;
  const paymentOptions = extras.paymentOptions && typeof extras.paymentOptions === "object"
    ? (extras.paymentOptions as Record<string, unknown>)
    : null;
  const parkingOptions = extras.parkingOptions && typeof extras.parkingOptions === "object"
    ? (extras.parkingOptions as Record<string, unknown>)
    : null;

  const groups: Array<{ title: string; items: string[] }> = [];
  const atmosphere = [
    yes("delivery") ? "🛵 Teslimat" : "",
    yes("takeout") ? "🥡 Paket servis" : "",
    yes("dineIn") ? "🍽️ Mekanda yeme" : "",
    yes("curbsidePickup") ? "🚗 Arabaya servis" : "",
    yes("reservable") ? "📅 Rezervasyon" : "",
    yes("servesBreakfast") ? "🌅 Kahvaltı" : "",
    yes("servesBrunch") ? "🥐 Brunch" : "",
    yes("servesLunch") ? "🍽️ Öğle yemeği" : "",
    yes("servesDinner") ? "🌙 Akşam yemeği" : "",
    yes("servesVegetarianFood") ? "🥗 Vejetaryen seçenek" : "",
    yes("menuForChildren") ? "👶 Çocuk menüsü" : "",
    yes("servesDessert") ? "🍰 Tatlı servisi" : "",
    yes("servesCocktails") ? "🍸 Kokteyl servisi" : "",
    yes("servesCoffee") ? "☕ Kahve" : "",
    yes("servesBeer") ? "🍺 Bira" : "",
    yes("servesWine") ? "🍷 Şarap" : "",
    yes("liveMusic") ? "🎵 Canlı müzik" : "",
    yes("outdoorSeating") ? "🌿 Dış mekan oturma" : "",
    yes("goodForWatchingSports") ? "⚽ Maç izlemeye uygun" : "",
    yes("goodForChildren") ? "🧒 Çocuklar için uygun" : "",
    yes("goodForGroups") ? "👥 Gruplar için uygun" : "",
    yes("allowsDogs") ? "🐶 Köpek kabul edilir" : "",
  ].filter(Boolean);
  if (atmosphere.length) groups.push({ title: "Atmosfer & Hizmet", items: atmosphere });

  const accessibility = [
    accessibilityYes(extras, "wheelchairAccessibleEntrance") ? "♿ Tekerlekli sandalye ile giriş" : "",
    accessibilityYes(extras, "wheelchairAccessibleParking") ? "♿ Engelli park alanı" : "",
    accessibilityYes(extras, "wheelchairAccessibleRestroom") ? "♿ Engelli tuvaleti" : "",
    accessibilityYes(extras, "wheelchairAccessibleSeating") ? "♿ Engelli oturma alanı" : "",
  ].filter(Boolean);
  if (accessibility.length) groups.push({ title: "Erişilebilirlik", items: accessibility });

  const payments = [
    paymentOptions && boolFromUnknown(paymentOptions.acceptsCreditCards) === true ? "💳 Kredi kartı" : "",
    paymentOptions && boolFromUnknown(paymentOptions.acceptsDebitCards) === true ? "💳 Banka kartı" : "",
    paymentOptions && boolFromUnknown(paymentOptions.acceptsNfc) === true ? "📱 Temassız ödeme (NFC)" : "",
    paymentOptions && boolFromUnknown(paymentOptions.acceptsCashOnly) === true ? "💵 Nakit kabul (Places)" : "",
  ].filter(Boolean);
  if (payments.length) groups.push({ title: "Ödeme", items: payments });

  const parking = [
    parkingOptions && boolFromUnknown(parkingOptions.freeParkingLot) === true ? "🅿️ Ücretsiz otopark" : "",
    parkingOptions && boolFromUnknown(parkingOptions.paidParkingLot) === true ? "🅿️ Ücretli otopark" : "",
    parkingOptions && boolFromUnknown(parkingOptions.freeGarageParking) === true ? "🅿️ Ücretsiz kapalı otopark" : "",
    parkingOptions && boolFromUnknown(parkingOptions.paidGarageParking) === true ? "🅿️ Ücretli kapalı otopark" : "",
    parkingOptions && boolFromUnknown(parkingOptions.freeStreetParking) === true ? "🛣️ Ücretsiz sokak parkı" : "",
    parkingOptions && boolFromUnknown(parkingOptions.paidStreetParking) === true ? "🛣️ Ücretli sokak parkı" : "",
    parkingOptions && boolFromUnknown(parkingOptions.valetParking) === true ? "🧑‍✈️ Vale" : "",
  ].filter(Boolean);
  if (parking.length) groups.push({ title: "Otopark", items: parking });

  return groups;
}

const BUSINESS_STATUS_TR: Record<string, string> = {
  OPERATIONAL: "Faal",
  CLOSED_TEMPORARILY: "Geçici kapalı",
  CLOSED_PERMANENTLY: "Kalıcı kapalı",
};

function formatPlusCode(pc: unknown): string | null {
  if (!pc || typeof pc !== "object") return null;
  const o = pc as Record<string, unknown>;
  const g = typeof o.globalCode === "string" ? o.globalCode.trim() : "";
  const c = typeof o.compoundCode === "string" ? o.compoundCode.trim() : "";
  if (g && c) return `${g} (${c})`;
  return g || c || null;
}

function hasPlacesNewPublicDetail(extras: Record<string, unknown> | null): boolean {
  if (!extras) return false;
  if (extras.source === "places_api_new") return true;
  if (typeof extras.googleMapsUri === "string" && extras.googleMapsUri.trim()) return true;
  if (typeof extras.businessStatus === "string" && extras.businessStatus.trim()) return true;
  if (typeof extras.primaryType === "string" && extras.primaryType.trim()) return true;
  if (Array.isArray(extras.types) && extras.types.length > 0) return true;
  if (extras.plusCode) return true;
  if (typeof extras.reviewSummaryText === "string" && extras.reviewSummaryText.trim()) return true;
  return false;
}

function productServiceSignals(extras: Record<string, unknown> | null): string[] {
  if (!extras) return [];
  const ready = extras.productServiceSignals;
  if (Array.isArray(ready)) {
    return ready.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 16);
  }
  const out: string[] = [];
  if (boolFromUnknown(extras.delivery) === true) out.push("Teslimat");
  if (boolFromUnknown(extras.takeout) === true) out.push("Paket servis");
  if (boolFromUnknown(extras.dineIn) === true) out.push("Mekanda yeme");
  if (boolFromUnknown(extras.curbsidePickup) === true) out.push("Arabaya servis");
  if (boolFromUnknown(extras.reservable) === true) out.push("Rezervasyon");
  if (boolFromUnknown(extras.servesBreakfast) === true) out.push("Kahvaltı");
  if (boolFromUnknown(extras.servesBrunch) === true) out.push("Brunch");
  if (boolFromUnknown(extras.servesLunch) === true) out.push("Öğle yemeği");
  if (boolFromUnknown(extras.servesDinner) === true) out.push("Akşam yemeği");
  if (boolFromUnknown(extras.servesVegetarianFood) === true) out.push("Vejetaryen seçenek");
  if (boolFromUnknown(extras.menuForChildren) === true) out.push("Çocuk menüsü");
  if (boolFromUnknown(extras.servesDessert) === true) out.push("Tatlı");
  if (boolFromUnknown(extras.servesCoffee) === true) out.push("Kahve");
  if (boolFromUnknown(extras.servesBeer) === true) out.push("Bira");
  if (boolFromUnknown(extras.servesWine) === true) out.push("Şarap");
  if (boolFromUnknown(extras.servesCocktails) === true) out.push("Kokteyl");
  return out.slice(0, 16);
}

function textFromObj(v: unknown, max = 600): string | null {
  if (!v) return null;
  if (typeof v === "string") return v.trim().slice(0, max) || null;
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    const direct = typeof o.text === "string" ? o.text : typeof o.overview === "string" ? o.overview : null;
    if (direct) return direct.trim().slice(0, max) || null;
    if (o.overview && typeof o.overview === "object") {
      const ov = o.overview as Record<string, unknown>;
      if (typeof ov.text === "string") return ov.text.trim().slice(0, max) || null;
    }
  }
  return null;
}

function isUlasimTransportBusiness(b: Business): boolean {
  const superCat = String(b.homepageSuperCategory ?? "").toLowerCase().trim();
  if (superCat === "ulasim") return true;
  const catSlug = String(b.category?.slug ?? "").toLowerCase();
  if (catSlug.startsWith("ulasim")) return true;
  if (String(b.storeType ?? "").toLowerCase() === "ulasim") return true;
  return false;
}

interface Product {
  id: string; businessId: string; name: string; description?: string | null;
  price?: number | null; discountedPrice?: number | null; imageUrl?: string | null;
  category?: string | null; isAvailable: boolean; isDeliverable: boolean; sortOrder: number;
}

const EMPTY_STORE_FEATURES = [
  "Yekpare.net pazaryerinden satış yapmaya başla",
  "Kendi özel domainini mağazana bağla",
  "PayTR / iyzico hesabınla online ödeme al",
  "Ürün, menü, rezervasyon ve hizmetlerini tek panelden yönet",
  "Keşfet işletme sayfanla mağaza vitrinin birbirine bağlı çalışsın",
  "Kampanya, duyuru, blog ve müşteri yorumlarıyla görünürlüğünü artır",
];

interface GDetails {
  photos: Array<{ url: string }>; reviews: Array<{
    authorName: string; profilePhoto?: string; rating: number; relativeTime: string; text: string;
  }>;
  hasMore: boolean; totalReviews: number; openNow?: boolean; weekdayText?: string[]; editorialSummary?: string; noKey?: boolean;
}

function Stars({ r, sm }: { r: number; sm?: boolean }) {
  const cls = sm ? "w-3.5 h-3.5" : "w-4 h-4";
  return (
    <span className="inline-flex gap-px">
      {[1,2,3,4,5].map(s => (
        <svg key={s} className={`${cls} ${s <= Math.round(r) ? "text-amber-500" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

export default function IsletmeDetay() {
  const [matchSlug, paramsSlug] = useRoute("/kesfet/:slug");
  const [matchId, paramsId] = useRoute("/kesfet/isletme/:id");

  const RESERVED = ["premium-basarili", "isletme"];
  const rawSlug = matchSlug ? paramsSlug?.slug : undefined;
  const isReserved = rawSlug ? RESERVED.includes(rawSlug) : false;
  const slugParam = matchSlug && !isReserved ? rawSlug : undefined;
  const idParam = matchId ? paramsId?.id : undefined;
  const [, setLocation] = useLocation();

  const [biz, setBiz] = useState<Business | null>(null);
  const [linkedVendor, setLinkedVendor] = useState<{
    slug: string;
    name: string;
    vendor_type: string;
    description?: string | null;
    aboutHtml?: string | null;
    about_html?: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<"overview" | "products" | "photos">(() => {
    if (typeof window === "undefined") return "overview";
    const p = new URLSearchParams(window.location.search);
    const t = p.get("tab");
    if (t === "about" || t === "reviews" || t === "blog") return "overview";
    if (t === "products" || t === "photos") return t;
    return "overview";
  });
  const [hoursOpen, setHoursOpen] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [gd, setGd] = useState<GDetails | null>(null);
  const [gdLoading, setGdLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const overviewMapRef = useRef<HTMLDivElement>(null);
  const [showWaPopover, setShowWaPopover] = useState(false);
  const [blogPreviewPosts, setBlogPreviewPosts] = useState<VendorBlogPostRow[]>([]);
  const [blogPreviewLoading, setBlogPreviewLoading] = useState(false);

  // Contact form
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactMsg, setContactMsg] = useState("");
  const [contactSending, setContactSending] = useState(false);
  const [contactDone, setContactDone] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  const { member, openModal } = useMember();

  // User reviews (anonymous, admin-approved)
  interface UserReview { id: string; nickname: string | null; rating: number; comment: string | null; photos: string[]; createdAt: string; }
  const [userReviews, setUserReviews] = useState<UserReview[]>([]);
  const [urLoading, setUrLoading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [urFirstName, setUrFirstName] = useState("");
  const [urLastName, setUrLastName] = useState("");
  const [urEmail, setUrEmail] = useState("");
  const [urPhone, setUrPhone] = useState("");
  const [urNick, setUrNick] = useState("");
  const [urRating, setUrRating] = useState(0);
  const [urHoverRating, setUrHoverRating] = useState(0);
  const [urComment, setUrComment] = useState("");
  const [urPhotos, setUrPhotos] = useState<string[]>([]);
  const [urSubmitting, setUrSubmitting] = useState(false);
  const [urSuccess, setUrSuccess] = useState(false);
  const [urError, setUrError] = useState<string | null>(null);
  const [showMemberCta, setShowMemberCta] = useState(false);
  const [vendorAnnouncements, setVendorAnnouncements] = useState<Array<{ id: number; title: string; body: string; published_at?: string | null }>>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<Array<{ id: string; name: string; price: number; image?: string }>>([]);

  const pageUrl = typeof window !== "undefined" ? window.location.href : "";

  /* ── Load business ── */
  useEffect(() => {
    if (!slugParam && !idParam) { setLoading(false); setNotFound(true); return; }
    // Cancel/race guard: hızlı kart geçişinde eski cevap yeni işletmeyi ezmesin.
    let cancelled = false;
    setLoading(true);
    const url = slugParam
      ? api(`/map/businesses/by-slug/${encodeURIComponent(slugParam)}`)
      : api(`/map/businesses/${idParam}`);
    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        if (d.success && d.data) {
          const loaded = d.data.business ?? d.data;
          // Salt kazınan (doğrulanmamış/premium olmayan/vendorsuz) işletmenin özel sayfası
          // yoktur; doğrudan tam ekran harita penceresine yönlendir.
          if (loaded.hasPublicProfile === false) {
            setLocation(
              kesfetBusinessMapHref({
                id: loaded.id,
                name: loaded.name,
                lat: loaded.latitude,
                lng: loaded.longitude,
                googlePlaceId: loaded.googlePlaceId,
              }),
              { replace: true },
            );
            return;
          }
          setBiz(loaded);
          // Redirect from UUID URL to slug URL (replaces history entry)
          if (idParam && loaded.slug) {
            setLocation(`/kesfet/${loaded.slug}`, { replace: true });
          }
          // Fetch linked delivery/ecommerce vendor
          if (loaded.id && (loaded.hasDelivery || loaded.hasOnlineOrder)) {
            fetch(api(`/map/businesses/${loaded.id}/vendor`))
              .then(r => r.json())
              .then(v => { if (!cancelled && v.vendor) setLinkedVendor(v.vendor); })
              .catch(() => {});
          }
        } else {
          setNotFound(true);
        }
      })
      .catch(() => { if (!cancelled) setNotFound(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slugParam, idParam]);

  useEffect(() => {
    if (!biz) return;
    const path = slugParam
      ? `/kesfet/${encodeURIComponent(slugParam)}`
      : biz.slug
        ? `/kesfet/${encodeURIComponent(biz.slug)}`
        : `/kesfet/isletme/${encodeURIComponent(String(biz.id))}`;
    const cat = biz.category?.name ?? "";
    const lines = popularHoursTextLines(biz.popularHours);
    const snippet =
      seoPlainSnippet(biz.description) ||
      (lines.length ? lines.join(" ") : "") ||
      "Harita ve keşfet üzerinde işletme sayfası.";
    const loc = [biz.district?.name, biz.city?.name].filter(Boolean).join(", ");
    const primary = [biz.name, cat ? `(${cat})` : null, snippet, loc ? `Konum: ${loc}.` : null].filter(Boolean).join(" ");
    applySocialShareMeta({
      title: `${biz.name} — Keşfet`,
      descriptionPrimary: primary,
      canonicalPath: path,
      imageUrl: biz.coverPhotoUrl || biz.photoUrl || biz.images?.[0]?.imageUrl,
    });
    applyMapBusinessStructuredData({
      name: biz.name,
      description: biz.description,
      canonicalPath: path,
      imageUrl: biz.coverPhotoUrl || biz.photoUrl || biz.images?.[0]?.imageUrl,
      phone: biz.phone,
      address: biz.address,
      city: biz.city?.name,
      district: biz.district?.name,
      lat: biz.latitude,
      lng: biz.longitude,
      rating: biz.rating,
      reviewCount: biz.userRatingsTotal,
    });
    return () => resetSeoToSiteDefaults();
  }, [biz, slugParam]);

  /* ── Load products ── */
  useEffect(() => {
    if (!biz) return;
    fetch(api(`/map/businesses/${biz.id}/products`))
      .then(r => r.json())
      .then(d => { if (d.success) setProducts(d.data ?? []); })
      .catch(() => {});
  }, [biz?.id]);

  /* ── Load approved user reviews ── */
  useEffect(() => {
    if (!biz) return;
    setUrLoading(true);
    fetch(api(`/map/businesses/${biz.id}/user-reviews`))
      .then(r => r.json())
      .then(d => { if (d.success) setUserReviews(d.data ?? []); })
      .catch(() => {})
      .finally(() => setUrLoading(false));
  }, [biz?.id]);

  useEffect(() => {
    if (!linkedVendor?.slug) {
      setVendorAnnouncements([]);
      return;
    }
    let cancelled = false;
    fetch(api(`/delivery/vendors/${encodeURIComponent(linkedVendor.slug)}/announcements`))
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && Array.isArray(d.announcements)) setVendorAnnouncements(d.announcements);
      })
      .catch(() => {
        if (!cancelled) setVendorAnnouncements([]);
      });
    return () => {
      cancelled = true;
    };
  }, [linkedVendor?.slug]);

  useEffect(() => {
    const slug = linkedVendor?.slug?.trim();
    if (!slug) {
      setBlogPreviewPosts([]);
      return;
    }
    let c = false;
    setBlogPreviewLoading(true);
    fetch(api(`/delivery/vendors/${encodeURIComponent(slug)}/blog/posts`))
      .then((r) => (r.ok ? r.json() : { posts: [] }))
      .then((d) => {
        if (!c) setBlogPreviewPosts(Array.isArray(d.posts) ? d.posts.slice(0, 5) : []);
      })
      .catch(() => {
        if (!c) setBlogPreviewPosts([]);
      })
      .finally(() => {
        if (!c) setBlogPreviewLoading(false);
      });
    return () => {
      c = true;
    };
  }, [linkedVendor?.slug]);

  async function submitUserReview() {
    if (!biz || urRating === 0) return;
    const firstName = (member?.firstName || urFirstName).trim();
    const lastName = (member?.lastName || urLastName).trim();
    const email = (member?.email || urEmail).trim();
    if (!firstName || !lastName || !email) {
      setUrError("Ad, soyad ve e-posta zorunludur.");
      return;
    }
    setUrSubmitting(true); setUrError(null);
    try {
      const res = await fetch(api(`/map/businesses/${biz.id}/user-reviews`), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName, lastName, email,
          phone: (member?.phone || urPhone).trim() || undefined,
          nickname: urNick.trim() || `${firstName} ${lastName}`,
          rating: urRating, comment: urComment.trim() || null, photos: urPhotos,
        }),
      });
      const d = await res.json();
      if (d.success) {
        setUrSuccess(true);
        setShowReviewForm(false);
        if (!member) setShowMemberCta(true);
        setUrFirstName(""); setUrLastName(""); setUrEmail(""); setUrPhone("");
        setUrNick(""); setUrRating(0); setUrComment(""); setUrPhotos([]);
      } else { setUrError(d.error || "Bir hata oluştu."); }
    } catch { setUrError("Bağlantı hatası."); }
    finally { setUrSubmitting(false); }
  }

  function handleUrPhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).slice(0, 5 - urPhotos.length);
    files.forEach(file => {
      if (file.size > 3 * 1024 * 1024) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const b64 = ev.target?.result as string;
        if (b64) setUrPhotos(prev => [...prev, b64].slice(0, 5));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  /* ── Google details + auto-scrape ── */
  useEffect(() => {
    if (!biz) return;
    const bizId = biz.id;
    setGdLoading(true);
    fetch(api(`/map/businesses/${bizId}/google-details`))
      .then(r => r.json())
      .then(d => {
        if (!d.success) return;
        setGd(d.data);
        // Auto-trigger scrape if this business hasn't been scraped yet
        if (d.data?.needsScrape && !scraping) {
          setScraping(true);
          fetch(api(`/map/businesses/${bizId}/scrape-detail`), { method: "POST" })
            .then(sr => sr.json())
            .then(() => Promise.all([
              fetch(api(`/map/businesses/${bizId}/google-details`)).then(r => r.json()),
              fetch(api(`/map/businesses/${bizId}`)).then(r => r.json()),
            ]))
            .then(([d2, d3]) => {
              if (d2.success) setGd(d2.data);
              if (d3.success && d3.data) setBiz(d3.data.business ?? d3.data);
            })
            .catch(() => {})
            .finally(() => setScraping(false));
        }
      })
      .catch(() => {})
      .finally(() => setGdLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [biz?.id]);

  /* ── QR ── */
  useEffect(() => {
    if (!biz?.isPremium || !pageUrl) return;
    QRCode.toDataURL(pageUrl, { width: 220, margin: 1, color: { dark: "#1e1b4b", light: "#ffffff" } })
      .then(setQrUrl).catch(() => {});
  }, [biz?.isPremium, pageUrl]);

  /* ── Mini-map (Genel Bakış altı; sekme değişince yeniden kurulur) ── */
  useEffect(() => {
    if (tab !== "overview" || !biz?.latitude || !biz?.longitude || !overviewMapRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L;
    if (!L) return;
    const el = overviewMapRef.current;
    const map = L.map(el, { zoomControl: true, scrollWheelZoom: false }).setView([biz.latitude, biz.longitude], 16);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);
    const icon = L.divIcon({
      className: "",
      html: `<div style="width:36px;height:40px;position:relative"><div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:3px solid white;box-shadow:0 4px 12px rgba(99,102,241,.5);display:flex;align-items:center;justify-content:center;font-size:16px">${biz.category?.icon || "📍"}</div><div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:8px solid #6366f1"></div></div>`,
      iconSize: [36, 40], iconAnchor: [18, 40],
    });
    L.marker([biz.latitude, biz.longitude], { icon }).addTo(map).bindPopup(biz.name).openPopup();
    return () => {
      try {
        map.remove();
      } catch {
        /* noop */
      }
    };
  }, [tab, biz?.id, biz?.latitude, biz?.longitude, biz?.name, biz?.category?.icon]);

  /* ── Contact send ── */
  async function sendContactMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!biz) return;
    setContactSending(true); setContactError(null);
    try {
      const r = await fetch(api(`/map/businesses/${biz.id}/contact`), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderName: contactName, senderPhone: contactPhone, message: contactMsg }),
      });
      const d = await r.json();
      if (d.success) { setContactDone(true); setContactName(""); setContactPhone(""); setContactMsg(""); }
      else setContactError(d.error || "Bir hata oluştu");
    } catch { setContactError("Bağlantı hatası"); }
    finally { setContactSending(false); }
  }

  /* ── Helpers ── */
  const openStatus = (() => {
    if (!biz?.workingHours) return gd?.openNow !== undefined ? { ok: gd.openNow, text: gd.openNow ? "Şu an açık" : "Şu an kapalı" } : null;
    const h = biz.workingHours[TODAY];
    if (!h || h.closed) return { ok: false, text: "Bugün kapalı" };
    const now = new Date(); const cur = now.getHours() * 60 + now.getMinutes();
    const [oh, om] = h.open.split(":").map(Number);
    const [ch, cm] = h.close.split(":").map(Number);
    const o = oh * 60 + om; const c = ch * 60 + cm;
    if (!Number.isFinite(o) || !Number.isFinite(c)) return null;
    // Gece yarısını aşan saatler (ör. 20:00–02:00): c <= o ise gece aşımı.
    const overnight = c <= o;
    const isOpen = overnight ? (cur >= o || cur < c) : (cur >= o && cur < c);
    if (isOpen) {
      // Kapanışa kalan süre (gece aşımında ertesi güne sarkar).
      const m = (overnight && cur >= o) ? (c + 1440 - cur) : (c - cur);
      return { ok: true, text: m <= 60 ? `Açık · ${m} dk içinde kapanıyor` : `Açık · ${h.close}'ye kadar` };
    }
    return { ok: false, text: `Kapalı · ${h.open}'de açılıyor` };
  })();

  const photos = [
    ...(gd?.photos?.map(p => p.url) ?? []),
    ...(biz?.images?.map(i => i.imageUrl) ?? []),
    ...(biz?.photoUrl ? [biz.photoUrl] : []),
    ...(biz?.coverPhotoUrl ? [biz.coverPhotoUrl] : []),
  ]
    .map((v) => resolveClientMediaSrc(v) || v)
    .filter((v, i, a) => v && a.indexOf(v) === i) as string[];

  function copyLink() {
    navigator.clipboard.writeText(pageUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); }).catch(() => {});
  }

  // WhatsApp: prefer whatsappNumber, fallback to phone
  const rawWaSource = (biz?.whatsappNumber || biz?.phone || "").replace(/\D/g, "");
  const waNumber = rawWaSource.startsWith("0") ? "90" + rawWaSource.slice(1) : rawWaSource;
  const bizPublicUrl = biz?.slug
    ? `https://turk.eco/kesfet/${biz.slug}`
    : `https://turk.eco/kesfet/isletme/${biz?.id}`;
  const waMsg = `Merhaba size ${bizPublicUrl} adresinden ulaşıyorum. ${biz?.name} hakkında bilgi almak istiyorum.`;
  const waLink = waNumber.length >= 10
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(waMsg)}`
    : null;

  // Share modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [shareEmbedCopied, setShareEmbedCopied] = useState(false);

  function openShare() { setShowShareModal(true); setShareLinkCopied(false); setShareEmbedCopied(false); }
  function closeShare() { setShowShareModal(false); }
  function nativeShare() {
    if (navigator.share) {
      navigator.share({ title: biz?.name ?? "İşletme", url: pageUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(pageUrl).then(() => { setShareLinkCopied(true); setTimeout(() => setShareLinkCopied(false), 2000); }).catch(() => {});
    }
  }
  function copyShareLink() {
    navigator.clipboard.writeText(pageUrl).then(() => { setShareLinkCopied(true); setTimeout(() => setShareLinkCopied(false), 2000); }).catch(() => {});
  }
  const embedCode = `<iframe src="${pageUrl}" width="100%" height="500" frameborder="0" allowfullscreen></iframe>`;
  function copyEmbed() {
    navigator.clipboard.writeText(embedCode).then(() => { setShareEmbedCopied(true); setTimeout(() => setShareEmbedCopied(false), 2000); }).catch(() => {});
  }

  /* ── Group products by category ── */
  const productsByCategory = products.reduce<Record<string, Product[]>>((acc, p) => {
    const raw = p.category || "Ürünler";
    const cat = raw === "__vendor_menu__" ? "Menü & Sipariş" : raw;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  /* ── Loading ── */
  if (loading) return (
    <div className="lh-detail lh-loading-screen">
      <div className="text-center">
        <div className="lh-spinner mx-auto mb-4" />
        <p className="text-slate-500 text-sm">Yükleniyor…</p>
      </div>
    </div>
  );
  if (notFound || !biz) return (
    <div className="lh-detail min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">İşletme Bulunamadı</h1>
        <p className="text-gray-500 mb-6">Bu sayfa mevcut değil veya kaldırıldı.</p>
        <Link href="/kesfet" className="inline-block rounded-xl bg-[#c71f37] px-6 py-3 font-semibold text-white hover:bg-[#a8182d] transition">
          ← Keşfet&apos;e dön
        </Link>
      </div>
    </div>
  );

  const actualReviewCount = gd?.reviews?.length ?? 0;
  const totalReviewHint = (gd?.totalReviews ?? 0) > actualReviewCount ? gd!.totalReviews : null;

  const tabList = [
    { key: "overview", label: "Genel Bakış" },
    { key: "products", label: products.length > 0 ? `Ürünler & Hizmetler (${products.length})` : "Ürünler & Hizmetler" },
    { key: "photos", label: `Fotoğraflar${photos.length ? ` (${photos.length})` : ""}` },
  ] as { key: string; label: string }[];

  const resolvedStoreHref = resolveMapBusinessStoreHref(biz, linkedVendor);
  const magazaHrefPrimary = resolvedStoreHref;
  const showMagazaCta = Boolean(magazaHrefPrimary);
  const hasRealLinkedStore = Boolean(linkedVendor?.slug || (magazaHrefPrimary && !magazaHrefPrimary.includes("?tab=products")));

  const vendorAboutRaw = linkedVendor
    ? String(linkedVendor.aboutHtml || linkedVendor.about_html || "").trim()
    : "";
  const vendorDescRaw = linkedVendor ? String(linkedVendor.description || "").trim() : "";
  const fromLinkedVendor = cleanAboutForPublic(vendorAboutRaw || vendorDescRaw);
  const fromMapBusiness = cleanAboutForPublic(String(biz.description || ""));
  const aboutText = fromLinkedVendor || fromMapBusiness;
  const editorialForOverview = (gd?.editorialSummary && String(gd.editorialSummary).trim()) || null;
  const linkedVendorBlogHref = (() => {
    if (linkedVendor?.slug != null && linkedVendor.slug !== "") {
      return String(linkedVendor.vendor_type || "").toLowerCase() === "ecommerce"
        ? `/alisveris/magaza/${encodeURIComponent(linkedVendor.slug)}/blog`
        : `/siparis/satici/${encodeURIComponent(linkedVendor.slug)}/blog`;
    }
    const bs = String(biz.slug ?? "").trim();
    if (!resolvedStoreHref || !bs) return null;
    if (resolvedStoreHref.startsWith("/alisveris/magaza/")) return `/alisveris/magaza/${encodeURIComponent(bs)}/blog`;
    if (resolvedStoreHref.startsWith("/siparis/satici/")) return `/siparis/satici/${encodeURIComponent(bs)}/blog`;
    return null;
  })();
  const placesNew = pickPlacesNewExtras(biz);
  const placesGroups = featureGroupsFromPlacesNew(placesNew);
  const placesGroupsForOverview = placesGroups.filter((g) => g.title !== "Erişilebilirlik");
  const accessibilityGroup = placesGroups.find((g) => g.title === "Erişilebilirlik");
  const fiveStarSpotlight: Array<{ kind: "user" | "google"; id: string; name: string; text: string | null; at: string }> = [];
  for (const rev of userReviews.filter((r) => r.rating === 5).slice(0, 5)) {
    fiveStarSpotlight.push({
      kind: "user",
      id: `u-${rev.id}`,
      name: rev.nickname || "Ziyaretçi",
      text: rev.comment,
      at: rev.createdAt,
    });
  }
  const needG = 5 - fiveStarSpotlight.length;
  if (needG > 0 && gd?.reviews?.length) {
    let gi = 0;
    for (const rev of gd.reviews) {
      if ((rev.rating ?? 0) !== 5) continue;
      fiveStarSpotlight.push({
        kind: "google",
        id: `g-${gi}`,
        name: rev.authorName || "Google",
        text: rev.text ?? null,
        at: rev.relativeTime || "",
      });
      gi += 1;
      if (fiveStarSpotlight.length >= 5) break;
    }
  }
  const overviewPhotos6 = photos.slice(0, 6);
  const blogPostHrefPrefix =
    linkedVendor?.slug != null && linkedVendor.slug !== ""
      ? String(linkedVendor.vendor_type || "").toLowerCase() === "ecommerce"
        ? `/alisveris/magaza/${encodeURIComponent(linkedVendor.slug)}`
        : `/siparis/satici/${encodeURIComponent(linkedVendor.slug)}`
      : resolvedStoreHref ?? "";
  const placesProductSignals = productServiceSignals(placesNew);
  /** Keşfet slug'ı ile Yekpare PWA Store'daki servis sağlayıcı / işletme PWA indir sayfası. */
  const kesfetPwaSlug = String(slugParam ?? biz.slug ?? "").trim();
  const kesfetPwaHref = kesfetPwaSlug ? `/uygulamayi-indir?kesfet=${encodeURIComponent(kesfetPwaSlug)}` : null;
  const generativeSummary = textFromObj(placesNew?.generativeSummary, 700);
  const areaSummary = textFromObj(placesNew?.areaSummary, 500);
  const editorialSummaryNew = textFromObj(placesNew?.editorialSummary, 500);

  /** Genel Bakış «Hakkımızda»: önce panel metni, yoksa Places New özetleri, en sonda (temizlenmiş) harita açıklaması. */
  const overviewNarrativeRaw =
    fromLinkedVendor ||
    editorialSummaryNew ||
    generativeSummary ||
    areaSummary ||
    (editorialForOverview ? cleanAboutForPublic(String(editorialForOverview)) : "") ||
    fromMapBusiness ||
    "";
  const overviewNarrative = overviewNarrativeRaw ? cleanAboutForPublic(String(overviewNarrativeRaw)).trim() || null : null;

  const mapsHref = haritalarNavHref({ id: biz.id, slug: biz.slug, lat: biz.latitude, lng: biz.longitude });
  const coverHero = photos[0] ?? null;
  const logoHero = photos[0] ?? resolveClientMediaSrc(biz.coverPhotoUrl || biz.photoUrl || null);
  const priceLevelLabel = biz.priceLevel ? "₺".repeat(biz.priceLevel) : "";
  const priceRangeLabel = biz.priceLevel ? `${"₺".repeat(biz.priceLevel)} fiyat seviyesi` : "";
  const hoursRows = gd?.weekdayText
    ? gd.weekdayText.map((line, i) => {
        const [day, hrs] = line.split(": ");
        return { day: day || line, time: hrs || "", today: i === (new Date().getDay() + 6) % 7 };
      })
    : biz.workingHours
      ? Object.entries(biz.workingHours).map(([day, h]) => ({
          day: DAY_TR[day] || day,
          time: h.closed ? "Kapalı" : `${h.open} – ${h.close}`,
          today: day === TODAY,
        }))
      : [];

  function addToCart(product: Product) {
    const price = product.discountedPrice ?? product.price ?? 0;
    setCartItems((prev) => {
      if (prev.find((x) => x.id === product.id)) return prev;
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: Number(price) || 0,
          image: resolveClientMediaSrc(product.imageUrl) || undefined,
        },
      ];
    });
    setCartOpen(true);
  }

  return (
    <div className="lh-detail min-h-screen" data-page="kesfet-listing-detail">

      <ListingHubDetailHero
        coverUrl={coverHero}
        logoUrl={logoHero}
        name={biz.name}
        verified={Boolean(biz.isPremium)}
        location={[biz.district?.name, biz.city?.name].filter(Boolean).join(", ") || biz.address || ""}
        category={biz.category ? `${biz.category.icon || ""} ${biz.category.name}`.trim() : ""}
        priceLevel={priceLevelLabel}
        rating={biz.rating}
        reviewCount={biz.userRatingsTotal}
        priceRange={priceRangeLabel}
        onMessage={() => document.getElementById("lh-iletisim-form")?.scrollIntoView({ behavior: "smooth" })}
        mapsHref={mapsHref}
      />
      <ListingHubFeatureNav />

      <div className="lh-gray-body">
        <div className="lh-detail-grid">
          <div className="lh-detail-main">

      
        {isUlasimTransportBusiness(biz) && (
          <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50/80 p-5 shadow-sm">
            <p className="text-[11px] font-black text-amber-900 uppercase tracking-wider mb-4">Ulaşım firması</p>
            <div className="grid md:grid-cols-2 gap-4">
              <section id="hakkimizda" className="rounded-xl bg-white border border-amber-100/80 p-4 shadow-sm">
                <h2 className="text-sm font-black text-gray-900 mb-2">Hakkımızda</h2>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {(
                    aboutText ||
                    (gd?.editorialSummary && String(gd.editorialSummary).trim()) ||
                    (biz.description && String(biz.description).trim()) ||
                    `${biz.name} olarak yolcu ve gönderi taşımacılığında hizmet veriyoruz.`
                  ).trim()}
                </p>
              </section>
              <section id="hizmetlerimiz" className="rounded-xl bg-white border border-amber-100/80 p-4 shadow-sm">
                <h2 className="text-sm font-black text-gray-900 mb-2">Hizmetlerimiz</h2>
                {biz.tags && biz.tags.length > 0 ? (
                  <ul className="list-disc pl-4 text-sm text-gray-700 space-y-1">
                    {biz.tags.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                ) : (
                  <ul className="list-disc pl-4 text-sm text-gray-700 space-y-1">
                    <li>{biz.category?.name ? `${biz.category.name} hizmetleri` : "Taksi, kurye, nakliyat ve benzeri ulaşım çözümleri"}</li>
                    <li>Rezervasyon ve teklif için iletişim kanallarımızdan bize ulaşabilirsiniz.</li>
                  </ul>
                )}
              </section>
              <section id="adres" className="rounded-xl bg-white border border-amber-100/80 p-4 shadow-sm">
                <h2 className="text-sm font-black text-gray-900 mb-2">Adres</h2>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {[biz.address, biz.district?.name, biz.city?.name].filter(Boolean).join(" · ") || "Adres bilgisi yakında güncellenecek."}
                </p>
                {biz.latitude != null && biz.longitude != null && (
                  <Link href={haritalarNavHref({ id: biz.id, slug: biz.slug, lat: biz.latitude, lng: biz.longitude })} className="inline-block mt-2 text-xs font-bold text-amber-800 hover:underline">
                    Haritada konumu aç →
                  </Link>
                )}
              </section>
              <section id="iletisim" className="rounded-xl bg-white border border-amber-100/80 p-4 shadow-sm">
                <h2 className="text-sm font-black text-gray-900 mb-2">İletişim</h2>
                <ul className="text-sm text-gray-700 space-y-2">
                  {biz.phone && (
                    <li>
                      <span className="text-gray-500 font-semibold">Telefon: </span>
                      <a href={`tel:${biz.phone}`} className="text-indigo-600 font-medium hover:underline">{biz.phone}</a>
                    </li>
                  )}
                  {biz.email && (
                    <li>
                      <span className="text-gray-500 font-semibold">E-posta: </span>
                      <a href={`mailto:${biz.email}`} className="text-indigo-600 font-medium hover:underline break-all">{biz.email}</a>
                    </li>
                  )}
                  {waLink && (
                    <li>
                      <span className="text-gray-500 font-semibold">WhatsApp: </span>
                      <a href={waLink} target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-medium hover:underline">Yazın</a>
                    </li>
                  )}
                  {biz.website && (
                    <li>
                      <span className="text-gray-500 font-semibold">Web: </span>
                      <a href={biz.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-medium hover:underline break-all">{biz.website.replace(/^https?:\/\//, "")}</a>
                    </li>
                  )}
                  {!biz.phone && !biz.email && !waLink && !biz.website && (
                    <li className="text-gray-500">İletişim bilgisi eklenmemiş.</li>
                  )}
                </ul>
              </section>
            </div>
          </div>
        )}

            {scraping && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3">
                <div className="lh-spinner h-4 w-4 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-rose-800">Konum bilgileri yükleniyor…</p>
                  <p className="text-xs text-rose-600">Fotoğraflar, yorumlar ve çalışma saatleri yükleniyor</p>
                </div>
              </div>
            )}

            <ListingHubSectionCard id="lh-genel-bakis" title="Tanım">
              <div className="space-y-5">
                {showMagazaCta && magazaHrefPrimary && (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3">
                    <p className="text-xs font-bold text-indigo-900 mb-2">Mağaza / Sipariş</p>
                    <a
                      href={magazaHrefPrimary}
                      className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
                    >
                      {biz.storeType === "alisveris" ? "🛒" : "🛵"} Mağazaya Git
                    </a>
                  </div>
                )}
                {overviewNarrative ? (
                  <section id="hakkimizda" className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                    <h2 className="text-sm font-black text-gray-900 mb-2">Hakkımızda</h2>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line text-sm">
                      {overviewNarrative}
                    </p>
                  </section>
                ) : null}
                {(biz.tags ?? []).filter((t) => t && !/^google_places_api$/i.test(String(t).trim())).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(biz.tags ?? [])
                      .filter((t) => t && !/^google_places_api$/i.test(String(t).trim()))
                      .map((t, i) => (
                        <span key={i} className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs px-2.5 py-1 rounded-full font-medium">{t}</span>
                      ))}
                  </div>
                )}
                {popularHoursTextLines(biz.popularHours).length > 0 && (
                  <div className="rounded-xl border border-gray-200 bg-gray-50/90 p-4 text-sm text-gray-800 space-y-2">
                    <p className="font-bold text-gray-900">İşletme özeti</p>
                    <ul className="list-disc pl-4 space-y-1.5 text-gray-700">
                      {popularHoursTextLines(biz.popularHours).map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {((editorialSummaryNew && overviewNarrative !== editorialSummaryNew) || generativeSummary || areaSummary) && (
                  <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-4 text-sm text-slate-800 space-y-2">
                    <p className="font-bold text-sky-900">İşletme özetleri</p>
                    {editorialSummaryNew && overviewNarrative !== editorialSummaryNew && (
                      <p><span className="font-semibold text-sky-800">Öne çıkan:</span> {editorialSummaryNew}</p>
                    )}
                    {generativeSummary && <p><span className="font-semibold text-sky-800">Özet:</span> {generativeSummary}</p>}
                    {areaSummary && <p><span className="font-semibold text-sky-800">Bölge:</span> {areaSummary}</p>}
                  </div>
                )}
                {accessibilityGroup && accessibilityGroup.items.length > 0 && (
                  <section className="rounded-xl border border-teal-100 bg-teal-50/60 p-4">
                    <h2 className="text-sm font-black text-teal-900 mb-2">Erişilebilirlik</h2>
                    <div className="flex flex-wrap gap-1.5">
                      {accessibilityGroup.items.map((item) => (
                        <span
                          key={item}
                          className="inline-flex items-center rounded-full border border-teal-200 bg-white px-2.5 py-1 text-xs font-semibold text-teal-900"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </section>
                )}
                {waLink && (
                  <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">
                    <h2 className="text-sm font-black text-gray-900 mb-2">WhatsApp</h2>
                    <p className="text-xs text-gray-600 mb-3">Hızlı iletişim için aşağıdan sohbeti açın veya doğrudan WhatsApp&apos;a geçin.</p>
                    <button
                      type="button"
                      onClick={() => setShowWaPopover(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white shadow-md hover:opacity-95 transition"
                    >
                      💬 WhatsApp&apos;tan yaz
                    </button>
                  </div>
                )}
                {linkedVendorBlogHref && (
                  <section className="rounded-xl border border-violet-100 bg-violet-50/50 p-4 shadow-sm">
                    <h2 className="text-sm font-black text-violet-900 mb-2">Blog</h2>
                    <p className="text-xs text-violet-800/90 mb-2">Son yayınlar (en fazla 5). Tüm yazılar için mağaza bloguna gidin.</p>
                    <Link
                      href={linkedVendorBlogHref}
                      className="inline-flex rounded-full bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700 transition mb-3"
                    >
                      Blog&apos;a git
                    </Link>
                    {blogPreviewLoading ? (
                      <p className="text-xs text-gray-500">Yükleniyor…</p>
                    ) : blogPreviewPosts.length > 0 && blogPostHrefPrefix ? (
                      <VendorBlogPreviewSection posts={blogPreviewPosts} postHrefPrefix={blogPostHrefPrefix} />
                    ) : (
                      <p className="text-xs text-gray-500">Henüz önizlenecek yazı yok.</p>
                    )}
                  </section>
                )}
                {fiveStarSpotlight.length > 0 && (
                  <section className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h2 className="text-sm font-black text-amber-950">⭐ 5 yıldızlı yorumlar</h2>
                      <button type="button" onClick={() => { setTab("overview"); document.getElementById("yorumlar")?.scrollIntoView({ behavior: "smooth" }); }} className="text-[11px] font-bold text-amber-800 hover:underline">
                        Tümü ↓
                      </button>
                    </div>
                    <div className="space-y-3">
                      {fiveStarSpotlight.map((s) => (
                        <div key={s.id} className="rounded-lg bg-white/90 border border-amber-100/80 p-3">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-semibold text-sm text-gray-900">{s.name}</span>
                            <span className="text-[10px] text-gray-400 shrink-0">{s.kind === "user" ? new Date(s.at).toLocaleDateString("tr-TR") : s.at}</span>
                          </div>
                          <div className="flex gap-0.5 mb-1">{[1, 2, 3, 4, 5].map((st) => <span key={st} className="text-amber-400 text-xs">★</span>)}</div>
                          {s.text ? <p className="text-xs text-gray-600 leading-relaxed line-clamp-4">{s.text}</p> : null}
                        </div>
                      ))}
                    </div>
                    <Link href={biz.slug ? `/kesfet/${encodeURIComponent(biz.slug)}` : `/kesfet/isletme/${biz.id}`} className="mt-3 inline-block text-xs font-bold text-indigo-600 hover:underline">
                      Keşfet sayfasında daha fazlası →
                    </Link>
                  </section>
                )}
                {overviewPhotos6.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-sm font-black text-gray-900">Son fotoğraflar</h2>
                      <button type="button" onClick={() => setTab("photos")} className="text-xs font-bold text-indigo-600 hover:underline">
                        Tüm fotoğraflar →
                      </button>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 rounded-xl overflow-hidden border border-gray-100">
                      {overviewPhotos6.map((url, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setPhotoIdx(i);
                            setTab("photos");
                          }}
                          className="relative aspect-square bg-gray-100"
                        >
                          <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </section>
                )}
                {placesGroupsForOverview.length > 0 && (
                  <div className="space-y-3">
                    {placesGroupsForOverview.map((group) => (
                      <section key={group.title} className="rounded-xl border border-gray-200 bg-white p-3">
                        <h3 className="text-sm font-bold text-gray-900 mb-2">{group.title}</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {group.items.map((item) => (
                            <span key={`${group.title}-${item}`} className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700">
                              {item}
                            </span>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
                {placesProductSignals.length > 0 && (
                  <section className="rounded-xl border border-violet-200 bg-violet-50/50 p-3">
                    <h3 className="text-sm font-bold text-violet-900 mb-1">Google Places — hizmet özeti</h3>
                    <p className="text-[11px] text-violet-800/85 mb-2 leading-snug">
                      Fiyatlı menü listesi Places API'de yok; buradakiler işletme servis ve öğün bilgisidir.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {placesProductSignals.map((sig) => (
                        <span
                          key={sig}
                          className="inline-flex items-center rounded-full border border-violet-200 bg-white px-2.5 py-1 text-xs font-semibold text-violet-900"
                        >
                          {sig}
                        </span>
                      ))}
                    </div>
                  </section>
                )}
                {hasPlacesNewPublicDetail(placesNew) && placesNew && (
                  <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                    <h3 className="text-sm font-bold text-slate-900">Kayıt ve konum</h3>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {typeof placesNew.businessStatus === "string" && placesNew.businessStatus.trim() && (
                        <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-1 font-semibold text-slate-800">
                          Durum: {BUSINESS_STATUS_TR[placesNew.businessStatus] ?? placesNew.businessStatus}
                        </span>
                      )}
                      {typeof placesNew.primaryType === "string" && placesNew.primaryType.trim() && (
                        <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-1 font-semibold text-indigo-800">
                          Ana tür: {placesNew.primaryType.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                    {Array.isArray(placesNew.types) && placesNew.types.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Kategoriler</p>
                        <div className="flex flex-wrap gap-1">
                          {(placesNew.types as string[]).slice(0, 14).map((t) => (
                            <span
                              key={t}
                              className="rounded-md bg-slate-50 border border-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600"
                            >
                              {String(t).replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {typeof placesNew.reviewSummaryText === "string" && placesNew.reviewSummaryText.trim() && (
                      <div>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">Yorum özeti</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{placesNew.reviewSummaryText.trim()}</p>
                      </div>
                    )}
                    {formatPlusCode(placesNew.plusCode) && (
                      <p className="text-xs text-slate-600">
                        <span className="font-semibold text-slate-800">Plus Code: </span>
                        {formatPlusCode(placesNew.plusCode)}
                      </p>
                    )}
                    {biz.latitude && biz.longitude && (
                      <Link
                        href={`/kesfet?location=${encodeURIComponent(`${biz.latitude}, ${biz.longitude}`)}&q=${encodeURIComponent(biz.name)}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white text-xs font-bold px-3 py-2 hover:bg-slate-800 transition"
                      >
                        Keşfet haritasında aç
                      </Link>
                    )}
                  </section>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {biz.address && <InfoTile icon="📍" label="Adres" value={biz.address} />}
                  {biz.phone && <InfoTile icon="📞" label="Telefon" value={biz.phone} href={`tel:${biz.phone}`} />}
                  {waLink && <InfoTile icon="💬" label="WhatsApp" value={biz.whatsappNumber || biz.phone || "WhatsApp"} href={waLink} />}
                  {biz.website && <InfoTile icon="🌐" label="Web Sitesi" value={biz.website.replace(/^https?:\/\//, "")} href={biz.website} />}
                  {biz.email && <InfoTile icon="✉️" label="E-posta" value={biz.email} href={`mailto:${biz.email}`} />}
                  {biz.menuUrl && <InfoTile icon="🍽️" label="Menü" value="Menüyü Görüntüle" href={biz.menuUrl} />}
                </div>
                {(biz.instagramUrl || biz.facebookUrl || biz.twitterUrl) && (
                  <div className="flex gap-2 flex-wrap">
                    {biz.instagramUrl && <SocialBtn href={biz.instagramUrl} icon="📸" label="Instagram" color="from-pink-500 to-rose-500" />}
                    {biz.facebookUrl && <SocialBtn href={biz.facebookUrl} icon="👍" label="Facebook" color="from-blue-600 to-blue-700" />}
                    {biz.twitterUrl && <SocialBtn href={biz.twitterUrl} icon="🐦" label="Twitter/X" color="from-sky-500 to-sky-600" />}
                  </div>
                )}
                {/* Working hours */}
                {(biz.workingHours || gd?.weekdayText) && (
                  <div>
                    <button onClick={() => setHoursOpen(v => !v)} className="flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                      🕐 Çalışma Saatleri
                      <svg className={`w-4 h-4 transition-transform ${hoursOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {hoursOpen && (
                      <div className="mt-2 bg-gray-50 rounded-xl p-4 text-sm space-y-1">
                        {gd?.weekdayText ? (
                          gd.weekdayText.map((line, i) => {
                            const [day, hrs] = line.split(": ");
                            return (
                              <div key={i} className={`flex justify-between ${i === (new Date().getDay() + 6) % 7 ? "font-bold text-indigo-700" : "text-gray-600"}`}>
                                <span>{day}</span><span>{hrs}</span>
                              </div>
                            );
                          })
                        ) : biz.workingHours ? (
                          Object.entries(biz.workingHours).map(([day, h]) => (
                            <div key={day} className={`flex justify-between ${day === TODAY ? "font-bold text-indigo-700" : "text-gray-600"}`}>
                              <span>{DAY_TR[day] || day}</span>
                              <span>{h.closed ? "Kapalı" : `${h.open} – ${h.close}`}</span>
                            </div>
                          ))
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
                <VendorAnnouncementsSection items={vendorAnnouncements} />
                <section id="lh-iletisim-form" className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
                  <h2 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">✉</span>
                    Mesaj gönder
                  </h2>
                  {contactDone ? (
                    <div className="py-3 text-center text-sm text-gray-700">
                      <p className="font-semibold text-emerald-700">Mesajınız iletildi!</p>
                      <button type="button" onClick={() => setContactDone(false)} className="mt-2 text-xs text-indigo-600 hover:underline">
                        Yeni mesaj
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={sendContactMessage} className="space-y-2.5">
                      <input
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Adınız *"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                      <input
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="Telefon (isteğe bağlı)"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                      <textarea
                        required
                        value={contactMsg}
                        onChange={(e) => setContactMsg(e.target.value)}
                        placeholder="Mesajınız *"
                        rows={3}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                      {contactError && <p className="text-xs text-red-500">{contactError}</p>}
                      <button
                        type="submit"
                        disabled={contactSending}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl transition"
                      >
                        {contactSending ? "Gönderiliyor…" : "📨 Gönder"}
                      </button>
                    </form>
                  )}
                </section>
                {biz.latitude && biz.longitude && (
                  <section id="lh-haritalar" className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                    <h2 className="text-sm font-black text-gray-900 px-4 pt-4 pb-2">Harita</h2>
                    <div ref={overviewMapRef} className="lh-map-box w-full" />
                    <Link
                      href={mapsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-3 text-sm font-semibold text-[#c71f37] hover:bg-gray-50 border-t border-gray-100"
                    >
                      🗺️ Konuma git (Yekpare Haritalar)
                    </Link>
                  </section>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {biz.category && <AboutRow icon="🗂️" label="Kategori" value={`${biz.category.icon || ""} ${biz.category.name}`} />}
                  {biz.city && <AboutRow icon="🏙️" label="Şehir" value={biz.city.name} />}
                  {biz.district && <AboutRow icon="📌" label="İlçe" value={biz.district.name} />}
                  {biz.rating != null && <AboutRow icon="⭐" label="Puan" value={`${Number(biz.rating).toFixed(1)} / 5.0`} />}
                  {biz.priceLevel != null && biz.priceLevel > 0 && (
                    <AboutRow icon="💰" label="Fiyat" value={"₺".repeat(biz.priceLevel)} />
                  )}
                  {biz.slug && <AboutRow icon="🔗" label="URL" value={`/kesfet/${biz.slug}`} />}
                  {biz.hasDelivery && <AboutRow icon="🛵" label="Teslimat" value="Mevcut" />}
                  {biz.hasReservation && <AboutRow icon="📅" label="Rezervasyon" value="Mevcut" />}
                  {biz.hasOnlineOrder && <AboutRow icon="🛒" label="Online Sipariş" value="Mevcut" />}
                  {biz.isPremium && <AboutRow icon="✓" label="Üyelik" value="Premium" />}
                </div>
                <section id="lh-yorumlar" className="border-t border-gray-100 pt-5 mt-2">
                  <h2 className="text-sm font-black text-gray-900 mb-3">Yorumlar</h2>
                  <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
                    <div className="p-4 border-b border-gray-100">
                      {urSuccess ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-4">
                            <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                            <div>
                              <p className="font-semibold text-green-800 text-sm">Yorumunuz alındı!</p>
                              <p className="text-xs text-green-600">İncelendikten sonra yayınlanacak.</p>
                            </div>
                          </div>
                          {showMemberCta && (
                            <div className="rounded-2xl p-4 border border-indigo-100" style={{ background: "linear-gradient(135deg,#f0f0ff,#e8e8ff)" }}>
                              <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#4338ca,#7c3aed)" }}>
                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-indigo-900 text-sm">Siteye üye olmak ister misiniz?</p>
                                  <p className="text-xs text-indigo-600 mt-0.5">Üye olun, premium işletmelerin özel indirim ve kampanyalarından yararlanın.</p>
                                  <div className="flex gap-2 mt-2.5">
                                    <button type="button" onClick={() => { openModal("register"); setShowMemberCta(false); }}
                                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-white transition"
                                      style={{ background: "linear-gradient(135deg,#4338ca,#7c3aed)" }}>
                                      Üye Ol
                                    </button>
                                    <button type="button" onClick={() => setShowMemberCta(false)}
                                      className="px-3 py-1.5 rounded-xl text-xs font-medium text-indigo-600 border border-indigo-200 hover:bg-indigo-50 transition">
                                      Hayır, teşekkürler
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : showReviewForm ? (
                        <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                          <p className="font-semibold text-gray-800 text-sm">Yorumunuzu yazın</p>
                          <div className="flex gap-1.5">
                            {[1,2,3,4,5].map(s => (
                              <button type="button" key={s}
                                onMouseEnter={() => setUrHoverRating(s)}
                                onMouseLeave={() => setUrHoverRating(0)}
                                onClick={() => setUrRating(s)}
                                className="transition-transform hover:scale-110">
                                <svg className={`w-8 h-8 ${s <= (urHoverRating || urRating) ? "text-amber-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              </button>
                            ))}
                            {urRating > 0 && <span className="ml-1 text-sm text-gray-500 self-center">{["","Çok kötü","Kötü","Orta","İyi","Harika"][urRating]}</span>}
                          </div>
                          {member ? (
                            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2">
                              <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {member.firstName[0]!.toUpperCase()}
                              </div>
                              <p className="text-xs text-indigo-700 font-medium">{member.firstName} {member.lastName} olarak yorum yapıyorsunuz</p>
                            </div>
                          ) : (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <input value={urFirstName} onChange={e => setUrFirstName(e.target.value)} placeholder="Ad *" maxLength={80} required
                                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
                                <input value={urLastName} onChange={e => setUrLastName(e.target.value)} placeholder="Soyad *" maxLength={80} required
                                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
                              </div>
                              <input type="email" value={urEmail} onChange={e => setUrEmail(e.target.value)} placeholder="E-posta * (yayınlanmaz)" maxLength={200} required
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
                              <input type="tel" value={urPhone} onChange={e => setUrPhone(e.target.value)} placeholder="GSM (opsiyonel)" maxLength={30}
                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
                            </>
                          )}
                          <textarea value={urComment} onChange={e => setUrComment(e.target.value)} placeholder="Deneyiminizi paylaşın..." rows={3} maxLength={2000}
                            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
                          <div className="flex items-center gap-2 flex-wrap">
                            {urPhotos.map((p, i) => (
                              <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden">
                                <img src={p} alt="" className="w-full h-full object-cover" />
                                <button type="button" onClick={() => setUrPhotos(prev => prev.filter((_, j) => j !== i))}
                                  className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center text-white text-xs">×</button>
                              </div>
                            ))}
                            {urPhotos.length < 5 && (
                              <label className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 transition">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4"/></svg>
                                <span className="text-[10px] text-gray-400 mt-0.5">Foto</span>
                                <input type="file" accept="image/*" multiple className="hidden" onChange={handleUrPhotoUpload} />
                              </label>
                            )}
                          </div>
                          {urError && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{urError}</p>}
                          <div className="flex gap-2">
                            <button type="button" onClick={submitUserReview} disabled={urSubmitting || urRating === 0}
                              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2">
                              {urSubmitting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Gönderiliyor...</> : "Yorum Gönder"}
                            </button>
                            <button type="button" onClick={() => { setShowReviewForm(false); setUrError(null); }}
                              className="px-4 py-2.5 border border-gray-200 text-sm text-gray-600 rounded-xl hover:bg-gray-50 transition">İptal</button>
                          </div>
                          <p className="text-[10px] text-gray-400">E-posta adresiniz gizli tutulur, yayınlanmaz.</p>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setShowReviewForm(true)}
                          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-indigo-200 rounded-2xl text-indigo-600 font-semibold text-sm hover:border-indigo-400 hover:bg-indigo-50 transition">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                          Yorum Yaz
                        </button>
                      )}
                    </div>
                    {urLoading && <div className="flex justify-center py-8"><div className="w-7 h-7 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /></div>}
                    {!urLoading && userReviews.length > 0 && (
                      <div>
                        <p className="px-5 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">Ziyaretçi Yorumları ({userReviews.length})</p>
                        {userReviews.map(rev => (
                          <div key={rev.id} className="p-5 border-b border-gray-50 last:border-0">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                {(rev.nickname || "A")[0]!.toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold text-gray-900 text-sm">{rev.nickname || "Anonim"}</span>
                                  <span className="text-xs text-gray-400 shrink-0">{new Date(rev.createdAt).toLocaleDateString("tr-TR")}</span>
                                </div>
                                <div className="mt-0.5"><Stars r={rev.rating} sm /></div>
                                {rev.comment && <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{rev.comment}</p>}
                                {Array.isArray(rev.photos) && rev.photos.length > 0 && (
                                  <div className="flex gap-2 mt-2 flex-wrap">
                                    {rev.photos.map((ph, pi) => (
                                      <img key={pi} src={ph} alt="" className="w-20 h-20 rounded-lg object-cover border border-gray-100" />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {(gd?.reviews ?? []).length > 0 && <p className="px-5 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50 border-y border-gray-100">Google Yorumları</p>}
                    {gdLoading && <div className="flex justify-center py-8"><div className="w-7 h-7 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /></div>}
                    {(gd?.reviews ?? []).map((rev, i) => (
                      <div key={i} className="p-5 border-b border-gray-50 last:border-0">
                        <div className="flex items-start gap-3">
                          {rev.profilePhoto
                            ? <img src={rev.profilePhoto} alt={rev.authorName} className="w-10 h-10 rounded-full object-cover shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            : <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold shrink-0">{rev.authorName?.[0]?.toUpperCase() || "?"}</div>
                          }
                          <div className="flex-1">
                            <div className="flex items-center justify-between"><span className="font-semibold text-gray-900">{rev.authorName}</span><span className="text-xs text-gray-400">{rev.relativeTime}</span></div>
                            <div className="mt-0.5"><Stars r={rev.rating} sm /></div>
                            {rev.text && <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{rev.text}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                    {!urLoading && !gdLoading && userReviews.length === 0 && actualReviewCount === 0 && !gd?.noKey && (
                      <div className="p-10 text-center">
                        <p className="text-4xl mb-3">💬</p>
                        <p className="text-gray-500 mb-4">Henüz yorum yok. İlk yorumu siz yapın!</p>
                        {biz.googlePlaceId && (
                          <Link href={haritalarNavHref({ id: biz.id, slug: biz.slug, lat: biz.latitude, lng: biz.longitude })}
                            className="text-xs text-indigo-500 underline">Haritada görüntüle</Link>
                        )}
                      </div>
                    )}
                    {!gdLoading && gd?.hasMore && (
                      <div className="m-4 p-5 rounded-2xl text-center" style={{ background: "linear-gradient(135deg,#fef3c7,#fde68a)" }}>
                        <p className="font-bold text-amber-800 mb-0.5">İşletme üyeliğiyle görünürlüğünüzü artırın</p>
                        <p className="text-xs text-amber-600 mb-3">{gd.totalReviews} yorumun tamamı ve işletme araçları erişilebilir</p>
                        <Link href="/is-ortagi/basvuru" className="inline-block bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold px-5 py-2 rounded-xl transition">Günde 10 TL&apos;ye Başvur</Link>
                      </div>
                    )}
                  </div>
                </section>
                {!biz.isPremium && (
                  <div className="p-5 rounded-2xl border border-indigo-100 mt-6" style={{ background: "linear-gradient(135deg,#eef2ff,#e0e7ff)" }}>
                    <p className="font-bold text-indigo-800 mb-1">Bu işletmenin sahibi misiniz?</p>
                    <p className="text-sm text-indigo-600 mb-3">Web sitesi, QR kod, rezervasyon, sipariş ve domain özelliklerini aktif edin.</p>
                    <Link href="/is-ortagi/basvuru" className="inline-block bg-indigo-600 text-white text-sm font-bold px-5 py-2 rounded-xl hover:bg-indigo-700 transition">Günde 10 TL&apos;ye İşletme Üyeliği</Link>
                  </div>
                )}
              </div>
            </ListingHubSectionCard>

            {placesGroupsForOverview.length > 0 ? (
              <ListingHubSectionCard id="lh-ozellikler" title="Özellikler">
                <div className="lh-amenity-grid">
                  {placesGroupsForOverview.flatMap((g) => g.items).slice(0, 12).map((item) => (
                    <div key={item} className="lh-amenity">
                      <span className="icon">✓</span>
                      {item.replace(/^[^\s]+\s/, "")}
                    </div>
                  ))}
                </div>
              </ListingHubSectionCard>
            ) : null}

            <ListingHubSectionCard id="lh-urunler" title="Ürünler ve hizmetler">
              <div className="space-y-6">
                {placesProductSignals.length > 0 && (
                  <section className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                    <h3 className="text-sm font-bold text-emerald-900 mb-2">Places New Ürün/Hizmet Özeti</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {placesProductSignals.map((sig) => (
                        <span key={sig} className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-800">
                          {sig}
                        </span>
                      ))}
                    </div>
                  </section>
                )}
                {/* Mağaza / sipariş CTA */}
                {showMagazaCta && magazaHrefPrimary && (
                  <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm"
                    style={{ background: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)" }}>
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-white font-black text-sm">{biz.name}</p>
                        <p className="text-white/60 text-xs mt-0.5">
                          {!hasRealLinkedStore ? "Mağaza sayfanı buradan yayına alabilirsin" :
                           biz.storeType === "siparis" ? "Online sipariş verebilirsiniz" :
                           biz.storeType === "alisveris" ? "Online alışveriş yapabilirsiniz" :
                           "Online mağazayı ziyaret edin"}
                        </p>
                      </div>
                      <a
                        href={magazaHrefPrimary}
                        className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black text-white transition"
                        style={{ background: biz.storeType === "siparis" ? "#f97316" : biz.storeType === "alisveris" ? "#2563eb" : "#7c3aed" }}>
                        {hasRealLinkedStore ? `${biz.storeType === "siparis" ? "🛵" : biz.storeType === "alisveris" ? "🛒" : "🏪"} Mağazaya Git` : "🚀 İşletmeni Kaydet"}
                      </a>
                    </div>
                  </div>
                )}
                {Object.keys(productsByCategory).length === 0 ? (
                  <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
                    <div className="p-5 sm:p-6">
                      <div className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-black text-indigo-700 mb-3">
                        Mağaza sayfası hazır
                      </div>
                      <h3 className="text-xl font-black text-gray-950 mb-2">İşletmeni kaydet, online satışa başla</h3>
                      <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
                        Bu işletmenin mağaza içeriği henüz eklenmemiş. Yekpare iş ortağı olarak ürün, menü,
                        rezervasyon veya hizmetlerini bu sayfadan yayınlayabilir, Keşfet görünürlüğünü satışa dönüştürebilirsin.
                      </p>
                      <div className="grid sm:grid-cols-2 gap-2 mt-5">
                        {EMPTY_STORE_FEATURES.map((item) => (
                          <div key={item} className="flex items-start gap-2 rounded-xl bg-white/80 border border-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm">
                            <span className="text-emerald-600 mt-0.5">✓</span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-5 flex flex-col sm:flex-row gap-2">
                        <Link
                          href="/is-ortagi"
                          className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white hover:bg-indigo-700 transition"
                        >
                          İşletmeni Kaydet
                        </Link>
                        <Link
                          href="/is-ortagi#nasil-calisir"
                          className="inline-flex items-center justify-center rounded-xl border border-indigo-200 bg-white px-5 py-3 text-sm font-black text-indigo-700 hover:bg-indigo-50 transition"
                        >
                          Özellikleri İncele
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  Object.entries(productsByCategory).map(([cat, items]) => (
                    <div key={cat}>
                      <h3 className="font-bold text-gray-800 text-base mb-3 flex items-center gap-2">
                        <span className="w-1 h-5 bg-indigo-500 rounded-full inline-block" />
                        {cat}
                      </h3>
                      <div className="lh-product-grid">
                        {items.map(p => (
                          <div key={p.id} className={`lh-product-card ${!p.isAvailable ? "opacity-60" : ""}`}>
                            {resolveClientMediaSrc(p.imageUrl) ? (
                              <img src={resolveClientMediaSrc(p.imageUrl)} alt={p.name} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            ) : (
                              <div className="h-[140px] grid place-items-center bg-slate-100 text-2xl">🍽️</div>
                            )}
                            <div className="lh-product-card-body">
                              <h4>{p.name}</h4>
                              {p.description ? <p className="text-xs text-slate-500 line-clamp-2">{p.description}</p> : null}
                              <div className="mt-2 flex items-center justify-between">
                                <span className="lh-product-price">
                                  {(p.discountedPrice ?? p.price) != null
                                    ? `${Number(p.discountedPrice ?? p.price).toLocaleString("tr-TR")} ₺`
                                    : "—"}
                                </span>
                                {p.isAvailable ? (
                                  <button type="button" className="lh-product-add" onClick={() => addToCart(p)} aria-label="Sepete ekle">+</button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ListingHubSectionCard>

            <ListingHubSectionCard id="lh-galeri" title="Galeri">
              {photos.length === 0 ? (
                <div className="py-10 text-center text-slate-500">Henüz fotoğraf yok</div>
              ) : (
                <div className="lh-gallery-grid">
                  {photos.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`${biz.name} ${i + 1}`}
                      onClick={() => setPhotoIdx(i)}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ))}
                </div>
              )}
            </ListingHubSectionCard>

          </div>

          <ListingHubSidebarCard
            name={biz.name}
            avatarUrl={logoHero}
            phone={biz.phone}
            email={biz.email}
            website={biz.website}
            address={biz.address}
            hours={hoursRows}
            openNow={openStatus?.ok ?? null}
            onReserve={biz.hasReservation ? () => document.getElementById("lh-iletisim-form")?.scrollIntoView({ behavior: "smooth" }) : undefined}
            onWhatsApp={waLink ? () => setShowWaPopover(true) : undefined}
          >
            {biz.isPremium && qrUrl ? (
              <div className="lh-sidebar-card p-4 text-center">
                <p className="text-sm font-bold mb-2">Premium QR</p>
                <img src={qrUrl} alt="QR" className="mx-auto h-24 w-24 rounded-lg" />
              </div>
            ) : !biz.isPremium ? (
              <div className="lh-sidebar-card p-4">
                <p className="text-sm font-bold text-slate-800 mb-2">İşletme sahibi misiniz?</p>
                <Link href="/is-ortagi/basvuru" className="lh-reserve-btn inline-block text-center no-underline">
                  İşletme üyeliği başvurusu
                </Link>
              </div>
            ) : null}
          </ListingHubSidebarCard>

        </div>
      </div>

      {products.length > 0 ? (
        <button type="button" className="lh-cart-fab" onClick={() => setCartOpen(true)} aria-label="Sepet">
          <ShoppingBag className="mx-auto h-5 w-5" />
          {cartItems.length > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-[#c71f37]">
              {cartItems.length}
            </span>
          ) : null}
        </button>
      ) : null}
      <ListingHubCartDrawer
        open={cartOpen}
        items={cartItems}
        onClose={() => setCartOpen(false)}
        onRemove={(id) => setCartItems((prev) => prev.filter((x) => x.id !== id))}
      />

      {/* WhatsApp önizleme */}
      {showWaPopover && waLink && (
        <div
          className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-4 bg-black/50"
          onClick={() => setShowWaPopover(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="WhatsApp"
          >
            <p className="font-bold text-gray-900 mb-1">WhatsApp</p>
            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              Hazır mesaj işletme sayfanızın bağlantısını içerir. İsterseniz metni WhatsApp&apos;ta düzenleyebilirsiniz.
            </p>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center py-3 rounded-xl bg-[#25D366] text-white font-bold text-sm hover:opacity-95 transition mb-2"
            >
              WhatsApp&apos;ta aç
            </a>
            <button type="button" onClick={() => setShowWaPopover(false)} className="w-full py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* ── Share Modal ── */}
      {showShareModal && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center" onClick={closeShare}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 bg-white rounded-3xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}>
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            {/* Header */}
            <div className="px-5 pt-2 pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-base">{biz.name}</h3>
              <p className="text-xs text-gray-400 mt-0.5">Paylaşma seçenekleri</p>
            </div>
            {/* Options */}
            <div className="px-4 py-3 space-y-1">
              {/* İşletmeyi Paylaş — native share */}
              <button onClick={nativeShare}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white transition text-left">
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span className="font-semibold text-sm">İşletmeyi Paylaş</span>
              </button>
              {/* Bağlantıyı Kopyala */}
              <button onClick={copyShareLink}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-gray-50 transition text-left border border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-800">{shareLinkCopied ? "✓ Kopyalandı!" : "Bağlantıyı Kopyala"}</p>
                  <p className="text-xs text-gray-400 truncate">{pageUrl}</p>
                </div>
              </button>
              {/* Telefona Gönder — SMS */}
              <a href={`sms:?body=${encodeURIComponent(`${biz.name}: ${pageUrl}`)}`}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-gray-50 transition text-left border border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-sm text-gray-800">Telefona Gönder</p>
                  <p className="text-xs text-gray-400">SMS ile bağlantı gönder</p>
                </div>
              </a>
              {/* WhatsApp ile Paylaş */}
              {waLink && (
                <a href={`https://wa.me/?text=${encodeURIComponent(`${biz.name}: ${pageUrl}`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-gray-50 transition text-left border border-gray-100">
                  <div className="w-9 h-9 rounded-xl bg-[#25D366]/10 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-800">WhatsApp ile Paylaş</p>
                    <p className="text-xs text-gray-400">Bağlantıyı arkadaşına gönder</p>
                  </div>
                </a>
              )}
              {/* İşletme Linki */}
              <div className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-gray-100 bg-gray-50">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-800">İşletme Linki</p>
                  <p className="text-xs text-gray-400 truncate">{pageUrl}</p>
                </div>
              </div>
              {/* Harita Yerleştirme Kodu */}
              <button onClick={copyEmbed}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl hover:bg-gray-50 transition text-left border border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-sm text-gray-800">{shareEmbedCopied ? "✓ Kopyalandı!" : "Harita Yerleştirme Kodu"}</p>
                  <p className="text-xs text-gray-400">iframe kodu panoya kopyala</p>
                </div>
              </button>
            </div>
            {/* Close button */}
            <div className="px-4 pb-5 pt-1">
              <button onClick={closeShare}
                className="w-full py-3 rounded-2xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition">
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HeroAction({ href, onClick, icon, label, ext }: { href?: string; onClick?: () => void; icon: string; label: string; ext?: boolean }) {
  const cls = "flex flex-col items-center gap-1 py-3 rounded-2xl text-white text-xs font-semibold transition " + (href || onClick ? "bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur cursor-pointer" : "bg-white/5 border border-white/10 opacity-40 cursor-not-allowed");
  if (href) return <a href={href} target={ext ? "_blank" : undefined} rel="noopener noreferrer" className={cls}><span className="text-xl">{icon}</span>{label}</a>;
  return <button onClick={onClick} className={cls} disabled={!onClick}><span className="text-xl">{icon}</span>{label}</button>;
}

function InfoTile({ icon, label, value, href }: { icon: string; label: string; value: string; href?: string }) {
  return (
    <div className="flex items-start gap-2.5 p-3 bg-gray-50 rounded-xl">
      <span className="text-base shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        {href ? <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline truncate block">{value}</a>
          : <p className="text-sm text-gray-700">{value}</p>}
      </div>
    </div>
  );
}

function SocialBtn({ href, icon, label, color }: { href: string; icon: string; label: string; color: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-semibold bg-gradient-to-r ${color} hover:opacity-90 transition shadow-sm`}>
      {icon} {label}
    </a>
  );
}

function AboutRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-base w-6 shrink-0">{icon}</span>
      <div><p className="text-xs text-gray-400">{label}</p><p className="text-sm text-gray-700 font-medium">{value}</p></div>
    </div>
  );
}

function ContactRow({ icon, text, href }: { icon: string; text: string; href?: string }) {
  const cls = "flex items-center gap-2.5 text-sm text-gray-700 min-w-0";
  const inner = <><span className="shrink-0">{icon}</span><span className="truncate">{text}</span></>;
  if (href) return <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className={`${cls} hover:text-indigo-600 transition`}>{inner}</a>;
  return <div className={cls}>{inner}</div>;
}
