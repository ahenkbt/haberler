import test from "node:test";
import assert from "node:assert/strict";
import { emptyHiddenColumnKeys, isHiddenColumnRow, loadHiddenColumnKeys } from "./hm-hidden-columns.js";

function fakeSql(hiddenRows, movedRows) {
  return async (strings) => {
    const text = strings.join("?");
    if (/hm_site_content_hidden/.test(text)) return hiddenRows;
    if (/FROM hm_makaleler/.test(text)) return movedRows;
    return [];
  };
}

test("hides by slug+title, by ref_id+slug and by moved id+slug", async () => {
    const keys = await loadHiddenColumnKeys(
      fakeSql(
        [{ public_slug: "a-yazi", title: "A Yazı", ref_id: 10 }],
        [{ id: 20, slug: "b-yazi" }],
      ),
      3,
    );
    assert.equal(isHiddenColumnRow(keys, { id: 1, slug: "a-yazi", title: "A Yazı" }), true);
    assert.equal(isHiddenColumnRow(keys, { id: 10, slug: "a-yazi", title: "Başka" }), true);
    assert.equal(isHiddenColumnRow(keys, { id: 20, slug: "b-yazi", title: "X" }), true);
    assert.equal(isHiddenColumnRow(keys, { id: 20, slug: "c-yazi", title: "X" }), false);
    assert.equal(isHiddenColumnRow(keys, { id: 2, slug: "a-yazi", title: "Farklı" }), false);
  });
test("fails open", async () => {
    const keys = await loadHiddenColumnKeys(async () => {
      throw new Error("down");
    }, 3);
    assert.equal(keys.size, 0);
    assert.equal(isHiddenColumnRow(emptyHiddenColumnKeys(), { id: 1, slug: "x", title: "y" }), false);
  });
