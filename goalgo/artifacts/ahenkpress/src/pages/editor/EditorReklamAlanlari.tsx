import { useEffect, useMemo, useRef, useState } from "react";
import { EditorLayout } from "@/components/EditorLayout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useHmEditor } from "@/contexts/HmEditorContext";
import { useToast } from "@/hooks/use-toast";
import type { NewsSiteLayoutPrefs, HmAdSlotState } from "@/lib/newsSiteLayout";
import {
  HM_EDITOR_AD_SLOT_DEFS,
  mergeHmAdSlots,
  buildHmAdSlotImageHtml,
  normalizeHmAdSlotsForSave,
  isPhpAdSlotKey,
} from "@/lib/hmEditorAdSlots";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { uploadYekpareMediaFile } from "@/lib/yekpareMediaLibrary";
import { Code2, Image as ImageIcon, Loader2, Megaphone, Upload } from "lucide-react";

/** Varsayılan reklam iletişim adresi: bilgi@<domain>, alt alan adı sitelerde <alt>@<üst> (ör. kibris@gundemi.org). */
function conventionalAdEmail(domain: string | null | undefined): string {
  const h = String(domain ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
  if (!h || !h.includes(".")) return "";
  const parts = h.split(".");
  const multi = /^(com|net|org|gen|gov|edu|k12|bel|av|biz|info|web|tv)\.tr$/;
  const regLen = parts.length > 2 && multi.test(parts.slice(-2).join(".")) ? 3 : 2;
  if (parts.length <= regLen) return `bilgi@${h}`;
  return `${parts.slice(0, -regLen).join(".")}@${parts.slice(-regLen).join(".")}`;
}

export default function EditorReklamAlanlari() {
  const { newsLayoutPrefs, saveNewsSiteLayout, site } = useHmEditor();
  const [house, setHouse] = useState<boolean>(newsLayoutPrefs.hmNewsAdHouse !== false);
  const [adEmail, setAdEmail] = useState<string>(String(newsLayoutPrefs.hmNewsAdContact?.email ?? ""));
  const [adPhone, setAdPhone] = useState<string>(String(newsLayoutPrefs.hmNewsAdContact?.phone ?? ""));
  const defaultAdEmail = conventionalAdEmail(site?.domain);
  const { toast } = useToast();
  const [p, setP] = useState<NewsSiteLayoutPrefs>(newsLayoutPrefs);
  const [slots, setSlots] = useState<HmAdSlotState[]>(() => mergeHmAdSlots(newsLayoutPrefs.hmAdSlots));
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingUploadSlotKey, setPendingUploadSlotKey] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  useEffect(() => {
    setP(newsLayoutPrefs);
    setSlots(mergeHmAdSlots(newsLayoutPrefs.hmAdSlots));
    setHouse(newsLayoutPrefs.hmNewsAdHouse !== false);
    setAdEmail(String(newsLayoutPrefs.hmNewsAdContact?.email ?? ""));
    setAdPhone(String(newsLayoutPrefs.hmNewsAdContact?.phone ?? ""));
  }, [newsLayoutPrefs]);

  const metaByKey = useMemo(() => new Map(HM_EDITOR_AD_SLOT_DEFS.map((d) => [d.slotKey, d])), []);

  const saveAll = async () => {
    setSaving(true);
    const hmAdSlots = normalizeHmAdSlotsForSave(slots);
    const next: NewsSiteLayoutPrefs = { ...p, hmAdSlots };
    setP(next);
    setSlots(hmAdSlots);
    const email = adEmail.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSaving(false);
      toast({ title: "E-posta adresi geçersiz", variant: "destructive" });
      return;
    }
    const phone = adPhone.trim().slice(0, 40);
    const hmNewsAdContact = email || phone ? { email: email || null, phone: phone || null } : null;
    const result = await saveNewsSiteLayout(newsLayoutPrefs, {
      layoutPatch: { hmAdSlots, hmNewsAdContact, hmNewsAdHouse: house },
    });
    setSaving(false);
    if (!result.ok) {
      toast({
        title: "Kaydedilemedi",
        description: result.error?.slice(0, 220) || "Sunucu yanıtı alınamadı.",
        variant: "destructive",
      });
      setP(newsLayoutPrefs);
      setSlots(mergeHmAdSlots(newsLayoutPrefs.hmAdSlots));
    } else {
      toast({ title: "Reklam alanları kaydedildi" });
    }
  };

  const pickUploadFile = (slotKey: string) => {
    setPendingUploadSlotKey(slotKey);
    fileRef.current?.click();
  };

  const onUploadFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const slotKey = pendingUploadSlotKey;
    e.target.value = "";
    setPendingUploadSlotKey(null);
    if (!file || !slotKey) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Yalnızca görsel dosyası seçin", variant: "destructive" });
      return;
    }
    setUploadingKey(slotKey);
    try {
      const { url } = await uploadYekpareMediaFile(file);
      setSlots((prev) =>
        prev.map((s) => {
          if (s.slotKey !== slotKey) return s;
          return {
            ...s,
            contentMode: "image",
            imageMediaUrl: url,
            html: buildHmAdSlotImageHtml(url, s.imageClickUrl),
          };
        }),
      );
      toast({ title: "Görsel yüklendi" });
    } catch (err) {
      toast({
        title: "Yüklenemedi",
        description: err instanceof Error ? err.message.slice(0, 160) : String(err),
        variant: "destructive",
      });
    } finally {
      setUploadingKey(null);
    }
  };

  return (
    <EditorLayout title="Reklam alanları">
      <div className="max-w-4xl space-y-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={(ev) => void onUploadFileChange(ev)}
        />

        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-sm text-slate-600 max-w-2xl">
            Sitenizdeki reklam alanlarını buradan yönetin. Her alan için <strong>Resim yükle</strong> (görsel + tıklama
            adresi) ya da <strong>HTML veya kod</strong> (reklam ağı kodu) seçip <strong>Aktif</strong> yapın. Kayıttan
            sonra birkaç saniye içinde siteye yansır. Boş alanlarda «Bu alana reklam verin» ilanı görünür.
          </p>
          <Button type="button" className="bg-red-600 hover:bg-red-700 text-white shrink-0" disabled={saving} onClick={() => void saveAll()}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Tümünü kaydet
          </Button>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <Megaphone className="mt-0.5 h-4 w-4 text-red-600" />
              <div>
                <p className="font-bold text-slate-900">«Bu alana reklam verin» ilanı</p>
                <p className="text-xs text-slate-500">
                  Reklam konmamış alanlarda sitenin kendi reklam ilanı görünür. Kapatırsanız boş alanlar hiç yer kaplamaz.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{house ? "Açık" : "Kapalı"}</span>
              <Switch checked={house} disabled={saving} onCheckedChange={(c) => setHouse(!!c)} aria-label="Reklam ilanı açık" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700">Reklam için e-posta</Label>
              <Input
                type="email"
                value={adEmail}
                disabled={saving}
                placeholder={defaultAdEmail ? `Boş bırakılırsa: ${defaultAdEmail}` : "reklam@siteniz.com"}
                onChange={(e) => setAdEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-700">Reklam için telefon (isteğe bağlı)</Label>
              <Input value={adPhone} disabled={saving} placeholder="0 5xx xxx xx xx" onChange={(e) => setAdPhone(e.target.value)} />
            </div>
          </div>
        </section>

        <p className="text-sm font-bold text-slate-900">Sitede görünen reklam alanları</p>
        <Accordion type="multiple" className="w-full space-y-3">
          {slots.filter((slot) => isPhpAdSlotKey(slot.slotKey)).map((slot) => renderSlot(slot))}
        </Accordion>
        <details className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">
            Eski tema alanları (yeni haber temasında görünmez)
          </summary>
          <Accordion type="multiple" className="mt-3 w-full space-y-3">
            {slots.filter((slot) => !isPhpAdSlotKey(slot.slotKey)).map((slot) => renderSlot(slot))}
          </Accordion>
        </details>
      </div>
    </EditorLayout>
  );

  function renderSlot(slot: HmAdSlotState) {
            const meta = metaByKey.get(slot.slotKey) ?? { slotKey: slot.slotKey, name: slot.slotKey, description: "" };
            const tabValue = slot.contentMode === "image" ? "image" : "html";
            return (
              <AccordionItem key={slot.slotKey} value={slot.slotKey} className="border rounded-lg px-3 bg-white">
                <AccordionTrigger className="text-left hover:no-underline py-3">
                  <div className="flex flex-1 flex-wrap items-center justify-between gap-3 pr-2">
                    <div>
                      <span className="font-bold text-slate-900">{meta?.name ?? slot.slotKey}</span>
                      <span className="block text-xs text-slate-500 mt-0.5">{meta?.description}</span>
                      {meta?.themePlacements?.length ? (
                        <ul className="mt-1.5 list-disc pl-4 text-[11px] text-slate-600">
                          {meta.themePlacements.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <span className="text-xs text-slate-500">Aktif</span>
                      <Switch
                        checked={slot.enabled}
                        disabled={saving}
                        onCheckedChange={(c) =>
                          setSlots((prev) => prev.map((s) => (s.slotKey === slot.slotKey ? { ...s, enabled: !!c } : s)))
                        }
                      />
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 space-y-3">
                  <Tabs
                    value={tabValue}
                    onValueChange={(v) => {
                      const mode = v === "image" ? "image" : "html";
                      setSlots((prev) =>
                        prev.map((s) => {
                          if (s.slotKey !== slot.slotKey) return s;
                          if (mode === "image") {
                            const url = s.imageMediaUrl?.trim();
                            return {
                              ...s,
                              contentMode: "image",
                              html: url ? buildHmAdSlotImageHtml(url, s.imageClickUrl) : s.html,
                            };
                          }
                          return { ...s, contentMode: "html" };
                        }),
                      );
                    }}
                  >
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                      <TabsTrigger value="html" className="gap-1.5 text-xs sm:text-sm">
                        <Code2 className="w-3.5 h-3.5 shrink-0" />
                        HTML veya kod
                      </TabsTrigger>
                      <TabsTrigger value="image" className="gap-1.5 text-xs sm:text-sm">
                        <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                        Resim yükle
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="html" className="mt-3 space-y-2">
                      <p className="text-xs text-slate-500">
                        Tam sayfa <code className="bg-slate-100 px-1 rounded">&lt;html&gt;</code> yapıştırmayın; global{" "}
                        <code className="bg-slate-100 px-1">&lt;style&gt;</code> site düzenini bozabilir.
                      </p>
                      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded px-2 py-1.5">
                        Tıklanabilir görsel için <code className="text-[10px]">&lt;a href=&quot;…&quot;&gt;&lt;img …&gt;&lt;/a&gt;</code>{" "}
                        çiftini birlikte kullanın. Sadece <code className="text-[10px]">&lt;/a&gt;</code> kalmışsa kayıtta
                        otomatik temizlenir.
                      </p>
                      <Textarea
                        className="font-mono text-xs min-h-[120px]"
                        placeholder="HTML veya reklam kodu…"
                        value={slot.html ?? ""}
                        disabled={saving}
                        onChange={(e) =>
                          setSlots((prev) =>
                            prev.map((s) =>
                              s.slotKey === slot.slotKey ? { ...s, html: e.target.value, contentMode: "html" } : s,
                            ),
                          )
                        }
                      />
                    </TabsContent>
                    <TabsContent value="image" className="mt-3 space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-700">Tıklanınca gidecek adres (isteğe bağlı)</Label>
                        <Input
                          className="font-mono text-xs"
                          placeholder="https://örnek.com/kampanya"
                          value={slot.imageClickUrl ?? ""}
                          disabled={saving}
                          onChange={(e) => {
                            const v = e.target.value;
                            setSlots((prev) =>
                              prev.map((s) => {
                                if (s.slotKey !== slot.slotKey) return s;
                                const click = v.trim() || null;
                                if (s.contentMode === "image" && s.imageMediaUrl?.trim()) {
                                  return {
                                    ...s,
                                    imageClickUrl: click,
                                    html: buildHmAdSlotImageHtml(s.imageMediaUrl.trim(), click),
                                  };
                                }
                                return { ...s, imageClickUrl: click };
                              }),
                            );
                          }}
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          disabled={saving || uploadingKey === slot.slotKey}
                          onClick={() => pickUploadFile(slot.slotKey)}
                        >
                          {uploadingKey === slot.slotKey ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                          Görsel seç ve yükle
                        </Button>
                        {slot.imageMediaUrl ? (
                          <span className="text-[11px] text-slate-500 truncate max-w-[min(100%,220px)]">{slot.imageMediaUrl}</span>
                        ) : null}
                      </div>
                      {slot.imageMediaUrl ? (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex justify-center">
                          <img
                            src={resolveClientMediaSrc(slot.imageMediaUrl) || slot.imageMediaUrl}
                            alt=""
                            className="max-h-44 max-w-full object-contain"
                          />
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">
                          JPEG, PNG, GIF veya WebP. Kaydedince vitrine uygun, ortalanmış banner HTML’i oluşturulur.
                        </p>
                      )}
                    </TabsContent>
                  </Tabs>
                </AccordionContent>
              </AccordionItem>
            );
  }
}
