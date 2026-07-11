import { useState, useEffect } from "react";
import { useCustomerAuth } from "../../contexts/CustomerAuthContext";
import { AuthModal } from "../../components/AuthModal";

interface TransportRequest {
  id: number;
  requestType?: string;
  request_type?: string;
  customerName: string;
  customerPhone: string;
  fromAddress: string;
  toAddress?: string;
  note?: string;
  status: string;
  trackingCode?: string;
  createdAt: string;
  assignedDriverId?: number;
  statusHistory?: any[];
}

const STATUS_STEPS = [
  { key:"pending",        label:"Bekliyor",           icon:"🕐", color:"text-gray-500" },
  { key:"accepted",       label:"Kabul Edildi",        icon:"✅", color:"text-blue-600" },
  { key:"arrived_pickup", label:"Adrese Geldim",       icon:"📍", color:"text-purple-600" },
  { key:"picked_up",      label:"Aldım / Yola Çıktım", icon:"🚀", color:"text-indigo-600" },
  { key:"in_transit",     label:"Yoldayım",            icon:"🛣️", color:"text-cyan-600" },
  { key:"delivered",      label:"Teslim Ettim",        icon:"🎉", color:"text-green-600" },
];

const NEXT_STATUS: Record<string, string> = {
  accepted: "arrived_pickup",
  arrived_pickup: "picked_up",
  picked_up: "in_transit",
  in_transit: "delivered",
};

const STATUS_BTN_LABELS: Record<string, {label:string;icon:string;color:string}> = {
  arrived_pickup: { label:"Adrese Geldim",        icon:"📍", color:"bg-purple-600 hover:bg-purple-700" },
  picked_up:      { label:"Aldım / Yola Çıktım",  icon:"🚀", color:"bg-indigo-600 hover:bg-indigo-700" },
  in_transit:     { label:"Yoldayım",              icon:"🛣️", color:"bg-cyan-600 hover:bg-cyan-700" },
  delivered:      { label:"Teslim Ettim / Bıraktım",icon:"🎉", color:"bg-green-600 hover:bg-green-700" },
};

const TYPE_ICONS: Record<string, string> = {
  taxi: "🚕",
  courier: "📦",
  tow: "🛻",
  moving: "🚚",
  cargo: "📮",
  kargo: "📮",
  rideshare: "🚗",
};
const TYPE_TR: Record<string, string> = {
  taxi: "Taksi",
  courier: "Kurye",
  tow: "Çekici",
  moving: "Nakliyat",
  cargo: "Kargo",
  kargo: "Kargo",
  rideshare: "Araç Paylaşma",
};

function requestTypeKey(r: TransportRequest): string {
  const raw = (r.requestType ?? r.request_type ?? "").toLowerCase();
  if (raw === "kargo") return "cargo";
  return raw;
}

