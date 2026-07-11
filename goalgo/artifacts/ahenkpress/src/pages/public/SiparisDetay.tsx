import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link } from "wouter";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { Package, Truck, CheckCircle, Clock, XCircle, Search, ShoppingBag, Phone, MessageSquare, Send, Star, AlertTriangle } from "lucide-react";
import L from "leaflet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { format, addMinutes } from "date-fns";
import { tr } from "date-fns/locale";
import { deliveryTrackingQuery, readDeliveryTrackingFromUrl } from "@/lib/deliveryTracking";

interface DeliveryOrder {
  id: number;
  orderNumber: string;
  order_number?: string;
  customerName: string;
  customer_name?: string;
  customerPhone: string;
  customer_phone?: string;
  status: string;
  paymentStatus: string;
  payment_status?: string;
  total: string;
  subtotal?: string;
  items?: string;
  driverName?: string;
  driver_name?: string;
  driverPhone?: string;
  driver_phone?: string;
  estimatedTime?: number;
  estimated_time?: number;
  notes?: string;
  vendorNote?: string;
  vendor_note?: string;
  vendorPhone?: string;
  vendor_phone?: string;
  vendorName?: string;
  vendor_name?: string;
  createdAt?: string;
  created_at?: string;
  confirmedAt?: string;
  confirmed_at?: string;
  cancelReason?: string;
  cancel_reason?: string;
  courierName?: string;
  courierPhone?: string;
  hasReview?: boolean;
  statusEvents?: DeliveryOrderStatusEvent[];
}

interface DeliveryOrderStatusEvent {
  id: number;
  fromStatus?: string | null;
  from_status?: string | null;
  toStatus?: string;
  to_status?: string;
  source?: string;
  createdAt?: string;
  created_at?: string;
}

interface ChatMessage {
  id: number;
  senderType?: string;
  sender_type?: string;
  senderName?: string;
  sender_name?: string;
  message: string;
  createdAt?: string;
  created_at?: string;
}

interface DriverLiveLocation {
  lat: number;
  lng: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  createdAt: string;
}

/** İlerleme çubuğu — API'deki on_the_way ile işletme panelindeki picked_up aynı "yolda" adımı */
const DELIVERY_STEP_ORDER = ["pending", "confirmed", "preparing", "ready", "on_the_way", "delivered"] as const;

function deliveryStatusToStepIndex(s: string): number {
  const norm = s === "picked_up" ? "on_the_way" : s;
  const i = (DELIVERY_STEP_ORDER as readonly string[]).indexOf(norm);
  return i >= 0 ? i : 0;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Sipariş Alındı",
  confirmed: "Onaylandı",
  preparing: "Hazırlanıyor",
  ready: "Hazır / Teslim Bekliyor",
  picked_up: "Kuryede",
  on_the_way: "Yolda",
  delivered: "Teslim Edildi",
  cancelled: "İptal Edildi",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-700 bg-yellow-50 border-yellow-200",
  confirmed: "text-blue-700 bg-blue-50 border-blue-200",
  preparing: "text-indigo-700 bg-indigo-50 border-indigo-200",
  ready: "text-purple-700 bg-purple-50 border-purple-200",
  picked_up: "text-orange-700 bg-orange-50 border-orange-200",
  on_the_way: "text-orange-700 bg-orange-50 border-orange-200",
  delivered: "text-green-700 bg-green-50 border-green-200",
  cancelled: "text-red-700 bg-red-50 border-red-200",
};

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  pending: Clock,
  confirmed: Package,
  preparing: Package,
  ready: Truck,
  picked_up: Truck,
  on_the_way: Truck,
  delivered: CheckCircle,
  cancelled: XCircle,
};

