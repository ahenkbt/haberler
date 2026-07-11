import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useParams, useLocation } from "wouter";
import { Star, Clock, MapPin, Tag, ShoppingCart, Plus, Minus, X, Flame, Leaf, ChevronLeft, Phone, CheckCircle, AlertCircle, Map, UtensilsCrossed, Truck, CalendarDays, MessageCircle } from "lucide-react";
import { TrCheckoutPanel, type TrCheckoutPayload } from "@/components/TrCheckoutPanel";
import { OrderTrackSearch } from "@/components/OrderTrackSearch";
import { deliveryTrackingQuery } from "@/lib/deliveryTracking";
import { VendorAnnouncementsSection } from "@/components/VendorAnnouncementsSection";
import { VendorBlogPreviewSection, type VendorBlogPostRow } from "@/components/VendorBlogPreviewSection";
import { cleanAboutForPublic } from "@/lib/publicAboutText";
import { applySocialShareMeta, resetSeoToSiteDefaults, seoPlainSnippet, applyVendorStructuredData } from "@/lib/pageSeo";
import { formatVendorWorkingHours } from "@/lib/formatVendorWorkingHours";
import { APP_MOBILE_BOTTOM_NAV_HEIGHT } from "@/components/AppNav";
import { VendorThemeShell } from "@/components/VendorThemeShell";
import { isVendorStandaloneHost } from "@/lib/vendorThemes";
import { StoreCategoryAccordion, type StoreCategoryNode } from "@/components/StoreCategoryAccordion";

const API = "/api";

/** Mobil alt menü (z-9002) üstünde sepet / sipariş adımları */
const MOBILE_ORDER_OVERLAY_Z = "z-[9100]";
const MOBILE_SHEET_BOTTOM_PAD = `calc(${APP_MOBILE_BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 12px))`;

interface ServiceSettings {
  tableServiceEnabled: boolean;
  reservationEnabled: boolean;
  reservationAutoConfirm: boolean;
  tableSections: TableSection[];
}
interface TableSection { id: string; name: string; type: "masa" | "oda" | "lobi" | "diger"; }
interface Vendor {
  id: number; name: string; slug: string; description: string;
  aboutHtml?: string | null;
  imageUrl: string; coverUrl: string; city: string; district: string;
  address: string; phone: string; workingHours: string;
  deliveryFee: string; minOrderAmount: string; deliveryTime: number;
  rating: number; reviewCount: number; isOpen: boolean;
  revenueModel?: string;
  commissionRatePct?: string | number | null;
  subscriptionTrOnlinePay?: boolean;
  trPaytrConfigured?: boolean;
  trIyzicoConfigured?: boolean;
  trPreferredGateway?: string | null;
  notes?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  themeKey?: string;
  themeConfig?: Record<string, string>;
  navMenuEnabled?: boolean;
  navMenuItems?: Array<{ id: string; label: string; href: string; enabled?: boolean }>;
  stripMenuEnabled?: boolean;
  stripMenuItems?: Array<{ id: string; label: string; href: string; enabled?: boolean }>;
  vendorType?: string;
  providerType?: string;
  providerSubtype?: string;
}
interface MenuCategory { id: number; name: string; position: number; }
interface MenuItem {
  id: number; name: string; description: string; price: string;
  salePrice?: string; imageUrl?: string; isVegan: boolean;
  isSpicy: boolean; isPopular: boolean; menuCategoryId?: number;
}
interface Review { id: number; customerName: string; rating: number; comment?: string; createdAt: string; }
interface CartItem extends MenuItem { qty: number; }

function noteField(notes: string | null | undefined, key: string): string {
  const text = String(notes ?? "");
  const re = new RegExp(`(?:^|\\n)${key}\\s*:\\s*(.*)$`, "im");
  const m = text.match(re);
  return m?.[1]?.trim() ?? "";
}

