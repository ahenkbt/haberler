import { useCallback, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { fetchGooglePlacePredictions } from "@/lib/mapsPlacePredictions";
import { effectiveMapsGeocodeSettings } from "@/lib/mapsGeocode";
import { TURIZM } from "@/themes/turizm/turizmRoutes";
import { BC_SEARCH_TABS, tourismSearchPath } from "../lib/listingRoutes";
import { useTourismCities } from "../hooks/useTourismListings";
import { fetchTravelPlaces, type TravelPlace } from "../lib/travelpayouts";

function defaultCheckIn(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

function defaultCheckOut(): string {
  const d = new Date();
  d.setDate(d.getDate() + 8);
  return d.toISOString().slice(0, 10);
}

export function BookingCoreHeroSearch({
  onLocationPick,
  defaultTab = "hotel",
}: {
  /** Konum önerisi seçildiğinde (landing carousel vb. için anlık filtre). */
  onLocationPick?: (city: string) => void;
  defaultTab?: string;
} = {}) {
  const [, navigate] = useLocation();
  const { data: siteSettings } = useGetSiteSettings();
  const mapsGeo = effectiveMapsGeocodeSettings(siteSettings ?? null);

  const [tab, setTab] = useState<string>(defaultTab);
  const { cities: tourismCities } = useTourismCities(tab === "villa" || tab === "space" ? "villa" : tab);
  const [location, setLocation] = useState("");
  const [city, setCity] = useState("");
  const [origin, setOrigin] = useState("");
  const [originIata, setOriginIata] = useState("IST");
  const [destination, setDestination] = useState("");
  const [destIata, setDestIata] = useState("");
  const [flightField, setFlightField] = useState<"origin" | "destination" | null>(null);
  const [flightPassengers, setFlightPassengers] = useState("1");
  const [roundTrip, setRoundTrip] = useState(true);
  const [checkIn, setCheckIn] = useState(defaultCheckIn);
  const [checkOut, setCheckOut] = useState(defaultCheckOut);
  const [guests, setGuests] = useState("2");
  const [adults, setAdults] = useState("1");
  const [children, setChildren] = useState("0");
  const [suggestions, setSuggestions] = useState<{ id: string; label: string }[]>([]);
  const [flightSuggestions, setFlightSuggestions] = useState<TravelPlace[]>([]);
  const [sugOpen, setSugOpen] = useState(false);
  const sugTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sugRun = useRef(0);
  const flightSugRun = useRef(0);

  const showCityPicker = useCallback(
    (raw: string) => {
      const q = raw.trim();
      if (q.length >= 2) return;
      setSuggestions(
        tourismCities.slice(0, 10).map((name) => ({
          id: `city_${name}`,
          label: name,
        })),
      );
      setSugOpen(true);
    },
    [tourismCities],
  );

  const scheduleSuggest = useCallback(
    (raw: string) => {
      if (sugTimer.current) clearTimeout(sugTimer.current);
      const q = raw.trim();
      setLocation(raw);
      if (q.length < 2) {
        showCityPicker(raw);
        return;
      }
      sugTimer.current = setTimeout(() => {
        const runId = ++sugRun.current;
        void (async () => {
          let server: { id: string; label: string }[] = [];
          try {
            const r = await fetch(`/api/location-suggest?q=${encodeURIComponent(q)}`);
            const d = await r.json();
            if (d.success && Array.isArray(d.data)) {
              server = d.data.map((x: { id: string; label: string }) => ({
                id: String(x.id),
                label: x.label,
              }));
            }
          } catch {
            /* ignore */
          }
          const gRows =
            mapsGeo.mapsGoogleEnabled && (mapsGeo.mapsGoogleBrowserKey ?? "").trim()
              ? await fetchGooglePlacePredictions(siteSettings ?? null, q)
              : [];
          if (runId !== sugRun.current) return;
          setSuggestions(
            [
              ...gRows.map((g) => ({ id: `g_${g.place_id}`, label: g.description })),
              ...server,
            ].slice(0, 8),
          );
        })();
      }, 220);
    },
    [siteSettings, mapsGeo.mapsGoogleBrowserKey, mapsGeo.mapsGoogleEnabled, showCityPicker],
  );

  function pickSuggestion(label: string) {
    const pickedCity = label.split(",")[0]?.trim() || label;
    setLocation(label);
    setCity(pickedCity);
    onLocationPick?.(pickedCity);
    setSuggestions([]);
    setSugOpen(false);
  }

  const scheduleFlightSuggest = useCallback((field: "origin" | "destination", raw: string) => {
    if (sugTimer.current) clearTimeout(sugTimer.current);
    setFlightField(field);
    if (field === "origin") {
      setOrigin(raw);
      setOriginIata(raw.trim().length === 3 ? raw.trim().toUpperCase() : "");
    } else {
      setDestination(raw);
      setDestIata(raw.trim().length === 3 ? raw.trim().toUpperCase() : "");
    }
    const q = raw.trim();
    if (q.length < 2) {
      setFlightSuggestions([]);
      setSugOpen(false);
      return;
    }
    sugTimer.current = setTimeout(() => {
      const runId = ++flightSugRun.current;
      void fetchTravelPlaces(q).then((rows) => {
        if (runId !== flightSugRun.current) return;
        setFlightSuggestions(rows.slice(0, 8));
        setSugOpen(rows.length > 0);
      });
    }, 220);
  }, []);

  function pickFlightPlace(field: "origin" | "destination", place: TravelPlace) {
    const label = place.code ? `${place.name} (${place.code})` : place.name;
    const iata = (place.code ?? "").trim().toUpperCase();
    if (field === "origin") {
      setOrigin(label);
      if (iata) setOriginIata(iata);
    } else {
      setDestination(label);
      if (iata) setDestIata(iata);
    }
    setFlightSuggestions([]);
    setSugOpen(false);
    setFlightField(null);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (tab === "flight") {
      const o = (originIata || origin.trim()).slice(0, 3).toUpperCase();
      const d = (destIata || destination.trim()).slice(0, 3).toUpperCase();
      const q = new URLSearchParams();
      if (o.length === 3) q.set("origin", o);
      if (d.length === 3) q.set("destination", d);
      if (checkIn) q.set("departDate", checkIn);
      if (roundTrip && checkOut) q.set("returnDate", checkOut);
      if (flightPassengers) q.set("adults", flightPassengers);
      const qs = q.toString();
      navigate(qs ? `${TURIZM.stubs.ucus}?${qs}` : TURIZM.stubs.ucus);
      return;
    }
    const base = tourismSearchPath(tab);
    const q = new URLSearchParams();
    const loc = city || location.trim();
    if (loc) q.set("city", loc);
    if (checkIn) q.set("checkIn", checkIn);
    if (checkOut) q.set("checkOut", checkOut);
    if (tab === "hotel" || tab === "villa") {
      q.set("guests", guests);
    } else if (tab === "tour") {
      q.set("guests", adults);
    }
    const qs = q.toString();
    navigate(qs ? `${base}?${qs}` : base);
  }

  const showDates = ["hotel", "villa", "car", "boat", "space"].includes(tab);
  const isFlight = tab === "flight";
  const showGuestsHotel = tab === "hotel" || tab === "villa";
  const showGuestsTour = tab === "tour";

  return (
    <div className="bc-hero-search">
      <div className="bc-hero-search__tabs" role="tablist" aria-label="Arama kategorisi">
        {BC_SEARCH_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`bc-hero-search__tab${tab === t.key ? " bc-hero-search__tab--active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            <span aria-hidden>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <form className="bc-hero-search__form" onSubmit={handleSearch}>
        {isFlight ? (
          <>
            <div className="bc-hero-search__field bc-hero-search__field--grow">
              <label htmlFor="bc-origin">Nereden</label>
              <div className="bc-hero-search__input-wrap">
                <span className="bc-hero-search__icon" aria-hidden>
                  ✈️
                </span>
                <input
                  id="bc-origin"
                  type="text"
                  value={origin}
                  placeholder="Kalkış şehri veya havalimanı (örn. İstanbul)"
                  autoComplete="off"
                  onFocus={() => setFlightField("origin")}
                  onBlur={() => setTimeout(() => setSugOpen(false), 180)}
                  onChange={(e) => scheduleFlightSuggest("origin", e.target.value)}
                />
                {sugOpen && flightField === "origin" && flightSuggestions.length > 0 ? (
                  <ul className="bc-hero-search__suggest">
                    {flightSuggestions.map((p, i) => (
                      <li key={`o-${p.code ?? p.name}-${i}`}>
                        <button type="button" onMouseDown={() => pickFlightPlace("origin", p)}>
                          {p.name}
                          {p.code ? ` (${p.code})` : ""}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
            <div className="bc-hero-search__field bc-hero-search__field--grow">
              <label htmlFor="bc-dest">Nereye</label>
              <div className="bc-hero-search__input-wrap">
                <span className="bc-hero-search__icon" aria-hidden>
                  📍
                </span>
                <input
                  id="bc-dest"
                  type="text"
                  value={destination}
                  placeholder="Varış şehri veya havalimanı (örn. Antalya)"
                  autoComplete="off"
                  onFocus={() => setFlightField("destination")}
                  onBlur={() => setTimeout(() => setSugOpen(false), 180)}
                  onChange={(e) => scheduleFlightSuggest("destination", e.target.value)}
                />
                {sugOpen && flightField === "destination" && flightSuggestions.length > 0 ? (
                  <ul className="bc-hero-search__suggest">
                    {flightSuggestions.map((p, i) => (
                      <li key={`d-${p.code ?? p.name}-${i}`}>
                        <button type="button" onMouseDown={() => pickFlightPlace("destination", p)}>
                          {p.name}
                          {p.code ? ` (${p.code})` : ""}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </>
        ) : (
          <div className="bc-hero-search__field bc-hero-search__field--grow">
            <label htmlFor="bc-loc">Konum</label>
            <div className="bc-hero-search__input-wrap">
              <span className="bc-hero-search__icon" aria-hidden>
                📍
              </span>
              <input
                id="bc-loc"
                type="text"
                value={location}
                placeholder="Nereye gidiyorsunuz?"
                autoComplete="off"
                onFocus={() => showCityPicker(location)}
                onBlur={() => setTimeout(() => setSugOpen(false), 180)}
                onChange={(e) => scheduleSuggest(e.target.value)}
              />
              {sugOpen && suggestions.length > 0 ? (
                <ul className="bc-hero-search__suggest">
                  {suggestions.map((s) => (
                    <li key={s.id}>
                      <button type="button" onMouseDown={() => pickSuggestion(s.label)}>
                        {s.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        )}

        {isFlight ? (
          <>
            <div className="bc-hero-search__field">
              <label htmlFor="bc-depart">Gidiş tarihi</label>
              <input id="bc-depart" type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div className="bc-hero-search__field">
              <label htmlFor="bc-roundtrip">Dönüş?</label>
              <select
                id="bc-roundtrip"
                value={roundTrip ? "yes" : "no"}
                onChange={(e) => setRoundTrip(e.target.value === "yes")}
              >
                <option value="yes">Evet</option>
                <option value="no">Hayır</option>
              </select>
            </div>
            {roundTrip ? (
              <div className="bc-hero-search__field">
                <label htmlFor="bc-return">Dönüş tarihi</label>
                <input
                  id="bc-return"
                  type="date"
                  value={checkOut}
                  min={checkIn}
                  onChange={(e) => setCheckOut(e.target.value)}
                />
              </div>
            ) : null}
            <div className="bc-hero-search__field">
              <label htmlFor="bc-flight-pax">Kişi</label>
              <select id="bc-flight-pax" value={flightPassengers} onChange={(e) => setFlightPassengers(e.target.value)}>
                {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                  <option key={n} value={n}>
                    {n} kişi
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : null}

        {showDates ? (
          <>
            <div className="bc-hero-search__field">
              <label htmlFor="bc-in">Giriş</label>
              <input id="bc-in" type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div className="bc-hero-search__field">
              <label htmlFor="bc-out">Çıkış</label>
              <input id="bc-out" type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
          </>
        ) : null}

        {showGuestsHotel ? (
          <div className="bc-hero-search__field">
            <label htmlFor="bc-guests">Misafirler</label>
            <select id="bc-guests" value={guests} onChange={(e) => setGuests(e.target.value)}>
              {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                <option key={n} value={n}>
                  {n} kişi
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {showGuestsTour ? (
          <>
            <div className="bc-hero-search__field">
              <label htmlFor="bc-adults">Yetişkin</label>
              <select id="bc-adults" value={adults} onChange={(e) => setAdults(e.target.value)}>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="bc-hero-search__field">
              <label htmlFor="bc-child">Çocuk</label>
              <select id="bc-child" value={children} onChange={(e) => setChildren(e.target.value)}>
                {[0, 1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : null}

        <button type="submit" className="bc-hero-search__submit">
          Ara
        </button>
      </form>

      <p className="bc-hero-search__hint">
        <a href={TURIZM.hub}>Yekpare Seyahat</a> — otel, villa, tur ve ulaşım tek aramada
      </p>
    </div>
  );
}
