import type { TrAddressValue } from "@/components/TrAddressFields";

export function combineTrAddressLine(tr: TrAddressValue, streetLine: string): string {
  const head = [tr.mahalle, tr.district, tr.city].map((s) => String(s || "").trim()).filter(Boolean).join(", ");
  const tail = String(streetLine || "").trim();
  if (head && tail) return `${head} — ${tail}`;
  return head || tail;
}
