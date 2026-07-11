const {
  json,
  readJsonBody,
  parseCvDataUrl,
  validateApplyBody,
} = require("../_lib/careerShared.js");
const { insertCareerApplication } = require("../_lib/careerDb.js");
const { saveCvBuffer } = require("../_lib/careerCv.js");
const { saveViaSiteContact } = require("../_lib/careerFallback.js");

async function handler(req, res) {
  res.setHeader("x-yekpare-career-api", "vercel");
  if (req.method !== "POST") {
    json(res, 405, { error: "Yalnızca POST desteklenir." });
    return;
  }

  let body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    try {
      body = await readJsonBody(req);
    } catch {
      json(res, 400, { error: "Geçersiz JSON." });
      return;
    }
  }

  const validated = validateApplyBody(body);
  if (validated.error) {
    json(res, validated.status, { error: validated.error });
    return;
  }
  const data = validated.data;

  let cvUrl = data.cvUrlInput || null;
  let cvFileName = data.cvFileName || null;

  if (data.cvDataUrl) {
    const parsed = parseCvDataUrl(data.cvDataUrl);
    if (!parsed) {
      json(res, 400, { error: "CV dosyası geçersiz veya 5 MB sınırını aşıyor (PDF)." });
      return;
    }
    const saved = await saveCvBuffer(parsed.buf, { cvFileName: data.cvFileName });
    if (!saved) {
      json(res, 503, {
        error:
          "CV dosyası şu an yüklenemiyor. Lütfen CV bağlantısı (LinkedIn / Drive) ile tekrar deneyin.",
      });
      return;
    }
    cvUrl = saved.url;
    cvFileName = saved.fileName;
  }

  const row = {
    fullName: data.fullName,
    email: data.email,
    phone: data.phone,
    city: data.city,
    experienceYears: data.experienceYears,
    coverLetter: data.coverLetter,
    cvUrl,
    cvFileName,
  };

  try {
    const inserted = await insertCareerApplication(row);
    if (inserted.ok) {
      json(res, 201, {
        ok: true,
        message: "Başvurunuz alındı. En kısa sürede sizinle iletişime geçeceğiz.",
      });
      return;
    }

    if (inserted.reason === "no_database_url") {
      await saveViaSiteContact(row, cvUrl);
      json(res, 201, {
        ok: true,
        message: "Başvurunuz alındı. En kısa sürede sizinle iletişime geçeceğiz.",
        fallback: "site_contact",
      });
      return;
    }

    json(res, 500, { error: "Başvuru kaydedilemedi." });
  } catch (e) {
    try {
      await saveViaSiteContact(row, cvUrl);
      json(res, 201, {
        ok: true,
        message: "Başvurunuz alındı. En kısa sürede sizinle iletişime geçeceğiz.",
        fallback: "site_contact",
      });
    } catch {
      json(res, 500, { error: "Başvuru kaydedilemedi." });
    }
  }
}

handler.config = {
  api: {
    bodyParser: {
      sizeLimit: "8mb",
    },
  },
};

module.exports = handler;
