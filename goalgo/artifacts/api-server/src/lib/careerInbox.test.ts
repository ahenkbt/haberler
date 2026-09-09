import { describe, expect, it } from "vitest";
import {
  careerContactFallbackPayload,
  executeSqlRows,
  parseCvDataUrl,
  parseKariyerContactMessage,
  validateCareerApplyBody,
} from "./careerInbox.js";

describe("executeSqlRows", () => {
  it("reads node-postgres { rows }", () => {
    expect(executeSqlRows({ rows: [{ id: 1 }] })).toEqual([{ id: 1 }]);
  });

  it("reads array results", () => {
    expect(executeSqlRows([{ id: 2 }])).toEqual([{ id: 2 }]);
  });

  it("returns empty for unknown shapes", () => {
    expect(executeSqlRows(null)).toEqual([]);
    expect(executeSqlRows({})).toEqual([]);
  });
});

describe("validateCareerApplyBody", () => {
  const base = {
    fullName: "Ayşe Yılmaz",
    email: "ayse@example.com",
    phone: "05551234567",
    coverLetter: "Başvurmak istiyorum.",
  };

  it("accepts a complete application without CV so the inbox still receives it", () => {
    const out = validateCareerApplyBody(base);
    expect("data" in out).toBe(true);
    if ("data" in out) {
      expect(out.data.fullName).toBe("Ayşe Yılmaz");
      expect(out.data.cvDataUrl).toBe("");
    }
  });

  it("rejects missing contact fields", () => {
    const out = validateCareerApplyBody({ ...base, email: "" });
    expect(out).toMatchObject({ status: 400 });
  });

  it("rejects a non-http CV URL", () => {
    const out = validateCareerApplyBody({ ...base, cvUrl: "ftp://x" });
    expect(out).toMatchObject({ status: 400 });
  });
});

describe("parseCvDataUrl", () => {
  it("parses a small PDF data URL", () => {
    const buf = Buffer.from("%PDF-1.4 test");
    const parsed = parseCvDataUrl(`data:application/pdf;base64,${buf.toString("base64")}`);
    expect(parsed?.mime).toBe("application/pdf");
    expect(parsed?.buf.equals(buf)).toBe(true);
  });

  it("rejects non-pdf", () => {
    expect(parseCvDataUrl("data:text/plain;base64,YQ==")).toBeNull();
  });
});

describe("kariyer contact fallback", () => {
  it("round-trips fields used by the iletişim yedeği", () => {
    const payload = careerContactFallbackPayload({
      fullName: "Ali Veli",
      email: "ali@example.com",
      phone: "05001112233",
      city: "Ankara",
      experienceYears: "3 yıl",
      coverLetter: "Merhaba, başvuru.",
      cvUrl: "https://example.com/cv.pdf",
    });
    expect(payload.pageSource).toBe("kariyer");
    const parsed = parseKariyerContactMessage({
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      message: payload.message,
    });
    expect(parsed.fullName).toBe("Ali Veli");
    expect(parsed.city).toBe("Ankara");
    expect(parsed.experienceYears).toBe("3 yıl");
    expect(parsed.coverLetter).toContain("Merhaba, başvuru.");
    expect(parsed.cvUrl).toBe("https://example.com/cv.pdf");
  });
});
