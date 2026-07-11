/**
 * Build Turkish landing translations from English source (en.json).
 * Preserves {{placeholders}} and batch-translates via Google Translate (unofficial).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, "../src/i18n/locales");

const PLACEHOLDER_RE = /\{\{[^}]+\}\}/g;

function protectPlaceholders(text) {
  const tokens = [];
  const protectedText = text.replace(PLACEHOLDER_RE, (m) => {
    const id = `__PH_${tokens.length}__`;
    tokens.push(m);
    return id;
  });
  return { protectedText, tokens };
}

function restorePlaceholders(text, tokens) {
  let out = text;
  tokens.forEach((token, i) => {
    out = out.replace(`__PH_${i}__`, token);
  });
  return out;
}

async function translateChunk(text) {
  if (!text || !text.trim()) return text;
  const { protectedText, tokens } = protectPlaceholders(text);
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=tr&dt=t&q=" +
    encodeURIComponent(protectedText);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Translate failed ${res.status}: ${text.slice(0, 80)}`);
  const data = await res.json();
  const translated = data[0].map((x) => x[0]).join("");
  return restorePlaceholders(translated, tokens);
}

function collectStrings(obj, prefix = "") {
  const entries = [];
  for (const [key, value] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      entries.push(...collectStrings(value, p));
    } else if (typeof value === "string") {
      entries.push([p, value]);
    }
  }
  return entries;
}

function setByPath(root, dotPath, value) {
  const parts = dotPath.split(".");
  let cur = root;
  for (let i = 0; i < parts.length - 1; i++) {
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/** Manual overrides for navbar/login, brand terms, and awkward machine output */
const OVERRIDES = {
  "navbar.login": "GİRİŞ YAP",
  "hero.getStarted": "HEMEN BAŞLA",
  "featureSection.getStarted": "HEMEN BAŞLA",
  "actionCards.getStarted": "HEMEN BAŞLA",
  "technology.getStarted": "HEMEN BAŞLA",
  "navbar.features": "Özellikler",
  "navbar.useCases": "Kullanım Alanları",
  "navbar.pricing": "Fiyatlandırma",
  "navbar.integrations": "Entegrasyonlar",
  "navbar.contact": "İletişim",
  "navbar.language": "Dil",
  "features": "Özellikler",
  "useCases": "Kullanım Alanları",
  "hero.headline": "YAPAY ZEKA SES AJANLARI",
  "hero.badge": "Kodsuz Yapay Zeka Ses Motoru",
  "featureSection.feature2.title": "Aramalarınızı yapay zekaya bırakın",
  "featureSection.feature3.title": "Etkileşim kurun ve dönüştürün",
  "technology.features.autopilot.title": "Aramalarınızı otomatik pilota alın",
  "technology.benefits.cutCosts":
    "Maliyetleri düşürün ve satış temsilcisi işe alımında zaman kazanın",
  "useCasesPage.hero.title": "İşletmenizi dönüştürün:",
  "useCasesPage.hero.titleHighlight": "Yapay Zeka Ses Ajanları",
  "useCasesPage.industries.healthcare": "Sağlık",
  "useCasesPage.industries.education": "Eğitim",
  "useCasesSection.cases.university.industry": "Eğitim",
  "useCasesSection.cases.healthcare.industry": "Sağlık",
  "useCasesSection.cases.healthcare.title": "Almanya'da sağlık hizmetleri",
  "contact.form.nameLabel": "Ad Soyad *",
  "contact.form.emailLabel": "E-posta *",
  "contact.form.companyLabel": "Şirket",
  "contact.form.messageLabel": "Mesaj *",
  "contact.form.emailPlaceholder": "ornek@sirket.com",
  "contact.validation.nameMin": "Ad en az 2 karakter olmalıdır",
  "contact.validation.emailInvalid": "Lütfen geçerli bir e-posta adresi girin",
  "contact.validation.messageMin": "Mesaj en az 10 karakter olmalıdır",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const en = JSON.parse(fs.readFileSync(path.join(localesDir, "en.json"), "utf8"));
  const trPath = path.join(localesDir, "tr.json");
  const tr = JSON.parse(fs.readFileSync(trPath, "utf8"));

  const landingEn = en.landing;
  const landingTr = clone(landingEn);
  const entries = collectStrings(landingEn);

  console.log(`Translating ${entries.length} landing strings en → tr...`);

  const BATCH = 12;
  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async ([dotPath, enText]) => {
        const overrideKey = dotPath;
        let trText;
        if (OVERRIDES[overrideKey]) {
          trText = OVERRIDES[overrideKey];
        } else {
          try {
            trText = await translateChunk(enText);
          } catch (e) {
            console.warn(`Fallback EN for ${dotPath}:`, e.message);
            trText = enText;
          }
        }
        setByPath(landingTr, dotPath, trText);
      }),
    );
    if (i % 60 === 0) console.log(`  ${Math.min(i + BATCH, entries.length)} / ${entries.length}`);
    await sleep(350);
  }

  tr.landing = landingTr;
  fs.writeFileSync(trPath, JSON.stringify(tr, null, 2) + "\n", "utf8");
  console.log("Wrote", trPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
