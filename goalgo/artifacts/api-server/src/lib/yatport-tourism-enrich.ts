/** map_businesses.google_places_extras (yatport import) → turizm detay alanları */

type YatportExtras = Record<string, unknown>;

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((x) => String(x ?? "").trim()).filter(Boolean);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function isYatportMapBusiness(row: Record<string, unknown>): boolean {
  const importSource = String(row.import_source ?? row.importSource ?? "").toLowerCase();
  if (importSource === "yatport") return true;
  const extras = asRecord(row.google_places_extras ?? row.googlePlacesExtras);
  return String(extras.importSource ?? "").toLowerCase() === "yatport";
}

export function enrichYatportMapListing(row: Record<string, unknown>): Record<string, unknown> {
  if (!isYatportMapBusiness(row)) return row;
  const extras = asRecord(row.google_places_extras ?? row.googlePlacesExtras);
  const genel = asRecord(extras.genelBilgiler);
  const owner = asRecord(extras.ownerContact);
  const rezervasyon = asRecord(extras.rezervasyon);
  const fiyatlar = asRecord(extras.fiyatlar);
  const fiyatBilgileri = Array.isArray(extras.fiyatBilgileri) ? extras.fiyatBilgileri : [];

  const amenities = asStringArray(extras.imkanlar);
  const guvenlik = asStringArray(extras.guvenlikEkipmanlari);
  const sartlar = asStringArray(extras.kullanimSartlari);
  const limanlar = Array.isArray(extras.limanlar)
    ? (extras.limanlar as Array<Record<string, unknown>>)
        .map((l) => String(l.ilce ?? "").trim())
        .filter(Boolean)
    : [];

  const features: Record<string, string> = {};
  const genelLabels: Record<string, string> = {
    ilanNo: "İlan No",
    marka: "Marka",
    model: "Model",
    yapimYili: "Yapım Yılı",
    tekneAdi: "Tekne Adı",
    kapasite: "Kapasite",
    yemekliKapasite: "Yemekli Kapasite",
    konaklamaliKapasite: "Konaklamalı Kapasite",
    murettebat: "Mürettebat",
    uzunluk: "Uzunluk",
    bayrak: "Bayrak",
    motorGucu: "Motor Gücü",
    sonBakimYili: "Son Bakım Yılı",
    wcSayisi: "Wc Sayısı",
    kabinSayisi: "Kabin Sayısı",
    dortMevsimUygun: "Dört Mevsim Uygun",
    tekneTipi: "Tekne Tipi",
  };
  for (const [key, label] of Object.entries(genelLabels)) {
    const val = genel[key];
    if (val == null || val === "") continue;
    features[label] = String(val);
  }

  const priceAmount = extras.priceAmount ?? fiyatlar.saatlik ?? null;
  const priceUnitRaw = String(extras.priceUnit ?? "saat");
  const priceUnit =
    priceUnitRaw === "saat" ? "saat" : priceUnitRaw === "gün" || priceUnitRaw === "gun" ? "gün" : priceUnitRaw;

  const extraInfo: Record<string, string> = {
    yatport_source_url: String(extras.sourceUrl ?? row.website ?? ""),
    yatport_ilan_no: String(genel.ilanNo ?? extras.ilanNo ?? ""),
    yatport_owner_name: String(owner.ownerName ?? ""),
    yatport_owner_company: String(owner.ownerCompany ?? ""),
    yatport_owner_phone: String(owner.phone ?? row.phone ?? ""),
    yatport_owner_whatsapp: String(owner.whatsapp ?? row.vendor_whatsapp ?? ""),
    yatport_rotalar: String(extras.rotalar ?? ""),
    yatport_guvenlik_count: String(guvenlik.length),
    yatport_sartlar_count: String(sartlar.length),
    yatport_imkanlar_count: String(amenities.length),
  };

  if (Array.isArray(fiyatBilgileri)) {
    for (const item of fiyatBilgileri) {
      const rec = asRecord(item);
      const label = String(rec.label ?? "").trim();
      const value = String(rec.value ?? "").trim();
      if (label && value) extraInfo[`fiyat_${label.toLowerCase().replace(/\s+/g, "_")}`] = value;
    }
  }

  const rentalTypes = asStringArray(rezervasyon.rentalTypes);
  if (rentalTypes.length) extraInfo.yatport_rental_types = rentalTypes.join(", ");
  if (rezervasyon.minHours != null) extraInfo.yatport_min_hours = String(rezervasyon.minHours);
  if (rezervasyon.maxGuests != null) extraInfo.yatport_max_guests = String(rezervasyon.maxGuests);
  if (limanlar.length) extraInfo.yatport_departure_points = limanlar.join(", ");

  return {
    ...row,
    type: "boat",
    is_yatport: true,
    import_source: "yatport",
    amenities: amenities.length ? amenities : row.amenities,
    features: Object.keys(features).length ? features : row.features,
    extra_info: { ...asRecord(row.extra_info), ...extraInfo },
    vendor_name: String(owner.ownerCompany ?? owner.ownerName ?? row.vendor_name ?? row.title ?? ""),
    vendor_phone: String(owner.phone ?? row.vendor_phone ?? row.phone ?? ""),
    vendor_whatsapp: String(owner.whatsapp ?? row.vendor_whatsapp ?? ""),
    capacity: genel.kapasite ?? row.capacity,
    price: priceAmount != null ? String(priceAmount) : row.price,
    price_unit: priceUnit,
    yatport_guvenlik: guvenlik,
    yatport_sartlar: sartlar,
    yatport_rotalar: String(extras.rotalar ?? ""),
    yatport_rezervasyon: {
      ...rezervasyon,
      departurePoints: asStringArray(rezervasyon.departurePoints).length
        ? asStringArray(rezervasyon.departurePoints)
        : limanlar,
      rentalTypes: asStringArray(rezervasyon.rentalTypes),
    },
    yatport_genel_bilgiler: genel,
    yatport_owner: owner,
    yatport_fiyat_bilgileri: fiyatBilgileri,
  };
}
