export type MerchantRssItem = {
  name: string;
  description: string;
  category: string;
  price: string;
  salePrice: string | null;
  imageUrl: string | null;
  images: string[];
  sku: string | null;
  stock: number | null;
  active: boolean;
};

function decodeXmlText(s: string): string {
  return s
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractTagValues(chunk: string, tag: string): string[] {
  const results: string[] = [];
  const re = new RegExp(`<${tag}>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))</${tag}>`, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(chunk)) !== null) {
    results.push(decodeXmlText((m[1] ?? m[2] ?? "").trim()));
  }
  return results;
}

function extractSingleTag(chunk: string, tag: string): string {
  return extractTagValues(chunk, tag)[0] ?? "";
}

function pickCategory(chunk: string): string {
  const types = extractTagValues(chunk, "product_type");
  const cats = extractTagValues(chunk, "category");
  const withHierarchy = [...types, ...cats].find((t) => t.includes(">"));
  if (withHierarchy) return withHierarchy.trim();
  return (types[0] || cats[0] || "Diğer").trim();
}

function parsePricePair(priceRaw: string, listPriceRaw: string): { price: string; salePrice: string | null } {
  const p = Number.parseFloat(priceRaw.replace(",", "."));
  const lp = Number.parseFloat(listPriceRaw.replace(",", "."));
  if (Number.isFinite(lp) && Number.isFinite(p) && lp > p) {
    return { price: lp.toFixed(2), salePrice: p.toFixed(2) };
  }
  if (Number.isFinite(p)) return { price: p.toFixed(2), salePrice: null };
  return { price: "0", salePrice: null };
}

function collectAdditionalImages(chunk: string): string[] {
  const images: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const url = extractSingleTag(chunk, `additional_image_link${i}`).trim();
    if (url) images.push(url);
  }
  return images;
}

/** Google Merchant RSS (export.xml) → ürün listesi */
export function parseMerchantRssXml(xml: string): MerchantRssItem[] {
  const items: MerchantRssItem[] = [];
  const blocks = xml.split(/<\/item>/i);
  for (const block of blocks) {
    const start = block.lastIndexOf("<item>");
    if (start === -1) continue;
    const chunk = block.slice(start + "<item>".length);
    const name = extractSingleTag(chunk, "title").trim();
    if (!name) continue;
    const description = extractSingleTag(chunk, "description").trim();
    const category = pickCategory(chunk);
    const { price, salePrice } = parsePricePair(
      extractSingleTag(chunk, "price"),
      extractSingleTag(chunk, "listprice"),
    );
    const imageUrl = extractSingleTag(chunk, "image_link").trim() || null;
    const images = collectAdditionalImages(chunk);
    const sku =
      extractSingleTag(chunk, "barcode").trim() ||
      extractSingleTag(chunk, "id").trim() ||
      extractSingleTag(chunk, "model_number").trim() ||
      null;
    const qtyRaw = extractSingleTag(chunk, "quantity");
    const stock = qtyRaw ? Number.parseInt(qtyRaw, 10) : null;
    const availability = extractSingleTag(chunk, "availability").toLowerCase();
    const active = !availability.includes("out of stock");

    items.push({
      name,
      description,
      category,
      price,
      salePrice,
      imageUrl,
      images,
      sku,
      stock: Number.isFinite(stock) ? stock : null,
      active,
    });
  }
  return items;
}
