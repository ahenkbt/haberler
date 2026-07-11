export function paytrOrderTotalKurus(orderTotal: string | number): number {
  return Math.round(parseFloat(String(orderTotal)) * 100);
}

export function paytrCallbackEventId(payload: {
  hash?: string;
}): string | null {
  const hash = String(payload.hash ?? "").trim();
  return hash || null;
}
