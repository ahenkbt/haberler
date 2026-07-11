declare module "mailparser" {
  export interface AddressObject {
    text?: string;
    value?: { name?: string; address?: string }[];
  }
  export interface ParsedMail {
    subject?: string;
    text?: string;
    html?: string | false;
    from?: AddressObject | AddressObject[];
    to?: AddressObject | AddressObject[];
  }
  export function simpleParser(source: Buffer | Uint8Array | string): Promise<ParsedMail>;
}
