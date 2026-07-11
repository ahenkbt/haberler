import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";

const API = "/api";

interface CourierOrder {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string | null;
  customer_district: string | null;
  vendor_name: string;
  vendor_phone?: string | null;
  vendor_address: string | null;
  status: string;
  total: string;
  notes: string | null;
  vendor_note?: string | null;
  estimated_time?: number | null;
  driver_name: string | null;
  delivery_proof_url: string | null;
  created_at: string;
  picked_up_at: string | null;
  delivered_at: string | null;
}


interface CourierSession {
  id: number;
  name: string;
  phone: string;
  token?: string;
}

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  pending:   { label: "Bekliyor",       bg: "bg-amber-500/20",   text: "text-amber-300" },
  confirmed: { label: "Onaylandı",      bg: "bg-blue-500/20",    text: "text-blue-300" },
  preparing: { label: "Hazırlanıyor",   bg: "bg-indigo-500/20",  text: "text-indigo-300" },
  ready:     { label: "Hazır — Al!",    bg: "bg-purple-500/20",  text: "text-purple-300" },
  picked_up: { label: "Yolda",          bg: "bg-violet-500/20",  text: "text-violet-300" },
  delivered: { label: "Teslim Edildi",  bg: "bg-emerald-500/20", text: "text-emerald-300" },
  cancelled: { label: "İptal",          bg: "bg-red-500/20",     text: "text-red-300" },
};

const SESSION_KEY = "courierSession";

