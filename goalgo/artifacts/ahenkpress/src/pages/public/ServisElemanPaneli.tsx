import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";

const API = "/api";
const SESSION_KEY = "servisSession";

interface StaffSession { id: number; name: string; phone: string; role: string; vendorId: number; vendorName: string; }
interface MenuItem { id: number; name: string; price: string; description?: string; category_name?: string; }
interface CartItem { id: number | null; name: string; price: number; qty: number; manual?: boolean; }
interface Order {
  id: number; order_number: string; customer_name: string; customer_phone: string;
  customer_address: string; table_number?: string; order_source?: string;
  items: string; total: string; status: string; notes?: string;
  vendor_name: string; created_at: string;
}

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  pending:   { label: "Bekliyor",      bg: "bg-amber-500/20",   text: "text-amber-300" },
  confirmed: { label: "Onaylandı",     bg: "bg-blue-500/20",    text: "text-blue-300" },
  preparing: { label: "Hazırlanıyor",  bg: "bg-indigo-500/20",  text: "text-indigo-300" },
  ready:     { label: "Hazır",         bg: "bg-emerald-500/20", text: "text-emerald-300" },
  delivered: { label: "Teslim Edildi", bg: "bg-slate-500/20",   text: "text-slate-300" },
  cancelled: { label: "İptal",         bg: "bg-red-500/20",     text: "text-red-300" },
};

function loadSession(): StaffSession | null {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null"); } catch { return null; }
}


