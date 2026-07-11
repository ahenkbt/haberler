/** YouTube TR tarzı: 22 B = 22 bin, 1,2 Mn = 1,2 milyon */
export function formatCompactCount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  const n = Math.max(0, Math.round(value));
  if (n >= 1_000_000) return `${trimOneDecimal(n / 1_000_000)} Mn`;
  if (n >= 1_000) return `${trimOneDecimal(n / 1_000)} B`;
  return String(n);
}

function trimOneDecimal(x: number): string {
  return x.toFixed(1).replace(/\.0$/, "").replace(".", ",");
}
