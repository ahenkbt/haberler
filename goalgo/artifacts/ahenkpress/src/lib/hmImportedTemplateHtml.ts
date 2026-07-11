import { cleanHmImportedTemplateHtml } from "@/lib/hmImportedPageCleanup";

const BLOCKED_TAGS = new Set(["script", "iframe", "object", "embed"]);
const ALLOWED_TAGS = new Set([
  "a",
  "abbr",
  "article",
  "aside",
  "b",
  "blockquote",
  "br",
  "button",
  "caption",
  "cite",
  "code",
  "col",
  "colgroup",
  "dd",
  "details",
  "div",
  "dl",
  "dt",
  "em",
  "figcaption",
  "figure",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "i",
  "img",
  "input",
  "label",
  "link",
  "li",
  "main",
  "mark",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "small",
  "span",
  "strong",
  "style",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
  "option",
  "select",
  "form",
]);
const GLOBAL_ATTRS = new Set(["aria-label", "class", "id", "role", "title"]);
const ATTRS_BY_TAG: Record<string, Set<string>> = {
  a: new Set(["href", "rel", "target"]),
  button: new Set(["disabled", "name", "type", "value"]),
  form: new Set(["autocomplete"]),
  img: new Set(["alt", "height", "loading", "src", "width"]),
  link: new Set(["href", "rel", "crossorigin", "media"]),
  input: new Set(["accept", "autocomplete", "checked", "disabled", "maxlength", "min", "max", "name", "placeholder", "readonly", "required", "type", "value"]),
  ol: new Set(["start", "type"]),
  option: new Set(["disabled", "label", "selected", "value"]),
  select: new Set(["disabled", "multiple", "name", "required"]),
  textarea: new Set(["cols", "disabled", "maxlength", "name", "placeholder", "readonly", "required", "rows"]),
  li: new Set(["value"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan", "scope"]),
  col: new Set(["span"]),
};

function isSafeUrl(raw: string, allowHash = true): boolean {
  const value = String(raw ?? "")
    .replace(/[\u0000-\u001F\u007F\s]+/g, "")
    .trim();
  if (!value) return false;
  if (allowHash && value.startsWith("#")) return true;
  if (value.startsWith("/") || value.startsWith("./") || value.startsWith("../")) return true;
  if (/^(https?:|mailto:|tel:)/i.test(value)) return true;
  return !/^[a-z][a-z0-9+.-]*:/i.test(value);
}

function sanitizeCss(raw: string): string {
  return String(raw ?? "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/@import\b(?![^;]*fonts\.googleapis\.com)[^;]*(?:;|$)/gi, "")
    .replace(/expression\s*\([^)]*\)/gi, "")
    .replace(/(?:behavior|-moz-binding)\s*:[^;{}]+;?/gi, "")
    .replace(/url\s*\(\s*(['"]?)\s*(?:javascript|vbscript|data\s*:\s*text\/html)[^)]*\1\s*\)/gi, "url(\"\")")
    .trim()
    .slice(0, 50_000);
}

function isAllowedAttr(tagName: string, attrName: string, value: string): boolean {
  const name = attrName.toLowerCase();
  if (!name || name.startsWith("on") || name === "srcdoc") return false;
  if (name === "style") return !!sanitizeCss(value);
  if (!(GLOBAL_ATTRS.has(name) || ATTRS_BY_TAG[tagName]?.has(name) || name.startsWith("data-"))) return false;
  if ((name === "href" || name === "src") && !isSafeUrl(value, name === "href")) return false;
  if ((name === "width" || name === "height" || name === "colspan" || name === "rowspan" || name === "span") && !/^\d{1,4}$/.test(value)) {
    return false;
  }
  if (["cols", "maxlength", "rows"].includes(name) && !/^\d{1,4}$/.test(value)) return false;
  if (name === "target" && !["", "_blank", "_self", "_parent", "_top"].includes(value)) return false;
  if (name === "loading" && value && !["lazy", "eager"].includes(value.toLowerCase())) return false;
  if (tagName === "button" && name === "type" && value && !["button", "submit", "reset"].includes(value.toLowerCase())) return false;
  if (tagName === "input" && name === "type" && value && !/^(button|checkbox|date|datetime-local|email|file|hidden|month|number|password|radio|range|search|tel|text|time|url|week)$/i.test(value)) {
    return false;
  }
  return value.length <= 1000;
}

/** Tam HTML belgesi (DOCTYPE/html/head/body) gömülü sayfalarda stilleri gövdeye taşır. */
export function unwrapFullHtmlDocumentForEmbed(raw: string): string {
  const html = String(raw ?? "").trim();
  if (!/<!DOCTYPE\s+html|<html[\s>]/i.test(html)) return html;

  if (typeof window !== "undefined" && typeof DOMParser !== "undefined") {
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const head = doc.querySelector("head");
      const body = doc.body;
      if (head && body) {
        for (const node of Array.from(head.querySelectorAll('link[rel="stylesheet"], style'))) {
          body.insertBefore(node, body.firstChild);
        }
      }
      const inner = body?.innerHTML.trim() ?? "";
      if (inner) {
        return `<div class="hm-vkd-page-root">\n${inner}\n</div>`;
      }
    } catch {
      /* regex yedeği */
    }
  }

  const headChunks: string[] = [];
  let rest = html
    .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_m, css: string) => {
      headChunks.push(`<style>${css}</style>`);
      return "";
    })
    .replace(/<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi, (m) => {
      headChunks.push(m);
      return "";
    });
  const bodyMatch = rest.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyInner = (bodyMatch?.[1] ?? rest)
    .replace(/<\/?html[^>]*>/gi, "")
    .replace(/<\/?head[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<\/?body[^>]*>/gi, "")
    .trim();
  if (!bodyInner) return html;
  return `<div class="hm-vkd-page-root">\n${headChunks.join("\n")}${bodyInner}\n</div>`;
}

function unwrapElement(el: Element): void {
  const parent = el.parentNode;
  if (!parent) {
    el.remove();
    return;
  }
  // DOMParser kökü (#document) yalnızca tek element tutar; html/body unwrap HierarchyRequestError verir.
  if (parent.nodeType === Node.DOCUMENT_NODE) {
    el.remove();
    return;
  }
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  el.remove();
}

export function sanitizeHmImportedTemplateHtml(raw: string): string {
  const html = cleanHmImportedTemplateHtml(unwrapFullHtmlDocumentForEmbed(String(raw ?? "")));
  if (!html.trim()) return "";
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    let fallback = html
      .replace(/<\?(?:php|=)?[\s\S]*?\?>/gi, "")
      .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_match, css: string) => {
        const safeCss = sanitizeCss(css);
        return safeCss ? `<style>${safeCss}</style>` : "";
      })
      .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      .replace(/\ssrcdoc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
    for (const tag of BLOCKED_TAGS) {
      fallback = fallback.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi"), "");
      fallback = fallback.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi"), "");
    }
    return fallback;
  }

  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const head = doc.querySelector("head");
    const body = doc.body;
    // DOMParser <link>/<style> etiketlerini head'e taşır; head silinince tüm sayfa CSS'i kaybolur.
    if (head && body) {
      const headAssets = Array.from(head.querySelectorAll('link[rel="stylesheet"], style'));
      for (const node of headAssets) {
        body.insertBefore(node, body.firstChild);
      }
    }
    head?.remove();
    const roots = body ? Array.from(body.querySelectorAll("*")) : [];
    for (const el of roots) {
      const tagName = el.tagName.toLowerCase();
      if (BLOCKED_TAGS.has(tagName)) {
        el.remove();
        continue;
      }
      if (!ALLOWED_TAGS.has(tagName)) {
        unwrapElement(el);
        continue;
      }
      if (tagName === "style") {
        const safeCss = sanitizeCss(el.textContent ?? "");
        if (!safeCss) {
          el.remove();
          continue;
        }
        el.textContent = safeCss;
        Array.from(el.attributes).forEach((attr) => el.removeAttribute(attr.name));
        continue;
      }
      Array.from(el.attributes).forEach((attr) => {
        if (!isAllowedAttr(tagName, attr.name, attr.value)) {
          el.removeAttribute(attr.name);
          return;
        }
        if (attr.name.toLowerCase() === "style") el.setAttribute(attr.name, sanitizeCss(attr.value));
      });
      if (tagName === "a" && el.getAttribute("target") === "_blank" && !el.getAttribute("rel")) {
        el.setAttribute("rel", "noopener noreferrer");
      }
      if (tagName === "button" && !el.getAttribute("type")) {
        el.setAttribute("type", "button");
      }
      if (tagName === "img" && !el.getAttribute("loading")) {
        el.setAttribute("loading", "lazy");
      }
    }
    const cleaned = doc.body?.innerHTML.trim() ?? "";
    if (cleaned) return cleaned;
  } catch {
    /* regex yedeğine düş */
  }

  {
    let fallback = html
      .replace(/<\?(?:php|=)?[\s\S]*?\?>/gi, "")
      .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_match, css: string) => {
        const safeCss = sanitizeCss(css);
        return safeCss ? `<style>${safeCss}</style>` : "";
      })
      .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      .replace(/\ssrcdoc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
    for (const tag of BLOCKED_TAGS) {
      fallback = fallback.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi"), "");
      fallback = fallback.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi"), "");
    }
    return fallback.trim();
  }
}
