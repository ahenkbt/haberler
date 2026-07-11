import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeftRight, SlidersHorizontal } from "lucide-react";
import { BookingCoreShell } from "../BookingCoreShell";
import { BookingCoreFlightPlaceInput } from "../components/BookingCoreFlightPlaceInput";
import { TurizmFlightResultCards } from "../components/TurizmTravelResultCards";
import { TurizmFlightHubPage } from "@/themes/turizm/TurizmFlightHubPage";
import { TURIZM } from "@/themes/turizm/turizmRoutes";
import { fetchFlightResults, type FlightResult } from "../lib/travelpayouts";
import "@/styles/bookingCoreTurizm.css";

function defaultDepartDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

type TripType = "one-way" | "round-trip" | "multi";

export function UcusHome() {
  const [, navigate] = useLocation();
  const [originLabel, setOriginLabel] = useState("İstanbul (IST)");
  const [originIata, setOriginIata] = useState("IST");
  const [destLabel, setDestLabel] = useState("");
  const [destIata, setDestIata] = useState("");
  const [departDate, setDepartDate] = useState(defaultDepartDate);
  const [returnDate, setReturnDate] = useState("");
  const [tripType, setTripType] = useState<TripType>("round-trip");
  const [directOnly, setDirectOnly] = useState(false);
  const [includeHotels, setIncludeHotels] = useState(false);
  const [passengers, setPassengers] = useState("2");
  const [cabinClass, setCabinClass] = useState<"economy" | "business">("economy");
  const [transferFilter, setTransferFilter] = useState<"all" | "direct" | "connecting">("all");
  const [results, setResults] = useState<FlightResult[]>([]);
  const [rawResults, setRawResults] = useState<FlightResult[]>([]);
  const [searchUrl, setSearchUrl] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);
  const [configHint, setConfigHint] = useState<string | null>(null);
  const [priceSource, setPriceSource] = useState<"travelpayouts" | "collectapi" | "mixed" | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [paxOpen, setPaxOpen] = useState(false);

  const roundTrip = tripType === "round-trip";

  useEffect(() => {
    const qs = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const o = qs.get("origin")?.trim().toUpperCase();
    const d = qs.get("destination")?.trim().toUpperCase();
    const dep = qs.get("departDate")?.trim();
    const ret = qs.get("returnDate")?.trim();
    const pax = qs.get("adults")?.trim();
    if (o) {
      setOriginIata(o);
      setOriginLabel(o);
    }
    if (d) {
      setDestIata(d);
      setDestLabel(d);
    }
    if (dep) setDepartDate(dep);
    if (ret) {
      setReturnDate(ret);
      setTripType("round-trip");
    }
    if (pax) setPassengers(pax);
    if (o && d && o.length === 3 && d.length === 3) {
      void runSearchWith(o, d, dep || undefined, ret || undefined, pax || "2");
    }
  }, []);

  useEffect(() => {
    setTransferFilter(directOnly ? "direct" : "all");
  }, [directOnly]);

  useEffect(() => {
    let next = rawResults;
    if (transferFilter === "direct") next = next.filter((f) => f.transfers === 0);
    if (transferFilter === "connecting") next = next.filter((f) => f.transfers != null && f.transfers > 0);
    setResults(next);
  }, [rawResults, transferFilter]);

  async function runSearchWith(oRaw: string, dRaw: string, dep?: string, ret?: string, pax = passengers) {
    const o = oRaw.trim().toUpperCase();
    const d = dRaw.trim().toUpperCase();
    if (o.length < 3 || d.length < 3) {
      setSearched(true);
      return;
    }
    setLoading(true);
    setSearched(true);
    const res = await fetchFlightResults({
      origin: o,
      destination: d,
      departDate: dep,
      returnDate: ret,
      adults: pax,
    });
    setRawResults(res?.flights ?? []);
    setSearchUrl(res?.affiliateUrl ?? null);
    setConfigured(res?.configured ?? false);
    setConfigHint(res?.configHint ?? null);
    setPriceSource(res?.source ?? null);
    setLoading(false);
    requestAnimationFrame(() => {
      document.getElementById("ucus-sonuclar")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    if (tripType === "multi") return;
    const o = (originIata || originLabel).slice(0, 3).toUpperCase();
    const d = (destIata || destLabel).slice(0, 3).toUpperCase();
    const ret = roundTrip ? returnDate || undefined : undefined;
    void runSearchWith(o, d, departDate || undefined, ret, passengers);
    const q = new URLSearchParams();
    if (o.length === 3) q.set("origin", o);
    if (d.length === 3) q.set("destination", d);
    if (departDate) q.set("departDate", departDate);
    if (roundTrip && returnDate) q.set("returnDate", returnDate);
    if (passengers) q.set("adults", passengers);
    const qs = q.toString();
    navigate(qs ? `${TURIZM.stubs.ucus}?${qs}` : TURIZM.stubs.ucus, { replace: true });
  }

  function swapPlaces() {
    setOriginLabel(destLabel);
    setOriginIata(destIata);
    setDestLabel(originLabel);
    setDestIata(originIata);
  }

  const needsDestination = searched && destIata.length < 3 && destLabel.trim().length < 3;
  const resultCount = results.length;
  const paxCabinLabel = `${passengers} Yolcu / ${cabinClass === "business" ? "Business" : "Ekonomi"}`;

  const filterPanel = (
    <div className="bc-travel-filters">
      <h3>Filtreler</h3>
      <label>
        <span>Aktarma</span>
        <select value={transferFilter} onChange={(e) => setTransferFilter(e.target.value as typeof transferFilter)}>
          <option value="all">Tümü</option>
          <option value="direct">Direkt uçuş</option>
          <option value="connecting">Aktarmalı</option>
        </select>
      </label>
      <label>
        <span>Sınıf</span>
        <select value={cabinClass} onChange={(e) => setCabinClass(e.target.value as typeof cabinClass)}>
          <option value="economy">Ekonomi</option>
          <option value="business">Business</option>
        </select>
      </label>
      <p className="bc-travel-filters__note">Sınıf seçimi partner sitesinde uygulanır.</p>
    </div>
  );

  const searchWidget = (
    <form className="bc-hub-search bc-hub-search--flight" onSubmit={handleSearch}>
      <div className="bc-hub-search__tab-row">
        <span className="bc-hub-search__tab bc-hub-search__tab--active">Uçak Bileti</span>
        <Link href={TURIZM.stubs.servis} className="bc-hub-search__tab">
          VIP Transfer
        </Link>
        <Link href={TURIZM.konaklama.home} className="bc-hub-search__tab">
          Otel
        </Link>
      </div>

      <div className="bc-hub-search__controls">
        <div className="bc-hub-search__radios" role="radiogroup" aria-label="Uçuş tipi">
          {(
            [
              ["one-way", "Tek yön"],
              ["round-trip", "Gidiş-dönüş"],
              ["multi", "Çoklu uçuş"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="bc-hub-search__radio">
              <input
                type="radio"
                name="tripType"
                value={value}
                checked={tripType === value}
                onChange={() => setTripType(value)}
              />
              {label}
            </label>
          ))}
        </div>
        <label className="bc-hub-search__checkbox">
          <input type="checkbox" checked={directOnly} onChange={(e) => setDirectOnly(e.target.checked)} />
          Aktarmasız
        </label>
      </div>

      {tripType === "multi" ? (
        <p className="bc-hub-search__multi-note">Çoklu uçuş araması yakında. Şimdilik tek yön veya gidiş-dönüş seçin.</p>
      ) : null}

      <div className="bc-hub-search__fields">
        <div className="bc-hub-search__place bc-hub-search__place--from">
          <BookingCoreFlightPlaceInput
            id="ucus-origin"
            label="Nereden"
            value={originLabel}
            iata={originIata}
            onChange={(label, code) => {
              setOriginLabel(label);
              setOriginIata(code);
            }}
            placeholder="Kalkış havalimanı"
          />
        </div>
        <button type="button" className="bc-hub-search__swap" onClick={swapPlaces} aria-label="Kalkış ve varışı değiştir">
          <ArrowLeftRight className="w-4 h-4" />
        </button>
        <div className="bc-hub-search__place bc-hub-search__place--to">
          <BookingCoreFlightPlaceInput
            id="ucus-dest"
            label="Nereye"
            value={destLabel}
            iata={destIata}
            onChange={(label, code) => {
              setDestLabel(label);
              setDestIata(code);
            }}
            placeholder="Varış havalimanı"
            icon="🛬"
          />
        </div>
        <div className="bc-hub-search__field">
          <label htmlFor="ucus-depart">Gidiş Tarihi</label>
          <input id="ucus-depart" type="date" value={departDate} onChange={(e) => setDepartDate(e.target.value)} />
        </div>
        {roundTrip ? (
          <div className="bc-hub-search__field">
            <label htmlFor="ucus-return">Dönüş</label>
            <input
              id="ucus-return"
              type="date"
              value={returnDate}
              min={departDate}
              onChange={(e) => setReturnDate(e.target.value)}
              placeholder="Dönüş ekle"
            />
          </div>
        ) : (
          <button
            type="button"
            className="bc-hub-search__add-return"
            onClick={() => {
              setTripType("round-trip");
              if (!returnDate) {
                const d = new Date(departDate);
                d.setDate(d.getDate() + 7);
                setReturnDate(d.toISOString().slice(0, 10));
              }
            }}
          >
            Dönüş Ekle
          </button>
        )}
        <div className="bc-hub-search__field bc-hub-search__field--pax">
          <label htmlFor="ucus-pax-trigger">Yolcu / Kabin</label>
          <button
            id="ucus-pax-trigger"
            type="button"
            className="bc-hub-search__pax-trigger"
            onClick={() => setPaxOpen((v) => !v)}
            aria-expanded={paxOpen}
          >
            {paxCabinLabel}
          </button>
          {paxOpen ? (
            <div className="bc-hub-search__pax-panel">
              <label htmlFor="ucus-pax">
                Yolcu
                <select id="ucus-pax" value={passengers} onChange={(e) => setPassengers(e.target.value)}>
                  {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                    <option key={n} value={n}>
                      {n} yolcu
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor="ucus-class">
                Kabin
                <select id="ucus-class" value={cabinClass} onChange={(e) => setCabinClass(e.target.value as typeof cabinClass)}>
                  <option value="economy">Ekonomi</option>
                  <option value="business">Business</option>
                </select>
              </label>
              <button type="button" className="bc-hub-search__pax-done" onClick={() => setPaxOpen(false)}>
                Tamam
              </button>
            </div>
          ) : null}
        </div>
        <button type="submit" className="bc-hub-search__submit" disabled={tripType === "multi"}>
          Ucuz bilet bul &gt;
        </button>
      </div>

      <label className="bc-hub-search__footer-check">
        <input type="checkbox" checked={includeHotels} onChange={(e) => setIncludeHotels(e.target.checked)} />
        Bu tarihler için otelleri de listele
      </label>
    </form>
  );

  const resultsSection = (
    <>
      <div className="bc-travel-main-head">
        <p className="bc-travel-main-head__count">
          {loading ? "Aranıyor…" : searched ? `${resultCount.toLocaleString("tr-TR")} uçuş` : "Rota seçip arayın"}
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
            <p className="bc-travel-note">Varış havalimanı seçin veya IATA kodu girin (örn. AYT, CDG).</p>
          ) : null}
          {!loading && searched && !needsDestination && !configured ? (
            <p className="bc-travel-note">
              {configHint ??
                "Travelpayouts veya CollectAPI yapılandırılmadı. Aviasales'te aramaya devam edebilirsiniz."}
            </p>
          ) : null}
          {!loading && searched && !needsDestination && configured && configHint ? (
            <p className="bc-travel-note bc-travel-note--muted">{configHint}</p>
          ) : null}
          {!loading && searched && !needsDestination && configured && resultCount === 0 ? (
            <p className="bc-travel-note">Bu rota için sonuç bulunamadı. Filtreleri gevşetin veya partner sitesine bakın.</p>
          ) : null}
          <TurizmFlightResultCards results={results} loading={loading} source={priceSource} />
          {searchUrl ? (
            <a href={searchUrl} target="_blank" rel="noopener noreferrer sponsored" className="bc-stub__cta">
              Aviasales&apos;te tüm uçuşları gör →
            </a>
          ) : null}
          {includeHotels && departDate ? (
            <Link
              href={`${TURIZM.konaklama.home}?checkIn=${departDate}${roundTrip && returnDate ? `&checkOut=${returnDate}` : ""}&guests=${passengers}`}
              className="bc-stub__cta bc-stub__cta--secondary"
            >
              Otelleri listele →
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
      <TurizmFlightHubPage search={searchWidget} results={resultsSection} showResults={searched || loading} />
    </BookingCoreShell>
  );
}
