const MAX_AHENK_AGENCY_JSON_BYTES = 400_000;

export function validateAhenkAgencyJsonInput(
  raw: string | null,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (raw === null) return { ok: true, value: null };
  const s = String(raw).trim();
  if (s === "") return { ok: true, value: null };
  if (s.length > MAX_AHENK_AGENCY_JSON_BYTES) {
    return { ok: false, error: "ahenkAgencyJson çok büyük" };
  }
  try {
    const data = JSON.parse(s) as unknown;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return { ok: false, error: "ahenkAgencyJson bir nesne olmalıdır" };
    }
    return { ok: true, value: JSON.stringify(data) };
  } catch {
    return { ok: false, error: "ahenkAgencyJson geçerli JSON değil" };
  }
}
