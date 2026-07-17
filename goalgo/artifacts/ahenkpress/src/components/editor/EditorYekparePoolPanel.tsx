import { useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { apiUrl } from "@/lib/apiBase";
import { readHmJwt } from "@/lib/hmSession";
import { useHmEditor } from "@/contexts/HmEditorContext";
import { useToast } from "@/hooks/use-toast";
import { fetchHybridNewsList, type HomeHybridNewsItem } from "@/hooks/useHomeHybridNews";
import { normalizeNewsCategorySlug } from "@/lib/hmCategorySlug";
import { HM_OPT_IN_NEWS_CATEGORY_SLUGS } from "@/lib/hmGlobalNewsCategory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Pencil, RotateCcw, Search, Trash2, CheckSquare } from "lucide-react";
import { Link } from "wouter";
import { Checkbox } from "@/components/ui/checkbox";

const ALL_CATEGORIES_VALUE = "__all__";
const YEKPARE_PAGE_SIZE = 40;

type OverrideRow = {
  articleId: number;
  title: string | null;
  spot: string | null;
  content: string | null;
  imageUrl: string | null;
};

type Cat = { id: number; name: string; slug: string };

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

function poolArticleId(item: HomeHybridNewsItem): number | null {
  const raw = String(item.id ?? "");
  if (!raw.startsWith("db:")) return null;
  const n = parseInt(raw.slice(3), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function PoolRow({
  item,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onApprove,
  onDraft,
  deleting,
  busy,
}: {
  item: HomeHybridNewsItem;
  selected: boolean;
  onSelect: (item: HomeHybridNewsItem, checked: boolean) => void;
  onEdit: (item: HomeHybridNewsItem) => void;
  onDelete: (item: HomeHybridNewsItem) => void;
  onApprove: (item: HomeHybridNewsItem) => void;
  onDraft: (item: HomeHybridNewsItem) => void;
  deleting: boolean;
  busy: boolean;
}) {
  const articleId = poolArticleId(item);
  return (
    <div className="flex items-center gap-3 p-3">
      {articleId != null ? (
        <Checkbox
          checked={selected}
          onCheckedChange={(c) => onSelect(item, c === true)}
          aria-label="Seç"
        />
      ) : (
        <span className="w-4" />
      )}
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt="" className="h-14 w-20 rounded object-cover shrink-0 bg-slate-100" />
      ) : (
        <div className="h-14 w-20 rounded bg-slate-100 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-semibold text-slate-900">{item.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {item.categoryName ? (
            <Badge variant="secondary" className="text-[11px]">
              {item.categoryName}
            </Badge>
          ) : item.categorySlug ? (
            <Badge variant="outline" className="text-[11px] text-slate-500">
              {item.categorySlug}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[11px] text-slate-400">
              Kategori yok
            </Badge>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:justify-end">
        {articleId != null ? (
          <>
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => onDraft(item)}>
              Taslak al
            </Button>
            <Button type="button" size="sm" disabled={busy} className="gap-1.5" onClick={() => onApprove(item)}>
              <CheckSquare className="w-3.5 h-3.5" />
              Onayla / Yayınla
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => onEdit(item)}
            >
              <Pencil className="w-3.5 h-3.5" />
              Düzenle
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-red-600 hover:text-red-700"
              disabled={deleting}
              onClick={() => onDelete(item)}
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Gizle
            </Button>
          </>
        ) : (
          <Badge variant="outline" className="shrink-0 text-[11px] text-slate-500">
            RSS önbellek
          </Badge>
        )}
      </div>
    </div>
  );
}

export type EditorYekparePoolPanelProps = {
  categorySlug: string;
  onCategorySlugChange: (slug: string) => void;
};

export function EditorYekparePoolPanel({ categorySlug, onCategorySlugChange }: EditorYekparePoolPanelProps) {
  const { site, newsLayoutPrefs } = useHmEditor();
  const { toast } = useToast();
  const sid = site?.id ?? null;
  const vitrinTheme = String(newsLayoutPrefs.hmVitrinTheme ?? "").trim().toLowerCase();
  const isCorporateSite = vitrinTheme === "corporate" || vitrinTheme === "kurumsal";

  if (isCorporateSite) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        <p className="font-semibold text-slate-900">Yekpare havuzu kurumsal sitelerde kapalı</p>
        <p className="mt-2">
          Bu sitede yalnızca kendi eklediğiniz haberler ve siteye tanımlı RSS kaynaklarından içe aktarılan
          haberler yayınlanır. Merkez Yekpare havuzu kullanılamaz.
        </p>
      </div>
    );
  }

  const { data: generalCats = [] } = useQuery({
    queryKey: ["editor-general-categories", "pool"],
    queryFn: () => hmFetchJson<Cat[]>("/api/categories"),
    enabled: sid != null,
  });

  const storedActivated = newsLayoutPrefs.hmActivatedCategorySlugs ?? [];
  const generalSlugs = useMemo(
    () => generalCats.map((c) => normalizeNewsCategorySlug(c.slug)).filter(Boolean),
    [generalCats],
  );
  const standardGeneralSlugs = useMemo(
    () => generalSlugs.filter((s) => !HM_OPT_IN_NEWS_CATEGORY_SLUGS.has(s)),
    [generalSlugs],
  );
  const activeSet = useMemo(() => {
    if (storedActivated.length) {
      return new Set(storedActivated.map((s) => normalizeNewsCategorySlug(s)).filter(Boolean));
    }
    return new Set(standardGeneralSlugs);
  }, [storedActivated, standardGeneralSlugs]);

  const categoryOptions = useMemo(() => {
    return generalCats
      .filter((c) => {
        const slug = normalizeNewsCategorySlug(c.slug);
        return slug && activeSet.has(slug);
      })
      .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [generalCats, activeSet]);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["editor-yekpare-pool", sid, categorySlug || "all", search],
    enabled: sid != null,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      fetchHybridNewsList({
        siteId: sid,
        limit: YEKPARE_PAGE_SIZE,
        offset: pageParam as number,
        rssScope: "all",
        yekparePool: true,
        poolBrowse: true,
        q: search || undefined,
        ...(categorySlug ? { categorySlug } : {}),
      }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < YEKPARE_PAGE_SIZE ? undefined : allPages.length * YEKPARE_PAGE_SIZE,
  });

  const poolItems = useMemo(() => {
    const flat = (data?.pages ?? []).flat();
    const seen = new Set<string>();
    const needle = search.trim().toLocaleLowerCase("tr-TR");
    const out: HomeHybridNewsItem[] = [];
    for (const it of flat) {
      if (it.publishedOnSiteId != null) continue;
      if (needle) {
        const hay = `${it.title ?? ""} ${it.spot ?? ""}`.toLocaleLowerCase("tr-TR");
        if (!hay.includes(needle)) continue;
      }
      const key = String(it.id ?? "");
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(it);
    }
    return out;
  }, [data, search]);

  const groupedByCategory = useMemo(() => {
    if (categorySlug) return null;
    const map = new Map<string, HomeHybridNewsItem[]>();
    for (const item of poolItems) {
      const label =
        String(item.categoryName ?? "").trim() ||
        String(item.categorySlug ?? "").trim() ||
        "Diğer";
      const list = map.get(label) ?? [];
      list.push(item);
      map.set(label, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "tr"));
  }, [poolItems, categorySlug]);

  const [editing, setEditing] = useState<{ item: HomeHybridNewsItem; articleId: number } | null>(null);
  const [form, setForm] = useState({ title: "", spot: "", content: "", imageUrl: "" });
  const [saving, setSaving] = useState(false);
  const [hasOverride, setHasOverride] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const openEdit = async (item: HomeHybridNewsItem) => {
    const articleId = poolArticleId(item);
    if (articleId == null) return;
    setEditing({ item, articleId });
    setForm({ title: "", spot: "", content: "", imageUrl: "" });
    setHasOverride(false);
    try {
      const existing = await hmFetchJson<OverrideRow | null>(`/api/hm/editor/news-overrides/${articleId}`);
      if (existing) {
        setHasOverride(true);
        setForm({
          title: existing.title ?? "",
          spot: existing.spot ?? "",
          content: existing.content ?? "",
          imageUrl: existing.imageUrl ?? "",
        });
      }
    } catch {
      /* yeni override */
    }
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await hmFetchJson(`/api/hm/editor/news-overrides/${editing.articleId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: form.title.trim() || null,
          spot: form.spot.trim() || null,
          content: form.content.trim() || null,
          imageUrl: form.imageUrl.trim() || null,
        }),
      });
      toast({ title: "Bu sitedeki sürüm kaydedildi" });
      setEditing(null);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toast({
        title: "Kaydedilemedi",
        description: e instanceof Error ? e.message.slice(0, 300) : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const revert = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await hmFetchJson(`/api/hm/editor/news-overrides/${editing.articleId}`, { method: "DELETE" });
      toast({ title: "Orijinal içeriğe döndürüldü" });
      setEditing(null);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toast({
        title: "Geri alınamadı",
        description: e instanceof Error ? e.message.slice(0, 300) : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const removeFromSite = async (item: HomeHybridNewsItem) => {
    const articleId = poolArticleId(item);
    if (articleId == null) return;
    const label = String(item.title ?? "Haber").slice(0, 80);
    if (!confirm(`«${label}» bu siteden gizlensin mi? Merkez havuzdan silinmez.`)) return;
    setDeletingId(articleId);
    try {
      await hmFetchJson(`/api/hm/editor/yekpare-pool/${articleId}`, { method: "DELETE" });
      toast({ title: "Haber siteden gizlendi" });
      await refetch();
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toast({
        title: "Kaldırılamadı",
        description: e instanceof Error ? e.message.slice(0, 300) : undefined,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const publishOne = async (item: HomeHybridNewsItem, status: "draft" | "published") => {
    const articleId = poolArticleId(item);
    if (articleId == null) return;
    setBusy(true);
    try {
      await hmFetchJson(`/api/hm/editor/pool/news/${articleId}/publish`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      toast({
        title: status === "published" ? "Sitenizde yayınlandı" : "Taslak olarak alındı",
        description: String(item.title ?? "").slice(0, 120),
      });
      await refetch();
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toast({
        title: "İşlem başarısız",
        description: e instanceof Error ? e.message.slice(0, 300) : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const publishSelected = async (status: "draft" | "published") => {
    const ids = [...selectedIds];
    if (!ids.length) {
      toast({ title: "Önce haber seçin", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const r = await hmFetchJson<{ count?: number }>(`/api/hm/editor/pool/news/bulk-publish`, {
        method: "POST",
        body: JSON.stringify({ ids, status }),
      });
      toast({
        title: status === "published" ? "Toplu yayınlandı" : "Toplu taslak alındı",
        description: `${r?.count ?? ids.length} haber`,
      });
      setSelectedIds(new Set());
      await refetch();
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toast({
        title: "Toplu işlem başarısız",
        description: e instanceof Error ? e.message.slice(0, 300) : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const toggleSelect = (item: HomeHybridNewsItem, checked: boolean) => {
    const id = poolArticleId(item);
    if (id == null) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const rowProps = (item: HomeHybridNewsItem) => ({
    item,
    selected: selectedIds.has(poolArticleId(item) ?? -1),
    onSelect: toggleSelect,
    onEdit: (row: HomeHybridNewsItem) => void openEdit(row),
    onDelete: (row: HomeHybridNewsItem) => void removeFromSite(row),
    onApprove: (row: HomeHybridNewsItem) => void publishOne(row, "published"),
    onDraft: (row: HomeHybridNewsItem) => void publishOne(row, "draft"),
    deleting: deletingId === poolArticleId(item),
    busy,
  });

  return (
    <div className="space-y-4" key={refreshKey}>
      <p className="text-sm text-slate-600">
        Yekpare / diğer sitelerden gelen aday haberler. Public sitede{" "}
        <strong>otomatik yayınlanmaz</strong> — önce taslak alın veya onaylayın. Override yalnızca sizin
        sitenizde geçerlidir.{" "}
        <Link href="/editor/kategoriler" className="font-semibold text-red-600 hover:underline">
          Kategoriler
        </Link>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={categorySlug || ALL_CATEGORIES_VALUE}
          onValueChange={(v) => onCategorySlugChange(v === ALL_CATEGORIES_VALUE ? "" : v)}
        >
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES_VALUE}>Tüm kategoriler (gruplu)</SelectItem>
            {categoryOptions.map((cat) => (
              <SelectItem key={cat.id} value={cat.slug}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border bg-white px-3 py-2 sm:max-w-md">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSearch(searchInput.trim());
            }}
            placeholder="Başlık veya spot ara…"
            className="h-8 border-0 px-0 shadow-none focus-visible:ring-0"
          />
          <Button type="button" variant="outline" size="sm" onClick={() => setSearch(searchInput.trim())}>
            Ara
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy || selectedIds.size === 0}
          onClick={() => void publishSelected("draft")}
        >
          Seçilenleri taslak al ({selectedIds.size})
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={busy || selectedIds.size === 0}
          onClick={() => void publishSelected("published")}
        >
          Seçilenleri onayla ({selectedIds.size})
        </Button>
        {categoryOptions.length === 0 ? (
          <p className="text-xs text-amber-700">Aktif Yekpare kategorisi yok — Kategoriler sayfasından açın.</p>
        ) : null}
      </div>

      <div className="rounded-md border bg-white divide-y">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin inline" /> Yükleniyor…
          </div>
        ) : poolItems.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Bu filtrede Yekpare havuzu haberi bulunamadı.
          </div>
        ) : groupedByCategory ? (
          groupedByCategory.map(([label, items]) => (
            <div key={label}>
              <div className="bg-slate-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">
                {label}
                <span className="ml-2 font-normal text-slate-400">({items.length})</span>
              </div>
              <div className="divide-y">
                {items.map((item) => (
                  <PoolRow key={item.id} {...rowProps(item)} />
                ))}
              </div>
            </div>
          ))
        ) : (
          poolItems.map((item) => <PoolRow key={item.id} {...rowProps(item)} />)
        )}
        {hasNextPage ? (
          <div className="p-3 text-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isFetchingNextPage}
              onClick={() => void fetchNextPage()}
            >
              {isFetchingNextPage ? <Loader2 className="w-4 h-4 animate-spin" /> : "Daha fazla yükle"}
            </Button>
          </div>
        ) : null}
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => (v ? null : setEditing(null))}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bu sitedeki sürümü düzenle</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-1">
            Boş bıraktığınız alanlarda Yekpare&apos;deki orijinal içerik gösterilir.
          </p>
          <div className="space-y-3 pt-2">
            <div>
              <Label>Başlık</Label>
              <Input
                className="mt-1"
                value={form.title}
                placeholder={editing?.item.title ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <Label>Spot</Label>
              <Textarea
                className="mt-1"
                rows={2}
                value={form.spot}
                placeholder={editing?.item.spot ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, spot: e.target.value }))}
              />
            </div>
            <div>
              <Label>İçerik (HTML)</Label>
              <Textarea
                className="mt-1 font-mono text-xs"
                rows={8}
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              />
            </div>
            <div>
              <Label>Görsel URL</Label>
              <Input
                className="mt-1 font-mono text-xs"
                value={form.imageUrl}
                placeholder={editing?.item.imageUrl ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
              />
            </div>
            <div className="flex justify-between gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="text-red-600"
                disabled={saving || !hasOverride}
                onClick={() => void revert()}
              >
                <RotateCcw className="w-4 h-4 mr-1.5" />
                Orijinale döndür
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  İptal
                </Button>
                <Button
                  type="button"
                  className="bg-[#e61e25] hover:bg-[#c9181e] text-white"
                  disabled={saving}
                  onClick={() => void save()}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kaydet"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
