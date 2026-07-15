import { AdminLayout } from "@/components/AdminLayout";
import { EditorLayout } from "@/components/EditorLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  useCreateNews,
  useUpdateNews,
  useGetNews,
  useListCategories,
  getListNewsQueryKey,
  getGetNewsQueryKey,
  getListCategoriesQueryKey,
} from "@workspace/api-client-react";
import type { News } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation, useParams } from "wouter";
import { apiUrl, extractApiMediaPath, resolveClientMediaSrc } from "@/lib/apiBase";
import { readHmJwt, readHmSite } from "@/lib/hmSession";
import { clearHmNewsArticleBundleCache } from "@/lib/hmNewsArticleCache";
import { readHmAuthorJwt, readHmAuthorPayload } from "@/lib/hmAuthorSession";
import { apiRequest } from "@/lib/queryClient";
import { HM_EDITOR_CATEGORIES_QUERY_KEY, HM_EDITOR_NEWS_QUERY_KEY } from "@/lib/hmEditorQueryKeys";
import { HM_AUTHOR_NEWS_QUERY_KEY } from "@/lib/hmAuthorNewsQueryKey";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { YazarPanelNav } from "@/components/YazarPanelNav";
import { useHmEditorOptional } from "@/contexts/HmEditorContext";
import { useEffect, useState, useRef } from "react";
import { Upload, Wand2, Loader2, ImageIcon, X, Images } from "lucide-react";
import { YekpareMediaPickerDialog } from "@/components/YekpareMediaPickerDialog";
import { NewsContentEditor } from "@/components/NewsContentEditor";
import { appendYekpareCustomMedia, uploadYekpareMediaFile } from "@/lib/yekpareMediaLibrary";

/** Panelde kayıt: mümkünse göreli `/api/media/uploads/…` (tam yol, kırpılmadan). */
function normalizeEditorImageUrl(url: string): string {
  const t = url.trim();
  if (!t || t.startsWith("data:")) return t;
  return extractApiMediaPath(t) ?? t;
}

