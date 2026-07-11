const ALLOWED_TAGS = new Set([
  "A",
  "B",
  "BLOCKQUOTE",
  "BR",
  "CAPTION",
  "CODE",
  "COL",
  "COLGROUP",
  "DIV",
  "EM",
  "FIGCAPTION",
  "FIGURE",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "HR",
  "I",
  "IFRAME",
  "IMG",
  "LI",
  "OL",
  "P",
  "PRE",
  "SPAN",
  "STRONG",
  "TABLE",
  "TBODY",
  "TD",
  "TH",
  "THEAD",
  "TR",
  "U",
  "UL",
]);

const GLOBAL_ATTRS = new Set(["class", "id", "title", "aria-label", "role"]);
const TAG_ATTRS: Record<string, Set<string>> = {
  A: new Set(["href", "target", "rel"]),
  IFRAME: new Set(["src", "allow", "allowfullscreen", "loading", "referrerpolicy"]),
  IMG: new Set(["src", "alt", "width", "height", "loading", "decoding"]),
  TD: new Set(["colspan", "rowspan"]),
  TH: new Set(["colspan", "rowspan", "scope"]),
  TABLE: new Set(["cellpadding", "cellspacing"]),
};

function isSafeUrl(value: string): boolean {
  const v = value.trim().replace(/[\u0000-\u001F\u007F\s]+/g, "");
  if (!v) return true;
  if (v.startsWith("#") || v.startsWith("/") || v.startsWith("./") || v.startsWith("../")) return true;
  return /^(https?:|mailto:|tel:)/i.test(v);
}

function sanitizeInlineStyle(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  // Conservative allow-list: enough to keep Wikipedia infobox/table readable,
  // while avoiding url()/expression() CSS injection.
  const forbidden = /(url\s*\(|expression\s*\(|@import)/i;
  if (forbidden.test(raw)) return "";

  const allowedProps = new Set([
    "background",
    "background-color",
    "border",
    "border-collapse",
    "border-color",
    "border-spacing",
    "border-style",
    "border-width",
    "caption-side",
    "color",
    "font-size",
    "font-style",
    "font-weight",
    "line-height",
    "margin",
    "margin-left",
    "margin-right",
    "padding",
    "padding-left",
    "padding-right",
    "text-align",
    "vertical-align",
    "width",
  ]);

  const out: string[] = [];
  for (const decl of raw.split(";")) {
    const i = decl.indexOf(":");
    if (i === -1) continue;
    const prop = decl.slice(0, i).trim().toLowerCase();
    const val = decl.slice(i + 1).trim();
    if (!prop || !val) continue;
    if (!allowedProps.has(prop)) continue;
    if (forbidden.test(val)) continue;
    out.push(`${prop}:${val}`);
  }
  return out.join(";");
}

export function sanitizeHtml(html: string): string {
  const raw = html ?? "";
  if (!raw.trim() || typeof DOMParser === "undefined") return raw;
  const doc = new DOMParser().parseFromString(raw, "text/html");
  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType !== Node.ELEMENT_NODE) continue;
      const el = child as HTMLElement;
      const tag = el.tagName.toUpperCase();
      if (!ALLOWED_TAGS.has(tag)) {
        el.replaceWith(...Array.from(el.childNodes));
        continue;
      }
      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        if (
          name === "style" &&
          (tag === "TABLE" ||
            tag === "TBODY" ||
            tag === "THEAD" ||
            tag === "TR" ||
            tag === "TD" ||
            tag === "TH" ||
            tag === "CAPTION")
        ) {
          const safe = sanitizeInlineStyle(attr.value);
          if (safe) el.setAttribute("style", safe);
          else el.removeAttribute("style");
          continue;
        }
        const allowed = GLOBAL_ATTRS.has(name) || TAG_ATTRS[tag]?.has(name);
        const urlAttr = name === "href" || name === "src";
        if (!allowed || name.startsWith("on") || (urlAttr && !isSafeUrl(attr.value))) {
          el.removeAttribute(attr.name);
        }
      }
      if (tag === "A") {
        el.setAttribute("rel", "noopener noreferrer");
      }
      walk(el);
    }
  };
  walk(doc.body);
  return doc.body.innerHTML;
}
