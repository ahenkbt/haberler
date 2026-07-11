type AnyObj = Record<string, unknown>;

export type FoodImportPlatform = "yemeksepeti" | "getir" | "migros" | "trendyol" | "unknown";

export interface ParsedOptionChoice {
  label: string;
  price?: number;
}

export interface ParsedOptionGroup {
  name: string;
  required?: boolean;
  multiple?: boolean;
  choices: ParsedOptionChoice[];
}

export interface ParsedMenuItem {
  name: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  category?: string;
  options?: ParsedOptionGroup[];
}

export interface ParsedVendorPayload {
  platform: FoodImportPlatform;
  sourceUrl: string;
  name: string;
  description?: string;
  phone?: string;
  address?: string;
  city?: string;
  district?: string;
  workingHours?: string;
  items: ParsedMenuItem[];
}

const UA_POOL = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
];

function pickUa() {
  return UA_POOL[Math.floor(Math.random() * UA_POOL.length)];
}

export function detectPlatform(url: string): FoodImportPlatform {
  const u = url.toLowerCase();
  if (u.includes("yemeksepeti")) return "yemeksepeti";
  if (u.includes("getir.com")) return "getir";
  if (u.includes("migros.com.tr")) return "migros";
  if (u.includes("trendyol")) return "trendyol";
  return "unknown";
}

function cleanText(v: unknown): string {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

function asNum(v: unknown): number | undefined {
  if (v == null) return undefined;
  const n = Number(String(v).replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function uniqueByName(items: ParsedMenuItem[]): ParsedMenuItem[] {
  const out: ParsedMenuItem[] = [];
  const seen = new Set<string>();
  for (const i of items) {
    const key = cleanText(i.name).toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(i);
  }
  return out;
}

function parseLdJsonBlocks(html: string): AnyObj[] {
  const blocks: AnyObj[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const raw = cleanText(m[1]);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        parsed.forEach((x) => { if (x && typeof x === "object") blocks.push(x as AnyObj); });
      } else if (parsed && typeof parsed === "object") {
        blocks.push(parsed as AnyObj);
      }
    } catch {
      // ignore malformed ld+json blocks
    }
  }
  return blocks;
}

function walk(obj: unknown, fn: (o: AnyObj) => void) {
  if (!obj) return;
  if (Array.isArray(obj)) {
    obj.forEach((x) => walk(x, fn));
    return;
  }
  if (typeof obj !== "object") return;
  const o = obj as AnyObj;
  fn(o);
  Object.values(o).forEach((v) => walk(v, fn));
}

function extractPhone(html: string): string | undefined {
  const m = html.match(/(\+?90[\s\-]?\d{3}[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}|0\d{3}[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2})/);
  return m ? cleanText(m[1]) : undefined;
}

function extractFromLd(url: string, platform: FoodImportPlatform, html: string): ParsedVendorPayload {
  const blocks = parseLdJsonBlocks(html);
  let name = "";
  let description = "";
  let address = "";
  let city = "";
  let district = "";
  let workingHours = "";
  const items: ParsedMenuItem[] = [];

  for (const b of blocks) {
    walk(b, (o) => {
      const t = cleanText(o["@type"]);
      if (!name && ["Restaurant", "LocalBusiness", "Organization", "FoodEstablishment"].includes(t)) {
        name = cleanText(o.name);
        description = cleanText(o.description);
        const adr = o.address as AnyObj | string | undefined;
        if (adr && typeof adr === "object") {
          address = cleanText(adr.streetAddress);
          city = cleanText(adr.addressLocality);
          district = cleanText(adr.addressRegion);
        } else if (typeof adr === "string") {
          address = cleanText(adr);
        }
        const oh = o.openingHours ?? o.openingHoursSpecification;
        if (Array.isArray(oh)) {
          workingHours = oh.map((x) => cleanText(typeof x === "string" ? x : JSON.stringify(x))).filter(Boolean).join(" | ");
        } else {
          workingHours = cleanText(oh);
        }
      }

      const maybeName = cleanText(o.name);
      const maybePrice = asNum(o.price ?? (o.offers as AnyObj | undefined)?.price);
      if (maybeName && maybePrice !== undefined && maybePrice > 0 && maybeName.length >= 2) {
        const optionGroups: ParsedOptionGroup[] = [];
        const rawOpts = (o.options ?? o.addons ?? o.modifiers ?? o.choices) as unknown;
        if (Array.isArray(rawOpts)) {
          rawOpts.forEach((g) => {
            const go = g as AnyObj;
            const gName = cleanText(go.name || "Seçenekler");
            const choicesRaw = (go.choices ?? go.options ?? go.items) as unknown;
            const choices: ParsedOptionChoice[] = [];
            if (Array.isArray(choicesRaw)) {
              choicesRaw.forEach((c) => {
                const co = c as AnyObj;
                const cl = cleanText(co.name || co.label);
                if (!cl) return;
                choices.push({ label: cl, price: asNum(co.price) });
              });
            }
            if (choices.length) {
              optionGroups.push({
                name: gName || "Seçenekler",
                required: Boolean(go.required),
                multiple: Boolean(go.multiple),
                choices,
              });
            }
          });
        }
        items.push({
          name: maybeName,
          description: cleanText(o.description),
          price: maybePrice,
          imageUrl: cleanText(o.image),
          category: cleanText(o.category),
          options: optionGroups.length ? optionGroups : undefined,
        });
      }
    });
  }

  return {
    platform,
    sourceUrl: url,
    name: name || cleanText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]) || "İçe Aktarılan İşletme",
    description: description || undefined,
    phone: extractPhone(html),
    address: address || undefined,
    city: city || undefined,
    district: district || undefined,
    workingHours: workingHours || undefined,
    items: uniqueByName(items).slice(0, 500),
  };
}

export async function fetchAndParseVendor(url: string): Promise<ParsedVendorPayload> {
  const platform = detectPlatform(url);
  const wait = 900 + Math.floor(Math.random() * 1200);
  await new Promise((r) => setTimeout(r, wait));
  const res = await fetch(url, {
    headers: {
      "user-agent": pickUa(),
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "tr-TR,tr;q=0.9,en;q=0.8",
      referer: url.includes("getir.com") ? "https://getir.com/yemek/" : url,
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Sayfa alınamadı: HTTP ${res.status}`);
  const html = await res.text();
  const parsed = extractFromLd(url, platform, html);
  if (!parsed.name) throw new Error("İşletme adı tespit edilemedi");
  return parsed;
}
