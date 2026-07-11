import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeftRight, SlidersHorizontal } from "lucide-react";
import { BookingCoreShell } from "../BookingCoreShell";
import { BookingCoreLocationInput } from "../components/BookingCoreLocationInput";
import { TurizmServisHubPage } from "@/themes/turizm/TurizmServisHubPage";
import { TurizmHubValueCards } from "@/themes/turizm/TurizmHubSections";
import { SERVIS_FEATURE_BOXES } from "@/themes/turizm/turizmHubConfig";
import { TurizmVipVehicleCards, type VipBusinessResult } from "../components/TurizmVipVehicleCards";
import {
  DEFAULT_VIP_TRANSFER_FILTERS,
  VipTransferFilterSidebar,
  type VipTransferFilterState,
} from "../components/VipTransferFilterSidebar";
import { TURIZM } from "@/themes/turizm/turizmRoutes";
import { fetchPublicJson } from "@/lib/fetchPublicJson";
import "@/styles/bookingCoreTurizm.css";

type TransferType = "oneway" | "roundtrip" | "hourly" | "daily";

function defaultPickupDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function applyClientFilters(rows: VipBusinessResult[], filters: VipTransferFilterState, heroTransfer: TransferType) {
  let next = [...rows];
  const minPax = parseInt(filters.passengers, 10);
  const minBags = parseInt(filters.luggage, 10);

  if (Number.isFinite(minPax) && minPax > 0) {
    next = next.filter((b) =>
      (b.vehicles ?? []).some((v) => v.maxPassengers >= minPax) || !b.vehicles?.length,
    );
  }
  if (Number.isFinite(minBags) && minBags >= 0 && filters.luggage !== "") {
    next = next.filter((b) =>
      (b.vehicles ?? []).some((v) => v.maxLuggage >= minBags) || !b.vehicles?.length,
    );
  }
  if (filters.segments.length) {
    next = next.filter((b) =>
      (b.vehicles ?? []).some((v) => filters.segments.some((s) => v.segment.toLowerCase().includes(s.toLowerCase()))),
    );
  }
  if (filters.transferTypes.length) {
    const wantsAirport = filters.transferTypes.includes("airport");
    const wantsHourly = filters.transferTypes.includes("hourly");
    if (wantsAirport && !filters.transferTypes.includes("oneway")) {
      next = next.filter((b) => /havaliman|airport|transfer/i.test(`${b.title} ${b.city ?? ""}`));
    }
    if (wantsHourly && heroTransfer !== "hourly") {
      next = next.filter((b) => (b.vehicles ?? []).some((v) => (v.hourlyPrice ?? 0) > 0));
    }
  }
  if (filters.babySeat) {
    next = next.filter((b) => (b.vehicles ?? []).some((v) => v.amenities.includes("baby_seat")));
  }
  return next;
}

