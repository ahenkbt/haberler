import { describe, expect, it } from "vitest";
import {
  isAlreadyNewsCoverProxySrc,
  newsCoverProxyPath,
  parseNewsCoverProxyTarget,
} from "./news-cover-proxy.js";

describe("news cover proxy", () => {
  it("SHA/RSS harici kapak URL’sini vekil yoluna çevirir", () => {
    const src = "https://sehirhaberajansi.com.tr/uploads/reha.jpg";
    const path = newsCoverProxyPath(src);
    expect(path).toBe(`/api/media/news-cover?u=${encodeURIComponent(src)}`);
    expect(parseNewsCoverProxyTarget(src)?.hostname).toBe("sehirhaberajansi.com.tr");
  });

  it("localhost / metadata / döngüsel vekili reddeder", () => {
    expect(parseNewsCoverProxyTarget("http://localhost/secret.png")).toBeNull();
    expect(parseNewsCoverProxyTarget("http://127.0.0.1/x")).toBeNull();
    expect(parseNewsCoverProxyTarget("http://169.254.169.254/latest/meta-data")).toBeNull();
    expect(parseNewsCoverProxyTarget("https://cdn.example.com/api/media/news-cover?u=https://evil")).toBeNull();
    expect(newsCoverProxyPath("data:image/png;base64,aaa")).toBeNull();
  });

  it("zaten vekil olan src’yi tanır", () => {
    expect(isAlreadyNewsCoverProxySrc("/api/media/news-cover?u=https%3A%2F%2Fx.com%2Fa.jpg")).toBe(true);
    expect(isAlreadyNewsCoverProxySrc("https://cdn.example.com/a.jpg")).toBe(false);
  });
});
