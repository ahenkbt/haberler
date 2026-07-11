import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Loader2, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, apiUrl, postAdminJson, ensureAdminPanelBootstrap } from "@/lib/apiBase";

export type MapPanelVendorModule = "delivery" | "ecommerce" | "turizm" | "ulasim";

type MapBizRow = {
  id: string;
  name?: string | null;
  address?: string | null;
  storeType?: string | null;
  homepageSuperCategory?: string | null;
  importSource?: string | null;
};

const MODULE_LABEL: Record<MapPanelVendorModule, string> = {
  delivery: "sipariş / teslimat",
  ecommerce: "e-ticaret",
  turizm: "turizm",
  ulasim: "ulaşım",
};

type Props = {
  vendorModule: MapPanelVendorModule;
  /** Turizm panelinde seçerek taşırken `provider_subtype` (otel, arac, …) */
  tourismSubtype?: string;
  /** `invalidateQueries` için anahtarlar, örn. `[["/api/delivery/vendors-admin","delivery"]]` */
  invalidateQueryKeys: unknown[][];
  /** React Query dışı listeler (örn. Turizm firmaları) */
  onAfterPromote?: () => void;
  /** Üst barda ek çocuk (örn. «Yeni İşletme») */
  children?: React.ReactNode;
  className?: string;
};

