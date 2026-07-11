/**
 * OpenSky Network — normalize / bbox helpers (client-side after /api/map/opensky/states).
 */

export type FlightRegionId = "tr" | "world";

export type OpenSkyAircraft = {
  icao24: string;
  callsign: string | null;
  originCountry: string | null;
  lat: number;
  lng: number;
  headingDeg: number | null;
  onGround: boolean;
  velocityMps: number | null;
  baroAltitudeM: number | null;
};

/** Geniş bbox: Avrupa + Orta Doğu + Kuzey Afrika (OpenSky yükünü sınırlar) */
export const FLIGHT_BBOX: Record<FlightRegionId, { lamin: number; lamax: number; lomin: number; lomax: number }> = {
  tr: { lamin: 35.5, lamax: 42.5, lomin: 25.5, lomax: 45.5 },
  world: { lamin: 30, lamax: 55, lomin: -25, lomax: 55 },
};

/** ICAO → merkez (meydan yoğunluğu / yakın uçuşlar) */
export const TR_AIRPORT_PRESETS: Record<string, { lat: number; lng: number; name: string }> = {
  LTFM: { lat: 41.27533, lng: 28.751944, name: "İstanbul Havalimanı" },
  LTFJ: { lat: 40.898553, lng: 29.309219, name: "Sabiha Gökçen" },
  LTAC: { lat: 40.1281, lng: 32.9951, name: "Ankara Esenboğa" },
  LTAI: { lat: 36.9157, lng: 30.8028, name: "Antalya" },
  LTBJ: { lat: 38.292389, lng: 27.156953, name: "İzmir Adnan Menderes" },
  LTFE: { lat: 37.250889, lng: 27.664208, name: "Bodrum-Milas" },
  LTCG: { lat: 40.995, lng: 39.789722, name: "Trabzon" },
  LTCC: { lat: 37.979167, lng: 40.575556, name: "Diyarbakır" },
};

export function bboxAroundPoint(lat: number, lng: number, padDeg = 1.2): { lamin: number; lamax: number; lomin: number; lomax: number } {
  return {
    lamin: lat - padDeg,
    lamax: lat + padDeg,
    lomin: lng - padDeg,
    lomax: lng + padDeg,
  };
}

export function parseOpenSkyStatesPayload(j: { states?: unknown } | null | undefined): OpenSkyAircraft[] {
  const raw = j?.states;
  if (!Array.isArray(raw)) return [];
  const out: OpenSkyAircraft[] = [];
  for (const row of raw) {
    if (!Array.isArray(row) || row.length < 11) continue;
    const lat = row[6];
    const lng = row[5];
    if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const icao24 = String(row[0] ?? "").trim();
    if (!icao24) continue;
    const callsignRaw = row[1];
    const callsign = typeof callsignRaw === "string" ? callsignRaw.trim() || null : null;
    const origin = row[2];
    const onGround = row[8] === true;
    const vel = row[9];
    const track = row[10];
    const baro = row[7];
    out.push({
      icao24,
      callsign,
      originCountry: typeof origin === "string" ? origin : null,
      lat,
      lng,
      headingDeg: typeof track === "number" && Number.isFinite(track) ? track : null,
      onGround,
      velocityMps: typeof vel === "number" && Number.isFinite(vel) ? vel : null,
      baroAltitudeM: typeof baro === "number" && Number.isFinite(baro) ? baro : null,
    });
  }
  return out;
}

export function filterByOperator(rows: OpenSkyAircraft[], operator: string): OpenSkyAircraft[] {
  const q = operator.trim().toUpperCase();
  if (!q) return rows;
  return rows.filter((a) => (a.callsign ?? "").toUpperCase().includes(q));
}
