import { afterEach, describe, expect, it } from "vitest";
import {
  getMediaStorageMode,
  isS3TransportError,
  noteS3RuntimeFailure,
  shouldUseS3ForMediaIo,
} from "./mediaStorageConfig";

const ENV_KEYS = [
  "RENDER",
  "RENDER_SERVICE_ID",
  "MEDIA_STORAGE_MODE",
  "S3_BUCKET",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_ENDPOINT",
] as const;

const saved: Record<string, string | undefined> = {};

function snapshotEnv(): void {
  for (const key of ENV_KEYS) saved[key] = process.env[key];
}

function restoreEnv(): void {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
}

function clearMediaEnv(): void {
  for (const key of ENV_KEYS) delete process.env[key];
}

describe("mediaStorageConfig", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("Render hosting forces volume mode even when S3 env is set", () => {
    snapshotEnv();
    clearMediaEnv();
    process.env.RENDER = "true";
    process.env.S3_BUCKET = "bucket";
    process.env.S3_ACCESS_KEY_ID = "key";
    process.env.S3_SECRET_ACCESS_KEY = "secret";
    process.env.S3_ENDPOINT = "https://account.r2.cloudflarestorage.com";

    expect(getMediaStorageMode()).toBe("volume");
    expect(shouldUseS3ForMediaIo()).toBe(false);
  });

  it("shouldUseS3ForMediaIo is true only when mode is s3 and runtime not disabled", () => {
    snapshotEnv();
    clearMediaEnv();
    process.env.MEDIA_STORAGE_MODE = "s3";
    process.env.S3_BUCKET = "bucket";
    process.env.S3_ACCESS_KEY_ID = "key";
    process.env.S3_SECRET_ACCESS_KEY = "secret";
    process.env.S3_ENDPOINT = "https://account.r2.cloudflarestorage.com";

    expect(shouldUseS3ForMediaIo()).toBe(true);
    noteS3RuntimeFailure("EPROTO handshake");
    expect(shouldUseS3ForMediaIo()).toBe(false);
  });

  it("detects S3 TLS transport errors", () => {
    expect(
      isS3TransportError(new Error("write EPROTO ssl3_read_bytes:ssl/tls alert handshake failure")),
    ).toBe(true);
    expect(isS3TransportError(new Error("NotFound"))).toBe(false);
  });
});
