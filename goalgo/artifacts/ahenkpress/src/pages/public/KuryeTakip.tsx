import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";

interface StatusItem { status: string; note: string; ts: string; }

interface TransportRequest {
  id: number; requestType: string; customerName: string; customerPhone: string;
  fromAddress: string; toAddress?: string; note?: string; status: string;
  trackingCode: string; createdAt: string; updatedAt: string;
  statusHistory: StatusItem[];
  estimatedPrice?: string; finalPrice?: string;
}

const STATUS_META: Record<string, { label:string; icon:string; desc:string; color:string }> = {
  pending:        { label:"Bekliyor",           icon:"🕐", desc:"Talep alındı, sürücü aranıyor...",       color:"text-yellow-600 bg-yellow-50" },
  accepted:       { label:"Kabul Edildi",        icon:"✅", desc:"Sürücünüz yola çıktı",                   color:"text-blue-600 bg-blue-50" },
  arrived_pickup: { label:"Sürücü Geldi",        icon:"📍", desc:"Sürücünüz adresinizde bekliyor",         color:"text-purple-600 bg-purple-50" },
  picked_up:      { label:"Yola Çıkıldı",        icon:"🚀", desc:"Gönderiniz / yolculuğunuz başladı",     color:"text-indigo-600 bg-indigo-50" },
  in_transit:     { label:"Yolda",               icon:"🛣️", desc:"Az kaldı...",                            color:"text-cyan-600 bg-cyan-50" },
  delivered:      { label:"Teslim Edildi",       icon:"🎉", desc:"Başarıyla teslim edildi!",               color:"text-green-600 bg-green-50" },
  cancelled:      { label:"İptal Edildi",        icon:"❌", desc:"Bu talep iptal edildi",                  color:"text-red-600 bg-red-50" },
};

const STATUS_ORDER = ["pending","accepted","arrived_pickup","picked_up","in_transit","delivered"];
const TYPE_ICONS: Record<string,string> = { taxi:"🚕",courier:"📦",tow:"🛻",moving:"🚚",rideshare:"🚗" };
const TYPE_TR: Record<string,string> = { taxi:"Taksi",courier:"Kurye",tow:"Çekici",moving:"Nakliyat",rideshare:"Araç Paylaşma" };

export default function KuryeTakip() {
  const { code: routeCode } = useParams<{ code?: string }>();
  const [code, setCode] = useState(routeCode ?? "");
  const [request, setRequest] = useState<TransportRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const prevStatus = useRef("");

  async function fetchRequest(c: string) {
    if (!c) return;
    setLoading(true); setError("");
    const res = await fetch(`/api/transport/track/${c.trim().toUpperCase()}`);
    if (res.ok) {
      const data: TransportRequest = await res.json();
      if (prevStatus.current && prevStatus.current !== data.status) {
        playBeep();
      }
      prevStatus.current = data.status;
      setRequest(data);
    } else {
      setError("Takip kodu bulunamadı");
      setRequest(null);
    }
    setLoading(false);
  }

  function playBeep() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 660; g.gain.setValueAtTime(0.3, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      o.start(); o.stop(ctx.currentTime + 0.5);
    } catch {/* ignore */}
  }

  useEffect(() => {
    if (routeCode) { setCode(routeCode); fetchRequest(routeCode); }
  }, [routeCode]);

  useEffect(() => {
    if (!request || ["delivered","cancelled"].includes(request.status)) return;
    const iv = setInterval(() => fetchRequest(code), 10000);
    return () => clearInterval(iv);
  }, [request, code]);

  const currentIdx = request ? STATUS_ORDER.indexOf(request.status) : -1;
  const meta = request ? (STATUS_META[request.status] ?? STATUS_META["pending"]) : null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">📦 Sipariş Takip</h1>

        {/* Arama kutusu */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <label className="text-sm font-medium text-gray-700 mb-2 block">Takip Kodu</label>
          <div className="flex gap-2">
            <input
              value={code} onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && fetchRequest(code)}
              placeholder="Örn: TRKAB1CD2E"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono uppercase tracking-wider"
            />
            <button onClick={() => fetchRequest(code)} disabled={loading || !code}
              className="bg-orange-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-orange-700 disabled:opacity-60 transition-colors">
              {loading ? "..." : "Sorgula"}
            </button>
          </div>
          {error && <p className="text-sm text-red-600 mt-2">❌ {error}</p>}
        </div>

        {request && meta && (
          <>
            {/* Durum başlığı */}
            <div className={`rounded-2xl px-6 py-5 mb-5 ${meta.color}`}>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-3xl">{meta.icon}</span>
                <div>
                  <p className="font-bold text-lg">{meta.label}</p>
                  <p className="text-sm opacity-80">{meta.desc}</p>
                </div>
              </div>
              {!["delivered","cancelled"].includes(request.status) && (
                <p className="text-xs opacity-60 mt-2">Otomatik güncelleniyor (10 sn)</p>
              )}
            </div>

            {/* İlerleme çubuğu */}
            {request.status !== "cancelled" && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
                <div className="relative">
                  {/* Progress line */}
                  <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200 z-0">
                    <div
                      className="h-full bg-green-400 transition-all duration-700"
                      style={{ width: `${Math.max(0, (currentIdx / (STATUS_ORDER.length - 1)) * 100)}%` }}
                    />
                  </div>
                  <div className="relative z-10 flex justify-between">
                    {STATUS_ORDER.map((s, i) => {
                      const m = STATUS_META[s];
                      const done = i < currentIdx;
                      const active = i === currentIdx;
                      return (
                        <div key={s} className="flex flex-col items-center text-center w-10">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm mb-1 transition-all ${
                            done ? "bg-green-500 text-white" :
                            active ? "bg-orange-500 text-white ring-4 ring-orange-200 scale-110" :
                            "bg-gray-200 text-gray-400"
                          }`}>
                            {done ? "✓" : m.icon}
                          </div>
                          <p className={`text-xs leading-tight ${active?"font-semibold text-gray-900":"text-gray-400"}`}>
                            {m.label.split(" ")[0]}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Detaylar */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
              <h3 className="font-semibold text-gray-800 mb-3">Talep Detayları</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <span>{TYPE_ICONS[request.requestType]}</span>
                  <span className="font-medium">{TYPE_TR[request.requestType] ?? request.requestType}</span>
                </div>
                <div className="flex items-start gap-2 text-gray-600">
                  <span>📍</span><span>{request.fromAddress}</span>
                </div>
                {request.toAddress && (
                  <div className="flex items-start gap-2 text-gray-600">
                    <span>🎯</span><span>{request.toAddress}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-600">
                  <span>👤</span><span>{request.customerName}</span>
                </div>
                {request.note && (
                  <div className="flex items-start gap-2 text-gray-500">
                    <span>💬</span><span className="italic">{request.note}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-400 text-xs mt-2 pt-2 border-t border-gray-100">
                  <span>🕐 Oluşturulma:</span>
                  <span>{new Date(request.createdAt).toLocaleString("tr-TR")}</span>
                </div>
                <div className="flex items-center gap-2 text-orange-600 font-mono text-xs">
                  <span>🔑</span><span>{request.trackingCode}</span>
                </div>
              </div>
            </div>

            {/* Geçmiş */}
            {request.statusHistory && request.statusHistory.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-800 mb-3">📋 Durum Geçmişi</h3>
                <div className="space-y-3">
                  {[...request.statusHistory].reverse().map((item, i) => (
                    <div key={i} className="flex gap-3 text-sm">
                      <div className="w-2 h-2 bg-orange-400 rounded-full mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{item.note}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(item.ts).toLocaleString("tr-TR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
