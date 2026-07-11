const FA4_LINK =
  '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">';
const FA6_LINK =
  '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">';
const NUNITO_MERriweather_LINK =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700;800&family=Merriweather:ital,wght@0,400;0,700;1,400&display=swap">';
const INTER_PLAYFAIR_LINK =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:wght@700;900&display=swap">';

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
  if (/\bfa-(?:solid|regular|brands)\b/i.test(out) && !/font-awesome\/6|all\.min\.css/i.test(out)) {
    out = `${FA6_LINK}\n${out}`;
  } else if ((/\bfa[\s-]/.test(out) || /\bclass="[^"]*\bfa\b/.test(out)) && !/font-awesome|fontawesome/i.test(out)) {
    out = `${FA4_LINK}\n${out}`;
  }
  if ((/--fn:|Nunito Sans|Merriweather/i.test(out)) && !/fonts\.googleapis\.com/i.test(out)) {
    out = `${NUNITO_MERriweather_LINK}\n${out}`;
  }
  if ((/Playfair\+Display|'Inter'|var\(--v-text\)/i.test(out)) && !/fonts\.googleapis\.com.*Inter/i.test(out)) {
    if (!/fonts\.googleapis\.com/i.test(out)) out = `${INTER_PLAYFAIR_LINK}\n${out}`;
  }
  return out.trim();
}