function AuthorHmChrome({ title, slug, children }: { title: string; slug: string; children: React.ReactNode }) {
  useEffect(() => {
    const prev = document.title;
    document.title = `${title} · Köşe yazarı`;
    return () => {
      document.title = prev;
    };
  }, [title]);
  return (
    <div className="min-h-screen bg-slate-50/90">
      <div className="mx-auto max-w-screen-lg px-3 py-6">
        <YazarPanelNav slug={slug} />
        <h1 className="mb-4 text-xl font-bold text-slate-900">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export default function HaberEditor() {
  const [location, setLocation] = useLocation();
  const params = useParams<{ id?: string; slug?: string }>();
  const pathNoQuery = (location.split("?")[0] ?? "").trim();
  const isEditorHm = pathNoQuery.startsWith("/editor/haberler");
  const isAuthorHm = new RegExp(`\\/(?:hm|${HM_SITE_PUBLIC_PREFIX})\\/[^/]+\\/yazar\\/haber\\/`).test(
    pathNoQuery,
  );
  const authorSlug = String(params.slug ?? "").trim();
  const isEditing = !!params.id && params.id !== "yeni";
  const id = isEditing ? parseInt(params.id!, 10) : 0;
  const idValid = isEditing && Number.isFinite(id) && id > 0;
  const hmEditorCtx = useHmEditorOptional();
  const vitrinTheme = String(hmEditorCtx?.newsLayoutPrefs?.hmVitrinTheme ?? "").trim().toLowerCase();
  const isCorporateSite =
    isEditorHm && (vitrinTheme === "corporate" || vitrinTheme === "kurumsal");

  const { data: adminNews, isLoading: isLoadingAdminNews } = useGetNews(id, {
    query: { enabled: idValid && !isEditorHm && !isAuthorHm, queryKey: getGetNewsQueryKey(id) },
  });
  const { data: hmNews, isLoading: isLoadingHmNews } = useQuery({
    queryKey: ["/api/hm/editor/news/item", id],
    queryFn: async () => {
      const t = readHmJwt();
      if (!t) throw new Error("jwt");
      const r = await fetch(apiUrl(`/api/hm/editor/news/${id}`), {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json() as Promise<News>;
    },
    enabled: isEditorHm && !isAuthorHm && idValid,
  });
  const { data: authorHmNews, isLoading: isLoadingAuthorHmNews } = useQuery({
    queryKey: ["/api/hm/author/news/item", id],
    queryFn: async () => {
      const t = readHmAuthorJwt();
      if (!t) throw new Error("jwt");
      const r = await fetch(apiUrl(`/api/hm/author/news/${id}`), {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json() as Promise<News>;
    },
    enabled: isAuthorHm && idValid,
  });
  const news = isAuthorHm ? authorHmNews : isEditorHm ? hmNews : adminNews;
  const isLoadingNews = isAuthorHm ? isLoadingAuthorHmNews : isEditorHm ? isLoadingHmNews : isLoadingAdminNews;
  const { data: portalCategories } = useListCategories(undefined, {
    query: {
      queryKey: getListCategoriesQueryKey(),
      enabled: !isEditorHm && !isAuthorHm,
    },
  });
  const {
    data: hmEditorCategories,
    isSuccess: hmEditorCategoriesReady,
    isPending: hmEditorCategoriesLoading,
    isError: hmEditorCategoriesFailed,
    error: hmEditorCategoriesError,
  } = useQuery({
    queryKey: [...HM_EDITOR_CATEGORIES_QUERY_KEY],
    queryFn: async () => {
      const t = readHmJwt();
      if (!t) throw new Error("jwt");
      const r = await fetch(apiUrl("/api/hm/editor/categories"), {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json() as Promise<{ name: string; slug: string }[]>;
    },
    enabled: isEditorHm && !isAuthorHm,
  });
  const authorSiteId = isAuthorHm ? readHmAuthorPayload()?.site.id : null;
  const { data: authorHmCategories } = useQuery({
    queryKey: ["/api/categories", "hm-author-editor", authorSiteId],
    queryFn: () =>
      apiRequest(`/api/categories?siteId=${encodeURIComponent(String(authorSiteId))}`) as Promise<
        { name: string; slug: string }[]
      >,
    enabled: isAuthorHm && authorSiteId != null && authorSiteId > 0,
  });
  const categories = isAuthorHm ? authorHmCategories : isEditorHm ? hmEditorCategories : portalCategories;
  const hmSiteForAuthors = isEditorHm ? readHmSite() : null;
  const { data: authorsHm } = useQuery({
    queryKey: ["/api/authors", "hm-editor-haber", hmSiteForAuthors?.id],
    queryFn: () =>
      apiRequest(`/api/authors?hmSiteId=${encodeURIComponent(String(hmSiteForAuthors!.id))}`) as Promise<
        { id: number; name: string; title?: string | null }[]
      >,
    enabled: isEditorHm && !isAuthorHm && !!hmSiteForAuthors?.id,
  });
  const { data: authorsPortal } = useQuery({
    queryKey: ["/api/authors", "portal-haber-editor"],
    queryFn: () => apiRequest("/api/authors") as Promise<{ id: number; name: string; title?: string | null }[]>,
    enabled: !isEditorHm && !isAuthorHm,
  });
  const authors = isEditorHm ? authorsHm : authorsPortal;

  const { data: foodRecipeCategories = [] } = useQuery<Array<{ slug: string; name: string }>>({
    queryKey: ["/api/delivery/subcategories", "haber-editor-food"],
    queryFn: async () => {
      const cats = (await apiRequest("/api/delivery/categories?module=food")) as Array<{ id: number; slug?: string }>;
      const yemek = cats.find((c) => String(c.slug ?? "").toLowerCase() === "yemek") ?? cats[0];
      if (!yemek?.id) return [];
      const rows = (await apiRequest(`/api/delivery/subcategories?categoryId=${encodeURIComponent(String(yemek.id))}`)) as Array<{
        slug: string;
        name: string;
      }>;
      return Array.isArray(rows) ? rows : [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const createNews = useCreateNews();
  const updateNews = useUpdateNews();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    spot: "",
    content: "",
    imageUrl: "",
    categorySlug: "",
    authorId: "0",
    senderFullName: "",
    senderEmail: "",
    senderPhone: "",
    status: "draft" as "published" | "draft",
    isFeatured: false,
    isSiteManset: false,
    isBreaking: false,
    siteOnly: false,
    isFoodRecipe: false,
    foodRecipeCategorySlug: "",
    tags: ""
  });
  const [imagePreview, setImagePreview] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [hmSaving, setHmSaving] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setForm({
        title: "",
        slug: "",
        spot: "",
        content: "",
        imageUrl: "",
        categorySlug: "",
        authorId: "0",
        senderFullName: "",
        senderEmail: "",
        senderPhone: "",
        status: "draft",
        isFeatured: false,
        isSiteManset: false,
        isBreaking: false,
        siteOnly: false,
        isFoodRecipe: false,
        foodRecipeCategorySlug: "",
        tags: "",
      });
      setImagePreview("");
      return;
    }
    if (!news || news.id !== id) return;
    setForm({
      title: news.title || "",
      slug: news.slug || "",
      spot: news.spot || "",
      content: news.content || "",
      imageUrl: normalizeEditorImageUrl(news.imageUrl || ""),
      categorySlug: news.categorySlug || "",
      authorId: (news.authorId || 0).toString(),
      senderFullName: news.senderFullName || "",
      senderEmail: news.senderEmail || "",
      senderPhone: news.senderPhone || "",
      status: news.status || "draft",
      isFeatured: !!news.isFeatured,
      isSiteManset: !!(news as News & { isSiteManset?: boolean }).isSiteManset,
      isBreaking: !!news.isBreaking,
      siteOnly: !!(news as News & { siteOnly?: boolean }).siteOnly,
      isFoodRecipe: !!(news as News & { isFoodRecipe?: boolean }).isFoodRecipe,
      foodRecipeCategorySlug: String((news as News & { foodRecipeCategorySlug?: string | null }).foodRecipeCategorySlug ?? ""),
      tags: news.tags ? news.tags.join(", ") : "",
    });
    setImagePreview(resolveClientMediaSrc(normalizeEditorImageUrl(news.imageUrl || "")));
  }, [isEditing, id, news]);

  useEffect(() => {
    if (!isAuthorHm || isEditing) return;
    const aid = readHmAuthorPayload()?.author?.id;
    if (aid != null) setForm((prev) => ({ ...prev, authorId: String(aid) }));
  }, [isAuthorHm, isEditing]);

  /** Editör yeni haber: `/editor/haberler/yeni?kategori=blog` gibi URL ile varsayılan kategori */
  useEffect(() => {
    if (isEditing || !isEditorHm || isAuthorHm) return;
    const idx = location.indexOf("?");
    if (idx < 0) return;
    const q = new URLSearchParams(location.slice(idx + 1));
    const raw = (q.get("kategori") ?? q.get("category") ?? "").trim();
    if (!raw || !categories?.length) return;
    const match = categories.find(
      (c) => c.slug.toLowerCase() === raw.toLowerCase() || c.name.trim().toLowerCase() === raw.toLowerCase(),
    );
    const slug = match?.slug ?? "";
    if (!slug) return;
    setForm((prev) => (prev.categorySlug ? prev : { ...prev, categorySlug: slug }));
  }, [isEditing, isEditorHm, isAuthorHm, location, categories]);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
    if (name === "imageUrl") setImagePreview(resolveClientMediaSrc(normalizeEditorImageUrl(value)));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Lütfen bir resim dosyası seçin", variant: "destructive" });
      return;
    }
    void (async () => {
      setImageUploading(true);
      try {
        const { url, title } = await uploadYekpareMediaFile(file);
        appendYekpareCustomMedia({ url, title });
        const normalized = normalizeEditorImageUrl(url);
        setImagePreview(resolveClientMediaSrc(normalized));
        setForm((prev) => ({ ...prev, imageUrl: normalized }));
        toast({ title: "Görsel yüklendi", description: "Yekpare medyaya eklendi." });
      } catch (err) {
        toast({
          title: "Yükleme başarısız",
          description: err instanceof Error ? err.message.slice(0, 200) : String(err),
          variant: "destructive",
        });
      } finally {
        setImageUploading(false);
      }
    })();
  };

  const handleAiRewrite = async () => {
    if (!form.content && !form.title) {
      toast({ title: "Önce bir başlık veya içerik girin", variant: "destructive" });
      return;
    }
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/uniquify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          spot: form.spot,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || "AI hata verdi", variant: "destructive" });
        return;
      }
      if (data.title) setForm(prev => ({ ...prev, title: data.title }));
      if (data.content) setForm(prev => ({ ...prev, content: data.content }));
      if (data.spot) setForm(prev => ({ ...prev, spot: data.spot }));
      if (data.tags) setForm(prev => ({ ...prev, tags: Array.isArray(data.tags) ? data.tags.join(", ") : data.tags }));
      toast({ title: "İçerik AI ile özgünleştirildi!" });
    } catch {
      toast({ title: "Bağlantı hatası", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = () => {
    if (!form.title || !form.categorySlug) {
      toast({ title: "Lütfen başlık ve kategori alanlarını doldurun.", variant: "destructive" });
      return;
    }

    const payload = {
      title: form.title,
      slug: form.slug || undefined,
      spot: form.spot || undefined,
      content: form.content || undefined,
      imageUrl: normalizeEditorImageUrl(form.imageUrl) || undefined,
      categorySlug: form.categorySlug,
      authorId: form.authorId !== "0" ? parseInt(form.authorId) : undefined,
      senderFullName: form.senderFullName || undefined,
      senderEmail: form.senderEmail || undefined,
      senderPhone: form.senderPhone || undefined,
      status: form.status,
      isFeatured: isAuthorHm ? false : form.isFeatured,
      isSiteManset: isAuthorHm ? false : form.isSiteManset,
      isBreaking: isAuthorHm ? false : form.isBreaking,
      isFoodRecipe: form.isFoodRecipe,
      foodRecipeCategorySlug: form.isFoodRecipe ? form.foodRecipeCategorySlug || undefined : undefined,
      tags: form.tags ? form.tags.split(",").map(t => t.trim()) : []
    };

    const back = isAuthorHm
      ? `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(authorSlug)}/yazar/haberler`
      : isEditorHm
        ? "/editor/haberler"
        : "/admin/haberler";

    const afterSave = () => {
      toast({ title: isEditing ? "Haber güncellendi." : "Haber eklendi." });
      if (isEditorHm) {
        const editorSiteId = readHmSite()?.id ?? null;
        if (editorSiteId != null && (form.slug || news?.slug)) {
          clearHmNewsArticleBundleCache(editorSiteId, form.slug || news?.slug);
        }
        void queryClient.invalidateQueries({ queryKey: [...HM_EDITOR_NEWS_QUERY_KEY] });
        void queryClient.invalidateQueries({ queryKey: ["/api/hm/editor/news/item", id] });
      } else if (isAuthorHm) {
        void queryClient.invalidateQueries({ queryKey: [...HM_AUTHOR_NEWS_QUERY_KEY] });
        void queryClient.invalidateQueries({ queryKey: ["/api/hm/author/news/item", id] });
      } else {
        void queryClient.invalidateQueries({ queryKey: getListNewsQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getGetNewsQueryKey(id) });
      }
      setLocation(back);
    };

    if (isEditorHm || isAuthorHm) {
      const t = isAuthorHm ? readHmAuthorJwt() : readHmJwt();
      if (!t) {
        toast({ title: "Oturum bulunamadı", variant: "destructive" });
        return;
      }
      void (async () => {
        setHmSaving(true);
        try {
          const base = isAuthorHm ? "/api/hm/author/news" : "/api/hm/editor/news";
          const url = isEditing ? apiUrl(`${base}/${id}`) : apiUrl(base);
          const r = await fetch(url, {
            method: isEditing ? "PUT" : "POST",
            headers: {
              Authorization: `Bearer ${t}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(
              isEditorHm && !isAuthorHm
                ? { ...payload, siteOnly: isCorporateSite ? true : form.siteOnly }
                : payload,
            ),
          });
          const errBody = (await r.json().catch(() => ({}))) as { error?: string };
          if (!r.ok) {
            toast({ title: errBody.error || "Kayıt başarısız", variant: "destructive" });
            return;
          }
          afterSave();
        } catch {
          toast({ title: "Bağlantı hatası", variant: "destructive" });
        } finally {
          setHmSaving(false);
        }
      })();
      return;
    }

    if (isEditing) {
      updateNews.mutate(
        { id, data: payload },
        {
          onSuccess: () => {
            afterSave();
          },
        },
      );
    } else {
      createNews.mutate(
        { data: payload },
        {
          onSuccess: () => {
            afterSave();
          },
        },
      );
    }
  };

  const pageTitle = isEditing ? "Haber Düzenle" : "Yeni Haber Ekle";
  const LayoutShell = isAuthorHm
    ? (({ title, children }: { title: string; children: React.ReactNode }) => (
        <AuthorHmChrome title={title} slug={authorSlug}>
          {children}
        </AuthorHmChrome>
      ))
    : isEditorHm
      ? EditorLayout
      : AdminLayout;

  if (isEditing && (!idValid || isLoadingNews || !news || news.id !== id)) {
    return (
      <LayoutShell title={pageTitle}>
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell title={pageTitle}>
      {isEditorHm ? (
        <p className="text-sm text-slate-600 mb-4">
          <Link href="/editor/haberler" className="text-red-600 font-semibold hover:underline">
            ← Haber listesine dön
          </Link>
        </p>
      ) : null}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Content */}
          <div className="bg-white p-6 rounded-md shadow-sm border space-y-4">
            <div>
              <Label>Başlık</Label>
              <Input name="title" value={form.title} onChange={handleChange} className="text-lg font-bold mt-1" placeholder="Haber başlığını girin..." />
            </div>
            <div>
              <Label>Kısa Özet (Spot)</Label>
              <Textarea name="spot" value={form.spot} onChange={handleChange} rows={3} className="mt-1" placeholder="Haberın kısa özeti..." />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>İçerik</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-purple-700 border-purple-300 hover:bg-purple-50 text-xs"
                  onClick={handleAiRewrite}
                  disabled={aiLoading}
                >
                  {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                  {aiLoading ? "AI Yazıyor..." : "AI ile Özgünleştir"}
                </Button>
              </div>
              <NewsContentEditor
                className="mt-1"
                value={form.content}
                onChange={(html) => setForm((prev) => ({ ...prev, content: html }))}
              />
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-4">
          {/* Publish */}
          <div className="bg-white p-4 rounded-md shadow-sm border space-y-4">
            <h3 className="font-bold border-b pb-2">Yayınla</h3>
            <div>
              <Label>Durum</Label>
              <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Yayında</SelectItem>
                  <SelectItem value="draft">Taslak</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full bg-[#e61e25] hover:bg-[#c9181e] text-white"
              onClick={handleSave}
              disabled={createNews.isPending || updateNews.isPending || hmSaving}
            >
              {(createNews.isPending || updateNews.isPending || hmSaving) && (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              )}
              {isEditing ? "Güncelle" : "Yayınla"}
            </Button>
          </div>

          {(form.senderFullName || form.senderEmail || form.senderPhone) ? (
            <div className="bg-white p-4 rounded-md shadow-sm border space-y-3">
              <h3 className="font-bold border-b pb-2">Gönderen Bilgileri</h3>
              <div>
                <Label>Ad soyad</Label>
                <Input name="senderFullName" value={form.senderFullName} onChange={handleChange} className="mt-1" />
              </div>
              <div>
                <Label>E-posta</Label>
                <Input name="senderEmail" type="email" value={form.senderEmail} onChange={handleChange} className="mt-1" />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input name="senderPhone" value={form.senderPhone} onChange={handleChange} className="mt-1" />
              </div>
            </div>
          ) : null}

          {/* Settings */}
          <div className="bg-white p-4 rounded-md shadow-sm border space-y-4">
            <h3 className="font-bold border-b pb-2">Haber Ayarları</h3>
            <div>
              <Label>Kategori *</Label>
              <Select
                value={form.categorySlug || undefined}
                onValueChange={(v) => setForm({ ...form, categorySlug: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Kategori Seçin" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isEditorHm && !isAuthorHm && hmEditorCategoriesFailed ? (
                <p className="mt-1.5 text-xs text-red-600">
                  Kategoriler yüklenemedi:{" "}
                  {hmEditorCategoriesError instanceof Error
                    ? hmEditorCategoriesError.message
                    : String(hmEditorCategoriesError)}
                </p>
              ) : null}
              {isEditorHm &&
              !isAuthorHm &&
              hmEditorCategoriesReady &&
              !hmEditorCategoriesLoading &&
              (!hmEditorCategories || hmEditorCategories.length === 0) ? (
                <p className="mt-1.5 text-xs text-amber-800">
                  Bu site için aktif Yekpare kategorisi yok. Sol menüden <strong>Kategoriler</strong> →{" "}
                  <strong>Yekpare haber kategorileri</strong> bölümünden en az bir kategori aktif edin.
                </p>
              ) : null}
            </div>
            {isAuthorHm ? (
              <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                Yazar: <span className="font-semibold">{readHmAuthorPayload()?.author?.name ?? "—"}</span>
                <span className="block text-xs text-slate-500 mt-1">Manşet ve son dakika yalnızca site editörü tarafından işaretlenir.</span>
              </div>
            ) : (
              <div>
                <Label>Yazar</Label>
                <Select value={form.authorId} onValueChange={(v) => setForm({ ...form, authorId: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Yazar Seçin" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Yazar Yok</SelectItem>
                    {authors?.map(a => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Etiketler (virgülle ayırın)</Label>
              <Input name="tags" value={form.tags} onChange={handleChange} className="mt-1" placeholder="haber, gündem, siyaset" />
            </div>
            {!isAuthorHm ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Tepe manşet</Label>
                    <p className="text-[11px] text-slate-500 mt-0.5">Yalnızca üst manşet bandında</p>
                  </div>
                  <Switch checked={form.isFeatured} onCheckedChange={(v) => setForm({ ...form, isFeatured: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Site manşet</Label>
                    <p className="text-[11px] text-slate-500 mt-0.5">Alt manşet slider; seçilmezse en güncel haberler</p>
                  </div>
                  <Switch checked={form.isSiteManset} onCheckedChange={(v) => setForm({ ...form, isSiteManset: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Son Dakika Bandı</Label>
                  <Switch checked={form.isBreaking} onCheckedChange={(v) => setForm({ ...form, isBreaking: v })} />
                </div>
                <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="cursor-pointer">Yemek tarifimi</Label>
                    <Switch
                      checked={form.isFoodRecipe}
                      onCheckedChange={(v) =>
                        setForm({
                          ...form,
                          isFoodRecipe: v,
                          foodRecipeCategorySlug: v ? form.foodRecipeCategorySlug : "",
                        })
                      }
                    />
                  </div>
                  {form.isFoodRecipe ? (
                    <div>
                      <Label className="text-xs text-slate-600">Yemek tarifi kategorisi</Label>
                      <Select
                        value={form.foodRecipeCategorySlug || "__none__"}
                        onValueChange={(v) =>
                          setForm({ ...form, foodRecipeCategorySlug: v === "__none__" ? "" : v })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Kategori seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Seçiniz</SelectItem>
                          {foodRecipeCategories.map((cat) => (
                            <SelectItem key={cat.slug} value={cat.slug}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="mt-1 text-[11px] leading-snug text-slate-500">
                        Yemek Haber modülünde listelenir; kategoriler yekpare.net/yemek ile aynıdır.
                      </p>
                    </div>
                  ) : null}
                </div>
                {isEditorHm && !isCorporateSite ? (
                  <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <Label className="cursor-pointer">Siteye özel haber</Label>
                      <Switch checked={form.siteOnly} onCheckedChange={(v) => setForm({ ...form, siteOnly: v })} />
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-slate-500">
                      {form.siteOnly
                        ? "Bu haber yalnızca kendi sitenizde görünür; Yekpare ve diğer sitelere gönderilmez."
                        : "Kapalı: haber Yekpare havuzuna ve bu kategoriyi kullanan tüm sitelere yayılır."}
                    </p>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>

          {/* Featured Image */}
          <div className="bg-white p-4 rounded-md shadow-sm border space-y-3">
            <h3 className="font-bold border-b pb-2">Öne Çıkan Görsel</h3>

            {/* File Upload */}
            <input
              type="file"
              ref={fileRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileSelect}
            />
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => fileRef.current?.click()}
                disabled={imageUploading}
              >
                {imageUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {imageUploading ? "Yükleniyor…" : "Dosyadan yükle"}
              </Button>
              <Button type="button" variant="outline" className="w-full gap-2" onClick={() => setMediaPickerOpen(true)}>
                <Images className="w-4 h-4" />
                Yekpare medyadan seç
              </Button>
            </div>

            <YekpareMediaPickerDialog
              open={mediaPickerOpen}
              onOpenChange={setMediaPickerOpen}
              onSelect={(url) => {
                const normalized = normalizeEditorImageUrl(url);
                setImagePreview(resolveClientMediaSrc(normalized));
                setForm((prev) => ({ ...prev, imageUrl: normalized }));
              }}
            />

            {/* URL Input */}
            <div>
              <Label className="text-xs text-gray-500">veya URL girin</Label>
              <Input
                name="imageUrl"
                value={form.imageUrl.startsWith("data:") ? "" : form.imageUrl}
                onChange={handleChange}
                placeholder="https://... veya /api/media/uploads/…"
                className="mt-1 font-mono text-xs break-all"
                title={form.imageUrl.startsWith("data:") ? "" : form.imageUrl}
                spellCheck={false}
              />
            </div>

            {/* Preview */}
            {imagePreview && (
              <div className="relative">
                <img src={imagePreview} alt="Önizleme" className="w-full h-40 object-cover rounded border" />
                <button
                  type="button"
                  onClick={() => { setImagePreview(""); setForm(prev => ({ ...prev, imageUrl: "" })); }}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {!imagePreview && (
              <div className="w-full h-32 border-2 border-dashed rounded flex items-center justify-center text-gray-300">
                <div className="text-center">
                  <ImageIcon className="w-8 h-8 mx-auto mb-1" />
                  <p className="text-xs">Görsel seçilmedi</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
