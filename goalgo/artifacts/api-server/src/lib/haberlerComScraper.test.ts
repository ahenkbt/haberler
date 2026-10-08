import { describe, expect, it } from "vitest";
import { isHaberlerComUrl, parseHaberlerListingLinks } from "./haberlerComScraper.js";

describe("haberlerComScraper", () => {
  it("recognizes haberler.com hosts", () => {
    expect(isHaberlerComUrl("https://www.haberler.com/muhtar/")).toBe(true);
    expect(isHaberlerComUrl("https://www.haberler.com/muhtar/s2/")).toBe(true);
    expect(isHaberlerComUrl("https://rss.haberler.com/rss.asp?kategori=muhtar")).toBe(false);
  });

  it("parses listing cards with cover images", () => {
    const html = `
      <a href="/yerel/ornek-muhtar-123-haberi/" title="Örnek muhtar haberi başlığı burada">
        <img src="https://foto.haberler.com/haber/ornek.jpg" />
      </a>
      <div class="new3list-card-body"><ul>
        <li><a href="/guncel/ikinci-muhtar-456-haberi/">İkinci muhtar haber başlığı uzun</a></li>
      </ul></div>
    `;
    const links = parseHaberlerListingLinks(html, "https://www.haberler.com/muhtar/", { limit: 10 });
    expect(links.length).toBeGreaterThanOrEqual(2);
    expect(links[0]?.link).toContain("-haberi");
    expect(links.some((l) => l.imageUrl?.includes("foto.haberler.com"))).toBe(true);
  });
});
