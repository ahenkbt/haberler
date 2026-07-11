const { railwayApiOrigin } = require("./careerShared.js");

/** Railway eski deploy / Vercel'de DATABASE_URL yokken iletişim formu tablosuna yedek kayıt. */
async function saveViaSiteContact(data, cvUrl) {
  const origin = railwayApiOrigin();
  const message = [
    "Pozisyon: Çağrı Merkezi Satış Temsilcileri",
    `Telefon: ${data.phone}`,
    data.city ? `Şehir: ${data.city}` : null,
    data.experienceYears ? `Deneyim: ${data.experienceYears}` : null,
    "",
    "Ön yazı:",
    data.coverLetter,
    cvUrl ? `\nCV: ${cvUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch(`${origin}/api/site/contact`, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8", accept: "application/json" },
    body: JSON.stringify({
      name: data.fullName,
      email: data.email,
      phone: data.phone,
      subject: "Kariyer başvurusu — Çağrı Merkezi Satış",
      message,
      pageSource: "kariyer",
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(String(err.error ?? `site/contact HTTP ${res.status}`));
  }
  return true;
}

module.exports = { saveViaSiteContact };
