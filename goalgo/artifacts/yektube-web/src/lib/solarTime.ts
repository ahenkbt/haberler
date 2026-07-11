/** İstanbul — konum alınamazsa varsayılan */
export const DEFAULT_GEO = { lat: 41.0082, lng: 28.9784 };

export type GeoCoords = { lat: number; lng: number };

/** NOAA tabanlı basit gün doğumu / batımı (dakika hassasiyeti). */
export function getSunriseSunset(coords: GeoCoords, date = new Date()): { sunrise: Date; sunset: Date } {
  const { lat, lng } = coords;
  const rad = Math.PI / 180;
  const day = Math.floor(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 86_400_000,
  );

  const lngHour = lng / 15;
  const t = day + (6 - lngHour) / 24;

  const M = 0.9856 * t - 3.289;
  let L = M + 1.916 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 282.634;
  L = ((L % 360) + 360) % 360;

  let RA = Math.atan(0.91764 * Math.tan(L * rad)) / rad;
  RA = ((RA % 360) + 360) % 360;
  const Lquadrant = Math.floor(L / 90) * 90;
  const RAquadrant = Math.floor(RA / 90) * 90;
  RA = (RA + (Lquadrant - RAquadrant)) / 15;

  const sinDec = 0.39782 * Math.sin(L * rad);
  const cosDec = Math.cos(Math.asin(sinDec));

  const cosH = (Math.cos(90.833 * rad) - sinDec * Math.sin(lat * rad)) / (cosDec * Math.cos(lat * rad));
  const clamped = Math.min(1, Math.max(-1, cosH));
  const H = Math.acos(clamped) / rad;

  const toLocal = (hoursUtc: number) => {
    const utcMs = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const tzOffsetMin = -date.getTimezoneOffset();
    return new Date(utcMs + hoursUtc * 3_600_000 + tzOffsetMin * 60_000);
  };

  const sunrise = toLocal(RA - H - 0.06571 * t - 6.622);
  const sunset = toLocal(RA + H - 0.06571 * t - 6.622);
  return { sunrise, sunset };
}

export function isNightBySun(coords: GeoCoords, now = new Date()): boolean {
  const { sunrise, sunset } = getSunriseSunset(coords, now);
  return now < sunrise || now >= sunset;
}

export function msUntilNextSunTransition(coords: GeoCoords, now = new Date()): number {
  const { sunrise, sunset } = getSunriseSunset(coords, now);
  const next =
    now < sunrise ? sunrise : now < sunset ? sunset : getSunriseSunset(coords, new Date(now.getTime() + 86_400_000)).sunrise;
  return Math.max(1_000, next.getTime() - now.getTime() + 500);
}
