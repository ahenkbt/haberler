/** Split Wikipedia article HTML: infobox tables → aside, body stays full-width readable. */

export type SplitWikiArticleHtml = {
  bodyHtml: string;
  infoboxHtml: string[];
  mapArtifactCount: number;
};

function isInfoboxTable(el: Element): boolean {
  const cls = el.getAttribute("class") ?? "";
  return /\binfobox\b/i.test(cls);
}

function isMapArtifact(el: Element): boolean {
  const haystack = [
    el.getAttribute("class"),
    el.getAttribute("alt"),
    el.getAttribute("title"),
    el.getAttribute("src"),
    el.getAttribute("href"),
    el.textContent,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /(locator|location map|map of|harita|konum|relief map|blank map|orthographic|projection|karte|carte|mapa|location_map|locator_map|red[_\s-]*pog|red[_\s-]*dot|location[_\s-]*dot|map[_\s-]*marker|marker|pushpin|pin[_\s-]*map|disc[_\s-]*plain[_\s-]*red)/i.test(
    haystack,
  );
}

function numberAttr(el: Element, name: string): number | null {
  const raw = el.getAttribute(name) ?? "";
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function wikiImageHaystack(el: Element): string {
  const attrs = [
    el.getAttribute("class"),
    el.getAttribute("alt"),
    el.getAttribute("title"),
    el.getAttribute("src"),
    el.getAttribute("href"),
  ]
    .filter(Boolean)
    .join(" ");
  try {
    return decodeURIComponent(attrs).toLowerCase();
  } catch {
    return attrs.toLowerCase();
  }
}

function isBadWikiGraphic(img: Element, inInfobox: boolean): boolean {
  const haystack = wikiImageHaystack(img);
  const width = numberAttr(img, "width");
  const height = numberAttr(img, "height");
  const hasDimensions = Boolean(width && height);
  const maxDim = Math.max(width ?? 0, height ?? 0);
  const minDim = Math.min(width ?? Number.POSITIVE_INFINITY, height ?? Number.POSITIVE_INFINITY);

  if (/poweredby|wikimedia-button|transparent|spacer|blank\.gif|pixel/i.test(haystack)) return true;
  if (hasDimensions && maxDim <= 96 && minDim <= 96) return true;
  if (
    /(oojs|ambox|icon|symbol|logo|commons-logo|wikidata-logo|nuvola|crystal[_\s-]*clear|question[_\s-]*book|edit[_\s-]*clear|yes[_\s-]*check|no[_\s-]*check|arrow|increase|decrease|triangle|sort[_\s-]*(up|down)|padlock|semi[_\s-]*protection|locator|location[_\s-]*map|map[_\s-]*marker|red[_\s-]*pog|red[_\s-]*dot|pushpin|pin[_\s-]*map|blank[_\s-]*map|orthographic|projection|placeholder)/i.test(
      haystack,
    )
  ) {
    return true;
  }
  return inInfobox && /(flag|bayrak|coat[_\s-]*of[_\s-]*arms|arma|emblem|seal|crest|indicator|trend|rank)/i.test(haystack);
}

function removeEmptyTableRows(root: Element): void {
  for (const row of Array.from(root.querySelectorAll("tr"))) {
    const text = (row.textContent ?? "").replace(/\u00a0/g, " ").trim();
    if (text || row.querySelector("img")) continue;
    row.remove();
  }
}

function removeBadWikiGraphics(root: Element): number {
  let removed = 0;
  for (const img of Array.from(root.querySelectorAll("img"))) {
    const inInfobox = Boolean(img.closest("table.infobox, table[class*='infobox'], .wiki-infobox-table"));
    if (!isBadWikiGraphic(img, inInfobox)) continue;
    const wrapper =
      img.closest("figure, .thumb, .tright, .floatright, .gallerybox")
      ?? (inInfobox ? img.closest("tr") : null)
      ?? img;
    if (!wrapper.parentElement) continue;
    wrapper.remove();
    removed += 1;
  }
  removeEmptyTableRows(root);
  return removed;
}

function removeMapArtifacts(root: Element): number {
  let removed = 0;
  const candidates = Array.from(
    root.querySelectorAll("figure, .thumb, .tright, .floatright, .locationmap, .locmap, img, map, area"),
  );

  for (const candidate of candidates) {
    if (!isMapArtifact(candidate)) continue;
    const wrapper =
      candidate.closest("tr, figure, .thumb, .tright, .floatright, .locationmap, .locmap, .gallerybox")
      ?? candidate;
    if (!wrapper.parentElement) continue;
    wrapper.remove();
    removed += 1;
  }

  return removed;
}

/**
 * Extract infobox `<table>` elements from wiki HTML so they can render in a
 * controlled aside instead of floating beside paragraphs (skinny text rail).
 */
export function splitWikiArticleHtml(html: string): SplitWikiArticleHtml {
  const raw = html?.trim() ?? "";
  if (!raw || typeof DOMParser === "undefined") {
    return { bodyHtml: raw, infoboxHtml: [], mapArtifactCount: 0 };
  }

  const doc = new DOMParser().parseFromString(`<div id="wiki-split-root">${raw}</div>`, "text/html");
  const root = doc.getElementById("wiki-split-root");
  if (!root) return { bodyHtml: raw, infoboxHtml: [], mapArtifactCount: 0 };

  const infoboxHtml: string[] = [];
  let mapArtifactCount = 0;
  for (const table of Array.from(root.querySelectorAll("table"))) {
    if (!isInfoboxTable(table)) continue;
    mapArtifactCount += removeMapArtifacts(table);
    mapArtifactCount += removeBadWikiGraphics(table);
    table.classList.add("wiki-infobox-table");
    table.removeAttribute("style");
    table.removeAttribute("width");
    infoboxHtml.push(table.outerHTML);
    table.remove();
  }
  mapArtifactCount += removeMapArtifacts(root);
  mapArtifactCount += removeBadWikiGraphics(root);

  return { bodyHtml: root.innerHTML.trim(), infoboxHtml, mapArtifactCount };
}
