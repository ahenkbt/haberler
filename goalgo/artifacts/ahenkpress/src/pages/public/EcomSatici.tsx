import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useLocation, useParams } from "wouter";
import {
  Star, Truck, ChevronLeft, Phone, Heart, ShoppingCart,
  Tag, Package, MapPin, Search, X, AlertCircle, Map as MapIcon, MessageCircle, UserPlus,
} from "lucide-react";
import { TrCheckoutPanel, type TrCheckoutPayload } from "@/components/TrCheckoutPanel";
import { TrAddressFields } from "@/components/TrAddressFields";
import { OrderTrackSearch } from "@/components/OrderTrackSearch";
import { VendorAnnouncementsSection } from "@/components/VendorAnnouncementsSection";
import { VendorBlogStorefrontSection, type VendorBlogPostRow } from "@/components/VendorBlogPreviewSection";
import { cleanAboutForPublic } from "@/lib/publicAboutText";
import { applySocialShareMeta, resetSeoToSiteDefaults, seoPlainSnippet, applyVendorStructuredData } from "@/lib/pageSeo";
import { AuthModal } from "@/components/AuthModal";
import { StoreCategoryAccordion, type StoreCategoryNode } from "@/components/StoreCategoryAccordion";
import {
  collectSubtreeIds,
  findCategoryNode,
  normalizeStoreProduct,
  pruneCategoryTree,
} from "@/lib/storeCategoryTree";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { VendorThemeShell } from "@/components/VendorThemeShell";
import { EcommerceThemeRenderer, isEcommerceRendererTheme } from "@/components/EcommerceThemeRenderer";
import { isVendorStandaloneHost } from "@/lib/vendorThemes";
import { resolveClientMediaSrc } from "@/lib/apiBase";

const API = "/api";

interface Vendor {
  id: number; name: string; slug: string; description: string;
  aboutHtml?: string | null;
  imageUrl: string; coverUrl: string; phone: string;
  address?: string | null;
  whatsapp?: string | null;
  city: string; district: string;
  shippingFee: string; freeShippingAbove: string; shippingTime: number;
  minOrderAmount: string;
  rating: number; reviewCount: number; isOpen: boolean;
  vendorType: string; tags: string[];
  revenueModel?: string;
  subscriptionTrOnlinePay?: boolean;
  notes?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  themeKey?: string;
  themeConfig?: Record<string, string>;
  navMenuEnabled?: boolean;
  navMenuItems?: Array<{ id: string; label: string; href: string; enabled?: boolean }>;
  stripMenuEnabled?: boolean;
  stripMenuItems?: Array<{ id: string; label: string; href: string; enabled?: boolean }>;
}

interface MenuCategory {
  id: number; name: string; position: number; ecommerceCategoryId?: number | null; ecommerce_category_id?: number | null;
}

interface Product {
  id: number; name: string; description: string;
  price: string; salePrice: string | null;
  imageUrl: string; menuCategoryId: number;
  ecommerceCategoryId: number | null;
  isPopular: boolean; isVegan: boolean; isGlutenFree: boolean;
}

interface CartItem { product: Product; qty: number; }

