export type HotelRules = {
  checkIn: string;
  checkOut: string;
  policies: { label: string; value: string }[];
};

const DEFAULT_POLICIES: { label: string; value: string }[] = [
  { label: "İptal", value: "Girişten 48 saat öncesine kadar ücretsiz iptal." },
  { label: "Evcil hayvan", value: "Küçük evcil hayvanlar talep üzerine kabul edilebilir." },
  { label: "Çocuk", value: "0–6 yaş arası çocuklar ücretsiz (ek yatak talebi ile)." },
  { label: "Sigara", value: "Kapalı alanlarda sigara içilmez." },
];

function pickFeature(features: Record<string, string> | undefined, keys: string[]): string | null {
  if (!features) return null;
  for (const k of keys) {
    const v = features[k]?.trim();
    if (v) return v;
  }
  return null;
}

function pickExtra(extra: Record<string, string> | undefined, keys: string[]): string | null {
  if (!extra) return null;
  for (const k of keys) {
    const v = extra[k]?.trim();
    if (v) return v;
  }
  return null;
}

/** Otel giriş/çıkış saatleri ve politika metinleri — seed `features` veya `extra_info` alanlarından. */
export function resolveHotelRules(
  features?: Record<string, string>,
  extraInfo?: Record<string, string>,
): HotelRules {
  const checkIn =
    pickFeature(features, ["checkIn", "check_in", "check_in_time"]) ||
    pickExtra(extraInfo, ["check_in", "checkIn", "check_in_time"]) ||
    "14:00";
  const checkOut =
    pickFeature(features, ["checkOut", "check_out", "check_out_time"]) ||
    pickExtra(extraInfo, ["check_out", "checkOut", "check_out_time"]) ||
    "12:00";

  const policyKeys = [
    ["policy_cancellation", "cancellation", "iptal"],
    ["policy_pets", "pets", "evcil_hayvan"],
    ["policy_children", "children", "cocuk"],
    ["policy_smoking", "smoking", "sigara"],
  ] as const;
  const policyLabels = ["İptal", "Evcil hayvan", "Çocuk", "Sigara"];

  const policies = policyKeys.map((keys, i) => {
    const value =
      pickExtra(extraInfo, [...keys]) ||
      pickFeature(features, [...keys]) ||
      DEFAULT_POLICIES[i]!.value;
    return { label: policyLabels[i]!, value };
  });

  return { checkIn, checkOut, policies };
}
