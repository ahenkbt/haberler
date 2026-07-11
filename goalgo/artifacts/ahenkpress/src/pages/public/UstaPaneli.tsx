import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";

const API = "/api";
const SESSION_KEY = "ustaSession";

interface StaffSession { id: number; name: string; phone: string; role: string; vendorId: number; vendorName: string; password?: string; }
interface Order {
  id: number; order_number: string; customer_name: string; customer_phone: string;
  customer_address: string; table_number?: string; order_source?: string;
  items: string; total: string; status: string; notes?: string;
  vendor_name: string; created_at: string; usta_name?: string;
}

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  pending:   { label: "Bekliyor",       bg: "bg-amber-500/20",   text: "text-amber-300" },
  confirmed: { label: "Onaylandı",      bg: "bg-blue-500/20",    text: "text-blue-300" },
  preparing: { label: "Hazırlanıyor",   bg: "bg-indigo-500/20",  text: "text-indigo-300" },
  ready:     { label: "Hazır",          bg: "bg-emerald-500/20", text: "text-emerald-300" },
  delivered: { label: "Teslim Edildi",  bg: "bg-slate-500/20",   text: "text-slate-300" },
  cancelled: { label: "İptal",          bg: "bg-red-500/20",     text: "text-red-300" },
};

function loadSession(): StaffSession | null {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null"); } catch { return null; }
}

