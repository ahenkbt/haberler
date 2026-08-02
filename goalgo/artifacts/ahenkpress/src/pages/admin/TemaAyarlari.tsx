import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useGetSiteSettings,
  useUpdateSiteSettings,
  getGetSiteSettingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Loader2, Save, Upload } from "lucide-react";
import type { SiteSettingsInput } from "@workspace/api-client-react";
import { resolveClientMediaSrc, toPersistedPublicMediaUrl } from "@/lib/apiBase";
import { uploadYekpareMediaFile } from "@/lib/yekpareMediaLibrary";
import {
  PORTAL_DEFAULT_FAVICON_PATH,
  PORTAL_DEFAULT_LOGO_PATH,
} from "@/lib/portalBrand";
import { resolvePortalFaviconSrc, resolvePortalLogoSrc } from "@/lib/portalBrandAssets";

type ThemeForm = Pick<
  SiteSettingsInput,
  | "siteName"
  | "tagline"
  | "logoText1"
  | "logoText2"
  | "logoUrl"
  | "faviconUrl"
  | "primaryColor"
  | "secondaryColor"
  | "navbarBg"
  | "navbarText"
>;

const emptyTheme: ThemeForm = {
  siteName: "",
  tagline: "",
  logoText1: "",
  logoText2: "",
  logoUrl: "",
  faviconUrl: "",
  primaryColor: "#e61e25",
  secondaryColor: "#1F2937",
  navbarBg: "#FFFFFF",
  navbarText: "#111827",
};

