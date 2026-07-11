import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ReqRow = {
  id: string;
  businessName?: string | null;
  businessId: string;
  placementKey: string;
  billingPeriod: string;
  units: number;
  totalTry: number;
  paymentMethod: string;
  receiptUrl?: string | null;
  categorySuper?: string | null;
  targetType?: string | null;
  productId?: string | null;
  campaignId?: string | null;
  status: "pending" | "approved" | "rejected";
  adminNote?: string | null;
  createdAt?: string;
};

type LiveFeaturedRow = {
  id: string;
  name: string;
  slug?: string | null;
  isPremium?: boolean;
  homepageFeatured?: boolean;
  homepageSuperCategory?: string | null;
  createdAt?: string | null;
};

const API = "/api";

export default function OneCikanIsletmeler() {
  const [rows, setRows] = useState<ReqRow[]>([]);
  const [liveRows, setLiveRows] = useState<LiveFeaturedRow[]>([]);
  const [status, setStatus] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [loading, setLoading] = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    try {
      const qs = status === "all" ? "" : `?status=${status}`;
      const res = await fetch(`${API}/map/admin/feature-promotion-requests${qs}`);
      const d = await res.json();
      if (d.success && Array.isArray(d.data)) setRows(d.data);
      else setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadLiveFeatured() {
    setLiveLoading(true);
    try {
      const res = await fetch(`${API}/map/homepage-businesses?limit=300`);
      const d = await res.json();
      if (!d.success || !Array.isArray(d.data)) {
        setLiveRows([]);
        return;
      }
      const list = (d.data as LiveFeaturedRow[]).filter((x) => x.isPremium || x.homepageFeatured);
      setLiveRows(
        list.sort((a, b) => {
          if ((a.homepageFeatured ?? false) !== (b.homepageFeatured ?? false)) {
            return a.homepageFeatured ? -1 : 1;
          }
          if ((a.isPremium ?? false) !== (b.isPremium ?? false)) {
            return a.isPremium ? -1 : 1;
          }
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta;
        }),
      );
    } finally {
      setLiveLoading(false);
    }
  }

  async function removeFromFeatured(id: string) {
    const ok = confirm("Bu işletmenin öne çıkan/premium görünürlüğü kaldırılsın mı?");
    if (!ok) return;
    const res = await fetch(`${API}/map/businesses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isPremium: false,
        homepageFeatured: false,
        premiumExpiresAt: null,
      }),
    });
    const d = await res.json();
    if (!d.success) {
      alert(d.error || "Kaldırma işlemi başarısız");
      return;
    }
    await loadLiveFeatured();
  }

  async function decide(id: string, next: "approved" | "rejected") {
    const adminNote = (noteMap[id] || "").trim();
    const res = await fetch(`${API}/map/admin/feature-promotion-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next, adminNote: adminNote || null }),
    });
    const d = await res.json();
    if (!d.success) {
      alert(d.error || "İşlem başarısız");
      return;
    }
    await load();
  }

  useEffect(() => {
    void load();
    void loadLiveFeatured();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <AdminLayout title="Öne Çıkan İşletmeler">
      <div className="space-y-4">
        <div className="bg-white border rounded-xl p-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Öne Çıkan İşletmeler</h1>
            <p className="text-sm text-gray-500">İşletme / ürün / kampanya öne çıkarma taleplerini onaylayın.</p>
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "all" | "pending" | "approved" | "rejected")}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="pending">Bekleyen</option>
            <option value="approved">Onaylı</option>
            <option value="rejected">Reddedilen</option>
            <option value="all">Tümü</option>
          </select>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-base font-bold text-gray-900">Canlıdaki Öne Çıkan / Premium İşletmeler</h2>
              <p className="text-xs text-gray-500">Haritada görünen mevcut öne çıkanları buradan anında kaldırabilirsiniz.</p>
            </div>
            <Button variant="outline" onClick={() => void loadLiveFeatured()} size="sm">Yenile</Button>
          </div>
          {liveLoading ? (
            <div className="text-sm text-gray-500 py-6 text-center">Yükleniyor…</div>
          ) : liveRows.length === 0 ? (
            <div className="text-sm text-gray-500 py-6 text-center">Canlıda öne çıkan/premium işletme yok.</div>
          ) : (
            <div className="space-y-2">
              {liveRows.map((r) => (
                <div key={r.id} className="border rounded-lg p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{r.name}</p>
                    <p className="text-xs text-gray-500">
                      {r.homepageFeatured ? "⭐ anasayfa öne çıkan" : "—"} · {r.isPremium ? "💎 premium" : "normal"} · {r.homepageSuperCategory || "kategori yok"}
                    </p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => void removeFromFeatured(r.id)}>
                    Öne Çıkarmayı Kaldır
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="bg-white border rounded-xl p-8 text-center text-sm text-gray-500">Yükleniyor…</div>
        ) : rows.length === 0 ? (
          <div className="bg-white border rounded-xl p-8 text-center text-sm text-gray-500">Kayıt bulunamadı.</div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="bg-white border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-gray-900">{r.businessName || r.businessId}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {r.targetType || "business"} · {r.placementKey} · {r.billingPeriod} × {r.units} · ₺{Number(r.totalTry).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Ödeme: {r.paymentMethod === "bank_transfer" ? "Havale/EFT" : "Stripe"} · Durum: {r.status}
                    </p>
                    {r.receiptUrl ? (
                      <a href={r.receiptUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                        Dekontu Aç
                      </a>
                    ) : null}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                    r.status === "approved" ? "bg-emerald-50 text-emerald-700" : r.status === "rejected" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                  }`}>
                    {r.status}
                  </span>
                </div>

                {r.status === "pending" ? (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      placeholder="Admin notu (opsiyonel)"
                      value={noteMap[r.id] ?? ""}
                      onChange={(e) => setNoteMap((prev) => ({ ...prev, [r.id]: e.target.value }))}
                    />
                    <div className="flex items-center gap-2">
                      <Button onClick={() => void decide(r.id, "approved")} className="bg-emerald-600 hover:bg-emerald-700 text-white">Onayla</Button>
                      <Button onClick={() => void decide(r.id, "rejected")} variant="destructive">Reddet</Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

