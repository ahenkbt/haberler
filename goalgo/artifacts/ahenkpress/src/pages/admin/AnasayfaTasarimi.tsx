import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useGetSiteSettings, useUpdateSiteSettings, getGetSiteSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  defaultYekpareLandingDesign,
  LANDING_SECTION_LABELS,
  parseYekpareLandingDesignFromJson,
  resolveLandingSectionOrder,
  serializeYekpareLandingDesign,
  type LandingSectionId,
  type YekpareLandingDesign,
} from "@/lib/yekpareLandingDesign";

export default function AnasayfaTasarimi() {
  const { data: settings, isLoading } = useGetSiteSettings();
  const updateSettings = useUpdateSiteSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const initial = useMemo(
    () => parseYekpareLandingDesignFromJson(settings?.homepageDesignJson ?? null),
    [settings?.homepageDesignJson],
  );

  const [design, setDesign] = useState<YekpareLandingDesign>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDesign(initial), [initial]);

  const sectionOrder = resolveLandingSectionOrder(design);

  const save = async (next: YekpareLandingDesign) => {
    setDesign(next);
    setSaving(true);
    try {
      await updateSettings.mutateAsync({
        data: { homepageDesignJson: serializeYekpareLandingDesign(next) },
      });
      await queryClient.invalidateQueries({ queryKey: getGetSiteSettingsQueryKey() });
      toast({ title: "Anasayfa tasarımı kaydedildi" });
    } catch (e) {
      toast({
        title: "Kaydedilemedi",
        description: String((e as Error)?.message ?? e).slice(0, 240),
        variant: "destructive",
      });
      setDesign(initial);
    } finally {
      setSaving(false);
    }
  };

  const moveSection = (index: number, dir: -1 | 1) => {
    const order = [...sectionOrder];
    const j = index + dir;
    if (j < 0 || j >= order.length) return;
    [order[index], order[j]] = [order[j], order[index]];
    void save({ ...design, sectionOrder: order });
  };

  const toggleSection = (id: LandingSectionId, enabled: boolean) => {
    void save({
      ...design,
      sections: { ...design.sections, [id]: { enabled } },
    });
  };

  if (isLoading) {
    return (
      <AdminLayout title="Anasayfa Tasarımı">
        <div className="py-16 text-center text-gray-500">Yükleniyor…</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Anasayfa Tasarımı">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Yekpare giriş sayfası (`/`)</h1>
          <p className="text-sm text-gray-500 mt-1">
            Metin, görseller, bölüm sırası ve görünürlük. Eski servis vitrini `/servisler` adresinde kalır.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <a href="/" target="_blank" rel="noreferrer">Önizle</a>
          </Button>
          <Button
            variant="outline"
            onClick={() => void save(defaultYekpareLandingDesign())}
            disabled={saving}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Varsayılana dön
          </Button>
          <Button
            className="bg-[#039D55] hover:bg-[#028a4a] text-white"
            onClick={() => void save(design)}
            disabled={saving}
          >
            <Save className="mr-2 h-4 w-4" />
            Kaydet
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Accordion type="multiple" defaultValue={["hero", "stats"]} className="rounded-lg border bg-white">
            <AccordionItem value="hero">
              <AccordionTrigger className="px-4 font-semibold">Hero — üst vitrin</AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3">
                <div>
                  <Label>Başlık</Label>
                  <Input
                    value={design.hero.title}
                    onChange={(e) => setDesign({ ...design, hero: { ...design.hero, title: e.target.value } })}
                  />
                </div>
                <div>
                  <Label>Alt metin</Label>
                  <Textarea
                    rows={2}
                    value={design.hero.subtitle}
                    onChange={(e) => setDesign({ ...design, hero: { ...design.hero, subtitle: e.target.value } })}
                  />
                </div>
                <div>
                  <Label>Arka plan görseli (opsiyonel URL veya /yol)</Label>
                  <p className="mb-1.5 text-xs text-gray-500">
                    Varsayılan Sade gradient bandı kullanılır. Görsel yalnızca aşağıdaki anahtar açıkken gösterilir.
                  </p>
                  <Input
                    value={design.hero.backgroundImage}
                    onChange={(e) =>
                      setDesign({ ...design, hero: { ...design.hero, backgroundImage: e.target.value } })
                    }
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <Switch
                      id="hero-show-bg"
                      checked={design.hero.showBackgroundImage === true}
                      onCheckedChange={(checked) =>
                        setDesign({ ...design, hero: { ...design.hero, showBackgroundImage: checked } })
                      }
                    />
                    <Label htmlFor="hero-show-bg" className="text-sm font-normal cursor-pointer">
                      Arka plan görselini göster
                    </Label>
                  </div>
                </div>
                <div>
                  <Label>Sağ vitrin görseli (opsiyonel, masaüstü)</Label>
                  <p className="mb-1.5 text-xs text-gray-500">
                    Hero sağındaki foto kartı. Kapalıyken yalnızca metin, arama ve modül kartları görünür.
                  </p>
                  <Input
                    value={design.hero.sideImage}
                    onChange={(e) => setDesign({ ...design, hero: { ...design.hero, sideImage: e.target.value } })}
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <Switch
                      id="hero-show-side"
                      checked={design.hero.showSideImage === true}
                      onCheckedChange={(checked) =>
                        setDesign({ ...design, hero: { ...design.hero, showSideImage: checked } })
                      }
                    />
                    <Label htmlFor="hero-show-side" className="text-sm font-normal cursor-pointer">
                      Sağ vitrin görselini göster
                    </Label>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Konum istemi</Label>
                    <Input
                      value={design.hero.locationPrompt}
                      onChange={(e) =>
                        setDesign({ ...design, hero: { ...design.hero, locationPrompt: e.target.value } })
                      }
                    />
                  </div>
                  <div>
                    <Label>Modül istemi</Label>
                    <Input
                      value={design.hero.modulePrompt}
                      onChange={(e) =>
                        setDesign({ ...design, hero: { ...design.hero, modulePrompt: e.target.value } })
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <Label>Arama placeholder</Label>
                    <Input
                      value={design.hero.searchPlaceholder}
                      onChange={(e) =>
                        setDesign({ ...design, hero: { ...design.hero, searchPlaceholder: e.target.value } })
                      }
                    />
                  </div>
                  <div>
                    <Label>Ara butonu</Label>
                    <Input
                      value={design.hero.searchButtonLabel}
                      onChange={(e) =>
                        setDesign({ ...design, hero: { ...design.hero, searchButtonLabel: e.target.value } })
                      }
                    />
                  </div>
                  <div>
                    <Label>Konum butonu</Label>
                    <Input
                      value={design.hero.locationButtonLabel}
                      onChange={(e) =>
                        setDesign({ ...design, hero: { ...design.hero, locationButtonLabel: e.target.value } })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2 rounded border p-3">
                  <Label>Cam hızlı aksiyonlar (2 buton)</Label>
                  {design.hero.quickActions.slice(0, 2).map((action, i) => (
                    <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr]">
                      <Input
                        placeholder="Buton etiketi"
                        value={action.label}
                        onChange={(e) => {
                          const quickActions = [...design.hero.quickActions];
                          quickActions[i] = { ...quickActions[i], label: e.target.value };
                          setDesign({ ...design, hero: { ...design.hero, quickActions } });
                        }}
                      />
                      <Input
                        placeholder="/yemek"
                        value={action.href}
                        onChange={(e) => {
                          const quickActions = [...design.hero.quickActions];
                          quickActions[i] = { ...quickActions[i], href: e.target.value };
                          setDesign({ ...design, hero: { ...design.hero, quickActions } });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="stats">
              <AccordionTrigger className="px-4 font-semibold">İstatistikler</AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3">
                {design.stats.map((stat, i) => (
                  <div key={i} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label>Değer</Label>
                      <Input
                        value={stat.value}
                        onChange={(e) => {
                          const stats = [...design.stats];
                          stats[i] = { ...stats[i], value: e.target.value };
                          setDesign({ ...design, stats });
                        }}
                      />
                    </div>
                    <div className="flex-[2]">
                      <Label>Etiket</Label>
                      <Input
                        value={stat.label}
                        onChange={(e) => {
                          const stats = [...design.stats];
                          stats[i] = { ...stats[i], label: e.target.value };
                          setDesign({ ...design, stats });
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setDesign({ ...design, stats: design.stats.filter((_, j) => j !== i) })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDesign({ ...design, stats: [...design.stats, { value: "", label: "" }] })}
                >
                  <Plus className="mr-1 h-4 w-4" /> Satır ekle
                </Button>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="banners">
              <AccordionTrigger className="px-4 font-semibold">Kampanya bannerları</AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-4">
                {design.banners.map((banner, i) => (
                  <div key={i} className="rounded border p-3 space-y-2">
                    <Input
                      placeholder="Başlık"
                      value={banner.title}
                      onChange={(e) => {
                        const banners = [...design.banners];
                        banners[i] = { ...banners[i], title: e.target.value };
                        setDesign({ ...design, banners });
                      }}
                    />
                    <Input
                      placeholder="Alt metin"
                      value={banner.subtitle}
                      onChange={(e) => {
                        const banners = [...design.banners];
                        banners[i] = { ...banners[i], subtitle: e.target.value };
                        setDesign({ ...design, banners });
                      }}
                    />
                    <Input
                      placeholder="Görsel URL"
                      value={banner.image}
                      onChange={(e) => {
                        const banners = [...design.banners];
                        banners[i] = { ...banners[i], image: e.target.value };
                        setDesign({ ...design, banners });
                      }}
                    />
                    <Input
                      placeholder="Bağlantı (örn. /yemek)"
                      value={banner.href ?? ""}
                      onChange={(e) => {
                        const banners = [...design.banners];
                        banners[i] = { ...banners[i], href: e.target.value };
                        setDesign({ ...design, banners });
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDesign({ ...design, banners: design.banners.filter((_, j) => j !== i) })}
                    >
                      <Trash2 className="mr-1 h-4 w-4" /> Kaldır
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDesign({
                      ...design,
                      banners: [...design.banners, { title: "", subtitle: "", image: "", href: "" }],
                    })
                  }
                >
                  <Plus className="mr-1 h-4 w-4" /> Banner ekle
                </Button>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="gallery">
              <AccordionTrigger className="px-4 font-semibold">Görsel galeri</AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Başlık</Label>
                    <Input
                      value={design.gallery.title}
                      onChange={(e) =>
                        setDesign({ ...design, gallery: { ...design.gallery, title: e.target.value } })
                      }
                    />
                  </div>
                  <div>
                    <Label>Alt başlık</Label>
                    <Input
                      value={design.gallery.subtitle}
                      onChange={(e) =>
                        setDesign({ ...design, gallery: { ...design.gallery, subtitle: e.target.value } })
                      }
                    />
                  </div>
                </div>
                {design.gallery.items.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      placeholder="Başlık"
                      value={item.title}
                      onChange={(e) => {
                        const items = [...design.gallery.items];
                        items[i] = { ...items[i], title: e.target.value };
                        setDesign({ ...design, gallery: { ...design.gallery, items } });
                      }}
                    />
                    <Input
                      placeholder="Görsel URL"
                      value={item.image}
                      onChange={(e) => {
                        const items = [...design.gallery.items];
                        items[i] = { ...items[i], image: e.target.value };
                        setDesign({ ...design, gallery: { ...design.gallery, items } });
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setDesign({
                          ...design,
                          gallery: {
                            ...design.gallery,
                            items: design.gallery.items.filter((_, j) => j !== i),
                          },
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDesign({
                      ...design,
                      gallery: {
                        ...design.gallery,
                        items: [...design.gallery.items, { title: "", image: "" }],
                      },
                    })
                  }
                >
                  <Plus className="mr-1 h-4 w-4" /> Kare ekle
                </Button>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq">
              <AccordionTrigger className="px-4 font-semibold">SSS</AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-4">
                <Input
                  value={design.faq.title}
                  onChange={(e) => setDesign({ ...design, faq: { ...design.faq, title: e.target.value } })}
                  placeholder="Bölüm başlığı"
                />
                {design.faq.tabs.map((tab, ti) => (
                  <div key={tab.id} className="rounded border p-3 space-y-2">
                    <p className="text-sm font-bold text-gray-700">{tab.label}</p>
                    {tab.items.map((item, qi) => (
                      <div key={qi} className="space-y-1 border-t pt-2">
                        <Input
                          value={item.q}
                          placeholder="Soru"
                          onChange={(e) => {
                            const tabs = [...design.faq.tabs];
                            const items = [...tabs[ti].items];
                            items[qi] = { ...items[qi], q: e.target.value };
                            tabs[ti] = { ...tabs[ti], items };
                            setDesign({ ...design, faq: { ...design.faq, tabs } });
                          }}
                        />
                        <Textarea
                          rows={2}
                          value={item.a}
                          placeholder="Cevap"
                          onChange={(e) => {
                            const tabs = [...design.faq.tabs];
                            const items = [...tabs[ti].items];
                            items[qi] = { ...items[qi], a: e.target.value };
                            tabs[ti] = { ...tabs[ti], items };
                            setDesign({ ...design, faq: { ...design.faq, tabs } });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border bg-white p-4">
            <h3 className="font-bold text-gray-800 mb-3">Bölüm sırası & görünürlük</h3>
            <ul className="space-y-2">
              {sectionOrder.map((id, i) => (
                <li key={id} className="flex items-center gap-2 rounded border px-2 py-2">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-800 disabled:opacity-30"
                      disabled={i === 0 || saving}
                      onClick={() => moveSection(i, -1)}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-800 disabled:opacity-30"
                      disabled={i === sectionOrder.length - 1 || saving}
                      onClick={() => moveSection(i, 1)}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="flex-1 text-sm font-medium text-gray-800">{LANDING_SECTION_LABELS[id]}</span>
                  <Switch
                    checked={design.sections[id]?.enabled !== false}
                    onCheckedChange={(checked) => toggleSection(id, checked)}
                    disabled={saving}
                  />
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border bg-emerald-50 p-4 text-sm text-gray-600">
            <p className="font-semibold text-gray-800 mb-1">Görsel notu</p>
            <p>
              Görseller için tam URL veya site kökünden yol girin (örn.{" "}
              <code className="text-xs">/vendor-themes/foodmart/…/banner-image-1.jpg</code>). Medya kütüphanesi
              seçici henüz bağlanmadı; URL alanı kullanılır.
            </p>
          </div>
        </aside>
      </div>
    </AdminLayout>
  );
}
