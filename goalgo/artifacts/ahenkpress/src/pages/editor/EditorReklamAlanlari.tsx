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
} from "@/lib/hmEditorAdSlots";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { uploadYekpareMediaFile } from "@/lib/yekpareMediaLibrary";
import { Code2, Image as ImageIcon, Loader2, Upload } from "lucide-react";

export default function EditorReklamAlanlari() {
  const { newsLayoutPrefs, saveNewsSiteLayout } = useHmEditor();
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
  }, [newsLayoutPrefs]);

  const metaByKey = useMemo(() => new Map(HM_EDITOR_AD_SLOT_DEFS.map((d) => [d.slotKey, d])), []);

  const saveAll = async () => {
    setSaving(true);
    const hmAdSlots = normalizeHmAdSlotsForSave(slots);
    const next: NewsSiteLayoutPrefs = { ...p, hmAdSlots };
    setP(next);
    setSlots(hmAdSlots);
    const result = await saveNewsSiteLayout(newsLayoutPrefs, { layoutPatch: { hmAdSlots } });
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
            Yekpare yönetimindeki <strong>Reklam Alanları</strong> ile aynı slot isimleri; yalnızca{" "}
            <strong>bu haber merkezi</strong> vitrininde kullanılır. Boş slotlarda genel portal reklamı (varsa)
            kalır. <strong>Resim yükle</strong> ile güvenli banner HTML’i oluşturabilir veya{" "}
            <strong>HTML veya kod</strong> ile üçüncü taraf script / özel HTML yapıştırabilirsiniz.
          </p>
          <Button type="button" className="bg-red-600 hover:bg-red-700 text-white shrink-0" disabled={saving} onClick={() => void saveAll()}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Tümünü kaydet
          </Button>
        </div>

        <Accordion type="multiple" className="w-full space-y-3">
          {slots.map((slot) => {
            const meta = metaByKey.get(slot.slotKey);
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
          })}
        </Accordion>
      </div>
    </EditorLayout>
  );
}
