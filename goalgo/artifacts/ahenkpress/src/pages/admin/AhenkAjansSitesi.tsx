import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useGetSiteSettings, useUpdateSiteSettings, getGetSiteSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  ahenkAgencyJsonFromSettings,
  defaultAhenkAgencySite,
  defaultAhenkNavItems,
  parseAhenkAgencySiteFromJson,
  serializeAhenkAgencySite,
  type AhenkAgencyOffice,
  type AhenkAgencyService,
  type AhenkAgencySite,
  type AhenkAgencySlide,
  type AhenkContentCard,
  type AhenkNavItem,
} from "@/lib/ahenkAgencySite";

export default function AhenkAjansSitesi() {
  const { data: settings, isLoading } = useGetSiteSettings();
  const updateSettings = useUpdateSiteSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const initial = useMemo(
    () => parseAhenkAgencySiteFromJson(ahenkAgencyJsonFromSettings(settings)),
    [settings],
  );
  const [site, setSite] = useState<AhenkAgencySite>(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => setSite(initial), [initial]);

  const save = async (next: AhenkAgencySite) => {
    setSite(next);
    setSaving(true);
    try {
      await updateSettings.mutateAsync({
        data: {
          ahenkAgencyJson: serializeAhenkAgencySite(next),
        } as Parameters<typeof updateSettings.mutateAsync>[0]["data"],
      });
      await queryClient.invalidateQueries({ queryKey: getGetSiteSettingsQueryKey() });
      toast({ title: "Ajans sitesi kaydedildi" });
    } catch (e) {
      toast({
        title: "Kaydedilemedi",
        description: String((e as Error)?.message ?? e).slice(0, 240),
        variant: "destructive",
      });
      setSite(initial);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Ahenk Ajans Sitesi">
        <div className="py-16 text-center text-gray-500">Yükleniyor…</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Ahenk Ajans Sitesi">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Ahenk.net.tr ajans vitrini</h1>
          <p className="text-sm text-gray-500 mt-1">
            Anasayfa, yazılım, ajans, Haber Merkezi, Yekpare, hizmetler, hakkımızda ve iletişim bu kayıttan
            beslenir. Görsel alanlarına Unsplash veya https URL yapıştırın.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <a href="https://ahenk.net.tr/" target="_blank" rel="noreferrer">
              Canlı önizle
            </a>
          </Button>
          <Button variant="outline" onClick={() => void save(defaultAhenkAgencySite())} disabled={saving}>
            Varsayılana dön
          </Button>
          <Button className="bg-[#0e2444] hover:bg-[#081526] text-white" onClick={() => void save(site)} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            Kaydet
          </Button>
        </div>
      </div>

      <Accordion
        type="multiple"
        defaultValue={["nav", "brand", "seo", "hero", "software", "services"]}
        className="rounded-lg border bg-white"
      >
        <AccordionItem value="nav">
          <AccordionTrigger className="px-4">Üst menü</AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3">
            <p className="text-sm text-gray-500">
              Anasayfa, Hakkımızda, Ürünlerimiz, Hizmetlerimiz, İletişim — sıra, etiket ve bağlantı buradan değişir.
            </p>
            {site.navItems.map((item, i) => (
              <div key={item.id} className="rounded-md border p-3 grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                <Field label="Etiket">
                  <Input
                    value={item.label}
                    onChange={(e) =>
                      setSite({
                        ...site,
                        navItems: site.navItems.map((n, j) => (j === i ? { ...n, label: e.target.value } : n)),
                      })
                    }
                  />
                </Field>
                <Field label="Bağlantı">
                  <Input
                    value={item.href}
                    onChange={(e) =>
                      setSite({
                        ...site,
                        navItems: site.navItems.map((n, j) => (j === i ? { ...n, href: e.target.value } : n)),
                      })
                    }
                  />
                </Field>
                <div className="flex gap-1 pb-0.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={i === 0}
                    onClick={() => {
                      const next = [...site.navItems];
                      [next[i - 1], next[i]] = [next[i], next[i - 1]];
                      setSite({ ...site, navItems: next });
                    }}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={i === site.navItems.length - 1}
                    onClick={() => {
                      const next = [...site.navItems];
                      [next[i + 1], next[i]] = [next[i], next[i + 1]];
                      setSite({ ...site, navItems: next });
                    }}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setSite({ ...site, navItems: site.navItems.filter((_, j) => j !== i) })}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setSite({
                    ...site,
                    navItems: [
                      ...site.navItems,
                      { id: `nav-${Date.now()}`, label: "Yeni", href: "/" } satisfies AhenkNavItem,
                    ],
                  })
                }
              >
                <Plus className="w-4 h-4 mr-1" />
                Madde ekle
              </Button>
              <Button type="button" variant="ghost" onClick={() => setSite({ ...site, navItems: defaultAhenkNavItems() })}>
                Varsayılan menü
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="brand">
          <AccordionTrigger className="px-4">Marka ve iletişim</AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3">
            <Field label="Marka adı">
              <Input value={site.brandName} onChange={(e) => setSite({ ...site, brandName: e.target.value })} />
            </Field>
            <Field label="Slogan">
              <Input value={site.tagline} onChange={(e) => setSite({ ...site, tagline: e.target.value })} />
            </Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="GSM">
                <Input value={site.phone} onChange={(e) => setSite({ ...site, phone: e.target.value })} />
              </Field>
              <Field label="tel: bağlantısı">
                <Input value={site.phoneTel} onChange={(e) => setSite({ ...site, phoneTel: e.target.value })} />
              </Field>
            </div>
            <Field label="E-posta">
              <Input value={site.email} onChange={(e) => setSite({ ...site, email: e.target.value })} />
            </Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Hafta içi saat">
                <Input value={site.hoursWeekday} onChange={(e) => setSite({ ...site, hoursWeekday: e.target.value })} />
              </Field>
              <Field label="Pazar">
                <Input value={site.hoursSunday} onChange={(e) => setSite({ ...site, hoursSunday: e.target.value })} />
              </Field>
            </div>
            <Field label="WhatsApp tel">
              <Input
                value={site.whatsappTel}
                onChange={(e) => setSite({ ...site, whatsappTel: e.target.value })}
                placeholder="+905413136245"
              />
            </Field>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="seo">
          <AccordionTrigger className="px-4">SEO, fiyat, IBAN, SSS</AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3">
            <Field label="SEO başlık">
              <Input value={site.seoTitle} onChange={(e) => setSite({ ...site, seoTitle: e.target.value })} />
            </Field>
            <Field label="SEO açıklama">
              <Textarea
                rows={3}
                value={site.seoDescription}
                onChange={(e) => setSite({ ...site, seoDescription: e.target.value })}
              />
            </Field>
            <Field label="Anahtar kelimeler">
              <Textarea
                rows={2}
                value={site.seoKeywords}
                onChange={(e) => setSite({ ...site, seoKeywords: e.target.value })}
              />
            </Field>
            <Field label="Yapay zeka teslim cümlesi">
              <Input value={site.aiDeliveryLead} onChange={(e) => setSite({ ...site, aiDeliveryLead: e.target.value })} />
            </Field>
            <Field label="Fiyat başlığı">
              <Input value={site.priceTitle} onChange={(e) => setSite({ ...site, priceTitle: e.target.value })} />
            </Field>
            <div className="grid sm:grid-cols-3 gap-2">
              <Input
                value={site.priceAmount}
                onChange={(e) => setSite({ ...site, priceAmount: e.target.value })}
                placeholder="10000"
              />
              <Input
                value={site.priceCurrency}
                onChange={(e) => setSite({ ...site, priceCurrency: e.target.value })}
                placeholder="TRY"
              />
              <Input
                value={site.pricePeriodNote}
                onChange={(e) => setSite({ ...site, pricePeriodNote: e.target.value })}
                placeholder="3 günde teslim · 10.000 TL"
                className="sm:col-span-3"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              <Input
                value={site.ibanBank}
                onChange={(e) => setSite({ ...site, ibanBank: e.target.value })}
                placeholder="Banka"
              />
              <Input
                value={site.ibanHolder}
                onChange={(e) => setSite({ ...site, ibanHolder: e.target.value })}
                placeholder="Hesap adı"
              />
              <Input
                value={site.iban}
                onChange={(e) => setSite({ ...site, iban: e.target.value })}
                placeholder="TR..."
                className="sm:col-span-2"
              />
            </div>
            {site.faqs.map((faq, i) => (
              <div key={i} className="rounded-md border p-3 space-y-2">
                <Input
                  value={faq.q}
                  onChange={(e) =>
                    setSite({
                      ...site,
                      faqs: site.faqs.map((f, j) => (j === i ? { ...f, q: e.target.value } : f)),
                    })
                  }
                  placeholder="Soru"
                />
                <Textarea
                  rows={3}
                  value={faq.a}
                  onChange={(e) =>
                    setSite({
                      ...site,
                      faqs: site.faqs.map((f, j) => (j === i ? { ...f, a: e.target.value } : f)),
                    })
                  }
                  placeholder="Yanıt"
                />
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="hero">
          <AccordionTrigger className="px-4">Anasayfa kahraman görseli</AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3">
            <Field label="Üst kicker">
              <Input value={site.heroKicker} onChange={(e) => setSite({ ...site, heroKicker: e.target.value })} />
            </Field>
            <Field label="Başlık">
              <Input value={site.heroTitle} onChange={(e) => setSite({ ...site, heroTitle: e.target.value })} />
            </Field>
            <Field label="Alt metin">
              <Textarea rows={3} value={site.heroSubtitle} onChange={(e) => setSite({ ...site, heroSubtitle: e.target.value })} />
            </Field>
            <Field label="Kahraman görsel URL">
              <Input
                value={site.heroImage}
                onChange={(e) => setSite({ ...site, heroImage: e.target.value })}
                placeholder="https://images.unsplash.com/..."
              />
            </Field>
            {site.heroImage ? (
              <img src={site.heroImage} alt="" className="h-28 w-full max-w-md rounded object-cover" />
            ) : null}
            <div className="grid sm:grid-cols-2 gap-2">
              <Input
                value={site.heroCtaLabel}
                onChange={(e) => setSite({ ...site, heroCtaLabel: e.target.value })}
                placeholder="Birincil buton"
              />
              <Input
                value={site.heroCtaHref}
                onChange={(e) => setSite({ ...site, heroCtaHref: e.target.value })}
                placeholder="/yazilim"
              />
              <Input
                value={site.heroSecondaryLabel}
                onChange={(e) => setSite({ ...site, heroSecondaryLabel: e.target.value })}
                placeholder="İkincil buton"
              />
              <Input
                value={site.heroSecondaryHref}
                onChange={(e) => setSite({ ...site, heroSecondaryHref: e.target.value })}
                placeholder="/ajans"
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="software">
          <AccordionTrigger className="px-4">Yazılım dikeyleri (görselli kartlar)</AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3">
            <Field label="Bölüm başlığı">
              <Input value={site.softwareTitle} onChange={(e) => setSite({ ...site, softwareTitle: e.target.value })} />
            </Field>
            <Field label="Bölüm metni">
              <Textarea rows={2} value={site.softwareLead} onChange={(e) => setSite({ ...site, softwareLead: e.target.value })} />
            </Field>
            <CardList
              items={site.softwareSectors}
              onChange={(softwareSectors) => setSite({ ...site, softwareSectors })}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="agency">
          <AccordionTrigger className="px-4">Ajans stüdyosu</AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3">
            <Field label="Bölüm başlığı">
              <Input value={site.agencyTitle} onChange={(e) => setSite({ ...site, agencyTitle: e.target.value })} />
            </Field>
            <Field label="Bölüm metni">
              <Textarea rows={2} value={site.agencyLead} onChange={(e) => setSite({ ...site, agencyLead: e.target.value })} />
            </Field>
            <CardList items={site.agencyOffers} onChange={(agencyOffers) => setSite({ ...site, agencyOffers })} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="yekpare">
          <AccordionTrigger className="px-4">Yekpare.net</AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3">
            <div className="grid sm:grid-cols-2 gap-2">
              <Input
                value={site.yekpare.kicker}
                onChange={(e) => setSite({ ...site, yekpare: { ...site.yekpare, kicker: e.target.value } })}
                placeholder="Kicker"
              />
              <Input
                value={site.yekpare.title}
                onChange={(e) => setSite({ ...site, yekpare: { ...site.yekpare, title: e.target.value } })}
                placeholder="Başlık"
              />
            </div>
            <Textarea
              rows={3}
              value={site.yekpare.text}
              onChange={(e) => setSite({ ...site, yekpare: { ...site.yekpare, text: e.target.value } })}
            />
            <Field label="Görsel URL">
              <Input
                value={site.yekpare.image ?? ""}
                onChange={(e) => setSite({ ...site, yekpare: { ...site.yekpare, image: e.target.value } })}
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-2">
              <Input
                value={site.yekpare.ctaLabel}
                onChange={(e) => setSite({ ...site, yekpare: { ...site.yekpare, ctaLabel: e.target.value } })}
              />
              <Input
                value={site.yekpare.ctaHref}
                onChange={(e) => setSite({ ...site, yekpare: { ...site.yekpare, ctaHref: e.target.value } })}
              />
              <Input
                value={site.yekpare.secondaryLabel}
                onChange={(e) => setSite({ ...site, yekpare: { ...site.yekpare, secondaryLabel: e.target.value } })}
              />
              <Input
                value={site.yekpare.secondaryHref}
                onChange={(e) => setSite({ ...site, yekpare: { ...site.yekpare, secondaryHref: e.target.value } })}
              />
            </div>
            <Field label="Yekpare sayfa başlığı">
              <Input
                value={site.yekparePageTitle}
                onChange={(e) => setSite({ ...site, yekparePageTitle: e.target.value })}
              />
            </Field>
            <Field label="Yekpare sayfa HTML">
              <Textarea
                rows={6}
                className="font-mono text-xs"
                value={site.yekparePageHtml}
                onChange={(e) => setSite({ ...site, yekparePageHtml: e.target.value })}
              />
            </Field>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="platform">
          <AccordionTrigger className="px-4">Haber Merkezi ürünleri</AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3">
            <Field label="Anasayfa bölüm başlığı">
              <Input value={site.platformTitle} onChange={(e) => setSite({ ...site, platformTitle: e.target.value })} />
            </Field>
            <Field label="Anasayfa bölüm metni">
              <Textarea rows={2} value={site.platformLead} onChange={(e) => setSite({ ...site, platformLead: e.target.value })} />
            </Field>
            <Field label="Haber Merkezi sayfa başlığı">
              <Input
                value={site.haberMerkeziTitle}
                onChange={(e) => setSite({ ...site, haberMerkeziTitle: e.target.value })}
              />
            </Field>
            <Field label="Haber Merkezi özet">
              <Textarea
                rows={2}
                value={site.haberMerkeziLead}
                onChange={(e) => setSite({ ...site, haberMerkeziLead: e.target.value })}
              />
            </Field>
            <Field label="Haber Merkezi HTML">
              <Textarea
                rows={5}
                className="font-mono text-xs"
                value={site.haberMerkeziHtml}
                onChange={(e) => setSite({ ...site, haberMerkeziHtml: e.target.value })}
              />
            </Field>
            <CardList
              items={site.platformProducts}
              onChange={(platformProducts) => setSite({ ...site, platformProducts })}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="about">
          <AccordionTrigger className="px-4">Hakkımızda ve CTA</AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3">
            <Field label="Hakkımızda başlığı">
              <Input value={site.aboutTitle} onChange={(e) => setSite({ ...site, aboutTitle: e.target.value })} />
            </Field>
            <Field label="Hakkımızda görsel URL">
              <Input value={site.aboutImage} onChange={(e) => setSite({ ...site, aboutImage: e.target.value })} />
            </Field>
            <Field label="Hakkımızda HTML">
              <Textarea rows={8} value={site.aboutHtml} onChange={(e) => setSite({ ...site, aboutHtml: e.target.value })} />
            </Field>
            <Field label="CTA başlığı">
              <Input value={site.ctaTitle} onChange={(e) => setSite({ ...site, ctaTitle: e.target.value })} />
            </Field>
            <Field label="CTA metni">
              <Textarea rows={3} value={site.ctaText} onChange={(e) => setSite({ ...site, ctaText: e.target.value })} />
            </Field>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="offices">
          <AccordionTrigger className="px-4">Ofisler</AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3">
            {site.offices.map((office, i) => (
              <div key={office.id} className="rounded-md border p-3 space-y-2">
                <div className="flex justify-between gap-2">
                  <span className="text-sm font-semibold">{office.country || "Ofis"}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSite({ ...site, offices: site.offices.filter((_, j) => j !== i) })}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid sm:grid-cols-3 gap-2">
                  <Input
                    value={office.flag}
                    onChange={(e) => patchOffice(site, setSite, i, { flag: e.target.value })}
                    placeholder="Bayrak"
                  />
                  <Input
                    value={office.country}
                    onChange={(e) => patchOffice(site, setSite, i, { country: e.target.value })}
                    placeholder="Ülke"
                  />
                  <Input
                    value={office.address}
                    onChange={(e) => patchOffice(site, setSite, i, { address: e.target.value })}
                    placeholder="Adres"
                    className="sm:col-span-3"
                  />
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setSite({
                  ...site,
                  offices: [...site.offices, { id: `office-${Date.now()}`, country: "", flag: "📍", address: "" }],
                })
              }
            >
              <Plus className="w-4 h-4 mr-1" /> Ofis ekle
            </Button>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="slides">
          <AccordionTrigger className="px-4">Anasayfa slaytları</AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Ürünlerimiz, Hizmetlerimiz ve Hakkımızda — sıra, başlık, görsel ve buton buradan değişir.
            </p>
            {site.slides.map((slide, i) => (
              <div key={slide.id} className="rounded-md border p-3 space-y-2">
                <div className="flex justify-between gap-2 items-center">
                  <span className="text-sm font-semibold">Slayt {i + 1}</span>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={i === 0}
                      onClick={() => {
                        const next = [...site.slides];
                        const [item] = next.splice(i, 1);
                        next.splice(i - 1, 0, item!);
                        setSite({ ...site, slides: next });
                      }}
                    >
                      Yukarı
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={i === site.slides.length - 1}
                      onClick={() => {
                        const next = [...site.slides];
                        const [item] = next.splice(i, 1);
                        next.splice(i + 1, 0, item!);
                        setSite({ ...site, slides: next });
                      }}
                    >
                      Aşağı
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSite({ ...site, slides: site.slides.filter((_, j) => j !== i) })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <Input
                  value={slide.title}
                  onChange={(e) => patchSlide(site, setSite, i, { title: e.target.value })}
                  placeholder="Başlık (Ürünlerimiz / Hizmetlerimiz / Hakkımızda)"
                />
                <Textarea
                  rows={3}
                  value={slide.subtitle}
                  onChange={(e) => patchSlide(site, setSite, i, { subtitle: e.target.value })}
                  placeholder="Açıklama"
                />
                <Input
                  value={slide.image ?? ""}
                  onChange={(e) => patchSlide(site, setSite, i, { image: e.target.value })}
                  placeholder="Görsel URL"
                />
                <div className="grid sm:grid-cols-2 gap-2">
                  <Input
                    value={slide.ctaLabel}
                    onChange={(e) => patchSlide(site, setSite, i, { ctaLabel: e.target.value })}
                    placeholder="Buton yazısı"
                  />
                  <Input
                    value={slide.ctaHref}
                    onChange={(e) => patchSlide(site, setSite, i, { ctaHref: e.target.value })}
                    placeholder="/urunlerimiz"
                  />
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setSite({
                    ...site,
                    slides: [
                      ...site.slides,
                      {
                        id: `slide-${Date.now()}`,
                        title: "",
                        subtitle: "",
                        ctaLabel: "İncele",
                        ctaHref: "/urunlerimiz",
                        image: "",
                      },
                    ],
                  })
                }
              >
                <Plus className="w-4 h-4 mr-1" /> Slayt ekle
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSite({ ...site, slides: defaultAhenkAgencySite().slides })}
              >
                Varsayılan 3 slayt
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="services">
          <AccordionTrigger className="px-4">Hizmetler (görselli operasyon sayfaları)</AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3">
            <Field label="Hizmetler başlığı">
              <Input value={site.servicesTitle} onChange={(e) => setSite({ ...site, servicesTitle: e.target.value })} />
            </Field>
            <Field label="Hizmetler özeti">
              <Textarea
                rows={2}
                value={site.servicesLead}
                onChange={(e) => setSite({ ...site, servicesLead: e.target.value })}
              />
            </Field>
            <Field label="Hizmetler kapak görseli">
              <Input
                value={site.servicesHeroImage}
                onChange={(e) => setSite({ ...site, servicesHeroImage: e.target.value })}
              />
            </Field>
            {site.services.map((svc, i) => (
              <div key={svc.slug + i} className="rounded-md border p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-semibold">{svc.title || svc.slug}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSite({ ...site, services: site.services.filter((_, j) => j !== i) })}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                {svc.image ? (
                  <img src={svc.image} alt="" className="h-24 w-full rounded object-cover" />
                ) : null}
                <div className="grid sm:grid-cols-2 gap-2">
                  <Input
                    value={svc.title}
                    onChange={(e) => patchService(site, setSite, i, { title: e.target.value })}
                    placeholder="Başlık"
                  />
                  <Input
                    value={svc.slug}
                    onChange={(e) => patchService(site, setSite, i, { slug: e.target.value })}
                    placeholder="slug"
                  />
                </div>
                <Input
                  value={svc.excerpt}
                  onChange={(e) => patchService(site, setSite, i, { excerpt: e.target.value })}
                  placeholder="Kısa özet"
                />
                <Input
                  value={svc.image ?? ""}
                  onChange={(e) => patchService(site, setSite, i, { image: e.target.value })}
                  placeholder="Görsel URL"
                />
                <Input
                  value={svc.icon}
                  onChange={(e) => patchService(site, setSite, i, { icon: e.target.value })}
                  placeholder="icon: headphones, camera, phone, cart, sparkle, pen, users, qr, building"
                />
                <Textarea
                  rows={8}
                  className="font-mono text-xs"
                  value={svc.bodyHtml}
                  onChange={(e) => patchService(site, setSite, i, { bodyHtml: e.target.value })}
                  placeholder="Sayfa HTML"
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setSite({
                  ...site,
                  services: [
                    ...site.services,
                    {
                      slug: `hizmet-${Date.now()}`,
                      title: "Yeni hizmet",
                      excerpt: "",
                      icon: "sparkle",
                      bodyHtml: "<p></p>",
                      image: "",
                    },
                  ],
                })
              }
            >
              <Plus className="w-4 h-4 mr-1" /> Hizmet ekle
            </Button>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </AdminLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function CardList({
  items,
  onChange,
}: {
  items: AhenkContentCard[];
  onChange: (next: AhenkContentCard[]) => void;
}) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={item.slug + i} className="rounded-md border p-3 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-semibold">{item.title || item.slug}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          {item.image ? <img src={item.image} alt="" className="h-24 w-full rounded object-cover" /> : null}
          <div className="grid sm:grid-cols-2 gap-2">
            <Input
              value={item.title}
              onChange={(e) => onChange(items.map((c, j) => (j === i ? { ...c, title: e.target.value } : c)))}
              placeholder="Başlık"
            />
            <Input
              value={item.slug}
              onChange={(e) => onChange(items.map((c, j) => (j === i ? { ...c, slug: e.target.value } : c)))}
              placeholder="slug"
            />
          </div>
          <Input
            value={item.excerpt}
            onChange={(e) => onChange(items.map((c, j) => (j === i ? { ...c, excerpt: e.target.value } : c)))}
            placeholder="Özet"
          />
          <Textarea
            rows={4}
            value={(item.features ?? []).join("\n")}
            onChange={(e) =>
              onChange(
                items.map((c, j) =>
                  j === i
                    ? {
                        ...c,
                        features: e.target.value
                          .split("\n")
                          .map((line) => line.trim())
                          .filter(Boolean),
                      }
                    : c,
                ),
              )
            }
            placeholder="Sektör modülleri (her satır bir özellik: QR menü, POS, online randevu…)"
          />
          <Input
            value={item.image ?? ""}
            onChange={(e) => onChange(items.map((c, j) => (j === i ? { ...c, image: e.target.value } : c)))}
            placeholder="Görsel URL"
          />
          <div className="grid sm:grid-cols-2 gap-2">
            <Input
              value={item.icon}
              onChange={(e) => onChange(items.map((c, j) => (j === i ? { ...c, icon: e.target.value } : c)))}
              placeholder="icon"
            />
            <Input
              value={item.href}
              onChange={(e) => onChange(items.map((c, j) => (j === i ? { ...c, href: e.target.value } : c)))}
              placeholder="/yazilim/..."
            />
          </div>
          <Textarea
            rows={5}
            className="font-mono text-xs"
            value={item.bodyHtml}
            onChange={(e) => onChange(items.map((c, j) => (j === i ? { ...c, bodyHtml: e.target.value } : c)))}
            placeholder="Sayfa HTML"
          />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange([
            ...items,
            {
              slug: `kart-${Date.now()}`,
              title: "Yeni kart",
              excerpt: "",
              icon: "sparkle",
              href: "/",
              bodyHtml: "<p></p>",
              image: "",
              features: [],
            },
          ])
        }
      >
        <Plus className="w-4 h-4 mr-1" /> Kart ekle
      </Button>
    </div>
  );
}

function patchOffice(
  site: AhenkAgencySite,
  setSite: (s: AhenkAgencySite) => void,
  i: number,
  patch: Partial<AhenkAgencyOffice>,
) {
  setSite({
    ...site,
    offices: site.offices.map((o, j) => (j === i ? { ...o, ...patch } : o)),
  });
}

function patchSlide(
  site: AhenkAgencySite,
  setSite: (s: AhenkAgencySite) => void,
  i: number,
  patch: Partial<AhenkAgencySlide>,
) {
  setSite({
    ...site,
    slides: site.slides.map((o, j) => (j === i ? { ...o, ...patch } : o)),
  });
}

function patchService(
  site: AhenkAgencySite,
  setSite: (s: AhenkAgencySite) => void,
  i: number,
  patch: Partial<AhenkAgencyService>,
) {
  setSite({
    ...site,
    services: site.services.map((o, j) => (j === i ? { ...o, ...patch } : o)),
  });
}
