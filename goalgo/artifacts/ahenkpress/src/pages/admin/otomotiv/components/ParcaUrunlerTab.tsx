import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { apiUrl, apiFetch } from "@/lib/apiBase";
import type { OtomotivListing } from "../otomotivAdminTypes";
import { Badge, Btn, StubNotice, MarketplaceDisclaimer } from "./OtomotivAdminUi";

const ADMIN = apiUrl("/api/otomotiv/admin");

export function ParcaUrunlerTab() {
  const [listings, setListings] = useState<OtomotivListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<"part" | "tire">("part");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${ADMIN}/listings?kind=${kind}`);
      const data = (await res.json()) as { listings?: OtomotivListing[] };
      setListings(Array.isArray(data.listings) ? data.listings : []);
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <MarketplaceDisclaimer />
      <StubNotice phase="Yedek Parça Listeleme — Faz 3">
        Orijinal, yan sanayi, çıkma parça vitrinleri. VIN/şasi sorgusu → uyumlu parça listesi.
        Çıkma parça teklif sistemi (kullanıcı talep, satıcı teklif — iletişim ve ödeme işletmede).
        Foto/durum analizi AI entegrasyonu hedefi.
      </StubNotice>
      <div className="flex gap-2">
        <Btn onClick={() => setKind("part")} className={kind === "part" ? "bg-[#1e3a5f] text-white" : "bg-white border text-gray-600"}>Yedek / Çıkma</Btn>
        <Btn onClick={() => setKind("tire")} className={kind === "tire" ? "bg-[#1e3a5f] text-white" : "bg-white border text-gray-600"}>Lastik</Btn>
        <Btn onClick={() => void load()} className="bg-white border text-gray-600 ml-auto"><RefreshCw size={14} /></Btn>
      </div>
      <div className="border rounded-xl overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">Ürün</th>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">İşletme</th>
              <th className="px-3 py-2">Stok</th>
              <th className="px-3 py-2">Fiyat</th>
              <th className="px-3 py-2">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Yükleniyor…</td></tr>
            ) : listings.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Henüz ürün ilanı yok.</td></tr>
            ) : (
              listings.map((l) => (
                <tr key={l.id}>
                  <td className="px-3 py-2 font-medium">{l.title}</td>
                  <td className="px-3 py-2 text-gray-500">{l.sku || "—"}</td>
                  <td className="px-3 py-2">{l.business_name}</td>
                  <td className="px-3 py-2">{l.stock ?? "—"}</td>
                  <td className="px-3 py-2">{l.price ? `${l.price} ₺` : "—"}</td>
                  <td className="px-3 py-2"><Badge status={l.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
