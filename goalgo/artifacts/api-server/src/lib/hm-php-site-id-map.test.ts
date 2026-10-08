import { describe, expect, it } from "vitest";
import {
  expandHmSiteIdAliases,
  phpSiteIdFromWorker,
  preferWorkerSiteId,
} from "./hm-php-site-id-map.js";

describe("hm-php-site-id-map", () => {
  it("maps turkatahaber panel 1132 → PHP 230", () => {
    expect(phpSiteIdFromWorker(1132)).toBe(230);
    expect(preferWorkerSiteId(230)).toBe(1132);
    expect(preferWorkerSiteId(1132)).toBe(1132);
  });

  it("expands campaign aliases so 230 and 1132 both resolve", () => {
    expect(expandHmSiteIdAliases([230]).sort((a, b) => a - b)).toEqual([230, 1132]);
    expect(expandHmSiteIdAliases([1132]).sort((a, b) => a - b)).toEqual([230, 1132]);
    expect(expandHmSiteIdAliases([3])).toEqual([3]);
  });
});
