import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCreateRssCampaign, useUpdateRssCampaign, useGetRssCampaign, useRunRssCampaign, getListRssCampaignsQueryKey, getGetRssCampaignQueryKey } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { apiFetch, apiUrl, ensureAdminPanelBootstrap } from "@/lib/apiBase";
import { apiRequest } from "@/lib/queryClient";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";

type HmSiteRow = { id: number; slug: string; displayName: string; active: boolean };

async function fetchHmSites(): Promise<{ items: HmSiteRow[] }> {
  await ensureAdminPanelBootstrap();
  const r = await apiFetch(apiUrl("/api/hm/sites"));
  const j = (await r.json().catch(() => ({}))) as { items?: HmSiteRow[] };
  if (!r.ok) return { items: [] };
  return { items: Array.isArray(j.items) ? j.items.filter((x) => x?.active !== false) : [] };
}

const quickSources = [
  "NTV", "Sabah", "Hürriyet", "Sözcü", "TRT", "Haberler.com", "Milliyet", "Cumhuriyet", "CNN Türk", "BBC Türkçe"
];

/** Haberler.com etiket / kategori / terim sayfa örnekleri — istediğiniz URL'yi de satır satır ekleyebilirsiniz. */
const haberlerPagePresets: { label: string; pageUrl: string; tag?: string }[] = [
  { label: "Gazi", pageUrl: "https://www.haberler.com/gazi/", tag: "gazi" },
  { label: "Şehit", pageUrl: "https://www.haberler.com/sehit/", tag: "sehit" },
  { label: "Ekonomi", pageUrl: "https://www.haberler.com/ekonomi/", tag: "ekonomi" },
  { label: "Spor", pageUrl: "https://www.haberler.com/spor/", tag: "spor" },
  { label: "Son dakika", pageUrl: "https://www.haberler.com/son-dakika/" },
  { label: "Dünya", pageUrl: "https://www.haberler.com/dunya/", tag: "dunya" },
  { label: "Magazin", pageUrl: "https://www.haberler.com/magazin/", tag: "magazin" },
];

function isHaberlerComPageUrl(raw: string): boolean {
  try {
    return new URL(raw.trim()).hostname.toLowerCase().replace(/^www\./, "") === "haberler.com";
  } catch {
    return false;
  }
}

