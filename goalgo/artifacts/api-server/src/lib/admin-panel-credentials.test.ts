import { describe, expect, it } from "vitest";
import {
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_ADMIN_USERNAME,
  acceptedAdminPanelPasswords,
  adminUsernamesMatch,
  resolveAdminPanelUsernames,
  verifyAdminPanelCredentialsEnv,
} from "./admin-panel-credentials.js";

describe("admin-panel-credentials", () => {
  it("matches ahenkbt ↔ ahenbt aliases", () => {
    expect(adminUsernamesMatch("ahenkbt", "ahenbt")).toBe(true);
    expect(adminUsernamesMatch("ahenbt", "ahenkbt")).toBe(true);
    expect(adminUsernamesMatch("ahenkbt", "ahenkbt")).toBe(true);
    expect(adminUsernamesMatch("nailkabali", "ahenkbt")).toBe(false);
  });

  it("defaults usernames when env empty", () => {
    expect(resolveAdminPanelUsernames("")).toEqual([DEFAULT_ADMIN_USERNAME, "ahenbt"]);
    expect(resolveAdminPanelUsernames("admin,yonetici")).toEqual(["admin", "yonetici"]);
  });

  it("accepts bootstrap and legacy passwords", () => {
    expect(acceptedAdminPanelPasswords("Secret1!")).toEqual([
      "Secret1!",
      DEFAULT_ADMIN_PASSWORD,
      "Ahen2006*",
    ]);
    expect(
      verifyAdminPanelCredentialsEnv("ahenkbt", DEFAULT_ADMIN_PASSWORD, {
        usersRaw: "ahenkbt",
        passRaw: "other-secret",
      }),
    ).toBe(true);
    expect(
      verifyAdminPanelCredentialsEnv("ahenbt", "Ahen2006*", {
        usersRaw: "ahenkbt",
        passRaw: "other-secret",
      }),
    ).toBe(true);
  });

  it("rejects wrong user even with bootstrap password", () => {
    expect(
      verifyAdminPanelCredentialsEnv("stranger", DEFAULT_ADMIN_PASSWORD, {
        usersRaw: "ahenkbt",
        passRaw: DEFAULT_ADMIN_PASSWORD,
      }),
    ).toBe(false);
  });
});
