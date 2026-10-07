import assert from "node:assert/strict";
import test from "node:test";
import { listActiveHmSites } from "./hm-site-watchdog.js";

test("listActiveHmSites display_name kullanır (name kolonu yok)", async () => {
  let seen = "";
  const sql = async (strings) => {
    seen = Array.from(strings).join("");
    return [
      {
        id: 3,
        slug: "asg",
        display_name: "Ankara",
        domain: "asg.com.tr",
        domain2: null,
        domain3: null,
        active: true,
      },
    ];
  };
  const rows = await listActiveHmSites(sql);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, "Ankara");
  assert.equal(rows[0].slug, "asg");
  assert.match(seen, /display_name/);
  // Şemada `name` yok — SELECT listesinde çıplak name olmamalı.
  const withoutDisplay = seen.replace(/display_name/gi, "");
  assert.doesNotMatch(withoutDisplay, /\bname\b/);
});

test("listActiveHmSites sql yoksa boş dizi", async () => {
  assert.deepEqual(await listActiveHmSites(null), []);
});
