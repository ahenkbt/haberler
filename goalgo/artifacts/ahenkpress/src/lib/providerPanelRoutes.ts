export type ProviderPanelKind = "delivery" | "tourism" | "transport";

export type ProviderPanelVendorLike = {
  vendor_type?: unknown;
  vendorType?: unknown;
  provider_type?: unknown;
  providerType?: unknown;
  provider_subtype?: unknown;
  providerSubtype?: unknown;
};

function norm(v: unknown): string {
  return String(v ?? "").trim().toLocaleLowerCase("tr-TR");
}

export function providerPanelKind(vendor: ProviderPanelVendorLike | null | undefined): ProviderPanelKind {
  const type = norm(vendor?.provider_type ?? vendor?.providerType ?? vendor?.vendor_type ?? vendor?.vendorType);
  const subtype = norm(vendor?.provider_subtype ?? vendor?.providerSubtype);
  if (["turizm", "tourism"].includes(type)) return "tourism";
  if (["ulasim", "ulaşım", "transport"].includes(type)) return "transport";
  if (["otel", "hotel", "arac", "car", "rentacar", "villa", "tur", "tour", "yat", "boat", "tekne"].includes(subtype)) {
    return "tourism";
  }
  if (["taksi", "taxi", "kurye", "courier", "cekici", "tow", "nakliyeci", "moving", "kargo", "cargo", "rideshare"].includes(subtype)) {
    return "transport";
  }
  return "delivery";
}

export function providerPanelPath(vendor: ProviderPanelVendorLike | null | undefined): string {
  const kind = providerPanelKind(vendor);
  if (kind === "tourism") return "/turizm-paneli";
  if (kind === "transport") return "/ulasim-paneli";
  return "/servis-saglayici-paneli";
}
