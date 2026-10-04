import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const MOJIBAKE = `D${String.fromCharCode(0x251c, 0x255d)}nya`;

describe("Dünya label source encoding", () => {
  it("does not hardcode the box-drawing mojibake in the edge worker", () => {
    const worker = readFileSync(join(here, "worker.js"), "utf8");
    const boot = readFileSync(join(here, "hm-html-boot.js"), "utf8");
    assert.equal(worker.includes(MOJIBAKE), false);
    assert.equal(boot.includes(MOJIBAKE), false);
    assert.match(worker, /sourceName: "Dünya"/);
    assert.match(worker, /label: "Dünya"/);
    assert.match(boot, /dunya: "Dünya"/);
  });
});
