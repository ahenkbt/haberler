import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { resolvePortalRequestOrigin } from "./site-public-origin.js";

function req(host: string): Request {
  return {
    get(name: string) {
      if (name === "x-forwarded-host") return host;
      if (name === "x-forwarded-proto") return "https";
      return undefined;
    },
  } as Request;
}

describe("resolvePortalRequestOrigin", () => {
  it("keeps turkatahaber.com as the article origin", () => {
    expect(resolvePortalRequestOrigin(req("turkatahaber.com"))).toBe("https://turkatahaber.com");
    expect(resolvePortalRequestOrigin(req("www.turkatahaber.com"))).toBe("https://turkatahaber.com");
  });

  it("keeps gundemi.org apex alias as request origin (turkatahaber content)", () => {
    expect(resolvePortalRequestOrigin(req("gundemi.org"))).toBe("https://gundemi.org");
    expect(resolvePortalRequestOrigin(req("www.gundemi.org"))).toBe("https://gundemi.org");
  });

  it("keeps the agency portal origin on ahenk.net.tr", () => {
    expect(resolvePortalRequestOrigin(req("ahenk.net.tr"))).toBe("https://ahenk.net.tr");
  });
});
