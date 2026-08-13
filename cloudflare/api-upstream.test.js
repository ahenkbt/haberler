import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CANONICAL_API_ORIGIN,
  configuredApiOrigin,
  isForbiddenLegacyOrigin,
  resolveApiOrigin,
} from "./api-upstream.js";

describe("api-upstream", () => {
  it("rejects Render / onrender origins", () => {
    assert.equal(isForbiddenLegacyOrigin("https://goalgo-y7ze.onrender.com"), true);
    assert.equal(isForbiddenLegacyOrigin("http://goalgo-y7ze.onrender.com"), true);
    assert.equal(isForbiddenLegacyOrigin("https://turk.eco"), false);
  });

  it("ignores API_ORIGIN when it points at Render", () => {
    assert.equal(
      configuredApiOrigin({ API_ORIGIN: "https://goalgo-y7ze.onrender.com" }),
      "",
    );
    assert.equal(
      configuredApiOrigin({ RENDER_API_ORIGIN: "https://goalgo-y7ze.onrender.com" }),
      "",
    );
    assert.equal(configuredApiOrigin({ API_ORIGIN: "" }), "");
  });

  it("keeps a non-Render configured origin", () => {
    assert.equal(
      configuredApiOrigin({ API_ORIGIN: "https://example.test" }),
      "https://example.test",
    );
  });

  it("falls back to incoming host then turk.eco", () => {
    assert.equal(
      resolveApiOrigin({}, "https://ankarahabergundemi.com"),
      "https://ankarahabergundemi.com",
    );
    assert.equal(resolveApiOrigin({}), CANONICAL_API_ORIGIN);
    assert.equal(
      resolveApiOrigin({ API_ORIGIN: "https://goalgo-y7ze.onrender.com" }, "https://turk.eco"),
      "https://turk.eco",
    );
  });
});
