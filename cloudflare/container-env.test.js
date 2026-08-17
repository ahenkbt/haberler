import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CONTAINER_DEFAULTS,
  buildContainerEnv,
  hasDatabaseUrl,
  hasS3MediaConfig,
  missingContainerBootSecrets,
  requestWithoutAbort,
} from "./container-env.js";

describe("container-env", () => {
  it("copies Neon and session secrets from the Worker env", () => {
    const vars = buildContainerEnv({
      DATABASE_URL: "postgres://neon/neondb",
      SESSION_SECRET: "sixteen-chars-ok",
      GOALGO_API: { getByName() {} },
      ASSETS: { fetch() {} },
    });
    assert.equal(vars.DATABASE_URL, "postgres://neon/neondb");
    assert.equal(vars.SESSION_SECRET, "sixteen-chars-ok");
    assert.equal(vars.PORT, CONTAINER_DEFAULTS.PORT);
    assert.equal(vars.NODE_ENV, "production");
    assert.equal("GOALGO_API" in vars, false);
    assert.equal("ASSETS" in vars, false);
  });

  it("forwards R2/S3 credentials when present", () => {
    const vars = buildContainerEnv({
      DATABASE_URL: "postgres://neon/neondb",
      SESSION_SECRET: "sixteen-chars-ok",
      S3_ENDPOINT: "https://account.r2.cloudflarestorage.com",
      S3_BUCKET: "yekpare-media",
      S3_ACCESS_KEY_ID: "ak",
      S3_SECRET_ACCESS_KEY: "sk",
      S3_PUBLIC_BASE_URL: "https://media.turk.eco",
    });
    assert.equal(vars.S3_BUCKET, "yekpare-media");
    assert.equal(
      vars.S3_ENDPOINT,
      "https://fb9f9c9dc1991b7cc17ba58ab3c2e8726.r2.cloudflarestorage.com",
    );
    assert.equal(hasS3MediaConfig(vars), true);
    assert.equal(vars.SKIP_MEDIA_STORAGE_CHECK, undefined);
  });

  it("skips media assertion when S3 secrets are incomplete", () => {
    const vars = buildContainerEnv({
      DATABASE_URL: "postgres://neon/neondb",
      SESSION_SECRET: "sixteen-chars-ok",
      S3_BUCKET: "yekpare-media",
    });
    assert.equal(vars.SKIP_MEDIA_STORAGE_CHECK, "1");
    assert.equal(hasS3MediaConfig(vars), false);
  });

  it("coerces a pasted S3_ENDPOINT blob to the Render dual-write host", () => {
    const real = "https://fb9f9c9dc1991b7cc17ba58ab3c2e8726.r2.cloudflarestorage.com";
    const blob = `S3_ENDPOINT=${real}\nS3_BUCKET=yekpare-media\nS3_PUBLIC_BASE_URL=https://pub-c13f0f77c2d140cb89cd2e9b5af2c87e.r2.dev`;
    const vars = buildContainerEnv({
      DATABASE_URL: "postgres://neon/neondb",
      SESSION_SECRET: "sixteen-chars-ok",
      S3_ENDPOINT: blob,
      S3_ACCESS_KEY_ID: "ak",
      S3_SECRET_ACCESS_KEY: "sk",
    });
    assert.equal(vars.S3_ENDPOINT, real);
    assert.equal(vars.S3_BUCKET, "yekpare-media");
    assert.equal(hasS3MediaConfig(vars), true);
    assert.equal(vars.SKIP_MEDIA_STORAGE_CHECK, undefined);
  });

  it("forwards R2_ENDPOINT when S3_ENDPOINT is missing", () => {
    const vars = buildContainerEnv({
      DATABASE_URL: "postgres://neon/neondb",
      SESSION_SECRET: "sixteen-chars-ok",
      R2_ENDPOINT: "https://fb9f9c9dc1991b7cc17ba58ab3c2e8726.r2.cloudflarestorage.com",
      S3_BUCKET: "yekpare-media",
      S3_ACCESS_KEY_ID: "ak",
      S3_SECRET_ACCESS_KEY: "sk",
    });
    assert.equal(vars.S3_ENDPOINT, "https://fb9f9c9dc1991b7cc17ba58ab3c2e8726.r2.cloudflarestorage.com");
    assert.equal(hasS3MediaConfig(vars), true);
  });

  it("ignores empty and non-string Worker bindings", () => {
    const vars = buildContainerEnv({
      DATABASE_URL: "  ",
      SESSION_SECRET: "",
      S3_ENDPOINT: { get() {} },
    });
    assert.equal("DATABASE_URL" in vars, false);
    assert.equal("SESSION_SECRET" in vars, false);
    assert.equal(vars.S3_ENDPOINT, undefined);
  });

  it("reports missing boot secrets", () => {
    assert.deepEqual(missingContainerBootSecrets({}), ["DATABASE_URL", "SESSION_SECRET"]);
    assert.equal(hasDatabaseUrl({ DATABASE_URL: "postgres://x" }), true);
    assert.deepEqual(
      missingContainerBootSecrets({
        DATABASE_URL: "postgres://x",
        SESSION_SECRET: "sixteen-chars-ok",
      }),
      [],
    );
  });

  it("clones a request without an abort signal", () => {
    const ac = new AbortController();
    ac.abort();
    const original = new Request("https://turk.eco/api/healthz", { signal: ac.signal });
    const clean = requestWithoutAbort(original);
    assert.equal(clean.url, "https://turk.eco/api/healthz");
    assert.equal(clean.signal.aborted, false);
  });
});
