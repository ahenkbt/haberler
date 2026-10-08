import assert from "node:assert/strict";
import test from "node:test";
import {
  mirrorHmSiteLayoutJsonToPhpNeon,
  normalizeLayoutJsonMansetKeysForPhp,
} from "./hm-php-layout-sync.js";

test("normalizeLayoutJsonMansetKeysForPhp eşleşmeyen anahtarları editör preset'ine çeker", () => {
  const out = normalizeLayoutJsonMansetKeysForPhp(
    JSON.stringify({ hmYsMansetPreset: "sabah", hmNewsYsMansetLayout: "odatv" }),
  );
  const j = JSON.parse(out);
  assert.equal(j.hmYsMansetPreset, "sabah");
  assert.equal(j.hmNewsYsMansetLayout, "sabah");
});

test("mirrorHmSiteLayoutJsonToPhpNeon dual-write kapalıysa yazmaz", async () => {
  const result = await mirrorHmSiteLayoutJsonToPhpNeon({}, null, 3, '{"hmYsMansetPreset":"sabah"}');
  assert.equal(result.mirrored, false);
  assert.match(String(result.reason || ""), /NEWS_DB_WRITE|NEWS_DATABASE_URL/i);
});
