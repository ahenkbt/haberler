import { afterEach, describe, expect, it } from "vitest";
import {
  getMediaStorageMode,
  isS3MediaConfigured,
  isS3TransportError,
  noteS3RuntimeFailure,
  coerceR2S3Endpoint,
  getS3Endpoint,
  shouldReadS3ForMediaIo,
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

  it("uses R2 when MEDIA_STORAGE_MODE=s3 and S3 env is set", () => {
    snapshotEnv();
    clearMediaEnv();
    process.env.MEDIA_STORAGE_MODE = "s3";
    process.env.S3_BUCKET = "yekpare-media";
    process.env.S3_ACCESS_KEY_ID = "key";
    process.env.S3_SECRET_ACCESS_KEY = "secret";
    process.env.S3_ENDPOINT = "https://fb9f9c9dc1991b7cc17ba58ab3c2e8726.r2.cloudflarestorage.com";

    expect(getMediaStorageMode()).toBe("s3");
    expect(shouldUseS3ForMediaIo()).toBe(true);
  });

  it("falls back to volume when S3 is not configured", () => {
    snapshotEnv();
    clearMediaEnv();

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

  it("extracts R2 API host from a pasted env block in S3_ENDPOINT", () => {
    snapshotEnv();
    clearMediaEnv();
    const real = "https://fb9f9c9dc1991b7cc17ba58ab3c2e8726.r2.cloudflarestorage.com";
    process.env.MEDIA_STORAGE_MODE = "s3";
    process.env.S3_BUCKET = "yekpare-media";
    process.env.S3_ACCESS_KEY_ID = "key";
    process.env.S3_SECRET_ACCESS_KEY = "secret";
    process.env.S3_ENDPOINT = [
      "S3_ENDPOINT=" + real,
      "S3_BUCKET=yekpare-media",
      "S3_PUBLIC_BASE_URL=https://pub-c13f0f77c2d140cb89cd2e9b5af2c87e.r2.dev",
    ].join("\n");

    expect(coerceR2S3Endpoint(process.env.S3_ENDPOINT)).toBe(real);
    expect(getS3Endpoint()).toBe(real);
    expect(isS3MediaConfigured()).toBe(true);
    expect(shouldReadS3ForMediaIo()).toBe(true);
  });

  it("still reads R2 after a runtime write failure", () => {
    snapshotEnv();
    clearMediaEnv();
    process.env.MEDIA_STORAGE_MODE = "s3";
    process.env.S3_BUCKET = "yekpare-media";
    process.env.S3_ACCESS_KEY_ID = "key";
    process.env.S3_SECRET_ACCESS_KEY = "secret";
    process.env.S3_ENDPOINT = "https://account.r2.cloudflarestorage.com";
    noteS3RuntimeFailure("startup probe");
    expect(shouldUseS3ForMediaIo()).toBe(false);
    expect(shouldReadS3ForMediaIo()).toBe(true);
  });
});
