/** Haber/makale özet metni: spot → summary → description → içerikten ilk cümle. */
export function resolveNewsExcerpt(article: {
  spot?: string | null;
  summary?: string | null;
  description?: string | null;
  content?: string | null;
}): string | null {
  const spot = article.spot?.trim();
  if (spot) return spot;
  const summary = article.summary?.trim();
  if (summary) return summary;
  const description = article.description?.trim();
  if (description) return description;
  const text = (article.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return null;
  const sentence = text.match(/^[^.!?…]+[.!?…]?/)?.[0]?.trim();
  if (sentence && sentence.length >= 20) {
    return sentence.length > 220 ? `${sentence.slice(0, 217)}…` : sentence;
  }
  return text.length > 220 ? `${text.slice(0, 217)}…` : text;
}