function parseTagsInput(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function mergeTagsInput(prev: string, add: string[]): string {
  const set = new Set(parseTagsInput(prev));
  for (const t of add) set.add(t);
  return Array.from(set).join(", ");
}

const DEFAULT_CAMPAIGN_FORM = {
  name: "",
  active: true,
  postType: "news",
  categorySlug: "gundem",
  feeds: "",
  sourceType: "rss",
  intervalMinutes: 60,
  daysWindow: 3,
  dailyLimit: 10,
  downloadImages: false,
  headline: false,
  breakingKeywords: "",
  tags: "",
  minWords: 100,
  translateEnabled: false,
  hmSiteIds: [] as number[],
  includeYekpareHaber: false,
  haberlerFilterByTags: false,
};

export default function RssKampanyaEditor() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const isEditing = !!params.id && params.id !== "yeni";
  const id = isEditing ? parseInt(params.id!, 10) : 0;
  const idValid = isEditing && Number.isFinite(id) && id > 0;

  const { data: campaign, isLoading } = useGetRssCampaign(id, {
    query: { enabled: idValid, queryKey: getGetRssCampaignQueryKey(id) },
  });
  const createCampaign = useCreateRssCampaign();
  const updateCampaign = useUpdateRssCampaign();
  const runCampaign = useRunRssCampaign();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState<any>({ ...DEFAULT_CAMPAIGN_FORM });

  const { data: hmSitesData } = useQuery({
    queryKey: ["/api/hm/sites", "rss-editor"],
    queryFn: fetchHmSites,
    retry: false,
  });
  const hmSites = hmSitesData?.items ?? [];

  const categorySiteIdsParam = useMemo(() => {
    const ids = (Array.isArray(form.hmSiteIds) ? form.hmSiteIds : [])
      .map((n: number) => Number(n))
      .filter((n: number) => Number.isFinite(n) && n > 0);
    return ids.length ? ids.join(",") : "";
  }, [form.hmSiteIds]);

  const hmSiteNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const s of hmSites) m.set(s.id, s.displayName || s.slug);
    return m;
  }, [hmSites]);

  const { data: rssCategoryOptions = [] } = useQuery({
    queryKey: ["/api/categories", "rss-campaign", "admin", categorySiteIdsParam],
    queryFn: async () => {
      const all = (await apiRequest("/api/categories?scope=admin")) as {
        slug: string;
        name: string;
        exclusiveSiteId?: number | null;
      }[];
      if (!categorySiteIdsParam) {
        return all;
      }
      const targetIds = new Set(
        categorySiteIdsParam
          .split(",")
          .map((s: string) => parseInt(s.trim(), 10))
          .filter((n: number) => Number.isFinite(n) && n > 0),
      );
      return all.filter(
        (c) => c.exclusiveSiteId == null || (c.exclusiveSiteId != null && targetIds.has(c.exclusiveSiteId)),
      );
    },
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (!isEditing) {
      setForm({ ...DEFAULT_CAMPAIGN_FORM });
      return;
    }
    if (!campaign || campaign.id !== id) return;
    setForm({
      ...campaign,
      feeds: campaign.feeds.join("\n"),
      breakingKeywords: campaign.breakingKeywords?.join(", ") || "",
      tags: Array.isArray(campaign.tags) ? campaign.tags.join(", ") : "",
      hmSiteIds: Array.isArray(campaign.hmSiteIds) ? campaign.hmSiteIds : [],
      includeYekpareHaber: !!campaign.includeYekpareHaber,
      haberlerFilterByTags: !!campaign.haberlerFilterByTags,
    });
  }, [isEditing, id, campaign]);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setForm((prev: any) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const isHaberlerSource = form.sourceType === "haberler";

  const handleSave = (runNow: boolean = false) => {
    if (!form.name || !form.feeds || !form.categorySlug) {
      toast({ title: "Lütfen zorunlu alanları doldurun", variant: "destructive" });
      return;
    }

    const feedLines = form.feeds
      .split("\n")
      .map((f: string) => f.trim())
      .filter(Boolean);
    if (isHaberlerSource) {
      const invalid = feedLines.filter((u: string) => !isHaberlerComPageUrl(u));
      if (invalid.length > 0) {
        toast({
          title: "Geçersiz Haberler.com adresi",
          description: "Haberler.com kazıma modunda yalnızca haberler.com sayfa URL'leri kullanılabilir.",
          variant: "destructive",
        });
        return;
      }
    }

    // Input type="number" değerleri string tutar; API Zod şeması number bekler (aksi halde 400, sessiz hata).
    const payload = {
      name: form.name,
      active: form.active,
      postType: form.postType,
      categorySlug: form.categorySlug,
      tags: parseTagsInput(form.tags ?? ""),
      feeds: feedLines,
      sourceType: form.sourceType,
      intervalMinutes: Number(form.intervalMinutes) || 60,
      daysWindow: Number(form.daysWindow) || 0,
      dailyLimit: Number(form.dailyLimit) || 0,
      downloadImages: form.downloadImages,
      headline: form.headline,
      breakingKeywords: form.breakingKeywords ? form.breakingKeywords.split(",").map((k: string) => k.trim()) : [],
      minWords: Number(form.minWords) || 100,
      translateEnabled: form.translateEnabled,
      hmSiteIds: Array.isArray(form.hmSiteIds) ? form.hmSiteIds : [],
      includeYekpareHaber: !!form.includeYekpareHaber,
      haberlerFilterByTags: !!form.haberlerFilterByTags,
    };

    const onError = (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: "Kaydedilemedi", description: msg, variant: "destructive" });
    };

    const onSuccess = (data: any) => {
      toast({ title: "Kampanya kaydedildi" });
      queryClient.invalidateQueries({ queryKey: getListRssCampaignsQueryKey() });
      if (runNow) {
        runCampaign.mutate(
          { id: data.id },
          {
            onSuccess: (res) =>
              toast({
                title: res.added > 0 ? "Çalıştırıldı" : "Arka planda çalıştırılıyor",
                description:
                  res.message ||
                  (res.added > 0 ? `${res.added} haber eklendi.` : "İşlem Loglarından sonucu takip edin."),
              }),
            onError,
          },
        );
      }
      setLocation("/admin/rss-kampanyalari");
    };

    if (isEditing) {
      updateCampaign.mutate({ id, data: payload }, { onSuccess, onError });
    } else {
      createCampaign.mutate({ data: payload }, { onSuccess, onError });
    }
  };

  if (isEditing && (!idValid || isLoading || !campaign || campaign.id !== id)) {
    return <AdminLayout title="Kampanya Düzenle"><div className="p-8">Yükleniyor...</div></AdminLayout>;
  }

  return (
    <AdminLayout title={isEditing ? "Kampanya Düzenle" : "Yeni RSS Kampanyası"}>
      <div className="bg-[#0b1328] text-white p-6 rounded-t-md mb-6">
        <h1 className="text-2xl font-bold">{isEditing ? form.name : "Yeni Kampanya Ekle"}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-md shadow-sm border space-y-4">
            <h3 className="font-bold border-b pb-2">Temel Bilgiler</h3>
            <div>
              <Label>Kampanya Adı</Label>
              <Input name="name" value={form.name} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Kategori (slug)</Label>
                {rssCategoryOptions.length > 0 ? (
                  <Select
                    value={form.categorySlug}
                    onValueChange={(v) => setForm((prev: any) => ({ ...prev, categorySlug: v }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Kategori seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {rssCategoryOptions.map((c) => (
                        <SelectItem key={c.slug} value={c.slug}>
                          {c.name} ({c.slug})
                          {c.exclusiveSiteId != null
                            ? ` · site #${c.exclusiveSiteId}${hmSiteNameById.get(c.exclusiveSiteId) ? ` (${hmSiteNameById.get(c.exclusiveSiteId)})` : ""}`
                            : " · genel"}
                        </SelectItem>
                      ))}
                      {form.categorySlug &&
                      !rssCategoryOptions.some((c) => c.slug === form.categorySlug) ? (
                        <SelectItem value={form.categorySlug}>
                          {form.categorySlug} (mevcut kampanya)
                        </SelectItem>
                      ) : null}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input className="mt-1" name="categorySlug" value={form.categorySlug} onChange={handleChange} />
                )}
                <p className="text-[11px] text-muted-foreground mt-1">
                  Tüm kategoriler (genel + siteye özel) listelenir. Hedef HM sitesi işaretliyseniz yalnızca o sitelere ait
                  özel kategoriler de dahil edilir.
                </p>
              </div>
              <div>
                <Label>Kaynak Tipi</Label>
                <Select value={form.sourceType} onValueChange={(v) => setForm({ ...form, sourceType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="haberler">Haberler.com Kazıma</SelectItem>
                    <SelectItem value="rss">RSS Feed (diğer siteler)</SelectItem>
                    <SelectItem value="html">HTML Kazıma (diğer siteler)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-md shadow-sm border space-y-4">
            <h3 className="font-bold border-b pb-2">
              {isHaberlerSource ? "Haberler.com — Kazılacak sayfalar" : "Besleme kaynakları"}
            </h3>
            {isHaberlerSource ? (
              <>
                <p className="text-xs text-slate-600 leading-snug rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <strong>Yekpare admin paneli:</strong> Sol menü → <strong>RSS Kampanyaları</strong> (
                  <code className="text-[10px]">/admin/rss-kampanyalari</code>). Bu modül Haberler.com&apos;dan liste +
                  tam haber metni kazar; <strong>RSS kullanılmaz</strong>. Etiket, kategori veya terim sayfası
                  adresini her satıra bir tane yazın.
                </p>
                <div>
                  <Label>Kazılacak sayfa adresleri (her satır bir URL)</Label>
                  <Textarea
                    name="feeds"
                    value={form.feeds}
                    onChange={handleChange}
                    rows={6}
                    placeholder={"https://www.haberler.com/gazi/\nhttps://www.haberler.com/ekonomi/\nhttps://www.haberler.com/spor/"}
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Örnek sayfalar (tıkla ekle)</Label>
                  <div className="flex flex-wrap gap-2">
                    {haberlerPagePresets.map((p) => (
                      <Badge
                        key={p.pageUrl}
                        variant="outline"
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() =>
                          setForm({
                            ...form,
                            sourceType: "haberler",
                            feeds: form.feeds + (form.feeds ? "\n" : "") + p.pageUrl,
                            tags: p.tag ? mergeTagsInput(form.tags ?? "", [p.tag]) : form.tags,
                          })
                        }
                      >
                        + {p.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-md border border-slate-100 bg-slate-50/80 px-3 py-2">
                  <Checkbox
                    id="haberler-filter-tags"
                    checked={!!form.haberlerFilterByTags}
                    onCheckedChange={(c) => setForm((prev: any) => ({ ...prev, haberlerFilterByTags: c === true }))}
                  />
                  <label htmlFor="haberler-filter-tags" className="cursor-pointer text-sm leading-tight">
                    <span className="font-semibold">Listeyi haber etiketlerine göre filtrele</span>
                    <span className="text-muted-foreground block text-[11px] mt-0.5">
                      İşaretli değilse sayfadaki tüm haberler kazınır. İşaretliyse yalnızca «Haber etiketleri» alanındaki
                      kelimeler geçen başlıklar alınır (ör. gazi, sehit, ekonomi).
                    </span>
                  </label>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label>Feed URL&apos;leri (her satıra bir adet)</Label>
                  <Textarea
                    name="feeds"
                    value={form.feeds}
                    onChange={handleChange}
                    rows={5}
                    placeholder="https://example.com/feed.rss"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Haberler.com için üstte <strong>Haberler.com Kazıma</strong> kaynak tipini seçin.
                  </p>
                </div>
                <div>
                  <Label className="mb-2 block">Hızlı Ekle (örnek RSS)</Label>
                  <div className="flex flex-wrap gap-2">
                    {quickSources.map((s) => (
                      <Badge
                        key={s}
                        variant="outline"
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() =>
                          setForm({
                            ...form,
                            feeds: form.feeds + (form.feeds ? "\n" : "") + `https://example.com/${s.toLowerCase()}/rss`,
                          })
                        }
                      >
                        + {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-4 rounded-md shadow-sm border space-y-4">
            <h3 className="font-bold border-b pb-2">Zamanlama</h3>
            <div>
              <Label>Çalışma Aralığı (Dakika)</Label>
              <Input type="number" name="intervalMinutes" value={form.intervalMinutes} onChange={handleChange} />
            </div>
            <div>
              <Label>Günlük Limit</Label>
              <Input type="number" name="dailyLimit" value={form.dailyLimit} onChange={handleChange} />
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <Label>Durum (Aktif/Pasif)</Label>
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-md shadow-sm border space-y-4">
            <h3 className="font-bold border-b pb-2">Hedef HM siteleri + Yekpare Haber</h3>
            <p className="text-[11px] text-muted-foreground leading-snug">
              RSS yalnızca <strong>işaretlediğiniz</strong> hedeflere yazılır: HM siteleri ve/veya aşağıdaki «Yekpare
              Haber» (merkez akış, <code className="text-[10px]">site_id</code> boş). Hiçbiri seçili değilse kampanya
              çalışmaz. Aynı kaynak URL aynı sitede zaten varsa tekrar eklenmez (çift haber önlenir).
            </p>
            <div className="flex items-start gap-2 rounded-md border border-slate-100 bg-slate-50/80 px-3 py-2">
              <Checkbox
                id="yekpare-haber"
                checked={!!form.includeYekpareHaber}
                onCheckedChange={(c) => setForm((prev: any) => ({ ...prev, includeYekpareHaber: c === true }))}
              />
              <label htmlFor="yekpare-haber" className="cursor-pointer text-sm leading-tight">
                <span className="font-semibold">Yekpare Haber</span>
                <span className="text-muted-foreground block text-[11px] mt-0.5">
                  Merkez haber akışı (turknet.app / haberler). İstemezseniz işaretlemeyin; yalnızca seçtiğiniz HM
                  sitelerine düşer.
                </span>
              </label>
            </div>
            {hmSites.length === 0 ? (
              <p className="text-xs text-amber-700">HM site listesi yüklenemedi veya tanımlı site yok.</p>
            ) : (
              <ul className="max-h-48 space-y-2 overflow-y-auto pr-1 text-sm">
                {hmSites.map((s) => {
                  const checked = (form.hmSiteIds ?? []).includes(s.id);
                  return (
                    <li key={s.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`hm-site-${s.id}`}
                        checked={checked}
                        onCheckedChange={() =>
                          setForm((prev: any) => {
                            const cur: number[] = Array.isArray(prev.hmSiteIds) ? prev.hmSiteIds : [];
                            const next = checked ? cur.filter((x) => x !== s.id) : [...cur, s.id];
                            return { ...prev, hmSiteIds: next };
                          })
                        }
                      />
                      <label htmlFor={`hm-site-${s.id}`} className="cursor-pointer leading-tight">
                        <span className="font-medium">{s.displayName}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          · /{HM_SITE_PUBLIC_PREFIX}/{s.slug}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="bg-white p-4 rounded-md shadow-sm border space-y-4">
            <h3 className="font-bold border-b pb-2">Haber Ayarları</h3>
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label>Kapakları sunucuya indir</Label>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                  Kapalı (önerilen): RSS’teki görsel doğrudan <strong>URL</strong> olarak kaydedilir; Yekpare medyaya yüklenmez.
                </p>
              </div>
              <Switch checked={form.downloadImages} onCheckedChange={(v) => setForm({ ...form, downloadImages: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Manşete Ekle</Label>
              <Switch checked={form.headline} onCheckedChange={(v) => setForm({ ...form, headline: v })} />
            </div>
            <div>
              <Label>Haber etiketleri</Label>
              <Input
                name="tags"
                value={form.tags}
                onChange={handleChange}
                placeholder="gazi, sehit"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Virgülle ayırın. Haberler.com Gazi/Şehit kaynakları için <code className="text-[10px]">gazi</code> /{" "}
                <code className="text-[10px]">sehit</code> ekleyin; vitrinde etiket filtreleri için kullanılır.
              </p>
            </div>
            <div>
              <Label>Son Dakika Kelimeleri</Label>
              <Input name="breakingKeywords" value={form.breakingKeywords} onChange={handleChange} placeholder="Örn: patlama, deprem" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button className="bg-[#e61e25] hover:bg-[#c9181e] text-white w-full" onClick={() => handleSave(false)}>Kaydet</Button>
            <Button variant="outline" className="w-full" onClick={() => handleSave(true)}>Kaydet + Şimdi Çalıştır</Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}