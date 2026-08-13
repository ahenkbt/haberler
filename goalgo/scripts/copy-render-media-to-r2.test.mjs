import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractUploadFnames,
  mimeFromFname,
  isRenderSuspendedResponse,
  parseOgImage,
} from "./copy-render-media-to-r2.mjs";

describe("copy-render-media-to-r2", () => {
  it("extracts upload filenames from html and json", () => {
    const names = extractUploadFnames(
      'src="/api/media/uploads/abc-1.webp" and https://turk.eco/api/media/uploads/logo.png',
    );
    assert.equal(names.has("abc-1.webp"), true);
    assert.equal(names.has("logo.png"), true);
    assert.equal(extractUploadFnames("/api/media/uploads/../x").size, 0);
  });

  it("maps webp/jpeg mime types", () => {
    assert.equal(mimeFromFname("a.webp"), "image/webp");
    assert.equal(mimeFromFname("b.jpg"), "image/jpeg");
  });

  it("detects a suspended Render HTML body", () => {
    const res = { headers: { get: () => "suspend" } };
    assert.equal(isRenderSuspendedResponse(res, ""), true);
    assert.equal(
      isRenderSuspendedResponse({ headers: { get: () => "" } }, "This service has been suspended."),
      true,
    );
    assert.equal(isRenderSuspendedResponse({ headers: { get: () => "" } }, "ok"), false);
  });

  it("parses og:image and skips Render upload URLs", () => {
    assert.equal(
      parseOgImage('<meta property="og:image" content="https://cdn.example/a.jpg">'),
      "https://cdn.example/a.jpg",
    );
    assert.equal(
      parseOgImage(
        '<meta property="og:image" content="https://goalgo-y7ze.onrender.com/api/media/uploads/x.webp">',
      ),
      null,
    );
  });
});
