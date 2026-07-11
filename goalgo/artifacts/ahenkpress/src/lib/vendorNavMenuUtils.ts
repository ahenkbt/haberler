export type VendorNavMenuItem = {
  id: string;
  label: string;
  href: string;
  enabled?: boolean;
};

export function makeVendorNavMenuItemId(prefix = "vnav"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function cleanVendorNavMenuItems(items: VendorNavMenuItem[]): VendorNavMenuItem[] | null {
  const cleaned = items
    .map((item, index): VendorNavMenuItem | null => {
      const label = String(item.label ?? "").trim().slice(0, 80);
      const href = String(item.href ?? "").trim().slice(0, 500) || "#";
      if (!label) return null;
      const id = String(item.id ?? "").trim() || `vnav-${index + 1}`;
      return {
        id,
        label,
        href,
        enabled: item.enabled === false ? false : true,
      };
    })
    .filter((item): item is VendorNavMenuItem => item != null)
    .slice(0, 24);
  return cleaned.length ? cleaned : null;
}

export function parseVendorNavMenuItems(raw: unknown): VendorNavMenuItem[] {
  if (!Array.isArray(raw)) return [];
  return (
    cleanVendorNavMenuItems(
      raw.map((item, index) => {
        const o = item && typeof item === "object" && !Array.isArray(item) ? (item as Record<string, unknown>) : {};
        return {
          id: String(o.id ?? `vnav-${index + 1}`),
          label: String(o.label ?? ""),
          href: String(o.href ?? "#"),
          enabled: o.enabled === false ? false : true,
        };
      }),
    ) ?? []
  );
}

export function resolveVendorNavMenuEnabled(raw: unknown): boolean {
  return raw === true;
}

export function resolveVendorStripMenuEnabled(raw: unknown): boolean {
  return raw === true;
}

export function defaultVendorNavMenuItems(base: string, productsSegment: "menu" | "urunler"): VendorNavMenuItem[] {
  const prefix = base.replace(/\/+$/, "") || "";
  return [
    { id: "vnav-home", label: "Giriş", href: prefix || "/", enabled: true },
    { id: "vnav-about", label: "Hakkımızda", href: `${prefix}/hakkimizda`, enabled: true },
    {
      id: "vnav-products",
      label: productsSegment === "menu" ? "Menü" : "Ürünler",
      href: `${prefix}/${productsSegment}`,
      enabled: true,
    },
    { id: "vnav-blog", label: "Blog", href: `${prefix}/blog`, enabled: true },
  ];
}

export function activeVendorNavMenuItems(
  items: VendorNavMenuItem[] | null | undefined,
  enabled: boolean,
): VendorNavMenuItem[] {
  if (!enabled) return [];
  return (items ?? []).filter((item) => item.enabled !== false && item.label.trim());
}

export function defaultVendorStripMenuItems(base: string, productsSegment: "menu" | "urunler"): VendorNavMenuItem[] {
  const prefix = base.replace(/\/+$/, "") || "";
  return [
    { id: "vstrip-home", label: "Giriş", href: prefix || "/", enabled: true },
    {
      id: "vstrip-products",
      label: productsSegment === "menu" ? "Menü" : "Ürünler",
      href: `${prefix}/${productsSegment}`,
      enabled: true,
    },
    { id: "vstrip-blog", label: "Blog", href: `${prefix}/blog`, enabled: true },
    { id: "vstrip-contact", label: "İletişim", href: `${prefix}/iletisim`, enabled: true },
  ];
}

export function activeVendorStripMenuItems(
  items: VendorNavMenuItem[] | null | undefined,
  enabled: boolean,
): VendorNavMenuItem[] {
  if (!enabled) return [];
  const active = (items ?? []).filter((item) => item.enabled !== false && item.label.trim());
  return active;
}

export function buildVendorStripMenuLinks(
  opts: {
    base: string;
    productsSegment: "menu" | "urunler";
    stripMenuEnabled?: boolean;
    stripMenuItems?: VendorNavMenuItem[] | null;
  },
): VendorNavMenuItem[] {
  if (opts.stripMenuEnabled !== true) return [];
  const custom = activeVendorStripMenuItems(opts.stripMenuItems, true);
  if (custom.length) return custom;
  return defaultVendorStripMenuItems(opts.base, opts.productsSegment);
}
