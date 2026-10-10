import { describe, expect, it, vi } from "vitest";

vi.mock("./logger", () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }));

import { fetchYahooQuote } from "./finance-fetcher";

describe("fetchYahooQuote (gerçek veri, uydurma yok)", () => {
  it("fiyatı ve önceki kapanışı Yahoo meta'sından hesaplar", async () => {
    const q = await fetchYahooQuote("XU100.IS", async () => ({
      chart: { result: [{ meta: { regularMarketPrice: 12265.98, regularMarketChangePercent: 0.429 } }] },
    }));
    expect(q?.price).toBeCloseTo(12265.98, 2);
    expect(q?.prev).toBeCloseTo(12265.98 / 1.00429, 2);
  });

  it("veri yoksa ya da istek düşerse null döner (rastgele değer üretmez)", async () => {
    expect(await fetchYahooQuote("BZ=F", async () => ({ chart: { result: [] } }))).toBeNull();
    expect(
      await fetchYahooQuote("BZ=F", async () => {
        throw new Error("HTTP 500");
      }),
    ).toBeNull();
  });

  it("kaynak kodunda Math.random kalmadı", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync(new URL("./finance-fetcher.ts", import.meta.url), "utf8");
    expect(src).not.toContain("Math.random");
  });
});