export default function UstaPaneli() {
  const [session, setSession] = useState<StaffSession | null>(loadSession);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [notifyingId, setNotifyingId] = useState<number | null>(null);
  const lastActiveCountRef = useRef<number>(0);
  const longRingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Şifre değiştirme */
  const [pwModal, setPwModal] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwNew2, setPwNew2] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  useEffect(() => { if (session) { loadOrders(); } }, [session]);
  useEffect(() => {
    if (!session) return;
    const t = setInterval(loadOrders, 30_000);
    return () => clearInterval(t);
  }, [session]);

  function playLongRing() {
    try {
      const ctx = new AudioContext();
      const freqs = [820, 980, 820, 980, 760, 940, 760, 940];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t = ctx.currentTime + i * 0.22;
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.28, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.start(t);
        osc.stop(t + 0.21);
      });
      if (longRingTimerRef.current) clearTimeout(longRingTimerRef.current);
      longRingTimerRef.current = setTimeout(() => { void ctx.close(); }, 2800);
    } catch { /* noop */ }
  }

  async function loadOrders() {
    if (!session) return;
    setOrdersLoading(true);
    try {
      const res = await fetch(`${API}/staff/usta/orders?phone=${encodeURIComponent(session.phone)}&password=${encodeURIComponent(session.password ?? session.phone)}`);
      if (res.ok) {
        const list = await res.json();
        setOrders(list);
        const activeCount = (Array.isArray(list) ? list : []).filter((o: any) => !["delivered", "cancelled"].includes(String(o.status || ""))).length;
        if (lastActiveCountRef.current > 0 && activeCount > lastActiveCountRef.current) {
          playLongRing();
        }
        lastActiveCountRef.current = activeCount;
      }
    } catch { /* noop */ } finally { setOrdersLoading(false); }
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
      if (data.role !== "usta") { setLoginError("Bu panel sadece ustalar için. Servis elemanıysanız /servis-paneli'ni kullanın."); return; }
      const s: StaffSession = { ...data, password: password.trim() };
      localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      setSession(s);
    } catch { setLoginError("Bağlantı hatası."); } finally { setLoginLoading(false); }
  }

  function logout() { localStorage.removeItem(SESSION_KEY); setSession(null); setPhone(""); setPassword(""); }

  async function notifyReady(orderId: number) {
    if (!session) return;
    setNotifyingId(orderId);
    try {
      const res = await fetch(`${API}/staff/usta/orders/${orderId}/ready-notify`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: session.phone, password: session.password ?? session.phone, notifyMessage: "✅ Sipariş hazır! Lütfen teslim alın." }),
      });
      if (res.ok) { await loadOrders(); }
      else { const d = await res.json(); alert(d.error || "Hata"); }
    } catch { alert("Bağlantı hatası"); } finally { setNotifyingId(null); }
  }

  /* Chat — yeni sistem: usta ↔ işletme DM */
  async function openChat() {
    if (!session) return;
    try {
      const r = await fetch(`${API}/chat/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "dm",
          name: `${session.vendorName} ↔ Usta`,
          vendorId: session.vendorId,
          createdByType: "usta",
          createdById: String(session.id),
          members: [
            { type: "usta",   id: String(session.id),       name: session.name },
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
      if (!res.ok) { setPwError(data.error || "Şifre değiştirilemedi"); return; }
      const updated: StaffSession = { ...session, password: pwNew };
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      setSession(updated);
      setPwSuccess(true); setPwCurrent(""); setPwNew(""); setPwNew2("");
      setTimeout(() => { setPwModal(false); setPwSuccess(false); }, 2000);
    } catch { setPwError("Bağlantı hatası"); } finally { setPwLoading(false); }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-950 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🔨</div>
            <h1 className="text-2xl font-black text-white mb-1">Usta Paneli</h1>
            <p className="text-white/40 text-sm">Telefon ve şifrenizle giriş yapın</p>
          </div>
          <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-white/50 text-xs font-medium mb-2">Telefon Numarası</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} placeholder="05xx xxx xx xx" className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm outline-none focus:border-orange-400/70 transition" />
            </div>
            <div>
              <label className="block text-white/50 text-xs font-medium mb-2">Şifre</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} placeholder="Şifrenizi girin" className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm outline-none focus:border-orange-400/70 transition" />
              <p className="text-white/25 text-xs mt-1.5">Şifreniz işletme tarafından atanır.</p>
            </div>
            {loginError && <p className="text-red-400 text-sm bg-red-500/10 rounded-xl px-3 py-2">{loginError}</p>}
            <button onClick={login} disabled={loginLoading || !phone.trim() || !password.trim()} className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition text-sm">
              {loginLoading ? "Giriş yapılıyor…" : "Giriş Yap"}
            </button>
          </div>
          <p className="text-center text-white/30 text-xs mt-4"><Link href="/" className="hover:text-white/50">← Ana Sayfa</Link></p>
        </div>
      </div>
    );
  }

  const activeOrders = orders.filter(o => !["delivered", "cancelled"].includes(o.status));
  const doneOrders = orders.filter(o => ["delivered", "cancelled"].includes(o.status));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-950 to-slate-900">
      <header className="border-b border-white/10 sticky top-0 z-10 bg-slate-900/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔨</span>
            <div>
              <div className="text-white font-semibold text-sm">{session.name}</div>
              <div className="text-white/40 text-xs">{session.vendorName} · Usta</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openChat} className="px-3 py-1.5 bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs rounded-lg transition hover:bg-sky-500/25">💬 İşletme</button>
            <button onClick={() => { setPwModal(true); setPwError(""); setPwSuccess(false); }} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 text-xs rounded-lg border border-white/10 transition">🔑 Şifre</button>
            <button onClick={() => { loadOrders(); }} disabled={ordersLoading} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/50 text-xs rounded-lg border border-white/10 transition">↻</button>
            <button onClick={logout} className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs rounded-lg border border-red-500/20 transition">Çıkış</button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {activeOrders.length === 0 && !ordersLoading && (
          <div className="text-center py-16"><div className="text-4xl mb-3">🔨</div><div className="text-white/40 text-sm">Size atanmış aktif sipariş yok.</div></div>
        )}
        {ordersLoading && orders.length === 0 && <div className="text-center py-16 text-white/30 text-sm">Siparişler yükleniyor…</div>}

        {activeOrders.length > 0 && (
          <section>
            <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-3">Aktif Siparişler ({activeOrders.length})</h2>
            <div className="space-y-4">
              {activeOrders.map(o => {
                const sm = STATUS_MAP[o.status] || { label: o.status, bg: "bg-slate-500/20", text: "text-slate-300" };
                let parsedItems: Array<{ name: string; qty: number; price: number }> = [];
                try { parsedItems = JSON.parse(o.items || "[]"); } catch { /* noop */ }
                const isTable = o.order_source === "staff" && o.table_number;
                return (
                  <div key={o.id} className={`rounded-2xl p-4 border ${o.status === "pending" ? "bg-amber-500/10 border-amber-500/30" : "bg-white/[0.06] border-white/10"}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-white font-bold text-sm">#{o.order_number}</span>
                        {isTable && <span className="ml-2 bg-violet-500/20 text-violet-300 text-xs px-2 py-0.5 rounded-full">🪑 Masa {o.table_number}</span>}
                        {o.status === "pending" && <span className="ml-2 text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">YENİ</span>}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sm.bg} ${sm.text}`}>{sm.label}</span>
                    </div>

                    <div className="space-y-1 mb-3">
                      <div className="text-white text-sm font-semibold">{o.customer_name}</div>
                      {!isTable && o.customer_phone && <div className="text-white/50 text-xs">📞 {o.customer_phone}</div>}
                      {!isTable && <div className="text-white/50 text-xs">📍 {o.customer_address}</div>}
                      {o.notes && <div className="text-amber-300/70 text-xs">📝 {o.notes}</div>}
                    </div>

                    {parsedItems.length > 0 && (
                      <div className="bg-black/20 rounded-xl p-3 mb-3 space-y-1">
                        {parsedItems.map((item, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-white/70">{item.qty}× {item.name}</span>
                            <span className="text-white/50">₺{Number(item.price).toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="border-t border-white/10 pt-1 mt-1 flex justify-between text-xs font-bold">
                          <span className="text-white/60">Toplam</span>
                          <span className="text-white">₺{Number(o.total).toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      {!["ready", "delivered", "cancelled"].includes(o.status) && (
                        <button
                          onClick={() => notifyReady(o.id)}
                          disabled={notifyingId === o.id}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition"
                        >
                          {notifyingId === o.id ? "…" : "✅ Hazır — Kurye/Servis Bildir"}
                        </button>
                      )}
                      <span className="text-white/30 text-xs ml-auto">{new Date(o.created_at).toLocaleString("tr-TR")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {doneOrders.length > 0 && (
          <section>
            <h2 className="text-white/40 text-xs font-semibold uppercase tracking-wide mb-3">Tamamlananlar ({doneOrders.length})</h2>
            <div className="space-y-2">
              {doneOrders.map(o => {
                const sm = STATUS_MAP[o.status] || { label: o.status, bg: "bg-slate-500/20", text: "text-slate-300" };
                return (
                  <div key={o.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 flex items-center justify-between">
                    <div><span className="text-white/60 text-sm font-semibold">#{o.order_number}</span><span className="text-white/30 text-xs ml-2">{o.customer_name}</span></div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sm.bg} ${sm.text}`}>{sm.label}</span>
                  </div>
                );
              })}
            </div>
          </section>
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
                  <div><label className="block text-white/40 text-xs mb-1">Mevcut Şifre</label><input type="password" value={pwCurrent} onChange={e => setPwCurrent(e.target.value)} className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-orange-400/70" placeholder="Mevcut şifreniz" /></div>
                  <div><label className="block text-white/40 text-xs mb-1">Yeni Şifre</label><input type="password" value={pwNew} onChange={e => setPwNew(e.target.value)} className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-orange-400/70" placeholder="En az 4 karakter" /></div>
                  <div><label className="block text-white/40 text-xs mb-1">Yeni Şifre (Tekrar)</label><input type="password" value={pwNew2} onChange={e => setPwNew2(e.target.value)} onKeyDown={e => e.key === "Enter" && changePassword()} className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-orange-400/70" placeholder="Tekrar girin" /></div>
                  {pwError && <p className="text-red-400 text-sm bg-red-500/10 rounded-xl px-3 py-2">{pwError}</p>}
                  <button onClick={changePassword} disabled={pwLoading} className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition">{pwLoading ? "Kaydediliyor…" : "Şifreyi Güncelle"}</button>
                </div>}
          </div>
        </div>
      )}
    </div>
  );
}
