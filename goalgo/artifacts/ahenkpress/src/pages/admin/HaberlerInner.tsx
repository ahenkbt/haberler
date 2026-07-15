import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useListNews,
  useDeleteNews,
  getListNewsQueryKey,
  useListCategories,
  getListCategoriesQueryKey,
} from "@workspace/api-client-react";
import type { News } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { Search, Plus, Edit2, Trash2, Tags, Eye, Star, Zap, PanelsTopLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { apiUrl } from "@/lib/apiBase";
import { readHmJwt, readHmSite } from "@/lib/hmSession";
import { readHmAuthorJwt } from "@/lib/hmAuthorSession";
import {
  HM_EDITOR_CATEGORIES_QUERY_KEY,
  HM_EDITOR_MAKALE_QUERY_KEY,
  HM_EDITOR_NEWS_QUERY_KEY,
  hmEditorNewsQueryKey,
} from "@/lib/hmEditorQueryKeys";
import { HM_AUTHOR_NEWS_QUERY_KEY } from "@/lib/hmAuthorNewsQueryKey";
import { isBlogCategoryNews } from "@/lib/blogNews";

const ALL_CATEGORIES_VALUE = "__all__";

type RssCacheAdminItem = {
  id: string;
  title: string;
  categorySlug: string;
  categoryName: string;
  feedLabel: string;
  publishedAt: string;
  imported: boolean;
  importedNewsId: number | null;
};

type AdminDisplayRow =
  | { kind: "news"; news: News }
  | { kind: "rss-cache"; item: RssCacheAdminItem };

async function patchHmNewsFlags(
  id: number,
  body: { isFeatured?: boolean; isSiteManset?: boolean; isBreaking?: boolean },
) {
  const t = readHmJwt();
  if (!t) throw new Error("Oturum yok");
  const r = await fetch(apiUrl(`/api/hm/editor/news/${id}/flags`), {
    method: "PATCH",
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
}

async function bulkPatchHmNewsFlags(
  ids: number[],
  body: { isFeatured?: boolean; isSiteManset?: boolean; isBreaking?: boolean },
) {
  const t = readHmJwt();
  if (!t) throw new Error("Oturum yok");
  const r = await fetch(apiUrl("/api/hm/editor/news/bulk-flags"), {
    method: "POST",
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ids, ...body }),
  });
  if (!r.ok) throw new Error(await r.text());
}

async function bulkPatchHmNewsCategory(ids: number[], categorySlug: string) {
  const t = readHmJwt();
  if (!t) throw new Error("Oturum yok");
  const r = await fetch(apiUrl("/api/hm/editor/news/bulk-category"), {
    method: "POST",
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ids, categorySlug }),
  });
  if (!r.ok) throw new Error(await r.text());
}

async function bulkPatchAdminNewsCategory(ids: number[], categorySlug: string) {
  const r = await fetch(apiUrl("/api/news/bulk-category"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ids, categorySlug }),
  });
  if (!r.ok) throw new Error(await r.text());
}

function readKategoriFromLocation(location: string): string {
  const q = new URLSearchParams((location.split("?")[1] ?? "").trim());
  return String(q.get("kategori") ?? q.get("categorySlug") ?? "").trim().toLowerCase();
}

export type HaberlerInnerProps = {
  /** Örn. `/admin/haberler` veya `/editor/haberler` */
  newsEditorBase?: string;
  /** `hm_makaleler` düzenleme — `/editor/makaleler/...` */
  makaleEditorBase?: string;
  categoriesHref?: string | null;
  showBulkDelete?: boolean;
  /** JWT ile siteye özel `/api/hm/editor/news` listesi */
  hmEditorApi?: boolean;
  /** Köşe makaleleri (`hm_makaleler`) — AHB içe aktarım; blog vitrininde haber tablosundan ayrı */
  hmEditorMakaleApi?: boolean;
  /** Köşe yazarı JWT ile `/api/hm/author/news` */
  hmAuthorApi?: boolean;
  /** Yalnızca bu kategoriye ait haberler (`blog` için slug veya ad eşleşmesi). */
  categorySlugFilter?: string | null;
  /** Kategori açılır listesi + URL `?kategori=` (sabit `categorySlugFilter` varken kapalı). */
  showCategoryFilter?: boolean;
  /** “Yeni haber” butonunun gideceği adres (örn. `?kategori=blog`). */
  newNewsHref?: string | null;
  newNewsButtonLabel?: string | null;
  /** Örn. `/tr/site-slug/haber` — vitrinde haberi yeni sekmede aç. */
  newsPreviewHrefPrefix?: string | null;
  extraActions?: ReactNode;
};