function loadSession(): CourierSession | null {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null"); } catch { return null; }
}
function saveSession(s: CourierSession) { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
function clearSession() { localStorage.removeItem(SESSION_KEY); }
function courierAuthHeaders(session: CourierSession): Record<string, string> {
  return session.token ? { Authorization: `Bearer ${session.token}` } : {};
}

export default function KuryePaneli() {
  const [session, setSession] = useState<CourierSession | null>(loadSession);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [orders, setOrders] = useState<CourierOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [locationTrackEnabled, setLocationTrackEnabled] = useState(false);
  const [locationTrackError, setLocationTrackError] = useState("");

  const [proofModal, setProofModal] = useState<{ orderId: number } | null>(null);
  const [proofDataUrl, setProofDataUrl] = useState<string>("");
  const [uploadingProof, setUploadingProof] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Şifre Değiştirme */
  const [pwModal, setPwModal] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwNew2, setPwNew2] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  /* Otomatik sipariş yükleme */
  useEffect(() => {
    if (session) loadOrders(session.phone);
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const t = setInterval(() => loadOrders(session.phone), 30_000);
    return () => clearInterval(t);
  }, [session]);

  const liveTrackOrder = orders.find((o) => o.status === "picked_up" || o.status === "on_the_way") ?? null;

  useEffect(() => {
    if (!session || !liveTrackOrder) return;
    if (!("geolocation" in navigator)) return;
    let stopped = false;
    let watchId: number | null = null;
    let lastSentAt = 0;
    setLocationTrackError("");

    const sendLocation = async (pos: GeolocationPosition) => {
      const now = Date.now();
      if (now - lastSentAt < 8000) return;
      lastSentAt = now;
      const { latitude, longitude, accuracy, heading, speed } = pos.coords;
      try {
        const res = await fetch(`${API}/courier/location`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...courierAuthHeaders(session) },
          body: JSON.stringify({
            orderId: liveTrackOrder.id,
            lat: latitude,
            lng: longitude,
            accuracy,
            heading,
            speed,
          }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setLocationTrackError(d?.error ? String(d.error) : "Konum gönderilemedi");
          return;
        }
        setLocationTrackEnabled(true);
      } catch {
        setLocationTrackError("Konum gönderiminde bağlantı hatası");
      }
    };

    const onErr = (err: GeolocationPositionError) => {
      if (stopped) return;
      setLocationTrackEnabled(false);
      if (err.code === err.PERMISSION_DENIED) setLocationTrackError("Konum izni reddedildi");
      else setLocationTrackError("Konum alınamadı");
    };

    navigator.geolocation.getCurrentPosition((p) => { void sendLocation(p); }, onErr, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    watchId = navigator.geolocation.watchPosition((p) => { void sendLocation(p); }, onErr, { enableHighAccuracy: true, timeout: 20000, maximumAge: 2000 });
    return () => {
      stopped = true;
      setLocationTrackEnabled(false);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [session?.phone, liveTrackOrder?.id]);

  async function loadOrders(ph: string) {
    setOrdersLoading(true);
    try {
      if (!session) return;
      const res = await fetch(`${API}/courier/orders`, { headers: courierAuthHeaders(session) });
      if (res.ok) setOrders(await res.json());
    } catch { /* noop */ } finally { setOrdersLoading(false); }
  }

  async function login() {
    if (!phone.trim() || !password.trim()) return;
    setLoginLoading(true); setLoginError("");
    try {
      const res = await fetch(`${API}/courier/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), password: password.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setLoginError(data.error || "Giriş başarısız"); return; }
      const s: CourierSession = { id: data.id, name: data.name, phone: data.phone, token: data.token };
      saveSession(s);
      setSession(s);
    } catch { setLoginError("Bağlantı hatası. Tekrar deneyin."); }
    finally { setLoginLoading(false); }
  }

  function logout() {
    clearSession();
    setSession(null);
    setOrders([]);
    setPhone("");
    setPassword("");
  }

  async function updateStatus(orderId: number, status: string, proofUrl?: string) {
    if (!session) return;
    setUpdatingId(orderId);
    try {
      const res = await fetch(`${API}/courier/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...courierAuthHeaders(session) },
        body: JSON.stringify({ status, proofUrl }),
      });
      if (res.ok) { await loadOrders(session.phone); }
      else { const d = await res.json(); alert(d.error || "Hata oluştu"); }
    } catch { alert("Bağlantı hatası"); }
    finally { setUpdatingId(null); }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setProofDataUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function submitProof() {
    if (!proofModal) return;
    setUploadingProof(true);
    await updateStatus(proofModal.orderId, "delivered", proofDataUrl || undefined);
    setUploadingProof(false);
    setProofModal(null);
    setProofDataUrl("");
  }

  /* Chat — yeni sistem: sipariş DM odası aç */
  async function openChat(o: CourierOrder) {
    if (!session) return;
    try {
      const r = await fetch(`${API}/chat/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "order_dm",
          orderId: o.id,
          orderNumber: o.order_number,
          name: `#${o.order_number} — Kurye & İşletme`,
          createdByType: "courier",
          createdById: String(session.phone || session.id),
          members: [
            { type: "courier", id: String(session.phone || session.id), name: session.name || session.phone },
            { type: "vendor",  id: String(o.vendor_name), name: o.vendor_name },
          ],
        }),
      });
      if (r.ok) {
        const room = await r.json();
        window.dispatchEvent(new CustomEvent("Yekpare:openChatRoom", { detail: { roomId: room.id } }));
      }
    } catch { /* noop */ }
  }

  /* Şifre Değiştirme */
  async function changePassword() {
    if (!session) return;
    setPwError(""); setPwSuccess(false);
    if (!pwCurrent || !pwNew || !pwNew2) { setPwError("Tüm alanları doldurun"); return; }
    if (pwNew !== pwNew2) { setPwError("Yeni şifreler eşleşmiyor"); return; }
    if (pwNew.length < 4) { setPwError("Yeni şifre en az 4 karakter olmalı"); return; }
    setPwLoading(true);
    try {
      const res = await fetch(`${API}/courier/change-password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...courierAuthHeaders(session) },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      });
      const data = await res.json();
      if (!res.ok) { setPwError(data.error || "Şifre değiştirilemedi"); return; }
      setPwSuccess(true);
      setPwCurrent(""); setPwNew(""); setPwNew2("");
      setTimeout(() => { setPwModal(false); setPwSuccess(false); }, 2000);
    } catch { setPwError("Bağlantı hatası"); }
    finally { setPwLoading(false); }
  }

  /* ── Login Ekranı ── */
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🚴</div>
            <h1 className="text-2xl font-black text-white mb-1">Kurye Paneli</h1>
            <p className="text-white/40 text-sm">Telefon numaranız ve şifrenizle giriş yapın</p>
          </div>
          <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-white/50 text-xs font-medium mb-2 tracking-wide">Telefon Numarası</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === "Enter" && login()}
                placeholder="05xx xxx xx xx"
                className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm outline-none focus:border-violet-400/70 focus:bg-white/10 transition"
              />
            </div>
            <div>
              <label className="block text-white/50 text-xs font-medium mb-2 tracking-wide">Şifre</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && login()}
                placeholder="Şifrenizi girin"
                className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm outline-none focus:border-violet-400/70 focus:bg-white/10 transition"
              />
              <p className="text-white/25 text-xs mt-1.5">İlk girişte şifreniz işletme tarafından belirlenir.</p>
            </div>
            {loginError && <p className="text-red-400 text-sm bg-red-500/10 rounded-xl px-3 py-2">{loginError}</p>}
            <button
              onClick={login}
              disabled={loginLoading || !phone.trim() || !password.trim()}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition text-sm"
            >
              {loginLoading ? "Giriş yapılıyor…" : "Giriş Yap"}
            </button>
          </div>
          <p className="text-center text-white/30 text-xs mt-4">
            <Link href="/" className="hover:text-white/50">← Ana Sayfa</Link>
          </p>
        </div>
      </div>
    );
  }

  const activeOrders = orders.filter(o => !["delivered", "cancelled"].includes(o.status));
  const doneOrders   = orders.filter(o => ["delivered", "cancelled"].includes(o.status));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 sticky top-0 z-10 bg-slate-900/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚴</span>
            <div>
              <div className="text-white font-semibold text-sm">{session.name || "Kurye"}</div>
              <div className="text-white/40 text-xs">{session.phone}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setPwModal(true); setPwError(""); setPwSuccess(false); }}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 text-xs rounded-lg border border-white/10 transition"
            >
              🔑 Şifre
            </button>
            <button
              onClick={() => session && loadOrders(session.phone)}
              disabled={ordersLoading}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 text-xs rounded-lg border border-white/10 transition"
            >
              ↻ Yenile
            </button>
            <button onClick={logout} className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs rounded-lg border border-red-500/20 transition">
              Çıkış
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {liveTrackOrder && (
          <div className={`rounded-xl border px-4 py-3 text-xs ${locationTrackEnabled ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200" : "bg-amber-500/10 border-amber-500/30 text-amber-200"}`}>
            {locationTrackEnabled ? `📍 Canlı konum paylaşımı aktif (#${liveTrackOrder.order_number})` : `📍 Canlı konum başlatılıyor (#${liveTrackOrder.order_number})`}
            {locationTrackError ? <span className="block mt-1 text-red-300">{locationTrackError}</span> : null}
          </div>
        )}
        {orders.length === 0 && !ordersLoading && (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📦</div>
            <div className="text-white/40 text-sm">Henüz size atanmış aktif sipariş yok.</div>
            <button onClick={() => loadOrders(session.phone)} className="mt-4 text-xs text-violet-400 hover:text-violet-300">Yenile</button>
          </div>
        )}
        {ordersLoading && orders.length === 0 && (
          <div className="text-center py-16 text-white/30 text-sm">Siparişler yükleniyor…</div>
        )}

        {/* Aktif siparişler */}
        {activeOrders.length > 0 && (
          <section>
            <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-3">Aktif Siparişler ({activeOrders.length})</h2>
            <div className="space-y-4">
              {activeOrders.map(o => {
                const sm = STATUS_MAP[o.status] || { label: o.status, bg: "bg-slate-500/20", text: "text-slate-300" };
                const isUpdating = updatingId === o.id;
                return (
                  <div key={o.id} className="bg-white/[0.06] border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-white font-bold text-sm">#{o.order_number}</span>
                        <span className="text-white/40 text-xs ml-2">{new Date(o.created_at).toLocaleString("tr-TR")}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sm.bg} ${sm.text}`}>{sm.label}</span>
                    </div>

                    {(o.estimated_time || o.vendor_note) && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-3 space-y-1">
                        {o.estimated_time && <div className="text-amber-300 text-xs">⏱ Tahmini teslimat: <strong>{o.estimated_time} dk</strong></div>}
                        {o.vendor_note && <div className="text-amber-200/70 text-xs">📝 {o.vendor_note}</div>}
                      </div>
                    )}

                    <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 mb-3">
                      <div className="text-violet-300 text-xs font-semibold mb-1">📍 Alınacak Yer</div>
                      <div className="text-white text-sm font-semibold">{o.vendor_name}</div>
                      {o.vendor_address && <div className="text-white/50 text-xs mt-0.5">{o.vendor_address}</div>}
                      {o.vendor_phone && (
                        <a href={`tel:${o.vendor_phone}`} className="mt-1.5 inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300">
                          📞 {o.vendor_phone}
                        </a>
                      )}
                    </div>

                    <div className="bg-white/[0.04] border border-white/10 rounded-xl p-3 mb-3">
                      <div className="text-white/50 text-xs font-semibold mb-1">🏠 Teslimat Adresi</div>
                      <div className="text-white text-sm font-semibold">{o.customer_name}</div>
                      <div className="text-white/60 text-xs mt-0.5">
                        {o.customer_address}{o.customer_district ? `, ${o.customer_district}` : ""}{o.customer_city ? `, ${o.customer_city}` : ""}
                      </div>
                      {o.customer_phone && (
                        <a href={`tel:${o.customer_phone}`} className="mt-1.5 inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300">
                          📞 {o.customer_phone}
                        </a>
                      )}
                      {o.notes && <div className="text-amber-300/70 text-xs mt-1.5">📝 {o.notes}</div>}
                    </div>

                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-white font-bold text-sm">₺{Number(o.total).toFixed(2)}</span>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => openChat(o)}
                          className="px-3 py-1.5 bg-sky-500/15 border border-sky-500/30 text-sky-300 hover:bg-sky-500/30 text-xs font-semibold rounded-xl transition"
                        >
                          💬 Sohbet
                        </button>
                        {o.status === "ready" && (
                          <button
                            onClick={() => updateStatus(o.id, "picked_up")}
                            disabled={isUpdating}
                            className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition"
                          >
                            {isUpdating ? "…" : "🚴 Teslim Aldım / Yola Çıktım"}
                          </button>
                        )}
                        {o.status === "picked_up" && (
                          <button
                            onClick={() => setProofModal({ orderId: o.id })}
                            disabled={isUpdating}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition"
                          >
                            ✓ Teslim Ettim
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Tamamlanan siparişler */}
        {doneOrders.length > 0 && (
          <section>
            <h2 className="text-white/40 text-xs font-semibold uppercase tracking-wide mb-3">Tamamlananlar ({doneOrders.length})</h2>
            <div className="space-y-2">
              {doneOrders.map(o => {
                const sm = STATUS_MAP[o.status] || { label: o.status, bg: "bg-slate-500/20", text: "text-slate-300" };
                return (
                  <div key={o.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <span className="text-white/60 text-sm font-semibold">#{o.order_number}</span>
                      <span className="text-white/30 text-xs ml-2">{o.customer_name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {o.delivery_proof_url && (
                        <button
                          onClick={() => {
                            const img = document.createElement("img");
                            img.src = o.delivery_proof_url!;
                            img.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;object-fit:contain;background:#000;z-index:9999;cursor:pointer;";
                            img.onclick = () => img.remove();
                            document.body.appendChild(img);
                          }}
                          className="text-xs text-violet-400 hover:text-violet-300"
                        >
                          📷 Kanıt
                        </button>
                      )}
                      <button
                        onClick={() => openChat(o)}
                        className="text-xs text-sky-400 hover:text-sky-300"
                      >
                        💬
                      </button>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sm.bg} ${sm.text}`}>{sm.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* ── Teslim Kanıtı Modalı ── */}
      {proofModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setProofModal(null)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold text-base mb-2">Teslim Kanıtı</h3>
            <p className="text-white/50 text-xs mb-4">Siparişi teslim ettiğinize dair fotoğraf ekleyin (isteğe bağlı).</p>
            <div className="mb-4">
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
              {proofDataUrl ? (
                <div className="relative">
                  <img src={proofDataUrl} alt="proof" className="w-full rounded-xl object-cover max-h-48" />
                  <button
                    onClick={() => { setProofDataUrl(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                  >✕</button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-white/20 rounded-xl py-8 text-center text-white/40 hover:border-violet-400/40 hover:text-white/60 transition"
                >
                  <div className="text-3xl mb-2">📷</div>
                  <div className="text-sm">Fotoğraf çek veya galeriden seç</div>
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setProofModal(null); setProofDataUrl(""); }} className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/60 text-sm rounded-xl border border-white/10 transition">İptal</button>
              <button onClick={submitProof} disabled={uploadingProof} className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition">
                {uploadingProof ? "Kaydediliyor…" : proofDataUrl ? "✓ Teslim Edildi" : "Fotoğrafsız Teslim Et"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Şifre Değiştirme Modalı ── */}
      {pwModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setPwModal(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-base">🔑 Şifre Değiştir</h3>
              <button onClick={() => setPwModal(false)} className="text-white/40 hover:text-white text-xl leading-none">✕</button>
            </div>
            {pwSuccess ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-3">✅</div>
                <div className="text-emerald-400 font-semibold">Şifre başarıyla değiştirildi!</div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-white/40 text-xs mb-1">Mevcut Şifre</label>
                  <input
                    type="password"
                    value={pwCurrent}
                    onChange={e => setPwCurrent(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-violet-400/70 placeholder-white/25"
                    placeholder="Mevcut şifreniz"
                  />
                </div>
                <div>
                  <label className="block text-white/40 text-xs mb-1">Yeni Şifre</label>
                  <input
                    type="password"
                    value={pwNew}
                    onChange={e => setPwNew(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-violet-400/70 placeholder-white/25"
                    placeholder="En az 4 karakter"
                  />
                </div>
                <div>
                  <label className="block text-white/40 text-xs mb-1">Yeni Şifre (Tekrar)</label>
                  <input
                    type="password"
                    value={pwNew2}
                    onChange={e => setPwNew2(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && changePassword()}
                    className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-violet-400/70 placeholder-white/25"
                    placeholder="Tekrar girin"
                  />
                </div>
                {pwError && <p className="text-red-400 text-sm bg-red-500/10 rounded-xl px-3 py-2">{pwError}</p>}
                <button
                  onClick={changePassword}
                  disabled={pwLoading}
                  className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition mt-1"
                >
                  {pwLoading ? "Kaydediliyor…" : "Şifreyi Güncelle"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
