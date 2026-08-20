/** Harici kapak URL'lerindeki Unicode dosya adlarını (NTV Ekrangörüntüsü.png) encode eder. */
export function encodeHttpImageUrl(raw: string | null | undefined): string {
  const input = String(raw ?? "")
    .trim()
    .replace(/&amp;/g, "&");
  if (!input) return "";
  const withProto = input.startsWith("//") ? `https:${input}` : input;
  if (!/^https?:\/\//i.test(withProto)) return input;
  try {
    return new URL(withProto).href;
  } catch {
    return withProto;
  }
}
