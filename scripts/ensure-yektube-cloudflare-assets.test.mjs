import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ensureYektubeCloudflareAssets,
  isYektubeIndexHtml,
  yektubeIndexScriptSrc,
} from "./ensure-yektube-cloudflare-assets.mjs";

function yektubeHtml(jsName = "index-DY9zYfzz.js") {
  return `<!doctype html><html><head><title>Yektube</title><script type="module" src="/yektube-v2/assets/${jsName}"></script></head><body></body></html>`;
}

describe("ensureYektubeCloudflareAssets", () => {
  it("parses the hashed Yektube script", () => {
    const html = yektubeHtml();
    assert.equal(isYektubeIndexHtml(html), true);
    assert.equal(yektubeIndexScriptSrc(html), "/yektube-v2/assets/index-DY9zYfzz.js");
  });

  it("copies yektube-v2 from public when dist overlay is missing", () => {
    const root = mkdtempSync(join(tmpdir(), "yt-assets-"));
    const dest = join(root, "dist", "public");
    const src = join(root, "public", "yektube-v2");
    mkdirSync(join(src, "assets"), { recursive: true });
    mkdirSync(dest, { recursive: true });
    writeFileSync(join(dest, "index.html"), "<title>turk.eco</title>");
    writeFileSync(join(src, "index.html"), yektubeHtml());
    writeFileSync(join(src, "assets", "index-DY9zYfzz.js"), "console.log('yt')");

    const result = ensureYektubeCloudflareAssets(dest, [join(dest, "yektube-v2"), src]);
    assert.equal(result.scriptSrc, "/yektube-v2/assets/index-DY9zYfzz.js");
    assert.equal(existsSync(join(dest, "yektube-v2", "assets", "index-DY9zYfzz.js")), true);
    assert.equal(isYektubeIndexHtml(readFileSync(join(dest, "yektube-v2", "index.html"), "utf8")), true);
    assert.equal(existsSync(join(dest, ".assetsignore")), true);
  });

  it("overlays public when dist HTML exists but hashed JS is missing", () => {
    const root = mkdtempSync(join(tmpdir(), "yt-assets-js-"));
    const dest = join(root, "dist", "public");
    const src = join(root, "public", "yektube-v2");
    mkdirSync(join(dest, "yektube-v2", "assets"), { recursive: true });
    mkdirSync(join(src, "assets"), { recursive: true });
    writeFileSync(join(dest, "yektube-v2", "index.html"), yektubeHtml());
    writeFileSync(join(src, "index.html"), yektubeHtml());
    writeFileSync(join(src, "assets", "index-DY9zYfzz.js"), "console.log('yt')");

    ensureYektubeCloudflareAssets(dest, [join(dest, "yektube-v2"), src]);
    assert.equal(existsSync(join(dest, "yektube-v2", "assets", "index-DY9zYfzz.js")), true);
  });

  it("fails when neither dist nor public has Yektube", () => {
    const root = mkdtempSync(join(tmpdir(), "yt-assets-missing-"));
    const dest = join(root, "dist", "public");
    mkdirSync(dest, { recursive: true });
    writeFileSync(join(dest, "index.html"), "<title>portal</title>");
    assert.throws(
      () => ensureYektubeCloudflareAssets(dest, [join(dest, "yektube-v2")]),
      /Yektube SPA missing/,
    );
  });
});
