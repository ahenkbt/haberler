export type HmWpTemplatePagePreview = {
  sourceName: string;
  title: string;
  slug: string;
  bodyHtml: string;
  originalBytes: number;
  removedPhpBlocks: number;
  enabled: boolean;
  fullWidth: boolean;
  warnings: string[];
};

export type HmWpTemplatePageInput = {
  sourceName?: unknown;
  title?: unknown;
  slug?: unknown;
  bodyHtml?: unknown;
  html?: unknown;
  enabled?: unknown;
  fullWidth?: unknown;
};

export type HmWpTemplatePageSaved = {
  id: string;
  title: string;
  slug: string;
  bodyHtml: string;
  enabled: boolean;
  fullWidth?: boolean;
  importSource: "wordpress-template";
  sourceName?: string | null;
  importedAt: string;
};

type ExistingExtraPage = {
  id: string;
  title: string;
  slug: string;
  bodyHtml: string;
  enabled: boolean;
  fullWidth?: boolean;
  [key: string]: unknown;
};

const DANGEROUS_BLOCK_TAGS = new Set(["script", "iframe", "object", "embed"]);
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
  "li",
  "link",
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
const VOID_TAGS = new Set(["br", "hr", "img", "col", "input"]);
const GLOBAL_ATTRS = new Set(["aria-label", "class", "id", "role", "title"]);
const ATTRS_BY_TAG: Record<string, Set<string>> = {
  a: new Set(["href", "rel", "target"]),
  button: new Set(["disabled", "name", "type", "value"]),
  form: new Set(["autocomplete"]),
  img: new Set(["alt", "height", "loading", "src", "width"]),
  input: new Set(["accept", "autocomplete", "checked", "disabled", "maxlength", "min", "max", "name", "placeholder", "readonly", "required", "type", "value"]),
  ol: new Set(["start", "type"]),
  option: new Set(["disabled", "label", "selected", "value"]),
  select: new Set(["disabled", "multiple", "name", "required"]),
  textarea: new Set(["cols", "disabled", "maxlength", "name", "placeholder", "readonly", "required", "rows"]),
  link: new Set(["href", "rel", "crossorigin", "media"]),
  li: new Set(["value"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan", "scope"]),
  col: new Set(["span"]),
};

function slugify(input: string): string {
  return String(input ?? "")
    .toLowerCase()
    .replace(/[ıİ]/g, "i")
    .replace(/[şŞ]/g, "s")
    .replace(/[çÇ]/g, "c")
    .replace(/[öÖ]/g, "o")
    .replace(/[üÜ]/g, "u")
    .replace(/[ğĞ]/g, "g")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "template-sayfasi";
}

function decodeHtmlEntities(raw: string): string {
  return String(raw ?? "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, n: string) => {
      const code = Number(n);
      return Number.isFinite(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_m, n: string) => {
      const code = parseInt(n, 16);
      return Number.isFinite(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
    })
    .replace(/&amp;/g, "&");
}

function escapeHtml(raw: string): string {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(raw: string): string {
  return escapeHtml(raw).replace(/"/g, "&quot;");
}

function stripTags(raw: string): string {
  return decodeHtmlEntities(String(raw ?? "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function quotedPathFromPhpCall(code: string, names: string[]): string | null {
  const group = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp(`(?:${group})\\s*\\(\\s*(['"])(.*?)\\1`, "i");
  const match = code.match(re);
  const path = match?.[2]?.trim();
  return path || null;
}

function phpFieldPlaceholder(code: string): string | null {
  const match = code.match(/\b(?:the_field|get_field|get_sub_field)\s*\(\s*(['"])(.*?)\1/i);
  const name = match?.[2]?.trim();
  return name ? `[${name}]` : null;
}

function renderPhpBlock(block: string): string {
  const code = block
    .replace(/^<\?(?:php|=)?/i, "")
    .replace(/\?>$/i, "")
    .trim();
  if (!code) return "";

  const path = quotedPathFromPhpCall(code, ["home_url", "site_url", "admin_url", "network_home_url"]);
  if (path) return path.startsWith("/") || path.startsWith("#") ? path : `/${path.replace(/^\/+/, "")}`;

  if (/\b(?:get_template_directory_uri|get_stylesheet_directory_uri|template_directory|stylesheet_directory)\b/i.test(code)) {
    return "/wp-content/themes/template";
  }
  if (/\b(?:bloginfo|get_bloginfo)\s*\(\s*(['"])(?:url|wpurl|siteurl|home)\1/i.test(code)) return "/";
  if (/\b(?:bloginfo|get_bloginfo)\s*\(\s*(['"])(?:name|description)\1/i.test(code)) return "";

  const field = phpFieldPlaceholder(code);
  if (field) return field;

  if (/\bthe_title\s*\(/i.test(code)) return "Sayfa Başlığı";
  if (/\bthe_excerpt\s*\(/i.test(code)) return "WordPress özet alanı";
  if (/\bthe_content\s*\(/i.test(code)) return "";

  return "";
}

function stripPhpBlocks(raw: string): { html: string; removedPhpBlocks: number } {
  const source = String(raw ?? "").replace(/^\uFEFF/, "");
  const matches = source.match(/<\?(?:php|=)?[\s\S]*?\?>/gi);
  return {
    html: source
      .replace(/<\?(?:php|=)?[\s\S]*?\?>/gi, (block) => renderPhpBlock(block))
      .replace(/<%[\s\S]*?%>/g, ""),
    removedPhpBlocks: matches?.length ?? 0,
  };
}

function filenameTitle(sourceName: string): string {
  const base = String(sourceName ?? "")
    .replace(/\\/g, "/")
    .split("/")
    .pop() ?? "";
  return (
    base
      .replace(/\.(blade\.)?php$/i, "")
      .replace(/\.(html?|txt)$/i, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (m) => m.toLocaleUpperCase("tr-TR")) || "WordPress template sayfası"
  );
}

function extractTitle(sourceName: string, raw: string, html: string): string {
  const templateName = raw.match(/Template\s+Name\s*:\s*([^\r\n*]+)/i)?.[1]?.trim();
  if (templateName) return stripTags(templateName).slice(0, 160);
  const titleTag = raw.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  if (titleTag) return stripTags(titleTag).slice(0, 160);
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.trim();
  if (h1) return stripTags(h1).slice(0, 160);
  return filenameTitle(sourceName).slice(0, 160);
}

function extractBodyHtml(html: string): string {
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1];
  let out = body ?? html;
  out = out
    .replace(/<!doctype[\s\S]*?>/gi, "")
    .replace(/<html\b[^>]*>|<\/html>/gi, "")
    .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<body\b[^>]*>|<\/body>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
  return out;
}

const FA_LINK =
  '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">';
const NUNITO_MERriweather_LINK =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700;800&family=Merriweather:ital,wght@0,400;0,700;1,400&display=swap">';

export function cleanHmImportedTemplateHtml(raw: string): string {
  let out = String(raw ?? "");
  out = out.replace(/<div\b[^>]*class="[^"]*\bwp-content-placeholder\b[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "");
  out = out.replace(/WordPress\s+içerik\s+alanı/gi, "");
  out = out.replace(/<style>\s*\d{3}(?:;\d{3})*&family=[^<]*<\/style>/gi, "");
  for (let i = 0; i < 8; i += 1) {
    const next = out
      .replace(
        /<div\b[^>]*style="[^"]*max-width:\s*100%[^"]*width:\s*100%[^"]*padding:\s*0[^"]*margin:\s*0[^"]*"[^>]*>\s*<\/div>/gi,
        "",
      )
      .replace(/<div\b([^>]*)>\s*<\/div>/gi, (_match, attrs: string) =>
        /\b(?:class|id|style)\s*=/.test(String(attrs ?? "")) ? `<div${attrs}></div>` : "",
      );
    if (next === out) break;
    out = next;
  }
  if (/\bfa[\s-]/.test(out) || /\bclass="[^"]*\bfa\b/.test(out)) {
    if (!/font-awesome|fontawesome/i.test(out)) out = `${FA_LINK}\n${out}`;
  }
  if ((/--fn:|Nunito Sans|Merriweather/i.test(out)) && !/fonts\.googleapis\.com/i.test(out)) {
    out = `${NUNITO_MERriweather_LINK}\n${out}`;
  }
  return out.trim();
}

function removeEmptyHtmlScaffolding(html: string): string {
  let out = String(html ?? "");
  for (let i = 0; i < 8; i += 1) {
    const next = out
      .replace(/<div\b([^>]*)>\s*<\/div>/gi, (_match, attrs: string) => (/\b(?:class|id)\s*=/.test(String(attrs ?? "")) ? `<div${attrs}></div>` : ""))
      .replace(/<p\b[^>]*>\s*<\/p>/gi, "")
      .replace(/<span\b[^>]*>\s*<\/span>/gi, "");
    if (next === out) break;
    out = next;
  }
  return out.trim();
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

function isAllowedUrl(raw: string, allowHash = true): boolean {
  const value = decodeHtmlEntities(String(raw ?? ""))
    .replace(/[\u0000-\u001F\u007F\s]+/g, "")
    .trim();
  if (!value) return false;
  if (allowHash && value.startsWith("#")) return true;
  if (value.startsWith("/") || value.startsWith("./") || value.startsWith("../")) return true;
  if (/^(https?:|mailto:|tel:)/i.test(value)) return true;
  return !/^[a-z][a-z0-9+.-]*:/i.test(value);
}

function sanitizeAttribute(tag: string, attrName: string, rawValue: string | undefined): string | null {
  const name = attrName.toLowerCase();
  if (!name || name.startsWith("on") || name === "srcdoc") return null;
  if (name === "style") {
    const css = sanitizeCss(rawValue ?? "");
    return css ? `style="${escapeAttr(css)}"` : null;
  }
  if (!(GLOBAL_ATTRS.has(name) || ATTRS_BY_TAG[tag]?.has(name) || name.startsWith("data-"))) return null;
  const value = String(rawValue ?? "").trim();
  if ((name === "href" || name === "src") && !isAllowedUrl(value, name === "href")) return null;
  if ((name === "width" || name === "height" || name === "colspan" || name === "rowspan" || name === "span") && !/^\d{1,4}$/.test(value)) {
    return null;
  }
  if (["cols", "maxlength", "rows"].includes(name) && !/^\d{1,4}$/.test(value)) return null;
  if (name === "target" && !["", "_blank", "_self", "_parent", "_top"].includes(value)) return null;
  if (name === "loading" && value && !["lazy", "eager"].includes(value.toLowerCase())) return null;
  if (tag === "button" && name === "type" && value && !["button", "submit", "reset"].includes(value.toLowerCase())) return null;
  if (tag === "input" && name === "type" && value && !/^(button|checkbox|date|datetime-local|email|file|hidden|month|number|password|radio|range|search|tel|text|time|url|week)$/i.test(value)) {
    return null;
  }
  if (tag === "form" && (name === "action" || name === "method")) return null;
  if (value.length > 1000) return null;
  return value ? `${name}="${escapeAttr(value)}"` : name;
}

export function sanitizeWpTemplateHtml(raw: string): string {
  let out = String(raw ?? "");
  for (const tag of DANGEROUS_BLOCK_TAGS) {
    out = out.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi"), "");
    out = out.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi"), "");
  }
  out = out.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_match, css: string) => {
    const safeCss = sanitizeCss(css);
    return safeCss ? `<style>${safeCss}</style>` : "";
  });
  out = out.replace(/<!--[\s\S]*?-->/g, "");
  out = out.replace(/<\/?([a-z][a-z0-9:-]*)(\s[^<>]*)?>/gi, (match, rawTag: string, rawAttrs: string | undefined) => {
    const tag = rawTag.toLowerCase();
    const closing = /^<\//.test(match);
    if (!ALLOWED_TAGS.has(tag)) return "";
    if (closing) return VOID_TAGS.has(tag) ? "" : `</${tag}>`;
    if (tag === "style") return "<style>";

    const attrs: string[] = [];
    const attrSource = String(rawAttrs ?? "");
    const attrRe = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+)))?/g;
    let attr: RegExpExecArray | null;
    while ((attr = attrRe.exec(attrSource)) !== null) {
      const sanitized = sanitizeAttribute(tag, attr[1] ?? "", attr[2] ?? attr[3] ?? attr[4] ?? "");
      if (sanitized) attrs.push(sanitized);
    }
    if (tag === "a") {
      const targetBlank = attrs.some((a) => /^target="_blank"$/i.test(a));
      const hasRel = attrs.some((a) => /^rel=/i.test(a));
      if (targetBlank && !hasRel) attrs.push('rel="noopener noreferrer"');
    }
    if (tag === "button" && !attrs.some((a) => /^type=/i.test(a))) attrs.push('type="button"');
    if (tag === "img" && !attrs.some((a) => /^loading=/i.test(a))) attrs.push('loading="lazy"');
    const attrText = attrs.length ? ` ${attrs.join(" ")}` : "";
    return VOID_TAGS.has(tag) ? `<${tag}${attrText}>` : `<${tag}${attrText}>`;
  });
  return removeEmptyHtmlScaffolding(out);
}

export function parseHmWpTemplatePageSource(sourceName: string, source: string | Buffer): HmWpTemplatePagePreview {
  const raw = Buffer.isBuffer(source) ? source.toString("utf8") : String(source ?? "");
  const { html: withoutPhp, removedPhpBlocks } = stripPhpBlocks(raw);
  const body = cleanHmImportedTemplateHtml(sanitizeWpTemplateHtml(extractBodyHtml(withoutPhp)));
  const title = extractTitle(sourceName, raw, body) || filenameTitle(sourceName);
  const warnings: string[] = [];
  if (removedPhpBlocks > 0) warnings.push(`${removedPhpBlocks} PHP bloğu çalıştırılmadan temizlendi.`);
  if (!body.trim()) warnings.push("Statik HTML içerik bulunamadı; başlıkla boş bir gövde oluşturuldu.");
  return {
    sourceName,
    title,
    slug: slugify(title || filenameTitle(sourceName)),
    bodyHtml: body.trim() || `<p>${escapeHtml(title)}</p>`,
    originalBytes: Buffer.byteLength(raw, "utf8"),
    removedPhpBlocks,
    enabled: true,
    fullWidth: true,
    warnings,
  };
}

export function normalizeHmWpTemplatePageForSave(input: HmWpTemplatePageInput, index: number): HmWpTemplatePageSaved | null {
  const title = stripTags(String(input.title ?? "")).slice(0, 160);
  const slug = slugify(String(input.slug ?? title ?? `template-${index + 1}`));
  const bodyHtml = cleanHmImportedTemplateHtml(sanitizeWpTemplateHtml(String(input.bodyHtml ?? input.html ?? "")));
  if (!title || !slug || !bodyHtml.trim()) return null;
  const sourceName = String(input.sourceName ?? "").trim().slice(0, 240) || null;
  return {
    id: `wp-template-${slug}`,
    title,
    slug,
    bodyHtml,
    enabled: input.enabled === false ? false : true,
    fullWidth: input.fullWidth === true ? true : input.fullWidth === false ? false : true,
    importSource: "wordpress-template",
    sourceName,
    importedAt: new Date().toISOString(),
  };
}

function normalizeExistingExtraPage(raw: unknown, index: number): ExistingExtraPage | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const title = String(o.title ?? "").trim().slice(0, 160);
  const slug = String(o.slug ?? "").trim().replace(/^\/+|\/+$/g, "").slice(0, 160);
  if (!title || !slug) return null;
  return {
    ...o,
    id: String(o.id ?? `page-${index + 1}`).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 96) || `page-${index + 1}`,
    title,
    slug,
    bodyHtml: String(o.bodyHtml ?? ""),
    enabled: o.enabled === false ? false : true,
    fullWidth: o.fullWidth === true ? true : o.fullWidth === false ? false : undefined,
  };
}

function makeUniqueSlug(base: string, used: Set<string>): string {
  const root = slugify(base) || "template-sayfasi";
  if (!used.has(root)) return root;
  for (let i = 2; i < 500; i += 1) {
    const next = `${root}-${i}`;
    if (!used.has(next)) return next;
  }
  return `${root}-${Date.now()}`;
}

function makeUniqueId(base: string, used: Set<string>): string {
  const root = String(base || "wp-template")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "wp-template";
  if (!used.has(root)) return root;
  for (let i = 2; i < 500; i += 1) {
    const next = `${root}-${i}`;
    if (!used.has(next)) return next;
  }
  return `${root}-${Date.now()}`;
}

export function mergeWpTemplatePagesIntoLayout(
  rawLayout: unknown,
  pages: HmWpTemplatePageSaved[],
  opts: { overwrite?: boolean; addToCorporateMenu?: boolean } = {},
): {
  layout: Record<string, unknown>;
  imported: HmWpTemplatePageSaved[];
  createdCount: number;
  updatedCount: number;
  menuAdded: number;
} {
  const layout = rawLayout && typeof rawLayout === "object" && !Array.isArray(rawLayout)
    ? { ...(rawLayout as Record<string, unknown>) }
    : {};
  const existingPages = Array.isArray(layout.hmExtraPages)
    ? layout.hmExtraPages.map(normalizeExistingExtraPage).filter((p): p is ExistingExtraPage => p != null)
    : [];
  const usedIds = new Set(existingPages.map((p) => p.id));
  const usedSlugs = new Set(existingPages.map((p) => p.slug.trim().toLowerCase()).filter(Boolean));
  const outPages: ExistingExtraPage[] = [...existingPages];
  const imported: HmWpTemplatePageSaved[] = [];
  let createdCount = 0;
  let updatedCount = 0;

  for (const page of pages) {
    const slug = opts.overwrite === false ? makeUniqueSlug(page.slug, usedSlugs) : slugify(page.slug);
    const replaceIndex = opts.overwrite === false ? -1 : outPages.findIndex((p) => p.slug.trim().toLowerCase() === slug);
    const id = replaceIndex >= 0 ? outPages[replaceIndex]?.id ?? page.id : makeUniqueId(page.id, usedIds);
    const next: HmWpTemplatePageSaved = { ...page, id, slug };
    if (replaceIndex >= 0) {
      outPages[replaceIndex] = { ...outPages[replaceIndex], ...next };
      updatedCount += 1;
    } else {
      outPages.push(next);
      createdCount += 1;
    }
    usedIds.add(id);
    usedSlugs.add(slug);
    imported.push(next);
  }

  if (outPages.length > 50) {
    const importedSlugs = new Set(imported.map((page) => page.slug.trim().toLowerCase()).filter(Boolean));
    const importedPages = outPages.filter((page) => importedSlugs.has(page.slug.trim().toLowerCase()));
    const remainingPages = outPages.filter((page) => !importedSlugs.has(page.slug.trim().toLowerCase()));
    layout.hmExtraPages = [...importedPages, ...remainingPages].slice(0, 50);
  } else {
    layout.hmExtraPages = outPages;
  }

  let menuAdded = 0;
  const existingMenu = Array.isArray(layout.hmCorporateMenuItems) ? [...layout.hmCorporateMenuItems] : [];
  if (opts.addToCorporateMenu === true && existingMenu.length > 0) {
    const menu = existingMenu.filter((item) => item && typeof item === "object" && !Array.isArray(item)) as Record<string, unknown>[];
    const hrefs = new Set(menu.map((item) => String(item.href ?? "").trim().toLowerCase()).filter(Boolean));
    for (const page of imported) {
      const href = `/sayfa/${page.slug}`;
      if (hrefs.has(href.toLowerCase())) continue;
      menu.push({
        id: makeUniqueId(`menu-${page.id}`, new Set(menu.map((item) => String(item.id ?? "")))),
        label: page.title,
        href,
        parentId: null,
        enabled: true,
      });
      hrefs.add(href.toLowerCase());
      menuAdded += 1;
    }
    layout.hmCorporateMenuItems = menu.slice(0, 40);
  }

  return { layout, imported, createdCount, updatedCount, menuAdded };
}
