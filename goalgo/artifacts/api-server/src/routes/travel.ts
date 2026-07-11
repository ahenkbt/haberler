/**
 * Travelpayouts public uçları: tüm seyahat dikeyleri için affiliate URL + (varsa) site içi fiyat.
 * Token asla döndürülmez; affiliate URL'ler sunucuda marker ile üretilir.
 */
import { Router, type IRouter } from "express";
import {
  getTravelpayoutsConfig,
  buildAffiliateUrl,
  fetchHotellookPrices,
  fetchAviasalesPrices,
  fetchPlacesAutocomplete,
  aviasalesFullLink,
  isTravelVertical,
  TRAVEL_VERTICALS,
  defaultHotelCheckIn,
  defaultHotelCheckOut,
  type AffiliateLinkParams,
} from "../lib/travelpayouts";
import {
  fetchCollectApiBusPrices,
  fetchCollectApiFlightPrices,
  isCollectApiConfigured,
} from "../lib/collectapi.js";
import {
  fetchEtkinlikCategories,
  fetchEtkinlikFormats,
  fetchEtkinlikTaxonomy,
  fetchEtkinlikEventDetail,
  etkinlikIoEnvHealthDetails,
  isEtkinlikIoConfigured,
  searchEtkinlikEvents,
} from "../lib/etkinlik-io.js";
import {
  enrichEtkinlikEventsInBackground,
  resolveEtkinlikEventDetail,
} from "../lib/etkinlik-event-cache.js";
import { resyncAllEtkinlikVenuesToMap } from "../lib/etkinlik-venue-map-sync.js";
import { denyUnlessAdminMaintenance } from "../lib/admin-guard.js";

const router: IRouter = Router();

function num(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}
function str(value: unknown): string | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  return s === "" ? undefined : s;
}

/** Dikey destek matrisi + yapılandırma durumu (token gizli). */
router.get("/travel/config", async (_req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  const cfg = await getTravelpayoutsConfig();
  res.json({
    configured: cfg.configured,
    hasMarker: Boolean(cfg.marker),
    verticals: Object.values(TRAVEL_VERTICALS),
  });
});

/** Lokasyon/ülke autocomplete (şehir IATA + koordinat dahil). Token gerektirmez. */
router.get("/travel/places", async (req, res): Promise<void> => {
  const term = str((req.query as Record<string, string>).term);
  const locale = str((req.query as Record<string, string>).locale) ?? "tr";
  if (!term) {
    res.json({ places: [] });
    return;
  }
  const places = await fetchPlacesAutocomplete(term, locale);
  res.setHeader("Cache-Control", "public, max-age=1800");
  res.json({ places });
});

/** Bir dikey için marker'lı affiliate URL üretir (satın alma/rezervasyon adımı yönlendirmesi). */
router.get("/travel/affiliate", async (req, res): Promise<void> => {
  const q = req.query as Record<string, string>;
  const vertical = str(q.vertical) ?? "";
  if (!isTravelVertical(vertical)) {
    res.status(400).json({ error: "Geçersiz dikey" });
    return;
  }
  const support = TRAVEL_VERTICALS[vertical];
  const cfg = await getTravelpayoutsConfig();
  const params: AffiliateLinkParams = {
    location: str(q.location),
    origin: str(q.origin),
    destination: str(q.destination),
    checkIn: str(q.checkIn),
    checkOut: str(q.checkOut),
    departDate: str(q.departDate),
    returnDate: str(q.returnDate),
    adults: num(q.adults),
    query: str(q.query),
    propertyType: str(q.propertyType),
  };
  const affiliateUrl = support.affiliate ? buildAffiliateUrl(vertical, cfg.marker, params) : null;
  res.setHeader("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  res.json({
    vertical,
    label: support.label,
    program: support.program,
    affiliate: support.affiliate,
    priceApi: support.priceApi,
    configured: cfg.configured,
    hasMarker: Boolean(cfg.marker),
    affiliateUrl,
  });
});

