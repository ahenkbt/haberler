import { describe, expect, it } from "vitest";
import { isPortalSuperappModuleRetired } from "./portal-superapp-retire.js";

describe("portal-superapp-retire", () => {
  it("keeps PBX / webphone SIP API online", () => {
    expect(isPortalSuperappModuleRetired("pbx")).toBe(false);
  });

  it("still retires unused call-center modules", () => {
    expect(isPortalSuperappModuleRetired("ai-call")).toBe(true);
    expect(isPortalSuperappModuleRetired("call-center")).toBe(true);
  });
});
