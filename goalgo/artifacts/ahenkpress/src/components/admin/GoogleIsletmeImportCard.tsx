import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, apiUrl } from "@/lib/apiBase";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export type GoogleVendorPortalType = "delivery" | "ecommerce" | "turizm" | "ulasim";

export function vendorGoogleImportColumns(v: Record<string, unknown>): { scrape: boolean; api: boolean } {
  const k = String(v.googleImportKind ?? v.google_import_kind ?? "").toLowerCase();
  return {
    scrape: k === "gmaps_scrape" || k === "osm",
    api: k === "places_api",
  };
}

export function GoogleIsletmeImportCard(props: {
  vendorType: GoogleVendorPortalType;
  tourismSubtype?: string;
  borderClass?: string;
  onImported?: () => void;
}) {
  const { toast } = useToast();
  const [placeId, setPlaceId] = useState("");
  const [query, setQuery] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [busy, setBusy] = useState(false);
  const [bulkLines, setBulkLines] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

  function lineToPlaceItem(line: string): { placeId?: string; query?: string } {
    const t = line.trim();
    if (!t) return {};
    if (/^ChIJ[\w-]{10,}/i.test(t)) return { placeId: t };
    return { query: t };
  }

  async function runBulkImport() {
    const raw = bulkLines
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (raw.length === 0) {
      toast({ title: "Eksik", description: "Toplu alana en az bir satır yazın.", variant: "destructive" });
      return;
    }
    const items = raw.map(lineToPlaceItem).filter((x) => x.placeId || x.query);
    if (items.length === 0) {
      toast({ title: "Eksik", description: "Geçerli Place ID veya arama satırı yok.", variant: "destructive" });
      return;
    }
    setBulkBusy(true);
    try {
      const r = await apiFetch(apiUrl("/api/delivery/admin/import-google-place-vendor-bulk"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          vendorType: props.vendorType,
          tourismSubtype: props.tourismSubtype,
          max: 25,
          lat: lat.trim() ? parseFloat(lat.replace(",", ".")) : undefined,
          lng: lng.trim() ? parseFloat(lng.replace(",", ".")) : undefined,
        }),
      });
      const d = (await r.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        succeeded?: number;
        failed?: number;
        processed?: number;
      };
      if (!r.ok) {
        let msg = d.error || `HTTP ${r.status}`;
        if (r.status === 401 || d.code === "ADMIN_REQUIRED") {
          msg += " Panel oturumu gerekir; çıkış yapıp yeniden giriş yapın.";
        }
        throw new Error(msg);
      }
      toast({
        title: "Google toplu içe aktarma",
        description: `İşlenen: ${d.processed ?? "?"} · Başarılı: ${d.succeeded ?? "?"} · Hatalı: ${d.failed ?? "?"}`,
      });
      setBulkLines("");
      props.onImported?.();
    } catch (err) {
      toast({ title: "Google toplu", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBulkBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!placeId.trim() && !query.trim()) {
      toast({ title: "Eksik", description: "Place ID veya arama metni girin.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const r = await apiFetch(apiUrl("/api/delivery/admin/import-google-place-vendor"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: placeId.trim() || undefined,
          query: query.trim() || undefined,
          lat: lat.trim() ? parseFloat(lat.replace(",", ".")) : undefined,
          lng: lng.trim() ? parseFloat(lng.replace(",", ".")) : undefined,
          vendorType: props.vendorType,
          tourismSubtype: props.tourismSubtype,
        }),
      });
      const d = (await r.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        vendorId?: number;
        createdVendor?: boolean;
      };
      if (!r.ok) {
        let msg = d.error || `İçe aktarma başarısız (HTTP ${r.status})`;
        if (r.status === 401 || d.code === "ADMIN_REQUIRED") {
          msg += " Panel oturumu gerekir; çıkış yapıp yeniden giriş yapın.";
        }
        throw new Error(msg);
      }
      toast({
        title: "Google işletme",
        description: d.createdVendor ? `Yeni vendor #${d.vendorId}` : `Güncellendi · vendor #${d.vendorId}`,
      });
      setPlaceId("");
      setQuery("");
      props.onImported?.();
    } catch (err) {
      toast({ title: "Google işletme", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`rounded-xl border bg-white p-4 space-y-3 ${props.borderClass ?? "border-sky-100"}`}>
      <h3 className="text-sm font-semibold text-gray-900">Google&apos;dan işletme ekle (Place Details)</h3>
      <p className="text-xs text-gray-600">
        <strong>Place ID</strong> (ChIJ…) tercihtir. Yoksa <strong>arama metni</strong> + isteğe bağlı enlem/boylam ile bulunur. Google Cloud&apos;da Places (Find Place + Details) açık olmalıdır.
      </p>
      <form onSubmit={onSubmit} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 items-end">
        <div className="sm:col-span-2">
          <label className="text-[11px] font-semibold text-gray-500 block mb-0.5">Google Place ID</label>
          <Input value={placeId} onChange={(e) => setPlaceId(e.target.value)} placeholder="ChIJ…" className="text-sm" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-[11px] font-semibold text-gray-500 block mb-0.5">Veya arama metni</label>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Örn. Simit Sarayı Kadıköy" className="text-sm" />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-500 block mb-0.5">Enlem (opsiyonel)</label>
          <Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="41.008" className="text-sm" />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-500 block mb-0.5">Boylam (opsiyonel)</label>
          <Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="28.978" className="text-sm" />
        </div>
        <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-2">
          <Button type="submit" disabled={busy || bulkBusy} className="bg-sky-600 hover:bg-sky-700">
            {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Google&apos;dan çek ve kaydet
          </Button>
        </div>
      </form>

      <div className="pt-2 border-t border-gray-100 space-y-2">
        <h4 className="text-xs font-semibold text-gray-800">Toplu ekleme (aynı vendor türü)</h4>
        <p className="text-[11px] text-gray-500">
          Her satır bir <strong>Place ID</strong> (ChIJ…) veya <strong>arama metni</strong>. Üstteki enlem/boylam tüm satırlara ortak uygulanır. En fazla 25 satır / istek.
        </p>
        <Textarea
          value={bulkLines}
          onChange={(e) => setBulkLines(e.target.value)}
          placeholder={"ChIJ…\nOtel Adı Çankaya\nİkinci işletme adı"}
          rows={5}
          className="text-sm font-mono"
        />
        <div className="flex justify-end">
          <Button type="button" variant="secondary" disabled={busy || bulkBusy} onClick={() => void runBulkImport()}>
            {bulkBusy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Toplu çek ve kaydet
          </Button>
        </div>
      </div>
    </div>
  );
}
