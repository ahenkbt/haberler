import axios from "axios";

/**
 * Güncel USD→TRY kuru (Frankfurter ECB verisi, ücretsiz).
 * Başarısızsa null.
 */
export async function fetchUsdTryRateFromFrankfurter(): Promise<number | null> {
  try {
    const { data } = await axios.get<{ rates?: { TRY?: number } }>(
      "https://api.frankfurter.app/latest?from=USD&to=TRY",
      { timeout: 12000, validateStatus: (s) => s === 200 },
    );
    const r = data?.rates?.TRY;
    if (typeof r !== "number" || !Number.isFinite(r) || r <= 0) return null;
    return Math.round(r * 1e6) / 1e6;
  } catch {
    return null;
  }
}
