import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  fetchStaticAssets,
  isYektubeSpaHtml,
  isYektubeSurfacePath,
  nextSameOriginAssetPath,
  rewriteYektubeSpaPath,
  withAssetPath,
} from "./yektube-spa.js";

describe("rewriteYektubeSpaPath", () => {
  it("maps /yp and nested routes to yektube-v2/index.html", () => {
    assert.equal(rewriteYektubeSpaPath("/yp"), "/yektube-v2/index.html");
    assert.equal(rewriteYektubeSpaPath("/yp/"), "/yektube-v2/index.html");
    assert.equal(rewriteYektubeSpaPath("/yp/watch/abc"), "/yektube-v2/index.html");
    assert.equal(rewriteYektubeSpaPath("/yektube-v2/index.html"), "/yektube-v2/index.html");
    assert.equal(rewriteYektubeSpaPath("/studio"), "/yektube-v2/index.html");
  });

  it("maps /yp static files onto yektube-v2 copies", () => {
    assert.equal(rewriteYektubeSpaPath("/yp/sw.js"), "/yektube-v2/sw.js");
    assert.equal(rewriteYektubeSpaPath("/yp/manifest.webmanifest"), "/yektube-v2/manifest.webmanifest");
  });

  it("does not rewrite hashed JS/CSS", () => {
    assert.equal(rewriteYektubeSpaPath("/yektube-v2/assets/index-DY9zYfzz.js"), null);
    assert.equal(rewriteYektubeSpaPath("/yp/assets/index-DY9zYfzz.js"), null);
  });

  it("leaves portal routes alone", () => {
    assert.equal(rewriteYektubeSpaPath("/"), null);
    assert.equal(rewriteYektubeSpaPath("/tr/ahg"), null);
    assert.equal(rewriteYektubeSpaPath("/admin"), null);
  });
});

describe("isYektubeSurfacePath / isYektubeSpaHtml", () => {
  it("detects dedicated and portal surfaces", () => {
    assert.equal(isYektubeSurfacePath("/yp"), true);
    assert.equal(isYektubeSurfacePath("/yektube-v2/watch/1"), true);
    assert.equal(isYektubeSurfacePath("/tr/ahg"), false);
  });

  it("accepts Yektube index HTML and rejects portal / Express 404", () => {
    assert.equal(
      isYektubeSpaHtml('<title>Yektube</title><script src="/yektube-v2/assets/index-abc.js">'),
      true,
    );
    assert.equal(isYektubeSpaHtml("<title>turk.eco — Haberler ve Videolar</title>"), false);
    assert.equal(isYektubeSpaHtml("<pre>Cannot GET /yektube-v2/index.html</pre>"), false);
  });
});

describe("withAssetPath / fetchStaticAssets", () => {
  it("uses redirect=manual so 307 does not re-enter the Worker", () => {
    const req = withAssetPath(new Request("https://yektube.com/yp/"), "/yektube-v2/index.html");
    assert.equal(new URL(req.url).pathname, "/yektube-v2/index.html");
    assert.equal(req.redirect, "manual");
  });

  it("follows same-origin Assets Location internally", () => {
    assert.equal(
      nextSameOriginAssetPath("https://yektube.com/yektube-v2/index.html", "/yektube-v2/"),
      "/yektube-v2/",
    );
    assert.equal(
      nextSameOriginAssetPath("https://yektube.com/yektube-v2/index.html", "https://evil.test/x"),
      null,
    );
  });

  it("follows html_handling 307 via ASSETS instead of returning the redirect", async () => {
    const calls = [];
    const env = {
      ASSETS: {
        fetch(req) {
          calls.push(new URL(req.url).pathname);
          assert.equal(req.redirect, "manual");
          if (new URL(req.url).pathname === "/yektube-v2/index.html") {
            return new Response(null, {
              status: 307,
              headers: { location: "/yektube-v2/" },
            });
          }
          return new Response('<title>Yektube</title><script src="/yektube-v2/assets/index-x.js">', {
            status: 200,
            headers: { "content-type": "text/html" },
          });
        },
      },
    };
    const resp = await fetchStaticAssets(
      env,
      new Request("https://yektube.com/yp/"),
      "/yektube-v2/index.html",
    );
    assert.equal(resp.status, 200);
    assert.equal(isYektubeSpaHtml(await resp.text()), true);
    assert.deepEqual(calls, ["/yektube-v2/index.html", "/yektube-v2/"]);
  });
});