function parseCoord(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/* Teslimat yarıçapı (km) — işletme konumuna bu mesafeden uzak adreslere sipariş kapalı */
const DELIVERY_RADIUS_KM = 10;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

type OrderType = "delivery" | "table" | "pickup";
type OrderStep = "cart" | "type-select" | "address" | "table-info" | "pickup-info" | "tr-pay" | "confirmed";
type PayReturnNotice = "paid" | "pending" | "failed" | null;

const SECTION_TYPE_LABELS: Record<string, string> = {
  masa: "🪑 Masa", oda: "🚪 Oda", lobi: "🛋️ Lobi", diger: "📍 Diğer",
};

const TABLE_SERVICE_SUBTYPES = new Set(["", "restoran", "restaurant", "cafe", "kafe", "restoran-kafe", "restoran_cafe"]);

function canUseTableServiceForVendor(vendor: Vendor | null): boolean {
  const type = String(vendor?.providerType || vendor?.vendorType || "").toLowerCase();
  const subtype = String(vendor?.providerSubtype || "").toLocaleLowerCase("tr-TR").replace(/\s+/g, "_");
  return ["siparis", "delivery"].includes(type) && TABLE_SERVICE_SUBTYPES.has(subtype);
}

export default function SaticiDetay({ slugOverride }: { slugOverride?: string }) {
  const params = useParams<{ slug: string }>();
  const slug = slugOverride || params.slug || "";
  const [location, navigate] = useLocation();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [menuCats, setMenuCats] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [serviceSettings, setServiceSettings] = useState<ServiceSettings>({ tableServiceEnabled: false, reservationEnabled: false, reservationAutoConfirm: false, tableSections: [] });
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [activeCat, setActiveCat] = useState<number | null>(null);
  const [expandedMenuCategories, setExpandedMenuCategories] = useState<Set<number>>(() => new Set());
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("delivery");
  const [step, setStep] = useState<OrderStep>("cart");
  const [orderForm, setOrderForm] = useState({ name: "", phone: "", email: "", address: "", city: "", district: "", notes: "", paymentMethod: "cash" });
  const [tableForm, setTableForm] = useState({ name: "", phone: "", sectionId: "", notes: "" });
  const [pickupForm, setPickupForm] = useState({ name: "", phone: "", notes: "" });
  const [orderNumber, setOrderNumber] = useState("");
  const [orderTrackingToken, setOrderTrackingToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [trCheckout, setTrCheckout] = useState<TrCheckoutPayload | null>(null);
  const [payReturnNotice, setPayReturnNotice] = useState<PayReturnNotice>(null);
  const [payFlowError, setPayFlowError] = useState<string | null>(null);
  /* GPS — teslimat yarıçapı denetimi */
  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "asking" | "ok" | "unavailable">("idle");
  const [orderError, setOrderError] = useState<string | null>(null);
  const [mapBusinessId, setMapBusinessId] = useState<string | null>(null);
  const [blogEnabled, setBlogEnabled] = useState(false);
  const [blogPreviewPosts, setBlogPreviewPosts] = useState<VendorBlogPostRow[]>([]);
  const [blogPreviewLoading, setBlogPreviewLoading] = useState(false);
  const [vendorAnnouncements, setVendorAnnouncements] = useState<Array<{ id: number; title: string; body: string; published_at?: string | null }>>([]);
  const [contentTab, setContentTab] = useState<"overview" | "menu">("menu");
  const [waPopoverOpen, setWaPopoverOpen] = useState(false);
  /* Rezervasyon */
  const [showReservation, setShowReservation] = useState(false);
  const [resForm, setResForm] = useState({ name: "", phone: "", date: "", time: "", partySize: "2", sectionId: "", note: "" });
  const [resSubmitting, setResSubmitting] = useState(false);
  const [resConfirmed, setResConfirmed] = useState<{ autoConfirm: boolean } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const overviewMapRef = useRef<HTMLDivElement>(null);
  const deepLinkAppliedRef = useRef(false);

  useEffect(() => {
    const path = location.split("?")[0] ?? "";
    if (path.endsWith("/hakkimizda") || path.endsWith("/iletisim")) setContentTab("overview");
    if (path.endsWith("/menu")) setContentTab("menu");
  }, [location]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const ord = q.get("order");
    const pay = q.get("pay");
    const tok = q.get("t") || q.get("token") || "";
    if (!ord || pay === null) return;
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch(`${API}/delivery/orders/${encodeURIComponent(ord)}${deliveryTrackingQuery(tok)}`);
        const d = await r.json().catch(() => ({}));
        if (cancelled) return;
        setOrderNumber(ord);
        if (tok) setOrderTrackingToken(tok);
        else if (d.trackingToken) setOrderTrackingToken(String(d.trackingToken));
        setStep("confirmed");
        setTrCheckout(null);
        setCart([]);
        if (pay === "1") setPayReturnNotice((d.paymentStatus ?? d.payment_status) === "paid" ? "paid" : "pending");
        else setPayReturnNotice("failed");
      } catch {
        if (!cancelled) {
          setOrderNumber(ord);
          setStep("confirmed");
          setPayReturnNotice(pay === "1" ? "pending" : "failed");
        }
      } finally {
        if (!cancelled) {
          window.history.replaceState({}, "", window.location.pathname + window.location.hash);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (vendor && vendor.subscriptionTrOnlinePay !== true && orderForm.paymentMethod === "online") {
      setOrderForm((f) => ({ ...f, paymentMethod: "cash" }));
    }
  }, [vendor?.id, vendor?.subscriptionTrOnlinePay, orderForm.paymentMethod]);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/delivery/vendors/${encodeURIComponent(slug)}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        setVendor(data.vendor);
        setMenuCats(data.menuCats ?? []);
        setMenuItems(data.menuItems ?? []);
        setReviews(data.reviews ?? []);
        setMapBusinessId(data.mapBusinessId ?? null);
        if (data.serviceSettings) setServiceSettings(data.serviceSettings);
        if (data.menuCats?.[0]) setActiveCat(data.menuCats[0].id);
      })
      .catch(() => navigate("/siparis"))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!vendor || !slug) return;
    const path = `/siparis/satici/${encodeURIComponent(slug)}`;
    const snippet =
      seoPlainSnippet(vendor.description) ||
      seoPlainSnippet(cleanAboutForPublic(String(vendor.aboutHtml ?? ""))) ||
      "Online menü, paket servis ve sipariş.";
    const loc = [vendor.district, vendor.city].filter(Boolean).join(", ");
    const primary = [vendor.name + ":", snippet, loc ? `Konum: ${loc}.` : null, "Restoran ve sipariş sayfası."].filter(Boolean).join(" ");
    applySocialShareMeta({
      title: `${vendor.name} — Sipariş ve menü`,
      descriptionPrimary: primary,
      canonicalPath: path,
      imageUrl: vendor.coverUrl || vendor.imageUrl,
    });
    applyVendorStructuredData({
      name: vendor.name,
      description: vendor.description,
      canonicalPath: path,
      imageUrl: vendor.coverUrl || vendor.imageUrl,
      phone: vendor.phone,
      address: vendor.address,
      city: vendor.city,
      district: vendor.district,
      lat: parseCoord(vendor.lat),
      lng: parseCoord(vendor.lng),
      rating: vendor.rating,
      reviewCount: vendor.reviewCount,
      isShop: false,
      breadcrumbs: [
        { name: "Ana sayfa", path: "/" },
        { name: "Sipariş", path: "/siparis" },
        { name: vendor.name, path },
      ],
    });
    return () => resetSeoToSiteDefaults();
  }, [vendor, slug]);

  useEffect(() => {
    if (!slug) return;
    let c = false;
    fetch(`${API}/delivery/vendors/${encodeURIComponent(slug)}/blog-meta`)
      .then((r) => r.json())
      .then((m) => {
        if (!c) setBlogEnabled(Boolean(m.enabled));
      })
      .catch(() => {
        if (!c) setBlogEnabled(false);
      });
    return () => {
      c = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!slug) {
      setBlogPreviewPosts([]);
      return;
    }
    let cancelled = false;
    setBlogPreviewLoading(true);
    fetch(`${API}/delivery/vendors/${encodeURIComponent(slug)}/blog/posts`)
      .then((r) => (r.ok ? r.json() : { posts: [] }))
      .then((d) => {
        if (cancelled) return;
        setBlogPreviewPosts(Array.isArray(d.posts) ? d.posts : []);
      })
      .catch(() => {
        if (!cancelled) setBlogPreviewPosts([]);
      })
      .finally(() => {
        if (!cancelled) setBlogPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!slug) {
      setVendorAnnouncements([]);
      return;
    }
    let cancelled = false;
    fetch(`${API}/delivery/vendors/${encodeURIComponent(slug)}/announcements`)
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
  }, [slug]);

  useEffect(() => {
    deepLinkAppliedRef.current = false;
  }, [slug]);

  const addToCart = useCallback((item: MenuItem) => {
    setCart((prev) => {
      const ex = prev.find((c) => c.id === item.id);
      if (ex) return prev.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
      return [...prev, { ...item, qty: 1 }];
    });
  }, []);
  const removeFromCart = (id: number) => setCart(prev => prev.map(c => c.id === id ? { ...c, qty: c.qty - 1 } : c).filter(c => c.qty > 0));
  const qtyInCart = (id: number) => cart.find(c => c.id === id)?.qty ?? 0;

  useEffect(() => {
    if (!vendor || deepLinkAppliedRef.current) return;
    const q = new URLSearchParams(window.location.search);
    const t = q.get("teslimat");
    const uid = q.get("urun");
    const masaId = q.get("masa")?.trim() || "";
    if (!t && !uid && !masaId) return;
    deepLinkAppliedRef.current = true;
    if (t === "adrese") setOrderType("delivery");
    else if (t === "gelal") setOrderType("pickup");
    else if ((t === "masa" || masaId) && canUseTableServiceForVendor(vendor) && serviceSettings.tableServiceEnabled) {
      setOrderType("table");
      if (masaId) setTableForm((f) => ({ ...f, sectionId: masaId }));
    } else if (uid) setOrderType("delivery");
    setContentTab("menu");
    const idNum = uid ? parseInt(uid, 10) : NaN;
    if (Number.isFinite(idNum) && menuItems.length > 0) {
      const item = menuItems.find((m) => m.id === idNum);
      if (item && vendor.isOpen) addToCart(item);
    }
    if (t || uid) {
      setShowCart(true);
      window.history.replaceState({}, "", window.location.pathname + (window.location.hash || ""));
    }
  }, [vendor, serviceSettings.tableServiceEnabled, menuItems, addToCart]);

  useEffect(() => {
    if (contentTab !== "overview" || !vendor) return;
    const lat = parseCoord(vendor.lat);
    const lng = parseCoord(vendor.lng);
    if (lat == null || lng == null || !overviewMapRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L;
    if (!L) return;
    const el = overviewMapRef.current;
    const map = L.map(el, { zoomControl: true, scrollWheelZoom: false }).setView([lat, lng], 16);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);
    L.marker([lat, lng]).addTo(map).bindPopup(vendor.name).openPopup();
    return () => {
      try {
        map.remove();
      } catch {
        /* noop */
      }
    };
  }, [contentTab, vendor?.id, vendor?.lat, vendor?.lng, vendor?.name]);

  const subtotal = cart.reduce((s, c) => s + parseFloat(c.salePrice ?? c.price) * c.qty, 0);
  const deliveryFee = orderType === "delivery" && vendor ? parseFloat(vendor.deliveryFee ?? "0") : 0;
  const total = subtotal + deliveryFee - couponDiscount;
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  const commissionPreviewBase = Math.max(0, subtotal - couponDiscount);
  const crPct =
    vendor?.revenueModel === "commission" && vendor?.commissionRatePct != null && String(vendor.commissionRatePct).trim() !== ""
      ? parseFloat(String(vendor.commissionRatePct).replace(",", "."))
      : NaN;
  const platformCommissionPreview =
    Number.isFinite(crPct) && crPct > 0 ? Math.round(commissionPreviewBase * (crPct / 100) * 100) / 100 : null;
  const commissionPctLabel = Number.isFinite(crPct) && crPct > 0 ? `${crPct}%` : undefined;

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError("");
    const res = await fetch(`${API}/delivery/coupons/validate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: couponCode, vendorId: vendor?.id, orderAmount: subtotal }) });
    const data = await res.json();
    if (!res.ok) { setCouponError(data.error); setCouponDiscount(0); return; }
    setCouponDiscount(data.discount);
  };

  const handleCheckout = () => {
    if (cartCount <= 0) return;
    setStep("type-select");
    setShowCart(false);
  };

  /* Tarayıcı konumunu iste; reddedilirse veya desteklenmezse null döner (sipariş engellenmez). */
  const requestCustomerLocation = useCallback((): Promise<{ lat: number; lng: number } | null> => {
    if (customerCoords) return Promise.resolve(customerCoords);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("unavailable");
      return Promise.resolve(null);
    }
    setGeoStatus("asking");
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCustomerCoords(coords);
          setGeoStatus("ok");
          resolve(coords);
        },
        () => {
          setGeoStatus("unavailable");
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 120000 },
      );
    });
  }, [customerCoords]);

  const vendorLat = parseCoord(vendor?.lat);
  const vendorLng = parseCoord(vendor?.lng);
  const deliveryDistanceKm = useMemo(() => {
    if (!customerCoords || vendorLat == null || vendorLng == null) return null;
    return haversineKm(customerCoords.lat, customerCoords.lng, vendorLat, vendorLng);
  }, [customerCoords, vendorLat, vendorLng]);
  const deliveryTooFar = deliveryDistanceKm != null && deliveryDistanceKm > DELIVERY_RADIUS_KM;

  const selectOrderType = (type: OrderType) => {
    if (cartCount <= 0) return;
    if (type === "table" && (!canUseTableServiceForVendor(vendor) || !serviceSettings.tableServiceEnabled)) return;
    setOrderType(type);
    setOrderError(null);
    if (type === "table") setStep("table-info");
    else if (type === "pickup") setStep("pickup-info");
    else {
      setStep("address");
      void requestCustomerLocation();
    }
  };

  const submitDeliveryOrder = async () => {
    if (!vendor) return;
    if (cartCount <= 0) return;
    if (!orderForm.name || !orderForm.phone || !orderForm.address) return;
    setSubmitting(true);
    setPayReturnNotice(null);
    setPayFlowError(null);
    setOrderError(null);
    const coords = customerCoords ?? (await requestCustomerLocation());
    if (coords && vendorLat != null && vendorLng != null) {
      const distKm = haversineKm(coords.lat, coords.lng, vendorLat, vendorLng);
      if (distKm > DELIVERY_RADIUS_KM) {
        setOrderError(
          `Bu işletme konumunuza teslimat yapamıyor (${DELIVERY_RADIUS_KM} km dışı). İşletmeye uzaklığınız yaklaşık ${distKm.toFixed(1)} km.`,
        );
        setSubmitting(false);
        return;
      }
    }
    const res = await fetch(`${API}/delivery/orders`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendorId: vendor.id,
        customerName: orderForm.name,
        customerPhone: orderForm.phone,
        customerEmail: orderForm.email?.trim() || undefined,
        customerAddress: orderForm.address,
        customerCity: orderForm.city || vendor.city,
        customerDistrict: orderForm.district,
        customerLat: coords ? coords.lat : undefined,
        customerLng: coords ? coords.lng : undefined,
        items: cart.map(c => ({ id: c.id, name: c.name, price: parseFloat(c.salePrice ?? c.price), qty: c.qty })),
        subtotal: subtotal.toFixed(2),
        deliveryFee: deliveryFee.toFixed(2),
        discount: couponDiscount.toFixed(2),
        total: total.toFixed(2),
        couponCode: couponCode || null,
        paymentMethod: orderForm.paymentMethod,
        notes: orderForm.notes,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setOrderError(typeof data?.error === "string" && data.error ? data.error : "Sipariş oluşturulamadı. Lütfen tekrar deneyin.");
    }
    if (res.ok) {
      setOrderNumber(data.orderNumber);
      if (data.trackingToken) setOrderTrackingToken(String(data.trackingToken));
      setCart([]);
      const tr = data.trCheckout as TrCheckoutPayload | undefined;
      if (tr?.gateway === "paytr" && "iframeToken" in tr && tr.iframeToken) {
        setTrCheckout(tr);
        setStep("tr-pay");
      } else if (tr?.gateway === "iyzico" && "checkoutFormContent" in tr && tr.checkoutFormContent) {
        setTrCheckout(tr);
        setStep("tr-pay");
      } else if (tr?.gateway === "stripe" && "clientSecret" in tr && tr.clientSecret && tr.publishableKey) {
        setTrCheckout(tr);
        setStep("tr-pay");
      } else if (tr && "error" in tr && typeof (tr as { error?: string }).error === "string") {
        setTrCheckout(null);
        setPayFlowError((tr as { error: string }).error);
        setStep("confirmed");
      } else {
        setTrCheckout(null);
        setStep("confirmed");
      }
    }
    setSubmitting(false);
  };

  const submitTableOrder = async () => {
    if (!vendor) return;
    if (cartCount <= 0 || !canUseTableServiceForVendor(vendor) || !serviceSettings.tableServiceEnabled) return;
    if (!tableForm.name || !tableForm.phone) return;
    setSubmitting(true);
    const section = serviceSettings.tableSections.find(s => s.id === tableForm.sectionId);
    const sectionLabel = section ? `${SECTION_TYPE_LABELS[section.type] || section.type} ${section.name}` : "Masaya Servis";
    const res = await fetch(`${API}/delivery/orders`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorId: vendor.id, customerName: tableForm.name, customerPhone: tableForm.phone, customerAddress: sectionLabel, customerCity: vendor.city, customerDistrict: vendor.district, items: cart.map(c => ({ id: c.id, name: c.name, price: parseFloat(c.salePrice ?? c.price), qty: c.qty })), subtotal: subtotal.toFixed(2), deliveryFee: "0", discount: "0", total: subtotal.toFixed(2), paymentMethod: "cash", notes: tableForm.notes, orderSource: "table", tableNumber: sectionLabel }),
    });
    const data = await res.json();
    if (res.ok) {
      setOrderNumber(data.orderNumber);
      if (data.trackingToken) setOrderTrackingToken(String(data.trackingToken));
      setStep("confirmed");
      setCart([]);
    }
    setSubmitting(false);
  };

  const submitPickupOrder = async () => {
    if (!vendor) return;
    if (cartCount <= 0) return;
    if (!pickupForm.name || !pickupForm.phone) return;
    setSubmitting(true);
    const res = await fetch(`${API}/delivery/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendorId: vendor.id,
        customerName: pickupForm.name,
        customerPhone: pickupForm.phone,
        customerAddress: `Gel Al — ${vendor.name}`,
        customerCity: vendor.city,
        customerDistrict: vendor.district,
        items: cart.map((c) => ({ id: c.id, name: c.name, price: parseFloat(c.salePrice ?? c.price), qty: c.qty })),
        subtotal: subtotal.toFixed(2),
        deliveryFee: "0",
        discount: couponDiscount.toFixed(2),
        total: (subtotal - couponDiscount).toFixed(2),
        couponCode: couponCode || null,
        paymentMethod: "cash",
        notes: pickupForm.notes,
        orderSource: "pickup",
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setOrderNumber(data.orderNumber);
      if (data.trackingToken) setOrderTrackingToken(String(data.trackingToken));
      setStep("confirmed");
      setCart([]);
    }
    setSubmitting(false);
  };

  const submitReservation = async () => {
    if (!vendor) return;
    if (!resForm.name || !resForm.phone || !resForm.date || !resForm.time) return;
    setResSubmitting(true);
    const section = serviceSettings.tableSections.find(s => s.id === resForm.sectionId);
    const res = await fetch(`${API}/delivery/reservations`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorId: vendor.id, guestName: resForm.name, guestPhone: resForm.phone, reservationDate: resForm.date, reservationTime: resForm.time, partySize: parseInt(resForm.partySize) || 2, sectionId: resForm.sectionId || null, sectionName: section?.name || null, note: resForm.note }),
    });
    if (res.ok) { const data = await res.json(); setResConfirmed({ autoConfirm: data.status === "confirmed" }); }
    setResSubmitting(false);
  };

  if (loading) return (<div className="min-h-screen flex items-center justify-center"><div className="text-center text-gray-400"><div className="w-12 h-12 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" /><p>Mağaza yükleniyor...</p></div></div>);
  if (!vendor) return null;

  const minOrder = parseFloat(vendor.minOrderAmount ?? "0");
  const aboutFromHtml = cleanAboutForPublic(String(vendor.aboutHtml ?? "").trim());
  const aboutFromDesc = cleanAboutForPublic(String(vendor.description ?? "").trim());
  const aboutText = aboutFromHtml || aboutFromDesc;
  const waEnabled = noteField(vendor.notes, "whatsapp_enabled") !== "0";
  const waCustomerContact = noteField(vendor.notes, "whatsapp_feature_customer_contact") !== "0";
  const blogBasePath = slug ? `/siparis/satici/${encodeURIComponent(slug)}` : "";
  const fiveStarReviews = reviews.filter((r) => r.rating === 5).slice(0, 5);
  const overviewGallery = [...new Set(menuItems.map((m) => m.imageUrl).filter(Boolean))].slice(0, 6) as string[];
  const tableServiceAllowed = canUseTableServiceForVendor(vendor);
  const publicServiceSettings: ServiceSettings = {
    ...serviceSettings,
    tableServiceEnabled: tableServiceAllowed && serviceSettings.tableServiceEnabled,
    tableSections: tableServiceAllowed ? serviceSettings.tableSections : [],
  };
  const waDigits = vendor?.phone ? vendor.phone.replace(/\D/g, "").replace(/^0/, "90") : "";
  const accessibilityPublic =
    cleanAboutForPublic(noteField(vendor.notes, "public_accessibility")) ||
    cleanAboutForPublic(noteField(vendor.notes, "erisilebilirlik"));
  const overviewLat = parseCoord(vendor.lat);
  const overviewLng = parseCoord(vendor.lng);
  const overviewHasMapCoords = overviewLat != null && overviewLng != null;
  const menuCategoryTree: StoreCategoryNode[] = menuCats.map((cat) => ({
    id: cat.id,
    name: cat.name,
    children: [],
  }));
  const directionsHref =
    mapBusinessId != null
      ? null
      : overviewHasMapCoords
        ? `https://www.google.com/maps/dir/?api=1&destination=${overviewLat},${overviewLng}`
        : null;
  const activeColor = "bg-[#0f766e] text-white";
  const inactiveColor = "bg-white text-slate-600 border border-slate-200 hover:border-emerald-200";
  const accentText = "text-[#0f766e]";
  const accentHoverText = "hover:text-[#0b5f59]";

  return (
    <VendorThemeShell
      themeKey={vendor.themeKey ?? "foodmart"}
      themeConfig={vendor.themeConfig}
      navMenuEnabled={vendor.navMenuEnabled}
      navMenuItems={vendor.navMenuItems}
      stripMenuEnabled={vendor.stripMenuEnabled}
      stripMenuItems={vendor.stripMenuItems}
      vendorName={vendor.name}
      vendorLogo={vendor.imageUrl}
      vendorCover={vendor.coverUrl}
      onHeroCta={() => setContentTab("menu")}
      discoverHref={mapBusinessId ? `/kesfet/isletme/${mapBusinessId}` : "/kesfet"}
    >
    <div className="restaurant-storefront min-h-screen bg-white">
      {/* Info bar */}
      <div className="restaurant-info-bar bg-white border-b px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1 text-sm font-semibold text-amber-500"><Star className="w-4 h-4 fill-amber-400" /> {vendor.rating.toFixed(1)}<span className="text-gray-400 font-normal text-xs">({vendor.reviewCount} değerlendirme)</span></span>
          <span className="flex items-center gap-1 text-sm text-gray-500"><Clock className="w-4 h-4" /> {vendor.deliveryTime} dk teslimat</span>
          <span className="flex items-center gap-1 text-sm text-gray-500"><Tag className="w-4 h-4" /> {parseFloat(vendor.deliveryFee) === 0 ? <span className="text-green-600 font-semibold">Ücretsiz teslimat</span> : `${parseFloat(vendor.deliveryFee).toFixed(0)}₺ teslimat`}</span>
          {minOrder > 0 && <span className="text-xs text-gray-400">Min. {minOrder.toFixed(0)}₺</span>}
          {vendor.phone && <a href={`tel:${vendor.phone}`} className={`flex items-center gap-1 text-sm ${accentText} ${accentHoverText} ml-auto`}><Phone className="w-4 h-4" /> {vendor.phone}</a>}
          {slug && (
            <Link href={`/siparis/satici/${encodeURIComponent(slug)}/blog`} className="flex items-center gap-1 text-sm text-violet-600 hover:text-violet-700 font-semibold ml-2">
              📝 Blog
            </Link>
          )}
          {mapBusinessId && <button onClick={() => navigate(`/kesfet/isletme/${mapBusinessId}`)} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-semibold ml-2"><Map className="w-4 h-4" /> Haritada Gör</button>}
        </div>
        <div className="max-w-4xl mx-auto mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => setContentTab("overview")} className={`px-3 py-1.5 rounded-full text-xs font-bold ${contentTab === "overview" ? activeColor : inactiveColor}`}>Genel Bakış</button>
          <button type="button" onClick={() => setContentTab("menu")} className={`px-3 py-1.5 rounded-full text-xs font-bold ${contentTab === "menu" ? activeColor : inactiveColor}`}>Ürünler</button>
          {vendor.phone && waEnabled && waCustomerContact && (
            <button
              type="button"
              onClick={() => setWaPopoverOpen(true)}
              className="px-3 py-1.5 rounded-full text-xs font-bold bg-green-500 text-white inline-flex items-center gap-1 hover:bg-green-600 transition"
            >
              <MessageCircle className="w-3 h-3" /> WhatsApp&apos;tan yaz
            </button>
          )}
        </div>
        {/* Service badges */}
        {(publicServiceSettings.tableServiceEnabled || serviceSettings.reservationEnabled) && (
          <div className="max-w-4xl mx-auto flex gap-2 mt-2 flex-wrap">
            {publicServiceSettings.tableServiceEnabled && <span className="flex items-center gap-1 text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-2.5 py-0.5"><UtensilsCrossed className="w-3 h-3" /> Masaya Servis</span>}
            {serviceSettings.reservationEnabled && (
              <button onClick={() => { setShowReservation(true); setResConfirmed(null); }} className="flex items-center gap-1 text-xs bg-teal-50 text-teal-700 border border-teal-200 rounded-full px-2.5 py-0.5 hover:bg-teal-100 transition">
                <CalendarDays className="w-3 h-3" /> Rezervasyon Yap
              </button>
            )}
          </div>
        )}
      </div>

      {/* Açılış Aşamasında Banner */}
      {!vendor.isOpen && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
            <div className="bg-amber-100 rounded-full p-2 shrink-0"><AlertCircle className="w-5 h-5 text-amber-600" /></div>
            <div>
              <p className="font-bold text-amber-800 text-sm">Bu mağaza açılış aşamasındadır</p>
              <p className="text-amber-700 text-xs mt-0.5">Şu an sipariş alınmamaktadır. Yakında hizmetinizde olacağız!</p>
            </div>
          </div>
        </div>
      )}

      <div className="restaurant-menu-layout max-w-6xl mx-auto px-4 py-6 flex gap-6 items-start">
        {contentTab === "menu" && menuCategoryTree.length > 0 ? (
          <aside className="restaurant-category-sidebar hidden md:block w-64 shrink-0">
            <StoreCategoryAccordion
              tree={menuCategoryTree}
              activeId={activeCat}
              expandedIds={expandedMenuCategories}
              onSelect={setActiveCat}
              onToggleExpand={(id) => {
                setExpandedMenuCategories((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                });
              }}
              className="restaurant-sarab-categories"
            />
          </aside>
        ) : null}
        {/* Left: menu */}
        <div className="flex-1 min-w-0">
          {contentTab === "overview" && (
            <div className="space-y-5">
              <div id="hakkimizda" className="bg-white rounded-xl border p-4">
                <h3 className="font-black text-sm mb-2">Hakkımızda</h3>
                {aboutText ? (
                  <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{aboutText}</p>
                ) : (
                  <p className="text-sm text-gray-500">Henüz mağaza tanıtım metni eklenmemiş.</p>
                )}
              </div>
              {accessibilityPublic ? (
                <div className="bg-white rounded-xl border border-teal-100 p-4">
                  <h3 className="font-black text-sm mb-2 text-teal-900">Erişilebilirlik</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{accessibilityPublic}</p>
                </div>
              ) : null}
              <VendorAnnouncementsSection items={vendorAnnouncements} />
              {blogBasePath && (
                <div className="bg-white rounded-xl border p-4 space-y-3">
                  <h3 className="font-black text-sm text-gray-900">Blog</h3>
                  <p className="text-xs text-gray-600 leading-snug">
                    Tüm yazılar için blog sayfasına gidin; burada son yayınlar özetlenir.
                  </p>
                  <Link
                    href={`${blogBasePath}/blog`}
                    className="inline-flex rounded-full bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700 transition"
                  >
                    Blog&apos;a git
                  </Link>
                  {blogPreviewLoading ? (
                    <p className="text-xs text-gray-500">Yükleniyor…</p>
                  ) : blogPreviewPosts.length > 0 ? (
                    <div className="space-y-2 pt-1">
                      <h4 className="text-[11px] font-black uppercase tracking-wide text-violet-800">Son eklenen yazılar</h4>
                      <VendorBlogPreviewSection posts={blogPreviewPosts} postHrefPrefix={blogBasePath} />
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {blogEnabled
                        ? "Henüz listelenecek yayınlanmış yazı yok."
                        : "Blog vitrinde kapalı olabilir veya henüz yazı yok; tam liste ve gelecek yazılar için yukarıdaki bağlantıyı kullanın."}
                    </p>
                  )}
                </div>
              )}
              {vendor.phone && waEnabled && waCustomerContact ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="font-black text-sm text-emerald-950">WhatsApp&apos;tan yaz</h3>
                    <p className="text-xs text-emerald-900/80 mt-1">Hızlı soru veya sipariş öncesi bilgi için sohbeti buradan açın.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWaPopoverOpen(true)}
                    className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#20bd5a] transition"
                  >
                    <MessageCircle className="w-4 h-4" /> Sohbeti aç
                  </button>
                </div>
              ) : null}
              <div className="bg-white rounded-xl border p-4 space-y-2">
                <h3 className="font-black text-sm mb-1">İletişim</h3>
                {vendor.phone ? <a href={`tel:${vendor.phone}`} className="block text-sm text-indigo-600 hover:underline">{vendor.phone}</a> : null}
                {vendor.address ? <p className="text-sm text-gray-600">{vendor.address}</p> : null}
                {vendor.workingHours ? (
                  <p className="text-sm text-gray-600 whitespace-pre-line">
                    <span className="font-semibold text-gray-800">Çalışma saatleri: </span>
                    {formatVendorWorkingHours(vendor.workingHours)}
                  </p>
                ) : null}
              </div>
              {fiveStarReviews.length > 0 && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-black text-sm text-amber-950">⭐ 5 yıldızlı yorumlar</h3>
                    {reviews.length > fiveStarReviews.length ? (
                      <span className="text-[10px] font-semibold text-amber-800">Öne çıkan 5</span>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    {fiveStarReviews.map((r) => (
                      <div key={r.id} className="bg-white rounded-xl border border-amber-100/80 p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-xs text-gray-800">{r.customerName}</span>
                          <div className="flex gap-px">{[1, 2, 3, 4, 5].map((i) => <Star key={`${r.id}-s${i}`} className="w-3 h-3 fill-amber-400 text-amber-400" />)}</div>
                        </div>
                        {r.comment ? <p className="text-xs text-gray-600 line-clamp-3">{r.comment}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {overviewGallery.length > 0 && (
                <div>
                  <h3 className="font-black text-sm mb-2">Son görseller</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 rounded-xl overflow-hidden border border-gray-100">
                    {overviewGallery.map((url, i) => (
                      <div key={i} className="aspect-square bg-gray-100">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                <h3 className="font-black text-sm text-gray-900 mb-2">Sipariş takibi</h3>
                <OrderTrackSearch compact />
              </div>
              {mapBusinessId ? (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
                  <p className="text-xs font-semibold text-indigo-900 mb-2">Keşfet&apos;te daha fazlası</p>
                  <p className="text-xs text-indigo-800/90 mb-3 leading-relaxed">
                    Yorumlar, fotoğraflar ve harita üzerinden yol tarifi için işletmenin Keşfet profiline geçin.
                  </p>
                  <Link
                    href={`/kesfet/isletme/${mapBusinessId}`}
                    className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                  >
                    Keşfet profiline git →
                  </Link>
                </div>
              ) : null}
              <div className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
                <h3 className="font-black text-sm text-gray-900 mb-2">Mesaj gönder</h3>
                <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                  İşletmeye iletmek istediğiniz not için site iletişim formunu kullanın.
                </p>
                <a
                  href={`/iletisim?isletme=${encodeURIComponent(vendor.name)}`}
                  className="inline-flex w-full justify-center rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition"
                >
                  Mesaj formunu aç
                </a>
              </div>
              {mapBusinessId || overviewHasMapCoords ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
                  <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2">
                    <h3 className="font-black text-sm text-slate-900">Harita</h3>
                    <Map className="w-4 h-4 text-slate-500" aria-hidden />
                  </div>
                  {overviewHasMapCoords ? (
                    <div ref={overviewMapRef} className="w-full border-t border-slate-200/80 z-0" style={{ height: 220 }} />
                  ) : mapBusinessId ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/kesfet/isletme/${mapBusinessId}`)}
                      className="relative block w-full text-left group"
                    >
                      <div className="h-44 w-full bg-gradient-to-br from-sky-100 via-indigo-100 to-slate-200 flex items-center justify-center border-t border-slate-200/80">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-slate-800 shadow group-hover:bg-white transition">
                          <MapPin className="w-4 h-4 text-indigo-600" />
                          Haritada aç
                        </span>
                      </div>
                    </button>
                  ) : null}
                  <div className="px-4 py-3 bg-white border-t border-slate-100">
                    {mapBusinessId ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/kesfet/isletme/${mapBusinessId}`)}
                        className="text-sm font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                      >
                        Haritada yol tarifi al
                      </button>
                    ) : directionsHref ? (
                      <a
                        href={directionsHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                      >
                        Haritada yol tarifi al
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          )}
          {contentTab === "menu" && menuCats.length > 1 && (
            <div className="restaurant-category-tabs yekpare-scrollbar md:hidden flex gap-2 overflow-x-auto mb-5 pb-1">
              {menuCats.map(cat => (
                <button key={cat.id} onClick={() => setActiveCat(cat.id)} className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold transition ${activeCat === cat.id ? activeColor : inactiveColor}`}>{cat.name}</button>
              ))}
            </div>
          )}
          {contentTab === "menu" && (
            <div ref={menuRef} id="menu" className="restaurant-menu-list space-y-6">
              {menuCats.length === 0 ? (
              <div className="space-y-3">{menuItems.map(item => <MenuItemCard key={item.id} item={item} qty={qtyInCart(item.id)} onAdd={() => addToCart(item)} onRemove={() => removeFromCart(item.id)} disabled={!vendor.isOpen} addLabel="Sipariş ver" />)}</div>
              ) : (
              menuCats.filter(cat => !activeCat || cat.id === activeCat).map(cat => {
                const items = menuItems.filter(m => m.menuCategoryId === cat.id);
                if (items.length === 0) return null;
                return (
                  <div key={cat.id}>
                    <h2 className="restaurant-section-title text-base font-bold text-gray-800 mb-3 border-b pb-2">{cat.name}</h2>
                    <div className="space-y-3">{items.map(item => <MenuItemCard key={item.id} item={item} qty={qtyInCart(item.id)} onAdd={() => addToCart(item)} onRemove={() => removeFromCart(item.id)} disabled={!vendor.isOpen} addLabel="Sipariş ver" />)}</div>
                  </div>
                );
              })
              )}
            </div>
          )}
        </div>

        {/* Right: cart panel (desktop) */}
        <div className="hidden lg:block w-80 sticky top-4">
          <CartPanel
            cart={cart} subtotal={subtotal} deliveryFee={deliveryFee} discount={couponDiscount} total={total}
            minOrder={minOrder} step={step} submitting={submitting} couponCode={couponCode} couponError={couponError}
            orderForm={orderForm} tableForm={tableForm} pickupForm={pickupForm} orderNumber={orderNumber} orderTrackingToken={orderTrackingToken} orderType={orderType}
            serviceSettings={publicServiceSettings}
            subscriptionTrOnlinePay={Boolean(vendor.subscriptionTrOnlinePay)}
            trCheckout={trCheckout}
            payReturnNotice={payReturnNotice}
            payFlowError={payFlowError}
            platformCommissionPreview={platformCommissionPreview}
            commissionPctLabel={commissionPctLabel}
            deliveryDistanceKm={deliveryDistanceKm}
            deliveryTooFar={deliveryTooFar}
            geoStatus={geoStatus}
            orderError={orderError}
            onAddItem={addToCart} onRemoveItem={removeFromCart}
            onCouponChange={setCouponCode} onApplyCoupon={applyCoupon}
            onFormChange={(k, v) => setOrderForm(f => ({ ...f, [k]: v }))}
            onTableFormChange={(k, v) => setTableForm(f => ({ ...f, [k]: v }))}
            onPickupFormChange={(k, v) => setPickupForm(f => ({ ...f, [k]: v }))}
            onCheckout={handleCheckout} onSelectType={selectOrderType}
            onStepChange={setStep} onSubmitDelivery={submitDeliveryOrder} onSubmitTable={submitTableOrder} onSubmitPickup={submitPickupOrder}
            onSkipTrPay={() => setTrCheckout(null)}
            onStripeTrPayDone={() => setPayReturnNotice("paid")}
          />
        </div>
      </div>

      {/* Mobile cart button — alt menünün üstünde */}
      {!showCart && step === "cart" && (
        <button
          type="button"
          onClick={() => { setContentTab("menu"); setShowCart(true); }}
          className={`fixed right-4 lg:hidden ${MOBILE_ORDER_OVERLAY_Z} grid h-14 w-14 place-items-center rounded-full bg-[#0f766e] text-white shadow-2xl ring-4 ring-white/90 transition active:scale-95`}
          style={{ bottom: MOBILE_SHEET_BOTTOM_PAD }}
          aria-label={cartCount > 0 ? `${cartCount} ürün sepeti aç` : "Sepeti aç"}
        >
          <ShoppingCart className="h-6 w-6" />
          <span className="absolute -right-1 -top-1 grid h-6 min-w-6 place-items-center rounded-full bg-white px-1 text-xs font-black text-[#0f766e] shadow">
            {cartCount}
          </span>
        </button>
      )}

      {/* Mobile cart + checkout steps (z-index alt menüden yüksek) */}
      {(showCart || step !== "cart") && (
        <div className={`fixed inset-0 lg:hidden flex flex-col ${MOBILE_ORDER_OVERLAY_Z}`}>
          <div
            className="bg-black/50 flex-1 min-h-0"
            onClick={() => {
              if (showCart) setShowCart(false);
              else if (step === "type-select") setStep("cart");
            }}
            aria-hidden
          />
          <div
            className="bg-white rounded-t-2xl shadow-2xl flex flex-col max-h-[min(92dvh,100%)] shrink-0"
            style={{ paddingBottom: MOBILE_SHEET_BOTTOM_PAD }}
          >
            {showCart && step === "cart" ? (
              <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0 border-b border-gray-100">
                <h2 className="font-black text-lg">Sepetim</h2>
                <button type="button" onClick={() => setShowCart(false)} className="p-2 -mr-2 rounded-full hover:bg-gray-100" aria-label="Kapat">
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : null}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-3 min-h-0">
              <CartPanel
                cart={cart}
                subtotal={subtotal}
                deliveryFee={deliveryFee}
                discount={couponDiscount}
                total={total}
                minOrder={minOrder}
                step={step}
                submitting={submitting}
                couponCode={couponCode}
                couponError={couponError}
                orderForm={orderForm}
                tableForm={tableForm}
                pickupForm={pickupForm}
                orderNumber={orderNumber}
                orderTrackingToken={orderTrackingToken}
                orderType={orderType}
                serviceSettings={publicServiceSettings}
                subscriptionTrOnlinePay={Boolean(vendor.subscriptionTrOnlinePay)}
                trCheckout={trCheckout}
                payReturnNotice={payReturnNotice}
                payFlowError={payFlowError}
                platformCommissionPreview={platformCommissionPreview}
                commissionPctLabel={commissionPctLabel}
                deliveryDistanceKm={deliveryDistanceKm}
                deliveryTooFar={deliveryTooFar}
                geoStatus={geoStatus}
                orderError={orderError}
                onAddItem={addToCart}
                onRemoveItem={removeFromCart}
                onCouponChange={setCouponCode}
                onApplyCoupon={applyCoupon}
                onFormChange={(k, v) => setOrderForm((f) => ({ ...f, [k]: v }))}
                onTableFormChange={(k, v) => setTableForm((f) => ({ ...f, [k]: v }))}
                onPickupFormChange={(k, v) => setPickupForm((f) => ({ ...f, [k]: v }))}
                onCheckout={handleCheckout}
                onSelectType={selectOrderType}
                onStepChange={setStep}
                onSubmitDelivery={submitDeliveryOrder}
                onSubmitTable={submitTableOrder}
                onSubmitPickup={submitPickupOrder}
                onSkipTrPay={() => setTrCheckout(null)}
                onStripeTrPayDone={() => setPayReturnNotice("paid")}
                mobileStickyActions
              />
            </div>
          </div>
        </div>
      )}

      {waPopoverOpen && vendor.phone && waEnabled && waCustomerContact ? (
        <div
          className="fixed inset-0 z-[9200] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-label="WhatsApp"
          onClick={() => setWaPopoverOpen(false)}
        >
          <div
            className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h2 className="font-black text-lg text-gray-900">WhatsApp</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {vendor.name} ile WhatsApp üzerinden iletişime geçmek için aşağıdaki düğmeyi kullanın.
                </p>
              </div>
              <button type="button" onClick={() => setWaPopoverOpen(false)} className="rounded-full p-2 text-gray-400 hover:bg-gray-100" aria-label="Kapat">
                <X className="w-5 h-5" />
              </button>
            </div>
            <a
              href={`https://wa.me/${waDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-bold text-white hover:bg-[#20bd5a] transition"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp&apos;ta aç
            </a>
            <button type="button" onClick={() => setWaPopoverOpen(false)} className="mt-3 w-full rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Kapat
            </button>
          </div>
        </div>
      ) : null}

      {/* Rezervasyon Modal */}
      {showReservation && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60">
          <div className="bg-white w-full sm:rounded-2xl sm:max-w-md max-h-[92vh] overflow-y-auto">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-black text-lg flex items-center gap-2"><CalendarDays className="w-5 h-5 text-teal-500" /> Rezervasyon</h2>
                <button onClick={() => { setShowReservation(false); setResConfirmed(null); setResForm({ name: "", phone: "", date: "", time: "", partySize: "2", sectionId: "", note: "" }); }}><X className="w-5 h-5 text-gray-400" /></button>
              </div>

              {resConfirmed ? (
                <div className="text-center py-6">
                  <CheckCircle className="w-16 h-16 text-teal-500 mx-auto mb-3" />
                  <h3 className="text-lg font-black text-gray-900 mb-1">{resConfirmed.autoConfirm ? "Rezervasyon Onaylandı!" : "Rezervasyon Talebi Alındı!"}</h3>
                  <p className="text-gray-500 text-sm">{resConfirmed.autoConfirm ? "Rezervasyonunuz otomatik olarak onaylandı." : "İşletme tarafından onaylanınca bilgilendirileceksiniz."}</p>
                  <button onClick={() => { setShowReservation(false); setResConfirmed(null); setResForm({ name: "", phone: "", date: "", time: "", partySize: "2", sectionId: "", note: "" }); }} className="mt-5 px-6 py-2.5 bg-teal-500 text-white rounded-xl font-semibold text-sm hover:bg-teal-600 transition">Tamam</button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 block mb-1">Tarih *</label>
                      <input type="date" value={resForm.date} min={new Date().toISOString().slice(0, 10)} onChange={e => setResForm(f => ({ ...f, date: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 block mb-1">Saat *</label>
                      <input type="time" value={resForm.time} onChange={e => setResForm(f => ({ ...f, time: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Kişi Sayısı</label>
                    <select value={resForm.partySize} onChange={e => setResForm(f => ({ ...f, partySize: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400">
                      {[1,2,3,4,5,6,7,8,10,12,15,20].map(n => <option key={n} value={String(n)}>{n} kişi</option>)}
                    </select>
                  </div>
                  {publicServiceSettings.tableSections.length > 0 && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 block mb-1">Masa / Oda / Lobi (isteğe bağlı)</label>
                      <select value={resForm.sectionId} onChange={e => setResForm(f => ({ ...f, sectionId: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400">
                        <option value="">Fark etmez / Seçiniz</option>
                        {publicServiceSettings.tableSections.map(s => <option key={s.id} value={s.id}>{SECTION_TYPE_LABELS[s.type] || s.type} {s.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Ad Soyad *</label>
                    <input type="text" value={resForm.name} onChange={e => setResForm(f => ({ ...f, name: e.target.value }))} placeholder="Adınız Soyadınız" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Telefon *</label>
                    <input type="tel" value={resForm.phone} onChange={e => setResForm(f => ({ ...f, phone: e.target.value }))} placeholder="05XX XXX XX XX" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Not (isteğe bağlı)</label>
                    <textarea value={resForm.note} onChange={e => setResForm(f => ({ ...f, note: e.target.value }))} placeholder="Özel istek, alerji vb..." rows={2} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400 resize-none" />
                  </div>
                  <button
                    onClick={submitReservation} disabled={resSubmitting || !resForm.name || !resForm.phone || !resForm.date || !resForm.time}
                    className="w-full bg-teal-500 text-white font-bold py-3 rounded-xl hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
                  >
                    {resSubmitting ? "Gönderiliyor..." : "Rezervasyon Talebi Gönder"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </VendorThemeShell>
  );
}

function MenuItemCard({
  item,
  qty,
  onAdd,
  onRemove,
  disabled,
  addLabel = "Sipariş ver",
}: {
  item: MenuItem;
  qty: number;
  onAdd: () => void;
  onRemove: () => void;
  disabled?: boolean;
  addLabel?: string;
}) {
  const price = parseFloat(item.salePrice ?? item.price);
  const origPrice = item.salePrice ? parseFloat(item.price) : null;
  return (
    <div className={`restaurant-menu-card bg-white rounded-xl p-4 flex gap-3 items-start ${disabled ? "opacity-70" : ""}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span className="font-semibold text-gray-900 text-sm">{item.name}</span>
          {item.isPopular && <span className="flex items-center gap-0.5 text-orange-500 text-xs"><Flame className="w-3 h-3" />Popüler</span>}
          {item.isVegan && <span className="flex items-center gap-0.5 text-green-600 text-xs"><Leaf className="w-3 h-3" />Vegan</span>}
        </div>
        {item.description && <p className="text-xs text-gray-400 line-clamp-2 mb-2">{item.description}</p>}
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900">{price.toFixed(2)}₺</span>
          {origPrice && <span className="text-xs text-gray-400 line-through">{origPrice.toFixed(2)}₺</span>}
        </div>
      </div>
      {item.imageUrl && <img src={item.imageUrl} alt="" className="restaurant-menu-image w-20 h-20 rounded-lg object-cover shrink-0" />}
      <div className="flex flex-col items-center gap-1">
        {disabled ? (
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Kapalı</span>
        ) : qty > 0 ? (
          <div className="flex items-center gap-2 bg-orange-50 rounded-full px-2 py-1">
            <button onClick={onRemove} className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center hover:bg-orange-600"><Minus className="w-3 h-3" /></button>
            <span className="font-bold text-orange-600 text-sm w-4 text-center">{qty}</span>
            <button onClick={onAdd} className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center hover:bg-orange-600"><Plus className="w-3 h-3" /></button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onAdd}
            className="text-xs font-bold bg-orange-500 text-white px-3 py-2.5 sm:px-2.5 sm:py-1.5 rounded-full hover:bg-orange-600 shadow whitespace-nowrap min-h-[44px] min-w-[5.5rem]"
          >
            {addLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function CommissionPreviewRows({
  preview,
  label,
}: {
  preview: number | null | undefined;
  label?: string;
}) {
  if (preview == null || preview <= 0) return null;
  return (
    <>
      <div className="flex justify-between text-blue-800 mb-1 text-xs font-semibold">
        <span>Tahmini platform komisyonu{label ? ` (${label})` : ""}</span>
        <span>{preview.toFixed(2)}₺</span>
      </div>
      <p className="text-[10px] text-gray-500 mb-2 leading-snug">
        Ödeme işletmeye doğrudur; komisyon tutarı siparişte otomatik kayda geçer (mahsuplaştırma / raporlama).
      </p>
    </>
  );
}

function CartPanel({
  cart, subtotal, deliveryFee, discount, total, minOrder, step, submitting,
  couponCode, couponError, orderForm, tableForm, pickupForm, orderNumber, orderTrackingToken, orderType, serviceSettings,
  subscriptionTrOnlinePay,
  trCheckout,
  payReturnNotice,
  payFlowError,
  platformCommissionPreview = null,
  commissionPctLabel,
  deliveryDistanceKm = null,
  deliveryTooFar = false,
  geoStatus = "idle",
  orderError = null,
  onAddItem, onRemoveItem, onCouponChange, onApplyCoupon, onFormChange, onTableFormChange, onPickupFormChange,
  onCheckout, onSelectType, onStepChange, onSubmitDelivery, onSubmitTable, onSubmitPickup,
  onSkipTrPay,
  onStripeTrPayDone,
  mobileStickyActions = false,
}: {
  cart: CartItem[]; subtotal: number; deliveryFee: number; discount: number; total: number;
  minOrder: number; step: OrderStep; submitting: boolean; couponCode: string; couponError: string;
  orderForm: Record<string, string>; tableForm: Record<string, string>; pickupForm: Record<string, string>;
  orderNumber: string;
  orderTrackingToken: string;
  orderType: OrderType; serviceSettings: ServiceSettings;
  subscriptionTrOnlinePay: boolean;
  trCheckout: TrCheckoutPayload | null;
  payReturnNotice: PayReturnNotice;
  payFlowError: string | null;
  platformCommissionPreview?: number | null;
  commissionPctLabel?: string;
  deliveryDistanceKm?: number | null;
  deliveryTooFar?: boolean;
  geoStatus?: "idle" | "asking" | "ok" | "unavailable";
  orderError?: string | null;
  onAddItem: (item: CartItem) => void; onRemoveItem: (id: number) => void;
  onCouponChange: (v: string) => void; onApplyCoupon: () => void;
  onFormChange: (k: string, v: string) => void; onTableFormChange: (k: string, v: string) => void;
  onPickupFormChange: (k: string, v: string) => void;
  onCheckout: () => void; onSelectType: (t: OrderType) => void;
  onStepChange: (s: OrderStep) => void; onSubmitDelivery: () => void; onSubmitTable: () => void;
  onSubmitPickup: () => void;
  onSkipTrPay: () => void;
  onStripeTrPayDone?: () => void;
  mobileStickyActions?: boolean;
}) {
  const stickyActionClass = mobileStickyActions
    ? "sticky bottom-0 z-10 -mx-4 px-4 pt-3 pb-1 bg-white border-t border-gray-100 shadow-[0_-10px_24px_rgba(255,255,255,0.98)]"
    : "";

  if (step === "tr-pay") return (
    <div className="bg-white rounded-2xl p-4 max-h-[85vh] overflow-y-auto">
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => { onSkipTrPay(); onStepChange("confirmed"); }}
          className="text-gray-400 hover:text-gray-600"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="font-black text-base">Online ödeme</h3>
      </div>
      <p className="text-xs text-gray-500 mb-3 leading-relaxed">
        {trCheckout?.gateway === "stripe"
          ? "Kartla ödeme Stripe üzerinden alınır. İşlem bitince aşağıdaki onay görünür."
          : "Ödeme; işletmenin PayTR veya iyzico hesabına doğrudan yapılır. Yönlendirme sonrası bu sayfaya dönünce ödeme durumu güncellenir."}
      </p>
      <TrCheckoutPanel
        tr={trCheckout}
        onStripeSucceeded={() => {
          onSkipTrPay();
          onStepChange("confirmed");
          onStripeTrPayDone?.();
        }}
      />
      <button
        type="button"
        onClick={() => { onSkipTrPay(); onStepChange("confirmed"); }}
        className="mt-4 w-full text-sm text-gray-500 hover:text-gray-700 py-2"
      >
        Ödeme penceresini kapat (sipariş oluşturuldu)
      </button>
    </div>
  );

  if (step === "confirmed") return (
    <div className="bg-white rounded-2xl p-6 text-center">
      <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
      <h3 className="text-xl font-black text-gray-900 mb-1">Sipariş Alındı!</h3>
      {payFlowError && (
        <p className="text-sm text-rose-600 mb-3 rounded-lg bg-rose-50 border border-rose-100 px-3 py-2">
          Online ödeme başlatılamadı: {payFlowError}
        </p>
      )}
      {payReturnNotice === "paid" && (
        <p className="text-sm text-emerald-700 mb-3 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">Ödemeniz alındı. Teşekkürler!</p>
      )}
      {payReturnNotice === "pending" && (
        <p className="text-sm text-amber-800 mb-3 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
          Ödeme henüz onaylanmadı veya işleniyor. Birkaç dakika içinde sipariş takipten kontrol edebilirsiniz.
        </p>
      )}
      {payReturnNotice === "failed" && (
        <p className="text-sm text-rose-700 mb-3 rounded-lg bg-rose-50 border border-rose-100 px-3 py-2">
          Online ödeme tamamlanamadı. Sipariş kaydı duruyor; işletme ile iletişime geçebilirsiniz.
        </p>
      )}
      <p className="text-gray-500 text-sm mb-3">Sipariş numaranız:</p>
      <p className="text-2xl font-black text-orange-500 mb-4">{orderNumber}</p>
      <p className="text-xs text-gray-400 mb-4">Bu numarayı not edin. Sipariş takip etmek için kullanabilirsiniz.</p>
      <a href={`/siparis-takip/${orderNumber}${orderTrackingToken ? `?t=${encodeURIComponent(orderTrackingToken)}` : ""}`} className="block bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition text-sm">Siparişi Takip Et</a>
      <button
        type="button"
        onClick={() => { onStepChange("cart"); onSkipTrPay(); }}
        className="mt-2 text-sm text-gray-400 hover:text-gray-600 block w-full"
      >
        Yeni Sipariş Ver
      </button>
    </div>
  );

  /* Sipariş tipi seçimi */
  if (step === "type-select") return (
    <div className={mobileStickyActions ? "bg-white" : "bg-white rounded-2xl p-5"}>
      <div className={`flex items-center gap-2 mb-5 ${mobileStickyActions ? "pt-1" : ""}`}>
        <button type="button" onClick={() => onStepChange("cart")} className="text-gray-400 hover:text-gray-600 p-1"><ChevronLeft className="w-5 h-5" /></button>
        <h3 className="font-black text-base">Sipariş Türü Seçin</h3>
      </div>
      <div className={`space-y-3 ${stickyActionClass ? "pb-2" : ""}`}>
        <button onClick={() => onSelectType("delivery")} className="w-full flex items-center gap-4 p-4 border-2 border-gray-100 hover:border-orange-300 hover:bg-orange-50 rounded-xl transition">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center shrink-0"><Truck className="w-6 h-6 text-orange-500" /></div>
          <div className="text-left">
            <div className="font-bold text-gray-900 text-sm">🛵 Adrese Teslim</div>
            <div className="text-xs text-gray-500 mt-0.5">Teslimat adresinize kurye ile gönderelim</div>
          </div>
        </button>
        <button onClick={() => onSelectType("pickup")} className="w-full flex items-center gap-4 p-4 border-2 border-gray-100 hover:border-amber-300 hover:bg-amber-50 rounded-xl transition">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center shrink-0"><MapPin className="w-6 h-6 text-amber-600" /></div>
          <div className="text-left">
            <div className="font-bold text-gray-900 text-sm">🏪 Gel Al</div>
            <div className="text-xs text-gray-500 mt-0.5">İşletmeden paketinizi teslim alın</div>
          </div>
        </button>
        {serviceSettings.tableServiceEnabled && (
          <button onClick={() => onSelectType("table")} className="w-full flex items-center gap-4 p-4 border-2 border-gray-100 hover:border-purple-300 hover:bg-purple-50 rounded-xl transition">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center shrink-0"><UtensilsCrossed className="w-6 h-6 text-purple-500" /></div>
            <div className="text-left">
              <div className="font-bold text-gray-900 text-sm">🍽️ Masaya Servis</div>
              <div className="text-xs text-gray-500 mt-0.5">Bulunduğunuz masaya veya odaya getirtelim</div>
            </div>
          </button>
        )}
      </div>
    </div>
  );

  /* Masaya servis bilgileri */
  if (step === "table-info") return (
    <div className="bg-white rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <button type="button" onClick={() => onStepChange("type-select")} className="text-gray-400 hover:text-gray-600"><ChevronLeft className="w-5 h-5" /></button>
        <h3 className="font-black text-base flex items-center gap-2"><UtensilsCrossed className="w-4 h-4 text-purple-500" /> Masaya Servis</h3>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">Ad Soyad *</label>
          <input type="text" value={tableForm.name ?? ""} onChange={e => onTableFormChange("name", e.target.value)} placeholder="Adınız" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">Telefon *</label>
          <input type="tel" value={tableForm.phone ?? ""} onChange={e => onTableFormChange("phone", e.target.value)} placeholder="05XX XXX XX XX" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400" />
        </div>
        {serviceSettings.tableSections.length > 0 && (
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">Masa / Oda Seçin</label>
            <select value={tableForm.sectionId ?? ""} onChange={e => onTableFormChange("sectionId", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400">
              <option value="">Seçiniz...</option>
              {serviceSettings.tableSections.map(s => <option key={s.id} value={s.id}>{SECTION_TYPE_LABELS[s.type] || s.type} {s.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">Not (isteğe bağlı)</label>
          <input type="text" value={tableForm.notes ?? ""} onChange={e => onTableFormChange("notes", e.target.value)} placeholder="Sipariş notu..." className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400" />
        </div>
      </div>
      <div className="mt-4 pt-3 border-t text-sm">
        <div className="flex justify-between text-gray-500 mb-1"><span>Ara Toplam</span><span>{subtotal.toFixed(2)}₺</span></div>
        {discount > 0 && <div className="flex justify-between text-green-600 mb-1"><span>İndirim</span><span>-{discount.toFixed(2)}₺</span></div>}
        <CommissionPreviewRows preview={platformCommissionPreview} label={commissionPctLabel} />
        <div className="flex justify-between font-black text-gray-900 text-base mt-2 pt-2 border-t"><span>Toplam</span><span>{subtotal.toFixed(2)}₺</span></div>
      </div>
      <div className={stickyActionClass}>
        <button type="button" onClick={onSubmitTable} disabled={submitting || !tableForm.name || !tableForm.phone} className="w-full bg-purple-500 text-white font-bold py-3.5 rounded-xl hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm min-h-[48px]">
          {submitting ? "Gönderiliyor..." : "Siparişi Masaya Gönder"}
        </button>
      </div>
    </div>
  );

  /* Gel al bilgileri */
  if (step === "pickup-info") return (
    <div className="bg-white rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <button type="button" onClick={() => onStepChange("type-select")} className="text-gray-400 hover:text-gray-600"><ChevronLeft className="w-5 h-5" /></button>
        <h3 className="font-black text-base flex items-center gap-2"><MapPin className="w-4 h-4 text-amber-600" /> Gel Al</h3>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">Ad Soyad *</label>
          <input type="text" value={pickupForm.name ?? ""} onChange={e => onPickupFormChange("name", e.target.value)} placeholder="Adınız" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">Telefon *</label>
          <input type="tel" value={pickupForm.phone ?? ""} onChange={e => onPickupFormChange("phone", e.target.value)} placeholder="05XX XXX XX XX" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">Not (isteğe bağlı)</label>
          <input type="text" value={pickupForm.notes ?? ""} onChange={e => onPickupFormChange("notes", e.target.value)} placeholder="Sipariş notu..." className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-400" />
        </div>
      </div>
      <div className="mt-4 pt-3 border-t text-sm">
        <div className="flex justify-between text-gray-500 mb-1"><span>Ara Toplam</span><span>{subtotal.toFixed(2)}₺</span></div>
        {discount > 0 && <div className="flex justify-between text-green-600 mb-1"><span>İndirim</span><span>-{discount.toFixed(2)}₺</span></div>}
        <CommissionPreviewRows preview={platformCommissionPreview} label={commissionPctLabel} />
        <div className="flex justify-between font-black text-gray-900 text-base mt-2 pt-2 border-t"><span>Toplam</span><span>{(subtotal - discount).toFixed(2)}₺</span></div>
      </div>
      <div className={stickyActionClass}>
        <button
          type="button"
          onClick={onSubmitPickup}
          disabled={submitting || !pickupForm.name || !pickupForm.phone || (minOrder > 0 && subtotal < minOrder)}
          className="w-full bg-amber-500 text-white font-bold py-3.5 rounded-xl hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm min-h-[48px]"
        >
          {submitting ? "Gönderiliyor..." : "Gel Al Siparişi Gönder"}
        </button>
      </div>
      {minOrder > 0 && subtotal < minOrder && (
        <p className="text-xs text-amber-600 mt-2 bg-amber-50 p-2 rounded-lg">Min. sipariş tutarı: {minOrder.toFixed(0)}₺</p>
      )}
    </div>
  );

  /* Adrese teslim bilgileri */
  if (step === "address") return (
    <div className="bg-white rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <button type="button" onClick={() => onStepChange("type-select")} className="text-gray-400 hover:text-gray-600"><ChevronLeft className="w-5 h-5" /></button>
        <h3 className="font-black text-base flex items-center gap-2"><Truck className="w-4 h-4 text-orange-500" /> Teslimat Bilgileri</h3>
      </div>
      <div className="space-y-3">
        {[
          { key: "name", label: "Ad Soyad", type: "text", required: true },
          { key: "phone", label: "Telefon", type: "tel", required: true },
          { key: "address", label: "Adres", type: "text", required: true },
          { key: "city", label: "Şehir", type: "text", required: false },
          { key: "district", label: "İlçe", type: "text", required: false },
          { key: "notes", label: "Sipariş Notu", type: "text", required: false },
        ].map(f => (
          <div key={f.key}>
            <label className="text-xs font-semibold text-gray-500 block mb-1">{f.label}{f.required && " *"}</label>
            <input type={f.type} value={orderForm[f.key] ?? ""} onChange={e => onFormChange(f.key, e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" placeholder={f.label} />
          </div>
        ))}
        {subscriptionTrOnlinePay && orderForm.paymentMethod === "online" && (
          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-1">E-posta (önerilir)</label>
            <input type="email" value={orderForm.email ?? ""} onChange={e => onFormChange("email", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" placeholder="fatura@örnek.com" />
          </div>
        )}
        <div>
          <label className="text-xs font-semibold text-gray-500 block mb-1">Ödeme Yöntemi</label>
          <select value={orderForm.paymentMethod ?? "cash"} onChange={e => onFormChange("paymentMethod", e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400">
            <option value="cash">Kapıda Nakit</option>
            <option value="card_on_delivery">Kapıda Kart</option>
            <option value="online" disabled={!subscriptionTrOnlinePay}>
              Kredi kartı (online) — PayTR / iyzico / Stripe
            </option>
          </select>
          {!subscriptionTrOnlinePay && (
            <p className="text-[10px] text-gray-400 mt-1">
              Kredi kartı ile online ödeme için işletme PayTR veya iyzico tanımlamalı veya platformda Stripe aktif olmalıdır.
            </p>
          )}
        </div>
      </div>
      {/* Konum / teslimat mesafesi geri bildirimi */}
      <div className="mt-3">
        {geoStatus === "asking" && (
          <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0" /> Konumunuz alınıyor; teslimat mesafesi denetleniyor...
          </p>
        )}
        {geoStatus === "unavailable" && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Konum izni verilmedi. Mesafe denetimi sipariş gönderilirken yapılacaktır; adresinizi eksiksiz yazın.
          </p>
        )}
        {deliveryDistanceKm != null && !deliveryTooFar && (
          <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0" /> İşletmeye uzaklığınız yaklaşık {deliveryDistanceKm.toFixed(1)} km — teslimat alanı içindesiniz.
          </p>
        )}
        {deliveryTooFar && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Bu işletme konumunuza teslimat yapamıyor (10 km dışı). İşletmeye uzaklığınız yaklaşık {deliveryDistanceKm?.toFixed(1)} km.
          </p>
        )}
        {orderError && (
          <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {orderError}
          </p>
        )}
      </div>
      <div className="mt-4 pt-3 border-t text-sm">
        <div className="flex justify-between text-gray-500 mb-1"><span>Ara Toplam</span><span>{subtotal.toFixed(2)}₺</span></div>
        <div className="flex justify-between text-gray-500 mb-1"><span>Teslimat</span><span>{deliveryFee === 0 ? "Ücretsiz" : `${deliveryFee.toFixed(2)}₺`}</span></div>
        {discount > 0 && <div className="flex justify-between text-green-600 mb-1"><span>İndirim</span><span>-{discount.toFixed(2)}₺</span></div>}
        <CommissionPreviewRows preview={platformCommissionPreview} label={commissionPctLabel} />
        <div className="flex justify-between font-black text-gray-900 text-base mt-2 pt-2 border-t"><span>Toplam</span><span>{total.toFixed(2)}₺</span></div>
      </div>
      <div className={stickyActionClass}>
        <button type="button" onClick={onSubmitDelivery} disabled={submitting || deliveryTooFar || !orderForm.name || !orderForm.phone || !orderForm.address} className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm min-h-[48px]">
          {submitting ? "Gönderiliyor..." : deliveryTooFar ? "Teslimat alanı dışındasınız" : "Siparişi Tamamla"}
        </button>
      </div>
    </div>
  );

  /* Sepet görünümü */
  return (
    <div className={mobileStickyActions ? "bg-white" : "bg-white rounded-2xl p-4"}>
      {!mobileStickyActions ? (
        <h3 className="font-black text-base mb-3 flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-orange-500" /> Sepetim</h3>
      ) : null}
      {cart.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sepetiniz boş</p>
          <p className="text-xs mt-1">Menüden ürün ekleyin</p>
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {cart.map(item => (
              <div key={item.id} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400">{parseFloat(item.salePrice ?? item.price).toFixed(2)}₺ × {item.qty}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => onRemoveItem(item.id)} className="w-6 h-6 border rounded-full flex items-center justify-center hover:bg-gray-100"><Minus className="w-3 h-3" /></button>
                  <span className="text-sm font-bold w-4 text-center">{item.qty}</span>
                  <button onClick={() => onAddItem(item)} className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center hover:bg-orange-600"><Plus className="w-3 h-3" /></button>
                </div>
                <span className="text-sm font-bold text-gray-800 w-14 text-right">{(parseFloat(item.salePrice ?? item.price) * item.qty).toFixed(2)}₺</span>
              </div>
            ))}
          </div>
          {/* Coupon */}
          <div className="flex gap-2 mb-4">
            <input value={couponCode} onChange={e => onCouponChange(e.target.value)} onKeyDown={e => e.key === "Enter" && onApplyCoupon()} placeholder="Kupon kodu" className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
            <button onClick={onApplyCoupon} className="px-3 py-2 bg-orange-100 text-orange-600 font-semibold rounded-lg text-sm hover:bg-orange-200 transition">Uygula</button>
          </div>
          {couponError && <p className="text-xs text-red-500 mb-3">{couponError}</p>}
          {discount > 0 && <p className="text-xs text-green-600 mb-3 font-semibold">✓ {discount.toFixed(2)}₺ indirim uygulandı</p>}
          <div className="pt-3 border-t text-sm">
            <div className="flex justify-between text-gray-500 mb-1"><span>Ara Toplam</span><span>{subtotal.toFixed(2)}₺</span></div>
            <div className="flex justify-between text-gray-500 mb-1"><span>Teslimat</span><span>{deliveryFee === 0 ? "Ücretsiz" : `${deliveryFee.toFixed(2)}₺`}</span></div>
            {discount > 0 && <div className="flex justify-between text-green-600 mb-1"><span>İndirim</span><span>-{discount.toFixed(2)}₺</span></div>}
            <CommissionPreviewRows preview={platformCommissionPreview} label={commissionPctLabel} />
            <div className="flex justify-between font-black text-gray-900 text-base mt-2 pt-2 border-t"><span>Toplam</span><span>{(subtotal + deliveryFee - discount).toFixed(2)}₺</span></div>
          </div>
          {minOrder > 0 && subtotal < minOrder && <p className="text-xs text-amber-600 mt-2 bg-amber-50 p-2 rounded-lg">Min. sipariş tutarı: {minOrder.toFixed(0)}₺ (eksik: {(minOrder - subtotal).toFixed(0)}₺)</p>}
          <div className={stickyActionClass}>
            <button type="button" onClick={onCheckout} disabled={cart.length === 0 || (minOrder > 0 && subtotal < minOrder)} className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm min-h-[48px]">
              Siparişe Devam
            </button>
          </div>
        </>
      )}
    </div>
  );
}