/** Hotellook fiyatları (site içi gösterim). Token yoksa boş + configured:false. */
router.get("/travel/hotels/prices", async (req, res): Promise<void> => {
  const q = req.query as Record<string, string>;
  const location = str(q.location);
  if (!location) {
    res.status(400).json({ error: "location zorunlu" });
    return;
  }
  const cfg = await getTravelpayoutsConfig();
  const propertyType = str(q.propertyType);
  const checkIn = str(q.checkIn) || defaultHotelCheckIn();
  const checkOut = str(q.checkOut) || defaultHotelCheckOut(checkIn);
  const hotels = await fetchHotellookPrices({
    location,
    checkIn,
    checkOut,
    currency: str(q.currency) ?? "try",
    limit: num(q.limit),
    propertyType,
  });
  res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
  res.json({
    configured: cfg.configured,
    hasToken: Boolean(cfg.token),
    currency: (str(q.currency) ?? "try").toUpperCase(),
    affiliateUrl: buildAffiliateUrl("hotel", cfg.marker, {
      location,
      checkIn,
      checkOut,
      adults: num(q.adults),
      propertyType,
    }),
    hotels,
  });
});

function sanitizeReturnDate(departDate?: string, returnDate?: string): string | undefined {
  if (!returnDate) return undefined;
  if (!departDate) return returnDate;
  const dep = new Date(`${departDate}T12:00:00`);
  const ret = new Date(`${returnDate}T12:00:00`);
  if (Number.isNaN(dep.getTime()) || Number.isNaN(ret.getTime())) return returnDate;
  return ret >= dep ? returnDate : undefined;
}

/** Aviasales uçuş fiyatları + CollectAPI yedek + marker'lı affiliate link. */
router.get("/travel/flights/search", async (req, res): Promise<void> => {
  const q = req.query as Record<string, string>;
  const origin = str(q.origin);
  const destination = str(q.destination);
  if (!origin || !destination) {
    res.status(400).json({ error: "origin ve destination zorunlu" });
    return;
  }
  const o = origin.toUpperCase();
  const d = destination.toUpperCase();
  const departDate = str(q.departDate);
  const returnDate = sanitizeReturnDate(departDate, str(q.returnDate));
  const cfg = await getTravelpayoutsConfig();
  const collectConfigured = isCollectApiConfigured();
  const affiliateUrl = buildAffiliateUrl("flight", cfg.marker, {
    origin: o,
    destination: d,
    departDate,
    returnDate,
    adults: num(q.adults),
  });

  let source: "travelpayouts" | "collectapi" | "mixed" | null = null;
  const sources: Array<"travelpayouts" | "collectapi"> = [];
  const tpFlights = await fetchAviasalesPrices({
    origin: o,
    destination: d,
    departDate,
    returnDate,
    currency: str(q.currency) ?? "try",
    limit: num(q.limit),
  });

  let mergedFlights = [...tpFlights];
  if (tpFlights.length > 0) sources.push("travelpayouts");

  if (collectConfigured) {
    const caRows = await fetchCollectApiFlightPrices({
      origin: o,
      destination: d,
      departDate,
      returnDate,
      limit: num(q.limit),
    });
    if (caRows.length > 0) {
      sources.push("collectapi");
      const seen = new Set(
        tpFlights.map((f) => `${f.origin}|${f.destination}|${f.price}|${f.departureAt ?? ""}|${f.airline ?? ""}`),
      );
      for (const f of caRows) {
        const key = `${f.origin}|${f.destination}|${f.price}|${f.departureAt ?? ""}|${f.airline ?? ""}`;
        if (seen.has(key)) continue;
        seen.add(key);
        mergedFlights.push({
          origin: f.origin,
          destination: f.destination,
          price: f.price,
          currency: f.currency,
          airline: f.airline,
          departureAt: f.departureAt,
          returnAt: f.returnAt,
          transfers: f.transfers,
          link: null,
        });
      }
    }
  }

  if (sources.length === 2) source = "mixed";
  else if (sources.length === 1) source = sources[0]!;
  else source = null;

  const withLinks = mergedFlights.map((f) => ({
    ...f,
    affiliateUrl: f.link ? aviasalesFullLink(f.link, cfg.marker) : affiliateUrl ?? aviasalesFullLink(null, cfg.marker),
  }));

  res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
  res.json({
    configured: Boolean(cfg.token) || collectConfigured,
    hasToken: Boolean(cfg.token),
    hasCollectApi: collectConfigured,
    configHint:
      !cfg.token && !collectConfigured
        ? "TRAVELPAYOUTS_TOKEN veya COLLECTAPI_KEY sunucu ortamında tanımlı değil."
        : !cfg.token
          ? "Travelpayouts token yok; CollectAPI sonuçları kullanılabilir."
          : !collectConfigured
            ? "CollectAPI anahtarı yok; Aviasales sonuçları kullanılabilir."
            : null,
    source,
    sources,
    affiliateUrl,
    flights: withLinks,
  });
});

