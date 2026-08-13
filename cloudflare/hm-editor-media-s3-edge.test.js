import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseMediaUploadFname, s3MediaEnvReady, coerceR2S3Endpoint, listR2S3EndpointCandidates, RENDER_R2_S3_ENDPOINT, CF_ACCOUNT_R2_S3_ENDPOINT, handleMediaGetFromR2, r2Binding } from "./hm-editor-media-s3-edge.js";

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
});
