import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Edit2, ExternalLink, Loader2, Rss, Save, Search, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, apiUrl, postAdminJson } from "@/lib/apiBase";
import { readHmJwt } from "@/lib/hmSession";
import { HM_STANDARD_NEWS_CATEGORIES } from "@/lib/hmStandardNewsCategories";

export type RssHaberRow = {
  id: string;
  title: string;
  spot: string | null;
  imageUrl: string | null;
  categorySlug: string;
  categoryName: string;
  feedId: string;
  feedLabel: string;
  rssScope: "box" | "site" | "portal";
  externalUrl: string | null;
  publishedAt: string;
  imported: boolean;
  importedNewsId: number | null;
};

type RssFeedCategoryMeta = {
  slug: string;
  label: string;
  rssScope: "box" | "site";
  feedCount: number;
};

type RssListResponse = {
  items: RssHaberRow[];
  categories: string[];
  feedCategories?: RssFeedCategoryMeta[];
  scopes?: { box: number; site: number };
  rssScope?: "box" | "site" | "all";
  itemCount?: number;
  feedCount?: number;
};

type RssHaberDetail = RssHaberRow & { content: string | null };

type CategoryOption = { slug: string; label: string };

type RssHaberlerPanelProps = {
  mode: "editor" | "admin";
  /** Siteye kaydedilmiş haber düzenleme linki tabanı */
  newsEditorBase?: string;
  editorCategories?: CategoryOption[];
};

const ALL_TAB = "__all__";
type RssScopeTab = "all" | "box" | "site";

function rssScopeLabel(scope: RssHaberRow["rssScope"]): string {
  if (scope === "box") return "Kutu içi";
  if (scope === "site") return "Site içi";
  return "Portal";
}

async function fetchRssList(
  mode: "editor" | "admin",
  params: { categorySlug?: string; q?: string; rssScope?: RssScopeTab },
): Promise<RssListResponse> {
  const qs = new URLSearchParams({ limit: "300" });
  if (params.categorySlug) qs.set("categorySlug", params.categorySlug);
  if (params.q?.trim()) qs.set("q", params.q.trim());
  if (params.rssScope && params.rssScope !== "all") qs.set("rssScope", params.rssScope);
  const path =
    mode === "editor"
      ? `/api/hm/editor/rss-news?${qs}`
      : `/api/admin/rss-news?${qs}`;

  if (mode === "editor") {
    const t = readHmJwt();
    if (!t) throw new Error("Editör oturumu gerekli");
    const r = await fetch(apiUrl(path), { headers: { Authorization: `Bearer ${t}` } });
    if (!r.ok) throw new Error(await r.text());
    return r.json() as Promise<RssListResponse>;
  }

  const r = await apiFetch(apiUrl(path));
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<RssListResponse>;
}

async function fetchRssDetail(mode: "editor" | "admin", itemId: string): Promise<RssHaberDetail> {
  const path =
    mode === "editor"
      ? `/api/hm/editor/rss-news/${encodeURIComponent(itemId)}`
      : `/api/admin/rss-news/${encodeURIComponent(itemId)}`;
  if (mode === "editor") {
    const t = readHmJwt();
    if (!t) throw new Error("Editör oturumu gerekli");
    const r = await fetch(apiUrl(path), { headers: { Authorization: `Bearer ${t}` } });
    if (!r.ok) throw new Error(await r.text());
    return r.json() as Promise<RssHaberDetail>;
  }
  const r = await apiFetch(apiUrl(path));
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<RssHaberDetail>;
}