interface Review {
  id: number;
  customerName: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

function waHrefFromPhoneOrWa(raw: string | null | undefined): string | null {
  const d = String(raw ?? "").replace(/\D/g, "");
  if (d.length < 10) return null;
  const n = d.startsWith("90") ? d : `90${d.replace(/^0/, "")}`;
  return `https://wa.me/${n}`;
}

function noteField(notes: string | null | undefined, key: string): string {
  const text = String(notes ?? "");
  const re = new RegExp(`(?:^|\\n)${key}\\s*:\\s*(.*)$`, "im");
  const m = text.match(re);
  return m?.[1]?.trim() ?? "";
}

const EMPTY_STORE_FEATURES = [
  "Yekpare.net Pazaryerinden satış yapmaya başla",
  "Kendi özel domainini mağazana bağla",
  "Ödemeni kendi PayTR / iyzico hesabına bağla",
  "Online sipariş, kargo ve müşteri takibini tek panelden yönet",
];

function EcomEmptyStorePanel({
  isOpen,
  hasSearch,
  onClearSearch,
}: {
  isOpen: boolean;
  hasSearch: boolean;
  onClearSearch: () => void;
}) {
  if (hasSearch) {
    return (
      <div className="ecom-empty-store-card rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Search className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <h3 className="text-lg font-black text-slate-900">Aramana uygun ürün bulunamadı</h3>
        <p className="mt-2 text-sm text-slate-500">Farklı bir kelime deneyebilir veya tüm ürünleri görüntüleyebilirsin.</p>
        <button type="button" onClick={onClearSearch} className="mt-5 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700">
          Aramayı temizle
        </button>
      </div>
    );
  }

  return (
    <div className="ecom-empty-store-card overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-emerald-50 shadow-sm">
      <div className="grid gap-6 p-6 sm:grid-cols-[1.2fr_0.8fr] sm:p-8">
        <div>
          <div className="mb-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
            {isOpen ? "Mağaza vitrine hazırlanıyor" : "Açılış aşamasında"}
          </div>
          <h3 className="text-2xl font-black text-slate-950">Bu mağazada ürünler yakında yayında</h3>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Mağaza henüz ürün kataloğunu tamamlamamış. İşletme sahibiysen vitrini doldurup satışa hemen başlayabilirsin.
          </p>
          <div className="mt-5 grid gap-2">
            {EMPTY_STORE_FEATURES.map((feature) => (
              <div key={feature} className="flex items-start gap-2 rounded-2xl bg-white/75 px-3 py-2 text-sm font-semibold text-slate-700">
                <span className="mt-0.5 text-emerald-600">✓</span>
                <span>{feature}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/is-ortagi" className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700">
              İşletmeni Kaydet
            </Link>
            <Link href="/servis-saglayici-giris" className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:border-emerald-300">
              Mağaza Paneline Gir
            </Link>
          </div>
        </div>
        <div className="flex items-center justify-center rounded-3xl bg-white/70 p-6 text-7xl shadow-inner">
          🛒
        </div>
      </div>
    </div>
  );
}

function parseCoord(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function findCategoryPath(
  tree: StoreCategoryNode[],
  id: number | null,
  parents: StoreCategoryNode[] = [],
): StoreCategoryNode[] | null {
  if (id == null) return null;
  for (const node of tree) {
    const nextPath = [...parents, node];
    if (node.id === id) return nextPath;
    const found = findCategoryPath(node.children, id, nextPath);
    if (found) return found;
  }
  return null;
}

function normalizeCategoryLookup(value: unknown): string {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/&/g, " ve ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function flattenCategoryTree(
  tree: StoreCategoryNode[],
  depth = 0,
): Array<{ node: StoreCategoryNode; depth: number }> {
  return tree.flatMap((node) => [
    { node, depth },
    ...flattenCategoryTree(node.children, depth + 1),
  ]);
}

export default function EcomSatici({ slugOverride }: { slugOverride?: string } = {}) {
  const params = useParams<{ slug: string }>();
  const slug = slugOverride || params.slug || "";
  const [location, navigate] = useLocation();
  const { user } = useCustomerAuth();
  const [authOpen, setAuthOpen] = useState(false);
  /** Teslimat adımında üye adresini yalnızca kullanıcı başına bir kez doldur (giriş sonrası tekrar çalışsın). */
  const addressPrefillForUserId = useRef<number | null>(null);
  const overviewMapRef = useRef<HTMLDivElement>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [categoryTree, setCategoryTree] = useState<StoreCategoryNode[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeEcomCategory, setActiveEcomCategory] = useState<number | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(() => new Set());
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [blogEnabled, setBlogEnabled] = useState(false);
  const [blogPreviewPosts, setBlogPreviewPosts] = useState<VendorBlogPostRow[]>([]);
  const [blogPreviewLoading, setBlogPreviewLoading] = useState(false);
  const [vendorAnnouncements, setVendorAnnouncements] = useState<Array<{ id: number; title: string; body: string; published_at?: string | null }>>([]);
  const [contentTab, setContentTab] = useState<"products" | "overview">("products");
  const [waPopoverOpen, setWaPopoverOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);

  // Checkout states
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "address" | "tr-pay" | "done">("cart");
  const [address, setAddress] = useState({
    name: "", phone: "", email: "", fullAddress: "", city: "", district: "", mahalle: "", zip: "",
  });
  const [payMethod, setPayMethod] = useState<"cash" | "online">("cash");
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [trCheckout, setTrCheckout] = useState<TrCheckoutPayload | null>(null);
  const [payReturnNotice, setPayReturnNotice] = useState<"paid" | "pending" | "failed" | null>(null);
  const [payFlowError, setPayFlowError] = useState<string | null>(null);
  const [legalMesafeli, setLegalMesafeli] = useState(false);
  const [legalOnbilgi, setLegalOnbilgi] = useState(false);
  const [liked, setLiked] = useState(false);
  const [mapBusinessId, setMapBusinessId] = useState<string | null>(null);

  useEffect(() => {
    const path = location.split("?")[0] ?? "";
    if (path.endsWith("/hakkimizda") || path.endsWith("/iletisim")) setContentTab("overview");
    if (path.endsWith("/urunler")) setContentTab("products");
  }, [location]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const ord = q.get("order");
    const pay = q.get("pay");
    if (!ord || pay === null) return;
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch(`${API}/delivery/orders/${encodeURIComponent(ord)}`);
        const d = await r.json().catch(() => ({}));
        if (cancelled) return;
        const ps = d.paymentStatus ?? d.payment_status;
        setOrderNo(ord);
        setCheckoutStep("done");
        setCartOpen(false);
        setCart([]);
        if (pay === "1") setPayReturnNotice(ps === "paid" ? "paid" : "pending");
        else setPayReturnNotice("failed");
      } catch {
        if (!cancelled) {
          setOrderNo(ord);
          setCheckoutStep("done");
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
    if (vendor && vendor.subscriptionTrOnlinePay !== true && payMethod === "online") {
      setPayMethod("cash");
    }
  }, [vendor?.id, vendor?.subscriptionTrOnlinePay, payMethod]);

  useEffect(() => {
    if (checkoutStep !== "address") {
      addressPrefillForUserId.current = null;
      return;
    }
    if (!user) {
      addressPrefillForUserId.current = null;
      return;
    }
    if (addressPrefillForUserId.current === user.id) return;
    addressPrefillForUserId.current = user.id;
    setAddress((a) => ({
      ...a,
      name: (a.name.trim() || user.name || "").trim(),
      phone: (a.phone.trim() || user.phone || "").trim(),
      email: (a.email.trim() || user.email || "").trim(),
      fullAddress: (a.fullAddress.trim() || user.address || "").trim(),
      city: (a.city.trim() || user.city || "").trim(),
      district: (a.district.trim() || user.district || "").trim(),
      zip: (a.zip.trim() || user.postal || "").trim(),
    }));
  }, [user, checkoutStep]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    Promise.all([
      fetch(`${API}/delivery/vendors/${encodeURIComponent(slug)}`).then((r) => r.json()),
      fetch(`${API}/ecommerce-product-categories`).then((r) => r.json()).catch(() => ({ tree: [] })),
    ])
      .then(([data, catData]) => {
        if (data.vendor) {
          setVendor(data.vendor);
          setCategories(
            (data.menuCats ?? []).map((c: MenuCategory) => ({
              ...c,
              ecommerceCategoryId: c.ecommerceCategoryId ?? c.ecommerce_category_id ?? null,
            })),
          );
          setProducts(
            (Array.isArray(data.menuItems) ? data.menuItems : []).map((p: Record<string, unknown>) =>
              normalizeStoreProduct(p),
            ),
          );
          setMapBusinessId(data.mapBusinessId ?? null);
          setReviews(Array.isArray(data.reviews) ? data.reviews : []);
        } else {
          setVendor(data);
          setReviews([]);
        }
        const vendorTree = Array.isArray(data.ecommerceCategoryTree) ? data.ecommerceCategoryTree : [];
        const globalTree = Array.isArray(catData.tree) ? catData.tree : [];
        setCategoryTree(vendorTree.length > 0 ? vendorTree : globalTree);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!vendor || !slug) return;
    const path = `/alisveris/magaza/${encodeURIComponent(slug)}`;
    const snippet =
      seoPlainSnippet(vendor.description) ||
      seoPlainSnippet(cleanAboutForPublic(String(vendor.aboutHtml ?? ""))) ||
      "Online mağaza ve ürün kataloğu.";
    const loc = [vendor.district, vendor.city].filter(Boolean).join(", ");
    const primary = [vendor.name + ":", snippet, loc ? `Konum: ${loc}.` : null, "E-ticaret ve alışveriş mağazası."].filter(Boolean).join(" ");
    applySocialShareMeta({
      title: `${vendor.name} — Online mağaza`,
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
      isShop: true,
      breadcrumbs: [
        { name: "Ana sayfa", path: "/" },
        { name: "Mağazalar", path: "/alisveris" },
        { name: vendor.name, path },
      ],
    });
    return () => resetSeoToSiteDefaults();
  }, [vendor, slug]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    fetch(`${API}/delivery/vendors/${encodeURIComponent(slug)}/blog-meta`)
      .then((r) => r.json())
      .then((m) => {
        if (!cancelled) setBlogEnabled(Boolean(m.enabled));
      })
      .catch(() => {
        if (!cancelled) setBlogEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!slug || !blogEnabled) {
      setBlogPreviewPosts([]);
      setBlogPreviewLoading(false);
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
  }, [slug, blogEnabled]);

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

  const addToCart = (product: Product) => {
    setCart(prev => {
      const ex = prev.find(i => i.product.id === product.id);
      if (ex) return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { product, qty: 1 }];
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.reduce<CartItem[]>((acc, i) => {
      if (i.product.id !== id) return [...acc, i];
      if (i.qty > 1) return [...acc, { ...i, qty: i.qty - 1 }];
      return acc;
    }, []));
  };

  const clearProduct = (id: number) => setCart(prev => prev.filter(i => i.product.id !== id));

  const subtotal = cart.reduce((s, i) => {
    const price = parseFloat(i.product.salePrice ?? i.product.price);
    return s + price * i.qty;
  }, 0);

  const shippingFee = vendor && cart.length > 0 ? (
    (vendor.freeShippingAbove && subtotal >= parseFloat(vendor.freeShippingAbove || "0")) || parseFloat(vendor.shippingFee || "0") === 0
      ? 0 : parseFloat(vendor.shippingFee || "0")
  ) : 0;

  const total = Math.max(0, subtotal - discount + shippingFee);
  const totalItems = cart.reduce((s, i) => s + i.qty, 0);
  const waEnabled = noteField(vendor?.notes, "whatsapp_enabled") !== "0";
  const waCustomerContact = noteField(vendor?.notes, "whatsapp_feature_customer_contact") !== "0";
  const fiveStarReviews = reviews.filter((r) => r.rating === 5).slice(0, 5);
  const overviewGallery = [...new Set(products.map((p) => p.imageUrl).filter(Boolean))].slice(0, 6) as string[];
  const waHref = waHrefFromPhoneOrWa(vendor?.whatsapp || vendor?.phone);
  const waDigits = waHref ? waHref.replace(/^https:\/\/wa\.me\//, "") : "";

  const applyCoupon = async () => {
    if (!couponCode.trim() || !vendor) return;
    setCouponLoading(true); setCouponMsg("");
    try {
      const res = await fetch(`${API}/delivery/coupons/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, vendorId: vendor.id, orderTotal: subtotal }),
      });
      const data = await res.json();
      if (data.valid) { setDiscount(data.discountAmount); setCouponMsg(`✓ ${data.message}`); }
      else { setCouponMsg(`✗ ${data.message}`); setDiscount(0); }
    } catch { setCouponMsg("Kupon doğrulanamadı"); }
    setCouponLoading(false);
  };

  const placeOrder = async () => {
    const em = address.email.trim();
    if (cart.length === 0) {
      alert("Sipariş oluşturmak için önce sepete ürün ekleyin.");
      setCheckoutStep("cart");
      return;
    }
    if (!vendor || !address.name || !address.fullAddress || !address.city.trim() || !address.district.trim()) return;
    if (!address.mahalle.trim()) {
      alert("İl, ilçe ve mahalle seçin (açılır listelerden).");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      alert("Geçerli bir e-posta adresi girin (sipariş bildirimleri için).");
      return;
    }
    if (!legalMesafeli || !legalOnbilgi) {
      alert("6502 sayılı Tüketicinin Korunması Hakkında Kanun uyarınca mesafeli satış sözleşmesi ve ön bilgilendirme formunu onaylamanız zorunludur.");
      return;
    }
    setOrderLoading(true);
    setPayFlowError(null);
    setPayReturnNotice(null);
    const lineStreet = [address.fullAddress.trim(), address.mahalle.trim()].filter(Boolean).join(" — ");
    const deliveryLine = `${lineStreet}, ${address.district.trim()}, ${address.city.trim()} ${address.zip.trim()}`.trim();
    try {
      const res = await fetch(`${API}/delivery/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: vendor.id,
          orderType: "ecommerce",
          orderSource: "ecommerce",
          deliveryAddress: deliveryLine,
          customerName: address.name,
          customerPhone: address.phone,
          customerEmail: em,
          customerCity: address.city.trim(),
          customerDistrict: address.district.trim(),
          customerPostalCode: address.zip.replace(/\D/g, "").slice(0, 5) || undefined,
          customerId: user?.id,
          couponCode: couponCode || undefined,
          subtotal: subtotal.toFixed(2),
          discount: discount.toFixed(2),
          deliveryFee: shippingFee.toFixed(2),
          total: total.toFixed(2),
          paymentMethod: vendor.subscriptionTrOnlinePay ? payMethod : "cash",
          items: cart.map(i => ({
            menuItemId: i.product.id,
            name: i.product.name,
            price: parseFloat(i.product.salePrice ?? i.product.price),
            quantity: i.qty,
          })),
          legalDistanceSalesAccepted: true,
          legalPreinfoAccepted: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Sipariş oluşturulamadı");
        setOrderLoading(false);
        return;
      }
      setOrderNo(data.orderNumber ?? `YEK${Date.now().toString().slice(-8)}`);
      const tr = data.trCheckout as TrCheckoutPayload | undefined;
      if (tr?.gateway === "paytr" && "iframeToken" in tr && tr.iframeToken) {
        setTrCheckout(tr);
        setCheckoutStep("tr-pay");
      } else if (tr?.gateway === "iyzico" && "checkoutFormContent" in tr && tr.checkoutFormContent) {
        setTrCheckout(tr);
        setCheckoutStep("tr-pay");
      } else if (tr?.gateway === "stripe" && "clientSecret" in tr && tr.clientSecret && tr.publishableKey) {
        setTrCheckout(tr);
        setCheckoutStep("tr-pay");
      } else if (tr && "error" in tr && typeof (tr as { error?: string }).error === "string") {
        setTrCheckout(null);
        setPayFlowError((tr as { error: string }).error);
        setCheckoutStep("done");
        setCart([]);
        setCartOpen(false);
      } else {
        setTrCheckout(null);
        setCheckoutStep("done");
        setCart([]);
        setCartOpen(false);
      }
    } catch {
      alert("Sipariş oluşturulamadı, tekrar dene.");
    }
    setOrderLoading(false);
  };

  const categoryNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const cat of categories) {
      map.set(Number(cat.id), cat.name);
    }
    return map;
  }, [categories]);

  const menuCategoryToEcomCategoryId = useMemo(() => {
    const flattened = flattenCategoryTree(categoryTree);
    const byName = new Map<string, Array<{ node: StoreCategoryNode; depth: number }>>();
    for (const entry of flattened) {
      const key = normalizeCategoryLookup(entry.node.name);
      if (!key) continue;
      const list = byName.get(key) ?? [];
      list.push(entry);
      byName.set(key, list);
    }
    for (const list of byName.values()) {
      list.sort((a, b) => b.depth - a.depth || a.node.name.localeCompare(b.node.name, "tr"));
    }

    const map = new Map<number, number>();
    for (const cat of categories) {
      const explicitId = cat.ecommerceCategoryId ?? cat.ecommerce_category_id;
      if (explicitId) {
        map.set(cat.id, Number(explicitId));
        continue;
      }
      const match = byName.get(normalizeCategoryLookup(cat.name))?.[0];
      if (match) map.set(cat.id, match.node.id);
    }
    return map;
  }, [categories, categoryTree]);

  const productCategoryId = (product: Product): number | null =>
    product.ecommerceCategoryId ?? menuCategoryToEcomCategoryId.get(product.menuCategoryId) ?? null;

  const productEcomIds = useMemo(() => {
    const ids = new Set<number>();
    for (const p of products) {
      const id = productCategoryId(p);
      if (id) ids.add(id);
    }
    return ids;
  }, [products, menuCategoryToEcomCategoryId]);

  const sidebarTree = useMemo(() => {
    if (categoryTree.length > 0) {
      const pruned = pruneCategoryTree(categoryTree, productEcomIds);
      if (pruned.length > 0) return pruned;
    }
    return [];
  }, [categoryTree, categories, productEcomIds]);

  const activeCategoryPath = useMemo(
    () => findCategoryPath(sidebarTree, activeEcomCategory),
    [sidebarTree, activeEcomCategory],
  );
  const activeTopCategoryId = activeCategoryPath?.[0]?.id ?? null;
  const activeTopCategory = activeCategoryPath?.[0] ?? null;
  const mobileSubcategories = activeTopCategory?.children ?? [];

  const allowedCategoryIds = useMemo(() => {
    if (activeEcomCategory == null) return null;
    const node = findCategoryNode(sidebarTree, activeEcomCategory);
    if (!node) return new Set([activeEcomCategory]);
    return new Set(collectSubtreeIds(node));
  }, [activeEcomCategory, sidebarTree]);

  const filteredProducts = products.filter((p) => {
    if (allowedCategoryIds) {
      const eid = productCategoryId(p);
      if (eid && allowedCategoryIds.has(eid)) {
        /* ok */
      } else {
        return false;
      }
    }
    if (search) {
      const haystack = normalizeCategoryLookup([
        p.name,
        p.description,
        categoryNameById.get(p.menuCategoryId) ?? "",
      ].join(" "));
      if (!haystack.includes(normalizeCategoryLookup(search))) return false;
    }
    return true;
  });

  function toggleCategoryExpand(id: number) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectCategory(id: number | null) {
    setActiveEcomCategory(id);
    if (id != null) {
      setExpandedCategories((prev) => new Set(prev).add(id));
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-white">
      <div className="h-56 bg-gray-200 animate-pulse" />
      <div className="max-w-6xl mx-auto p-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-1/3 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="bg-white rounded-xl h-64 animate-pulse" />)}
        </div>
      </div>
    </div>
  );

  if (!vendor) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center text-gray-400">
        <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Mağaza bulunamadı</p>
        <Link href="/alisveris"><button className="mt-4 text-blue-600 hover:underline">← Mağazalara Dön</button></Link>
      </div>
    </div>
  );
  const aboutFromHtml = cleanAboutForPublic(String(vendor.aboutHtml ?? "").trim());
  const aboutFromDesc = cleanAboutForPublic(String(vendor.description ?? "").trim());
  const aboutText = aboutFromHtml || aboutFromDesc;
  const blogBasePath = slug ? `/alisveris/magaza/${encodeURIComponent(slug)}` : "";
  const accessibilityPublic =
    cleanAboutForPublic(noteField(vendor.notes, "public_accessibility")) ||
    cleanAboutForPublic(noteField(vendor.notes, "erisilebilirlik"));
  const overviewLat = parseCoord(vendor.lat);
  const overviewLng = parseCoord(vendor.lng);
  const overviewHasMapCoords = overviewLat != null && overviewLng != null;
  const directionsHref =
    mapBusinessId != null
      ? null
      : overviewHasMapCoords
        ? `https://www.google.com/maps/dir/?api=1&destination=${overviewLat},${overviewLng}`
        : null;
  const ecommerceThemeKey = isEcommerceRendererTheme(vendor.themeKey)
    ? vendor.themeKey
    : String(vendor.vendorType ?? "").toLowerCase() === "ecommerce"
      ? "foodmart"
      : null;
  const resolvedEcommerceThemeKey = ecommerceThemeKey;

  if (checkoutStep === "done") return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <Package className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Siparişiniz Alındı!</h2>
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
            Ödeme onayı bekleniyor; kısa süre sonra sipariş özetinizden kontrol edebilirsiniz.
          </p>
        )}
        {payReturnNotice === "failed" && (
          <p className="text-sm text-rose-700 mb-3 rounded-lg bg-rose-50 border border-rose-100 px-3 py-2">
            Online ödeme tamamlanamadı. Sipariş kaydı oluştu; mağaza ile iletişime geçebilirsiniz.
          </p>
        )}
        <p className="text-gray-500 mb-4">Sipariş numaranız:</p>
        <div className="bg-blue-50 rounded-xl py-3 px-6 inline-block mb-6">
          <span className="text-blue-700 font-black text-2xl tracking-widest">{orderNo}</span>
        </div>
        <p className="text-gray-500 text-sm mb-4 leading-relaxed">
          Siparişiniz {vendor?.shippingTime ?? 3} iş günü içinde kargoya verilmesi hedeflenir. Kargo takip bilgisi oluştuğunda mağaza süreçlerine bağlı olarak size iletilebilir.
        </p>
        <p className="text-xs text-gray-600 mb-6 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 leading-relaxed text-left">
          <strong className="text-gray-800">Bildirimler:</strong> Sistem, sipariş durumu ve özet için{" "}
          <strong>e-posta</strong> ve yapılandırılmışsa <strong>WhatsApp</strong> üzerinden otomatik bilgilendirme göndermeyi dener. Mesajların ulaşması müşteri izinleri, operatör politikaları ve doğru iletişim bilgilerinize bağlıdır; kritik bilgiler için sipariş numaranızı saklayın.
        </p>
        <div className="flex gap-3">
          <Link href="/alisveris" className="flex-1">
            <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition">
              Alışverişe Devam
            </button>
          </Link>
        </div>
      </div>
    </div>
  );

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
      onHeroCta={() => setContentTab("products")}
      discoverHref={mapBusinessId ? `/kesfet/isletme/${mapBusinessId}` : "/kesfet"}
      hideHero={Boolean(resolvedEcommerceThemeKey)}
    >
    <div className="ecom-storefront min-h-screen bg-white">
      {resolvedEcommerceThemeKey ? (
        <EcommerceThemeRenderer
          themeKey={resolvedEcommerceThemeKey}
          themeConfig={vendor.themeConfig}
          vendor={vendor}
          aboutText={aboutText}
          products={products}
          filteredProducts={filteredProducts}
          sidebarTree={sidebarTree}
          activeEcomCategory={activeEcomCategory}
          activeTopCategoryId={activeTopCategoryId}
          mobileSubcategories={mobileSubcategories}
          expandedCategories={expandedCategories}
          search={search}
          contentTab={contentTab}
          cart={cart}
          totalItems={totalItems}
          total={total}
          waAvailable={Boolean(waEnabled && waCustomerContact && waHref)}
          discoverHref={mapBusinessId ? `/kesfet/isletme/${mapBusinessId}` : undefined}
          onSearchChange={setSearch}
          onContentTabChange={setContentTab}
          onSelectCategory={selectCategory}
          onToggleCategoryExpand={toggleCategoryExpand}
          onAddToCart={addToCart}
          onRemoveFromCart={removeFromCart}
          onOpenCart={() => setCartOpen(true)}
          onOpenWhatsApp={() => setWaPopoverOpen(true)}
          onToggleLike={() => setLiked((l) => !l)}
          liked={liked}
          blogBasePath={blogBasePath}
          blogEnabled={blogEnabled}
          blogPreviewPosts={blogPreviewPosts}
          blogPreviewLoading={blogPreviewLoading}
        />
      ) : (
      <>

      {/* Cover — tema hero kullanıldığında gizlenir */}
      {!vendor.themeKey && (
      <div className="relative h-52 bg-gray-300 overflow-hidden">
        {vendor.coverUrl && (
          <img src={vendor.coverUrl} alt={vendor.name} className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        <button
          onClick={() => navigate("/alisveris")}
          className="absolute top-4 left-4 bg-white/20 backdrop-blur-sm text-white w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/30 transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={() => setCartOpen(true)}
          className="absolute top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-blue-700 transition"
        >
          <ShoppingCart className="w-4 h-4" /> {totalItems > 0 ? `${totalItems} ürün · ${total.toFixed(0)}₺` : "Sepetim"}
        </button>

        <button
          onClick={() => setLiked(l => !l)}
          className={`absolute top-4 w-9 h-9 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition ${totalItems > 0 ? "right-36" : "right-4"}`}
        >
          <Heart className={`w-5 h-5 ${liked ? "fill-red-500 text-red-500" : "text-white"}`} />
        </button>
      </div>
      )}

      {/* Vendor info */}
      <div className="ecom-vendor-info bg-white border-b px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-200 shrink-0 -mt-8 border-2 border-white shadow">
            {resolveClientMediaSrc(vendor.imageUrl)
              ? <img src={resolveClientMediaSrc(vendor.imageUrl)} alt={vendor.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-blue-100 flex items-center justify-center text-2xl">🏪</div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-gray-900">{vendor.name}</h1>
            {aboutText ? (
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{aboutText}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1 font-semibold text-amber-500">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {Number(vendor.rating ?? 0).toFixed(1)}
                <span className="text-gray-400 font-normal">({vendor.reviewCount ?? 0} değerlendirme)</span>
              </span>
              <span className="flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-blue-600" />
                {parseFloat(vendor.shippingFee || "0") === 0
                  ? <span className="text-green-600 font-semibold">Ücretsiz kargo</span>
                  : `${vendor.shippingFee}₺ kargo`}
              </span>
              {vendor.freeShippingAbove && parseFloat(vendor.freeShippingAbove) > 0 && (
                <span className="text-blue-600">{vendor.freeShippingAbove}₺ üzeri ücretsiz</span>
              )}
              {vendor.phone && (
                <a href={`tel:${vendor.phone}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                  <Phone className="w-3.5 h-3.5" /> {vendor.phone}
                </a>
              )}
              {vendor.city && (
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {vendor.city}</span>
              )}
              {blogEnabled && blogBasePath ? (
                <Link href={`${blogBasePath}/blog`} className="flex items-center gap-1 text-violet-600 hover:text-violet-700 font-semibold">
                  📝 Blog
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        {mapBusinessId ? (
          <div className="max-w-6xl mx-auto mt-3 flex flex-wrap gap-4 text-xs text-gray-500 items-center justify-end">
            <button
              type="button"
              onClick={() => navigate(`/kesfet/isletme/${mapBusinessId}`)}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold"
            >
              <MapIcon className="w-3.5 h-3.5" /> Haritada Gör
            </button>
          </div>
        ) : null}
      </div>

      {/* Açılış Aşamasında Banner */}
      <div className="ecom-store-tabs bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setContentTab("products")} className={`px-3 py-1.5 rounded-full text-xs font-bold ${contentTab === "products" ? "bg-blue-600 text-white" : "bg-white text-gray-600 border"}`}>Ürünler</button>
          <button type="button" onClick={() => setContentTab("overview")} className={`px-3 py-1.5 rounded-full text-xs font-bold ${contentTab === "overview" ? "bg-blue-600 text-white" : "bg-white text-gray-600 border"}`}>Genel Bakış</button>
          {blogEnabled && blogBasePath ? (
            <Link href={`${blogBasePath}/blog`} className="px-3 py-1.5 rounded-full text-xs font-bold bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition">
              📝 Blog
            </Link>
          ) : null}
          {waEnabled && waCustomerContact && waHref ? (
            <button
              type="button"
              onClick={() => setWaPopoverOpen(true)}
              className="px-3 py-1.5 rounded-full text-xs font-black bg-[#25D366] text-[#063b1b] inline-flex items-center gap-1 hover:bg-[#20bd5a] transition"
            >
              <MessageCircle className="w-3 h-3" /> WhatsApp&apos;tan yaz
            </button>
          ) : null}
        </div>
      </div>

      {!vendor.isOpen && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
            <div className="bg-amber-100 rounded-full p-2 shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-bold text-amber-800 text-sm">Bu mağaza açılış aşamasındadır</p>
              <p className="text-amber-700 text-xs mt-0.5">Şu an sipariş alınmamaktadır. Yakında online alışveriş hizmeti başlayacak!</p>
            </div>
            {mapBusinessId && (
              <button onClick={() => navigate(`/kesfet/isletme/${mapBusinessId}`)}
                className="ml-auto shrink-0 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded-full transition">
                Harita Sayfası
              </button>
            )}
          </div>
        </div>
      )}

      <div className="ecom-shop-layout max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row gap-6">

        {/* Left: Category filter */}
        <aside className={`ecom-category-sidebar hidden w-60 shrink-0 ${contentTab === "products" ? "md:block" : ""}`}>
          {sidebarTree.length > 0 ? (
            <StoreCategoryAccordion
              tree={sidebarTree}
              activeId={activeEcomCategory}
              expandedIds={expandedCategories}
              onSelect={selectCategory}
              onToggleExpand={toggleCategoryExpand}
              className="ecom-foodmart-categories"
            />
          ) : null}
        </aside>

        {/* Main: Products */}
        <div className="ecom-products-column flex-1 min-w-0">

          {contentTab === "overview" && (
            <div className="space-y-4 mb-4">
              <section id="hakkimizda" className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide mb-2">Hakkımızda</h2>
                {aboutText ? (
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{aboutText}</p>
                ) : (
                  <p className="text-sm text-gray-500">Henüz mağaza tanıtım metni eklenmemiş.</p>
                )}
              </section>
              {accessibilityPublic ? (
                <section className="bg-white rounded-xl border border-teal-100 p-4 shadow-sm">
                  <h2 className="text-sm font-black text-teal-900 uppercase tracking-wide mb-2">Erişilebilirlik</h2>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{accessibilityPublic}</p>
                </section>
              ) : null}
              <VendorAnnouncementsSection items={vendorAnnouncements} />
              <VendorBlogStorefrontSection
                blogBasePath={blogBasePath}
                blogEnabled={blogEnabled}
                blogPreviewPosts={blogPreviewPosts}
                blogPreviewLoading={blogPreviewLoading}
              />
              {waEnabled && waCustomerContact && waHref ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="font-black text-sm text-emerald-950">WhatsApp&apos;tan yaz</h3>
                    <p className="text-xs text-emerald-900/80 mt-1">Mağazaya hızlıca ulaşmak için sohbeti buradan açın.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWaPopoverOpen(true)}
                    className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-black text-[#063b1b] shadow-sm hover:bg-[#20bd5a] transition"
                  >
                    <MessageCircle className="w-4 h-4" /> Sohbeti aç
                  </button>
                </div>
              ) : null}
              <section className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-2">
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide mb-1">İletişim</h2>
                {vendor.phone ? (
                  <a href={`tel:${vendor.phone}`} className="block text-sm text-indigo-600 hover:underline">
                    {vendor.phone}
                  </a>
                ) : null}
                {[vendor.district, vendor.city].filter(Boolean).length ? (
                  <p className="text-sm text-gray-600">{[vendor.district, vendor.city].filter(Boolean).join(", ")}</p>
                ) : null}
              </section>
              {fiveStarReviews.length > 0 ? (
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
                          <div className="flex gap-px">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star key={`${r.id}-s${i}`} className="w-3 h-3 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                        </div>
                        {r.comment ? <p className="text-xs text-gray-600 line-clamp-3">{r.comment}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {overviewGallery.length > 0 ? (
                <div>
                  <h3 className="font-black text-sm mb-2 text-gray-900">Son görseller</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 rounded-xl overflow-hidden border border-gray-100">
                    {overviewGallery.map((url, i) => (
                      <div key={i} className="aspect-square bg-gray-100">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
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
                  Mağazaya iletmek istediğiniz not için site iletişim formunu kullanın.
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
                    <MapIcon className="w-4 h-4 text-slate-500" aria-hidden />
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

          {/* Mobile categories: only top-level categories, like the delivery storefront. */}
          {contentTab === "products" && sidebarTree.length > 0 && (
            <div className="yekpare-scrollbar md:hidden mb-4 flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => selectCategory(null)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                  activeEcomCategory === null ? "bg-blue-600 text-white" : "border bg-white text-gray-600 hover:border-blue-300"
                }`}
              >
                Tümü
              </button>
              {sidebarTree.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => selectCategory(cat.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    activeTopCategoryId === cat.id ? "bg-blue-600 text-white" : "border bg-white text-gray-600 hover:border-blue-300"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {contentTab === "products" && mobileSubcategories.length > 0 && activeTopCategoryId != null && (
            <div className="yekpare-scrollbar md:hidden -mt-2 mb-4 flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => selectCategory(activeTopCategoryId)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  activeEcomCategory === activeTopCategoryId
                    ? "bg-emerald-600 text-white"
                    : "border bg-white text-gray-600 hover:border-emerald-300"
                }`}
              >
                Tümü
              </button>
              {mobileSubcategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => selectCategory(cat.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                    activeEcomCategory === cat.id
                      ? "bg-emerald-600 text-white"
                      : "border bg-white text-gray-600 hover:border-emerald-300"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Search */}
          {contentTab === "products" && <div className="ecom-search-bar relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full bg-white border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-blue-400"
              placeholder="Bu mağazada ara..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>}

          {contentTab === "products" && (filteredProducts.length === 0 ? (
            <EcomEmptyStorePanel
              isOpen={vendor.isOpen}
              hasSearch={Boolean(search.trim()) && products.length > 0}
              onClearSearch={() => setSearch("")}
            />
          ) : (
            <div className="ecom-product-grid grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map(product => {
                const inCart = cart.find(i => i.product.id === product.id);
                const price = parseFloat(product.price ?? "0");
                const salePrice = product.salePrice ? parseFloat(product.salePrice) : null;
                const discountPct = (salePrice && price > 0) ? Math.round((1 - salePrice / price) * 100) : null;
                const productImage = resolveClientMediaSrc(product.imageUrl);

                return (
                  <div key={product.id} className="ecom-product-card bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition group">
                    <div className="ecom-product-image relative aspect-square bg-gray-100 overflow-hidden">
                      {productImage
                        ? <img src={productImage} alt={product.name} className="ecom-product-image-img w-full h-full object-contain group-hover:scale-105 transition duration-300" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                        : <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
                      }
                      {discountPct && (
                        <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                          -{discountPct}%
                        </span>
                      )}
                      {product.isPopular && !discountPct && (
                        <span className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                          Popüler
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <h4 className="font-semibold text-gray-800 text-sm leading-snug line-clamp-2 mb-1">{product.name}</h4>
                      {product.description && (
                        <p className="text-xs text-gray-500 line-clamp-1 mb-2">{product.description}</p>
                      )}
                      <div className="flex items-center gap-1.5 mb-2">
                        {salePrice ? (
                          <>
                            <span className="font-black text-blue-600 text-base">{salePrice.toFixed(0)}₺</span>
                            <span className="text-xs text-gray-400 line-through">{price.toFixed(0)}₺</span>
                          </>
                        ) : (
                          <span className="font-black text-gray-900 text-base">{price.toFixed(0)}₺</span>
                        )}
                      </div>
                      {!vendor.isOpen ? (
                        <div className="w-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Açılış Aşamasında
                        </div>
                      ) : inCart ? (
                        <div className="flex items-center justify-between bg-blue-50 rounded-lg px-2 py-1">
                          <button onClick={() => removeFromCart(product.id)} className="w-7 h-7 bg-white rounded-lg text-blue-600 font-black text-base hover:bg-blue-100 flex items-center justify-center shadow-sm">−</button>
                          <span className="font-bold text-blue-700 text-sm">{inCart.qty}</span>
                          <button onClick={() => addToCart(product)} className="w-7 h-7 bg-blue-600 rounded-lg text-white font-black text-base hover:bg-blue-700 flex items-center justify-center">+</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(product)}
                          className="w-full bg-blue-600 text-white text-xs font-bold py-1.5 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-1"
                        >
                          <ShoppingCart className="w-3 h-3" /> Sepete Ekle
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      </>
      )}

      {waPopoverOpen && waHref && waDigits ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/50"
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
              href={waHref}
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

      {/* Floating cart button */}
      {!cartOpen && (
        <div className="fixed bottom-5 right-5 z-[80] flex justify-end sm:bottom-6 sm:right-6">
          <button
            onClick={() => setCartOpen(true)}
            className="ecom-floating-cart-button relative flex h-14 w-14 items-center justify-center rounded-full bg-emerald-700 text-white shadow-2xl transition hover:bg-emerald-800 sm:h-auto sm:w-auto sm:min-w-[220px] sm:justify-between sm:gap-4 sm:rounded-2xl sm:px-6 sm:py-3.5"
            aria-label="Sepetim"
          >
            <ShoppingCart className="h-6 w-6 sm:hidden" />
            <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1 text-xs font-black text-emerald-700 shadow sm:static sm:h-7 sm:w-7 sm:min-w-0 sm:px-0">
              {totalItems}
            </span>
            <span className="hidden font-black sm:inline">{totalItems > 0 ? "Sepeti Görüntüle" : "Sepetim"}</span>
            <span className="ml-auto hidden font-black text-emerald-50 sm:inline">{totalItems > 0 ? `${total.toFixed(0)}₺` : "Ürünler"}</span>
          </button>
        </div>
      )}

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-black text-lg text-gray-900 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" /> Sepetim
              </h2>
              <button onClick={() => setCartOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            {checkoutStep === "cart" && (
              <>
                <div className="flex-1 p-4 space-y-3">
                  <div className="rounded-xl border border-blue-100 bg-blue-50/90 p-3 text-xs text-gray-800 space-y-2">
                    <p>
                      <strong className="text-gray-900">Hesap:</strong> Siparişlerinizi kayıtlı hesapta görmek için{" "}
                      <button type="button" className="text-indigo-700 font-bold underline" onClick={() => setAuthOpen(true)}>
                        giriş yapın veya kayıt olun
                      </button>
                      . İsterseniz aşağıdan «Adrese Git» ile <strong>üye olmadan</strong> da devam edebilirsiniz.
                    </p>
                  </div>
                  {cart.map(item => {
                    const price = parseFloat(item.product.salePrice ?? item.product.price);
                    return (
                      <div key={item.product.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                        {resolveClientMediaSrc(item.product.imageUrl) && (
                          <img src={resolveClientMediaSrc(item.product.imageUrl)} alt={item.product.name} className="w-14 h-14 object-cover rounded-lg shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-800 line-clamp-1">{item.product.name}</p>
                          <p className="text-blue-600 font-bold text-sm">{(price * item.qty).toFixed(0)}₺</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => removeFromCart(item.product.id)} className="w-7 h-7 bg-white rounded-lg border text-gray-600 flex items-center justify-center hover:bg-gray-100">−</button>
                          <span className="font-bold text-sm w-4 text-center">{item.qty}</span>
                          <button onClick={() => addToCart(item.product)} className="w-7 h-7 bg-blue-600 rounded-lg text-white flex items-center justify-center hover:bg-blue-700">+</button>
                          <button onClick={() => clearProduct(item.product.id)} className="ml-1 text-gray-300 hover:text-red-400">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 border-t space-y-3">
                  {/* Coupon */}
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center bg-gray-100 rounded-xl px-3 gap-2">
                      <Tag className="w-4 h-4 text-gray-400 shrink-0" />
                      <input
                        className="flex-1 bg-transparent py-2.5 text-sm outline-none"
                        placeholder="Kupon kodu"
                        value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      />
                    </div>
                    <button
                      onClick={applyCoupon}
                      disabled={couponLoading}
                      className="bg-blue-100 text-blue-700 font-bold px-4 rounded-xl text-sm hover:bg-blue-200 transition disabled:opacity-50"
                    >
                      {couponLoading ? "..." : "Uygula"}
                    </button>
                  </div>
                  {couponMsg && (
                    <p className={`text-xs font-medium ${couponMsg.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>{couponMsg}</p>
                  )}

                  {/* Summary */}
                  <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-sm">
                    <div className="flex justify-between text-gray-600"><span>Ara toplam</span><span>{subtotal.toFixed(0)}₺</span></div>
                    {discount > 0 && <div className="flex justify-between text-green-600"><span>İndirim</span><span>-{discount.toFixed(0)}₺</span></div>}
                    <div className="flex justify-between text-gray-600">
                      <span>Kargo</span>
                      <span>{shippingFee === 0 ? <span className="text-green-600">Ücretsiz</span> : `${shippingFee}₺`}</span>
                    </div>
                    <div className="flex justify-between font-black text-gray-900 text-base pt-1 border-t">
                      <span>Toplam</span><span className="text-blue-600">{total.toFixed(0)}₺</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setCheckoutStep("address")}
                    disabled={cart.length === 0}
                    className="w-full bg-blue-600 text-white font-black py-3.5 rounded-xl hover:bg-blue-700 transition disabled:opacity-45 disabled:cursor-not-allowed"
                  >
                    Adrese Git →
                  </button>
                </div>
              </>
            )}

            {checkoutStep === "address" && (
              <>
                <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                  <button onClick={() => setCheckoutStep("cart")} className="text-sm text-blue-600 flex items-center gap-1 mb-2">
                    <ChevronLeft className="w-4 h-4" /> Sepete Dön
                  </button>
                  <h3 className="font-bold text-gray-800">Teslimat Bilgileri</h3>
                  <div className="rounded-xl border border-blue-100 bg-blue-50/90 p-3 text-xs text-gray-800 space-y-2">
                    <p>
                      <strong className="text-gray-900">Hesap:</strong> Giriş yaptıysanız profilinizdeki iletişim ve adres bilgileri yukarıda otomatik doldurulur; yine de kontrol edin. İsterseniz{" "}
                      <button type="button" className="text-indigo-700 font-bold underline" onClick={() => setAuthOpen(true)}>
                        hesap değiştir / kayıt
                      </button>{" "}
                      veya <strong>üye olmadan</strong> formu doldurarak devam edebilirsiniz.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setAuthOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Giriş / Kayıt
                      </button>
                      <span className="text-gray-600 self-center">veya formu doldurun</span>
                    </div>
                  </div>
                  {[
                    { field: "name" as const, placeholder: "Ad Soyad *", type: "text" },
                    { field: "phone" as const, placeholder: "Telefon *", type: "tel" },
                    { field: "email" as const, placeholder: "E-posta *", type: "email" },
                    { field: "fullAddress" as const, placeholder: "Sokak, bina, kapı no *", type: "text" },
                  ].map(({ field, placeholder, type }) => (
                    <input
                      key={field}
                      type={type}
                      placeholder={placeholder}
                      className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                      value={address[field]}
                      onChange={e => setAddress(a => ({ ...a, [field]: e.target.value }))}
                    />
                  ))}
                  <div>
                    <p className="text-[11px] font-semibold text-gray-600 mb-1">İl, ilçe, mahalle *</p>
                    <TrAddressFields
                      value={{ city: address.city, district: address.district, mahalle: address.mahalle }}
                      onChange={(v) => setAddress((a) => ({ ...a, city: v.city, district: v.district, mahalle: v.mahalle }))}
                      showMahalle
                      singleRow
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Posta kodu"
                    className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                    value={address.zip}
                    onChange={e => setAddress(a => ({ ...a, zip: e.target.value }))}
                  />
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Ödeme</label>
                    <select
                      value={vendor?.subscriptionTrOnlinePay ? payMethod : "cash"}
                      onChange={e => setPayMethod(e.target.value as "cash" | "online")}
                      className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                    >
                      <option value="cash">Kapıda / havale (sonradan ödeme)</option>
                      <option value="online" disabled={!vendor?.subscriptionTrOnlinePay}>
                        Kredi kartı (online) — PayTR / iyzico / Stripe
                      </option>
                    </select>
                    {!vendor?.subscriptionTrOnlinePay && (
                      <p className="text-[10px] text-gray-400 mt-1">
                        Online kart için mağaza PayTR veya iyzico tanımlamalı veya platformda Stripe açık olmalıdır.
                      </p>
                    )}
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3 space-y-2 text-[11px] text-gray-800 leading-snug">
                    <p className="font-bold text-gray-900">Yasal onaylar (zorunlu)</p>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={legalMesafeli}
                        onChange={(e) => setLegalMesafeli(e.target.checked)}
                        className="mt-0.5 rounded border-gray-300"
                      />
                      <span>
                        <Link href="/mesafeli-satis-sozlesmesi" className="text-blue-700 font-bold underline" target="_blank" rel="noopener noreferrer">
                          Mesafeli Satış Sözleşmesi
                        </Link>
                        &apos;ni okudum, elektronik ortamda onaylıyorum.
                      </span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={legalOnbilgi}
                        onChange={(e) => setLegalOnbilgi(e.target.checked)}
                        className="mt-0.5 rounded border-gray-300"
                      />
                      <span>
                        <Link href="/on-bilgilendirme" className="text-blue-700 font-bold underline" target="_blank" rel="noopener noreferrer">
                          Ön bilgilendirme formu
                        </Link>
                        nu okudum, ödeme öncesi bilgilendirmeyi kabul ediyorum.
                      </span>
                    </label>
                  </div>
                </div>
                <div className="p-4 border-t">
                  <div className="flex justify-between text-sm text-gray-600 mb-3">
                    <span>Toplam</span>
                    <span className="font-black text-blue-600 text-base">{total.toFixed(0)}₺</span>
                  </div>
                  <button
                    onClick={placeOrder}
                    disabled={
                      orderLoading
                      || cart.length === 0
                      || !legalMesafeli
                      || !legalOnbilgi
                      || !address.name
                      || !address.phone
                      || !address.email.trim()
                      || !address.fullAddress
                      || !address.city.trim()
                      || !address.district.trim()
                      || !address.mahalle.trim()
                    }
                    className="w-full bg-blue-600 text-white font-black py-3.5 rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {orderLoading ? "Sipariş veriliyor..." : `Siparişi Tamamla · ${total.toFixed(0)}₺`}
                  </button>
                </div>
              </>
            )}

            {checkoutStep === "tr-pay" && (
              <>
                <div className="flex-1 p-4 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => { setTrCheckout(null); setCheckoutStep("done"); setCart([]); setCartOpen(false); }}
                    className="text-sm text-blue-600 flex items-center gap-1 mb-3"
                  >
                    <ChevronLeft className="w-4 h-4" /> Ödeme sayfasını kapat
                  </button>
                  <h3 className="font-bold text-gray-800 mb-2">Online ödeme</h3>
                  <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                    {trCheckout?.gateway === "stripe"
                      ? "Kartla ödeme Stripe üzerinden alınır."
                      : "Tutar mağazanın PayTR veya iyzico hesabına aktarılır. İşlem sonunda otomatik olarak teşekkür sayfasına yönlendirilirsiniz."}
                  </p>
                  <TrCheckoutPanel
                    tr={trCheckout}
                    onStripeSucceeded={() => {
                      setTrCheckout(null);
                      setCheckoutStep("done");
                      setCart([]);
                      setCartOpen(false);
                      setPayReturnNotice("paid");
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {authOpen ? (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          onSessionChange={() => {
            addressPrefillForUserId.current = null;
          }}
        />
      ) : null}
    </div>
    </VendorThemeShell>
  );
}
