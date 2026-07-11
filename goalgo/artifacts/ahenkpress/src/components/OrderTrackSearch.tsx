import { useState } from "react";
import { apiUrl } from "@/lib/apiBase";

type TrackVendor = {
  name: string | null;
  slug: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
};

type TrackResponse = {
  success: boolean;
  error?: string;
  order?: Record<string, unknown>;
  vendor?: TrackVendor | null;
  timeline?: Array<{ at: string; toLabel: string; note: string | null }>;
};

function apiJoin(path: string): string {
  const rest = path.replace(/^\/+/, "");
  return apiUrl(`/api/${rest}`);
}

export function OrderTrackSearch({ compact = false }: { compact?: boolean }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackResponse | null>(null);

  async function search() {
    const c = code.trim();
    if (!c) {
      setResult({ success: false, error: "Sipariş kodunu yazın (örn. YEK12345678)." });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(apiJoin(`delivery/track/${encodeURIComponent(c)}`));
      const data = (await res.json().catch(() => ({}))) as TrackResponse;
      if (!res.ok || !data.success) {
        setResult({ success: false, error: String(data.error || "Sipariş bulunamadı") });
        return;
      }
      setResult(data);
    } catch {
      setResult({ success: false, error: "Bağlantı hatası" });
    } finally {
      setLoading(false);
    }
  }

  const order = result?.order;
  const vendor = result?.vendor;
  const items = Array.isArray(order?.items) ? (order?.items as Array<{ name: string; quantity: number; price?: string }>) : [];
  const waDigits = vendor?.whatsapp?.replace(/\D/g, "") ?? "";
  const waStoreHref = waDigits ? `https://wa.me/${waDigits.startsWith("90") ? waDigits : `90${waDigits.replace(/^0/, "")}`}` : null;

  return (
    <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${compact ? "p-3" : "p-4"}`}>
      <h3 className={`font-bold text-gray-900 ${compact ? "text-sm" : "text-base"} mb-2`}>Sipariş takibi</h3>
      <p className="text-xs text-gray-600 mb-3">
        Sipariş onayındaki <strong>sipariş kodunuzu</strong> (YEK ile başlayan) girin.
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.trim())}
          placeholder="YEK…"
          className="flex-1 min-w-[160px] border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500"
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => void search()}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-50 hover:bg-indigo-500"
        >
          {loading ? "…" : "Sorgula"}
        </button>
      </div>
      {result && !result.success ? (
        <p className="mt-3 text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{result.error}</p>
      ) : null}
      {result?.success && order && vendor ? (
        <div className="mt-4 space-y-3 text-sm text-gray-800 border-t border-gray-100 pt-3">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">Mağaza</p>
            <p className="font-bold text-gray-900">{vendor.name ?? "—"}</p>
            <div className="text-xs mt-1 space-y-0.5">
              {vendor.phone ? (
                <p>
                  Tel:{" "}
                  <a href={`tel:${vendor.phone}`} className="text-indigo-700 font-semibold underline">
                    {vendor.phone}
                  </a>
                </p>
              ) : null}
              {vendor.email ? (
                <p>
                  E-posta:{" "}
                  <a href={`mailto:${vendor.email}`} className="text-indigo-700 font-semibold underline">
                    {vendor.email}
                  </a>
                </p>
              ) : null}
              {waStoreHref ? (
                <p>
                  <a href={waStoreHref} target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-bold underline">
                    WhatsApp ile yazın
                  </a>
                </p>
              ) : null}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">Durum</p>
            <p className="text-lg font-black text-indigo-800">{String(order.statusLabel ?? order.status ?? "—")}</p>
            <p className="text-xs font-bold text-gray-600 mt-1">Sipariş kodu</p>
            <p className="text-sm text-gray-900 font-mono font-black tracking-tight">{String(order.orderNumber)}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">Sipariş</p>
            <p className="text-xs">
              Toplam: <strong>{String(order.total)} ₺</strong>
            </p>
            {order.geliverTrackingNumber ? (
              <p className="text-xs mt-1">
                Kargo takip: <span className="font-mono font-bold">{String(order.geliverTrackingNumber)}</span>
              </p>
            ) : null}
            {order.vendorNote ? (
              <p className="text-xs mt-2 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5">
                <strong>İşletme notu:</strong> {String(order.vendorNote)}
              </p>
            ) : null}
          </div>
          {items.length > 0 ? (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Ürünler</p>
              <ul className="text-xs space-y-1">
                {items.map((it, i) => (
                  <li key={i}>
                    {it.name} ×{it.quantity}
                    {it.price ? ` — ${it.price}₺` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {result.timeline && result.timeline.length > 0 ? (
            <details className="text-xs">
              <summary className="cursor-pointer font-bold text-gray-700">Zaman çizelgesi</summary>
              <ul className="mt-2 space-y-1 pl-3 list-disc">
                {result.timeline.map((e, i) => (
                  <li key={i}>
                    {new Date(e.at).toLocaleString("tr-TR")}: {e.toLabel}
                    {e.note ? ` — ${e.note}` : ""}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