export default function ServisElemanPaneli() {
  const [session, setSession] = useState<StaffSession | null>(loadSession);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [tab, setTab] = useState<"siparisler" | "yeni" | "chat">("siparisler");
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  /* Yeni Sipariş */
  const [orderType, setOrderType] = useState<"table" | "delivery">("table");
  const [tableNumber, setTableNumber] = useState("");
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custAddress, setCustAddress] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [manualItem, setManualItem] = useState({ name: "", price: "" });
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState("");
  const [menuSearch, setMenuSearch] = useState("");

  /* Şifre */
  const [pwModal, setPwModal] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwNew2, setPwNew2] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  useEffect(() => { if (session) { loadOrders(); loadMenu(); } }, [session]);
  useEffect(() => {
    if (!session) return;
    const t = setInterval(loadOrders, 30_000);
    return () => clearInterval(t);
  }, [session]);
  useEffect(() => { if (tab === "chat" && session) { loadMessages("vendor-servis"); } }, [tab, session]);

  async function loadOrders() {
    if (!session) return;
    setOrdersLoading(true);
    try {
      const res = await fetch(`${API}/staff/servis/orders?phone=${encodeURIComponent(session.phone)}&password=${encodeURIComponent(session.phone)}`);
      if (res.ok) setOrders(await res.json());
    } catch { /* noop */ } finally { setOrdersLoading(false); }
  }

  async function loadMenu() {
    if (!session) return;
    setMenuLoading(true);
    try {
      const res = await fetch(`${API}/staff/vendors/${session.vendorId}/menu`);
      if (res.ok) setMenu(await res.json());
    } catch { /* noop */ } finally { setMenuLoading(false); }
  }

  async function loadMessages(_ch: string) {
    if (!session) return;
    try {
      const r = await fetch(`${API}/chat/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "dm",
          name: `${session.vendorName} ↔ Servis`,
          vendorId: session.vendorId,
          createdByType: "servis",
          createdById: String(session.id),
          members: [
            { type: "servis", id: String(session.id),       name: session.name },
            { type: "vendor", id: String(session.vendorId), name: session.vendorName },
          ],
        }),
      });
      if (r.ok) {
        const room = await r.json();
        window.dispatchEvent(new CustomEvent("Yekpare:openChatRoom", { detail: { roomId: room.id } }));
      }
    } catch { /* noop */ }
  }

  async function login() {
    if (!phone.trim() || !password.trim()) return;
    setLoginLoading(true); setLoginError("");
    try {
      const res = await fetch(`${API}/staff/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), password: password.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setLoginError(data.error || "Giriş başarısız"); return; }
      if (data.role !== "servis") { setLoginError("Bu panel servis elemanları için. Usta iseniz /usta-paneli'ni kullanın."); return; }
      localStorage.setItem(SESSION_KEY, JSON.stringify(data));
      setSession(data);
    } catch { setLoginError("Bağlantı hatası."); } finally { setLoginLoading(false); }
  }

  function logout() { localStorage.removeItem(SESSION_KEY); setSession(null); setPhone(""); setPassword(""); }

  /* Sipariş oluştur */
  function addToCart(item: MenuItem) {
    setCart(prev => {
      const ex = prev.find(c => c.id === item.id);
      if (ex) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { id: item.id, name: item.name, price: Number(item.price), qty: 1 }];
    });
  }
  function addManualItem() {
    if (!manualItem.name.trim() || !manualItem.price) return;
    setCart(prev => [...prev, { id: null, name: manualItem.name.trim(), price: Number(manualItem.price), qty: 1, manual: true }]);
    setManualItem({ name: "", price: "" });
  }
  function updateQty(idx: number, delta: number) {
    setCart(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], qty: next[idx].qty + delta };
      return next.filter(c => c.qty > 0);
    });
  }

  const cartTotal = cart.reduce((s, c) => s + c.price * c.qty, 0);

  async function submitOrder() {
    if (!session || !cart.length) return;
    if (orderType === "table" && !tableNumber.trim()) { alert("Masa numarası giriniz"); return; }
    if (orderType === "delivery" && !custName.trim()) { alert("Müşteri adı giriniz"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/staff/servis/orders`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: session.phone, password: session.phone,
          orderType, tableNumber: tableNumber.trim(),
          customerName: custName.trim(), customerPhone: custPhone.trim(), customerAddress: custAddress.trim(),
          items: cart.map(c => ({ name: c.name, price: c.price, qty: c.qty })),
          notes: orderNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Sipariş oluşturulamadı"); return; }
      setOrderSuccess(`#${data.order_number} siparişi başarıyla oluşturuldu!`);
      setCart([]); setTableNumber(""); setCustName(""); setCustPhone(""); setCustAddress(""); setOrderNotes("");
      setTimeout(() => { setOrderSuccess(""); setTab("siparisler"); loadOrders(); }, 2500);
    } catch { alert("Bağlantı hatası"); } finally { setSubmitting(false); }
  }

  /* Şifre Değiştir */
  async function changePassword() {
    if (!session) return;
    setPwError(""); setPwSuccess(false);
    if (!pwCurrent || !pwNew || !pwNew2) { setPwError("Tüm alanları doldurun"); return; }
    if (pwNew !== pwNew2) { setPwError("Yeni şifreler eşleşmiyor"); return; }
    if (pwNew.length < 4) { setPwError("En az 4 karakter"); return; }
    setPwLoading(true);
    try {
      const res = await fetch(`${API}/staff/change-password`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: session.phone, currentPassword: pwCurrent, newPassword: pwNew }),
      });
      const data = await res.json();
      if (!res.ok) { setPwError(data.error || "Değiştirilemedi"); return; }
      setPwSuccess(true); setPwCurrent(""); setPwNew(""); setPwNew2("");
      setTimeout(() => { setPwModal(false); setPwSuccess(false); }, 2000);
    } catch { setPwError("Bağlantı hatası"); } finally { setPwLoading(false); }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">👨‍💼</div>
            <h1 className="text-2xl font-black text-white mb-1">Servis Paneli</h1>
            <p className="text-white/40 text-sm">Garson / Market Çalışanı Girişi</p>
          </div>
          <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-white/50 text-xs font-medium mb-2">Telefon Numarası</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} placeholder="05xx xxx xx xx" className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm outline-none focus:border-teal-400/70 transition" />
            </div>
            <div>
              <label className="block text-white/50 text-xs font-medium mb-2">Şifre</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} placeholder="Şifrenizi girin" className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm outline-none focus:border-teal-400/70 transition" />
              <p className="text-white/25 text-xs mt-1.5">Şifreniz işletme tarafından atanır.</p>
            </div>
            {loginError && <p className="text-red-400 text-sm bg-red-500/10 rounded-xl px-3 py-2">{loginError}</p>}
            <button onClick={login} disabled={loginLoading || !phone.trim() || !password.trim()} className="w-full bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition text-sm">
              {loginLoading ? "Giriş yapılıyor…" : "Giriş Yap"}
            </button>
          </div>
          <p className="text-center text-white/30 text-xs mt-4"><Link href="/" className="hover:text-white/50">← Ana Sayfa</Link></p>
        </div>
      </div>
    );
  }

  const filteredMenu = menu.filter(m => !menuSearch || m.name.toLowerCase().includes(menuSearch.toLowerCase()) || (m.category_name || "").toLowerCase().includes(menuSearch.toLowerCase()));
  const groupedMenu: Record<string, MenuItem[]> = {};
  filteredMenu.forEach(m => { const cat = m.category_name || "Diğer"; if (!groupedMenu[cat]) groupedMenu[cat] = []; groupedMenu[cat].push(m); });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900">
      <header className="border-b border-white/10 sticky top-0 z-10 bg-slate-900/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">👨‍💼</span>
            <div>
              <div className="text-white font-semibold text-sm">{session.name}</div>
              <div className="text-white/40 text-xs">{session.vendorName} · Servis</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setPwModal(true); setPwError(""); setPwSuccess(false); }} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 text-xs rounded-lg border border-white/10 transition">🔑</button>
            <button onClick={logout} className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs rounded-lg border border-red-500/20 transition">Çıkış</button>
          </div>
        </div>
        {/* Tab Bar */}
        <div className="max-w-2xl mx-auto px-4 pb-3 flex gap-2">
          {[
            { id: "siparisler", label: "📦 Siparişlerim" },
            { id: "yeni",       label: "➕ Yeni Sipariş" },
            { id: "chat",       label: "💬 Sohbet" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${tab === t.id ? "bg-teal-600 text-white" : "bg-white/5 border border-white/10 text-white/50 hover:bg-white/10"}`}>{t.label}</button>
          ))}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">

        {/* ── Siparişlerim ── */}
        {tab === "siparisler" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wide">Oluşturduğum Siparişler</h2>
              <button onClick={loadOrders} disabled={ordersLoading} className="text-xs text-teal-400 hover:text-teal-300">↻ Yenile</button>
            </div>
            {ordersLoading && orders.length === 0 && <div className="text-center py-16 text-white/30 text-sm">Yükleniyor…</div>}
            {!ordersLoading && orders.length === 0 && (
              <div className="text-center py-16"><div className="text-4xl mb-3">📋</div><div className="text-white/40 text-sm">Henüz sipariş oluşturmadınız.</div><button onClick={() => setTab("yeni")} className="mt-3 text-teal-400 text-sm hover:text-teal-300">Yeni sipariş oluştur →</button></div>
            )}
            {orders.map(o => {
              const sm = STATUS_MAP[o.status] || { label: o.status, bg: "bg-slate-500/20", text: "text-slate-300" };
              const isTable = o.order_source === "staff" && o.table_number;
              let parsedItems: Array<{ name: string; qty: number; price: number }> = [];
              try { parsedItems = JSON.parse(o.items || "[]"); } catch { /* noop */ }
              return (
                <div key={o.id} className={`rounded-2xl p-4 border ${o.status === "pending" ? "bg-amber-500/10 border-amber-500/30" : "bg-white/[0.06] border-white/10"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-white font-bold text-sm">#{o.order_number}</span>
                      {isTable && <span className="ml-2 bg-violet-500/20 text-violet-300 text-xs px-2 py-0.5 rounded-full">🪑 Masa {o.table_number}</span>}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sm.bg} ${sm.text}`}>{sm.label}</span>
                  </div>
                  <div className="text-white/60 text-xs mb-2">{o.customer_name} {!isTable && `· ${o.customer_address}`}</div>
                  <div className="space-y-0.5 mb-2">
                    {parsedItems.map((item, i) => <div key={i} className="text-xs text-white/50 flex justify-between"><span>{item.qty}× {item.name}</span><span>₺{Number(item.price).toFixed(2)}</span></div>)}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold text-sm">₺{Number(o.total).toFixed(2)}</span>
                    <span className="text-white/30 text-xs">{new Date(o.created_at).toLocaleString("tr-TR")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Yeni Sipariş ── */}
        {tab === "yeni" && (
          <div className="space-y-5">
            {orderSuccess && <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-2xl px-4 py-3 text-sm font-semibold text-center">✅ {orderSuccess}</div>}

            {/* Sipariş Tipi */}
            <div>
              <div className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-3">Sipariş Tipi</div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setOrderType("table")} className={`rounded-2xl p-4 border text-center transition ${orderType === "table" ? "bg-teal-500/20 border-teal-400/50 text-teal-200" : "bg-white/[0.06] border-white/10 text-white/50 hover:bg-white/10"}`}>
                  <div className="text-2xl mb-1">🪑</div>
                  <div className="text-sm font-bold">Masaya Sipariş</div>
                  <div className="text-xs opacity-60 mt-0.5">Masa numarası ile</div>
                </button>
                <button onClick={() => setOrderType("delivery")} className={`rounded-2xl p-4 border text-center transition ${orderType === "delivery" ? "bg-teal-500/20 border-teal-400/50 text-teal-200" : "bg-white/[0.06] border-white/10 text-white/50 hover:bg-white/10"}`}>
                  <div className="text-2xl mb-1">🏠</div>
                  <div className="text-sm font-bold">Adrese Teslim</div>
                  <div className="text-xs opacity-60 mt-0.5">Müşteri bilgileriyle</div>
                </button>
              </div>
            </div>

            {/* Müşteri Bilgileri */}
            <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="text-white/60 text-xs font-semibold uppercase tracking-wide">{orderType === "table" ? "Masa Bilgisi" : "Müşteri Bilgileri"}</div>
              {orderType === "table" ? (
                <div><label className="block text-white/40 text-xs mb-1">Masa No <span className="text-red-400">*</span></label><input value={tableNumber} onChange={e => setTableNumber(e.target.value)} placeholder="örn: 5, VIP-1" className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-teal-400/60 placeholder-white/25" /></div>
              ) : (
                <>
                  <div><label className="block text-white/40 text-xs mb-1">Müşteri Adı <span className="text-red-400">*</span></label><input value={custName} onChange={e => setCustName(e.target.value)} placeholder="Ad Soyad" className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-teal-400/60 placeholder-white/25" /></div>
                  <div><label className="block text-white/40 text-xs mb-1">Telefon</label><input type="tel" value={custPhone} onChange={e => setCustPhone(e.target.value)} placeholder="05xx xxx xx xx" className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-teal-400/60 placeholder-white/25" /></div>
                  <div><label className="block text-white/40 text-xs mb-1">Adres</label><textarea value={custAddress} onChange={e => setCustAddress(e.target.value)} rows={2} placeholder="Teslimat adresi" className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-teal-400/60 placeholder-white/25 resize-none" /></div>
                </>
              )}
              <div><label className="block text-white/40 text-xs mb-1">Not (isteğe bağlı)</label><input value={orderNotes} onChange={e => setOrderNotes(e.target.value)} placeholder="Sipariş notu…" className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-teal-400/60 placeholder-white/25" /></div>
            </div>

            {/* Ürün Seçimi */}
            <div>
              <div className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-3">Ürünler</div>

              {/* Manuel ürün */}
              <div className="bg-white/[0.04] border border-dashed border-white/15 rounded-2xl p-4 mb-4">
                <div className="text-white/50 text-xs font-semibold mb-2">Manuel Ürün Ekle</div>
                <div className="flex gap-2">
                  <input value={manualItem.name} onChange={e => setManualItem(p => ({ ...p, name: e.target.value }))} placeholder="Ürün adı" className="flex-1 bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-teal-400/60 placeholder-white/25" />
                  <input type="number" value={manualItem.price} onChange={e => setManualItem(p => ({ ...p, price: e.target.value }))} placeholder="₺" className="w-20 bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-teal-400/60 placeholder-white/25" />
                  <button onClick={addManualItem} disabled={!manualItem.name.trim() || !manualItem.price} className="px-3 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition">+Ekle</button>
                </div>
              </div>

              {/* Menüden Seçim */}
              {menuLoading ? <div className="text-center py-4 text-white/30 text-sm">Menü yükleniyor…</div> : menu.length > 0 && (
                <div>
                  <div className="text-white/50 text-xs font-semibold mb-2">Menüden Seç</div>
                  <input value={menuSearch} onChange={e => setMenuSearch(e.target.value)} placeholder="Ürün ara…" className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-teal-400/60 placeholder-white/25 mb-3" />
                  {Object.entries(groupedMenu).map(([cat, items]) => (
                    <div key={cat} className="mb-3">
                      <div className="text-white/40 text-xs font-semibold uppercase tracking-wide mb-2">{cat}</div>
                      <div className="grid grid-cols-1 gap-1.5">
                        {items.map(item => {
                          const inCart = cart.find(c => c.id === item.id);
                          return (
                            <div key={item.id} className={`flex items-center justify-between rounded-xl px-3 py-2.5 border transition ${inCart ? "bg-teal-500/15 border-teal-500/30" : "bg-white/[0.04] border-white/10 hover:bg-white/[0.07]"}`}>
                              <div>
                                <div className="text-white text-sm">{item.name}</div>
                                <div className="text-teal-400 text-xs font-bold">₺{Number(item.price).toFixed(2)}</div>
                              </div>
                              {inCart ? (
                                <div className="flex items-center gap-2">
                                  <button onClick={() => updateQty(cart.indexOf(inCart), -1)} className="w-6 h-6 rounded-full bg-white/10 text-white text-sm flex items-center justify-center">−</button>
                                  <span className="text-white text-sm font-bold w-4 text-center">{inCart.qty}</span>
                                  <button onClick={() => updateQty(cart.indexOf(inCart), 1)} className="w-6 h-6 rounded-full bg-teal-600 text-white text-sm flex items-center justify-center">+</button>
                                </div>
                              ) : (
                                <button onClick={() => addToCart(item)} className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg transition">Ekle</button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sepet */}
            {cart.length > 0 && (
              <div className="bg-teal-500/10 border border-teal-500/30 rounded-2xl p-4">
                <div className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-3">Sipariş Özeti</div>
                <div className="space-y-2 mb-4">
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="flex-1 text-sm text-white">{item.name}</div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(idx, -1)} className="w-6 h-6 rounded-full bg-white/10 text-white text-sm flex items-center justify-center">−</button>
                        <span className="text-white text-sm font-bold w-4 text-center">{item.qty}</span>
                        <button onClick={() => updateQty(idx, 1)} className="w-6 h-6 rounded-full bg-teal-600 text-white text-sm flex items-center justify-center">+</button>
                      </div>
                      <div className="text-teal-300 text-sm font-bold w-16 text-right">₺{(item.price * item.qty).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-teal-500/20 pt-3 flex justify-between items-center mb-4">
                  <span className="text-white font-bold">Toplam</span>
                  <span className="text-teal-300 font-black text-lg">₺{cartTotal.toFixed(2)}</span>
                </div>
                <button onClick={submitOrder} disabled={submitting} className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition">
                  {submitting ? "Sipariş gönderiliyor…" : "✅ Siparişi Gönder"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Chat ── */}
        {tab === "chat" && session && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="text-5xl mb-2">💬</div>
            <p className="text-white/60 text-sm text-center px-6">Sohbet balonu sağ altta açıktır.<br />İşletme ve ekip üyeleriyle oradan mesajlaşabilirsiniz.</p>
            <button
              onClick={() => loadMessages("vendor-servis")}
              className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl transition text-sm"
            >
              💬 İşletme ile Sohbet Başlat
            </button>
          </div>
        )}
      </main>

      {/* Şifre Değiştirme Modalı */}
      {pwModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setPwModal(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-base">🔑 Şifre Değiştir</h3>
              <button onClick={() => setPwModal(false)} className="text-white/40 hover:text-white text-xl leading-none">✕</button>
            </div>
            {pwSuccess ? <div className="text-center py-6"><div className="text-4xl mb-3">✅</div><div className="text-emerald-400 font-semibold">Şifre başarıyla değiştirildi!</div></div>
              : <div className="space-y-3">
                  <div><label className="block text-white/40 text-xs mb-1">Mevcut Şifre</label><input type="password" value={pwCurrent} onChange={e => setPwCurrent(e.target.value)} className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-teal-400/70" placeholder="Mevcut şifreniz" /></div>
                  <div><label className="block text-white/40 text-xs mb-1">Yeni Şifre</label><input type="password" value={pwNew} onChange={e => setPwNew(e.target.value)} className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-teal-400/70" placeholder="En az 4 karakter" /></div>
                  <div><label className="block text-white/40 text-xs mb-1">Yeni Şifre (Tekrar)</label><input type="password" value={pwNew2} onChange={e => setPwNew2(e.target.value)} onKeyDown={e => e.key === "Enter" && changePassword()} className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-teal-400/70" placeholder="Tekrar girin" /></div>
                  {pwError && <p className="text-red-400 text-sm bg-red-500/10 rounded-xl px-3 py-2">{pwError}</p>}
                  <button onClick={changePassword} disabled={pwLoading} className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition">{pwLoading ? "Kaydediliyor…" : "Şifreyi Güncelle"}</button>
                </div>}
          </div>
        </div>
      )}
    </div>
  );
}
