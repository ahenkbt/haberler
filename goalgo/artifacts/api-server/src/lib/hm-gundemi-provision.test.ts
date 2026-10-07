import { afterEach, describe, expect, it } from "vitest";
import {
  collectGundemiOrgHosts,
  gundemiDnsRecordName,
  isGundemiOrgManagedHost,
  normalizeGundemiHostname,
  resetGundemiProvisionCaches,
  ensureGundemiProxiedA,
  GUNDEMI_CATCHALL_ROUTE_PATTERNS,
} from "./hm-gundemi-provision.js";
import { GUNDEMI_PHP_ORIGIN_IP, GUNDEMI_ZONE } from "./hm-gundemi-regional-sites.js";

afterEach(() => {
  resetGundemiProvisionCaches();
  delete process.env.CLOUDFLARE_API_TOKEN;
  delete process.env.CF_API_TOKEN;
});

describe("gundemi domain detection", () => {
  it("normalize + managed host", () => {
    expect(normalizeGundemiHostname("https://WWW.Ege.Gundemi.Org/path")).toBe("ege.gundemi.org");
    expect(isGundemiOrgManagedHost("ege.gundemi.org")).toBe(true);
    expect(isGundemiOrgManagedHost("yeni.gundemi.org")).toBe(true);
    expect(isGundemiOrgManagedHost("gundemi.org")).toBe(true);
    expect(isGundemiOrgManagedHost("www.gundemi.org")).toBe(true);
    expect(isGundemiOrgManagedHost("turkatahaber.com")).toBe(false);
    expect(isGundemiOrgManagedHost("ege.gundemi.org.evil.com")).toBe(false);
  });

  it("DNS record names", () => {
    expect(gundemiDnsRecordName("ege.gundemi.org")).toBe("ege");
    expect(gundemiDnsRecordName("yeni.gundemi.org")).toBe("yeni");
    expect(gundemiDnsRecordName("gundemi.org")).toBe("@");
    expect(gundemiDnsRecordName("www.gundemi.org")).toBe("@");
    expect(gundemiDnsRecordName("ornek.com")).toBe(null);
  });

  it("collects only gundemi hosts from domain triad", () => {
    expect(
      collectGundemiOrgHosts("https://www.yeni.gundemi.org/", "ornek.com", "yeni.gundemi.org"),
    ).toEqual(["yeni.gundemi.org"]);
    expect(collectGundemiOrgHosts("asg.com", null, null)).toEqual([]);
  });

  it("no SPA catch-all (apex + regionals → Traefik PHP)", () => {
    expect(GUNDEMI_CATCHALL_ROUTE_PATTERNS).toEqual([]);
    expect(GUNDEMI_CATCHALL_ROUTE_PATTERNS).not.toContain("gundemi.org/*");
    expect(GUNDEMI_CATCHALL_ROUTE_PATTERNS).not.toContain("*.gundemi.org/*");
    expect(GUNDEMI_ZONE).toBe("gundemi.org");
    expect(GUNDEMI_PHP_ORIGIN_IP).toBe("187.77.84.201");
  });
});

describe("ensureGundemiProxiedA soft-fail", () => {
  it("token yoksa no_token döner ve atlar", async () => {
    const r = await ensureGundemiProxiedA("yeni.gundemi.org");
    expect(r.action).toBe("no_token");
    expect(r.fqdn).toBe("yeni.gundemi.org");
    expect(r.name).toBe("yeni");
    expect(r.ip).toBe(GUNDEMI_PHP_ORIGIN_IP);
  });

  it("gundemi olmayan host skipped", async () => {
    const r = await ensureGundemiProxiedA("ornek.com");
    expect(r.action).toBe("skipped");
  });
});
