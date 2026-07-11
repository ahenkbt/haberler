const MAX_HOMEPAGE_DESIGN_BYTES = 120_000;

export function validateHomepageDesignJsonInput(
  raw: string | null,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (raw === null) return { ok: true, value: null };
  const s = String(raw).trim();
  if (s === "") return { ok: true, value: null };
  if (s.length > MAX_HOMEPAGE_DESIGN_BYTES) {
    return { ok: false, error: "homepageDesignJson çok büyük" };
  }
  try {
    const data = JSON.parse(s) as unknown;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return { ok: false, error: "homepageDesignJson bir nesne olmalıdır" };
    }
    const version = (data as { version?: unknown }).version;
    if (version !== undefined && version !== 1) {
      return { ok: false, error: "homepageDesignJson version yalnızca 1 olabilir" };
    }
    return { ok: true, value: JSON.stringify(data) };
  } catch {
    return { ok: false, error: "homepageDesignJson geçerli JSON değil" };
  }
}