/** Otobüs fiyatları — CollectAPI (Travelpayouts'ta otobüs fiyat API'si yok) + Omio affiliate. */
router.get("/travel/buses/search", async (req, res): Promise<void> => {
  const q = req.query as Record<string, string>;
  const origin = str(q.origin);
  const destination = str(q.destination);
  if (!origin || !destination) {
    res.status(400).json({ error: "origin ve destination zorunlu" });
    return;
  }
  const departDate = str(q.departDate);
  const passengers = Math.min(10, Math.max(1, num(q.adults) ?? num(q.passengers) ?? 1));
  const cfg = await getTravelpayoutsConfig();
  const collectConfigured = isCollectApiConfigured();
  const affiliateUrl = buildAffiliateUrl("bus", cfg.marker, {
    origin,
    destination,
    departDate,
    adults: passengers,
  });

  let source: "collectapi" | null = null;
  let buses: Array<{
    origin: string;
    destination: string;
    price: number;
    currency: string;
    company: string | null;
    busType: string | null;
    departureAt: string | null;
    arrivalAt: string | null;
    duration: string | null;
    affiliateUrl: string | null;
  }> = [];

  if (collectConfigured) {
    const caRows = await fetchCollectApiBusPrices({
      origin,
      destination,
      departDate,
      passengers,
      limit: num(q.limit),
    });
    if (caRows.length > 0) {
      source = "collectapi";
      buses = caRows.map((b) => ({
        ...b,
        affiliateUrl: affiliateUrl ?? null,
      }));
    }
  }

  res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
  res.json({
    configured: collectConfigured,
    hasCollectApi: collectConfigured,
    hasMarker: Boolean(cfg.marker),
    configHint: collectConfigured
      ? null
      : "COLLECTAPI_KEY sunucu ortamında tanımlı değil — otobüs fiyatları gösterilemez.",
    source,
    affiliateUrl,
    buses,
  });
});

/** Etkinlik.io yapılandırma teşhisi — token sızdırmaz. */
router.get("/travel/events/status", async (_req, res): Promise<void> => {
  const env = etkinlikIoEnvHealthDetails();
  res.setHeader("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  res.json({
    configured: env.configured,
    hasEtkinlikIo: env.configured,
    env,
    configHint: env.redeployHint,
    endpoints: {
      search: "/api/travel/events/search",
      taxonomy: "/api/travel/events/taxonomy",
      detail: "/api/travel/events/:idOrSlug",
    },
  });
});

/** Etkinlik.io kategori + format taksonomisi (tam liste). */
router.get("/travel/events/taxonomy", async (_req, res): Promise<void> => {
  const taxonomy = await fetchEtkinlikTaxonomy();
  res.setHeader("Cache-Control", "public, max-age=1800, stale-while-revalidate=3600");
  res.json({
    configured: taxonomy.configured,
    hasEtkinlikIo: isEtkinlikIoConfigured(),
    source: taxonomy.source,
    configHint: taxonomy.error,
    env: etkinlikIoEnvHealthDetails(),
    categories: taxonomy.categories,
    formats: taxonomy.formats,
    extras: taxonomy.extras,
  });
});

/** Etkinlik.io kategorileri. */
router.get("/travel/events/categories", async (_req, res): Promise<void> => {
  const configured = isEtkinlikIoConfigured();
  const categories = await fetchEtkinlikCategories();
  res.setHeader("Cache-Control", "public, max-age=1800, stale-while-revalidate=3600");
  res.json({
    configured,
    hasEtkinlikIo: configured,
    categories,
  });
});

