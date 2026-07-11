import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { asArray, apiRequest } from "@/lib/queryClient";
import { useCreateCategory, useDeleteCategory, useUpdateCategory } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Loader2, Tag, Pencil, Wand2, Combine, Globe } from "lucide-react";
import { Link } from "wouter";
import { HM_EDITOR_CATEGORIES_QUERY_KEY } from "@/lib/hmEditorQueryKeys";

type Row = {
  id: number;
  name: string;
  slug: string;
  color: string;
  newsCount: number;
  exclusiveSiteId?: number | null;
  exclusiveSiteName?: string | null;
  looksSitePrefixedGlobal?: boolean;
};

export default function HaberKategorileri() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["/api/categories", "scope", "admin"],
    queryFn: () => apiRequest("/api/categories?scope=admin") as Promise<Row[]>,
  });
  const rows = asArray<Row>(data);

  const {
    data: hmSitesRaw,
    isLoading: hmSitesLoading,
    isError: hmSitesError,
    error: hmSitesErrObj,
    refetch: refetchHmSites,
  } = useQuery({
    queryKey: ["/api/hm/meta/slugs", "admin", "haber-kategorileri"],
    queryFn: () =>
      apiRequest("/api/hm/meta/slugs?admin=1") as Promise<
        { id: number; slug: string; displayName: string; active?: boolean }[]
      >,
  });
  const hmSites = Array.isArray(hmSitesRaw) ? hmSitesRaw : [];

  const [consolidating, setConsolidating] = useState(false);
  const [open, setOpen] = useState(false);
  const [promotingId, setPromotingId] = useState<number | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSourceIds, setMergeSourceIds] = useState<number[]>([]);
  const [mergeTargetName, setMergeTargetName] = useState("");
  const [mergeMakeGeneral, setMergeMakeGeneral] = useState(true);
  const [merging, setMerging] = useState(false);

  const promote = async (row: Row) => {
    if (!confirm(`"${row.name}" kategorisi GENEL (tüm siteler) yapılsın mı?`)) return;
    setPromotingId(row.id);
    try {
      await apiRequest(`/api/categories/${row.id}/promote`, { method: "POST" });
      void qc.invalidateQueries({ queryKey: ["/api/categories"] });
      void qc.invalidateQueries({ queryKey: [...HM_EDITOR_CATEGORIES_QUERY_KEY] });
      toast({ title: "Kategori genel yapıldı" });
    } catch (e) {
      toast({
        title: "Yükseltilemedi",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setPromotingId(null);
    }
  };

  const toggleMergeSource = (id: number) =>
    setMergeSourceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleMerge = async () => {
    if (mergeSourceIds.length < 2) {
      toast({ title: "En az 2 kategori seçin", variant: "destructive" });
      return;
    }
    const targetName = mergeTargetName.trim();
    if (!targetName) {
      toast({ title: "Hedef kategori adı gerekli", variant: "destructive" });
      return;
    }
    setMerging(true);
    try {
      await apiRequest("/api/categories/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceIds: mergeSourceIds, targetName, makeGeneral: mergeMakeGeneral }),
      });
      void qc.invalidateQueries({ queryKey: ["/api/categories"] });
      void qc.invalidateQueries({ queryKey: [...HM_EDITOR_CATEGORIES_QUERY_KEY] });
      toast({ title: "Kategoriler birleştirildi" });
      setMergeOpen(false);
      setMergeSourceIds([]);
      setMergeTargetName("");
    } catch (e) {
      toast({
        title: "Birleştirilemedi",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setMerging(false);
    }
  };

  const runConsolidate = async (dryRun: boolean) => {
    setConsolidating(true);
    try {
      const r = await apiRequest("/api/categories/consolidate-site-prefix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun }),
      }) as {
        dryRun: boolean;
        migrated: number;
        newsMoved: number;
        categoriesDeleted: number;
        categoriesCreated: number;
        skipped: { slug: string; reason: string }[];
        actions: string[];
      };
      void qc.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: dryRun ? "Önizleme tamam" : "Kategoriler birleştirildi",
        description: `${r.migrated} kategori, ${r.newsMoved} haber${dryRun ? " (dry-run)" : ""}`,
      });
      if (r.skipped.length > 0 && !dryRun) {
        console.warn("consolidate skipped", r.skipped);
      }
    } catch (e) {
      toast({
        title: "Birleştirme başarısız",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setConsolidating(false);
    }
  };
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    color: "#e61e25",
  });

  const closeDialog = () => {
    setOpen(false);
    setEditingId(null);
    setForm({
      name: "",
      slug: "",
      color: "#e61e25",
    });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({
      name: "",
      slug: "",
      color: "#e61e25",
    });
    setOpen(true);
  };

  const openEdit = (row: Row) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      slug: row.slug,
      color: row.color?.trim() || "#e61e25",
    });
    setOpen(true);
  };

  const createMut = useCreateCategory({
    mutation: {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: ["/api/categories"] });
        void qc.invalidateQueries({ queryKey: [...HM_EDITOR_CATEGORIES_QUERY_KEY] });
        closeDialog();
        toast({ title: "Kategori eklendi" });
      },
      onError: (e) =>
        toast({
          title: "Eklenemedi",
          description: e instanceof Error ? e.message : undefined,
          variant: "destructive",
        }),
    },
  });

  const deleteMut = useDeleteCategory({
    mutation: {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: ["/api/categories"] });
        void qc.invalidateQueries({ queryKey: [...HM_EDITOR_CATEGORIES_QUERY_KEY] });
        toast({ title: "Kategori silindi" });
      },
      onError: () => toast({ title: "Silinemedi", variant: "destructive" }),
    },
  });

  const updateMut = useUpdateCategory({
    mutation: {
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: ["/api/categories"] });
        void qc.invalidateQueries({ queryKey: [...HM_EDITOR_CATEGORIES_QUERY_KEY] });
        closeDialog();
        toast({ title: "Kategori güncellendi" });
      },
      onError: (e) =>
        toast({
          title: "Güncellenemedi",
          description: e instanceof Error ? e.message : undefined,
          variant: "destructive",
        }),
    },
  });

  const autoSlug = (name: string) =>
    name
      .toLowerCase()
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ı/g, "i")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  const handleSave = () => {
    const name = form.name.trim();
    const slug = (form.slug.trim() || autoSlug(name)).trim();
    if (!name || !slug) {
      toast({ title: "Ad ve slug gerekli", variant: "destructive" });
      return;
    }
    const editingRow = editingId != null ? rows.find((r) => r.id === editingId) : undefined;
    const exclusiveSiteId = editingRow != null ? (editingRow.exclusiveSiteId ?? null) : null;
    const payload = { name, slug, color: form.color.trim() || "#e61e25", exclusiveSiteId };
    if (editingId != null) {
      updateMut.mutate({ id: editingId, data: payload });
    } else {
      createMut.mutate({ data: payload });
    }
  };

  const handleDelete = (row: Row) => {
    if (row.newsCount > 0) {
      if (!confirm(`Bu kategoride ${row.newsCount} haber var. Silmek istediğinize emin misiniz?`)) return;
    } else if (!confirm(`"${row.name}" silinsin mi?`)) {
      return;
    }
    deleteMut.mutate({ id: row.id });
  };

  const siteLabel = (id: number | null | undefined) => {
    if (id == null) return null;
    const s = hmSites.find((x) => x.id === id);
    if (!s) return `#${id}`;
    const suffix = s.active === false ? " (pasif)" : "";
    return `${s.displayName}${suffix}`;
  };

  return (
    <AdminLayout title="Haber Kategorileri">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-sm text-gray-500">
            <strong>Genel</strong> kategorileri buradan yönetin; tüm HM siteleri ve merkez haber akışında kullanılır.{" "}
            <strong>Siteye özel</strong> kategoriler ilgili haber sitesinin{" "}
            <Link href="/editor/kategoriler" className="text-[#e61e25] hover:underline">
              editör paneli
            </Link>{" "}
            üzerinden açılır — vitrinde yalnızca o site görür; RSS / AI hedef site seçildiğinde merkez panelde yine
            seçilebilir.{" "}
            <Link href="/admin/haberler" className="text-[#e61e25] hover:underline">
              Haberlere dön
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            variant="outline"
            disabled={consolidating}
            onClick={() => void runConsolidate(true)}
            title="Site önekli global kategorileri (vkd-*, asg-*) siteye özel kategorilere taşı — önizleme"
          >
            {consolidating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
            Önizle
          </Button>
          <Button
            variant="outline"
            disabled={consolidating}
            onClick={() => {
              if (!confirm("Site önekli global kategoriler siteye özel kategorilere taşınacak ve global kayıtlar silinecek. Devam?"))
                return;
              void runConsolidate(false);
            }}
          >
            Birleştir ve uygula
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setMergeSourceIds([]);
              setMergeTargetName("");
              setMergeMakeGeneral(true);
              setMergeOpen(true);
            }}
            title="Seçili kategorileri tek hedefe birleştir (haberler taşınır, eski slug'lar yönlendirilir)"
          >
            <Combine className="w-4 h-4 mr-2" />
            Kategori birleştir
          </Button>
          <Button className="bg-[#e61e25] hover:bg-[#c9181e] text-white" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Yeni kategori
          </Button>
        </div>
      </div>

      {hmSitesLoading ? (
        <p className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> HM site adları yükleniyor (kapsam sütunu)…
        </p>
      ) : hmSitesError ? (
        <p className="text-xs text-red-800 bg-red-50 border border-red-100 rounded px-2 py-2 mb-3">
          HM site listesi alınamadı: {hmSitesErrObj instanceof Error ? hmSitesErrObj.message : "bilinmeyen hata"}.{" "}
          <button type="button" className="underline font-medium" onClick={() => void refetchHmSites()}>
            Tekrar dene
          </button>
        </p>
      ) : null}

      <div className="bg-white rounded-md shadow-sm border">
        {isLoading ? (
          <div className="flex justify-center py-16 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            <Tag className="w-10 h-10 mx-auto mb-2 opacity-40" />
            Henüz kategori yok. &quot;Yeni kategori&quot; ile ekleyin.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Renk</TableHead>
                <TableHead>Ad</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Kapsam</TableHead>
                <TableHead className="text-right">Haber</TableHead>
                <TableHead className="w-[120px] text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <span
                      className="inline-block w-8 h-8 rounded border"
                      style={{ backgroundColor: row.color || "#ccc" }}
                      title={row.color}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{row.slug}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.exclusiveSiteId != null ? (
                      <span>
                        Siteye özel · {row.exclusiveSiteName ?? siteLabel(row.exclusiveSiteId) ?? row.exclusiveSiteId}
                      </span>
                    ) : row.looksSitePrefixedGlobal ? (
                      <span className="text-amber-800">Tüm siteler · site önekli (birleştirilmeli)</span>
                    ) : (
                      <span>Tüm siteler</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{row.newsCount ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-0.5">
                      {row.exclusiveSiteId != null ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-emerald-700 hover:text-emerald-800"
                          title="Genel (tüm siteler) yap"
                          disabled={promotingId === row.id}
                          onClick={() => void promote(row)}
                        >
                          {promotingId === row.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Globe className="w-4 h-4" />
                          )}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-slate-600 hover:text-slate-900"
                        title="Düzenle"
                        disabled={createMut.isPending || updateMut.isPending || deleteMut.isPending}
                        onClick={() => openEdit(row)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700"
                        disabled={deleteMut.isPending}
                        onClick={() => handleDelete(row)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) closeDialog();
          else setOpen(true);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId != null ? "Kategoriyi düzenle" : "Yeni haber kategorisi"}</DialogTitle>
          </DialogHeader>
          {editingId != null ? (
            <p className="text-xs text-muted-foreground -mt-1">
              Slug değişirse RSS kampanyalarındaki kategori alanını ve haber URL’lerindeki kategori sekmelerini kontrol
              edin.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground -mt-1">
              Burada yalnızca <strong>tüm sitelerde</strong> geçerli genel kategori oluşturursunuz. Siteye özel kategori
              için haber sitesi editöründeki Kategoriler sayfasını kullanın.
            </p>
          )}
          <div className="space-y-4 pt-2">
            <div>
              <Label>Kategori adı</Label>
              <Input
                className="mt-1"
                value={form.name}
                placeholder="Örn: Gündem"
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({
                    ...f,
                    name,
                    slug:
                      editingId == null && (f.slug === "" || f.slug === autoSlug(f.name))
                        ? autoSlug(name)
                        : f.slug,
                  }));
                }}
              />
            </div>
            <div>
              <Label>Slug (URL)</Label>
              <Input
                className="mt-1 font-mono text-sm"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="gundem"
              />
            </div>
            <div>
              <Label>Renk</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="color"
                  className="w-14 h-10 p-1 cursor-pointer"
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                />
                <Input
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  placeholder="#e61e25"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeDialog}>
                İptal
              </Button>
              <Button
                className="bg-[#e61e25] hover:bg-[#c9181e] text-white"
                disabled={createMut.isPending || updateMut.isPending}
                onClick={handleSave}
              >
                {createMut.isPending || updateMut.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingId != null ? (
                  "Güncelle"
                ) : (
                  "Kaydet"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={mergeOpen} onOpenChange={(v) => (v ? setMergeOpen(true) : setMergeOpen(false))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kategorileri birleştir</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-1">
            Seçtiğiniz kategorilerin tüm haberleri hedef kategoriye taşınır ve eski slug&apos;lar yeni kategoriye
            yönlendirilir (linkler kırılmaz).
          </p>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs">Birleştirilecek kategoriler</Label>
              <div className="mt-1 max-h-60 overflow-y-auto rounded-md border divide-y">
                {rows.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={mergeSourceIds.includes(r.id)}
                      onChange={() => toggleMergeSource(r.id)}
                    />
                    <span className="inline-flex items-center gap-2 text-sm">
                      <span className="h-2 w-2 rounded-full" style={{ background: r.color || "#94a3b8" }} />
                      {r.name}
                      <span className="text-xs text-slate-400">
                        ({r.newsCount ?? 0}){r.exclusiveSiteId != null ? " · siteye özel" : ""}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Hedef kategori adı</Label>
              <Input
                className="mt-1"
                value={mergeTargetName}
                onChange={(e) => setMergeTargetName(e.target.value)}
                placeholder="Örn: Savunma Sanayi"
              />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={mergeMakeGeneral}
                onChange={(e) => setMergeMakeGeneral(e.target.checked)}
              />
              Hedefi GENEL (tüm siteler) yap
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setMergeOpen(false)}>
                İptal
              </Button>
              <Button
                className="bg-[#e61e25] hover:bg-[#c9181e] text-white"
                disabled={merging || mergeSourceIds.length < 2}
                onClick={() => void handleMerge()}
              >
                {merging ? <Loader2 className="w-4 h-4 animate-spin" /> : "Birleştir"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
