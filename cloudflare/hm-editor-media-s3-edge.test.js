import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseMediaUploadFname, s3MediaEnvReady, coerceR2S3Endpoint, coerceS3Bucket, coerceS3AccessKeyId, listR2S3EndpointCandidates, listR2PublicBaseCandidates, listMediaObjectKeys, RENDER_R2_S3_ENDPOINT, CF_ACCOUNT_R2_S3_ENDPOINT, handleMediaGetFromR2, handleMediaEdgeHealth, handleMediaR2PutProxy, mediaEdgeHealthPayload, r2Binding } from "./hm-editor-media-s3-edge.js";

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
          if (key !== fname && key !== `yekpare-media/${fname}`) return null;
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
      S3_BUCKET: "yekpare-media",
      S3_ENDPOINT: `${CF_ACCOUNT_R2_S3_ENDPOINT}\nS3_PUBLIC_BASE_URL=${pub}`,
    });
    assert.equal(listed[0], pub);
    assert.ok(listed.includes(`${pub}/yekpare-media`));
  });

  it("prefers S3_PUBLIC_BASE_URL from the endpoint blob over a later GitHub field", () => {
    const fromBlob = "https://pub-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.r2.dev/yekpare-media";
    const fromGithub = "https://pub-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.r2.dev";
    const listed = listR2PublicBaseCandidates({
      S3_PUBLIC_BASE_URL: fromGithub,
      S3_BUCKET: "yekpare-media",
      S3_ENDPOINT: `S3_ENDPOINT=${CF_ACCOUNT_R2_S3_ENDPOINT}\nS3_PUBLIC_BASE_URL=${fromBlob}`,
    });
    assert.equal(listed[0], fromBlob);
  });

  it("keeps /yekpare-media on the public base (path is not stripped to origin)", () => {
    const pub = "https://pub-c13f0f77c2d140cb89cd2e9b5af2c87e.r2.dev/yekpare-media";
    const listed = listR2PublicBaseCandidates({
      S3_PUBLIC_BASE_URL: pub,
      S3_BUCKET: "yekpare-media",
    });
    assert.equal(listed[0], pub);
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

  it("uses bucket/file as the S3 object key (not yekpare-media/yekpare-media/file)", () => {
    const fname = "1786896263302-0937c05a03d02845.webp";
    const keys = listMediaObjectKeys({ S3_BUCKET: "yekpare-media" }, fname);
    assert.equal(keys[0], fname);
    assert.ok(keys.includes(`uploads/${fname}`));
    assert.ok(keys.includes(`yekpare-media/${fname}`));
  });

  it("returns null on miss so the container can try", async () => {
    const res = await handleMediaGetFromR2(
      new Request("https://turk.eco/api/media/uploads/1786896263302-0937c05a03d02845.webp"),
      {},
    );
    assert.equal(res, null);
  });

  it("records miss diagnostics for the worker 404 wrapper", async () => {
    const diag = {};
    const res = await handleMediaGetFromR2(
      new Request("https://turk.eco/api/media/uploads/1786896263302-0937c05a03d02845.webp"),
      {},
      diag,
    );
    assert.equal(res, null);
    assert.equal(diag.lastS3, "none");
    assert.equal(diag.ready, "0");
  });

  it("reports edge health without leaking secrets", async () => {
    const payload = mediaEdgeHealthPayload({
      S3_ENDPOINT: RENDER_R2_S3_ENDPOINT,
      S3_BUCKET: "yekpare-media",
      S3_ACCESS_KEY_ID: "ak",
      S3_SECRET_ACCESS_KEY: "sk",
    });
    assert.equal(payload.ready, true);
    assert.equal(payload.accessKey, true);
    assert.equal(payload.hostPrefix, "fb9f");
    assert.equal(payload.endpointLength, RENDER_R2_S3_ENDPOINT.length);
    const origFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(null, { status: 404 });
    try {
      const res = await handleMediaEdgeHealth(
        new Request("https://turk.eco/api/healthz/media-edge"),
        { S3_ENDPOINT: RENDER_R2_S3_ENDPOINT, S3_BUCKET: "yekpare-media", S3_ACCESS_KEY_ID: "ak", S3_SECRET_ACCESS_KEY: "sk" },
      );
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("x-yekpare-media"), "health");
      const body = await res.json();
      assert.equal(body.s3Probe?.[0]?.host, "fb9f");
      assert.equal(body.s3Probe?.[0]?.status, 404);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it("rejects unauthenticated R2 put proxy requests", async () => {
    const res = await handleMediaR2PutProxy(
      new Request("https://turk.eco/api/media/r2-put-proxy", {
        method: "POST",
        headers: {
          "x-yekpare-r2-fname": "cover.webp",
          "x-yekpare-r2-mime": "image/webp",
          "x-yekpare-r2-exp": String(Date.now() + 60_000),
          "x-yekpare-r2-nonce": "abc",
        },
        body: new Uint8Array([1, 2, 3]),
      }),
      { HM_EDGE_BRIDGE_SECRET: "test-secret" },
    );
    assert.equal(res.status, 401);
  });

  it("GETs path-style /yekpare-media/<file> without a doubled prefix", async () => {
    const fname = "1786896263302-0937c05a03d02845.webp";
    const env = {
      S3_ENDPOINT: CF_ACCOUNT_R2_S3_ENDPOINT,
      S3_BUCKET: "yekpare-media",
      S3_ACCESS_KEY_ID: "ak",
      S3_SECRET_ACCESS_KEY: "sk",
    };
    const origFetch = globalThis.fetch;
    const urls = [];
    globalThis.fetch = async (input) => {
      const u = typeof input === "string" ? input : String(input && input.url ? input.url : input);
      urls.push(u);
      const pathOk = u.includes(`/${fname}`) && !u.includes("/yekpare-media/yekpare-media/");
      if (pathOk && u.includes(".r2.cloudflarestorage.com")) {
        return new Response(new Uint8Array([0x52, 0x49, 0x46, 0x46]), {
          status: 200,
          headers: { "content-type": "image/webp", "content-length": "4" },
        });
      }
      return new Response(null, { status: 404 });
    };
    try {
      const res = await handleMediaGetFromR2(
        new Request(`https://turk.eco/api/media/uploads/${fname}`),
        env,
      );
      assert.equal(res.status, 200);
      assert.ok(urls.some((u) => u.includes(`/${fname}`) && !u.includes("/yekpare-media/yekpare-media/")));
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});
