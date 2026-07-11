import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EditorLayout } from "@/components/EditorLayout";
import { apiUrl } from "@/lib/apiBase";
import { readHmJwt } from "@/lib/hmSession";
import { HM_EDITOR_CATEGORIES_QUERY_KEY } from "@/lib/hmEditorQueryKeys";
import { normalizeNewsCategorySlug } from "@/lib/hmCategorySlug";
import {
  HM_GLOBAL_NEWS_CATEGORY_SLUG,
  HM_OPT_IN_NEWS_CATEGORY_SLUGS,
  isHmOptInNewsCategorySlug,
} from "@/lib/hmGlobalNewsCategory";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useHmEditor } from "@/contexts/HmEditorContext";
import { useToast } from "@/hooks/use-toast";
import { ArrowDown, ArrowUp, ChevronsUp, Combine, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

type Cat = {
  id: number;
  name: string;
  slug: string;
  color: string;
  newsCount: number;
  exclusiveSiteId?: number | null;
};

function autoSlug(name: string) {
  return name
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
}

async function hmFetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const t = readHmJwt();
  if (!t) throw new Error("Oturum yok");
  const r = await fetch(apiUrl(path), {
    ...init,
    headers: {
      Authorization: `Bearer ${t}`,
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string>),
    },
  });
  const text = await r.text().catch(() => "");
  if (!r.ok) throw new Error(text || `HTTP ${r.status}`);
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export default function EditorKategoriler() {
  const { newsLayoutPrefs, saveNewsSiteLayout, refreshMe, site } = useHmEditor();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", color: "#e61e25" });
  const [submitting, setSubmitting] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSourceIds, setMergeSourceIds] = useState<number[]>([]);
  const [mergeTargetName, setMergeTargetName] = useState("");
  const [merging, setMerging] = useState(false);

  const hidden = newsLayoutPrefs.hmNavHiddenCategorySlugs ?? [];
  const hiddenSet = useMemo(
    () => new Set(hidden.map((s) => normalizeNewsCategorySlug(s)).filter(Boolean)),
    [hidden],
  );

  const sid = site?.id;
  const vitrinTheme = String(newsLayoutPrefs.hmVitrinTheme ?? "").trim().toLowerCase();
  const isCorporateSite = vitrinTheme === "corporate" || vitrinTheme === "kurumsal";
  const { data: cats = [], isLoading } = useQuery({
    queryKey: [...HM_EDITOR_CATEGORIES_QUERY_KEY],
    queryFn: () => hmFetchJson<Cat[]>("/api/hm/editor/categories"),
    enabled: sid != null,
  });

  // Yekpare (genel) kategorileri — editör bu sitede hangilerinin aktif olduğunu seçer.
  const { data: generalCats = [] } = useQuery({
    queryKey: ["editor-general-categories"],
    queryFn: () => hmFetchJson<Cat[]>("/api/categories"),
    enabled: sid != null,
  });

  const invalidateCats = () => void qc.invalidateQueries({ queryKey: [...HM_EDITOR_CATEGORIES_QUERY_KEY] });

  const generalSlugs = useMemo(
    () => generalCats.map((c) => String(c.slug ?? "").trim().toLowerCase()).filter(Boolean),
    [generalCats],
  );
  const storedActivated = newsLayoutPrefs.hmActivatedCategorySlugs ?? [];
  const standardGeneralSlugs = useMemo(
    () => generalSlugs.filter((s) => !HM_OPT_IN_NEWS_CATEGORY_SLUGS.has(s)),
    [generalSlugs],
  );
  // Boş liste = tüm standart genel kategoriler aktif; global opt-in (varsayılan kapalı).
  const activeSet = useMemo(
    () =>
      storedActivated.length
        ? new Set(storedActivated.map((s) => s.trim().toLowerCase()).filter(Boolean))
        : new Set(standardGeneralSlugs),
    [storedActivated, standardGeneralSlugs],
  );

  const toggleActivation = async (slug: string, on: boolean) => {
    const s = String(slug ?? "").trim().toLowerCase();
    if (!s) return;
    const next = new Set(activeSet);
    if (on) next.add(s);
    else next.delete(s);
    const allStandardActive =
      standardGeneralSlugs.length > 0 &&
      standardGeneralSlugs.every((g) => next.has(g)) &&
      !next.has(HM_GLOBAL_NEWS_CATEGORY_SLUG);
    const nextArr = allStandardActive ? null : [...next];
    setSaving(true);
    const r = await saveNewsSiteLayout(newsLayoutPrefs, { layoutPatch: { hmActivatedCategorySlugs: nextArr } });
    setSaving(false);
    if (!r.ok) {
      toast({ title: "Kaydedilemedi", description: r.error.slice(0, 200), variant: "destructive" });
    } else {
      toast({ title: on ? "Kategori aktif edildi" : "Kategori kapatıldı" });
    }
  };

  const toggleCrossSiteManual = async (on: boolean) => {
    setSaving(true);
    const r = await saveNewsSiteLayout(newsLayoutPrefs, {
      layoutPatch: { hmAllowCrossSiteManualNews: on },
    });
    setSaving(false);
    if (!r.ok) {
      toast({ title: "Kaydedilemedi", description: r.error.slice(0, 200), variant: "destructive" });
    } else {
      toast({
        title: on ? "Diğer sitelerden manuel haberler açıldı" : "Diğer sitelerden manuel haberler kapatıldı",
      });
    }
  };

  const slugList = useMemo(
    () => cats.map((c) => String(c.slug ?? "").trim().toLowerCase()).filter(Boolean),
    [cats],
  );

  const persistOrder = async (nextSlugs: string[]) => {
    setSaving(true);
    try {
      await hmFetchJson<{ ok: boolean }>("/api/hm/editor/categories/order", {
        method: "PATCH",
        body: JSON.stringify({ slugs: nextSlugs }),
      });
      await refreshMe();
      invalidateCats();
      toast({ title: "Kategori sırası kaydedildi" });
    } catch (e) {
      toast({
        title: "Sıra kaydedilemedi",
        description: e instanceof Error ? e.message.slice(0, 400) : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const moveCategory = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= slugList.length || to >= slugList.length) return;
    const next = [...slugList];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    void persistOrder(next);
  };

  const setNavVisible = async (slug: string, visible: boolean) => {
    const s = normalizeNewsCategorySlug(slug);
    if (!s) return;
    const nextHidden = new Set(hiddenSet);
    if (visible) nextHidden.delete(s);
    else nextHidden.add(s);
    const arr = [...nextHidden].sort();
    setSaving(true);
    const r = await saveNewsSiteLayout(newsLayoutPrefs, {
      layoutPatch: { hmNavHiddenCategorySlugs: arr.length ? arr : null },
    });
    setSaving(false);
    if (!r.ok) {
      toast({
        title: "Kaydedilemedi",
        description: r.error.slice(0, 200),
        variant: "destructive",
      });
    } else {
      toast({ title: visible ? "Vitrinde gösteriliyor" : "Vitrinden gizlendi" });
    }
  };

  const closeDialog = () => {
    setOpen(false);
    setEditingId(null);
    setForm({ name: "", slug: "", color: "#e61e25" });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", slug: "", color: "#e61e25" });
    setOpen(true);
  };

  const openEdit = (c: Cat) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      slug: c.slug,
      color: c.color?.trim() || "#e61e25",
    });
    setOpen(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    const slug = (form.slug.trim() || autoSlug(name)).trim();
    if (!name || !slug) {
      toast({ title: "Ad ve slug gerekli", variant: "destructive" });
      return;
    }
    const color = form.color.trim() || "#e61e25";
    setSubmitting(true);
    try {
      if (editingId != null) {
        await hmFetchJson<Cat>(`/api/hm/editor/categories/${editingId}`, {
          method: "PUT",
          body: JSON.stringify({ name, slug, color }),
        });
        toast({ title: "Kategori güncellendi" });
      } else {
        await hmFetchJson<Cat>("/api/hm/editor/categories", {
          method: "POST",
          body: JSON.stringify({ name, slug, color }),
        });
        toast({ title: "Siteye özel kategori eklendi" });
      }
      invalidateCats();
      closeDialog();
    } catch (e) {
      toast({
        title: editingId != null ? "Güncellenemedi" : "Eklenemedi",
        description: e instanceof Error ? e.message.slice(0, 400) : undefined,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (c: Cat) => {
    if ((c.newsCount ?? 0) > 0) {
      if (!confirm(`Bu kategoride ${c.newsCount} haber var. Silmek istediğinize emin misiniz?`)) return;
    } else if (!confirm(`"${c.name}" silinsin mi?`)) {
      return;
    }
    setSubmitting(true);
    try {
      const t = readHmJwt();
      if (!t) throw new Error("Oturum yok");
      const r = await fetch(apiUrl(`/api/hm/editor/categories/${c.id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!r.ok) {
        const text = await r.text().catch(() => "");
        throw new Error(text || `HTTP ${r.status}`);
      }
      toast({ title: "Kategori silindi" });
      invalidateCats();
    } catch (e) {
      toast({
        title: "Silinemedi",
        description: e instanceof Error ? e.message.slice(0, 400) : undefined,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openMerge = () => {
    setMergeSourceIds([]);
    setMergeTargetName("");
    setMergeOpen(true);
  };

  const toggleMergeSource = (id: number) => {
    setMergeSourceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

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
      await hmFetchJson("/api/hm/editor/categories/merge", {
        method: "POST",
        body: JSON.stringify({ sourceIds: mergeSourceIds, targetName }),
      });
      toast({ title: "Kategoriler birleştirildi" });
      setMergeOpen(false);
      invalidateCats();
    } catch (e) {
      toast({
        title: "Birleştirilemedi",
        description: e instanceof Error ? e.message.slice(0, 400) : undefined,
        variant: "destructive",
      });
    } finally {
      setMerging(false);
    }
  };

  const canManage = (_c: Cat) => sid != null;

  return (
    <EditorLayout title="Kategoriler">
      <div className="max-w-3xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <p className="text-sm text-slate-600">
            Bu haber sitesine ait kategorileri buradan ekleyip düzenlersiniz. Başka sitelerin veya Yekpare genel
            kategorileri bu listede görünmez; merkez panelden yönetilir.
          </p>
          <div className="flex gap-2 shrink-0">
            <Button type="button" variant="outline" onClick={openMerge} disabled={!sid || cats.length < 2}>
              <Combine className="w-4 h-4 mr-2" />
              Birleştir
            </Button>
            <Button
              type="button"
              className="bg-[#e61e25] hover:bg-[#c9181e] text-white"
              onClick={openCreate}
              disabled={!sid}
            >
              <Plus className="w-4 h-4 mr-2" />
              Siteye özel kategori
            </Button>
          </div>
        </div>

        <div className="rounded-md border bg-white p-4 space-y-3">
          {!isCorporateSite ? (
            <>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Yekpare haber kategorileri</h3>
            <p className="text-xs text-slate-500">
              Aktif ettiğiniz Yekpare kategorilerinin haberleri sitenizde gösterilir. Hiçbirini değiştirmezseniz
              standart kategoriler aktiftir. <strong>Global</strong> (İngilizce küresel RSS) varsayılan kapalıdır;
              yalnızca haber haritasında görünür — sitede göstermek için aşağıdan açın.
            </p>
          </div>
          {generalCats.length === 0 ? (
            <p className="text-xs text-slate-400">Genel kategori bulunamadı.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {generalCats.map((c) => {
                const slug = String(c.slug ?? "").trim().toLowerCase();
                const active = activeSet.has(slug);
                const optIn = isHmOptInNewsCategorySlug(slug);
                return (
                  <div key={c.id} className="flex items-center justify-between gap-3 py-1">
                    <span className="inline-flex items-center gap-2 text-sm min-w-0">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: c.color || "#94a3b8" }} />
                      <span className="truncate">{c.name}</span>
                      {optIn ? (
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          Harita
                        </Badge>
                      ) : null}
                      <Badge variant="secondary" className="shrink-0">{c.newsCount ?? 0}</Badge>
                    </span>
                    <Switch
                      checked={active}
                      disabled={saving || !slug}
                      onCheckedChange={(on) => void toggleActivation(slug, !!on)}
                    />
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex items-start justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="min-w-0">
              <Label htmlFor="hm-allow-cross-site-manual" className="text-sm font-medium text-slate-800">
                Diğer sitelerden manuel eklenen haberler bu sitede yayınlansın
              </Label>
              <p className="text-xs text-slate-500 mt-1">
                Kapatırsanız, başka HM editör sitelerinde manuel eklenen haberler bu sitede listelenmez. Bu sitede
                eklediğiniz haberler etkilenmez.
              </p>
            </div>
            <Switch
              id="hm-allow-cross-site-manual"
              checked={newsLayoutPrefs.hmAllowCrossSiteManualNews !== false}
              disabled={saving}
              onCheckedChange={(on) => void toggleCrossSiteManual(!!on)}
            />
          </div>
            </>
          ) : (
            <p className="text-xs text-slate-500">
              Kurumsal sitede Yekpare genel kategorileri ve merkez havuz kapalıdır. Yalnızca bu siteye özel
              kategorileriniz (ör. Derneğimiz, Faaliyetlerimiz, Şehit Gazi) kullanılır.
            </p>
          )}
        </div>

        <p className="text-sm text-slate-600">
          Aşağıdaki liste bu siteye özel kategorilerdir. Vitrinde göster/gizle ve sıralama yalnızca bunlar için geçerlidir.
          Haber eklerken de aynı liste kullanılır.
        </p>

        <div className="rounded-md border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead className="w-[108px]">Sıra</TableHead>
                <TableHead>Vitrinde</TableHead>
                <TableHead>Ad</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-right">Haber</TableHead>
                <TableHead className="w-[100px] text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                    Yükleniyor…
                  </TableCell>
                </TableRow>
              ) : (
                cats.map((c, index) => {
                  const slug = normalizeNewsCategorySlug(c.slug);
                  const visible = slug.length > 0 && !hiddenSet.has(slug);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="w-[108px]">
                        <div className="flex items-center gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Yukarı"
                            disabled={saving || index === 0}
                            onClick={() => moveCategory(index, index - 1)}
                          >
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Aşağı"
                            disabled={saving || index >= cats.length - 1}
                            onClick={() => moveCategory(index, index + 1)}
                          >
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="En üste"
                            disabled={saving || index === 0}
                            onClick={() => moveCategory(index, 0)}
                          >
                            <ChevronsUp className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="w-[120px]">
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`cat-vis-${c.id}`}
                            checked={visible}
                            disabled={saving || !slug}
                            onCheckedChange={(on) => void setNavVisible(slug, !!on)}
                          />
                          <Label htmlFor={`cat-vis-${c.id}`} className="text-xs text-slate-600 cursor-pointer">
                            {visible ? "Açık" : "Kapalı"}
                          </Label>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <span className="inline-flex items-center gap-2 flex-wrap">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: c.color || "#94a3b8" }} />
                          {c.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{c.slug}</code>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{c.newsCount ?? 0}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {canManage(c) ? (
                          <div className="flex justify-end gap-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-slate-600 hover:text-slate-900"
                              title="Düzenle"
                              disabled={submitting}
                              onClick={() => openEdit(c)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700"
                              disabled={submitting}
                              onClick={() => void handleDelete(c)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        {saving ? (
          <p className="text-xs text-slate-500 flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Kaydediliyor…
          </p>
        ) : null}

        <Dialog
          open={open}
          onOpenChange={(v) => {
            if (!v) closeDialog();
            else setOpen(true);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId != null ? "Siteye özel kategoriyi düzenle" : "Siteye özel kategori"}</DialogTitle>
            </DialogHeader>
            {editingId != null ? (
              <p className="text-xs text-muted-foreground -mt-1">
                Slug değişirse mevcut haber URL’lerindeki kategori yolunu kontrol edin.
              </p>
            ) : null}
            <div className="space-y-4 pt-2">
              <div>
                <Label>Kategori adı</Label>
                <Input
                  className="mt-1"
                  value={form.name}
                  placeholder="Örn: Yerel gündem"
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
                  placeholder="yerel-gundem"
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
                <Button type="button" variant="outline" onClick={closeDialog}>
                  İptal
                </Button>
                <Button
                  type="button"
                  className="bg-[#e61e25] hover:bg-[#c9181e] text-white"
                  disabled={submitting}
                  onClick={() => void handleSave()}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId != null ? "Güncelle" : "Kaydet"}
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
              Seçtiğiniz kategorilerin tüm haberleri hedef kategoriye taşınır; eski adresler yönlendirilir. Yalnızca bu
              siteye özel kategoriler birleştirilebilir.
            </p>
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-xs">Birleştirilecek kategoriler</Label>
                <div className="mt-1 max-h-56 overflow-y-auto rounded-md border divide-y">
                  {cats.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={mergeSourceIds.includes(c.id)}
                        onChange={() => toggleMergeSource(c.id)}
                      />
                      <span className="inline-flex items-center gap-2 text-sm">
                        <span className="h-2 w-2 rounded-full" style={{ background: c.color || "#94a3b8" }} />
                        {c.name}
                        <span className="text-xs text-slate-400">({c.newsCount ?? 0})</span>
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
                  placeholder="Örn: Ankara"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Bu ad mevcut bir kategoriyle eşleşirse ona taşınır, yoksa yeni bir siteye özel kategori oluşturulur.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setMergeOpen(false)}>
                  İptal
                </Button>
                <Button
                  type="button"
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
      </div>
    </EditorLayout>
  );
}
