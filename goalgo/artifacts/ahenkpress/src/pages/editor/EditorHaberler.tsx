import { useEffect, useMemo, useState } from "react";
import { EditorLayout } from "@/components/EditorLayout";
import { HaberlerInner } from "@/pages/admin/HaberlerInner";
import { EditorYekparePoolPanel } from "@/components/editor/EditorYekparePoolPanel";
import { useHmEditor } from "@/contexts/HmEditorContext";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/apiBase";
import { readHmJwt } from "@/lib/hmSession";
import { HM_EDITOR_NEWS_QUERY_KEY } from "@/lib/hmEditorQueryKeys";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { News } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Edit2, FileUp, Loader2, Trash2 } from "lucide-react";
import { Link, useLocation } from "wouter";

type SubmittedNews = News & {
  senderFullName?: string | null;
  senderEmail?: string | null;
  senderPhone?: string | null;
};

type HaberlerTab = "kendi" | "yekpare";

function readTabFromLocation(location: string): HaberlerTab {
  const tab = new URLSearchParams((location.split("?")[1] ?? "").trim()).get("tab");
  return tab === "yekpare" ? "yekpare" : "kendi";
}

function readKategoriFromLocation(location: string): string {
  const q = new URLSearchParams((location.split("?")[1] ?? "").trim());
  return String(q.get("kategori") ?? q.get("categorySlug") ?? "").trim().toLowerCase();
}

function EditorNewsSubmissionsPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<number | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["/api/hm/editor/news", "submitted"],
    queryFn: async () => {
      const t = readHmJwt();
      if (!t) throw new Error("Oturum yok");
      const r = await fetch(apiUrl("/api/hm/editor/news?submitted=1&limit=50"), {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json() as Promise<{ items?: SubmittedNews[]; total?: number }>;
    },
  });
  const items = data?.items ?? [];

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["/api/hm/editor/news", "submitted"] });
    await qc.invalidateQueries({ queryKey: [...HM_EDITOR_NEWS_QUERY_KEY] });
  };

  const approve = async (news: SubmittedNews) => {
    const t = readHmJwt();
    if (!t) return;
    setBusyId(news.id);
    try {
      const r = await fetch(apiUrl(`/api/hm/editor/news/${news.id}`), {
        method: "PUT",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: news.title,
          slug: news.slug,
          spot: news.spot ?? undefined,
          content: news.content ?? undefined,
          imageUrl: news.imageUrl ?? undefined,
          categorySlug: news.categorySlug,
          authorId: news.authorId ?? undefined,
          status: "published",
          isFeatured: news.isFeatured ?? false,
          isSiteManset: (news as SubmittedNews & { isSiteManset?: boolean }).isSiteManset ?? false,
          isBreaking: news.isBreaking ?? false,
          tags: news.tags ?? ["haber-gonder"],
          senderFullName: news.senderFullName ?? undefined,
          senderEmail: news.senderEmail ?? undefined,
          senderPhone: news.senderPhone ?? undefined,
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      await invalidate();
      toast({ title: "Haber yayına alındı" });
    } catch (err) {
      toast({ title: "Onaylanamadı", description: String((err as Error).message), variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Bu gönderimi silmek istiyor musunuz?")) return;
    const t = readHmJwt();
    if (!t) return;
    setBusyId(id);
    try {
      const r = await fetch(apiUrl(`/api/hm/editor/news/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!r.ok) throw new Error(await r.text());
      await invalidate();
      toast({ title: "Gönderim silindi" });
    } catch (err) {
      toast({ title: "Silinemedi", description: String((err as Error).message), variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3">
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-900">Haber gönderimleri</h2>
        <p className="mt-1 text-xs text-slate-500">Ziyaretçilerin Haber Gönder formundan ilettiği taslaklar.</p>
      </div>
      {isLoading ? (
        <p className="text-sm text-slate-500">Gönderimler yükleniyor...</p>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
          Bekleyen haber gönderimi yok.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-bold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.senderFullName || "Ad yok"} · {item.senderEmail || "E-posta yok"}
                    {item.senderPhone ? ` · ${item.senderPhone}` : ""}
                  </p>
                  {item.spot ? <p className="mt-1 line-clamp-2 text-xs text-slate-600">{item.spot}</p> : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
                    disabled={busyId === item.id}
                    onClick={() => void approve(item)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Onayla
                  </Button>
                  <Button type="button" variant="outline" size="sm" asChild>
                    <Link href={`/editor/haberler/${item.id}/duzenle`}>
                      <Edit2 className="mr-1 h-3.5 w-3.5" />
                      Düzenle
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1 text-red-600"
                    disabled={busyId === item.id}
                    onClick={() => void remove(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Sil
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EditorHaberler() {
  const { site, newsLayoutPrefs } = useHmEditor();
  const [location, setLocation] = useLocation();
  const pathBase = useMemo(() => (location.split("?")[0] ?? "").trim() || "/editor/haberler", [location]);
  const [tab, setTab] = useState<HaberlerTab>(() => readTabFromLocation(location));
  const [categorySlug, setCategorySlug] = useState(() => readKategoriFromLocation(location));
  const vitrinTheme = String(newsLayoutPrefs.hmVitrinTheme ?? "").trim().toLowerCase();
  const isCorporateSite = vitrinTheme === "corporate" || vitrinTheme === "kurumsal";

  useEffect(() => {
    setTab(readTabFromLocation(location));
    setCategorySlug(readKategoriFromLocation(location));
  }, [location]);

  useEffect(() => {
    if (!isCorporateSite || tab !== "yekpare") return;
    setTab("kendi");
    const params = new URLSearchParams();
    if (categorySlug) params.set("kategori", categorySlug);
    const qs = params.toString();
    setLocation(qs ? `${pathBase}?${qs}` : pathBase);
  }, [isCorporateSite, tab, categorySlug, pathBase, setLocation]);

  const pushQuery = (nextTab: HaberlerTab, nextCategory: string) => {
    const params = new URLSearchParams();
    if (nextTab === "yekpare") params.set("tab", "yekpare");
    if (nextCategory) params.set("kategori", nextCategory);
    const qs = params.toString();
    setLocation(qs ? `${pathBase}?${qs}` : pathBase);
  };

  const newsPreviewHrefPrefix = site?.slug
    ? `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(site.slug)}/haber`
    : null;

  return (
    <EditorLayout title="Haberler">
      <Tabs
        value={tab}
        onValueChange={(v) => {
          const next = v === "yekpare" ? "yekpare" : "kendi";
          setTab(next);
          pushQuery(next, categorySlug);
        }}
        className="space-y-4"
      >
        <TabsList className={`grid w-full max-w-md ${isCorporateSite ? "grid-cols-1" : "grid-cols-2"}`}>
          <TabsTrigger value="kendi">Kendi haberlerim</TabsTrigger>
          {!isCorporateSite ? <TabsTrigger value="yekpare">Yekpare havuzu</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="kendi" className="mt-0 space-y-4">
          <EditorNewsSubmissionsPanel />
          <HaberlerInner
            newsEditorBase="/editor/haberler"
            categoriesHref="/editor/kategoriler"
            showBulkDelete={false}
            showCategoryFilter
            hmEditorApi
            newsPreviewHrefPrefix={newsPreviewHrefPrefix}
            extraActions={
              <Button variant="outline" asChild>
                <Link href="/editor/wordpress-ice-aktar">
                  <FileUp className="mr-2 h-4 w-4" />
                  WordPress XML içe aktar
                </Link>
              </Button>
            }
          />
        </TabsContent>

        {!isCorporateSite ? (
          <TabsContent value="yekpare" className="mt-0">
            <EditorYekparePoolPanel
              categorySlug={categorySlug}
              onCategorySlugChange={(slug) => {
                setCategorySlug(slug);
                pushQuery("yekpare", slug);
              }}
            />
          </TabsContent>
        ) : null}
      </Tabs>
    </EditorLayout>
  );
}
