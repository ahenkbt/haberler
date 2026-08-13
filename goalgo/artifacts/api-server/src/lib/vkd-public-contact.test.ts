import { describe, expect, it } from "vitest";
import { applyVkdDonationLayoutDefaults } from "./hm-public-donation-layout.js";
import { VKD_ACCOUNT_NAME, VKD_DONATION_ACCOUNTS } from "./vkd-public-contact.js";

describe("applyVkdDonationLayoutDefaults", () => {
  it("writes Ziraat and Vakıfbank IBANs onto VKD layout", () => {
    const out = applyVkdDonationLayoutDefaults({
      hmCorporateDonation: {
        enabled: true,
        iban: "TR66 0010 3000 0000 0084 0744 71",
        accountName: "VATAN KAHRAMANLARI SAVUNMA HİZMETLERİ",
      },
    });
    const donation = out.hmCorporateDonation as Record<string, unknown>;
    expect(donation.iban).toBe(VKD_DONATION_ACCOUNTS[0]!.iban);
    expect(donation.accountName).toBe(VKD_ACCOUNT_NAME);
    expect(donation.accounts).toEqual(VKD_DONATION_ACCOUNTS.map((row) => ({ ...row })));
  });
});