/** Etkinlik.io formatları (etkinlik türü). */
router.get("/travel/events/formats", async (_req, res): Promise<void> => {
  const configured = isEtkinlikIoConfigured();
  const formats = await fetchEtkinlikFormats();
  res.setHeader("Cache-Control", "public, max-age=1800, stale-while-revalidate=3600");
  res.json({
    configured,
    hasEtkinlikIo: configured,
    formats,
  });
});

/** Etkinlik.io etkinlik listesi — token sunucu env'den (ETKINLIK_IO_API_KEY). */
router.get("/travel/events/search", async (req, res): Promise<void> => {
  const q = req.query as Record<string, string>;
  const city = str(q.city);
  const categoryRaw = str(q.category);
  const categoryId = num(q.categoryId);
  const formatRaw = str(q.format);
  const formatId = num(q.formatId);
  const startDate = str(q.startDate);
  const endDate = str(q.endDate);
  const priceFilter = str(q.priceFilter);
  const take = num(q.take);
  const fetchAllRaw = str(q.fetchAll);
  const fetchAll = fetchAllRaw === "1" || fetchAllRaw === "true";

  const cfg = await getTravelpayoutsConfig();
  const affiliateUrl = buildAffiliateUrl("activity", cfg.marker, {
    location: city,
    query: city,
  });

  const legacyPresets = new Set(["konser", "spor", "muze"]);
  const categorySlug =
    categoryRaw && categoryRaw !== "all" && !legacyPresets.has(categoryRaw) ? categoryRaw : undefined;
  const categoryPreset =
    categoryRaw && categoryRaw !== "all" && legacyPresets.has(categoryRaw) ? categoryRaw : undefined;

  const { configured, events, total, error } = await searchEtkinlikEvents({
    city,
    categoryIds: categoryId ? [categoryId] : undefined,
    categorySlug,
    categoryPreset,
    formatIds: formatId ? [formatId] : undefined,
    formatSlug: formatRaw && formatRaw !== "all" ? formatRaw : undefined,
    startGte: startDate,
    endLte: endDate,
    freeOnly: priceFilter === "free",
    paidOnly: priceFilter === "paid",
    take: take ?? 50,
    fetchAll,
  });

  if (events.length) {
    void enrichEtkinlikEventsInBackground(events).catch(() => {});
  }

  res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
  res.json({
    configured: configured || isEtkinlikIoConfigured(),
    hasEtkinlikIo: isEtkinlikIoConfigured(),
    configHint: error,
    env: etkinlikIoEnvHealthDetails(),
    total,
    affiliateUrl,
    events,
  });
});

/** Admin: önbellekteki tüm etkinlik mekanlarını Haritalar + Sarı Sayfalar'a senkronize et */
router.post("/travel/events/admin/sync-venues", async (req, res): Promise<void> => {
  if (!denyUnlessAdminMaintenance(req, res, "turizm")) return;
  const stats = await resyncAllEtkinlikVenuesToMap();
  res.json({ ok: true, ...stats });
});

/** Etkinlik.io tek etkinlik detayı — API + DB önbellek + sayfa scrape zenginleştirmesi. */
router.get("/travel/events/:idOrSlug", async (req, res): Promise<void> => {
  const idOrSlug = str(req.params.idOrSlug);
  if (!idOrSlug) {
    res.status(400).json({ error: "idOrSlug zorunlu" });
    return;
  }
  const configured = isEtkinlikIoConfigured();
  const env = etkinlikIoEnvHealthDetails();
  const scrapeParam = str((req.query as Record<string, string>).scrape);
  const skipScrape = scrapeParam === "0" || scrapeParam === "false";

  const detail = await resolveEtkinlikEventDetail({
    idOrSlug,
    configured,
    configHint: configured ? null : env.redeployHint,
    scrape: !skipScrape,
    fetchApiDetail: async (id) => {
      const api = await fetchEtkinlikEventDetail(id);
      return api.event;
    },
  });

  if (!detail) {
    res.status(404).json({
      configured,
      hasEtkinlikIo: configured,
      configHint: configured ? "Etkinlik bulunamadı" : env.redeployHint,
      event: null,
    });
    return;
  }

  const { configured: _cfg, source, enriching, configHint, ...eventPayload } = detail;

  res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=900");
  res.json({
    configured,
    hasEtkinlikIo: configured,
    configHint,
    source,
    enriching,
    event: eventPayload,
  });
});

export default router;