export function ServisHome() {
  const [, navigate] = useLocation();
  const [from, setFrom] = useState("İstanbul Havalimanı");
  const [to, setTo] = useState("Taksim");
  const [transferType, setTransferType] = useState<TransferType>("oneway");
  const [pickupDate, setPickupDate] = useState(defaultPickupDate);
  const [passengers, setPassengers] = useState("2");
  const [allResults, setAllResults] = useState<VipBusinessResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [draftFilters, setDraftFilters] = useState<VipTransferFilterState>(DEFAULT_VIP_TRANSFER_FILTERS);
  const [filters, setFilters] = useState<VipTransferFilterState>(DEFAULT_VIP_TRANSFER_FILTERS);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const loadListings = useCallback(async (city?: string, pax?: string, segment?: string) => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        passengers: pax || passengers || "1",
        luggage: "0",
        limit: "60",
      });
      if (city?.trim()) {
        q.set("from", city.trim());
        q.set("city", city.trim());
      }
      if (segment?.trim()) q.set("segment", segment.trim());
      const { ok, data } = await fetchPublicJson<{ listings?: VipBusinessResult[] }>(
        `/api/tourism/vip/search?${q}`,
      );
      setAllResults(ok && Array.isArray(data?.listings) ? data.listings : []);
    } catch {
      setAllResults([]);
    } finally {
      setLoading(false);
    }
  }, [passengers]);

  useEffect(() => {
    const qs = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const o = qs.get("from")?.trim();
    const d = qs.get("to")?.trim();
    const dep = qs.get("date")?.trim();
    const pax = qs.get("passengers")?.trim();
    const tt = qs.get("transferType")?.trim() as TransferType | undefined;
    if (o) setFrom(o);
    if (d) setTo(d);
    if (dep) setPickupDate(dep);
    if (pax) setPassengers(pax);
    if (tt && ["oneway", "roundtrip", "hourly", "daily"].includes(tt)) setTransferType(tt);
    void loadListings(o || undefined, pax || undefined);
  }, []);

  const filteredResults = useMemo(
    () => applyClientFilters(allResults, filters, transferType),
    [allResults, filters, transferType],
  );

  function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    void loadListings(from.trim() || to.trim(), passengers);
    const q = new URLSearchParams();
    if (from.trim()) q.set("from", from.trim());
    if (to.trim()) q.set("to", to.trim());
    if (pickupDate) q.set("date", pickupDate);
    if (passengers) q.set("passengers", passengers);
    q.set("transferType", transferType);
    const qs = q.toString();
    navigate(qs ? `${TURIZM.stubs.servis}?${qs}` : TURIZM.stubs.servis, { replace: true });
    requestAnimationFrame(() => {
      document.getElementById("servis-listings")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function swapPlaces() {
    const prev = from;
    setFrom(to);
    setTo(prev);
  }

  function applyFilters() {
    setFilters({ ...draftFilters });
    setMobileFiltersOpen(false);
    void loadListings(
      from.trim() || to.trim(),
      draftFilters.passengers || passengers,
      draftFilters.segments[0],
    );
  }

  function resetFilters() {
    setDraftFilters(DEFAULT_VIP_TRANSFER_FILTERS);
    setFilters(DEFAULT_VIP_TRANSFER_FILTERS);
    setMobileFiltersOpen(false);
    void loadListings(from.trim() || to.trim(), passengers);
  }

  const resultLabel = loading
    ? "Yükleniyor…"
    : `${filteredResults.length.toLocaleString("tr-TR")} transfer firması`;

  const searchWidget = (
    <form className="bc-hub-search bc-hub-search--servis" onSubmit={handleSearch}>
      <div className="bc-hub-search__fields bc-hub-search__fields--servis">
        <div className="bc-hub-search__place">
          <BookingCoreLocationInput
            id="servis-from"
            label="Nereden"
            value={from}
            onChange={setFrom}
            type="vip"
            placeholder="Havalimanı veya adres"
          />
        </div>
        <button type="button" className="bc-hub-search__swap" onClick={swapPlaces} aria-label="Kalkış ve varışı değiştir">
          <ArrowLeftRight className="w-4 h-4" />
        </button>
        <div className="bc-hub-search__place">
          <BookingCoreLocationInput
            id="servis-to"
            label="Nereye"
            value={to}
            onChange={setTo}
            type="vip"
            placeholder="Otel veya adres"
          />
        </div>
        <div className="bc-hub-search__field bc-hub-search__field--date">
          <label htmlFor="servis-date">Tarih</label>
          <input id="servis-date" type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
          <div className="bc-hub-search__quick-dates">
            <button type="button" onClick={() => setPickupDate(todayIso())}>
              Bugün
            </button>
            <button type="button" onClick={() => setPickupDate(tomorrowIso())}>
              Yarın
            </button>
          </div>
        </div>
        <div className="bc-hub-search__field bc-hub-search__field--compact">
          <label htmlFor="servis-pax">Kişi</label>
          <input id="servis-pax" type="number" min={1} max={20} value={passengers} onChange={(e) => setPassengers(e.target.value)} />
        </div>
        <div className="bc-hub-search__field">
          <label htmlFor="servis-transfer-type">Transfer tipi</label>
          <select
            id="servis-transfer-type"
            value={transferType}
            onChange={(e) => setTransferType(e.target.value as TransferType)}
          >
            <option value="oneway">Tek yön</option>
            <option value="roundtrip">Gidiş-dönüş</option>
            <option value="hourly">Saatlik</option>
            <option value="daily">Günlük</option>
          </select>
        </div>
        <button type="submit" className="bc-hub-search__submit">
          Transfer Ara
        </button>
      </div>
    </form>
  );

  const listingSection = (
    <div className="bc-list-wrap" id="servis-listings">
      <div className="bc-list-toolbar">
        <p className="bc-result-count">{resultLabel}</p>
        <button type="button" className="bc-filter-mobile-btn" onClick={() => setMobileFiltersOpen(true)}>
          <SlidersHorizontal className="w-4 h-4" />
          Filtreler
        </button>
      </div>

      <div className="bc-list-layout bc-list-layout--filtered">
        <div className="bc-filter-sidebar-desktop">
          <VipTransferFilterSidebar
            draft={draftFilters}
            applied={filters}
            onDraftChange={(next) => setDraftFilters((prev) => ({ ...prev, ...next }))}
            onApply={applyFilters}
            onReset={resetFilters}
          />
          <div className="bc-filter-sidebar__feature-strip" aria-label="VIP transfer özellikleri">
            <TurizmHubValueCards cards={SERVIS_FEATURE_BOXES} />
          </div>
        </div>

        <VipTransferFilterSidebar
          draft={draftFilters}
          applied={filters}
          onDraftChange={(next) => setDraftFilters((prev) => ({ ...prev, ...next }))}
          onApply={applyFilters}
          onReset={resetFilters}
          mobileOpen={mobileFiltersOpen}
          onMobileClose={() => setMobileFiltersOpen(false)}
        />

        <div className="bc-list-main">
          {!loading && filteredResults.length === 0 ? (
            <div className="bc-empty">
              <p>
                Bu kriterlere uygun VIP transfer firması bulunamadı. Filtreleri gevşetin veya admin panelinden{" "}
                <strong>Haritalardan İçe Aktar</strong> ile firma ekleyin.
              </p>
              <button type="button" className="bc-search-btn" onClick={resetFilters}>
                Filtreleri sıfırla
              </button>
              <Link href={TURIZM.hub}>Seyahat ana sayfaya dön</Link>
            </div>
          ) : (
            <TurizmVipVehicleCards businesses={filteredResults} loading={loading} />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <BookingCoreShell module="konaklama">
      <TurizmServisHubPage search={searchWidget} listing={listingSection} />
    </BookingCoreShell>
  );
}
