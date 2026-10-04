import { describe, expect, it } from "vitest";
import {
  buildLlmAttempts,
  defaultLlmModel,
  isMaskedKeyPlaceholder,
  maskApiKeyLast4,
  statusFromOwnKeys,
  toProviderPublic,
} from "./hm-llm-catalog.js";
import { decryptLlmApiKey, encryptLlmApiKey } from "./hm-llm-crypto.js";

describe("hm llm catalog", () => {
  it("uses the cheap default models", () => {
    expect(defaultLlmModel("evren")).toBe("deepseek-v4-flash");
    expect(defaultLlmModel("nvidia")).toBe("nvidia/nemotron-3.5-lightning");
    expect(defaultLlmModel("gemini")).toBe("gemini-3.1-flash-lite");
    expect(defaultLlmModel("openai")).toBe("gpt-5-nano");
  });

  it("masks only the last 4 characters", () => {
    expect(maskApiKeyLast4("wxyz")).toBe("••••wxyz");
    expect(maskApiKeyLast4("")).toBe("");
    expect(isMaskedKeyPlaceholder("••••wxyz")).toBe(true);
    expect(isMaskedKeyPlaceholder("sk-live-secret")).toBe(false);
  });

  it("tries the site key before the Haber Merkezi key and then env", () => {
    const attempts = buildLlmAttempts({
      site: [
        { id: 1, provider: "openai", apiKey: "site-openai", model: "gpt-4o-mini", enabled: true, priority: 40 },
        { id: 2, provider: "evren", apiKey: "", model: "auto", enabled: true, priority: 10 },
      ],
      global: [
        { id: 3, provider: "evren", apiKey: "global-evren", model: "auto", enabled: true, priority: 10 },
        { id: 4, provider: "openai", apiKey: "global-openai", model: "gpt-4o-mini", enabled: true, priority: 40 },
      ],
      env: [{ id: null, provider: "nvidia", apiKey: "env-nvidia", model: "meta/llama-3.1-8b-instruct", enabled: true, priority: 20 }],
    });
    expect(attempts.map((a) => `${a.scope}:${a.provider}`)).toEqual([
      "site:openai",
      "global:evren",
      "global:openai",
      "env:nvidia",
    ]);
  });

  it("does not put a full key on the public row", () => {
    const pub = toProviderPublic({
      provider: "gemini",
      enabled: true,
      model: "gemini-2.0-flash-lite",
      priority: 30,
      apiKeyLast4: "Za99",
      hasKey: true,
      usageCount: 3,
    });
    expect(pub.keyMasked).toBe("••••Za99");
    expect(JSON.stringify(pub)).not.toContain("AIza");
    expect(statusFromOwnKeys(true).statusText).toBe("Kendi API anahtarınız kullanılıyor");
    expect(statusFromOwnKeys(false).statusText).toBe("Merkez API kullanılıyor");
  });
});

describe("hm llm crypto", () => {
  it("round-trips with HM_LLM_KEY_SECRET and keeps the plain prefix without it", () => {
    const prev = process.env.HM_LLM_KEY_SECRET;
    process.env.HM_LLM_KEY_SECRET = "test-secret";
    const enc = encryptLlmApiKey("sk-test-12345678");
    expect(enc.startsWith("plain:")).toBe(false);
    expect(decryptLlmApiKey(enc)).toBe("sk-test-12345678");
    delete process.env.HM_LLM_KEY_SECRET;
    expect(encryptLlmApiKey("sk-plain-key")).toBe("plain:sk-plain-key");
    expect(decryptLlmApiKey("plain:sk-plain-key")).toBe("sk-plain-key");
    if (prev) process.env.HM_LLM_KEY_SECRET = prev;
    else delete process.env.HM_LLM_KEY_SECRET;
  });
});
