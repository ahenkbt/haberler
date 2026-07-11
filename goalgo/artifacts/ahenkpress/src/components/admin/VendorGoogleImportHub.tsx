import { useState } from "react";
import { Link } from "wouter";
import { apiFetch, apiUrl } from "@/lib/apiBase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleIsletmeImportCard, type GoogleVendorPortalType } from "@/components/admin/GoogleIsletmeImportCard";
import { Loader2 } from "lucide-react";

type GmapsPreviewRow = { name: string; address?: string | null; rating?: number | null };

/**
 * Servis işletme listelerinde Google’u iki kanala ayırır:
 * A) Places API → doğrudan vendor
 * B) Maps bot → yalnız önizleme (kayıt için Haritalar yönetimi)
 */
export function VendorGoogleImportHub(props: {
  vendorType: GoogleVendorPortalType;
  tourismSubtype?: string;
  onImported?: () => void;
}) {
  const [gQuery, setGQuery] = useState("");
  const [gLat, setGLat] = useState("");
  const [gLng, setGLng] = useState("");
  const [gMax, setGMax] = useState("20");
  const [gBusy, setGBusy] = useState(false);
  const [gPreview, setGPreview] = useState<GmapsPreviewRow[]>([]);
  const [gErr, setGErr] = useState<string | null>(null);

  async function runGmapsPreview() {
    const q = gQuery.trim();
    if (!q) {
      setGErr("Arama metni girin (örn. Ankara Çankaya restoranlar).");
      return;
    }
    setGBusy(true);
    setGErr(null);
    setGPreview([]);
    try {
      const lat = gLat.trim() ? parseFloat(gLat.replace(",", ".")) : undefined;
      const lng = gLng.trim() ? parseFloat(gLng.replace(",", ".")) : undefined;
      const maxResults = Math.min(50, Math.max(1, parseInt(gMax, 10) || 20));
      const r = await apiFetch(apiUrl("/api/map/scrape-gmaps"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          maxResults,
          autoImport: false,
          ...(Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : {}),
        }),
      });
      const raw = await r.text();
      let d: { success?: boolean; async?: boolean; jobId?: string; data?: GmapsPreviewRow[]; error?: string; total?: number } = {};
      try {
        d = raw ? (JSON.parse(raw) as typeof d) : {};
      } catch {
        setGErr(`HTTP ${r.status}: yanıt JSON değil`);
        return;
      }
      if (!r.ok || d.success === false) {
        setGErr(d.error || `HTTP ${r.status}`);
        return;
      }
      if (r.status === 202 && d.async && d.jobId) {
        for (let i = 0; i < 120; i++) {
          await new Promise((res) => setTimeout(res, 1500));
          const jr = await apiFetch(apiUrl(`/api/map/admin/scrape-gmaps-job/${d.jobId}`));
          const job = (await jr.json().catch(() => ({}))) as {
            success?: boolean;
            status?: string;
            result?: { data?: GmapsPreviewRow[]; total?: number };
            error?: string;
          };
          if (!jr.ok || job.success === false) {
            setGErr(job.error || `İş durumu HTTP ${jr.status}`);
            return;
          }
          if (job.status === "error") {
            setGErr(job.error || "Kazıma hatası");
            return;
          }
          if (job.status === "done" && job.result) {
            setGPreview(Array.isArray(job.result.data) ? job.result.data : []);
            return;
          }
        }
        setGErr("Zaman aşımı — önizleme hâlâ sürüyor olabilir");
        return;
      }
      setGPreview(Array.isArray(d.data) ? d.data : []);
    } catch (e) {
      setGErr(e instanceof Error ? e.message : String(e));
    } finally {
      setGBusy(false);
    }
  }

  return (
    <div className="rounded-xl border-2 border-violet-200 bg-gradient-to-br from-violet-50/90 to-white p-4 space-y-4 shadow-sm">
      <div>
        <h3 className="text-sm font-bold text-violet-950">Google: resmi API ve APIsiz kazıma</h3>
        <p className="text-xs text-violet-900/85 mt-1 leading-relaxed">
          <strong className="text-violet-950">A)</strong> Places ile tek işletmeyi bu portala ekleyin.&nbsp;
          <strong className="text-violet-950">B)</strong> APIsiz bot burada yalnızca önizleme verir; toplu kayıt için{" "}
          <Link href="/admin/haritalar-yonetimi" className="font-semibold underline text-violet-950 hover:text-violet-800">
            Haritalar → Veri Kazıyıcı
          </Link>{" "}
          kullanıp ardından bu sayfadaki <strong>Haritayı panele taşı</strong> ile vendor oluşturun.
        </p>
        {props.vendorType === "turizm" ? (
          <p className="text-[11px] text-amber-900/95 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 leading-relaxed">
            <strong className="text-amber-950">Önemli:</strong> Bu sayfadaki taşıma yalnızca haritada{" "}
            <strong>otel / konaklama</strong> (Google Places&apos;te <code className="text-[10px]">lodging</code> vb.) veya
            turizmle eşleşen türleri olan kayıtları turizm firması yapar. Aramayı{" "}
            <strong>restoran</strong> olarak yaptıysanız kayıtlar <strong>Sipariş / teslimat</strong> modülüne düşer; otel
            çekmek için aramayı veya Haritalar kazıyıcısındaki sorguyu otel odaklı yapın. İstisnai durumda{" "}
            <strong>Seçerek taşı</strong> ile haritadan işaretleyip zorla turizm paneline alabilirsiniz.
          </p>
        ) : null}
      </div>

      <div className="rounded-lg border border-sky-200 bg-white p-3 space-y-2">
        <div className="text-[11px] font-bold uppercase tracking-wide text-sky-900">A) Google Places API — tek işletme</div>
        <GoogleIsletmeImportCard
          vendorType={props.vendorType}
          tourismSubtype={props.tourismSubtype}
          borderClass="border-0 shadow-none"
          onImported={props.onImported}
        />
      </div>

      <div className="rounded-lg border border-amber-200 bg-white p-3 space-y-3">
        <div className="text-[11px] font-bold uppercase tracking-wide text-amber-950">B) Google Maps bot — önizleme (API anahtarı gerekmez)</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-2 items-end">
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="text-[11px] font-semibold text-gray-600 block mb-0.5">Arama</label>
            <Input
              value={gQuery}
              onChange={(e) => setGQuery(e.target.value)}
              placeholder={
                props.vendorType === "turizm"
                  ? "Ankara Çankaya oteller"
                  : "Ankara Çankaya restoranlar"
              }
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-600 block mb-0.5">Enlem</label>
            <Input value={gLat} onChange={(e) => setGLat(e.target.value)} placeholder="opsiyonel" className="text-sm" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-600 block mb-0.5">Boylam</label>
            <Input value={gLng} onChange={(e) => setGLng(e.target.value)} placeholder="opsiyonel" className="text-sm" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-600 block mb-0.5">Maks.</label>
            <Input type="number" min={1} max={50} value={gMax} onChange={(e) => setGMax(e.target.value)} className="text-sm" />
          </div>
          <div className="flex justify-end">
            <Button type="button" variant="secondary" disabled={gBusy} onClick={() => void runGmapsPreview()} className="bg-amber-100 text-amber-950 border border-amber-300 hover:bg-amber-200">
              {gBusy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Önizle
            </Button>
          </div>
        </div>
        {gErr ? <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-2 py-1.5">{gErr}</p> : null}
        {gPreview.length > 0 ? (
          <div className="max-h-52 overflow-y-auto rounded-md border border-amber-100 divide-y text-xs">
            {gPreview.map((row, i) => (
              <div key={`${row.name}-${i}`} className="px-2 py-1.5 flex justify-between gap-2">
                <span className="font-medium text-gray-900 truncate">{row.name}</span>
                <span className="text-gray-500 shrink-0">{row.rating != null ? `★ ${row.rating}` : ""}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
