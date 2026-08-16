import { describe, expect, it } from "vitest";
import { normalizeLocalWssUrl } from "./local-wss-url.js";

describe("normalizeLocalWssUrl", () => {
  it("adds FreePBX WSS port and /ws path for Hostinger hosts", () => {
    expect(normalizeLocalWssUrl("wss://srv1828480.hstgr.cloud")).toBe(
      "wss://srv1828480.hstgr.cloud:8089/ws",
    );
    expect(normalizeLocalWssUrl("wss://187.127.82.106")).toBe("wss://187.127.82.106:8089/ws");
  });

  it("leaves an explicit FreePBX path unchanged", () => {
    expect(normalizeLocalWssUrl("wss://srv1828480.hstgr.cloud:8089/ws")).toBe(
      "wss://srv1828480.hstgr.cloud:8089/ws",
    );
  });

  it("does not rewrite Verimor WebRTC URLs", () => {
    expect(normalizeLocalWssUrl("wss://api.bulutsantralim.com:7443")).toBe(
      "wss://api.bulutsantralim.com:7443",
    );
  });
});
