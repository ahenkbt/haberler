import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isHmAdminPanelHeavyApiPath } from "./hm-admin-panel-wake.js";

describe("hm-admin-panel-wake", () => {
  it("HM site list/create/update ve ensure-gundemi ağır sayılır", () => {
    assert.equal(isHmAdminPanelHeavyApiPath("/api/hm/sites", "GET"), true);
    assert.equal(isHmAdminPanelHeavyApiPath("/api/hm/sites", "POST"), true);
    assert.equal(isHmAdminPanelHeavyApiPath("/api/hm/sites/42", "PATCH"), true);
    assert.equal(isHmAdminPanelHeavyApiPath("/api/hm/sites/42/", "PATCH"), true);
    assert.equal(isHmAdminPanelHeavyApiPath("/api/hm/sites/7/ensure-gundemi", "POST"), true);
    assert.equal(isHmAdminPanelHeavyApiPath("/api/hm/admin/repair-kh-editor", "POST"), true);
  });

  it("genel API ağır sayılmaz", () => {
    assert.equal(isHmAdminPanelHeavyApiPath("/api/hm/editor/login", "POST"), false);
    assert.equal(isHmAdminPanelHeavyApiPath("/api/news/foo", "GET"), false);
    assert.equal(isHmAdminPanelHeavyApiPath("/api/hm/sites/abc", "PATCH"), false);
  });
});
