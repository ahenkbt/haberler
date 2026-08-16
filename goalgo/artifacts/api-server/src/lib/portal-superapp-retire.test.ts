import { describe, expect, it } from "vitest";
import {
  isPortalSuperappModuleRetired,
  requestPathMatchesRetiredModule,
} from "./portal-superapp-retire.js";

describe("portal-superapp-retire", () => {
  it("keeps PBX / webphone SIP API online", () => {
    expect(isPortalSuperappModuleRetired("pbx")).toBe(false);
  });

  it("still retires unused call-center modules", () => {
    expect(isPortalSuperappModuleRetired("ai-call")).toBe(true);
    expect(isPortalSuperappModuleRetired("call-center")).toBe(true);
  });

  it("does not 410 PBX paths from the call-center catch-all", () => {
    expect(requestPathMatchesRetiredModule("/pbx/agent/login", "call-center")).toBe(false);
    expect(requestPathMatchesRetiredModule("/api/pbx/agent/webphone-token", "call-center")).toBe(false);
    expect(requestPathMatchesRetiredModule("/members/admin-panel-session", "call-center")).toBe(false);
    expect(requestPathMatchesRetiredModule("/call-center/health", "call-center")).toBe(true);
    expect(requestPathMatchesRetiredModule("/api/call-center/config", "call-center")).toBe(true);
  });
});