export default function SuruciPaneli() {
  const { user, token } = useCustomerAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [tab, setTab] = useState<"pending"|"mine">("pending");
  const [pendingReqs, setPendingReqs] = useState<TransportRequest[]>([]);
  const [myReqs, setMyReqs] = useState<TransportRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState<number|null>(null);

  async function load() {
    if (!token) return;
    setLoading(true);
    const [pRes, mRes] = await Promise.all([
      fetch(`/api/transport/requests/pending${filter?`?type=${filter}`:""}`, { headers:{Authorization:`Bearer ${token}`} }),
      fetch("/api/transport/requests/driver", { headers:{Authorization:`Bearer ${token}`} }),
    ]);
    if (pRes.ok) setPendingReqs(await pRes.json());
    if (mRes.ok) setMyReqs(await mRes.json());
    setLoading(false);
  }

  useEffect(() => { if (user) load(); }, [user, token, filter]);
  useEffect(() => {
    if (!user) return;
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, [user, token, filter]);

  async function accept(id: number) {
    if (!token) return;
    setBusy(id);
    const res = await fetch(`/api/transport/requests/${id}/accept`, {
      method: "PATCH", headers: { Authorization:`Bearer ${token}` },
    });
    if (res.ok) { await load(); setTab("mine"); }
    else { const d = await res.json(); alert(d.error || "Hata"); }
    setBusy(null);
  }

  async function updateStatus(id: number, status: string) {
    if (!token) return;
    setBusy(id);
    const res = await fetch(`/api/transport/requests/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type":"application/json", Authorization:`Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    if (res.ok) await load();
    else { const d = await res.json(); alert(d.error || "Hata"); }
    setBusy(null);
  }

  if (!user) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center max-w-sm">
        <div className="text-5xl mb-4">🧑‍✈️</div>
        <h2 className="text-xl font-bold mb-2">Sürücü / Kurye Paneli</h2>
        <p className="text-gray-500 mb-6">Devam etmek için giriş yapın</p>
        <button onClick={() => setShowAuth(true)} className="bg-orange-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-orange-700">
          Giriş Yap
        </button>
      </div>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );

  const activeReqs = myReqs.filter(r => !["delivered","cancelled","rated"].includes(r.status));
  const doneReqs   = myReqs.filter(r =>  ["delivered","cancelled","rated"].includes(r.status));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-1">🧑‍✈️ Sürücü / Kurye Paneli</h1>
          <p className="text-gray-400">Merhaba, {user.name}</p>
          <div className="flex gap-3 mt-4">
            <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
              <p className="text-xl font-bold">{pendingReqs.length}</p>
              <p className="text-xs text-gray-400">Bekleyen İş</p>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
              <p className="text-xl font-bold">{activeReqs.length}</p>
              <p className="text-xs text-gray-400">Aktif İş</p>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
              <p className="text-xl font-bold">{doneReqs.length}</p>
              <p className="text-xs text-gray-400">Tamamlanan</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          <button onClick={() => setTab("pending")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab==="pending"?"bg-orange-600 text-white":"bg-white border border-gray-200 text-gray-600"}`}>
            🕐 Bekleyen İşler
            {pendingReqs.length > 0 && <span className="bg-red-500 text-white text-xs rounded-full px-1.5">{pendingReqs.length}</span>}
          </button>
          <button onClick={() => setTab("mine")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab==="mine"?"bg-orange-600 text-white":"bg-white border border-gray-200 text-gray-600"}`}>
            📋 Üstlendiğim İşler
            {activeReqs.length > 0 && <span className="bg-blue-500 text-white text-xs rounded-full px-1.5">{activeReqs.length}</span>}
          </button>
        </div>

        {tab === "pending" && (
          <>
            {/* Filtre */}
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { id: "", label: "Tümü" },
                { id: "taxi", label: "🚕 Taksi" },
                { id: "courier", label: "📦 Kurye" },
                { id: "tow", label: "🛻 Çekici" },
                { id: "moving", label: "🚚 Nakliyat" },
                { id: "cargo", label: "📮 Kargo" },
              ].map((f) => (
                <button key={f.id} onClick={() => setFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${filter===f.id?"bg-gray-900 text-white":"bg-white border border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                  {f.label}
                </button>
              ))}
              <button onClick={load} className="ml-auto px-3 py-1.5 rounded-xl text-sm border border-gray-200 text-gray-500 hover:bg-gray-50">
                🔄 Yenile
              </button>
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-400">Yükleniyor...</div>
            ) : pendingReqs.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">🕐</div>
                <p>Bekleyen iş yok</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingReqs.map(r => (
                  <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{TYPE_ICONS[requestTypeKey(r)] ?? "📋"}</span>
                          <div>
                            <p className="font-bold text-gray-900">{TYPE_TR[requestTypeKey(r)] ?? r.requestType ?? r.request_type ?? "—"}</p>
                            <p className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleString("tr-TR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</p>
                          </div>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>👤 <strong>{r.customerName}</strong></p>
                          <p>📞 {r.customerPhone}</p>
                          <p>📍 {r.fromAddress}</p>
                          {r.toAddress && <p>🎯 {r.toAddress}</p>}
                          {r.note && <p className="text-xs text-gray-400 italic">💬 {r.note}</p>}
                        </div>
                        {r.trackingCode && (
                          <p className="text-xs text-orange-600 mt-2 font-medium">Kod: {r.trackingCode}</p>
                        )}
                      </div>
                      <button onClick={() => accept(r.id)} disabled={busy === r.id}
                        className="shrink-0 bg-green-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors text-sm">
                        {busy === r.id ? "..." : "✅ Üstlen"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "mine" && (
          <div className="space-y-4">
            {activeReqs.length === 0 && doneReqs.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">📋</div>
                <p>Henüz iş yok — bekleyen işleri inceleyin</p>
              </div>
            ) : (
              <>
                {activeReqs.length > 0 && (
                  <>
                    <h3 className="font-semibold text-gray-700">Aktif İşler</h3>
                    {activeReqs.map(r => {
                      const nextStatus = NEXT_STATUS[r.status];
                      const btn = nextStatus ? STATUS_BTN_LABELS[nextStatus] : null;
                      return (
                        <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                          <div className="flex items-start gap-3 mb-4">
                            <span className="text-2xl">{TYPE_ICONS[requestTypeKey(r)] ?? "📋"}</span>
                            <div className="flex-1">
                              <p className="font-bold text-gray-900">{TYPE_TR[requestTypeKey(r)] ?? requestTypeKey(r)} — {r.customerName}</p>
                              <p className="text-sm text-gray-500">📞 {r.customerPhone}</p>
                              <p className="text-sm text-gray-600 mt-1">📍 {r.fromAddress}</p>
                              {r.toAddress && <p className="text-sm text-gray-600">🎯 {r.toAddress}</p>}
                            </div>
                          </div>

                          {/* Durum adımları */}
                          <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
                            {STATUS_STEPS.slice(1).map((step, i) => {
                              const steps = STATUS_STEPS.slice(1);
                              const currentIdx = steps.findIndex(s => s.key === r.status);
                              const stepIdx = i;
                              const isActive = stepIdx === currentIdx;
                              const isDone = stepIdx < currentIdx;
                              return (
                                <div key={step.key} className="flex items-center gap-1">
                                  {i > 0 && <div className={`w-4 h-0.5 ${isDone||isActive?"bg-green-400":"bg-gray-200"}`} />}
                                  <div className={`flex flex-col items-center text-center w-14 ${isActive?"opacity-100":"opacity-50"}`}>
                                    <span className={`text-lg ${isDone?"grayscale-0":""}`}>{isDone?"✅":step.icon}</span>
                                    <span className={`text-xs mt-0.5 ${isActive?"font-semibold text-gray-900":"text-gray-400"}`}>{step.label.split(" ")[0]}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {btn && (
                            <button onClick={() => updateStatus(r.id, nextStatus!)} disabled={busy === r.id}
                              className={`w-full py-3 rounded-xl font-semibold text-white transition-colors disabled:opacity-60 ${btn.color}`}>
                              {busy === r.id ? "..." : `${btn.icon} ${btn.label}`}
                            </button>
                          )}
                          {r.status === "delivered" && (
                            <div className="text-center py-2 text-green-600 font-semibold">🎉 Tamamlandı!</div>
                          )}

                          <div className="mt-3 flex justify-between items-center">
                            {r.trackingCode && <p className="text-xs text-orange-600">Kod: {r.trackingCode}</p>}
                            <button onClick={() => updateStatus(r.id, "cancelled")}
                              className="text-xs text-red-400 hover:text-red-600 transition-colors">
                              İptal Et
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {doneReqs.length > 0 && (
                  <>
                    <h3 className="font-semibold text-gray-700 mt-2">Tamamlanan İşler</h3>
                    {doneReqs.map(r => (
                      <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 opacity-70">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{r.status==="delivered"?"✅":"❌"}</span>
                          <div>
                            <p className="font-medium text-gray-700">{TYPE_TR[requestTypeKey(r)] ?? requestTypeKey(r)} — {r.customerName}</p>
                            <p className="text-xs text-gray-400">{r.fromAddress}</p>
                          </div>
                          <p className="ml-auto text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString("tr-TR")}</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
