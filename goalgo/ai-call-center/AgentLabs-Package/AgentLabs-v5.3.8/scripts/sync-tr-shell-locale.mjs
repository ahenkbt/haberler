/**
 * Merges missing keys from en.json into tr.json and applies Turkish strings
 * for app shell sections (common, nav, sidebar, settings).
 *
 * Usage: node scripts/sync-tr-shell-locale.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, "../client/src/i18n/locales");
const enPath = path.join(localesDir, "en.json");
const trPath = path.join(localesDir, "tr.json");

const SHELL_TR = {
  nav: {
    home: "Ana sayfa",
    dashboard: "Gösterge paneli",
    campaigns: "Kampanyalar",
    agents: "AI asistanlar",
    promptTemplates: "İstem şablonları",
    knowledgeBase: "Bilgi tabanı",
    voices: "Sesler",
    allContacts: "Tüm kişiler",
    calls: "Aramalar",
    crm: "Hızlı CRM",
    analytics: "Analitik",
    phoneNumbers: "Telefon numaraları",
    incomingConnections: "Gelen bağlantılar",
    flowBuilder: "Akış oluşturucu",
    executionLogs: "Çalıştırma günlükleri",
    webhooks: "Web kancaları",
    forms: "Formlar",
    appointments: "Randevular",
    templates: "Şablonlar",
    upgradePlan: "Planı yükselt",
    billingCredits: "Faturalama ve kredi",
    transactionHistory: "İşlem geçmişi",
    administration: "Yönetim",
    adminDashboard: "Admin paneli",
    accountSettings: "Hesap ayarları",
    websiteWidget: "Web sitesi widget",
    conversations: "Konuşmalar",
    tools: "Araçlar",
    settings: "Ayarlar",
  },
  sidebar: {
    build: "Oluştur",
    evaluate: "Değerlendir",
    telephony: "Telefon",
    flowAutomation: "Akış otomasyonu",
    toolsAndPlugins: "Araçlar ve eklentiler",
    billing: "Faturalama",
    credits: "Kredi",
    pro: "Pro",
    proMember: "Pro üye",
    upgrade: "Yükselt",
    myWorkspace: "Çalışma alanım",
    monitor: "İzleme",
  },
  common: {
    deleting: "Siliniyor...",
    add: "Ekle",
    remove: "Kaldır",
    close: "Kapat",
    confirm: "Onayla",
    submit: "Gönder",
    filter: "Filtrele",
    clear: "Temizle",
    refresh: "Yenile",
    export: "Dışa aktar",
    exportSuccess: "Dışa aktarma başarılı",
    import: "İçe aktar",
    download: "İndir",
    upload: "Yükle",
    view: "Görüntüle",
    viewAll: "Tümünü gör",
    actions: "İşlemler",
    status: "Durum",
    name: "Ad",
    email: "E-posta",
    password: "Şifre",
    description: "Açıklama",
    date: "Tarih",
    time: "Saat",
    type: "Tür",
    total: "Toplam",
    active: "Aktif",
    inactive: "Pasif",
    enabled: "Etkin",
    disabled: "Devre dışı",
    all: "Tümü",
    none: "Yok",
    warning: "Uyarı",
    info: "Bilgi",
    noData: "Veri yok",
    noResults: "Sonuç bulunamadı",
    required: "Zorunlu",
    optional: "İsteğe bağlı",
    minutes: "dakika",
    seconds: "saniye",
    hours: "saat",
    days: "gün",
    thisWeek: "Bu hafta",
    today: "Bugün",
    yesterday: "Dün",
    ago: "önce",
    tryAgain: "Lütfen tekrar deneyin",
    copied: "Panoya kopyalandı",
    remindLater: "Daha sonra hatırlat",
  },
};

function isObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

/** Merge patch into base; base values win when already set. */
function deepMerge(base, patch) {
  const out = structuredClone(base);
  for (const key of Object.keys(patch)) {
    if (isObject(patch[key]) && isObject(out[key])) {
      out[key] = deepMerge(out[key], patch[key]);
    } else if (!(key in out)) {
      out[key] = patch[key];
    }
  }
  return out;
}

function applyShellTurkish(tr) {
  for (const [section, values] of Object.entries(SHELL_TR)) {
    if (!tr[section]) tr[section] = {};
    Object.assign(tr[section], { ...tr[section], ...values });
  }
  return tr;
}

const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
let tr = JSON.parse(fs.readFileSync(trPath, "utf8"));

// Add missing keys from en without overwriting existing tr strings
tr = deepMerge(tr, en);
tr = applyShellTurkish(tr);

fs.writeFileSync(trPath, `${JSON.stringify(tr, null, 2)}\n`, "utf8");
console.log("Updated tr.json — shell sections merged; run seed with --force on Railway if DB languages are stale.");
