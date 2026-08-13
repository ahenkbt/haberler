/** vatankahramanlari.org /vkd — resmi bağış hesapları (API layout varsayılanları). */

export const VKD_ACCOUNT_NAME = "VATAN KAHRAMANLARI DERNEĞİ";

export const VKD_DONATION_ACCOUNTS = [
  {
    bank: "Ziraat Bankası Bağış Hesabı",
    accountName: VKD_ACCOUNT_NAME,
    iban: "TR54 0001 0012 6297 7557 9950 04",
  },
  {
    bank: "Vakıf Bankası Bağış Hesabı",
    accountName: VKD_ACCOUNT_NAME,
    iban: "TR34 0021 0000 0015 2718 0000 01",
  },
] as const;

export const VKD_CONTACT_PHONE_DISPLAY = "0532 272 71 09";
export const VKD_CONTACT_ADDRESS = "Meşrutiyet Cad. Karanfil Sokak 4/91 Çankaya Ankara";

const STALE_IBAN_COMPACT = new Set([
  "TR660010300000000084074471",
  "TR390010300000000082454087",
]);

export function compactIban(iban: string): string {
  return String(iban ?? "").replace(/\s+/g, "").toUpperCase();
}

export function isStaleVkdIban(iban: string | null | undefined): boolean {
  const compact = compactIban(iban ?? "");
  return !compact || STALE_IBAN_COMPACT.has(compact);
}

export function isStaleVkdAccountName(name: string | null | undefined): boolean {
  const n = String(name ?? "").trim();
  if (!n) return true;
  return /savunma\s+hizmetleri/i.test(n);
}
