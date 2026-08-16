import { describe, expect, it } from "vitest";
import {
  canonicalFreePbxHost,
  FREEPBX_PUBLIC_WSS_HOST,
  normalizeLocalWssUrl,
} from "./local-wss-url.js";

describe("normalizeLocalWssUrl", () => {
  it("rewrites Hostinger aliases to the Let's Encrypt WSS hostname", () => {
    expect(normalizeLocalWssUrl("wss://srv1828480.hstgr.cloud")).toBe(
      `wss://${FREEPBX_PUBLIC_WSS_HOST}:8089/ws`,
    );
    expect(normalizeLocalWssUrl("wss://187.127.82.106")).toBe(
      `wss://${FREEPBX_PUBLIC_WSS_HOST}:8089/ws`,
    );
    expect(normalizeLocalWssUrl("wss://srv1828480.hstgr.cloud:8089/ws")).toBe(
      `wss://${FREEPBX_PUBLIC_WSS_HOST}:8089/ws`,
    );
  });

  it("keeps the certificate hostname and adds port/path", () => {
    expect(normalizeLocalWssUrl(`wss://${FREEPBX_PUBLIC_WSS_HOST}`)).toBe(
      `wss://${FREEPBX_PUBLIC_WSS_HOST}:8089/ws`,
    );
  });

  it("does not rewrite Verimor WebRTC URLs", () => {
    expect(normalizeLocalWssUrl("wss://api.bulutsantralim.com:7443")).toBe(
      "wss://api.bulutsantralim.com:7443",
    );
  });

  it("maps Hostinger SIP hosts to the certificate CN", () => {
    expect(canonicalFreePbxHost("srv1828480.hstgr.cloud")).toBe(FREEPBX_PUBLIC_WSS_HOST);
    expect(canonicalFreePbxHost("187.127.82.106")).toBe(FREEPBX_PUBLIC_WSS_HOST);
    expect(canonicalFreePbxHost(FREEPBX_PUBLIC_WSS_HOST)).toBe(FREEPBX_PUBLIC_WSS_HOST);
  });
});
