import { useCallback, useEffect, useMemo, useState } from "react";
import { HmWordPressMenuEditor } from "@/components/editor/HmWordPressMenuEditor";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { apiUrl } from "@/lib/apiBase";
import type { HmCorporateMenuItem } from "@/lib/newsSiteLayout";
import {
  cleanVendorNavMenuItems,
  defaultVendorNavMenuItems,
  defaultVendorStripMenuItems,
  parseVendorNavMenuItems,
  type VendorNavMenuItem,
} from "@/lib/vendorNavMenuUtils";

type Props = {
  authHeaders: () => Record<string, string>;
  flash: (msg: string, ok?: boolean) => void;
  isApproved: boolean;
  storefrontPath?: string | null;
};

function storefrontBaseFromPath(path: string | null | undefined): { base: string; productsSegment: "menu" | "urunler" } {
  const raw = String(path ?? "").trim();
  const pathOnly = raw.replace(/^https?:\/\/[^/]+/i, "") || "/";
  const ecom = pathOnly.match(/^\/alisveris\/magaza\/[^/]+/);
  if (ecom) return { base: ecom[0], productsSegment: "urunler" };
  const delivery = pathOnly.match(/^\/siparis\/(?:satici|isletme)\/[^/]+/);
  if (delivery) return { base: delivery[0], productsSegment: "menu" };
  const tourism = pathOnly.match(/^\/turizm\/[^/]+\/[^/]+/);
  if (tourism) return { base: tourism[0], productsSegment: "urunler" };
  return { base: pathOnly.split("?")[0]?.replace(/\/+$/, "") || "/", productsSegment: "menu" };
}

function toHmItems(items: VendorNavMenuItem[]): HmCorporateMenuItem[] {
  return items.map((item) => ({
    id: item.id,
    label: item.label,
    href: item.href,
    enabled: item.enabled !== false,
  }));
}

function fromHmItems(items: HmCorporateMenuItem[]): VendorNavMenuItem[] {
  return items.map((item) => ({
    id: item.id,
    label: item.label,
    href: item.href,
    enabled: item.enabled !== false,
  }));
}