export default function SiparisDetay() {
  const { code } = useParams<{ code: string }>();
  const { data: settings } = useGetSiteSettings();
  const [order, setOrder] = useState<DeliveryOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchCode, setSearchCode] = useState(code ?? "");
  const [searched, setSearched] = useState(false);
  const [trackingToken, setTrackingToken] = useState(() => readDeliveryTrackingFromUrl().token);
  const [phoneLast4, setPhoneLast4] = useState(() => readDeliveryTrackingFromUrl().phoneLast4);
  const [verifyLast4, setVerifyLast4] = useState("");
  const [needsVerify, setNeedsVerify] = useState(false);

  const authQs = () => deliveryTrackingQuery(trackingToken, phoneLast4 || verifyLast4);

  /* Chat */
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  /* İptal */
  const [cancelling, setCancelling] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  /* Değerlendirme */
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewName, setReviewName] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);
  const [driverLiveLocation, setDriverLiveLocation] = useState<DriverLiveLocation | null>(null);
  const [driverLiveAgeSec, setDriverLiveAgeSec] = useState<number | null>(null);
  const [driverLiveStale, setDriverLiveStale] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const liveMapObjRef = useRef<L.Map | null>(null);
  const liveMapMarkerRef = useRef<L.Marker | null>(null);

  const siteName = (settings?.logoText1 ?? "Yek") + (settings?.logoText2 ?? "pare");

  const fetchOrder = async (trackCode: string) => {
    if (!trackCode.trim()) return;
    setLoading(true); setError(""); setSearched(true);
    try {
      const clean = trackCode.trim();
      const dRes = await fetch(`/api/delivery/orders/${encodeURIComponent(clean)}${authQs()}`);
      if (dRes.status === 403) {
        setNeedsVerify(true);
        setError("Devam etmek için telefon numaranızın son 4 hanesini girin.");
        setOrder(null);
        return;
      }
      if (dRes.ok) {
        const d = await dRes.json();
        if (d && d.id) {
          setOrder(d);
          setNeedsVerify(false);
          if (d.trackingToken) setTrackingToken(String(d.trackingToken));
          return;
        }
      }
      setError("Sipariş bulunamadı. Takip kodunuzu kontrol edin."); setOrder(null);
    } catch { setError("Bağlantı hatası. Tekrar deneyin."); }
    finally { setLoading(false); }
  };

  const silentRefreshOrder = useCallback(async (orderNumStr: string) => {
    const clean = orderNumStr.trim();
    if (!clean) return;
    try {
      const dRes = await fetch(`/api/delivery/orders/${encodeURIComponent(clean)}${authQs()}`);
      if (dRes.ok) {
        const d = await dRes.json();
        if (d?.id) setOrder(d);
      }
    } catch { /* sessiz yenileme */ }
  }, [trackingToken, phoneLast4, verifyLast4]);

  useEffect(() => { if (code) fetchOrder(code); }, [code]);

  useEffect(() => {
    const num = order?.orderNumber || order?.order_number;
    if (!order || !num || order.status === "delivered" || order.status === "cancelled") return;
    const id = window.setInterval(() => { void silentRefreshOrder(num); }, 40000);
    return () => window.clearInterval(id);
  }, [order?.id, order?.status, order?.orderNumber, order?.order_number, silentRefreshOrder]);

  /* Chat helpers */
  const orderNum = order?.orderNumber || order?.order_number || "";

  const loadMessages = async () => {
    if (!orderNum) return;
    setChatLoading(true);
    try {
      const r = await fetch(`/api/delivery/orders/${orderNum}/messages${authQs()}`);
      if (r.ok) setMessages(await r.json());
    } catch { /* noop */ }
    finally { setChatLoading(false); }
  };

  const openChat = async () => {
    setChatOpen(true);
    await loadMessages();
    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || !orderNum) return;
    const r = await fetch(`/api/delivery/orders/${orderNum}/messages${authQs()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderType: "customer",
        senderName: order?.customerName || order?.customer_name || "Müşteri",
        message: chatInput.trim(),
      }),
    });
    if (r.ok) {
      const msg = await r.json();
      setMessages(prev => [...prev, msg]);
      setChatInput("");
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  /* Cancel order */
  const cancelOrder = async () => {
    if (!orderNum) return;
    setCancelling(true);
    try {
      const r = await fetch(`/api/delivery/orders/${orderNum}/cancel${authQs()}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Müşteri tarafından iptal edildi" }),
      });
      if (r.ok) {
        setCancelConfirm(false);
        await fetchOrder(orderNum);
      } else {
        const d = await r.json();
        alert(d.error || "İptal işlemi başarısız oldu.");
      }
    } catch { alert("Bağlantı hatası"); }
    finally { setCancelling(false); }
  };

  /* Review submit */
  const submitReview = async () => {
    if (!reviewRating || !reviewName.trim() || !orderNum) return;
    setReviewSubmitting(true);
    try {
      const r = await fetch(`/api/delivery/orders/${orderNum}/review${authQs()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName: reviewName.trim(), rating: reviewRating, comment: reviewComment.trim() || undefined }),
      });
      if (r.ok) {
        setReviewDone(true);
        setOrder(prev => prev ? { ...prev, hasReview: true } : prev);
      } else {
        const d = await r.json();
        alert(d.error || "Değerlendirme gönderilemedi.");
      }
    } catch { alert("Bağlantı hatası"); }
    finally { setReviewSubmitting(false); }
  };

  const status = order?.status ?? "";
  const statusIdx = deliveryStatusToStepIndex(status);
  const et = order?.estimatedTime ?? order?.estimated_time;
  const confirmedAtRaw = order?.confirmedAt ?? order?.confirmed_at;
  const note = order?.vendorNote ?? order?.vendor_note;
  const driverName = order?.driverName ?? order?.driver_name;
  const driverPhone = order?.driverPhone ?? order?.driver_phone;
  const vendorPhone = order?.vendorPhone ?? order?.vendor_phone;
  const vendorName = order?.vendorName ?? order?.vendor_name;
  const items = (() => { try { return order?.items ? JSON.parse(order.items) : []; } catch { return []; } })();
  const canCancel = ["pending", "confirmed"].includes(status);
  const slaDeadline =
    et && confirmedAtRaw && status !== "cancelled" && status !== "delivered"
      ? addMinutes(new Date(confirmedAtRaw), Number(et))
      : null;
  const slaOverdue = !!slaDeadline && Date.now() > slaDeadline.getTime();
  const isLiveTrackStatus = status === "picked_up" || status === "on_the_way";

  useEffect(() => {
    if (!orderNum || !isLiveTrackStatus) {
      setDriverLiveLocation(null);
      setDriverLiveAgeSec(null);
      setDriverLiveStale(false);
      return;
    }
    let stopped = false;
    const loadLocation = async () => {
      try {
        const r = await fetch(`/api/delivery/orders/${encodeURIComponent(orderNum)}/driver-location${authQs()}`);
        if (!r.ok) return;
        const d = await r.json();
        if (stopped) return;
        if (d?.success && d?.location?.lat && d?.location?.lng) {
          setDriverLiveLocation({
            lat: Number(d.location.lat),
            lng: Number(d.location.lng),
            accuracy: d.location.accuracy ?? null,
            heading: d.location.heading ?? null,
            speed: d.location.speed ?? null,
            createdAt: String(d.location.createdAt ?? new Date().toISOString()),
          });
          setDriverLiveAgeSec(typeof d.ageSec === "number" ? d.ageSec : null);
          setDriverLiveStale(Boolean(d.stale));
        } else {
          setDriverLiveLocation(null);
          setDriverLiveAgeSec(null);
          setDriverLiveStale(false);
        }
      } catch {
        // sessiz
      }
    };
    void loadLocation();
    const id = window.setInterval(() => { void loadLocation(); }, 10000);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [orderNum, isLiveTrackStatus, trackingToken, phoneLast4, verifyLast4]);

  useEffect(() => {
    if (!mapRef.current || !driverLiveLocation) return;
    const center: [number, number] = [driverLiveLocation.lat, driverLiveLocation.lng];
    if (!liveMapObjRef.current) {
      const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: false }).setView(center, 15);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap katkıcıları",
      }).addTo(map);
      liveMapMarkerRef.current = L.marker(center).addTo(map);
      liveMapObjRef.current = map;
      return;
    }
    liveMapMarkerRef.current?.setLatLng(center);
    liveMapObjRef.current.panTo(center, { animate: true, duration: 0.5 });
  }, [driverLiveLocation?.lat, driverLiveLocation?.lng]);

  useEffect(() => () => {
    if (liveMapObjRef.current) {
      liveMapObjRef.current.remove();
      liveMapObjRef.current = null;
      liveMapMarkerRef.current = null;
    }
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      <header className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-black tracking-tighter">
            <span className="text-[#e61e25]">{settings?.logoText1 || "Yek"}</span>
            <span>{settings?.logoText2 || "pare"}</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/siparislerim" className="flex items-center gap-1 hover:text-[#e61e25] text-gray-500">
              <Package className="w-4 h-4" /> Siparişlerim
            </Link>
            <Link href="/siparis" className="flex items-center gap-1 hover:text-[#e61e25]">
              <ShoppingBag className="w-4 h-4" /> Sipariş Ver
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#e61e25]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Truck className="w-7 h-7 text-[#e61e25]" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-1">Sipariş Takibi</h1>
          <p className="text-gray-500 text-sm">{siteName} üzerinden verdiğiniz siparişin anlık durumu</p>
        </div>

        {/* Arama */}
        <div className="bg-white rounded-xl border p-5 mb-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchCode}
                onChange={e => setSearchCode(e.target.value)}
                placeholder="Sipariş numaranızı girin (örn: YEK12345678)"
                className="pl-9"
                onKeyDown={e => e.key === "Enter" && fetchOrder(searchCode)}
              />
            </div>
            <Button onClick={() => fetchOrder(searchCode)} disabled={loading} className="bg-[#e61e25] hover:bg-[#c9181e] text-white px-6">
              {loading ? "Aranıyor..." : "Sorgula"}
            </Button>
          </div>
          {needsVerify ? (
            <div className="mt-4 flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">Telefon son 4 hane</label>
                <Input
                  value={verifyLast4}
                  onChange={e => setVerifyLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="örn: 4567"
                  maxLength={4}
                  inputMode="numeric"
                />
              </div>
              <Button
                onClick={() => fetchOrder(searchCode || code || "")}
                disabled={loading || verifyLast4.length !== 4}
                className="bg-[#0f766e] hover:bg-[#0b5f59] text-white"
              >
                Doğrula
              </Button>
            </div>
          ) : null}
        </div>

        {searched && error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
            <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        {order && (
          <div className="space-y-4">
            {/* Durum kartı */}
            <div className={`rounded-xl border p-5 ${STATUS_COLORS[status] ?? "bg-gray-50 border-gray-200"}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-lg">{STATUS_LABELS[status] ?? status}</span>
                <span className="text-xs font-mono opacity-70">{orderNum}</span>
              </div>
              <p className="text-sm opacity-80">Müşteri: <strong>{order.customerName ?? order.customer_name}</strong></p>
              {order.createdAt || order.created_at ? (
                <p className="text-xs opacity-60 mt-1">
                  {format(new Date((order.createdAt || order.created_at)!), "d MMMM yyyy HH:mm", { locale: tr })} tarihinde oluşturuldu
                </p>
              ) : null}
            </div>

            {slaOverdue && slaDeadline && (
              <div className="bg-red-50 border border-red-300 rounded-xl p-4 flex gap-3 items-start">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-900 text-sm">Tahmini teslim süresi geçti</p>
                  <p className="text-red-800 text-xs mt-1 leading-relaxed">
                    Verilen {et} dakikalık hedef ({format(slaDeadline, "d MMM yyyy HH:mm", { locale: tr })} civarı) aşıldı.
                    Gecikme yaşanmış olabilir; aşağıdaki iletişimden işletme veya kuryeye ulaşabilirsiniz.
                  </p>
                </div>
              </div>
            )}

            {/* Tahmini teslimat süresi & işletme notu */}
            {(et || note) && status !== "cancelled" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                {et && (
                  <div className="flex items-center gap-2 text-amber-800">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span className="font-semibold text-sm">Tahmini teslimat süresi: {et} dakika</span>
                  </div>
                )}
                {et && confirmedAtRaw && (
                  <p className="text-xs text-amber-900 leading-snug">
                    Onay saati: {format(new Date(confirmedAtRaw), "d MMM yyyy HH:mm", { locale: tr })} — hedef teslim bandı (yaklaşık):{" "}
                    <strong>{format(addMinutes(new Date(confirmedAtRaw), et), "d MMM HH:mm", { locale: tr })}</strong>
                    {" "}(onay + {et} dk)
                  </p>
                )}
                {note && (
                  <div className="text-amber-700 text-sm leading-relaxed border-t border-amber-200 pt-2 mt-2">
                    <span className="font-semibold">İşletme notu: </span>{note}
                  </div>
                )}
                {canCancel && (
                  <p className="text-amber-600 text-xs mt-1">
                    Teslimat süresini uzun buluyorsanız siparişinizi iptal edebilirsiniz.
                  </p>
                )}
              </div>
            )}

            {/* Progres adımları */}
            {status !== "cancelled" && (
              <div className="bg-white rounded-xl border p-5">
                <h3 className="font-bold text-sm mb-4 text-gray-700">Sipariş Durumu</h3>
                <div className="relative flex items-start justify-between">
                  {DELIVERY_STEP_ORDER.map((step, i) => {
                    const Icon = STATUS_ICONS[step] ?? Clock;
                    const done = statusIdx >= i;
                    const current = statusIdx === i;
                    return (
                      <div key={step} className="flex-1 flex flex-col items-center gap-1 relative">
                        {i < DELIVERY_STEP_ORDER.length - 1 && (
                          <div className={`absolute top-5 left-1/2 w-full h-0.5 ${done && statusIdx > i ? "bg-[#e61e25]" : "bg-gray-200"}`} />
                        )}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 transition-colors ${done ? "bg-[#e61e25] border-[#e61e25] text-white" : "bg-gray-100 border-gray-200 text-gray-400"} ${current ? "ring-4 ring-red-100" : ""}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className={`text-[9px] font-bold text-center leading-tight ${done ? "text-[#e61e25]" : "text-gray-400"}`}>
                          {STATUS_LABELS[step]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {order.statusEvents && order.statusEvents.length > 0 && (
              <div className="bg-white rounded-xl border p-5">
                <h3 className="font-bold text-sm mb-3 text-gray-700 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#e61e25]" /> Durum geçmişi
                </h3>
                <ul className="space-y-3 text-sm border-l-2 border-gray-200 ml-1.5 pl-3">
                  {order.statusEvents.map(ev => {
                    const to = ev.toStatus ?? ev.to_status ?? "";
                    const from = ev.fromStatus ?? ev.from_status ?? null;
                    const ts = ev.createdAt ?? ev.created_at ?? "";
                    const src = ev.source ?? "";
                    const srcLabel = src === "admin_api" ? "Yönetim"
                      : src === "customer_cancel" ? "Müşteri"
                        : src === "order_create" ? "Sipariş"
                          : src === "vendor_panel" ? "İşletme paneli"
                            : src === "courier_panel" ? "Kurye"
                              : src === "staff_usta" ? "Usta"
                                : src || "—";
                    return (
                      <li key={ev.id}>
                        <span className="text-gray-800 font-medium">
                          {from ? `${STATUS_LABELS[from] ?? from} → ` : ""}{STATUS_LABELS[to] ?? to}
                        </span>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {ts ? format(new Date(ts), "d MMM yyyy HH:mm", { locale: tr }) : ""}
                          {ts ? " · " : ""}{srcLabel}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* İletişim bilgileri */}
            {(vendorPhone || driverPhone || driverName) && (
              <div className="bg-white rounded-xl border p-5">
                <h3 className="font-bold text-sm mb-3 text-gray-700 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#e61e25]" /> İletişim Bilgileri
                </h3>
                <div className="space-y-3">
                  {vendorPhone && (
                    <div className="flex items-center justify-between py-2 border-b">
                      <div>
                        <div className="text-xs text-gray-500">İşletme{vendorName ? ` — ${vendorName}` : ""}</div>
                        <a href={`tel:${vendorPhone}`} className="text-sm font-semibold text-[#e61e25] hover:underline">{vendorPhone}</a>
                      </div>
                      <a href={`tel:${vendorPhone}`} className="w-9 h-9 rounded-full bg-green-50 border border-green-200 flex items-center justify-center hover:bg-green-100 transition">
                        <Phone className="w-4 h-4 text-green-600" />
                      </a>
                    </div>
                  )}
                  {driverName && (
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <div className="text-xs text-gray-500">Kurye — {driverName}</div>
                        {driverPhone
                          ? <a href={`tel:${driverPhone}`} className="text-sm font-semibold text-[#e61e25] hover:underline">{driverPhone}</a>
                          : <span className="text-sm text-gray-400">Numara paylaşılmadı</span>}
                      </div>
                      {driverPhone && (
                        <a href={`tel:${driverPhone}`} className="w-9 h-9 rounded-full bg-green-50 border border-green-200 flex items-center justify-center hover:bg-green-100 transition">
                          <Phone className="w-4 h-4 text-green-600" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {isLiveTrackStatus && (
              <div className="bg-white rounded-xl border p-5">
                <h3 className="font-bold text-sm mb-3 text-gray-700 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#e61e25]" /> Canlı Kurye Konumu
                </h3>
                {driverLiveLocation ? (
                  <>
                    <div className={`text-xs mb-3 ${driverLiveStale ? "text-amber-700" : "text-emerald-700"}`}>
                      {driverLiveStale ? "Konum güncelliği düşük" : "Canlı takip aktif"}
                      {driverLiveAgeSec !== null ? ` · ${driverLiveAgeSec} sn önce güncellendi` : ""}
                    </div>
                    <div ref={mapRef} className="w-full h-56 rounded-xl border" />
                    <div className="mt-2 text-[11px] text-gray-500">
                      Enlem/Boylam: {driverLiveLocation.lat.toFixed(6)}, {driverLiveLocation.lng.toFixed(6)}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-gray-500">
                    Kurye konumu henüz paylaşılmadı. Kurye yola çıktığında burada canlı harita görünecek.
                  </div>
                )}
              </div>
            )}

            {/* Sipariş içeriği */}
            {items.length > 0 && (
              <div className="bg-white rounded-xl border p-5">
                <h3 className="font-bold text-sm mb-4 text-gray-700 flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#e61e25]" /> Sipariş İçeriği
                </h3>
                <div className="space-y-2">
                  {items.map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0">
                      {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-10 h-10 object-cover rounded-lg" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <p className="text-xs text-gray-500">Adet: {item.qty}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">₺{(item.total ?? item.unitPrice * item.qty)?.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t text-sm">
                  <div className="flex justify-between font-black text-base">
                    <span>Toplam</span>
                    <span className="text-[#e61e25]">₺{parseFloat(order.total).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Müşteri notu (varsa) */}
            {order.notes && (
              <div className="bg-white rounded-xl border p-4 text-sm text-gray-600">
                <span className="font-semibold text-gray-800">Sipariş notunuz: </span>{order.notes}
              </div>
            )}

            {/* Butonlar: Chat + İptal */}
            <div className="flex gap-3">
              <button
                onClick={openChat}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 font-semibold text-sm hover:bg-blue-100 transition"
              >
                <MessageSquare className="w-4 h-4" /> İşletme ile İletişim
              </button>
              {canCancel && (
                <button
                  onClick={() => setCancelConfirm(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 font-semibold text-sm hover:bg-red-100 transition"
                >
                  <XCircle className="w-4 h-4" /> Siparişi İptal Et
                </button>
              )}
            </div>

            {/* İptal onay */}
            {cancelConfirm && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-700 font-semibold text-sm mb-3">Siparişinizi iptal etmek istediğinizden emin misiniz?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCancelConfirm(false)}
                    className="flex-1 py-2 rounded-xl border border-gray-300 text-gray-600 text-sm hover:bg-gray-50 transition"
                  >
                    Vazgeç
                  </button>
                  <button
                    onClick={cancelOrder}
                    disabled={cancelling}
                    className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {cancelling ? "İptal ediliyor…" : "Evet, İptal Et"}
                  </button>
                </div>
              </div>
            )}

            {status === "cancelled" && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-red-700 font-semibold">Sipariş İptal Edildi</p>
                {(order.cancelReason ?? order.cancel_reason) && (
                  <p className="text-red-600 text-xs mt-1">{order.cancelReason ?? order.cancel_reason}</p>
                )}
              </div>
            )}

            {/* ── Değerlendirme Formu ── */}
            {status === "delivered" && !order.hasReview && !reviewDone && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" /> Siparişinizi Değerlendirin
                </h3>
                <p className="text-xs text-gray-500 mb-4">Deneyiminizi paylaşarak diğer kullanıcılara yardımcı olun.</p>
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[1,2,3,4,5].map(s => (
                    <button key={s}
                      onClick={() => setReviewRating(s)}
                      onMouseEnter={() => setReviewHover(s)}
                      onMouseLeave={() => setReviewHover(0)}
                      className="text-2xl transition-transform hover:scale-110"
                    >
                      <Star className={`w-7 h-7 ${(reviewHover || reviewRating) >= s ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
                    </button>
                  ))}
                  {reviewRating > 0 && (
                    <span className="ml-2 text-sm text-amber-700 font-semibold self-center">
                      {["","Çok kötü","Kötü","Orta","İyi","Mükemmel"][reviewRating]}
                    </span>
                  )}
                </div>
                <input
                  value={reviewName}
                  onChange={e => setReviewName(e.target.value)}
                  placeholder="Adınız"
                  className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm mb-2 outline-none focus:border-amber-400 bg-white"
                />
                <textarea
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  placeholder="Yorumunuz (isteğe bağlı)"
                  rows={2}
                  className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm mb-3 outline-none focus:border-amber-400 bg-white resize-none"
                />
                <button
                  onClick={submitReview}
                  disabled={!reviewRating || !reviewName.trim() || reviewSubmitting}
                  className="w-full py-2.5 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 transition disabled:opacity-50"
                >
                  {reviewSubmitting ? "Gönderiliyor…" : "Değerlendirmeyi Gönder"}
                </button>
              </div>
            )}

            {(reviewDone || (status === "delivered" && order.hasReview)) && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <CheckCircle className="w-7 h-7 text-green-500 mx-auto mb-1.5" />
                <p className="text-green-700 font-semibold text-sm">Değerlendirmeniz için teşekkürler!</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Chat Modal ── */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl flex flex-col border" style={{ maxHeight: "85vh" }}>
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b">
              <div>
                <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#e61e25]" /> İşletme & Kurye ile Sohbet
                </div>
                <div className="text-gray-400 text-xs">#{orderNum}</div>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2" style={{ minHeight: 200 }}>
              {chatLoading ? (
                <div className="text-center text-gray-400 text-sm py-8">Yükleniyor…</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-8">Henüz mesaj yok. İşletme veya kurye ile iletişime geçebilirsiniz.</div>
              ) : messages.map(m => {
                const st = m.senderType ?? m.sender_type ?? "";
                const ts = m.createdAt ?? m.created_at ?? "";
                return (
                  <div key={m.id} className={`flex ${st === "customer" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                      st === "customer"
                        ? "bg-[#e61e25] text-white"
                        : st === "courier"
                          ? "bg-purple-100 text-purple-900"
                          : "bg-gray-100 text-gray-800"
                    }`}>
                      <div className="text-[10px] opacity-70 mb-0.5 font-semibold">
                        {st === "customer" ? "Siz" : st === "courier" ? "Kurye" : "İşletme"}
                      </div>
                      {m.message}
                      {ts && (
                        <div className="text-[10px] opacity-50 mt-0.5 text-right">
                          {new Date(ts).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>
            <div className="border-t px-3 py-3 flex gap-2">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Mesajınızı yazın…"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#e61e25]/60"
              />
              <button
                onClick={sendMessage}
                className="px-4 py-2 bg-[#e61e25] text-white rounded-xl hover:bg-[#c9181e] transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
