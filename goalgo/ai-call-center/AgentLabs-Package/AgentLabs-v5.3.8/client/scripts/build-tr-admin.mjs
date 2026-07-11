/**
 * Translate admin, auth.loginPage, common, nav, sidebar from en.json into tr.json.
 * Run from client/: node scripts/build-tr-admin.mjs
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
    if (!cur[parts[i]]) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

const OVERRIDES = {
  "dashboard.title": "Platform Analitiği",
  "dashboard.subtitle": "Platform performansını ve sistem sağlığını izleyin",
  "dashboard.tabs.analytics": "Analitik",
  "dashboard.tabs.analyticsShort": "İstatistik",
  "dashboard.tabs.users": "Kullanıcılar",
  "dashboard.tabs.contacts": "Kişiler",
  "dashboard.tabs.billing": "Faturalama",
  "dashboard.tabs.phones": "Telefonlar",
  "dashboard.tabs.batchJobs": "Toplu İşler",
  "dashboard.tabs.batchJobsShort": "İşler",
  "dashboard.tabs.callMonitoring": "Çağrı İzleme",
  "dashboard.tabs.callsShort": "Çağrılar",
  "dashboard.tabs.communications": "İletişim",
  "dashboard.tabs.commsShort": "İletişim",
  "dashboard.tabs.voiceAi": "Sesli Yapay Zeka",
  "dashboard.tabs.voiceShort": "Ses",
  "dashboard.tabs.settings": "Ayarlar",
  "dashboard.connection.connected": "Bağlı",
  "dashboard.connection.notConnected": "Bağlı değil",
  "settings.title": "Genel Ayarlar",
  "settings.description": "Platform genelinde ayarları ve varsayılanları yapılandırın",
  "settings.tabs.master": "Ana Ayarlar",
  "settings.tabs.seo": "SEO Modülü",
  "settings.tabs.analytics": "Analitik",
  "settings.tabs.languages": "Diller",
  "settings.tabs.plugins": "Eklentiler",
  "settings.tabs.apiKeys": "API Anahtarları",
  "settings.tabs.system": "Sistem",
  "settings.connectionStatus.connected": "Bağlı",
  "settings.connectionStatus.disconnected": "Bağlantı kesildi",
  "settings.connectionStatus.checking": "Kontrol ediliyor...",
  "settings.connectionStatus.refreshAll": "Tümünü Yenile",
  "settings.connectionStatus.edit": "Düzenle",
  "settings.connectionStatus.manageKeys": "Anahtarları Yönet",
  "settings.saveSettings": "Ayarları Kaydet",
  "settings.saving": "Kaydediliyor...",
  "analytics.title": "Platform Analitiği",
  "analytics.subtitle": "Platform performansını ve sistem sağlığını izleyin",
  "branding.title": "Platform Markası",
  "branding.editSettings": "Ayarları Düzenle",
  "systemConfig.title": "Sistem Yapılandırması",
  "systemConfig.saveAll": "Tüm Değişiklikleri Kaydet",
  "systemConfig.security.title": "Güvenlik Ayarları",
  "systemConfig.credits.title": "Kredi ve Faturalama",
  "systemConfig.webhooks.title": "Webhook Ayarları",
  "systemConfig.connectionLimits.title": "Bağlantı Limitleri",
};

const AUTH_LOGIN_OVERRIDES = {
  "loginPage.heroTitle": "Yapay zeka ajanlarını başlatın ve müşteri etkileşimlerinizi otomatikleştirin",
  "loginPage.titles.login": "Tekrar hoş geldiniz",
  "loginPage.signingIn": "Giriş yapılıyor...",
  "loginPage.features.aiTemplates.title": "Yapay Zeka Ajan Şablonları",
  "loginPage.stats.countries": "Ülke",
  "loginPage.stats.languages": "Dil",
  "loginPage.stats.uptime": "Çalışma süresi",
  "loginPage.stats.support": "Destek",
  "loginPage.freeTrial": "14 günlük ücretsiz deneme",
  "loginPage.noCreditCard": "Kredi kartı gerekmez",
  "signIn": "Giriş Yap",
  "signUp": "Kayıt Ol",
  "welcomeBack": "Tekrar hoş geldiniz!",
};

const COMMON_OVERRIDES = {
  save: "Kaydet",
  edit: "Düzenle",
  back: "Geri",
  next: "İleri",
  search: "Ara",
  yes: "Evet",
  no: "Hayır",
  success: "Başarılı",
  error: "Hata",
  loading: "Yükleniyor...",
};

const NAV_OVERRIDES = {
  dashboard: "Gösterge paneli",
  campaigns: "Kampanyalar",
  agents: "AI asistanlar",
  settings: "Ayarlar",
  adminDashboard: "Yönetici paneli",
};

const SIDEBAR_OVERRIDES = {
  build: "Oluştur",
  evaluate: "Değerlendir",
  telephony: "Telefon",
  billing: "Faturalama",
  credits: "Krediler",
  monitor: "İzle",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function translateSection(enSection, prefix, overrideMap) {
  const trSection = clone(enSection);
  const entries = collectStrings(enSection);
  console.log(`Translating ${entries.length} strings for ${prefix}...`);

  const BATCH = 10;
  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async ([dotPath, enText]) => {
        const overrideKey = prefix ? `${prefix}.${dotPath}` : dotPath;
        const shortKey = dotPath;
        let trText;
        if (overrideMap[overrideKey] || overrideMap[shortKey]) {
          trText = overrideMap[overrideKey] || overrideMap[shortKey];
        } else {
          try {
            trText = await translateChunk(enText);
          } catch (e) {
            console.warn(`Fallback EN for ${overrideKey}:`, e.message);
            trText = enText;
          }
        }
        setByPath(trSection, dotPath, trText);
      }),
    );
    if (i % 50 === 0) console.log(`  ${Math.min(i + BATCH, entries.length)} / ${entries.length}`);
    await sleep(400);
  }
  return trSection;
}

async function main() {
  const en = JSON.parse(fs.readFileSync(path.join(localesDir, "en.json"), "utf8"));
  const trPath = path.join(localesDir, "tr.json");
  const tr = JSON.parse(fs.readFileSync(trPath, "utf8"));

  tr.admin = await translateSection(en.admin, "admin", OVERRIDES);

  if (en.auth?.loginPage) {
    const loginPageTr = await translateSection(en.auth.loginPage, "auth", AUTH_LOGIN_OVERRIDES);
    tr.auth = tr.auth || {};
    tr.auth.loginPage = loginPageTr;
    const authCore = await translateSection(
      Object.fromEntries(
        Object.entries(en.auth).filter(([k]) => k !== "loginPage"),
      ),
      "auth",
      AUTH_LOGIN_OVERRIDES,
    );
    tr.auth = { ...authCore, loginPage: loginPageTr };
  }

  const commonTr = await translateSection(en.common, "common", COMMON_OVERRIDES);
  deepMerge(tr.common, commonTr);

  const navTr = await translateSection(en.nav, "nav", NAV_OVERRIDES);
  deepMerge(tr.nav, navTr);

  const sidebarTr = await translateSection(en.sidebar, "sidebar", SIDEBAR_OVERRIDES);
  deepMerge(tr.sidebar, sidebarTr);

  fs.writeFileSync(trPath, JSON.stringify(tr, null, 2) + "\n", "utf8");
  console.log("Wrote Turkish admin/auth/common/nav/sidebar to", trPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
