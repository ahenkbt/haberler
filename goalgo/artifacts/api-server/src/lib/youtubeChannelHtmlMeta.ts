/**
 * YouTube kanal kapak + logo — resmi API yok; WordPress video-tv eklentisiyle aynı yaklaşım:
 * /{slug}/about veya /{slug} HTML → ytInitialData JSON → header renderer avatar/banner.
 * Yedek: og:image
 */

export function buildYoutubeChannelSlug(input: string): string {
  let s = input.trim();
  s = s.replace(/^https?:\/\/(www\.)?(m\.)?youtube\.com\//i, "");
  s = s.replace(/^https?:\/\/youtu\.be\//i, "");
  s = s.replace(/^\/+|\/+$/g, "");
  s = s.replace(/[?#].*$/, "");
  if (!s) return "@unknown";
  const parts = s.split("/").filter(Boolean);
  if (parts[0]?.startsWith("@")) return parts[0];
  if ((parts[0] === "channel" || parts[0] === "c" || parts[0] === "user") && parts[1]) {
    return `${parts[0]}/${parts[1]}`;
  }
  if (/^UC[a-zA-Z0-9_-]{20,}$/.test(s)) return `channel/${s}`;
  return `@${s}`;
}

function lastThumbUrl(thumbs: unknown): string {
  if (!Array.isArray(thumbs) || thumbs.length === 0) return "";
  const last = thumbs[thumbs.length - 1] as { url?: string };
  return typeof last?.url === "string" ? last.url : "";
}

function ytFindAvatar(json: Record<string, unknown>): string {
  const header = json.header as Record<string, unknown> | undefined;
  if (!header) return "";
  for (const key of ["c4TabbedHeaderRenderer", "channelHeaderRenderer"]) {
    const r = header[key] as { avatar?: { thumbnails?: unknown } } | undefined;
    const u = lastThumbUrl(r?.avatar?.thumbnails);
    if (u) return u;
  }
  return "";
}

function ytFindBanner(json: Record<string, unknown>): string {
  const header = json.header as Record<string, unknown> | undefined;
  if (!header) return "";
  for (const key of ["c4TabbedHeaderRenderer", "channelHeaderRenderer"]) {
    const r = header[key] as { banner?: { thumbnails?: unknown } } | undefined;
    const u = lastThumbUrl(r?.banner?.thumbnails);
    if (u) return u;
  }
  return "";
}

function ytJsonFind(
  node: unknown,
  key: string,
  parentKey?: string,
  depth = 8,
): unknown {
  if (depth <= 0 || node === null || typeof node !== "object") return undefined;
  const o = node as Record<string, unknown>;
  if (parentKey) {
    if (parentKey in o && typeof o[parentKey] === "object" && o[parentKey] !== null) {
      const r = ytJsonFind(o[parentKey], key, undefined, 3);
      if (r !== undefined && r !== null) return r;
    }
  } else if (Object.prototype.hasOwnProperty.call(o, key)) {
    return o[key];
  }
  for (const v of Object.values(o)) {
    const r = ytJsonFind(v, key, parentKey, depth - 1);
    if (r !== undefined && r !== null) return r;
  }
  return undefined;
}

function extractYtInitialData(html: string): Record<string, unknown> | null {
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
        /* try next */
      }
    }
  }
  return extractYtInitialDataBalanced(html);
}

function extractYtInitialDataBalanced(html: string): Record<string, unknown> | null {
  const needle = "ytInitialData";
  const idx = html.indexOf(needle);
  if (idx < 0) return null;
  const eq = html.indexOf("=", idx);
  const start = html.indexOf("{", eq);
  if (start < 0) return null;
  let depth = 0;
  let inStr: '"' | "'" | null = null;
  let escape = false;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === "\\") {
        escape = true;
        continue;
      }
      if (c === inStr) {
        inStr = null;
        continue;
      }
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = c;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
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

async function fetchPage(url: string): Promise<string | null> {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  if (!res.ok) return null;
  return res.text();
}

function ogImage(html: string): string {
  const m = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
  return m?.[1] ? m[1].trim() : "";
}

export type YoutubeChannelHtmlMeta = {
  logoUrl: string;
  bannerUrl: string;
  channelName: string;
  description: string;
  subscriberText: string;
  /** Canonical UC… channel id if discoverable. */
  channelId: string;
};

export async function scrapeYoutubeChannelHtmlMeta(channelInput: string): Promise<YoutubeChannelHtmlMeta | null> {
  const slug = buildYoutubeChannelSlug(channelInput);
  let html = await fetchPage(`https://www.youtube.com/${encodeURI(slug)}/about`);
  if (!html) html = await fetchPage(`https://www.youtube.com/${encodeURI(slug)}`);
  if (!html) return null;

  const out: YoutubeChannelHtmlMeta = {
    logoUrl: "",
    bannerUrl: "",
    channelName: "",
    description: "",
    subscriberText: "",
    channelId: "",
  };

  const jsonData = extractYtInitialData(html);
  if (jsonData) {
    const name = ytJsonFind(jsonData, "title", "channelMetadataRenderer");
    if (typeof name === "string") out.channelName = name;

    const desc = ytJsonFind(jsonData, "description", "channelMetadataRenderer");
    if (typeof desc === "string") out.description = desc;

    const externalId = ytJsonFind(jsonData, "externalId", "channelMetadataRenderer");
    if (typeof externalId === "string" && /^UC[a-zA-Z0-9_-]{20,}$/.test(externalId)) {
      out.channelId = externalId;
    }

    const avatar = ytFindAvatar(jsonData);
    if (avatar) out.logoUrl = avatar;

    const banner = ytFindBanner(jsonData);
    if (banner) out.bannerUrl = banner;

    let subs = ytJsonFind(jsonData, "subscriberCountText", "c4TabbedHeaderRenderer");
    if (subs == null) subs = ytJsonFind(jsonData, "subscriberCountText", "channelHeaderRenderer");
    if (subs && typeof subs === "object" && subs !== null && "simpleText" in subs) {
      const st = (subs as { simpleText?: string }).simpleText;
      if (typeof st === "string") out.subscriberText = st;
    } else if (typeof subs === "string") {
      out.subscriberText = subs;
    }
  }

  if (!out.logoUrl) {
    const og = ogImage(html);
    if (og) out.logoUrl = og;
  }

  if (!out.description) {
    const m = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
    if (m?.[1]) {
      out.description = m[1]
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
    }
  }

  if (!out.logoUrl && !out.bannerUrl && !out.channelName && !out.channelId) return null;
  return out;
}
