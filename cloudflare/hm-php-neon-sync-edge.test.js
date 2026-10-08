import assert from "node:assert/strict";
import test from "node:test";
import { normalizePhpNeonSyncOpts } from "./hm-php-neon-sync-edge.js";

test("normalizePhpNeonSyncOpts: incremental sync caps at 300", () => {
  const o = normalizePhpNeonSyncOpts({ limit: 999 });
  assert.equal(o.full, false);
  assert.equal(o.limit, 300);
  assert.equal(o.offset, 0);
});

test("normalizePhpNeonSyncOpts: full backfill allows 500 and default batch 200", () => {
  const o = normalizePhpNeonSyncOpts({ full: true });
  assert.equal(o.full, true);
  assert.equal(o.limit, 200);
  const big = normalizePhpNeonSyncOpts({ full: "yes", limit: 800, offset: 400 });
  assert.equal(big.limit, 500);
  assert.equal(big.offset, 400);
});

test("normalizePhpNeonSyncOpts: syncCategories on by default", () => {
  assert.equal(normalizePhpNeonSyncOpts({}).syncCategories, true);
  assert.equal(normalizePhpNeonSyncOpts({ syncCategories: false }).syncCategories, false);
});
