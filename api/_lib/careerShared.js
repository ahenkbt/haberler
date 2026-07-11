const MAX_CV_BYTES = 5 * 1024 * 1024;
const POSITION_SLUG = "cagri-merkezi-satis";
const POSITION_TITLE = "Çağrı Merkezi Satış Temsilcileri";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function parseCvDataUrl(raw) {
  const dataUrl = String(raw ?? "").trim();
  const m = dataUrl.match(/^data:(application\/pdf);base64,(.+)$/i);
  if (!m) return null;
  try {
    const buf = Buffer.from(m[2].replace(/\s/g, ""), "base64");
    if (!buf.length || buf.length > MAX_CV_BYTES) return null;
    return { mime: m[1].toLowerCase(), buf };
  } catch {
    return null;
  }
}

function validateApplyBody(body) {
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
  if (!cvUrlInput && !cvDataUrl) {
    return { error: "CV dosyası veya CV bağlantısı zorunludur.", status: 400 };
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

function railwayApiOrigin() {
  return String(process.env.RAILWAY_API_ORIGIN ?? "https://goalgo-production.up.railway.app")
    .trim()
    .replace(/\/+$/, "");
}

module.exports = {
  MAX_CV_BYTES,
  POSITION_SLUG,
  POSITION_TITLE,
  json,
  readJsonBody,
  parseCvDataUrl,
  validateApplyBody,
  railwayApiOrigin,
};
