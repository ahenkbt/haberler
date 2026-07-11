import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeftRight, SlidersHorizontal } from "lucide-react";
import { BookingCoreShell } from "../BookingCoreShell";
import { BookingCoreLocationInput } from "../components/BookingCoreLocationInput";
import { TurizmBusResultCards } from "../components/TurizmTravelResultCards";
import { TurizmBusHubPage } from "@/themes/turizm/TurizmBusHubPage";
import { TURIZM } from "@/themes/turizm/turizmRoutes";
import { fetchBusResults, type BusResult } from "../lib/travelpayouts";
import "@/styles/bookingCoreTurizm.css";

function defaultDepartDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
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

export function OtobusHome() {
  const [, navigate] = useLocation();
  const [origin, setOrigin] = useState("Ankara");
  const [destination, setDestination] = useState("İstanbul Avrupa");
  const [departDate, setDepartDate] = useState(defaultDepartDate);
  const [includeHotels, setIncludeHotels] = useState(false);
  const [passengers, setPassengers] = useState("1");
  const [comfort, setComfort] = useState<"all" | "standard" | "vip">("all");
  const [routeFilter, setRouteFilter] = useState("");
  const [results, setResults] = useState<BusResult[]>([]);
  const [rawResults, setRawResults] = useState<BusResult[]>([]);
  const [searchUrl, setSearchUrl] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);
  const [configHint, setConfigHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [mobileFilters, setMobileFilters] = useState(false);

  useEffect(() => {
    const qs = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const o = qs.get("origin")?.trim();
    const d = qs.get("destination")?.trim();
    const dep = qs.get("departDate")?.trim();
    const pax = qs.get("adults")?.trim();
    if (o) setOrigin(o);
    if (d) setDestination(d);
    if (dep) setDepartDate(dep);
    if (pax) setPassengers(pax);
    if (o && d) void runSearchWith(o, d, dep || undefined, pax || "1");
  }, []);

  useEffect(() => {
    let next = rawResults;
    if (comfort === "vip") {
      next = next.filter((b) => /vip|lux|1\+1|suit/i.test(b.busType ?? "") || /vip|lux/i.test(b.company ?? ""));
    } else if (comfort === "standard") {
      next = next.filter((b) => !/vip|lux|1\+1|suit/i.test(b.busType ?? "") && !/vip|lux/i.test(b.company ?? ""));
    }
    if (routeFilter.trim()) {
      const q = routeFilter.trim().toLowerCase();
      next = next.filter(
        (b) =>
          b.origin.toLowerCase().includes(q) ||
          b.destination.toLowerCase().includes(q) ||
          (b.company ?? "").toLowerCase().includes(q),
      );
    }
    setResults(next);
  }, [rawResults, comfort, routeFilter]);

  async function runSearchWith(oRaw: string, dRaw: string, dep?: string, pax = passengers) {
    const o = oRaw.trim();
    const d = dRaw.trim();
    if (o.length < 2 || d.length < 2) {
      setSearched(true);
      return;
    }
    setLoading(true);
    setSearched(true);
    const res = await fetchBusResults({
      origin: o,
      destination: d,
      departDate: dep,
      adults: pax,
    });
    setRawResults(res?.buses ?? []);
    setSearchUrl(res?.affiliateUrl ?? null);
    setConfigured(res?.configured ?? false);
    setConfigHint(res?.configHint ?? null);
    setLoading(false);
    requestAnimationFrame(() => {
      document.getElementById("otobus-sonuclar")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    void runSearchWith(origin, destination, departDate || undefined, passengers);
    const q = new URLSearchParams();
    if (origin.trim()) q.set("origin", origin.trim());
    if (destination.trim()) q.set("destination", destination.trim());
    if (departDate) q.set("departDate", departDate);
    if (passengers) q.set("adults", passengers);
    const qs = q.toString();
    navigate(qs ? `${TURIZM.stubs.otobus}?${qs}` : TURIZM.stubs.otobus, { replace: true });
  }

  function swapPlaces() {
    const prevOrigin = origin;
    setOrigin(destination);
    setDestination(prevOrigin);
  }

  const needsDestination = searched && destination.trim().length < 2;

  const filterPanel = (
    <div className="bc-travel-filters">
      <h3>Filtreler</h3>
      <label>
        <span>Konfor</span>
        <select value={comfort} onChange={(e) => setComfort(e.target.value as typeof comfort)}>
          <option value="all">Tümü</option>
          <option value="standard">Standart</option>
          <option value="vip">VIP / 2+1</option>
        </select>
      </label>
      <label>
        <span>Güzergah / firma</span>
        <input
          type="text"
          value={routeFilter}
          onChange={(e) => setRouteFilter(e.target.value)}
          placeholder="Firma veya güzergah"
        />
      </label>
    </div>
  );

  const searchWidget = (
    <form className="bc-hub-search bc-hub-search--bus" onSubmit={handleSearch}>
      <div className="bc-hub-search__fields bc-hub-search__fields--bus">
        <div className="bc-hub-search__place">
          <BookingCoreLocationInput
            id="otobus-origin"
            label="Nereden"
            value={origin}
            onChange={setOrigin}
            type="bus"
            placeholder="Ankara"
          />
        </div>
        <button type="button" className="bc-hub-search__swap" onClick={swapPlaces} aria-label="Kalkış ve varışı değiştir">
          <ArrowLeftRight className="w-4 h-4" />
        </button>
        <div className="bc-hub-search__place">
          <BookingCoreLocationInput
            id="otobus-dest"
            label="Nereye"
            value={destination}
            onChange={setDestination}
            type="bus"
            placeholder="İstanbul Avrupa"
          />
        </div>
        <div className="bc-hub-search__field bc-hub-search__field--date">
          <label htmlFor="otobus-date">Gidiş Tarihi</label>
          <input id="otobus-date" type="date" value={departDate} onChange={(e) => setDepartDate(e.target.value)} />
          <div className="bc-hub-search__quick-dates">
            <button type="button" onClick={() => setDepartDate(todayIso())}>
              Bugün
            </button>
            <button type="button" onClick={() => setDepartDate(tomorrowIso())}>
              Yarın
            </button>
          </div>
        </div>
        <button type="submit" className="bc-hub-search__submit">
          Otobüs Ara
        </button>
      </div>
      <label className="bc-hub-search__footer-check">
        <input type="checkbox" checked={includeHotels} onChange={(e) => setIncludeHotels(e.target.checked)} />
        Varış noktasındaki otelleri listele
      </label>
    </form>
  );

  const resultsSection = (
    <>
      <div className="bc-travel-main-head">
        <p className="bc-travel-main-head__count">
          {loading ? "Aranıyor…" : searched ? `${results.length.toLocaleString("tr-TR")} sefer` : "Güzergah seçip arayın"}
        </p>
        <button type="button" className="bc-filter-mobile-btn" onClick={() => setMobileFilters(true)}>
          <SlidersHorizontal className="w-4 h-4" />
          Filtreler
        </button>
      </div>

      <div className="bc-travel-main-layout">
        <div className="bc-travel-filters-desktop">{filterPanel}</div>
        {mobileFilters ? (
          <div className="bc-travel-filters-mobile">
            <div className="bc-travel-filters-mobile__backdrop" onClick={() => setMobileFilters(false)} />
            <div className="bc-travel-filters-mobile__panel">
              <button type="button" className="bc-travel-filters-mobile__close" onClick={() => setMobileFilters(false)}>
                Kapat
              </button>
              {filterPanel}
            </div>
          </div>
        ) : null}

        <div className="bc-travel-main-content">
          {!loading && needsDestination ? (
            <p className="bc-travel-note">Varış şehrini seçin veya en az 2 karakter girin.</p>
          ) : null}
          {!loading && searched && !needsDestination && !configured ? (
            <p className="bc-travel-note">
              {configHint ?? "CollectAPI (COLLECTAPI_KEY) yapılandırılmadı — otobüs fiyatları gösterilemez."}
            </p>
          ) : null}
          {!loading && searched && !needsDestination && configured && results.length === 0 ? (
            <p className="bc-travel-note">Bu rota için sefer bulunamadı.</p>
          ) : null}
          <TurizmBusResultCards results={results} loading={loading} />
          {searchUrl ? (
            <a href={searchUrl} target="_blank" rel="noopener noreferrer sponsored" className="bc-stub__cta">
              Partner sitesinde tüm seferleri gör →
            </a>
          ) : null}
          {includeHotels && destination.trim() ? (
            <Link
              href={`${TURIZM.konaklama.home}?city=${encodeURIComponent(destination.trim())}&checkIn=${departDate}`}
              className="bc-stub__cta bc-stub__cta--secondary"
            >
              Varış noktasındaki otelleri gör →
            </Link>
          ) : null}
          <Link href={TURIZM.hub} className="bc-stub__back">
            ← Seyahat ana sayfa
          </Link>
        </div>
      </div>
    </>
  );

  return (
    <BookingCoreShell module="konaklama">
      <TurizmBusHubPage search={searchWidget} results={resultsSection} showResults={searched || loading} />
    </BookingCoreShell>
  );
}
