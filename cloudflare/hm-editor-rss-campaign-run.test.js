import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isRssCampaignRunBusyStatus,
  normalizeRssCampaignRunUpstreamResponse,
  rssCampaignRunRetryDelayMs,
} from "./hm-editor-rss-campaign-run.js";

describe("hm-editor-rss-campaign-run", () => {
  it("Container düz metin 503'ü JSON uyanıyor mesajına çevirir", () => {
    const out = normalizeRssCampaignRunUpstreamResponse(
      503,
      "Failed to start container: provisioning\n",
    );
    assert.equal(out.status, 503);
    assert.equal(out.body.accepted, false);
    assert.match(String(out.body.error), /uyanıyor/i);
  });

  it("202 accepted JSON'u olduğu gibi bırakır", () => {
    const out = normalizeRssCampaignRunUpstreamResponse(
      202,
      JSON.stringify({ accepted: true, message: "arka planda", added: 0 }),
    );
    assert.equal(out.status, 202);
    assert.equal(out.body.accepted, true);
    assert.equal(out.body.message, "arka planda");
  });

  it("busy status tanıma", () => {
    assert.equal(isRssCampaignRunBusyStatus(503, ""), true);
    assert.equal(isRssCampaignRunBusyStatus(200, { error: "Sunucu uyanıyor" }), true);
    assert.equal(isRssCampaignRunBusyStatus(400, { error: "Campaign not found" }), false);
  });

  it("retry gecikmesi artar", () => {
    assert.equal(rssCampaignRunRetryDelayMs(1), 1500);
    assert.equal(rssCampaignRunRetryDelayMs(2), 3000);
    assert.ok(rssCampaignRunRetryDelayMs(20) <= 12_000);
  });
});
