import { EditorLayout } from "@/components/EditorLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { useEffect, useState, type ChangeEvent } from "react";
import { useHmEditor } from "@/contexts/HmEditorContext";
import { hmEditorJson, hmEditorRequest } from "@/lib/hmEditorApi";
import { HM_EDITOR_CATEGORIES_QUERY_KEY, HM_EDITOR_RSS_CAMPAIGNS_QUERY_KEY } from "@/lib/hmEditorQueryKeys";

const quickSources = [
  "NTV",
  "Sabah",
  "Hürriyet",
  "Sözcü",
  "TRT",
  "Haberler.com",
  "Milliyet",
  "Cumhuriyet",
  "CNN Türk",
  "BBC Türkçe",
];

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
  haberlerFilterByTags: false,
};

type CampaignRow = typeof DEFAULT_CAMPAIGN_FORM & {
  id: number;
  feeds: string[] | string;
  breakingKeywords?: string[] | string;
  tags?: string[] | string;
};

type Cat = { slug: string; name: string };

export default function EditorRssKampanyaEditor() {
  const { site } = useHmEditor();
  const [, setLocation] = useLocation();
  const params = useParams();
  const isEditing = !!params.id && params.id !== "yeni";
  const id = isEditing ? parseInt(params.id!, 10) : 0;
  const idValid = isEditing && Number.isFinite(id) && id > 0;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...DEFAULT_CAMPAIGN_FORM });

  const { data: campaign, isLoading } = useQuery({
    queryKey: [...HM_EDITOR_RSS_CAMPAIGNS_QUERY_KEY, id],
    queryFn: () => hmEditorJson<CampaignRow>(`/api/hm/editor/rss/campaigns/${id}`),
    enabled: idValid,
  });

  const { data: rssCategoryOptions = [] } = useQuery({
    queryKey: [...HM_EDITOR_CATEGORIES_QUERY_KEY, "rss-campaign"],
    queryFn: () => hmEditorJson<Cat[]>("/api/hm/editor/categories"),
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (!isEditing) {
      setForm({ ...DEFAULT_CAMPAIGN_FORM });
      return;
    }
    if (!campaign || campaign.id !== id) return;
    setForm({
      ...DEFAULT_CAMPAIGN_FORM,
      ...campaign,
      feeds: Array.isArray(campaign.feeds) ? campaign.feeds.join("\n") : String(campaign.feeds || ""),
      breakingKeywords: Array.isArray(campaign.breakingKeywords)
        ? campaign.breakingKeywords.join(", ")
        : String(campaign.breakingKeywords || ""),
      tags: Array.isArray(campaign.tags) ? campaign.tags.join(", ") : String(campaign.tags || ""),
      haberlerFilterByTags: !!campaign.haberlerFilterByTags,
    });
  }, [isEditing, id, campaign]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const isHaberlerSource = form.sourceType === "haberler";

  const handleSave = async (runNow = false) => {
    if (!form.name || !form.feeds || !form.categorySlug) {
      toast({ title: "Lütfen zorunlu alanları doldurun", variant: "destructive" });
      return;
    }
    const feedLines = form.feeds
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);
    if (isHaberlerSource) {
      const invalid = feedLines.filter((u) => !isHaberlerComPageUrl(u));
      if (invalid.length > 0) {
        toast({
          title: "Geçersiz Haberler.com adresi",
          description: "Haberler.com kazıma modunda yalnızca haberler.com sayfa URL'leri kullanılabilir.",
          variant: "destructive",
        });
        return;
      }
    }
    const payload = {
      name: form.name,
      active: form.active,
      postType: "news" as const,
      categorySlug: form.categorySlug,
      tags: parseTagsInput(form.tags ?? ""),
      feeds: feedLines,
      sourceType: form.sourceType,
      intervalMinutes: Number(form.intervalMinutes) || 60,
      daysWindow: Number(form.daysWindow) || 0,
      dailyLimit: Number(form.dailyLimit) || 0,
      downloadImages: form.downloadImages,
      headline: form.headline,
      breakingKeywords: form.breakingKeywords
        ? form.breakingKeywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean)
        : [],
      minWords: Number(form.minWords) || 100,
      translateEnabled: form.translateEnabled,
      haberlerFilterByTags: !!form.haberlerFilterByTags,
    };
    setSaving(true);
    try {
      const saved = isEditing
        ? await hmEditorJson<{ id: number }>(`/api/hm/editor/rss/campaigns/${id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          })
        : await hmEditorJson<{ id: number }>("/api/hm/editor/rss/campaigns", {
            method: "POST",
            body: JSON.stringify(payload),
          });
      toast({ title: "Kampanya kaydedildi" });
      await queryClient.invalidateQueries({ queryKey: [...HM_EDITOR_RSS_CAMPAIGNS_QUERY_KEY] });
      if (runNow && saved?.id) {
        const res = await hmEditorRequest(`/api/hm/editor/rss/campaigns/${saved.id}/run`, {
          method: "POST",
          body: "{}",
        });
        const runJson = (await res.json().catch(() => ({}))) as { added?: number; message?: string; error?: string };
        if (res.ok) {
          toast({
            title: (runJson.added ?? 0) > 0 ? "Çalıştırıldı" : "Arka planda çalıştırılıyor",
            description:
              runJson.message ||
              ((runJson.added ?? 0) > 0 ? `${runJson.added} haber eklendi.` : "İşlem Loglarından sonucu takip edin."),
          });
        } else {
          toast({
            title: "Çalıştırılamadı",
            description: runJson.error || runJson.message,
            variant: "destructive",
          });
        }
      }
      setLocation("/editor/rss-kampanyalari");
    } catch (err) {
      toast({
        title: "Kaydedilemedi",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (isEditing && (!idValid || isLoading || !campaign || campaign.id !== id)) {
    return (
      <EditorLayout title="Kampanya Düzenle">
        <div className="p-8">Yükleniyor...</div>
      </EditorLayout>
    );
  }

  return (
    <EditorLayout title={isEditing ? "Kampanya Düzenle" : "Yeni RSS Kampanyası"}>
      <div className="bg-[#0b1328] text-white p-6 rounded-t-md mb-6">
        <div className="bg-[#e61e25] text-white text-[10px] font-bold px-2 py-1 rounded inline-block mb-2">
          RSS KAMPANYALARI
        </div>
        <h1 className="text-2xl font-bold">{isEditing ? form.name : "Yeni Kampanya Ekle"}</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Haberler {site?.displayName || "bu siteye"} yazılır (Yekpare merkez akışa düşmez).
        </p>
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
                    onValueChange={(v) => setForm((prev) => ({ ...prev, categorySlug: v }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Kategori seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {rssCategoryOptions.map((c) => (
                        <SelectItem key={c.slug} value={c.slug}>
                          {c.name} ({c.slug})
                        </SelectItem>
                      ))}
                      {form.categorySlug && !rssCategoryOptions.some((c) => c.slug === form.categorySlug) ? (
                        <SelectItem value={form.categorySlug}>{form.categorySlug} (mevcut kampanya)</SelectItem>
                      ) : null}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input className="mt-1" name="categorySlug" value={form.categorySlug} onChange={handleChange} />
                )}
              </div>
              <div>
                <Label>Kaynak Tipi</Label>
                <Select value={form.sourceType} onValueChange={(v) => setForm({ ...form, sourceType: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                  Haberler.com&apos;dan liste + tam haber metni kazar. Etiket, kategori veya terim sayfası adresini her
                  satıra bir tane yazın.
                </p>
                <div>
                  <Label>Kazılacak sayfa adresleri (her satır bir URL)</Label>
                  <Textarea
                    name="feeds"
                    value={form.feeds}
                    onChange={handleChange}
                    rows={6}
                    placeholder={"https://www.haberler.com/gazi/\nhttps://www.haberler.com/ekonomi/"}
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
                    onCheckedChange={(c) => setForm((prev) => ({ ...prev, haberlerFilterByTags: c === true }))}
                  />
                  <label htmlFor="haberler-filter-tags" className="cursor-pointer text-sm leading-tight">
                    <span className="font-semibold">Listeyi haber etiketlerine göre filtrele</span>
                    <span className="text-muted-foreground block text-[11px] mt-0.5">
                      İşaretliyse yalnızca «Haber etiketleri» alanındaki kelimeler geçen başlıklar alınır.
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

          <div className="bg-white p-4 rounded-md shadow-sm border space-y-2">
            <h3 className="font-bold border-b pb-2">Hedef</h3>
            <p className="text-sm">
              <span className="font-semibold">{site?.displayName || "Bu haber sitesi"}</span>
            </p>
            <p className="text-[11px] text-muted-foreground leading-snug">
              RSS yalnızca bu editör sitesine yazılır. Aynı kaynak URL bu sitede zaten varsa tekrar eklenmez.
            </p>
          </div>

          <div className="bg-white p-4 rounded-md shadow-sm border space-y-4">
            <h3 className="font-bold border-b pb-2">Haber Ayarları</h3>
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label>Kapakları sunucuya indir</Label>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                  Kapalı (önerilen): RSS’teki görsel doğrudan URL olarak kaydedilir.
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
              <Input name="tags" value={form.tags} onChange={handleChange} placeholder="gazi, sehit" />
            </div>
            <div>
              <Label>Son Dakika Kelimeleri</Label>
              <Input
                name="breakingKeywords"
                value={form.breakingKeywords}
                onChange={handleChange}
                placeholder="Örn: patlama, deprem"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              className="bg-[#e61e25] hover:bg-[#c9181e] text-white w-full"
              disabled={saving}
              onClick={() => void handleSave(false)}
            >
              Kaydet
            </Button>
            <Button variant="outline" className="w-full" disabled={saving} onClick={() => void handleSave(true)}>
              Kaydet + Şimdi Çalıştır
            </Button>
          </div>
        </div>
      </div>
    </EditorLayout>
  );
}