export function AdminMapPanelSyncToolbar({
  vendorModule,
  tourismSubtype = "otel",
  invalidateQueryKeys,
  onAfterPromote,
  children,
  className = "",
}: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [pickOpen, setPickOpen] = useState(false);
  const [pickQ, setPickQ] = useState("");
  const [pickPage, setPickPage] = useState(1);
  const [pickRows, setPickRows] = useState<MapBizRow[]>([]);
  const [pickTotal, setPickTotal] = useState(0);
  const [pickLoading, setPickLoading] = useState(false);
  const [pickSelected, setPickSelected] = useState<Record<string, boolean>>({});

  const invalidateAll = useCallback(() => {
    for (const k of invalidateQueryKeys) {
      void qc.invalidateQueries({ queryKey: k as any });
    }
  }, [invalidateQueryKeys, qc]);

  const resyncMapMut = useMutation({
    mutationFn: async () => {
      const r = await postAdminJson("/api/delivery/resync-map-from-vendors", {});
      const d = (await r.json().catch(() => ({}))) as { error?: string; synced?: number };
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      return d;
    },
    onSuccess: (d) => {
      invalidateAll();
      toast({ title: "Harita senkronu tamam", description: `${d?.synced ?? "?"} işletme Keşfet / harita ile güncellendi.` });
    },
    onError: (e: Error) => toast({ title: "Senkron başarısız", description: e.message, variant: "destructive" }),
  });

  const promoteFromMapMut = useMutation({
    mutationFn: async (opts?: { mapBusinessIds?: string[] }) => {
      const r = await postAdminJson("/api/delivery/admin/promote-map-to-vendors", {
        limit: opts?.mapBusinessIds?.length ? Math.min(opts.mapBusinessIds.length, 500) : 250,
        onlyVendorTypes: [vendorModule],
        mapBusinessIds: opts?.mapBusinessIds,
        forceVendorType: opts?.mapBusinessIds?.length ? vendorModule : undefined,
        tourismSubtype: vendorModule === "turizm" ? tourismSubtype : undefined,
      });
      const d = (await r.json().catch(() => ({}))) as {
        error?: string;
        promoted?: number;
        reassignedToTurizm?: number;
        skipped?: number;
        skippedVendorType?: number;
        errors?: string[];
      };
      if (!r.ok) throw new Error(d.error || "Taşıma başarısız");
      return d;
    },
    onSuccess: (d, vars) => {
      onAfterPromote?.();
      invalidateAll();
      const st = d.skippedVendorType ?? 0;
      const sel = vars?.mapBusinessIds?.length;
      const promoted = d.promoted ?? 0;
      const reassigned = d.reassignedToTurizm ?? 0;
      const newlyInserted = Math.max(0, promoted - reassigned);
      let extra = "";
      if (vendorModule === "turizm" && !sel && promoted === 0 && st > 0) {
        extra =
          " Haritadaki son kayıtlar çoğunlukla restoran/cafe (teslimat) olarak sınıflı; turizm paneli yalnızca otel/konaklama Places türleri veya turizm sinyali olanları alır. Otel aramasıyla haritaya ekleyin veya «Seçerek taşı» kullanın.";
      }
      const reassignedHint =
        reassigned > 0 ? ` · ${reassigned} mevcut vendor turizme taşındı (önce yanlış modüldeydi)` : "";
      toast({
        title: sel ? "Seçilenler taşındı" : "Harita → panel",
        description: `${promoted} işlem (${newlyInserted} yeni kayıt) · ${d.skipped ?? 0} atlandı${st > 0 ? ` · ${st} tür filtresi` : ""}${reassignedHint}${extra}`,
      });
      if (d.errors?.length) {
        toast({ title: "Kısmi hata", description: d.errors.slice(0, 4).join(" · "), variant: "destructive" });
      }
      if (sel) {
        setPickOpen(false);
        setPickSelected({});
      }
    },
    onError: (e: Error) => toast({ title: "Taşıma başarısız", description: e.message, variant: "destructive" }),
  });

  async function loadPickRows(p = 1) {
    setPickLoading(true);
    setPickPage(p);
    try {
      await ensureAdminPanelBootstrap();
      const params = new URLSearchParams({
        q: pickQ.trim(),
        page: String(p),
        limit: "50",
        admin: "1",
        excludeLinkedVendors: "1",
      });
      const r = await apiFetch(apiUrl(`/api/map/businesses/search?${params}`));
      const j = (await r.json().catch(() => ({}))) as {
        success?: boolean;
        data?: MapBizRow[];
        total?: number;
        error?: string;
      };
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setPickRows(Array.isArray(j.data) ? j.data : []);
      setPickTotal(typeof j.total === "number" ? j.total : 0);
    } catch (e) {
      toast({ title: "Harita listesi alınamadı", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
      setPickRows([]);
      setPickTotal(0);
    } finally {
      setPickLoading(false);
    }
  }

  const selectedIds = Object.entries(pickSelected)
    .filter(([, v]) => v)
    .map(([id]) => id);

  return (
    <>
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex items-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          disabled={resyncMapMut.isPending}
          onClick={() => resyncMapMut.mutate(undefined)}
        >
          <MapPin className="w-4 h-4" /> {resyncMapMut.isPending ? "Senkron…" : "Harita & Keşfet senkronu"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex items-center gap-2 border-teal-200 text-teal-800 hover:bg-teal-50"
          disabled={promoteFromMapMut.isPending}
          onClick={() => promoteFromMapMut.mutate(undefined)}
          title={`Haritada olup ${MODULE_LABEL[vendorModule]} panelinde kaydı olmayan işletmeleri toplu taşır`}
        >
          <MapPin className="w-4 h-4" /> {promoteFromMapMut.isPending ? "Taşınıyor…" : "Haritayı panele taşı"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex items-center gap-2 border-amber-200 text-amber-900 hover:bg-amber-50"
          disabled={promoteFromMapMut.isPending}
          onClick={() => {
            setPickOpen(true);
            void loadPickRows(1);
          }}
        >
          <ListChecks className="w-4 h-4" /> Seçerek taşı
        </Button>
        {children}
      </div>

      <Dialog open={pickOpen} onOpenChange={setPickOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Haritadan seç — {MODULE_LABEL[vendorModule]} paneline</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Vendor&apos;ı olmayan harita kayıtları listelenir. İşaretleyip taşıyın; turizmde alt tür: <strong>{tourismSubtype}</strong>.
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            <Input
              placeholder="İşletme adı veya adres ara…"
              value={pickQ}
              onChange={(e) => setPickQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void loadPickRows(1)}
              className="max-w-xs"
            />
            <Button type="button" size="sm" variant="secondary" disabled={pickLoading} onClick={() => void loadPickRows(1)}>
              {pickLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ara"}
            </Button>
            <span className="text-xs text-gray-500">{pickTotal} kayıt</span>
          </div>
          <div className="border rounded-md divide-y max-h-[48vh] overflow-y-auto mt-2">
            {pickRows.map((row) => (
              <label key={row.id} className="flex items-start gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={Boolean(pickSelected[row.id])}
                  onChange={(e) => setPickSelected((prev) => ({ ...prev, [row.id]: e.target.checked }))}
                />
                <span>
                  <span className="font-medium text-gray-900">{row.name || "—"}</span>
                  {row.address ? <span className="block text-xs text-gray-500">{row.address}</span> : null}
                  <span className="block text-[10px] text-gray-400 font-mono">{row.id}</span>
                </span>
              </label>
            ))}
            {!pickLoading && pickRows.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">Kayıt yok veya arama sonucu boş.</div>
            ) : null}
          </div>
          <div className="flex flex-wrap justify-between items-center gap-2 pt-2">
            <div className="text-xs text-gray-600">
              Seçili: {selectedIds.length}
              {pickTotal > 50 ? (
                <span className="ml-2">
                  Sayfa {pickPage} / {Math.max(1, Math.ceil(pickTotal / 50))}
                </span>
              ) : null}
            </div>
            <div className="flex gap-2">
              {pickTotal > 50 && pickPage > 1 ? (
                <Button type="button" size="sm" variant="outline" onClick={() => void loadPickRows(pickPage - 1)}>
                  Önceki
                </Button>
              ) : null}
              {pickTotal > 50 && pickPage * 50 < pickTotal ? (
                <Button type="button" size="sm" variant="outline" onClick={() => void loadPickRows(pickPage + 1)}>
                  Sonraki
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                disabled={selectedIds.length === 0 || promoteFromMapMut.isPending}
                className="bg-teal-600 hover:bg-teal-700 text-white"
                onClick={() => {
                  if (selectedIds.length === 0) return;
                  if (!confirm(`${selectedIds.length} işletmeyi ${MODULE_LABEL[vendorModule]} paneline taşımak istiyor musunuz?`)) return;
                  promoteFromMapMut.mutate({ mapBusinessIds: selectedIds });
                }}
              >
                {promoteFromMapMut.isPending ? "Taşınıyor…" : "Seçilenleri taşı"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
