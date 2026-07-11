import type { FlightRegionId, OpenSkyAircraft } from "../../lib/opensky";
import { TR_AIRPORT_PRESETS } from "../../lib/opensky";

export type FlightTrafficPanelProps = {
  variant: "mobile" | "desktop";
  flightRegion: FlightRegionId;
  setFlightRegion: (r: FlightRegionId) => void;
  flightOperatorFilter: string;
  setFlightOperatorFilter: (s: string) => void;
  flightAirportIcao: string;
  setFlightAirportIcao: (s: string) => void;
  hideOnGround: boolean;
  setHideOnGround: (v: boolean) => void;
  flightRows: OpenSkyAircraft[];
  flightLoading: boolean;
  flightError: string | null;
  flightLastUpdate: Date | null;
  onRefresh: () => void;
  onSelectAircraft: (a: OpenSkyAircraft) => void;
};

export function FlightTrafficPanel(props: FlightTrafficPanelProps) {
  const {
    variant,
    flightRegion,
    setFlightRegion,
    flightOperatorFilter,
    setFlightOperatorFilter,
    flightAirportIcao,
    setFlightAirportIcao,
    hideOnGround,
    setHideOnGround,
    flightRows,
    flightLoading,
    flightError,
    flightLastUpdate,
    onRefresh,
    onSelectAircraft,
  } = props;

  const pad = variant === "desktop" ? "p-2.5" : "px-3 py-2";
  const titleCls = variant === "desktop" ? "text-xs font-bold text-slate-800" : "text-[11px] font-bold text-slate-800";

  return (
    <div className={`space-y-2 ${pad}`}>
      <div className="rounded-xl border border-sky-200 bg-gradient-to-b from-sky-50 to-white p-2.5 space-y-2">
        <p className={titleCls}>Canlı hava trafiği · OpenSky Network</p>
        <p className="text-[10px] text-slate-600 leading-snug">
          Uçuş çağrı kodu, ülke ve irtifa bilgisi. Veri gecikmeli olabilir; anonim API kotası uygulanabilir.
        </p>
        <div className={variant === "mobile" ? "flex flex-col gap-2" : "grid grid-cols-2 gap-1.5"}>
          <button
            type="button"
            onClick={() => setFlightRegion("tr")}
            className={`rounded-xl font-bold ${variant === "mobile" ? "w-full py-2.5 text-xs" : "rounded-lg px-2 py-1.5 text-[10px]"}`}
            style={flightRegion === "tr" ? { background: "#0369a1", color: "#fff" } : { background: "#e0f2fe", color: "#0c4a6e" }}
          >
            Türkiye & çevre
          </button>
          <button
            type="button"
            onClick={() => setFlightRegion("world")}
            className={`rounded-xl font-bold ${variant === "mobile" ? "w-full py-2.5 text-xs" : "rounded-lg px-2 py-1.5 text-[10px]"}`}
            style={flightRegion === "world" ? { background: "#0369a1", color: "#fff" } : { background: "#e0f2fe", color: "#0c4a6e" }}
          >
            Avrupa / MENA
          </button>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-600">Operatör / çağrı kodu süzgeci</label>
          <input
            value={flightOperatorFilter}
            onChange={(e) => setFlightOperatorFilter(e.target.value)}
            placeholder="örn. THY, PGT, SunExpress"
            className="mt-0.5 w-full rounded-lg px-2 py-1.5 text-[11px] border border-sky-200 bg-white text-slate-800"
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-600">Meydan (ICAO) — yakın uçuşlar</label>
          <select
            value={flightAirportIcao}
            onChange={(e) => setFlightAirportIcao(e.target.value)}
            className="mt-0.5 w-full rounded-lg px-2 py-1.5 text-[11px] border border-sky-200 bg-white text-slate-800"
          >
            <option value="">Tümü (bölge kutusu)</option>
            {Object.entries(TR_AIRPORT_PRESETS).map(([code, a]) => (
              <option key={code} value={code}>
                {code} — {a.name}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-700">
          <input type="checkbox" checked={hideOnGround} onChange={(e) => setHideOnGround(e.target.checked)} />
          Yerdeki uçakları gizle
        </label>
        <button
          type="button"
          onClick={onRefresh}
          disabled={flightLoading}
          className="w-full rounded-lg px-2 py-2 text-[11px] font-bold text-white disabled:opacity-60"
          style={{ background: "linear-gradient(135deg,#0284c7,#0369a1)" }}
        >
          {flightLoading ? "Yenileniyor…" : "Haritayı yenile"}
        </button>
        {flightError && (
          <p className="text-[10px] text-red-700 bg-red-50 border border-red-100 rounded-lg px-2 py-1">{flightError}</p>
        )}
        {flightLastUpdate && (
          <p className="text-[9px] text-slate-500">
            Son güncelleme: {flightLastUpdate.toLocaleString("tr-TR")}
          </p>
        )}
      </div>
      <div className="max-h-[42vh] overflow-y-auto space-y-1 pr-0.5" style={{ scrollbarWidth: "thin" }}>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Uçuşlar ({flightRows.length})</p>
        {flightRows.slice(0, 120).map((a) => (
          <button
            key={a.icao24}
            type="button"
            onClick={() => onSelectAircraft(a)}
            className="w-full text-left rounded-lg px-2 py-1.5 border border-slate-200 bg-white hover:bg-sky-50/80 transition-colors"
          >
            <p className="text-[12px] font-semibold text-slate-900 leading-tight">
              {(a.callsign || "—").trim() || a.icao24}
              <span className="text-[10px] font-normal text-slate-500"> · {a.icao24}</span>
            </p>
            <p className="text-[10px] text-slate-600 mt-0.5">
              {a.onGround ? "Yerde" : "Havada"}
              {a.baroAltitudeM != null ? ` · ${Math.round(a.baroAltitudeM)} m` : ""}
              {a.velocityMps != null ? ` · ${Math.round(a.velocityMps * 3.6)} km/h` : ""}
              {a.originCountry ? ` · ${a.originCountry}` : ""}
            </p>
          </button>
        ))}
        {flightRows.length === 0 && !flightLoading && (
          <p className="text-[11px] text-slate-500 py-4 text-center">Bu bölgede uçuş verisi yok veya süzgeç eşleşmedi.</p>
        )}
      </div>
    </div>
  );
}

export function MobilityComingSoonPanel({ title, blurb }: { title: string; blurb: string }) {
  return (
    <div className="px-3 py-6 flex flex-col items-center text-center gap-2">
      <div className="text-3xl">🚧</div>
      <p className="text-sm font-bold text-slate-800">{title}</p>
      <p className="text-[11px] text-slate-600 leading-relaxed max-w-xs">{blurb}</p>
      <p className="text-[10px] text-indigo-600 font-semibold">Yakında · AIS / GTFS-RT entegrasyonu</p>
    </div>
  );
}
