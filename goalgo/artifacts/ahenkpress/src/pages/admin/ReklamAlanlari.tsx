import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useListAds, useUpdateAds, getListAdsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Code2, Image as ImageIcon, Upload } from "lucide-react";
import type { AdSlot } from "@workspace/api-client-react";
import {
  buildHmAdSlotImageHtml,
  extractHmAdSlotImageSrc,
  extractHmAdSlotImageClickUrl,
} from "@/lib/hmEditorAdSlots";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { uploadYekpareMediaFile } from "@/lib/yekpareMediaLibrary";

type LocalAdSlot = AdSlot & {
  contentMode: "html" | "image";
  imageMediaUrl: string | null;
  imageClickUrl: string | null;
};

function deriveUiFromHtml(html: string): Pick<LocalAdSlot, "contentMode" | "imageMediaUrl" | "imageClickUrl"> {
  const h = html ?? "";
  if (h.includes("hm-ad-slot-uploaded")) {
    const src = extractHmAdSlotImageSrc(h);
    if (src) {
      return {
        contentMode: "image",
        imageMediaUrl: src,
        imageClickUrl: extractHmAdSlotImageClickUrl(h),
      };
    }
  }
  return { contentMode: "html", imageMediaUrl: null, imageClickUrl: null };
}

function toLocalAd(ad: AdSlot): LocalAdSlot {
  const ui = deriveUiFromHtml(ad.html ?? "");
  return { ...ad, ...ui };
}

