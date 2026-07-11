export function deliveryTrackingQuery(token?: string | null, phoneLast4?: string | null): string {
  const qs = new URLSearchParams();
  if (token?.trim()) qs.set("token", token.trim());
  else if (phoneLast4?.trim()) {
    const l4 = phoneLast4.replace(/\D/g, "").slice(-4);
    if (l4.length === 4) qs.set("phoneLast4", l4);
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export function readDeliveryTrackingFromUrl(): { token: string; phoneLast4: string } {
  const p = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  return {
    token: p.get("t") || p.get("token") || "",
    phoneLast4: p.get("last4") || p.get("phoneLast4") || "",
  };
}
