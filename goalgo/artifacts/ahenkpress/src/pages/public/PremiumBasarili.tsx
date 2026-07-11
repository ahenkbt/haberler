import { useEffect, useState } from "react";
import { Link } from "wouter";

const API = "/api";

export default function PremiumBasarili() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [resolvedBusinessId, setResolvedBusinessId] = useState<string | null>(params.get("business"));

  useEffect(() => {
    if (!sessionId) { setStatus("error"); return; }
    fetch(`${API}/premium/verify/${sessionId}`)
      .then(r => r.json())
      .then(d => {
        if (d.paid) {
          if (d.businessId) setResolvedBusinessId(d.businessId);
          setStatus("success");
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, [sessionId]);

  if (status === "loading") return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-amber-900/10 to-slate-900">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-white/60 text-sm font-medium">Ödeme doğrulanıyor...</p>
      </div>
    </div>
  );

  if (status === "error") return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="text-6xl mb-4">❌</div>
      <h1 className="text-2xl font-bold text-white mb-2">Ödeme Doğrulanamadı</h1>
      <p className="text-white/50 mb-6">Bir sorun oluştu. Lütfen destek ekibiyle iletişime geçin.</p>
      <Link href="/kesfet" className="bg-blue-600 text-white rounded-xl px-6 py-3 font-semibold hover:bg-blue-700 transition">Keşfet'e Dön</Link>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-4 bg-gradient-to-br from-slate-900 via-amber-900/20 to-slate-900">
      {/* Animated star */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-3xl scale-150 animate-pulse" />
        <div className="relative text-7xl animate-bounce">⭐</div>
      </div>

      <h1 className="text-3xl font-bold text-white mb-2">Premium Aktivasyon Başarılı!</h1>
      <p className="text-white/70 text-base mb-1">İşletmeniz artık Premium rozeti ile öne çıkıyor.</p>
      <p className="text-white/40 text-sm mb-8">İşletme panelinizden tüm premium özellikleri yönetebilirsiniz.</p>

      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 max-w-sm w-full mb-6 shadow-2xl">
        <h2 className="font-bold text-white mb-4 text-left">Premium Özellikler Aktif:</h2>
        <div className="space-y-2 text-left text-sm">
          {[
            "⭐ Haritada öne çıkan Premium rozet",
            "📸 Fotoğraf galerisi yönetimi",
            "⏰ Açılış/kapanış saatleri",
            "📋 Menü ve ürün listeleme",
            "🎁 Kampanya yönetimi",
            "📅 Rezervasyon sistemi",
            "🛒 Online sipariş alma",
            "💬 WhatsApp sohbet butonu",
          ].map(f => (
            <div key={f} className="flex items-center gap-2 text-white/80">
              <span className="text-green-400 shrink-0">✓</span>{f}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap justify-center">
        {resolvedBusinessId ? (
          <Link href={`/isletme-paneli/${resolvedBusinessId}`}
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl px-6 py-3 font-bold hover:opacity-90 transition shadow-lg shadow-amber-500/30">
            İşletme Panelini Aç →
          </Link>
        ) : (
          <Link href="/isletme-giris"
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl px-6 py-3 font-bold hover:opacity-90 transition shadow-lg shadow-amber-500/30">
            İşletme Girişi →
          </Link>
        )}
        <Link href="/kesfet"
          className="bg-white/10 border border-white/20 text-white rounded-xl px-6 py-3 font-semibold hover:bg-white/20 transition">
          Keşfet'e Dön
        </Link>
      </div>
    </div>
  );
}
