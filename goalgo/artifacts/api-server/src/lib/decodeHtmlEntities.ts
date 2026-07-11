/** RSS / WordPress kaynaklı `&ouml;`, `&#039;`, `&amp;ouml;` vb. entity'leri düz metne çevirir. */

const NAMED_HTML_ENTITIES: Record<string, string> = {
  nbsp: "\u00a0",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  ouml: "ö",
  Ouml: "Ö",
  uuml: "ü",
  Uuml: "Ü",
  ccedil: "ç",
  Ccedil: "Ç",
  gbreve: "ğ",
  Gbreve: "Ğ",
  scedil: "ş",
  Scedil: "Ş",
  iuml: "ï",
  auml: "ä",
  Auml: "Ä",
  aring: "å",
  Aring: "Å",
  euml: "ë",
  Euml: "Ë",
  ocirc: "ô",
  Ocirc: "Ô",
  ucirc: "û",
  Ucirc: "Û",
  acirc: "â",
  Acirc: "Â",
  icirc: "î",
  Icirc: "Î",
  agrave: "à",
  Agrave: "À",
  egrave: "è",
  Egrave: "È",
  ograve: "ò",
  Ograve: "Ò",
  ugrave: "ù",
  Ugrave: "Ù",
  rsquo: "\u2019",
  lsquo: "\u2018",
  rdquo: "\u201d",
  ldquo: "\u201c",
  hellip: "\u2026",
  mdash: "\u2014",
  ndash: "\u2013",
  bull: "\u2022",
  copy: "\u00a9",
  reg: "\u00ae",
  trade: "\u2122",
  euro: "\u20ac",
  pound: "\u00a3",
  yen: "\u00a5",
  cent: "\u00a2",
};

function decodeHtmlEntitiesOnce(raw: string): string {
  return String(raw ?? "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      const code = Number.parseInt(h, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&([a-z][a-z0-9]+);/gi, (match, name: string) => NAMED_HTML_ENTITIES[name] ?? match)
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

/** Çift kodlanmış (`&amp;ouml;`) entity'ler için birkaç tur çözümleme. */
export function decodeHtmlEntities(raw: string, maxPasses = 4): string {
  let value = String(raw ?? "");
  for (let i = 0; i < maxPasses; i++) {
    const next = decodeHtmlEntitiesOnce(value);
    if (next === value) break;
    value = next;
  }
  return value.trim();
}