export default function ReklamAlanlari() {
  const { data: ads, isLoading, isError, error, refetch } = useListAds();
  const updateAds = useUpdateAds();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [localAds, setLocalAds] = useState<LocalAdSlot[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingUploadId, setPendingUploadId] = useState<number | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  const serverSig = useMemo(
    () =>
      ads?.length
        ? ads.map((a) => `${a.id}:${a.enabled ? 1 : 0}:${(a.html ?? "").length}`).join("|")
        : "",
    [ads],
  );

  useEffect(() => {
    if (!ads?.length) return;
    setLocalAds(ads.map(toLocalAd));
  }, [ads, serverSig]);

  const normalizeForSave = (list: LocalAdSlot[]): { id: number; html: string; enabled: boolean }[] =>
    list.map((ad) => ({
      id: ad.id,
      enabled: ad.enabled,
      html:
        ad.contentMode === "image" && ad.imageMediaUrl?.trim()
          ? buildHmAdSlotImageHtml(ad.imageMediaUrl.trim(), ad.imageClickUrl)
          : ad.html,
    }));

  const handleSave = () => {
    updateAds.mutate(
      {
        data: {
          slots: normalizeForSave(localAds),
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Reklamlar kaydedildi" });
          void queryClient.invalidateQueries({ queryKey: getListAdsQueryKey() });
        },
        onError: (err: unknown) =>
          toast({
            title: "Kaydedilemedi",
            description: (err instanceof Error ? err.message : String(err)).slice(0, 220),
            variant: "destructive",
          }),
      },
    );
  };

  const pickUploadFile = (id: number) => {
    setPendingUploadId(id);
    fileRef.current?.click();
  };

  const onUploadFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const slotId = pendingUploadId;
    e.target.value = "";
    setPendingUploadId(null);
    if (!file || slotId == null) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Yalnızca görsel dosyası seçin", variant: "destructive" });
      return;
    }
    setUploadingId(slotId);
    try {
      const { url } = await uploadYekpareMediaFile(file);
      setLocalAds((prev) =>
        prev.map((ad) =>
          ad.id !== slotId
            ? ad
            : {
                ...ad,
                contentMode: "image",
                imageMediaUrl: url,
                html: buildHmAdSlotImageHtml(url, ad.imageClickUrl),
              },
        ),
      );
      toast({ title: "Görsel yüklendi" });
    } catch (err) {
      toast({
        title: "Yüklenemedi",
        description: err instanceof Error ? err.message.slice(0, 160) : String(err),
        variant: "destructive",
      });
    } finally {
      setUploadingId(null);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Reklam Alanları">
        <div className="flex items-center justify-center h-48 text-gray-500 gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          Yükleniyor…
        </div>
      </AdminLayout>
    );
  }

  if (isError) {
    return (
      <AdminLayout title="Reklam Alanları">
        <div className="bg-white p-6 rounded-md border border-red-200 max-w-4xl space-y-3">
          <p className="font-semibold text-red-700">Reklam alanları yüklenemedi</p>
          <p className="text-sm text-gray-600">{error instanceof Error ? error.message : String(error)}</p>
          <Button type="button" variant="outline" className="gap-2" onClick={() => void refetch()}>
            <RefreshCw className="w-4 h-4" />
            Tekrar dene
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Reklam Alanları">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={(ev) => void onUploadFileChange(ev)}
      />

      <div className="bg-white p-6 rounded-md shadow-sm border max-w-4xl">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <div>
            <h2 className="text-xl font-bold">Reklam alanları</h2>
            <p className="text-sm text-gray-500 mt-1">
              Header, anasayfa, yan kolon ve makale içi slotlara HTML / reklam kodu yapıştırın veya görsel yükleyin.
              Kayıt sonrası canlı sitede görünür.
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => void refetch()}>
              <RefreshCw className="w-4 h-4" />
              Yenile
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={updateAds.isPending || localAds.length === 0}
              className="bg-[#e61e25] hover:bg-[#c9181e] text-white gap-2"
            >
              {updateAds.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Kaydet
            </Button>
          </div>
        </div>

        {localAds.length === 0 ? (
          <p className="text-sm text-gray-600 py-8 text-center border rounded-md bg-gray-50">
            Henüz reklam slotu yok. API güncellemesinden sonra bu sayfayı yenileyin; sunucu varsayılan slotları oluşturur.
          </p>
        ) : (
          <Accordion type="multiple" className="w-full space-y-4">
            {localAds.map((ad) => {
              const tabValue = ad.contentMode === "image" ? "image" : "html";
              return (
                <AccordionItem key={ad.id} value={String(ad.slotKey)} className="border rounded-md px-4">
                  <AccordionTrigger className="hover:no-underline flex justify-between">
                    <div className="flex items-center gap-4 text-left">
                      <span className="font-bold">{ad.name}</span>
                      <span className="text-xs text-gray-500 font-normal">{ad.description}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 pb-6 space-y-4 border-t">
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded border">
                      <span className="font-medium text-sm">Reklamı aktif et</span>
                      <Switch
                        checked={ad.enabled}
                        onCheckedChange={(v) =>
                          setLocalAds((prev) => prev.map((a) => (a.id === ad.id ? { ...a, enabled: v } : a)))
                        }
                      />
                    </div>

                    <Tabs
                      value={tabValue}
                      onValueChange={(v) => {
                        const mode = v === "image" ? "image" : "html";
                        setLocalAds((prev) =>
                          prev.map((a) => {
                            if (a.id !== ad.id) return a;
                            if (mode === "image") {
                              const url = a.imageMediaUrl?.trim();
                              return {
                                ...a,
                                contentMode: "image",
                                html: url ? buildHmAdSlotImageHtml(url, a.imageClickUrl) : a.html,
                              };
                            }
                            return { ...a, contentMode: "html" };
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
                        <p className="text-xs text-gray-500">
                          Tam sayfa <code className="bg-gray-100 px-1 rounded">&lt;html&gt;</code> yapıştırmayın; global{" "}
                          <code className="bg-gray-100 px-1">&lt;style&gt;</code> site düzenini bozabilir.
                        </p>
                        <Textarea
                          rows={6}
                          className="font-mono text-sm bg-zinc-900 text-green-400 p-4"
                          value={ad.html}
                          onChange={(e) =>
                            setLocalAds((prev) =>
                              prev.map((a) =>
                                a.id === ad.id ? { ...a, html: e.target.value, contentMode: "html" } : a,
                              ),
                            )
                          }
                          placeholder="<!-- Reklam kodunu buraya yapıştırın -->"
                        />
                        {ad.slotKey === "siparis_empty" && (
                          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                            Örnek:{" "}
                            <code className="text-[11px] bg-gray-100 px-1 rounded">
                              {`<img src="/api/media/uploads/....png" alt="" class="w-44 h-44 object-contain mx-auto" />`}
                            </code>{" "}
                            — Medya kütüphanesinden yükleyip URL’yi buraya yapıştırın. Alan kapalı veya boşsa site logosu
                            gösterilir.
                          </p>
                        )}
                      </TabsContent>

                      <TabsContent value="image" className="mt-3 space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-gray-700">Tıklanınca gidecek adres (isteğe bağlı)</Label>
                          <Input
                            className="font-mono text-xs"
                            placeholder="https://örnek.com/kampanya"
                            value={ad.imageClickUrl ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setLocalAds((prev) =>
                                prev.map((a) => {
                                  if (a.id !== ad.id) return a;
                                  const click = v.trim() || null;
                                  if (a.contentMode === "image" && a.imageMediaUrl?.trim()) {
                                    return {
                                      ...a,
                                      imageClickUrl: click,
                                      html: buildHmAdSlotImageHtml(a.imageMediaUrl.trim(), click),
                                    };
                                  }
                                  return { ...a, imageClickUrl: click };
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
                            disabled={uploadingId === ad.id}
                            onClick={() => pickUploadFile(ad.id)}
                          >
                            {uploadingId === ad.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4" />
                            )}
                            Görsel seç ve yükle
                          </Button>
                          {ad.imageMediaUrl ? (
                            <span className="text-[11px] text-gray-500 truncate max-w-[min(100%,220px)]">
                              {ad.imageMediaUrl}
                            </span>
                          ) : null}
                        </div>
                        {ad.imageMediaUrl ? (
                          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 flex justify-center">
                            <img
                              src={resolveClientMediaSrc(ad.imageMediaUrl) || ad.imageMediaUrl}
                              alt=""
                              className="max-h-44 max-w-full object-contain"
                            />
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">
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
        )}
      </div>
    </AdminLayout>
  );
}
