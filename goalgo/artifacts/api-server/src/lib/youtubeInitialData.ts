/** YouTube watch/kanal HTML içinden ytInitialData çıkarır (regex yedeği + süslü parantez sayımı). */
export function extractJsonObjectAfter(html: string, marker: string): Record<string, unknown> | null {
  const idx = html.indexOf(marker);
  if (idx === -1) return null;
  const start = idx + marker.length;
  if (html[start] !== "{") return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length; i += 1) {
    const ch = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, i + 1)) as Record<string, unknown>;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

export function extractYtInitialData(html: string): Record<string, unknown> | null {
  const fromBrace =
    extractJsonObjectAfter(html, "var ytInitialData = ") ??
    extractJsonObjectAfter(html, "ytInitialData = ") ??
    extractJsonObjectAfter(html, 'window["ytInitialData"] = ');
  if (fromBrace) return fromBrace;

  const patterns = [
    /var\s+ytInitialData\s*=\s*(\{[\s\S]*?\})\s*;\s*(?:var\s|<\/script>)/,
    /ytInitialData\s*=\s*(\{[\s\S]*?\})\s*;\s*(?:var|window|<)/,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) {
      try {
        const d = JSON.parse(m[1]) as Record<string, unknown>;
        if (d && typeof d === "object") return d;
      } catch {
        /* next */
      }
    }
  }
  return null;
}
