import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isNeonServerlessUrl } from "./neon-edge-url.js";

describe("neon-edge-url", () => {
  it("detects Neon serverless URLs", () => {
    assert.equal(isNeonServerlessUrl("postgresql://u:p@ep-x.eu-central-1.aws.neon.tech/neondb"), true);
    assert.equal(isNeonServerlessUrl("postgres://u:p@203.0.113.10:5432/mysite_db?sslmode=disable"), false);
    assert.equal(isNeonServerlessUrl("postgresql://mysite_user@db.example.hstgr.cloud:5432/mysite_db"), false);
    assert.equal(isNeonServerlessUrl(""), false);
  });
});
