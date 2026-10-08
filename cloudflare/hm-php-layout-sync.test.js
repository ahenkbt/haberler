import assert from "node:assert/strict";
import test from "node:test";
import { mirrorHmSiteLayoutJsonToPhpNeon } from "./hm-php-layout-sync.js";

test("mirrorHmSiteLayoutJsonToPhpNeon dual-write kapalıysa yazar", async () => {
  const result = await mirrorHmSiteLayoutJsonToPhpNeon({}, null, 3, '{"hmYsMansetPreset":"sabah"}');
  assert.equal(result.mirrored, false);
  assert.match(String(result.reason || ""), /NEWS_DB_WRITE|NEWS_DATABASE_URL/i);
});
