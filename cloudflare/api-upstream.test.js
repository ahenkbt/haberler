import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CANONICAL_API_ORIGIN,
  apiContainerInstanceName,
  configuredApiOrigin,
  isForbiddenLegacyOrigin,
  resolveApiOrigin,
} from "./api-upstream.js";

describe("api-upstream", () => {
  it("rejects Render / onrender origins", () => {
    assert.equal(isForbiddenLegacyOrigin("https://goalgo-y7ze.onrender.com"), true);
    assert.equal(isForbiddenLegacyOrigin("http://goalgo-y7ze.onrender.com"), true);
    assert.equal(isForbiddenLegacyOrigin("https://ahenk.net.tr"), false);
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

  it("names the API container from CONTAINER_ROLL so rolls start a new instance", () => {
    assert.equal(apiContainerInstanceName({}), "api");
    assert.equal(apiContainerInstanceName({ CONTAINER_ROLL: "" }), "api");
    assert.equal(
      apiContainerInstanceName({ CONTAINER_ROLL: "hm-yektube-stub-20260912c" }),
      "hm-yektube-stub-20260912c",
    );
  });

  it("includes CONTAINER_ROLL in every random instance name", async () => {
    const { apiContainerInstanceNames } = await import("./api-upstream.js");
    assert.deepEqual(apiContainerInstanceNames({ CONTAINER_ROLL: "php-news-sites-20261004a" }, 3), [
      "php-news-sites-20261004a-0",
      "php-news-sites-20261004a-1",
      "php-news-sites-20261004a-2",
    ]);
  });

  it("falls back to incoming host then ahenk.net.tr", () => {
    assert.equal(
      resolveApiOrigin({}, "https://ankarahabergundemi.com"),
      "https://ankarahabergundemi.com",
    );
    assert.equal(resolveApiOrigin({}), CANONICAL_API_ORIGIN);
    assert.equal(CANONICAL_API_ORIGIN, "https://ahenk.net.tr");
    assert.equal(
      resolveApiOrigin({ API_ORIGIN: "https://goalgo-y7ze.onrender.com" }, "https://ahenk.net.tr"),
      "https://ahenk.net.tr",
    );
  });
});

it("jobs instance -0 is kept off normal traffic", async () => {
  const { apiRequestInstanceNames, apiJobsInstanceName } = await import("./api-upstream.js");
  const env = { CONTAINER_ROLL: "roll-a" };
  assert.deepEqual(apiRequestInstanceNames(env), ["roll-a-1", "roll-a-2"]);
  assert.equal(apiJobsInstanceName(env), "roll-a-0");
});
