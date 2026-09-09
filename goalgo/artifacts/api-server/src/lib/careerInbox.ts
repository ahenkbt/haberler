export const CAREER_POSITION_SLUG = "cagri-merkezi-satis";
export const CAREER_POSITION_TITLE = "Çağrı Merkezi Satış Temsilcileri";
export const CAREER_MAX_CV_BYTES = 5 * 1024 * 1024;

export type CareerApplyInput = {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  experienceYears: string;
  coverLetter: string;
  cvUrlInput: string;
  cvDataUrl: string;
  cvFileName: string;
};

export function executeSqlRows<T extends Record<string, unknown> = Record<string, unknown>>(
  result: unknown,
): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

export function parseCvDataUrl(raw: string): { mime: string; buf: Buffer } | null {
  const dataUrl = String(raw ?? "").trim();
  const m = dataUrl.match(/^data:(application\/pdf);base64,(.+)$/i);
  if (!m) return null;
  try {
    const buf = Buffer.from(m[2].replace(/\s/g, ""), "base64");
    if (!buf.length || buf.length > CAREER_MAX_CV_BYTES) return null;
    return { mime: m[1].toLowerCase(), buf };
  } catch {
    return null;
  }
}

export function validateCareerApplyBody(
  body: Record<string, unknown>,
): { error: string; status: number } | { data: CareerApplyInput } {
  const fullName = String(body.fullName ?? "").trim();
  const email = String(body.email ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const city = body.city != null ? String(body.city).trim().slice(0, 120) : "";
  const experienceYears =
    body.experienceYears != null ? String(body.experienceYears).trim().slice(0, 40) : "";
  const coverLetter = String(body.coverLetter ?? "").trim();
  const cvUrlInput = body.cvUrl != null ? String(body.cvUrl).trim().slice(0, 2000) : "";
  const cvDataUrl = body.cvDataUrl != null ? String(body.cvDataUrl).trim() : "";
  const cvFileName = body.cvFileName != null ? String(body.cvFileName).trim().slice(0, 255) : "";

  if (!fullName || !email || !phone || !coverLetter) {
    return { error: "Ad soyad, e-posta, telefon ve ön yazı zorunludur.", status: 400 };
  }
  if (fullName.length > 200 || email.length > 200 || phone.length > 40 || coverLetter.length > 8000) {
    return { error: "Girdi çok uzun.", status: 400 };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Geçerli bir e-posta girin.", status: 400 };
  }
  if (cvUrlInput && !/^https?:\/\//i.test(cvUrlInput)) {
    return { error: "CV bağlantısı http veya https ile başlamalıdır.", status: 400 };
  }

  return {
    data: {
      fullName,
      email,
      phone,
      city,
      experienceYears,
      coverLetter,
      cvUrlInput,
      cvDataUrl,
      cvFileName,
    },
  };
}

export type ParsedKariyerContact = {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  experienceYears: string;
  coverLetter: string;
  cvUrl: string;
};

/** İletişim yedeğine düşen kariyer formunu kariyer satırına çevirir. */
export function parseKariyerContactMessage(row: {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  message?: unknown;
}): ParsedKariyerContact {
  const message = String(row.message ?? "");
  const phoneFromMsg = message.match(/^Telefon:\s*(.+)$/m)?.[1]?.trim() ?? "";
  const city = message.match(/^Şehir:\s*(.+)$/m)?.[1]?.trim() ?? "";
  const experienceYears = message.match(/^Deneyim:\s*(.+)$/m)?.[1]?.trim() ?? "";
  const cvUrl = message.match(/^CV:\s*(https?:\/\/\S+)/m)?.[1]?.trim() ?? "";
  let coverLetter = message;
  const onYazi = message.split(/Ön yazı:\s*/i);
  if (onYazi.length > 1) {
    coverLetter = onYazi
      .slice(1)
      .join("Ön yazı:")
      .replace(/\nCV:\s*https?:\/\/\S+\s*$/m, "")
      .trim();
  }
  return {
    fullName: String(row.name ?? "").trim(),
    email: String(row.email ?? "").trim(),
    phone: String(row.phone ?? "").trim() || phoneFromMsg,
    city,
    experienceYears,
    coverLetter: coverLetter || message,
    cvUrl,
  };
}

export function careerContactFallbackPayload(data: {
  fullName: string;
  email: string;
  phone: string;
  city?: string | null;
  experienceYears?: string | null;
  coverLetter: string;
  cvUrl?: string | null;
}): { name: string; email: string; phone: string; subject: string; message: string; pageSource: string } {
  const message = [
    "Pozisyon: Çağrı Merkezi Satış Temsilcileri",
    `Telefon: ${data.phone}`,
    data.city ? `Şehir: ${data.city}` : null,
    data.experienceYears ? `Deneyim: ${data.experienceYears}` : null,
    "",
    "Ön yazı:",
    data.coverLetter,
    data.cvUrl ? `\nCV: ${data.cvUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  return {
    name: data.fullName,
    email: data.email,
    phone: data.phone,
    subject: "Kariyer başvurusu — Çağrı Merkezi Satış",
    message,
    pageSource: "kariyer",
  };
}