export function VendorNavMenuPanel({ authHeaders, flash, isApproved, storefrontPath }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [navMenuEnabled, setNavMenuEnabled] = useState(false);
  const [stripMenuEnabled, setStripMenuEnabled] = useState(false);
  const [logoItems, setLogoItems] = useState<VendorNavMenuItem[]>([]);
  const [stripItems, setStripItems] = useState<VendorNavMenuItem[]>([]);

  const { base, productsSegment } = useMemo(() => storefrontBaseFromPath(storefrontPath), [storefrontPath]);

  const pageCandidates = useMemo(
    () => [
      { key: "home", label: "Giriş", href: base || "/", group: "Mağaza" },
      { key: "about", label: "Hakkımızda", href: `${base}/hakkimizda`, group: "Mağaza" },
      {
        key: "products",
        label: productsSegment === "menu" ? "Menü" : "Ürünler",
        href: `${base}/${productsSegment}`,
        group: "Mağaza",
      },
      { key: "blog", label: "Blog", href: `${base}/blog`, group: "Mağaza" },
      { key: "contact", label: "İletişim", href: `${base}/iletisim`, group: "Mağaza" },
    ],
    [base, productsSegment],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(apiUrl("/api/providers/storefront/theme"), { headers: authHeaders() });
      const d = (await r.json()) as {
        navMenuEnabled?: boolean;
        navMenuItems?: unknown;
        stripMenuEnabled?: boolean;
        stripMenuItems?: unknown;
        internalStorefrontPath?: string;
        error?: string;
      };
      if (!r.ok) throw new Error(d.error || "Yüklenemedi");
      setNavMenuEnabled(d.navMenuEnabled === true);
      setStripMenuEnabled(d.stripMenuEnabled === true);
      const pathBase = storefrontBaseFromPath(d.internalStorefrontPath ?? storefrontPath).base;
      const parsedLogo = parseVendorNavMenuItems(d.navMenuItems);
      setLogoItems(parsedLogo.length ? parsedLogo : defaultVendorNavMenuItems(pathBase, productsSegment));
      const parsedStrip = parseVendorNavMenuItems(d.stripMenuItems);
      setStripItems(parsedStrip.length ? parsedStrip : defaultVendorStripMenuItems(pathBase, productsSegment));
    } catch (e) {
      flash(e instanceof Error ? e.message : "Menü ayarları yüklenemedi", false);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, flash, productsSegment, storefrontPath]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveMenus = async (patch: {
    navMenuEnabled?: boolean;
    navMenuItems?: VendorNavMenuItem[];
    stripMenuEnabled?: boolean;
    stripMenuItems?: VendorNavMenuItem[];
  }) => {
    setSaving(true);
    try {
      const nextLogoEnabled = patch.navMenuEnabled ?? navMenuEnabled;
      const nextStripEnabled = patch.stripMenuEnabled ?? stripMenuEnabled;
      const nextLogoItems = patch.navMenuItems ?? logoItems;
      const nextStripItems = patch.stripMenuItems ?? stripItems;
      const cleanedLogo = cleanVendorNavMenuItems(nextLogoItems);
      const cleanedStrip = cleanVendorNavMenuItems(nextStripItems);
      if (nextLogoEnabled && !cleanedLogo?.length) {
        flash("Logo menüsü açıkken en az bir menü öğesi gerekli.", false);
        return;
      }
      if (nextStripEnabled && !cleanedStrip?.length) {
        flash("Şerit menüsü açıkken en az bir menü öğesi gerekli.", false);
        return;
      }
      const r = await fetch(apiUrl("/api/providers/storefront/theme"), {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          navMenuEnabled: nextLogoEnabled,
          navMenuItems: cleanedLogo ?? [],
          stripMenuEnabled: nextStripEnabled,
          stripMenuItems: cleanedStrip ?? [],
        }),
      });
      const d = (await r.json()) as {
        error?: string;
        navMenuEnabled?: boolean;
        navMenuItems?: unknown;
        stripMenuEnabled?: boolean;
        stripMenuItems?: unknown;
      };
      if (!r.ok) throw new Error(d.error || "Kaydedilemedi");
      setNavMenuEnabled(d.navMenuEnabled === true);
      setStripMenuEnabled(d.stripMenuEnabled === true);
      setLogoItems(parseVendorNavMenuItems(d.navMenuItems));
      setStripItems(parseVendorNavMenuItems(d.stripMenuItems));
      flash("Menü ayarları kaydedildi. Mağaza sayfasını yenileyin.", true);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Kaydedilemedi", false);
    } finally {
      setSaving(false);
    }
  };

  if (!isApproved) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
        Başvurunuz onaylandıktan sonra mağaza logo ve şerit menüsünü düzenleyebilirsiniz.
      </div>
    );
  }

  if (loading) {
    return <div className="text-sm text-gray-700">Menü ayarları yükleniyor…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <div>
          <h3 className="text-base font-bold text-gray-900">Logo menü</h3>
          <p className="mt-1 text-xs text-gray-600">
            Mağaza üst şeridindeki bağlantılar. Varsayılan kapalıdır; açtığınızda özel menü listesi kullanılır.
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
          <Label htmlFor="vendor-logo-menu-enabled" className="cursor-pointer text-sm font-medium text-gray-900">
            Logo menüsünü göster
          </Label>
          <Switch
            id="vendor-logo-menu-enabled"
            checked={navMenuEnabled}
            disabled={saving}
            onCheckedChange={(checked) => {
              const next = checked === true;
              setNavMenuEnabled(next);
              void saveMenus({ navMenuEnabled: next });
            }}
          />
        </div>
      </div>

      <HmWordPressMenuEditor
        menuName="Logo menü"
        items={toHmItems(logoItems)}
        allowNesting={false}
        disabled={saving}
        saving={saving}
        pageCandidates={pageCandidates}
        categoryCandidates={[]}
        onChange={(next) => setLogoItems(fromHmItems(next))}
        onSave={() => void saveMenus({ navMenuItems: logoItems })}
        onReset={() => {
          const defaults = defaultVendorNavMenuItems(base, productsSegment);
          setLogoItems(defaults);
          void saveMenus({ navMenuItems: defaults });
        }}
      />

      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <div>
          <h3 className="text-base font-bold text-gray-900">Şerit menü</h3>
          <p className="mt-1 text-xs text-gray-600">
            Mobilde sayfa altında sabit duran menü. Varsayılan kapalıdır; açtığınızda özel menü listesi kullanılır.
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
          <Label htmlFor="vendor-strip-menu-enabled" className="cursor-pointer text-sm font-medium text-gray-900">
            Şerit menüsünü göster
          </Label>
          <Switch
            id="vendor-strip-menu-enabled"
            checked={stripMenuEnabled}
            disabled={saving}
            onCheckedChange={(checked) => {
              const next = checked === true;
              setStripMenuEnabled(next);
              void saveMenus({ stripMenuEnabled: next });
            }}
          />
        </div>
      </div>

      <HmWordPressMenuEditor
        menuName="Şerit menü"
        items={toHmItems(stripItems)}
        allowNesting={false}
        disabled={saving}
        saving={saving}
        pageCandidates={pageCandidates}
        categoryCandidates={[]}
        onChange={(next) => setStripItems(fromHmItems(next))}
        onSave={() => void saveMenus({ stripMenuItems: stripItems })}
        onReset={() => {
          const defaults = defaultVendorStripMenuItems(base, productsSegment);
          setStripItems(defaults);
          void saveMenus({ stripMenuItems: defaults });
        }}
      />
    </div>
  );
}
