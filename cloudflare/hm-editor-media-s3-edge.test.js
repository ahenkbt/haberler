import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseMediaUploadFname, s3MediaEnvReady, coerceR2S3Endpoint, coerceS3Bucket, coerceS3AccessKeyId, listR2S3EndpointCandidates, listR2PublicBaseCandidates, RENDER_R2_S3_ENDPOINT, CF_ACCOUNT_R2_S3_ENDPOINT, handleMediaGetFromR2, r2Binding } from "./hm-editor-media-s3-edge.js";

describe("hm-editor-media-s3-edge", () => {
  it("parses safe upload filenames", () => {
    assert.equal(
      parseMediaUploadFname("/api/media/uploads/1786550151399-48a6538344e35977.webp"),
      "1786550151399-48a6538344e35977.webp",
    );
    assert.equal(parseMediaUploadFname("/api/media/uploads/../secret"), null);
    assert.equal(parseMediaUploadFname("/api/news"), null);
  });

  it("requires full R2 env before serving", () => {
    assert.equal(s3MediaEnvReady({}), false);
    assert.equal(
      s3MediaEnvReady({
        S3_ENDPOINT: "https://account.r2.cloudflarestorage.com",
        S3_BUCKET: "yekpare-media",
        S3_ACCESS_KEY_ID: "ak",
        S3_SECRET_ACCESS_KEY: "sk",
      }),
      true,
    );
  });

  it("coerces a pasted S3_ENDPOINT env block to the R2 API host", () => {
    const real = "https://fb9f9c9dc1991b7cc17ba58ab3c2e8726.r2.cloudflarestorage.com";
    const blob = `S3_ENDPOINT=${real}\nS3_BUCKET=yekpare-media\nS3_PUBLIC_BASE_URL=https://pub-c13f0f77c2d140cb89cd2e9b5af2c87e.r2.dev`;
    assert.equal(coerceR2S3Endpoint(blob), real);
    assert.equal(
      s3MediaEnvReady({
        S3_ENDPOINT: blob,
        S3_BUCKET: "yekpare-media",
        S3_ACCESS_KEY_ID: "ak",
        S3_SECRET_ACCESS_KEY: "sk",
      }),
      true,
    );
  });

  it("tries the Render dual-write host first when the blob lists the wrangler account first", () => {
    const blob = `${CF_ACCOUNT_R2_S3_ENDPOINT} ${RENDER_R2_S3_ENDPOINT}`;
    const listed = listR2S3EndpointCandidates(blob);
    assert.equal(listed[0], RENDER_R2_S3_ENDPOINT);
    assert.ok(listed.includes(CF_ACCOUNT_R2_S3_ENDPOINT));
    assert.equal(coerceR2S3Endpoint(blob), RENDER_R2_S3_ENDPOINT);
  });

  it("serves GET from the native R2 bucket binding without S3 API", async () => {
    const fname = "1786401635611-a8d116dd0f19d485.webp";
    const env = {
      MEDIA_BUCKET: {
        get: async (key) => {
          if (key !== fname) return null;
          return {
            body: new Uint8Array([0x52, 0x49, 0x46, 0x46]),
            httpMetadata: { contentType: "image/webp" },
            size: 4,
          };
        },
        head: async () => null,
      },
    };
    assert.ok(r2Binding(env));
    const res = await handleMediaGetFromR2(
      new Request(`https://turk.eco/api/media/uploads/${fname}`),
      env,
    );
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("x-yekpare-media"), "r2-binding");
    assert.equal(res.headers.get("content-type"), "image/webp");
  });

  it("extracts r2.dev public bases from S3_PUBLIC_BASE_URL and a pasted endpoint blob", () => {
    const pub = "https://pub-c13f0f77c2d140cb89cd2e9b5af2c87e.r2.dev";
    const listed = listR2PublicBaseCandidates({
      S3_PUBLIC_BASE_URL: pub,
      S3_ENDPOINT: `${CF_ACCOUNT_R2_S3_ENDPOINT}\nS3_PUBLIC_BASE_URL=${pub}`,
    });
    assert.equal(listed[0], pub);
    assert.equal(listed.length, 1);
  });

  it("extracts bucket and keys from a pasted env block", () => {
    const blob = [
      "S3_ENDPOINT=https://fb9f9c9dc1991b7cc17ba58ab3c2e8726.r2.cloudflarestorage.com",
      "S3_BUCKET=yekpare-media",
      "S3_ACCESS_KEY_ID=abcdef0123456789abcdef0123456789",
      "S3_SECRET_ACCESS_KEY=secretsecretsecretsecretsecretsecret12",
      "S3_PUBLIC_BASE_URL=https://pub-c13f0f77c2d140cb89cd2e9b5af2c87e.r2.dev",
    ].join("\n");
    assert.equal(coerceS3Bucket(blob, blob), "yekpare-media");
    assert.equal(coerceS3AccessKeyId(blob, blob), "abcdef0123456789abcdef0123456789");
    assert.equal(s3MediaEnvReady({ S3_ENDPOINT: blob, S3_BUCKET: blob, S3_ACCESS_KEY_ID: blob, S3_SECRET_ACCESS_KEY: blob }), true);
  });

  it("serves GET from r2.dev before the S3 API", async () => {
    const fname = "1786904268708-0049503dc6a1d47a.webp";
    const pub = "https://pub-c13f0f77c2d140cb89cd2e9b5af2c87e.r2.dev";
    const env = {
      S3_ENDPOINT: CF_ACCOUNT_R2_S3_ENDPOINT,
      S3_BUCKET: "yekpare-media",
      S3_ACCESS_KEY_ID: "ak",
      S3_SECRET_ACCESS_KEY: "sk",
      S3_PUBLIC_BASE_URL: pub,
    };
    const origFetch = globalThis.fetch;
    let s3Called = false;
    globalThis.fetch = async (input) => {
      const u = String(input?.url || input);
      if (u.startsWith(`${pub}/`)) {
        return new Response(new Uint8Array([0x52, 0x49, 0x46, 0x46]), {
          status: 200,
          headers: { "content-type": "image/webp", "content-length": "4" },
        });
      }
      if (u.includes(".r2.cloudflarestorage.com")) {
        s3Called = true;
        throw new Error("S3 should not run when public GET succeeds");
      }
      return origFetch(input);
    };
    try {
      const res = await handleMediaGetFromR2(
        new Request(`https://turk.eco/api/media/uploads/${fname}`),
        env,
      );
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("x-yekpare-media"), "r2-public");
      assert.equal(s3Called, false);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it("keeps trying the next S3 host after TLS failure and ignores public 404 HTML", async () => {
    const fname = "1786904268708-0049503dc6a1d47a.webp";
    const pub = "https://pub-c13f0f77c2d140cb89cd2e9b5af2c87e.r2.dev";
    const blob = `${RENDER_R2_S3_ENDPOINT} ${CF_ACCOUNT_R2_S3_ENDPOINT}`;
    const env = {
      S3_ENDPOINT: blob,
      S3_BUCKET: "yekpare-media",
      S3_ACCESS_KEY_ID: "ak",
      S3_SECRET_ACCESS_KEY: "sk",
      S3_PUBLIC_BASE_URL: pub,
    };
    const origFetch = globalThis.fetch;
    const s3Hosts = [];
    globalThis.fetch = async (input) => {
      const u = String(input?.url || input);
      if (u.includes(".r2.dev")) {
        return new Response("<!doctype html>not found", {
          status: 404,
          headers: { "content-type": "text/html" },
        });
      }
      if (u.includes(".r2.cloudflarestorage.com")) {
        const host = new URL(u).hostname;
        s3Hosts.push(host);
        if (host.startsWith("fb9f")) {
          throw new Error("TLS handshake failure SSL alert 40");
        }
        return new Response(new Uint8Array([0x52, 0x49, 0x46, 0x46]), {
          status: 200,
          headers: { "content-type": "image/webp", "content-length": "4" },
        });
      }
      return origFetch(input);
    };
    try {
      const res = await handleMediaGetFromR2(
        new Request(`https://turk.eco/api/media/uploads/${fname}`),
        env,
      );
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("x-yekpare-media"), "r2");
      assert.ok(s3Hosts[0]?.startsWith("fb9f"), `Render dual-write first, got ${s3Hosts.join(",")}`);
      assert.ok(s3Hosts.some((h) => h.startsWith("16f5")));
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});
