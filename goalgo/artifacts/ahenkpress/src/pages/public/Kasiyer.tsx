import { useState, useEffect, useCallback, useMemo, useRef } from "react";

const API = "/api";

interface KasiyerSession {
  id: number | null;
  name: string;
  phone: string;
  vendorId: number;
  vendorName: string;
  role: "kasiyer" | "owner";
}

interface MenuItem {
  id: number;
  name: string;
  price: number;
  category_name: string | null;
  image_url: string | null;
  description: string | null;
}

interface CartItem {
  item: MenuItem;
  qty: number;
}

interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  table_number: string | null;
  items: string;
  total: number;
  status: string;
  payment_method: string;
  created_at: string;
  order_source: string;
}
interface Courier { id: number; name: string; phone: string; active: boolean; }

/* ── Login Screen ─────────────────────────────────────────────── */

function LoginScreen({ onLogin }: { onLogin: (s: KasiyerSession) => void }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setError("");
    if (!phone.trim() || !password.trim()) { setError("Telefon ve şifre zorunlu"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/staff/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), password: password.trim() }),
      });
      if (res.ok) {
        const data = await res.json() as { id: number; name: string; phone: string; role: string; vendorId: number; vendorName: string };
        onLogin({
          id: data.id,
          name: data.name,
          phone: data.phone,
          vendorId: data.vendorId,
          vendorName: data.vendorName,
          role: "kasiyer",
        });
        return;
      }
      /* Fall through: try vendor owner login */
      const res2 = await fetch(`${API}/providers/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: phone.trim(), password: password.trim() }),
      });
      if (res2.ok) {
        const data2 = await res2.json() as { success: boolean; vendor: { id: number; name: string; owner_name: string; owner_email: string } };
        const v = data2.vendor;
        onLogin({
          id: null,
          name: v.owner_name || v.name,
          phone: v.owner_email,
          vendorId: v.id,
          vendorName: v.name,
          role: "owner",
        });
        return;
      }
      setError("Telefon/şifre veya e-posta/şifre hatalı");
    } catch {
      setError("Bağlantı hatası, tekrar deneyin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🖥️</div>
          <h1 className="text-2xl font-bold text-gray-800">Kasiyer Girişi</h1>
          <p className="text-gray-400 text-sm mt-1">Dokunmatik POS Sistemi</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Telefon veya E-posta</label>
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onKeyDown={e => e.key === "Enter" && login()}
              placeholder="05xx xxx xx xx"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Şifre</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && login()}
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            onClick={login}
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition text-sm"
          >
            {loading ? "Giriş yapılıyor…" : "Giriş Yap"}
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">İşletme yetkilisi e-posta+şifre ile de giriş yapabilir</p>
      </div>
    </div>
  );
}

/* ── POS Screen ─────────────────────────────────────────────── */

interface POSScreenProps { session: KasiyerSession; onLogout: () => void; }

function POSScreen({ session, onLogout }: POSScreenProps) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [view, setView] = useState<"pos" | "orders">("pos");
  const [orders, setOrders] = useState<Order[]>([]);
  const [payModal, setPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState<"cash" | "card" | "bank">("cash");
  const [cashGiven, setCashGiven] = useState("");
  const [orderNote, setOrderNote] = useState("");
  interface TableSection { id: string; name: string; type: "masa" | "oda" | "lobi" | "diger"; }
  const [orderType, setOrderType] = useState<"table" | "takeaway" | "phone">("table");
  const [selectedTable, setSelectedTable] = useState<TableSection | null>(null);
  const [tables, setTables] = useState<TableSection[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const cashInputRef = useRef<HTMLInputElement>(null);

  /* ── Müşteri Seçimi ── */
  interface CustOption { id: number; first_name: string; last_name: string; company_name: string | null; phone: string; address: string | null; }
  const [customers, setCustomers] = useState<CustOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustOption | null>(null);
  const [customerQ, setCustomerQ] = useState("");
  const [showNewCust, setShowNewCust] = useState(false);
  const [newCustForm, setNewCustForm] = useState({ first_name: "", last_name: "", phone: "", company_name: "", address: "" });
  const [savingCust, setSavingCust] = useState(false);

  const loadMenu = useCallback(async () => {
    try {
      const res = await fetch(`${API}/staff/vendors/${session.vendorId}/menu`);
      if (res.ok) setItems(await res.json());
    } catch { /* noop */ }
  }, [session.vendorId]);

  const loadOrders = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`${API}/cashier/orders?vendorId=${session.vendorId}&date=${today}`);
      if (res.ok) setOrders(await res.json());
    } catch { /* noop */ }
  }, [session.vendorId]);

  const loadCustomers = useCallback(async () => {
    try {
      const res = await fetch(`${API}/cashier/customers?vendorId=${session.vendorId}`);
      if (res.ok) setCustomers(await res.json());
    } catch { /* noop */ }
  }, [session.vendorId]);

  const loadTables = useCallback(async () => {
    try {
      const res = await fetch(`${API}/cashier/tables?vendorId=${session.vendorId}`);
      if (res.ok) setTables(await res.json());
    } catch { /* noop */ }
  }, [session.vendorId]);

  const loadCouriers = useCallback(async () => {
    try {
      const res = await fetch(`${API}/staff/vendors/${session.vendorId}/couriers`);
      if (res.ok) setCouriers(await res.json());
    } catch { /* noop */ }
  }, [session.vendorId]);

  const saveNewCustomer = async () => {
    if (!newCustForm.first_name.trim() || !newCustForm.phone.trim()) return;
    setSavingCust(true);
    try {
      const res = await fetch(`${API}/cashier/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId: session.vendorId, ...newCustForm }),
      });
      if (res.ok) {
        const saved = await res.json() as CustOption;
        setSelectedCustomer(saved);
        setCustomerName(`${saved.first_name} ${saved.last_name}`);
        setCustomers(prev => [...prev, saved]);
        setNewCustForm({ first_name: "", last_name: "", phone: "", company_name: "", address: "" });
        setShowNewCust(false);
      }
    } catch { /* noop */ } finally { setSavingCust(false); }
  };

  useEffect(() => { loadMenu(); loadOrders(); loadCustomers(); loadTables(); loadCouriers(); }, [loadMenu, loadOrders, loadCustomers, loadTables, loadCouriers]);
  useEffect(() => { if (view === "orders") loadOrders(); }, [view, loadOrders]);
  useEffect(() => { if (payModal && payMethod === "cash") setTimeout(() => cashInputRef.current?.focus(), 100); }, [payModal, payMethod]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(items.map(i => i.category_name).filter(Boolean))) as string[];
    return cats;
  }, [items]);

  const visibleItems = useMemo(() => {
    let list = activeCategory ? items.filter(i => i.category_name === activeCategory) : items;
    if (searchQ.trim()) list = list.filter(i => i.name.toLowerCase().includes(searchQ.toLowerCase()));
    return list;
  }, [items, activeCategory, searchQ]);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id);
      if (existing) return prev.map(c => c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { item, qty: 1 }];
    });
  };

  const adjustQty = (itemId: number, delta: number) => {
    setCart(prev => {
      const updated = prev.map(c => c.item.id === itemId ? { ...c, qty: c.qty + delta } : c).filter(c => c.qty > 0);
      return updated;
    });
  };

  const total = cart.reduce((s, c) => s + c.item.price * c.qty, 0);
  const change = payMethod === "cash" && cashGiven ? Math.max(0, Number(cashGiven) - total) : 0;

  const placeOrder = async (paid: boolean) => {
    if (!cart.length) return;
    if (orderType === "table" && !selectedTable) { alert("Lütfen bir masa seçin"); return; }
    if (orderType === "phone" && !selectedCustomer) { alert("Telefon siparişi için müşteri seçin"); return; }
    if (orderType === "phone" && !deliveryAddress.trim()) { alert("Telefon siparişi için teslimat adresi girin"); return; }
    setPlacing(true);
    try {
      const tableNum = orderType === "table" ? selectedTable!.name : undefined;
      const cName = selectedCustomer
        ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}`
        : (orderType === "table" ? (selectedTable?.name || "Masa") : customerName || "Gel-Al");
      const payload = {
        vendorId: session.vendorId,
        staffPhone: session.phone,
        staffId: session.id,
        orderType,
        tableNumber: tableNum,
        customerName: cName,
        customerPhone: selectedCustomer?.phone || "",
        customerAddress: orderType === "phone" ? deliveryAddress : undefined,
        items: cart.map(c => ({ name: c.item.name, price: c.item.price, qty: c.qty })),
        paymentMethod: paid ? payMethod : "pending",
        paid,
        notes: orderNote,
        orderSource: "cashier",
        courierId: (orderType === "takeaway" || orderType === "phone") && selectedCourierId ? Number(selectedCourierId) : undefined,
      };
      const res = await fetch(`${API}/cashier/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setCart([]);
        setPayModal(false);
        setOrderNote("");
        setSelectedTable(null);
        setCustomerName("");
        setDeliveryAddress("");
        setCashGiven("");
        setSelectedCustomer(null);
        setSelectedCourierId("");
        setCustomerQ("");
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
        loadOrders();
      }
    } catch { /* noop */ } finally { setPlacing(false); }
  };

  const todayTotal = orders.filter(o => o.status !== "cancelled").reduce((s, o) => s + Number(o.total), 0);
  const todayCash = orders.filter(o => o.status !== "cancelled" && o.payment_method === "cash").reduce((s, o) => s + Number(o.total), 0);
  const todayCard = orders.filter(o => o.status !== "cancelled" && o.payment_method === "card").reduce((s, o) => s + Number(o.total), 0);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col overflow-hidden">
      {/* ── Top Bar ── */}
      <header className="bg-gray-900 text-white flex items-center gap-3 px-4 py-3 shrink-0">
        <div className="text-xl">🖥️</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate">{session.vendorName}</div>
          <div className="text-gray-400 text-xs">{session.name} • Kasiyer</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView(view === "pos" ? "orders" : "pos")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${view === "orders" ? "bg-orange-500 text-white" : "bg-white/10 hover:bg-white/20 text-white"}`}
          >
            {view === "pos" ? "📋 Siparişler" : "🖥️ POS"}
          </button>
          <button onClick={onLogout} className="px-3 py-1.5 bg-white/10 hover:bg-red-500 text-white rounded-lg text-xs font-semibold transition">Çıkış</button>
        </div>
      </header>

      {success && (
        <div className="bg-green-500 text-white text-center py-2 font-semibold text-sm animate-pulse shrink-0">
          ✅ Sipariş alındı!
        </div>
      )}

      {/* ── POS View ── */}
      {view === "pos" && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Menu */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Categories */}
            <div className="bg-white border-b px-3 py-2 flex items-center gap-2 overflow-x-auto shrink-0">
              <button
                onClick={() => setActiveCategory(null)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${!activeCategory ? "bg-orange-500 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}
              >Tümü</button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeCategory === cat ? "bg-orange-500 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}
                >{cat}</button>
              ))}
            </div>

            {/* Search */}
            <div className="bg-white border-b px-3 py-2 shrink-0">
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="🔍 Ürün ara…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>

            {/* Items grid */}
            <div className="flex-1 overflow-y-auto p-3 grid grid-cols-5 gap-2 content-start auto-rows-max">
              {visibleItems.map(item => {
                const inCart = cart.find(c => c.item.id === item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className={`relative bg-white rounded-xl p-2 shadow-sm hover:shadow-md text-left transition active:scale-95 border-2 aspect-square flex flex-col ${inCart ? "border-orange-400" : "border-transparent"}`}
                  >
                    {item.image_url && (
                      <img src={item.image_url} alt={item.name} className="w-full h-16 object-cover rounded-lg mb-1.5" />
                    )}
                    {!item.image_url && (
                      <div className="w-full h-16 bg-gradient-to-br from-orange-100 to-orange-50 rounded-lg mb-1.5 flex items-center justify-center text-2xl">🍽️</div>
                    )}
                    <div className="font-semibold text-xs text-gray-800 leading-tight min-h-[2rem] overflow-hidden">{item.name}</div>
                    <div className="text-orange-600 font-bold text-xs mt-auto">₺{Number(item.price).toFixed(2)}</div>
                    {inCart && (
                      <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow">
                        {inCart.qty}
                      </span>
                    )}
                  </button>
                );
              })}
              {visibleItems.length === 0 && (
                <div className="col-span-full text-center text-gray-400 py-12 text-sm">
                  {items.length === 0 ? "Menü yükleniyor…" : "Ürün bulunamadı"}
                </div>
              )}
            </div>
          </div>

          {/* Right: Cart */}
          <div className="w-72 lg:w-80 bg-white border-l flex flex-col shrink-0">
            {/* Order type */}
            <div className="px-3 pt-3 pb-2 border-b">
              <div className="flex gap-1.5 mb-2">
                <button
                  onClick={() => { setOrderType("table"); setSelectedCustomer(null); setCustomerQ(""); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${orderType === "table" ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >🪑 Masada</button>
                <button
                  onClick={() => { setOrderType("takeaway"); setSelectedTable(null); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${orderType === "takeaway" ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >🥡 Paket</button>
                <button
                  onClick={() => { setOrderType("phone"); setSelectedTable(null); }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${orderType === "phone" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >📞 Telefon</button>
              </div>

              {/* Masa: predefined table grid */}
              {orderType === "table" && (
                <div>
                  {tables.length === 0 ? (
                    <div className="text-xs text-gray-400 text-center py-2 bg-gray-50 rounded-xl">
                      Masa tanımlanmamış — Vendor Paneli → Profil → Masa Ayarları
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-1.5">
                      {tables.map(t => (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTable(selectedTable?.id === t.id ? null : t)}
                          className={`py-2 px-1 rounded-xl text-xs font-bold text-center transition border-2 ${selectedTable?.id === t.id ? "bg-orange-500 text-white border-orange-500" : "bg-gray-50 text-gray-700 border-gray-200 hover:border-orange-300"}`}
                        >
                          {t.type === "masa" ? "🪑" : t.type === "oda" ? "🚪" : t.type === "lobi" ? "🛋️" : "📍"} {t.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedTable && (
                    <div className="mt-1.5 text-center text-xs font-semibold text-orange-600">Seçili: {selectedTable.name}</div>
                  )}
                </div>
              )}

              {/* Paket: optional customer name */}
              {orderType === "takeaway" && (
                <div className="space-y-1.5">
                  <input
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Müşteri adı (isteğe bağlı)"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                  <select
                    value={selectedCourierId}
                    onChange={e => setSelectedCourierId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                  >
                    <option value="">🚴 Kurye seç (opsiyonel)</option>
                    {couriers.map(c => <option key={c.id} value={String(c.id)}>{c.name} ({c.phone})</option>)}
                  </select>
                </div>
              )}

              {/* Telefon: address field (required) */}
              {orderType === "phone" && (
                <div className="space-y-1.5">
                  <input
                    value={deliveryAddress}
                    onChange={e => setDeliveryAddress(e.target.value)}
                    placeholder="📍 Teslimat adresi *"
                    className="w-full border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  <select
                    value={selectedCourierId}
                    onChange={e => setSelectedCourierId(e.target.value)}
                    className="w-full border border-blue-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                  >
                    <option value="">🚴 Kurye seç (opsiyonel)</option>
                    {couriers.map(c => <option key={c.id} value={String(c.id)}>{c.name} ({c.phone})</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Customer selection */}
            <div className="px-3 py-2 border-b bg-gray-50">
              <div className="text-xs text-gray-500 font-semibold mb-1.5">👤 Müşteri</div>
              {selectedCustomer ? (
                <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm text-gray-800">{selectedCustomer.first_name} {selectedCustomer.last_name}</div>
                    {selectedCustomer.company_name && <div className="text-xs text-gray-500">{selectedCustomer.company_name}</div>}
                    <div className="text-xs text-gray-500">{selectedCustomer.phone}</div>
                  </div>
                  <button onClick={() => { setSelectedCustomer(null); setCustomerName(""); setCustomerQ(""); }} className="text-red-400 hover:text-red-600 text-sm font-bold">✕</button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <input
                    value={customerQ}
                    onChange={e => setCustomerQ(e.target.value)}
                    placeholder="Müşteri ara (ad, telefon)…"
                    className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                  {customerQ.trim() && (
                    <div className="bg-white border border-gray-100 rounded-xl shadow-lg max-h-28 overflow-y-auto">
                      {customers.filter(c =>
                        `${c.first_name} ${c.last_name}`.toLowerCase().includes(customerQ.toLowerCase()) ||
                        c.phone.includes(customerQ) ||
                        (c.company_name || "").toLowerCase().includes(customerQ.toLowerCase())
                      ).slice(0, 5).map(c => (
                        <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerName(`${c.first_name} ${c.last_name}`); setCustomerQ(""); }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-orange-50 border-b border-gray-50 last:border-0">
                          <div className="font-semibold text-gray-800">{c.first_name} {c.last_name}</div>
                          <div className="text-gray-400">{c.phone}{c.company_name ? ` · ${c.company_name}` : ""}</div>
                        </button>
                      ))}
                      {customers.filter(c => `${c.first_name} ${c.last_name}`.toLowerCase().includes(customerQ.toLowerCase()) || c.phone.includes(customerQ)).length === 0 && (
                        <div className="px-3 py-2 text-xs text-gray-400">Müşteri bulunamadı</div>
                      )}
                    </div>
                  )}
                  <button onClick={() => setShowNewCust(true)} className="text-xs text-orange-500 hover:text-orange-700 font-medium">+ Yeni müşteri ekle</button>
                </div>
              )}
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
              {cart.length === 0 && (
                <div className="text-center text-gray-300 py-8 text-sm">
                  <div className="text-4xl mb-2">🛒</div>
                  Sepet boş
                </div>
              )}
              {cart.map(c => (
                <div key={c.item.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-800 truncate">{c.item.name}</div>
                    <div className="text-orange-600 text-xs font-bold">₺{(c.item.price * c.qty).toFixed(2)}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => adjustQty(c.item.id, -1)} className="w-7 h-7 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-lg text-sm transition flex items-center justify-center">−</button>
                    <span className="w-6 text-center font-bold text-sm text-gray-700">{c.qty}</span>
                    <button onClick={() => adjustQty(c.item.id, 1)} className="w-7 h-7 bg-green-100 hover:bg-green-200 text-green-700 font-bold rounded-lg text-sm transition flex items-center justify-center">+</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Note */}
            {cart.length > 0 && (
              <div className="px-3 pb-2">
                <input
                  value={orderNote}
                  onChange={e => setOrderNote(e.target.value)}
                  placeholder="📝 Sipariş notu…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
            )}

            {/* Total + Buttons */}
            <div className="border-t px-3 pb-3 pt-3">
              <div className="flex justify-between items-center mb-3">
                <span className="text-gray-500 text-sm">Toplam</span>
                <span className="text-2xl font-black text-gray-900">₺{total.toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => placeOrder(false)}
                  disabled={cart.length === 0 || placing}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-black py-3.5 rounded-2xl transition active:scale-95 shadow"
                >
                  {placing ? "…" : "📋 SİPARİŞ VER"}
                </button>
                <button
                  onClick={() => setPayModal(true)}
                  disabled={cart.length === 0}
                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-black py-3.5 rounded-2xl transition active:scale-95 shadow"
                >
                  💳 ÖDEME AL
                </button>
              </div>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="w-full mt-2 text-xs text-gray-400 hover:text-red-400 transition py-1">Sepeti Temizle</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Orders View ── */}
      {view === "orders" && (
        <div className="flex-1 overflow-y-auto p-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
              <div className="text-2xl font-black text-gray-800">₺{todayTotal.toFixed(0)}</div>
              <div className="text-xs text-gray-400 mt-1">Toplam Ciro</div>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
              <div className="text-2xl font-black text-green-600">₺{todayCash.toFixed(0)}</div>
              <div className="text-xs text-gray-400 mt-1">Nakit</div>
            </div>
            <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
              <div className="text-2xl font-black text-blue-600">₺{todayCard.toFixed(0)}</div>
              <div className="text-xs text-gray-400 mt-1">Kart</div>
            </div>
          </div>

          <div className="space-y-2">
            {orders.length === 0 && <div className="text-center text-gray-400 py-12">Bugün henüz sipariş yok</div>}
            {orders.map(o => {
              let parsedItems: Array<{ name: string; qty: number; price: number }> = [];
              try { parsedItems = JSON.parse(o.items); } catch { /* noop */ }
              return (
                <div key={o.id} className="bg-white rounded-2xl p-4 shadow-sm flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-gray-800 text-sm">{o.order_number}</div>
                      <div className="text-gray-500 text-xs">{o.customer_name}{o.table_number ? ` • Masa ${o.table_number}` : ""}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-gray-900">₺{Number(o.total).toFixed(2)}</div>
                      <div className="text-xs text-gray-400">{o.payment_method === "cash" ? "💵 Nakit" : o.payment_method === "card" ? "💳 Kart" : "🏦 Havale"}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    {parsedItems.map((it, i) => (
                      <div key={i} className="flex justify-between"><span>{it.qty}x {it.name}</span><span>₺{(it.price * it.qty).toFixed(2)}</span></div>
                    ))}
                  </div>
                  <div className="text-[11px] text-gray-400 text-right">
                    {new Date(o.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                    {" "}• <span className={`font-semibold ${o.status === "delivered" ? "text-green-500" : o.status === "cancelled" ? "text-red-500" : "text-orange-500"}`}>{o.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Payment Modal ── */}
      {payModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-black text-gray-800 mb-4">Ödeme Al</h2>

            {/* Order summary */}
            <div className="bg-gray-50 rounded-2xl px-4 py-3 mb-4 space-y-1">
              {cart.map(c => (
                <div key={c.item.id} className="flex justify-between text-sm text-gray-700">
                  <span>{c.qty}x {c.item.name}</span>
                  <span>₺{(c.item.price * c.qty).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-black text-gray-900 text-base">
                <span>Toplam</span><span>₺{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment method */}
            <div className="flex gap-2 mb-4">
              {(["cash", "card", "bank"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setPayMethod(m)}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition ${payMethod === m ? "bg-orange-500 text-white shadow" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >
                  {m === "cash" ? "💵 Nakit" : m === "card" ? "💳 Kart" : "🏦 Havale"}
                </button>
              ))}
            </div>

            {/* Cash tendered */}
            {payMethod === "cash" && (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Verilen Nakit</label>
                <input
                  ref={cashInputRef}
                  type="number"
                  value={cashGiven}
                  onChange={e => setCashGiven(e.target.value)}
                  placeholder="₺0.00"
                  className="w-full border-2 border-orange-300 rounded-xl px-4 py-3 text-lg font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 text-center"
                />
                {/* Quick amounts */}
                <div className="flex gap-2 mt-2">
                  {[Math.ceil(total / 10) * 10, Math.ceil(total / 50) * 50, Math.ceil(total / 100) * 100].filter((v, i, a) => a.indexOf(v) === i && v >= total).slice(0, 3).map(v => (
                    <button key={v} onClick={() => setCashGiven(String(v))} className="flex-1 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-xl text-sm font-bold transition">₺{v}</button>
                  ))}
                </div>
                {cashGiven && Number(cashGiven) >= total && (
                  <div className="mt-3 text-center text-xl font-black text-green-600">
                    Para Üstü: ₺{change.toFixed(2)}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setPayModal(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold transition">İptal</button>
              <button
                onClick={() => placeOrder(true)}
                disabled={placing || (payMethod === "cash" && cashGiven !== "" && Number(cashGiven) < total)}
                className="flex-2 flex-grow-[2] py-3 bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white rounded-xl font-black text-base transition"
              >
                {placing ? "Kaydediliyor…" : "✅ Tamamla"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Yeni Müşteri Modal ── */}
      {showNewCust && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-gray-800 mb-4 text-base">👤 Yeni Müşteri</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Ad <span className="text-red-500">*</span></label>
                <input value={newCustForm.first_name} onChange={e => setNewCustForm(p => ({ ...p, first_name: e.target.value }))} placeholder="Ad" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Soyad</label>
                <input value={newCustForm.last_name} onChange={e => setNewCustForm(p => ({ ...p, last_name: e.target.value }))} placeholder="Soyad" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Telefon <span className="text-red-500">*</span></label>
                <input type="tel" value={newCustForm.phone} onChange={e => setNewCustForm(p => ({ ...p, phone: e.target.value }))} placeholder="05xx xxx xx xx" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">İşletme Adı</label>
                <input value={newCustForm.company_name} onChange={e => setNewCustForm(p => ({ ...p, company_name: e.target.value }))} placeholder="(opsiyonel)" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Adres</label>
                <input value={newCustForm.address} onChange={e => setNewCustForm(p => ({ ...p, address: e.target.value }))} placeholder="(opsiyonel)" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowNewCust(false); setNewCustForm({ first_name: "", last_name: "", phone: "", company_name: "", address: "" }); }} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition">Vazgeç</button>
              <button onClick={saveNewCustomer} disabled={savingCust || !newCustForm.first_name.trim() || !newCustForm.phone.trim()} className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition">{savingCust ? "Kaydediliyor…" : "Kaydet"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Root ─────────────────────────────────────────────────────── */

export default function Kasiyer() {
  const [session, setSession] = useState<KasiyerSession | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("kasiyerSession");
      if (raw) setSession(JSON.parse(raw));
    } catch { /* noop */ }
  }, []);

  const login = (s: KasiyerSession) => {
    localStorage.setItem("kasiyerSession", JSON.stringify(s));
    setSession(s);
  };

  const logout = () => {
    localStorage.removeItem("kasiyerSession");
    setSession(null);
  };

  if (!session) return <LoginScreen onLogin={login} />;
  return <POSScreen session={session} onLogout={logout} />;
}
