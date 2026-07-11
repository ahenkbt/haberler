/** Türkiye il adından tam ilçe listesi — tr-address (tr_ilce + turkiyeapi yedek). */

function normalizeTrKey(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

type TrProvinceRow = { plaka?: number | string; adi?: string };
type TrDistrictRow = { adi?: string };

export async function fetchTurkeyCityDistrictNames(
  apiBase: string,
  cityName: string,
): Promise<string[]> {
  const city = String(cityName ?? "").trim();
  if (!city) return [];

  const provincesRes = await fetch(`${apiBase}/tr-address/provinces`, { cache: "no-store" });
  if (!provincesRes.ok) return [];
  const provinces = (await provincesRes.json()) as TrProvinceRow[];
  if (!Array.isArray(provinces)) return [];

  const cityKey = normalizeTrKey(city);
  const province = provinces.find((row) => normalizeTrKey(String(row.adi ?? "")) === cityKey);
  const plaka = province?.plaka;
  if (plaka == null || String(plaka).trim() === "") return [];

  const districtsRes = await fetch(
    `${apiBase}/tr-address/districts?plaka=${encodeURIComponent(String(plaka))}`,
    { cache: "no-store" },
  );
  if (!districtsRes.ok) return [];
  const districts = (await districtsRes.json()) as TrDistrictRow[];
  if (!Array.isArray(districts)) return [];

  return districts
    .map((row) => String(row.adi ?? "").trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "tr"));
}
