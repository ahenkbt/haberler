const MAX_PARAGRAPH_CHARS = 480;
const HEADING_BOLD_MAX = 120;
const ATTRIBUTION_CLASS = "yekpare-hm-attribution";

function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function collapseSpaces(s: string): string {
  return s.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function looksLikeSubheading(title: string): boolean {
  const t = title.trim();
  if (t.length < 3 || t.length > HEADING_BOLD_MAX) return false;
  if (/[.!?…]\s*$/.test(t) && t.length > 60) return false;
  return true;
}

function boldLineToHeading(line: string, preferH3: boolean): string {
  const m = line.match(/^\s*\*\*([^*]+)\*\*\s*$/);
  if (!m || !looksLikeSubheading(m[1])) return line;
  const tag = preferH3 ? "h3" : "h2";
  return `<${tag}>${escapeHtmlText(m[1].trim())}</${tag}>`;
}

/** `**Başlık**` satırını veya paragraf başındaki kalıbı h3 yapar. */
function promoteMarkdownBoldHeadings(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];

  for (const line of lines) {
    const onlyBold = boldLineToHeading(line, true);
    if (onlyBold !== line) {
      out.push(onlyBold);
      continue;
    }

    const startBold = line.match(/^\s*\*\*([^*]+)\*\*\s+([\s\S]+)$/);
    if (startBold && looksLikeSubheading(startBold[1])) {
      out.push(`<h3>${escapeHtmlText(startBold[1].trim())}</h3>`);
      out.push(`<p>${startBold[2].trim()}</p>`);
      continue;
    }

    out.push(line);
  }

  let html = out.join("\n");

  html = html.replace(/(?:^|[\n>])\s*\*\*([^*\n]+)\*\*\s*(?=[\n<]|$)/gm, (full, title: string) => {
    if (!looksLikeSubheading(title)) return full;
    return full.replace(/\*\*[^*]+\*\*/, `<h3>${escapeHtmlText(title.trim())}</h3>`);
  });

  html = html.replace(
    /<p([^>]*)>\s*\*\*([^*]+)\*\*\s*([\s\S]*?)<\/p>/gi,
    (_m, attrs: string, title: string, rest: string) => {
      if (!looksLikeSubheading(title)) return _m;
      const tail = rest.trim();
      return `<h3>${escapeHtmlText(title.trim())}</h3>${tail ? `\n<p${attrs}>${tail}</p>` : ""}`;
    },
  );

  return html;
}

function remainingBoldToStrong(html: string): string {
  return html.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
}

function extractAttribution(html: string): { body: string; attribution: string } {
  const re = new RegExp(
    `<p[^>]*\\bclass="[^"]*\\b${ATTRIBUTION_CLASS}\\b[^"]*"[^>]*>[\\s\\S]*?<\\/p>`,
    "i",
  );
  const m = html.match(re);
  if (!m) return { body: html, attribution: "" };
  return {
    body: html.replace(re, "").trim(),
    attribution: m[0],
  };
}

function flattenDivBrStructure(html: string): string {
  if (/<(?:table|ul|ol|figure|iframe|img)\b/i.test(html)) return html;
  let out = html.replace(/<br\s*\/?>\s*<br\s*\/?>/gi, "\n\n");
  out = out.replace(/<br\s*\/?>/gi, "\n");
  out = out.replace(/<\/?div[^>]*>/gi, "\n");
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

function plainTextBlocksToParagraphs(text: string): string {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length === 0) return splitLongTextToParagraphs(text.trim());

  return blocks
    .map((b) => {
      if (/^<h[1-6]\b/i.test(b)) return b;
      if (b.startsWith("<")) return b;
      return splitLongTextToParagraphs(b.replace(/\n+/g, " ").trim());
    })
    .join("\n");
}

function plainToParagraphs(text: string): string {
  const t = text.trim();
  if (!t) return "";
  if (/<p\b/i.test(t)) return t;

  if (/<(?:div|h[1-6]|ul|ol|blockquote)\b/i.test(t)) {
    const flat = flattenDivBrStructure(t);
    if (!/<(?:p|h[1-6]|ul|ol|blockquote|table|figure)\b/i.test(flat)) {
      return plainTextBlocksToParagraphs(flat);
    }
    return flat;
  }

  return plainTextBlocksToParagraphs(t);
}

function splitLongTextToParagraphs(text: string): string {
  const t = text.trim();
  if (!t) return "";
  if (t.length <= MAX_PARAGRAPH_CHARS) return `<p>${t}</p>`;

  const sentences = t.match(/[^.!?…]+[.!?…]+(?:\s+|$)|[^.!?…]+$/g) ?? [t];
  const parts: string[] = [];
  let buf = "";

  for (const s of sentences) {
    const next = buf + s;
    if (buf && next.length > MAX_PARAGRAPH_CHARS) {
      parts.push(`<p>${buf.trim()}</p>`);
      buf = s;
    } else {
      buf = next;
    }
  }
  if (buf.trim()) parts.push(`<p>${buf.trim()}</p>`);
  return parts.join("\n");
}

function splitLongParagraphTags(html: string): string {
  return html.replace(/<p([^>]*)>([\s\S]*?)<\/p>/gi, (match, attrs: string, inner: string) => {
    if (/\byekpare-hm-attribution\b/i.test(attrs)) return match;
    const plain = inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (plain.length <= MAX_PARAGRAPH_CHARS) return match;
    if (/<(?:h[1-6]|ul|ol|table)\b/i.test(inner)) return match;
    return splitLongTextToParagraphs(plain).replace(/<p>/g, `<p${attrs}>`);
  });
}

/**
 * AI haber gövdesini Türk haber sitesi HTML düzenine yaklaştırır:
 * markdown ** alt başlıklarını h2/h3 yapar, uzun blokları paragraflara böler.
 */
export function normalizeAiNewsHtml(content: string): string {
  if (!content?.trim()) return content ?? "";

  let html = collapseSpaces(content.replace(/\r\n/g, "\n"));
  const { body, attribution } = extractAttribution(html);
  html = body;

  html = html.replace(/^#{1,6}\s+(.+)$/gm, (_m, title: string) => {
    return `<h3>${escapeHtmlText(title.trim())}</h3>`;
  });

  html = promoteMarkdownBoldHeadings(html);
  html = remainingBoldToStrong(html);
  html = plainToParagraphs(html);
  html = splitLongParagraphTags(html);

  html = html
    .replace(/<p>\s+/gi, "<p>")
    .replace(/\s+<\/p>/gi, "</p>")
    .replace(/>\s{2,}</g, "><");

  html = collapseSpaces(html);
  if (attribution) {
    html = html ? `${html}\n${attribution}` : attribution;
  }
  return html;
}