async function importRssItem(
  mode: "editor" | "admin",
  itemId: string,
  body: {
    title: string;
    spot?: string | null;
    content?: string | null;
    categorySlug: string;
    status: "published" | "draft";
  },
): Promise<{ skipped?: boolean; newsId?: number | null }> {
  const path =
    mode === "editor"
      ? `/api/hm/editor/rss-news/${encodeURIComponent(itemId)}/import`
      : `/api/admin/rss-news/${encodeURIComponent(itemId)}/import`;
  if (mode === "editor") {
    const t = readHmJwt();
    if (!t) throw new Error("Editör oturumu gerekli");
    const r = await fetch(apiUrl(path), {
      method: "POST",
      headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }
  const r = await postAdminJson(path, body);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function bulkImportRss(
  mode: "editor" | "admin",
  payload: {
    items: Array<{ rssItemId: string; categorySlug?: string; status?: "published" | "draft" }>;
    categorySlug?: string;
    status?: "published" | "draft";
  },
): Promise<{ imported: number; skipped: number; failed: number }> {
  const path = mode === "editor" ? "/api/hm/editor/rss-news/bulk-import" : "/api/admin/rss-news/bulk-import";
  if (mode === "editor") {
    const t = readHmJwt();
    if (!t) throw new Error("Editör oturumu gerekli");
    const r = await fetch(apiUrl(path), {
      method: "POST",
      headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }
  const r = await postAdminJson(path, payload);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function deleteRssItem(
  mode: "editor" | "admin",
  itemId: string,
): Promise<
  | { deletedNewsId: number | null; removedFromCache: boolean }
  | { hiddenOnSite: true; deletedNewsId: number | null; alreadyHidden: boolean }
> {
  const path =
    mode === "editor"
      ? `/api/hm/editor/rss-news/${encodeURIComponent(itemId)}`
      : `/api/admin/rss-news/${encodeURIComponent(itemId)}`;
  if (mode === "editor") {
    const t = readHmJwt();
    if (!t) throw new Error("Editör oturumu gerekli");
    const r = await fetch(apiUrl(path), { method: "DELETE", headers: { Authorization: `Bearer ${t}` } });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  }
  const r = await apiFetch(apiUrl(path), { method: "DELETE" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

function slugLabel(slug: string, categories: CategoryOption[]): string {
  return categories.find((c) => c.slug === slug)?.label ?? slug;
}

export function RssHaberlerPanel({
  mode,
  newsEditorBase = mode === "editor" ? "/editor/haberler" : "/admin/haberler",
  editorCategories = [],
}: RssHaberlerPanelProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState(ALL_TAB);
  const [activeScope, setActiveScope] = useState<RssScopeTab>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q")?.trim();
    if (q) {
      setSearchInput(q);
      setSearch(q);
    }
  }, []);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState("");
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editDeleting, setEditDeleting] = useState(false);
  const [editRow, setEditRow] = useState<RssHaberDetail | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    spot: "",
    content: "",
    categorySlug: "",
    status: "published" as "published" | "draft",
  });
  const editSeqRef = useRef(0);

  const categoryOptions = useMemo((): CategoryOption[] => {
    const bySlug = new Map<string, string>();
    for (const std of HM_STANDARD_NEWS_CATEGORIES) bySlug.set(std.slug, std.label);
    for (const c of editorCategories) bySlug.set(c.slug, c.label);
    return Array.from(bySlug.entries()).map(([slug, label]) => ({ slug, label }));
  }, [editorCategories]);

  const queryKey = [
    mode === "editor" ? "/api/hm/editor/rss-news" : "/api/admin/rss-news",
    activeScope,
    activeTab,
    search,
  ] as const;

  const { data, isLoading, refetch, isFetching, isError, error } = useQuery({
    queryKey,
    queryFn: () =>
      fetchRssList(mode, {
        categorySlug: activeTab === ALL_TAB ? undefined : activeTab,
        q: search,
        rssScope: activeScope,
      }),
    staleTime: 60_000,
    retry: 1,
  });

  const items = data?.items ?? [];
  const feedCategories = data?.feedCategories ?? [];
  const scopeCounts = data?.scopes ?? { box: 0, site: 0 };
  const totalItemCount = data?.itemCount ?? items.length;
  const totalFeedCount = data?.feedCount ?? scopeCounts.box + scopeCounts.site;

  const categoryTabs = useMemo(() => {
    const bySlug = new Map<string, string>();
    for (const meta of feedCategories) {
      if (activeScope !== "all" && meta.rssScope !== activeScope) continue;
      bySlug.set(meta.slug, meta.label);
    }
    for (const slug of data?.categories ?? []) {
      if (!bySlug.has(slug)) {
        bySlug.set(slug, slugLabel(slug, categoryOptions));
      }
    }
    if (bySlug.size === 0) {
      for (const std of HM_STANDARD_NEWS_CATEGORIES) bySlug.set(std.slug, std.label);
    }
    return Array.from(bySlug.entries())
      .map(([slug, label]) => ({ slug, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "tr"));
  }, [activeScope, categoryOptions, data?.categories, feedCategories]);

  const visibleSelected = useMemo(
    () => items.filter((row) => selected.has(row.id) && !row.imported),
    [items, selected],
  );

  const toggleAll = (checked: boolean) => {
    if (!checked) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(items.filter((row) => !row.imported).map((row) => row.id)));
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const applyBulkCategory = () => {
    if (!bulkCategory) {
      toast({ title: "Kategori seçin", variant: "destructive" });
      return;
    }
    if (visibleSelected.length === 0) {
      toast({ title: "Kaydedilmemiş haber seçin", variant: "destructive" });
      return;
    }
    setCategoryOverrides((prev) => {
      const next = { ...prev };
      for (const row of visibleSelected) next[row.id] = bulkCategory;
      return next;
    });
    toast({ title: "Kategori seçili satırlara uygulandı" });
  };

  const runBulkImport = async () => {
    if (visibleSelected.length === 0) {
      toast({ title: "Kaydedilmemiş haber seçin", variant: "destructive" });
      return;
    }
    setBulkBusy(true);
    try {
      const result = await bulkImportRss(mode, {
        items: visibleSelected.map((row) => ({
          rssItemId: row.id,
          categorySlug: categoryOverrides[row.id] || bulkCategory || row.categorySlug,
          status: "published",
        })),
      });
      await qc.invalidateQueries({ queryKey: [queryKey[0]] });
      if (mode === "editor") {
        await qc.invalidateQueries({ queryKey: ["/api/hm/editor/news"] });
      }
      setSelected(new Set());
      toast({
        title: "Toplu kayıt tamamlandı",
        description: `${result.imported} eklendi, ${result.skipped} zaten vardı, ${result.failed} hata`,
      });
    } catch (err) {
      toast({
        title: "Toplu kayıt başarısız",
        description: String((err as Error).message),
        variant: "destructive",
      });
    } finally {
      setBulkBusy(false);
    }
  };

  const openEdit = async (row: RssHaberRow) => {
    const seq = ++editSeqRef.current;
    setEditOpen(true);
    setEditLoading(true);
    setEditRow(null);
    try {
      const detail = await fetchRssDetail(mode, row.id);
      if (seq !== editSeqRef.current) return;
      setEditRow(detail);
      setEditForm({
        title: detail.title,
        spot: detail.spot ?? "",
        content: detail.content ?? "",
        categorySlug: categoryOverrides[detail.id] || detail.categorySlug,
        status: "published",
      });
    } catch (err) {
      if (seq !== editSeqRef.current) return;
      toast({
        title: "Detay alınamadı",
        description: String((err as Error).message),
        variant: "destructive",
      });
      setEditOpen(false);
    } finally {
      if (seq === editSeqRef.current) setEditLoading(false);
    }
  };

  const saveEdit = async () => {
    if (!editRow) return;
    setEditSaving(true);
    try {
      const result = await importRssItem(mode, editRow.id, {
        title: editForm.title.trim(),
        spot: editForm.spot.trim() || null,
        content: editForm.content.trim() || null,
        categorySlug: editForm.categorySlug,
        status: editForm.status,
      });
      await qc.invalidateQueries({ queryKey: [queryKey[0]] });
      if (mode === "editor") {
        await qc.invalidateQueries({ queryKey: ["/api/hm/editor/news"] });
      }
      setEditOpen(false);
      if (result.skipped) {
        toast({ title: "Haber zaten siteye kayıtlı" });
      } else {
        toast({ title: mode === "editor" ? "Haber siteye kaydedildi" : "Haber kaydedildi" });
      }
    } catch (err) {
      toast({
        title: "Kaydedilemedi",
        description: String((err as Error).message),
        variant: "destructive",
      });
    } finally {
      setEditSaving(false);
    }
  };

  const deleteEdit = async () => {
    if (!editRow) return;
    const label = editRow.title.trim().slice(0, 80) || "RSS haberi";
    const confirmMessage =
      mode === "editor"
        ? `«${label}» siteden kaldırılsın mı? Merkez RSS havuzundan silinmez.`
        : `«${label}» veritabanından kalıcı olarak silinsin mi? Siteye kayıtlıysa haber de kaldırılır.`;
    if (!window.confirm(confirmMessage)) return;
    setEditDeleting(true);
    try {
      const result = await deleteRssItem(mode, editRow.id);
      await qc.invalidateQueries({ queryKey: [queryKey[0]] });
      if (mode === "editor") {
        await qc.invalidateQueries({ queryKey: ["/api/hm/editor/news"] });
      }
      setEditOpen(false);
      setEditRow(null);
      if ("hiddenOnSite" in result) {
        toast({
          title: result.alreadyHidden ? "Zaten siteden kaldırılmış" : "Siteden kaldırıldı",
          description: result.deletedNewsId
            ? `Site haberi (#${result.deletedNewsId}) de kaldırıldı.`
            : "Merkez RSS havuzunda kalır.",
        });
      } else {
        toast({
          title: "Veritabanından silindi",
          description: result.deletedNewsId
            ? `Site haberi (#${result.deletedNewsId}) de kaldırıldı.`
            : "Önbellekten kaldırıldı.",
        });
      }
    } catch (err) {
      toast({
        title: mode === "editor" ? "Siteden kaldırılamadı" : "Silinemedi",
        description: String((err as Error).message),
        variant: "destructive",
      });
    } finally {
      setEditDeleting(false);
    }
  };

  const quickSave = async (row: RssHaberRow) => {
    setBusyId(row.id);
    try {
      const result = await importRssItem(mode, row.id, {
        title: row.title,
        spot: row.spot,
        categorySlug: categoryOverrides[row.id] || bulkCategory || row.categorySlug,
        status: "published",
      });
      await refetch();
      if (mode === "editor") {
        await qc.invalidateQueries({ queryKey: ["/api/hm/editor/news"] });
      }
      toast({
        title: result.skipped ? "Haber zaten kayıtlı" : "Siteye kaydedildi",
      });
    } catch (err) {
      toast({
        title: "Kaydedilemedi",
        description: String((err as Error).message),
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-[220px] flex-1 items-center gap-2">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSearch(searchInput.trim());
            }}
            placeholder="Başlık, kaynak veya kategori…"
          />
          <Button type="button" variant="outline" onClick={() => setSearch(searchInput.trim())}>
            Ara
          </Button>
        </div>
        <Button type="button" variant="ghost" size="sm" disabled={isFetching} onClick={() => void refetch()}>
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yenile"}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:max-w-xl">
        {(
          [
            { key: "all" as const, label: "Tüm RSS" },
            { key: "box" as const, label: "Kutu içi RSS", feeds: scopeCounts.box },
            { key: "site" as const, label: "Site içi RSS", feeds: scopeCounts.site },
          ] as const
        ).map((tab) => {
          const active = activeScope === tab.key;
          const itemLabel = active ? totalItemCount : "…";
          const feedLabel = tab.key === "all" ? totalFeedCount : tab.key === "box" ? scopeCounts.box : scopeCounts.site;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveScope(tab.key);
                setActiveTab(ALL_TAB);
              }}
              className={`rounded-md px-3 py-2 text-xs font-black transition sm:text-sm ${
                active ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
              }`}
            >
              {tab.label}{" "}
              <span className="text-[10px] font-semibold text-slate-400 sm:text-xs">
                ({itemLabel} haber · {feedLabel} feed)
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab(ALL_TAB)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
            activeTab === ALL_TAB ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Tümü
        </button>
        {categoryTabs.map((cat) => (
          <button
            key={`${activeScope}-${cat.slug}`}
            type="button"
            onClick={() => setActiveTab(cat.slug)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
              activeTab === cat.slug ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {visibleSelected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <span className="text-sm font-semibold text-slate-700">{visibleSelected.length} seçili</span>
          <Select value={bulkCategory || undefined} onValueChange={setBulkCategory}>
            <SelectTrigger className="h-9 w-[180px] bg-white">
              <SelectValue placeholder="Toplu kategori" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" onClick={applyBulkCategory}>
            Kategoriyi uygula
          </Button>
          <Button type="button" size="sm" disabled={bulkBusy} onClick={() => void runBulkImport()}>
            {bulkBusy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            Toplu {mode === "editor" ? "siteye kaydet" : "kaydet"}
          </Button>
        </div>
      ) : null}

      {isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          RSS listesi alınamadı: {String((error as Error)?.message ?? "Bilinmeyen hata")}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={items.some((row) => !row.imported) && items.filter((row) => !row.imported).every((row) => selected.has(row.id))}
                  onCheckedChange={(v) => toggleAll(v === true)}
                />
              </TableHead>
              <TableHead>Başlık</TableHead>
              <TableHead>Kaynak</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Feed</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead className="text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-slate-500">
                  <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                  RSS haberleri yükleniyor…
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-slate-500">
                  {totalFeedCount > 0
                    ? "RSS feed kaynakları tanımlı ancak önbellekte haber yok. «Yenile» ile tekrar deneyin; ilk yükleme birkaç saniye sürebilir."
                    : "Bu kategoride RSS haberi bulunamadı. Vitrin → RSS kaynakları bölümünden kutu içi / site içi feed URL'lerini kontrol edin; ilk yükleme birkaç saniye sürebilir."}
                </TableCell>
              </TableRow>
            ) : (
              items.map((row) => {
                const effectiveCategory = categoryOverrides[row.id] || row.categorySlug;
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(row.id)}
                        disabled={row.imported}
                        onCheckedChange={(v) => toggleOne(row.id, v === true)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="line-clamp-2 text-sm font-semibold text-slate-900">{row.title}</p>
                        {row.spot ? <p className="line-clamp-1 text-xs text-slate-500">{row.spot}</p> : null}
                        {row.imported ? (
                          <Badge variant="secondary" className="text-[10px]">
                            Siteye kayıtlı
                          </Badge>
                        ) : categoryOverrides[row.id] ? (
                          <Badge variant="outline" className="text-[10px]">
                            Kategori: {slugLabel(categoryOverrides[row.id], categoryOptions)}
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-semibold uppercase">
                        {rssScopeLabel(row.rssScope)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {slugLabel(effectiveCategory, categoryOptions)}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{row.feedLabel || row.feedId}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-500">
                      {row.publishedAt
                        ? format(new Date(row.publishedAt), "d MMM yyyy HH:mm", { locale: tr })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {row.externalUrl ? (
                          <Button type="button" variant="ghost" size="icon" asChild>
                            <a href={row.externalUrl} target="_blank" rel="noopener noreferrer" title="Kaynak">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        ) : null}
                        {row.imported && row.importedNewsId ? (
                          <Button type="button" variant="outline" size="sm" asChild>
                            <Link href={`${newsEditorBase}/${row.importedNewsId}/duzenle`}>
                              <Edit2 className="mr-1 h-3.5 w-3.5" />
                              Düzenle
                            </Link>
                          </Button>
                        ) : (
                          <>
                            <Button type="button" variant="outline" size="sm" onClick={() => void openEdit(row)}>
                              <Edit2 className="mr-1 h-3.5 w-3.5" />
                              Düzenle
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              disabled={busyId === row.id}
                              onClick={() => void quickSave(row)}
                            >
                              {busyId === row.id ? (
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Save className="mr-1 h-3.5 w-3.5" />
                              )}
                              Siteye kaydet
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            editSeqRef.current += 1;
            setEditRow(null);
            setEditForm({
              title: "",
              spot: "",
              content: "",
              categorySlug: "",
              status: "published",
            });
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>RSS haberini düzenle</DialogTitle>
          </DialogHeader>
          {editLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Yükleniyor…
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rss-edit-title">Başlık</Label>
                <Input
                  id="rss-edit-title"
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rss-edit-spot">Spot</Label>
                <Textarea
                  id="rss-edit-spot"
                  rows={2}
                  value={editForm.spot}
                  onChange={(e) => setEditForm((f) => ({ ...f, spot: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rss-edit-content">İçerik (HTML)</Label>
                <Textarea
                  id="rss-edit-content"
                  rows={10}
                  value={editForm.content}
                  onChange={(e) => setEditForm((f) => ({ ...f, content: e.target.value }))}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Kategori</Label>
                  <Select
                    value={editForm.categorySlug || undefined}
                    onValueChange={(v) => setEditForm((f) => ({ ...f, categorySlug: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((c) => (
                        <SelectItem key={c.slug} value={c.slug}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Durum</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(v) =>
                      setEditForm((f) => ({ ...f, status: v === "draft" ? "draft" : "published" }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="published">Yayında</SelectItem>
                      <SelectItem value="draft">Taslak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-between gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  disabled={editDeleting || editSaving}
                  onClick={() => void deleteEdit()}
                >
                  {editDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  {mode === "editor" ? "Siteden kaldır" : "Veritabanından sil"}
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                    İptal
                  </Button>
                  <Button type="button" disabled={editSaving || editDeleting || !editForm.title.trim()} onClick={() => void saveEdit()}>
                    {editSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Siteye kaydet
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
