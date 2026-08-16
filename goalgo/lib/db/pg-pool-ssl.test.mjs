import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pgPoolConfig, pgSslOption } from "./pg-pool-ssl.mjs";

describe("pg-pool-ssl", () => {
  it("disables TLS for sslmode=disable", () => {
    const url = "postgresql://mysite_user:x@203.0.113.10:5432/mysite_db?sslmode=disable";
    assert.equal(pgSslOption(url), false);
    assert.equal(pgPoolConfig(url).ssl, false);
  });

  it("relaxes TLS for Neon require", () => {
    const url = "postgresql://u:p@ep-x.eu-central-1.aws.neon.tech/neondb?sslmode=require";
    assert.deepEqual(pgSslOption(url), { rejectUnauthorized: false });
    assert.equal("lookup" in pgPoolConfig(url), false);
  });

  it("forces IPv4 lookup for Hostinger hosts", () => {
    const url = "postgresql://u:p@srv1828480.hstgr.cloud:5432/mysite_db?sslmode=disable";
    assert.equal(typeof pgPoolConfig(url).lookup, "function");
  });
});
