import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPanelLoginBusyStatus,
  panelLoginBusyUserMessage,
  panelLoginRetryDelayMs,
} from "./panel-login-wake.js";

describe("panel-login-wake", () => {
  it("503 / meşgul / DO reset busy sayılır", () => {
    assert.equal(isPanelLoginBusyStatus(503, { error: "Sunucu meşgul" }), true);
    assert.equal(isPanelLoginBusyStatus(503, "Failed to start container: Durable Object reset"), true);
    assert.equal(isPanelLoginBusyStatus(502, ""), true);
    assert.equal(isPanelLoginBusyStatus(401, { error: "Kullanıcı adı veya şifre hatalı." }), false);
    assert.equal(isPanelLoginBusyStatus(200, { success: true }), false);
  });

  it("retry gecikmesi artar ve üst sınırda kalır", () => {
    assert.equal(panelLoginRetryDelayMs(0), 2000);
    assert.equal(panelLoginRetryDelayMs(1), 2000);
    assert.equal(panelLoginRetryDelayMs(3), 6000);
    assert.equal(panelLoginRetryDelayMs(20), 15_000);
  });

  it("kullanıcı mesajı net", () => {
    assert.match(panelLoginBusyUserMessage(), /uyanıyor/i);
  });
});