export function HaberlerInner({
  newsEditorBase = "/admin/haberler",
  makaleEditorBase = "/editor/makaleler",
  categoriesHref = "/admin/haber-kategorileri",
  showBulkDelete = true,
  hmEditorApi = false,
  hmEditorMakaleApi = false,
  hmAuthorApi = false,
  categorySlugFilter = null,
  showCategoryFilter: showCategoryFilterProp,
  newNewsHref = null,
  newNewsButtonLabel = null,
  newsPreviewHrefPrefix = null,
  extraActions = null,
}: HaberlerInnerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const showHmNewsFlags = hmEditorApi && !hmEditorMakaleApi;
  const showPortalAdminBulkCategory = !hmEditorApi && !hmEditorMakaleApi && !hmAuthorApi;
  const showBulkCategoryChange = showHmNewsFlags || showPortalAdminBulkCategory;
  const [location, setLocation] = useLocation();
  const pathBase = (location.split("?")[0] ?? "").trim() || location;
  const fixedCategorySlug = String(categorySlugFilter ?? "").trim().toLowerCase();
  const showCategoryFilter =
    showCategoryFilterProp ??
    (fixedCategorySlug === "" && !hmAuthorApi && !hmEditorMakaleApi && (hmEditorApi || (!hmEditorApi && !hmAuthorApi)));
  const [categoryFromUrl, setCategoryFromUrl] = useState(() => readKategoriFromLocation(location));
  useEffect(() => {
    if (!showCategoryFilter) return;
    setCategoryFromUrl(readKategoriFromLocation(location));
  }, [location, showCategoryFilter]);
  const selectedCategorySlug = fixedCategorySlug || (showCategoryFilter ? categoryFromUrl : "");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState("action");
  const [bulkCategorySlug, setBulkCategorySlug] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [flagBusyId, setFlagBusyId] = useState<number | null>(null);
  const [recategorizeBusy, setRecategorizeBusy] = useState(false);

  const adminListParams = useMemo(
    () =>
      ({
        siteScope: "admin",
        status: "all",
        limit: 200,
        ...(searchDebounced ? { q: searchDebounced } : {}),
        ...(selectedCategorySlug ? { categorySlug: selectedCategorySlug } : {}),
      }) as Parameters<typeof useListNews>[0],
    [selectedCategorySlug, searchDebounced],
  );

  const adminNews = useListNews(adminListParams, {
    query: {
      enabled: !hmEditorApi && !hmEditorMakaleApi && !hmAuthorApi,
      queryKey: getListNewsQueryKey(adminListParams),
    },
  });

  const isPortalAdminList = !hmEditorApi && !hmAuthorApi && !hmEditorMakaleApi;
  const rssCacheSearch = useQuery({
    queryKey: ["/api/admin/rss-news", "haberler-merge", searchDebounced, selectedCategorySlug],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "100", rssScope: "all" });
      if (searchDebounced) params.set("q", searchDebounced);
      if (selectedCategorySlug) params.set("categorySlug", selectedCategorySlug);
      const r = await fetch(apiUrl(`/api/admin/rss-news?${params.toString()}`), { credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      return r.json() as Promise<{ items: RssCacheAdminItem[] }>;
    },
    enabled: isPortalAdminList && (searchDebounced.length >= 1 || selectedCategorySlug !== ""),
    staleTime: 30_000,
  });

  const hmEditorCategories = useQuery({
    queryKey: HM_EDITOR_CATEGORIES_QUERY_KEY,
    queryFn: async () => {
      const t = readHmJwt();
      if (!t) throw new Error("Oturum yok");
      const r = await fetch(apiUrl("/api/hm/editor/categories"), {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json() as Promise<{ id: number; name: string; slug: string }[]>;
    },
    enabled: hmEditorApi && !hmEditorMakaleApi && (showCategoryFilter || showHmNewsFlags),
  });

  const adminCategories = useListCategories(undefined, {
    query: {
      queryKey: getListCategoriesQueryKey(),
      enabled: !hmEditorApi && !hmAuthorApi && !hmEditorMakaleApi && showCategoryFilter,
    },
  });

  const categoryOptions = hmEditorApi
    ? (hmEditorCategories.data ?? [])
    : ((adminCategories.data ?? []) as { id: number; name: string; slug: string }[]);

  const hmNews = useQuery({
    queryKey: hmEditorNewsQueryKey(selectedCategorySlug || undefined),
    queryFn: async () => {
      const t = readHmJwt();
      if (!t) throw new Error("Oturum yok");
      const qs = selectedCategorySlug
        ? `?categorySlug=${encodeURIComponent(selectedCategorySlug)}`
        : "";
      const r = await fetch(apiUrl(`/api/hm/editor/news${qs}`), {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json() as Promise<{ items: News[]; total: number }>;
    },
    enabled: hmEditorApi && !hmEditorMakaleApi,
  });
  const hmMakale = useQuery({
    queryKey: HM_EDITOR_MAKALE_QUERY_KEY,
    queryFn: async () => {
      const t = readHmJwt();
      if (!t) throw new Error("Oturum yok");
      const r = await fetch(apiUrl("/api/hm/editor/makale?limit=500"), {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json() as Promise<{ items: News[]; total: number }>;
    },
    enabled: hmEditorMakaleApi,
  });
  const hmAuthorNews = useQuery({
    queryKey: [...HM_AUTHOR_NEWS_QUERY_KEY],
    queryFn: async () => {
      const t = readHmAuthorJwt();
      if (!t) throw new Error("Oturum yok");
      const r = await fetch(apiUrl("/api/hm/author/news"), {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json() as Promise<{ items: News[]; total: number }>;
    },
    enabled: hmAuthorApi,
  });
  const newsList = hmAuthorApi
    ? hmAuthorNews.data
    : hmEditorMakaleApi
      ? hmMakale.data
      : hmEditorApi
        ? hmNews.data
        : adminNews.data;
  const isLoading = hmAuthorApi
    ? hmAuthorNews.isLoading
    : hmEditorMakaleApi
      ? hmMakale.isLoading
      : hmEditorApi
        ? hmNews.isLoading
        : adminNews.isLoading;
  const deleteNews = useDeleteNews();
  const editorSiteId = hmEditorApi && !hmEditorMakaleApi ? (readHmSite()?.id ?? null) : null;

  const rawItems: News[] = Array.isArray(newsList?.items) ? newsList.items : [];
  const siteScopedItems =
    editorSiteId != null && editorSiteId > 0
      ? rawItems.filter((n) => (n as News & { siteId?: number | null }).siteId === editorSiteId)
      : rawItems;
  const newsItems: News[] =
    fixedCategorySlug === "" || hmEditorApi || (!hmEditorApi && !hmAuthorApi && !hmEditorMakaleApi)
      ? siteScopedItems
      : siteScopedItems.filter((n) => {
          if (fixedCategorySlug === "blog") return isBlogCategoryNews(n);
          return String(n.categorySlug ?? "").trim().toLowerCase() === fixedCategorySlug;
        });

  const onCategoryFilterChange = (value: string) => {
    const slug = value === ALL_CATEGORIES_VALUE ? "" : value.trim().toLowerCase();
    setCategoryFromUrl(slug);
    if (!showCategoryFilter || fixedCategorySlug) return;
    const params = new URLSearchParams((location.split("?")[1] ?? "").trim());
    if (slug) {
      params.set("kategori", slug);
      params.delete("categorySlug");
    } else {
      params.delete("kategori");
      params.delete("categorySlug");
    }
    const qs = params.toString();
    setLocation(qs ? `${pathBase}?${qs}` : pathBase);
  };
  const filteredItems =
    !hmEditorApi && !hmAuthorApi && !hmEditorMakaleApi
      ? newsItems
      : newsItems.filter((n) =>
          search.trim() === "" ? true : n.title.toLowerCase().includes(search.toLowerCase()),
        );

  const displayRows: AdminDisplayRow[] = useMemo(() => {
    if (!isPortalAdminList) {
      return filteredItems.map((news) => ({ kind: "news", news }));
    }
    const newsIdSet = new Set(filteredItems.map((n) => n.id));
    const rows: AdminDisplayRow[] = filteredItems.map((news) => ({ kind: "news", news }));
    for (const item of rssCacheSearch.data?.items ?? []) {
      if (item.imported && item.importedNewsId != null && newsIdSet.has(item.importedNewsId)) {
        continue;
      }
      rows.push({ kind: "rss-cache", item });
    }
    return rows;
  }, [filteredItems, isPortalAdminList, rssCacheSearch.data?.items]);
  const listLoading =
    isLoading || (isPortalAdminList && rssCacheSearch.isFetching && rssCacheSearch.fetchStatus !== "idle");
  const createHref = (newNewsHref ?? `${newsEditorBase}/yeni`).trim() || `${newsEditorBase}/yeni`;
  const createLabel = (newNewsButtonLabel ?? "Yeni Haber").trim() || "Yeni Haber";
  const previewPrefix = (newsPreviewHrefPrefix ?? "").replace(/\/+$/, "");
  const allIds = filteredItems.map((n) => n.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(allIds));
  };

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = (id: number) => {
    if (hmAuthorApi) {
      if (!confirm("Bu haberi silmek istediğinize emin misiniz?")) return;
      void (async () => {
        const t = readHmAuthorJwt();
        if (!t) return;
        const r = await fetch(apiUrl(`/api/hm/author/news/${id}`), {
          method: "DELETE",
          headers: { Authorization: `Bearer ${t}` },
        });
        if (!r.ok) {
          alert("Silinemedi.");
          return;
        }
        queryClient.invalidateQueries({ queryKey: [...HM_AUTHOR_NEWS_QUERY_KEY] });
      })();
      return;
    }
    if (hmEditorMakaleApi) {
      const row = rawItems.find((x) => x.id === id);
      const kind = (row as News & { contentKind?: string })?.contentKind;
      const isNewsBlog = kind === "news";
      if (!confirm(isNewsBlog ? "Bu köşe yazısını (blog haber) silmek istediğinize emin misiniz?" : "Bu köşe makalesini silmek istediğinize emin misiniz?"))
        return;
      void (async () => {
        const t = readHmJwt();
        if (!t) return;
        const url = isNewsBlog ? apiUrl(`/api/hm/editor/news/${id}`) : apiUrl(`/api/hm/editor/makale/${id}`);
        const r = await fetch(url, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${t}` },
        });
        if (!r.ok) {
          alert("Silinemedi.");
          return;
        }
        await queryClient.invalidateQueries({ queryKey: [...HM_EDITOR_MAKALE_QUERY_KEY] });
        await queryClient.invalidateQueries({ queryKey: [...HM_EDITOR_NEWS_QUERY_KEY] });
      })();
      return;
    }
    if (hmEditorApi) {
      if (!confirm("Bu haberi silmek istediğinize emin misiniz?")) return;
      void (async () => {
        const t = readHmJwt();
        if (!t) return;
        const r = await fetch(apiUrl(`/api/hm/editor/news/${id}`), {
          method: "DELETE",
          headers: { Authorization: `Bearer ${t}` },
        });
        if (!r.ok) {
          alert("Silinemedi.");
          return;
        }
        queryClient.invalidateQueries({ queryKey: [...HM_EDITOR_NEWS_QUERY_KEY] });
      })();
      return;
    }
    if (!showBulkDelete) return;
    if (confirm("Bu haberi silmek istediğinize emin misiniz?")) {
      deleteNews.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListNewsQueryKey() });
          },
        },
      );
    }
  };

  const showRowSelect = showBulkDelete || hmEditorApi || hmEditorMakaleApi;

  const invalidateHmNews = () =>
    queryClient.invalidateQueries({ queryKey: [...HM_EDITOR_NEWS_QUERY_KEY] });

  const toggleNewsFlag = async (
    news: News,
    field: "isFeatured" | "isSiteManset" | "isBreaking",
    value: boolean,
  ) => {
    if (!showHmNewsFlags) return;
    setFlagBusyId(news.id);
    try {
      await patchHmNewsFlags(news.id, { [field]: value });
      await invalidateHmNews();
      toast({ title: value ? "Eklendi" : "Kaldırıldı" });
    } catch (e) {
      toast({
        title: "Kaydedilemedi",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setFlagBusyId(null);
    }
  };

  const handleBulkApply = async () => {
    if (!showRowSelect) return;
    const flagBulkActions = new Set([
      "featured-on",
      "featured-off",
      "site-manset-on",
      "site-manset-off",
      "breaking-on",
      "breaking-off",
    ]);
    if (flagBulkActions.has(bulkAction)) {
      if (!showHmNewsFlags) return;
      if (selectedIds.size === 0) {
        alert("Lütfen en az bir kayıt seçin.");
        return;
      }
      const patch: { isFeatured?: boolean; isSiteManset?: boolean; isBreaking?: boolean } = {};
      if (bulkAction === "featured-on") patch.isFeatured = true;
      if (bulkAction === "featured-off") patch.isFeatured = false;
      if (bulkAction === "site-manset-on") patch.isSiteManset = true;
      if (bulkAction === "site-manset-off") patch.isSiteManset = false;
      if (bulkAction === "breaking-on") patch.isBreaking = true;
      if (bulkAction === "breaking-off") patch.isBreaking = false;
      setBulkLoading(true);
      try {
        await bulkPatchHmNewsFlags(Array.from(selectedIds), patch);
        setSelectedIds(new Set());
        setBulkAction("action");
        await invalidateHmNews();
        toast({ title: "Toplu güncelleme tamamlandı" });
      } catch (e) {
        toast({
          title: "Toplu güncelleme başarısız",
          description: e instanceof Error ? e.message : String(e),
          variant: "destructive",
        });
      } finally {
        setBulkLoading(false);
      }
      return;
    }
    if (bulkAction === "change-category") {
      if (!showBulkCategoryChange) return;
      if (selectedIds.size === 0) {
        alert("Lütfen en az bir kayıt seçin.");
        return;
      }
      const slug = bulkCategorySlug.trim().toLowerCase();
      if (!slug) {
        alert("Lütfen hedef kategori seçin.");
        return;
      }
      setBulkLoading(true);
      try {
        if (showPortalAdminBulkCategory) {
          await bulkPatchAdminNewsCategory(Array.from(selectedIds), slug);
          queryClient.invalidateQueries({ queryKey: getListNewsQueryKey() });
        } else {
          await bulkPatchHmNewsCategory(Array.from(selectedIds), slug);
          await invalidateHmNews();
        }
        setSelectedIds(new Set());
        setBulkAction("action");
        setBulkCategorySlug("");
        toast({ title: "Kategoriler güncellendi" });
      } catch (e) {
        toast({
          title: "Toplu kategori değişimi başarısız",
          description: e instanceof Error ? e.message : String(e),
          variant: "destructive",
        });
      } finally {
        setBulkLoading(false);
      }
      return;
    }
    if (bulkAction !== "delete") return;
    if (selectedIds.size === 0) {
      alert("Lütfen en az bir kayıt seçin.");
      return;
    }
    if (!confirm(`Seçili ${selectedIds.size} kaydı silmek istediğinize emin misiniz?`)) return;

    setBulkLoading(true);
    try {
      if (hmEditorApi) {
        const t = readHmJwt();
        if (!t) throw new Error("Oturum yok");
        for (const nid of selectedIds) {
          const res = await fetch(apiUrl(`/api/hm/editor/news/${nid}`), {
            method: "DELETE",
            headers: { Authorization: `Bearer ${t}` },
          });
          if (!res.ok) throw new Error("Toplu silme başarısız");
        }
        setSelectedIds(new Set());
        setBulkAction("action");
        await queryClient.invalidateQueries({ queryKey: [...HM_EDITOR_NEWS_QUERY_KEY] });
        return;
      }
      if (hmEditorMakaleApi) {
        const t = readHmJwt();
        if (!t) throw new Error("Oturum yok");
        const rows = filteredItems.filter((n) => selectedIds.has(n.id));
        for (const n of rows) {
          const kind = (n as News & { contentKind?: string }).contentKind;
          const isNewsBlog = kind === "news";
          const url = isNewsBlog ? apiUrl(`/api/hm/editor/news/${n.id}`) : apiUrl(`/api/hm/editor/makale/${n.id}`);
          const res = await fetch(url, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${t}` },
          });
          if (!res.ok) throw new Error("Toplu silme başarısız");
        }
        setSelectedIds(new Set());
        setBulkAction("action");
        await queryClient.invalidateQueries({ queryKey: [...HM_EDITOR_MAKALE_QUERY_KEY] });
        await queryClient.invalidateQueries({ queryKey: [...HM_EDITOR_NEWS_QUERY_KEY] });
        return;
      }
      if (!showBulkDelete) return;
      const res = await fetch(apiUrl("/api/news/bulk"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error("Toplu silme başarısız");
      setSelectedIds(new Set());
      setBulkAction("action");
      queryClient.invalidateQueries({ queryKey: getListNewsQueryKey() });
    } catch {
      alert("Toplu silme sırasında bir hata oluştu.");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleRecategorizeSporMisfits = async () => {
    if (
      !confirm(
        "Spor kategorisinde olup içeriği spor olmayan haberler (news + RSS önbellek) gündem'e taşınsın mı?",
      )
    ) {
      return;
    }
    setRecategorizeBusy(true);
    try {
      const url = hmEditorApi && !hmEditorMakaleApi
        ? apiUrl("/api/hm/editor/news/reclassify-spor-misfits")
        : apiUrl("/api/news/reclassify-spor-misfits");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (hmEditorApi && !hmEditorMakaleApi) {
        const t = readHmJwt();
        if (!t) throw new Error("Oturum yok");
        headers.Authorization = `Bearer ${t}`;
      }
      const res = await fetch(url, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ limit: 5000 }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        updatedNews?: number;
        updatedRss?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Düzeltme başarısız");
      toast({
        title: "Spor→gündem düzeltmesi tamamlandı",
        description: `${data.updatedNews ?? 0} news, ${data.updatedRss ?? 0} RSS önbellek kaydı güncellendi.`,
      });
      await queryClient.invalidateQueries({ queryKey: getListNewsQueryKey() });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/rss-news"] });
      if (hmEditorApi && !hmEditorMakaleApi) {
        await queryClient.invalidateQueries({ queryKey: [...HM_EDITOR_NEWS_QUERY_KEY] });
      }
    } catch (e) {
      toast({
        title: "Düzeltme başarısız",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setRecategorizeBusy(false);
    }
  };

  const showSporRecategorizeButton =
    !hmAuthorApi && !hmEditorMakaleApi && (isPortalAdminList || (hmEditorApi && !hmEditorMakaleApi));

  return (
    <div className="bg-white rounded-md shadow-sm border p-4">
      {!hmEditorApi && !hmAuthorApi && !hmEditorMakaleApi ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 leading-relaxed">
          <p className="flex-1 min-w-[240px]">
            RSS kampanyaları haberleri <code className="text-[10px]">news</code> tablosuna yazar (HM site hedefli
            dahil). Bu listede merkez + RSS kaynaklı kayıtlar görünür; arama RSS önbelleğini de tarar. Henüz DB&apos;ye
            aktarılmamış öğeler sarı satır olarak görünür —{" "}
            <Link href="/admin/rss-haberleri" className="font-semibold text-red-700 hover:underline">
              RSS Haberleri
            </Link>
            .
          </p>
        </div>
      ) : null}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Haber ara..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {showCategoryFilter ? (
            <Select
              value={selectedCategorySlug || ALL_CATEGORIES_VALUE}
              onValueChange={onCategoryFilterChange}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CATEGORIES_VALUE}>Tüm kategoriler</SelectItem>
                {categoryOptions.map((cat) => (
                  <SelectItem key={cat.id} value={cat.slug}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {showSporRecategorizeButton ? (
            <Button
              type="button"
              variant="default"
              size="sm"
              className="shrink-0 bg-amber-600 text-white hover:bg-amber-700"
              disabled={recategorizeBusy}
              onClick={() => void handleRecategorizeSporMisfits()}
            >
              {recategorizeBusy ? "Düzeltiliyor…" : "Spor→Gündem düzelt"}
            </Button>
          ) : null}
          {extraActions}
          {categoriesHref ? (
            <Button variant="outline" asChild>
              <Link href={categoriesHref}>
                <Tags className="w-4 h-4 mr-2" />
                Kategoriler
              </Link>
            </Button>
          ) : null}
          <Button asChild className="bg-[#e61e25] hover:bg-[#c9181e] text-white">
            <Link href={createHref}>
              <Plus className="w-4 h-4 mr-2" />
              {createLabel}
            </Link>
          </Button>
        </div>
      </div>

      {showRowSelect ? (
        <div className="flex gap-2 mb-4 items-center">
          <Select value={bulkAction} onValueChange={setBulkAction}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Toplu İşlem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="action">Toplu İşlem</SelectItem>
              {showHmNewsFlags ? (
                <>
                  <SelectItem value="featured-on">Tepe manşete ekle</SelectItem>
                  <SelectItem value="featured-off">Tepe manşetten çıkar</SelectItem>
                  <SelectItem value="site-manset-on">Site manşete ekle</SelectItem>
                  <SelectItem value="site-manset-off">Site manşetten çıkar</SelectItem>
                  <SelectItem value="breaking-on">Son dakikaya ekle</SelectItem>
                  <SelectItem value="breaking-off">Son dakikadan çıkar</SelectItem>
                </>
              ) : null}
              {showBulkCategoryChange ? (
                <SelectItem value="change-category">Kategori değiştir</SelectItem>
              ) : null}
              <SelectItem value="delete">Toplu Sil</SelectItem>
            </SelectContent>
          </Select>
          {showBulkCategoryChange && bulkAction === "change-category" ? (
            <Select value={bulkCategorySlug || undefined} onValueChange={setBulkCategorySlug}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Hedef kategori" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((cat) => (
                  <SelectItem key={cat.id} value={cat.slug}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Button
            variant="outline"
            onClick={handleBulkApply}
            disabled={
              bulkLoading ||
              !someSelected ||
              bulkAction === "action" ||
              (bulkAction === "change-category" && !bulkCategorySlug.trim())
            }
          >
            {bulkLoading ? "Uygulanıyor..." : "Uygula"}
          </Button>
          {someSelected ? (
            <span className="text-sm text-muted-foreground ml-1">{selectedIds.size} seçili</span>
          ) : null}
        </div>
      ) : null}

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50">
              {showRowSelect ? (
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected && !allSelected;
                    }}
                    onChange={toggleAll}
                  />
                </TableHead>
              ) : null}
              <TableHead>BAŞLIK</TableHead>
              <TableHead>KATEGORİ</TableHead>
              <TableHead>YAZAR</TableHead>
              <TableHead>DURUM</TableHead>
              <TableHead>GÖRÜNTÜLEME</TableHead>
              <TableHead>TARİH</TableHead>
              <TableHead className="text-right">İŞLEM</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listLoading ? (
              <TableRow>
                <TableCell colSpan={showRowSelect ? 8 : 7} className="text-center py-8">
                  Yükleniyor...
                </TableCell>
              </TableRow>
            ) : displayRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showRowSelect ? 8 : 7} className="text-center py-12 text-muted-foreground">
                  İçerik bulunamadı.
                  {isPortalAdminList && searchDebounced ? (
                    <span className="block mt-2 text-xs">
                      RSS önbelleğinde de arandı.{" "}
                      <Link href="/admin/rss-haberleri" className="text-red-700 hover:underline">
                        RSS Haberleri
                      </Link>{" "}
                      sayfasını da kontrol edin.
                    </span>
                  ) : null}
                </TableCell>
              </TableRow>
            ) : (
              displayRows.map((row) =>
                row.kind === "rss-cache" ? (
                  <TableRow key={`rss-cache-${row.item.id}`} className="bg-amber-50/40">
                    {showRowSelect ? <TableCell /> : null}
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{row.item.title}</span>
                        <Badge variant="outline" className="mt-1 w-fit text-[10px] border-amber-300 text-amber-900">
                          RSS önbellek · {row.item.feedLabel || row.item.categoryName}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{row.item.categoryName || row.item.categorySlug}</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>
                      <Badge variant="secondary">Önbellek</Badge>
                    </TableCell>
                    <TableCell>-</TableCell>
                    <TableCell className="text-sm">
                      {row.item.publishedAt
                        ? format(new Date(row.item.publishedAt), "dd.MM.yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {row.item.imported && row.item.importedNewsId ? (
                          <Button variant="ghost" size="icon" asChild title="DB haberini düzenle">
                            <Link href={`${newsEditorBase}/${row.item.importedNewsId}/duzenle`}>
                              <Edit2 className="w-4 h-4" />
                            </Link>
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" asChild>
                            <Link
                              href={`/admin/rss-haberleri?q=${encodeURIComponent(row.item.title.slice(0, 80))}`}
                            >
                              RSS&apos;te düzenle
                            </Link>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  (() => {
                    const news = row.news;
                    return (
                <TableRow
                  key={`${(news as News & { contentKind?: string }).contentKind ?? "news"}-${news.id}`}
                  className={selectedIds.has(news.id) ? "bg-red-50/40" : ""}
                >
                  {showRowSelect ? (
                    <TableCell>
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={selectedIds.has(news.id)}
                        onChange={() => toggleOne(news.id)}
                      />
                    </TableCell>
                  ) : null}
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{news.title}</span>
                      <span className="text-xs text-muted-foreground">{news.slug}</span>
                      {!hmEditorApi &&
                      !hmAuthorApi &&
                      String((news as News & { rssSourceUrl?: string | null }).rssSourceUrl ?? "").trim() ? (
                        <Badge variant="outline" className="mt-1 w-fit text-[10px]">
                          RSS
                          {(news as News & { siteId?: number | null }).siteId
                            ? ` · site #${(news as News & { siteId?: number | null }).siteId}`
                            : " · merkez"}
                        </Badge>
                      ) : null}
                      {showHmNewsFlags &&
                      (news.isFeatured ||
                        (news as News & { isSiteManset?: boolean }).isSiteManset ||
                        news.isBreaking) ? (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {news.isFeatured ? (
                            <Badge className="text-[10px] font-bold uppercase tracking-wide bg-amber-400 text-amber-950 hover:bg-amber-400 border-0">
                              TEPE MANŞET
                            </Badge>
                          ) : null}
                          {(news as News & { isSiteManset?: boolean }).isSiteManset ? (
                            <Badge className="text-[10px] font-bold uppercase tracking-wide bg-sky-700 text-white hover:bg-sky-700 border-0">
                              SITE MANŞET
                            </Badge>
                          ) : null}
                          {news.isBreaking ? (
                            <Badge className="text-[10px] font-bold uppercase tracking-wide bg-red-600 text-white hover:bg-red-600 border-0">
                              SON DAKİKA
                            </Badge>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>{news.categoryName}</TableCell>
                  <TableCell>{news.authorName || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={news.status === "published" ? "default" : "secondary"}>
                      {news.status === "published" ? "Yayında" : "Taslak"}
                    </Badge>
                  </TableCell>
                  <TableCell>{news.views}</TableCell>
                  <TableCell className="text-sm">{format(new Date(news.createdAt), "dd.MM.yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {previewPrefix ? (
                        <Button variant="ghost" size="icon" asChild title="Vitrinde önizle">
                          <Link
                            href={`${previewPrefix}/${encodeURIComponent(news.slug)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                      ) : null}
                      {hmEditorMakaleApi && news.contentKind === "makale" ? (
                        <Button variant="ghost" size="icon" asChild title="Köşe makalesi (hm_makaleler)">
                          <Link href={`${makaleEditorBase}/${news.id}/duzenle`}>
                            <Edit2 className="w-4 h-4" />
                          </Link>
                        </Button>
                      ) : news.contentKind !== "makale" ? (
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`${newsEditorBase}/${news.id}/duzenle`}>
                            <Edit2 className="w-4 h-4" />
                          </Link>
                        </Button>
                      ) : null}
                      {showHmNewsFlags ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={flagBusyId === news.id}
                            title={news.isFeatured ? "Tepe manşetten çıkar" : "Tepe manşete ekle"}
                            onClick={() => void toggleNewsFlag(news, "isFeatured", !news.isFeatured)}
                            className={news.isFeatured ? "text-amber-600 hover:text-amber-700" : "text-slate-400"}
                          >
                            <Star className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={flagBusyId === news.id}
                            title={
                              (news as News & { isSiteManset?: boolean }).isSiteManset
                                ? "Site manşetten çıkar"
                                : "Site manşete ekle"
                            }
                            onClick={() =>
                              void toggleNewsFlag(
                                news,
                                "isSiteManset",
                                !(news as News & { isSiteManset?: boolean }).isSiteManset,
                              )
                            }
                            className={
                              (news as News & { isSiteManset?: boolean }).isSiteManset
                                ? "text-sky-700 hover:text-sky-800"
                                : "text-slate-400"
                            }
                          >
                            <PanelsTopLeft className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={flagBusyId === news.id}
                            title={news.isBreaking ? "Son dakikadan çıkar" : "Son dakikaya ekle"}
                            onClick={() => void toggleNewsFlag(news, "isBreaking", !news.isBreaking)}
                            className={news.isBreaking ? "text-red-600 hover:text-red-700" : "text-slate-400"}
                          >
                            <Zap className="w-4 h-4" />
                          </Button>
                        </>
                      ) : null}
                      {showBulkDelete || hmAuthorApi || hmEditorMakaleApi || hmEditorApi ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(news.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
                    );
                  })()
                ),
              )
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
