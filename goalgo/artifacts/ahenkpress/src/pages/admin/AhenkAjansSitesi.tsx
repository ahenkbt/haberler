import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useGetSiteSettings, useUpdateSiteSettings, getGetSiteSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  ahenkAgencyJsonFromSettings,
  defaultAhenkAgencySite,
  parseAhenkAgencySiteFromJson,
  serializeAhenkAgencySite,
  type AhenkAgencyOffice,
  type AhenkAgencyService,
  type AhenkAgencySite,
  type AhenkAgencySlide,
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
            Anasayfa, hizmetler, hakkımızda ve iletişim sayfaları bu kayıttan beslenir. Admin, YekTube ve
            HM editör siteleri etkilenmez.
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

      <Accordion type="multiple" defaultValue={["brand", "offices", "slides", "services"]} className="rounded-lg border bg-white">
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
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="about">
          <AccordionTrigger className="px-4">Hakkımızda ve CTA</AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3">
            <Field label="Hakkımızda başlığı">
              <Input value={site.aboutTitle} onChange={(e) => setSite({ ...site, aboutTitle: e.target.value })} />
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
                    onClick={() =>
                      setSite({ ...site, offices: site.offices.filter((_, j) => j !== i) })
                    }
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
                  offices: [
                    ...site.offices,
                    { id: `office-${Date.now()}`, country: "", flag: "📍", address: "" },
                  ],
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
            {site.slides.map((slide, i) => (
              <div key={slide.id} className="rounded-md border p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-semibold">Slayt {i + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSite({ ...site, slides: site.slides.filter((_, j) => j !== i) })}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <Input
                  value={slide.title}
                  onChange={(e) => patchSlide(site, setSite, i, { title: e.target.value })}
                  placeholder="Başlık"
                />
                <Textarea
                  rows={3}
                  value={slide.subtitle}
                  onChange={(e) => patchSlide(site, setSite, i, { subtitle: e.target.value })}
                  placeholder="Alt başlık"
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
                    placeholder="/hizmetler"
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
                  slides: [
                    ...site.slides,
                    {
                      id: `slide-${Date.now()}`,
                      title: "",
                      subtitle: "",
                      ctaLabel: "İncele",
                      ctaHref: "/hizmetler",
                    },
                  ],
                })
              }
            >
              <Plus className="w-4 h-4 mr-1" /> Slayt ekle
            </Button>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="services">
          <AccordionTrigger className="px-4">Hizmet sayfaları</AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-3">
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
