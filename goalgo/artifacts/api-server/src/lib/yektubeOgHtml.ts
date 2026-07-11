function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type WatchOgInput = {
  title: string;
  description: string;
  image?: string | null;
  pageUrl: string;
  jsonLd?: Record<string, unknown> | null;
};

/** Bot / paylaşım önizlemesi — minimal HTML + OG meta + VideoObject JSON-LD */
export function renderWatchOgHtml(input: WatchOgInput): string {
  const title = escapeHtml(input.title.slice(0, 200) || "Yektube");
  const description = escapeHtml(input.description.slice(0, 500) || "Yektube'de izleyin.");
  const pageUrl = escapeHtml(input.pageUrl.slice(0, 2048));
  const image = input.image?.trim() ? escapeHtml(input.image.trim()) : "";
  const jsonLd =
    input.jsonLd && typeof input.jsonLd === "object"
      ? `<script type="application/ld+json">${JSON.stringify(input.jsonLd).replace(/</g, "\\u003c")}</script>`
      : "";

  const imageTags = image
    ? `
    <meta property="og:image" content="${image}" />
    <meta name="twitter:image" content="${image}" />`
    : "";

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} | Yektube</title>
  <meta name="description" content="${description}" />
  <meta name="geo.region" content="TR" />
  <meta property="og:type" content="video.other" />
  <meta property="og:locale" content="tr_TR" />
  <meta property="og:site_name" content="Yektube" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url" content="${pageUrl}" />${imageTags}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <link rel="canonical" href="${pageUrl}" />
  ${jsonLd}
  <meta http-equiv="refresh" content="0;url=${pageUrl}" />
</head>
<body>
  <p><a href="${pageUrl}">${title} — Yektube'de izle</a></p>
</body>
</html>`;
}
