import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { EditorLayout } from "@/components/EditorLayout";
import {
  buildDefaultMenuPageCandidates,
  HmWordPressMenuEditor,
} from "@/components/editor/HmWordPressMenuEditor";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useHmEditor } from "@/contexts/HmEditorContext";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/apiBase";
import { HM_EDITOR_CATEGORIES_QUERY_KEY } from "@/lib/hmEditorQueryKeys";
import {
  cleanHmMenuItems,
  ensureCorporateMenuVideoTvAtEnd,
  HM_MENU_LOCATIONS,
  isHmCorporateMenuVideoTvItem,
  type HmMenuLocationKey,
} from "@/lib/hmMenuEditorUtils";
import { hmPublicSiteOrigin } from "@/lib/hmPublicLinks";
import { readHmJwt } from "@/lib/hmSession";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import type { HmCorporateMenuItem, NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";
import { resolveHmNewsVideoTvEnabled } from "@/lib/newsSiteLayout";
import { ExternalLink } from "lucide-react";

type Cat = { id: number; name: string; slug: string };

async function hmFetchJson<T>(path: string): Promise<T> {
  const t = readHmJwt();
  if (!t) throw new Error("Oturum yok");
  const r = await fetch(apiUrl(path), {
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
  });
  const text = await r.text().catch(() => "");
  if (!r.ok) throw new Error(text || `HTTP ${r.status}`);
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

function parseLocationFromSearch(search: string): HmMenuLocationKey {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const raw = params.get("location");
  const found = HM_MENU_LOCATIONS.find((loc) => loc.key === raw);
  return found?.key ?? "hmCorporateMenuItems";
}

function readItemsForLocation(
  prefs: NewsSiteLayoutPrefs,
  key: HmMenuLocationKey,
  hmBase: string,
): HmCorporateMenuItem[] {
  const raw = (prefs[key] ?? []) as HmCorporateMenuItem[];
  if (key !== "hmCorporateMenuItems" || !raw.length) return raw;
  const withoutVideoTv = resolveHmNewsVideoTvEnabled(prefs)
    ? raw
    : raw.filter((item) => !isHmCorporateMenuVideoTvItem(item));
  if (!resolveHmNewsVideoTvEnabled(prefs)) return withoutVideoTv;
  return ensureCorporateMenuVideoTvAtEnd(withoutVideoTv, hmBase, { videoTvEnabled: true });
}

export default function EditorMenuler() {
  const { site, newsLayoutPrefs, saveNewsSiteLayout } = useHmEditor();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const initialLocation = parseLocationFromSearch(typeof window !== "undefined" ? window.location.search : "");
  const hmBaseEarly = site?.slug ? `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(site.slug)}` : "";
  const [menuLocation, setMenuLocation] = useState<HmMenuLocationKey>(initialLocation);
  const [items, setItems] = useState<HmCorporateMenuItem[]>(() =>
    readItemsForLocation(newsLayoutPrefs, initialLocation, hmBaseEarly),
  );
  const [saving, setSaving] = useState(false);

  const locationMeta = HM_MENU_LOCATIONS.find((loc) => loc.key === menuLocation)!;
  const hmBase = site?.slug ? `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(site.slug)}` : "";

  const { data: cats = [] } = useQuery({
    queryKey: [...HM_EDITOR_CATEGORIES_QUERY_KEY],
    queryFn: () => hmFetchJson<Cat[]>("/api/hm/editor/categories"),
    enabled: site?.id != null,
  });

  const pageCandidates = useMemo(
    () => buildDefaultMenuPageCandidates(hmBase, newsLayoutPrefs.hmExtraPages, {
      siteOrigin: hmPublicSiteOrigin(site?.domain ?? null),
      layoutPrefs: newsLayoutPrefs,
    }),
    [hmBase, newsLayoutPrefs, site?.domain],
  );

  useEffect(() => {
    setItems(readItemsForLocation(newsLayoutPrefs, menuLocation, hmBase));
  }, [newsLayoutPrefs, menuLocation, hmBase]);

  const switchLocation = (key: HmMenuLocationKey) => {
    setMenuLocation(key);
    setItems(readItemsForLocation(newsLayoutPrefs, key, hmBase));
    const base = location.split("?")[0] || "/editor/menuler";
    setLocation(`${base}?location=${encodeURIComponent(key)}`);
  };

  const saveMenu = async () => {
    setSaving(true);
    const saveKey = menuLocation;
    const saveMeta = HM_MENU_LOCATIONS.find((loc) => loc.key === saveKey)!;
    const cleaned = cleanHmMenuItems(items, { allowNesting: saveMeta.allowNesting });
    const normalized =
      saveKey === "hmCorporateMenuItems" && cleaned?.length
        ? ensureCorporateMenuVideoTvAtEnd(cleaned, hmBase, {
            videoTvEnabled: resolveHmNewsVideoTvEnabled(newsLayoutPrefs),
          })
        : cleaned;
    if (!normalized?.length) {
      setSaving(false);
      toast({
        title: "Menü boş",
        description: "Kaydetmeden önce en az bir menü öğesi ekleyin.",
        variant: "destructive",
      });
      return;
    }
    const patch = {
      [saveKey]: normalized,
      ...(saveKey === "hmCorporateMenuItems" ? { hmCorporateMenuPrimaryOnly: false } : {}),
    } as Partial<NewsSiteLayoutPrefs>;
    const r = await saveNewsSiteLayout(newsLayoutPrefs, { layoutPatch: patch });
    setSaving(false);
    if (!r.ok) {
      toast({
        title: "Kaydedilemedi",
        description: r.error.slice(0, 220) || "Sunucuya yazılamadı.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Menü kaydedildi",
      description: `${saveMeta.label} kaydedildi. Açık vitrin sekmesini yenileyin (Ctrl+F5).`,
    });
  };

  const resetMenu = async () => {
    setSaving(true);
    const patch = { [menuLocation]: null } as Partial<NewsSiteLayoutPrefs>;
    const r = await saveNewsSiteLayout(newsLayoutPrefs, { layoutPatch: patch });
    setSaving(false);
    if (!r.ok) {
      toast({ title: "Sıfırlanamadı", description: r.error.slice(0, 220), variant: "destructive" });
      return;
    }
    setItems([]);
    toast({ title: "Varsayılan menüye dönüldü" });
  };

  return (
    <EditorLayout title="Menüler">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Menü düzenle</h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                WordPress&apos;teki gibi soldan öğe ekleyin, sağda sürükleyerek sıralayın. Kurumsal üst menüde alt
                menü (dropdown) oluşturabilirsiniz.
              </p>
            </div>
            {hmBase ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={hmBase} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Vitrini aç
                </Link>
              </Button>
            ) : null}
          </div>

          <div className="mt-4">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Menü konumu</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {HM_MENU_LOCATIONS.map((loc) => (
                <button
                  key={loc.key}
                  type="button"
                  onClick={() => switchLocation(loc.key)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    menuLocation === loc.key
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span className="font-semibold">{loc.label}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">{locationMeta.description}</p>
            <p className="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-950">
              <strong>Logo menü</strong> logo yanındaki üst menüde her zaman açıktır; <strong>Şerit menü</strong> mobilde sayfa
              altında sabit durur. <strong>Footer menüsü</strong> alt bilgi sütununda görünür. Her öğe için sağdaki anahtar ile{" "}
              <strong>aktif/pasif</strong> yapabilirsiniz. Kaydettikten sonra vitrini yenileyin.
            </p>
            {menuLocation === "hmNewsStripMenuItems" ? (
              <div className="mt-3 flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <div>
                  <Label htmlFor="hm-editor-strip-menu-enabled" className="text-sm font-semibold text-slate-900">
                    Şerit menüsünü vitrinde göster
                  </Label>
                  <p className="text-[11px] text-slate-600">
                    Varsayılan kapalı. Açıkken aşağıdaki öğeler mobilde sayfa altında sabit şerit menüde listelenir.
                  </p>
                </div>
                <Switch
                  id="hm-editor-strip-menu-enabled"
                  checked={newsLayoutPrefs.hmNewsStripMenuEnabled === true}
                  disabled={saving}
                  onCheckedChange={(checked) => {
                    void saveNewsSiteLayout(newsLayoutPrefs, {
                      layoutPatch: { hmNewsStripMenuEnabled: checked === true },
                    });
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>

        <HmWordPressMenuEditor
          menuName={locationMeta.label}
          items={items}
          allowNesting={locationMeta.allowNesting}
          disabled={saving}
          saving={saving}
          pageCandidates={pageCandidates}
          categoryCandidates={cats}
          onChange={setItems}
          onSave={() => void saveMenu()}
          onReset={() => void resetMenu()}
        />
      </div>
    </EditorLayout>
  );
}
