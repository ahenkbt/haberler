import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseMediaUploadFname, s3MediaEnvReady } from "./hm-editor-media-s3-edge.js";

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
});
