import { describe, expect, it } from "vitest";
import {
  VKD_ACCOUNT_NAME,
  VKD_CONTACT_ADDRESS,
  VKD_CONTACT_PHONE_DISPLAY,
  VKD_DONATION_ACCOUNTS,
  compactIban,
  formatIbanDisplay,
  isStaleVkdAccountName,
  isStaleVkdIban,
} from "./vkdPublicContact";

describe("vkdPublicContact", () => {
  it("lists Ziraat and Vakıfbank donation accounts", () => {
    expect(VKD_DONATION_ACCOUNTS).toHaveLength(2);
    expect(VKD_DONATION_ACCOUNTS[0]?.bank).toMatch(/Ziraat/i);
    expect(compactIban(VKD_DONATION_ACCOUNTS[0]!.iban)).toBe("TR540001001262977557995004");
    expect(VKD_DONATION_ACCOUNTS[1]?.bank).toMatch(/Vakıf/i);
    expect(compactIban(VKD_DONATION_ACCOUNTS[1]!.iban)).toBe("TR340021000000152718000001");
    expect(VKD_DONATION_ACCOUNTS.every((a) => a.accountName === VKD_ACCOUNT_NAME)).toBe(true);
  });

  it("formats IBAN in 4-digit groups", () => {
    expect(formatIbanDisplay("TR540001001262977557995004")).toBe("TR54 0001 0012 6297 7557 9950 04");
  });

  it("treats empty and previous placeholder IBANs as stale", () => {
    expect(isStaleVkdIban("")).toBe(true);
    expect(isStaleVkdIban("TR66 0010 3000 0000 0084 0744 71")).toBe(true);
    expect(isStaleVkdIban("TR39 0010 3000 0000 0082 4540 87")).toBe(true);
    expect(isStaleVkdIban("TR54 0001 0012 6297 7557 9950 04")).toBe(false);
    expect(isStaleVkdAccountName("VATAN KAHRAMANLARI SAVUNMA HİZMETLERİ")).toBe(true);
    expect(isStaleVkdAccountName(VKD_ACCOUNT_NAME)).toBe(false);
  });

  it("keeps the published phone and Çankaya address", () => {
    expect(VKD_CONTACT_PHONE_DISPLAY).toBe("0532 272 71 09");
    expect(VKD_CONTACT_ADDRESS).toContain("Meşrutiyet Cad. Karanfil Sokak 4/91");
    expect(VKD_CONTACT_ADDRESS).toContain("Çankaya Ankara");
  });
});