export default function TemaAyarlari() {
  const { data: settings, isLoading } = useGetSiteSettings();
  const updateSettings = useUpdateSiteSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [form, setForm] = useState<ThemeForm>(emptyTheme);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const faviconFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!settings) return;
    setForm({
      siteName: settings.siteName ?? "",
      tagline: settings.tagline ?? "",
      logoText1: settings.logoText1 ?? "",
      logoText2: settings.logoText2 ?? "",
      logoUrl: settings.logoUrl ?? "",
      faviconUrl: settings.faviconUrl ?? "",
      primaryColor: settings.primaryColor ?? "#e61e25",
      secondaryColor: settings.secondaryColor ?? "#1F2937",
      navbarBg: settings.navbarBg ?? "#FFFFFF",
      navbarText: settings.navbarText ?? "#111827",
    });
  }, [
    settings?.siteName,
    settings?.tagline,
    settings?.logoText1,
    settings?.logoText2,
    settings?.logoUrl,
    settings?.faviconUrl,
    settings?.primaryColor,
    settings?.secondaryColor,
    settings?.navbarBg,
    settings?.navbarText,
  ]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    const payload: SiteSettingsInput = {
      ...form,
      logoUrl: form.logoUrl?.trim() ? form.logoUrl.trim() : null,
      faviconUrl: form.faviconUrl?.trim() ? form.faviconUrl.trim() : null,
    };
    updateSettings.mutate(
      { data: payload },
      {
        onSuccess: (saved) => {
          queryClient.setQueryData(getGetSiteSettingsQueryKey(), saved);
          void queryClient.invalidateQueries({ queryKey: getGetSiteSettingsQueryKey() });
          toast({ title: "Tema ayarları kaydedildi" });
        },
        onError: (err: unknown) =>
          toast({
            title: "Kaydedilemedi",
            description:
              (err instanceof Error ? err.message : String(err)).slice(0, 220) ||
              "API yanıtını kontrol edin.",
            variant: "destructive",
          }),
      },
    );
  };

  const onPickLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Geçersiz dosya", description: "Yalnızca görsel seçin.", variant: "destructive" });
      return;
    }
    setUploadingLogo(true);
    try {
      const { url } = await uploadYekpareMediaFile(file);
      const full = toPersistedPublicMediaUrl(url);
      setForm((prev) => ({ ...prev, logoUrl: full }));
      toast({ title: "Logo yüklendi", description: "Kaydet ile yayınlayın." });
    } catch (err) {
      toast({
        title: "Yükleme başarısız",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const onPickFavicon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Geçersiz dosya", description: "Yalnızca görsel seçin.", variant: "destructive" });
      return;
    }
    setUploadingFavicon(true);
    try {
      const { url } = await uploadYekpareMediaFile(file);
      const full = toPersistedPublicMediaUrl(url);
      setForm((prev) => ({ ...prev, faviconUrl: full }));
      toast({ title: "Site ikonu yüklendi", description: "Kaydet ile yayınlayın." });
    } catch (err) {
      toast({
        title: "Yükleme başarısız",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setUploadingFavicon(false);
    }
  };

  const logoPreviewSrc = resolvePortalLogoSrc(form.logoUrl || null);
  const faviconPreviewSrc = resolvePortalFaviconSrc(form.faviconUrl || null, form.logoUrl || null);

  if (isLoading) {
    return (
      <AdminLayout title="Tema Ayarları">
        <div className="flex items-center justify-center h-48 text-gray-500 gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          Yükleniyor…
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Tema Ayarları">
      <div className="bg-white rounded-md shadow-sm border p-6 max-w-4xl space-y-6">
        <div>
          <h2 className="text-xl font-bold">Görünüm & renkler</h2>
          <p className="text-sm text-gray-500 mt-1">
            Menü sırası, modüller ve iletişim için{" "}
            <Link href="/admin/ayarlar" className="text-[#e61e25] hover:underline font-medium">
              Genel Ayarlar
            </Link>
            .
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label>Site adı</Label>
              <Input name="siteName" value={form.siteName} onChange={handleChange} className="mt-1" />
            </div>
            <div>
              <Label>Slogan</Label>
              <Input name="tagline" value={form.tagline} onChange={handleChange} className="mt-1" />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <Label>Logo yazısı (1)</Label>
              <Input name="logoText1" value={form.logoText1} onChange={handleChange} className="mt-1" />
            </div>
            <div>
              <Label>Logo yazısı (2)</Label>
              <Input name="logoText2" value={form.logoText2} onChange={handleChange} className="mt-1" />
            </div>
          </div>
        </div>

        <div className="border-t pt-4 space-y-4">
          <div className="space-y-2">
            <Label>Site logosu</Label>
            <p className="text-xs text-gray-500">
              Üst menü, haber şeridi ve anasayfa hero. Boş bırakılırsa varsayılan{" "}
              <code className="text-gray-600">{PORTAL_DEFAULT_LOGO_PATH}</code> kullanılır.
            </p>
            <input
              ref={logoFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(ev) => void onPickLogo(ev)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingLogo || updateSettings.isPending}
                className="gap-2"
                onClick={() => logoFileRef.current?.click()}
              >
                {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Logo yükle
              </Button>
              {form.logoUrl?.trim() ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setForm((prev) => ({ ...prev, logoUrl: "" }))}
                >
                  Özel logoyu kaldır
                </Button>
              ) : null}
            </div>
            <Input
              name="logoUrl"
              value={form.logoUrl ?? ""}
              onChange={handleChange}
              className="mt-1 font-mono text-sm"
              placeholder={PORTAL_DEFAULT_LOGO_PATH}
            />
            <div className="p-4 bg-gray-50 rounded-lg border flex items-center gap-4">
              <img
                src={
                  form.logoUrl?.trim()
                    ? resolveClientMediaSrc(form.logoUrl.trim()) || form.logoUrl.trim()
                    : logoPreviewSrc
                }
                alt=""
                className="h-12 w-auto max-w-[280px] object-contain"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Site ikonu (favicon)</Label>
            <p className="text-xs text-gray-500">
              Tarayıcı sekmesi ve PWA. Boş bırakılırsa önce logo, yoksa{" "}
              <code className="text-gray-600">{PORTAL_DEFAULT_FAVICON_PATH}</code>.
            </p>
            <input
              ref={faviconFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(ev) => void onPickFavicon(ev)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingFavicon || updateSettings.isPending}
                className="gap-2"
                onClick={() => faviconFileRef.current?.click()}
              >
                {uploadingFavicon ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                İkon yükle
              </Button>
              {form.faviconUrl?.trim() ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setForm((prev) => ({ ...prev, faviconUrl: "" }))}
                >
                  Özel ikonu kaldır
                </Button>
              ) : null}
            </div>
            <Input
              name="faviconUrl"
              value={form.faviconUrl ?? ""}
              onChange={handleChange}
              className="mt-1 font-mono text-sm"
              placeholder={PORTAL_DEFAULT_FAVICON_PATH}
            />
            <div className="p-4 bg-gray-50 rounded-lg border flex items-center gap-4">
              <img
                src={faviconPreviewSrc}
                alt=""
                className="h-12 w-12 object-contain rounded-md"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-lg mb-4 border-b pb-2">Renkler</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(
              [
                ["primaryColor", "Birincil renk"],
                ["secondaryColor", "İkincil renk"],
                ["navbarBg", "Üst bar arka plan"],
                ["navbarText", "Üst bar metin"],
              ] as const
            ).map(([name, label]) => (
              <div key={name}>
                <Label>{label}</Label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="color"
                    className="w-12 h-10 p-1 rounded border cursor-pointer"
                    name={name}
                    value={form[name] || "#000000"}
                    onChange={handleChange}
                  />
                  <Input name={name} value={form[name] || ""} onChange={handleChange} className="font-mono uppercase flex-1" maxLength={7} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button
            type="button"
            className="bg-[#e61e25] hover:bg-[#c9181e] text-white gap-2"
            onClick={handleSave}
            disabled={updateSettings.isPending}
          >
            {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Ayarları kaydet
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
