/**
 * Generates tr-landing-patches.json from de.json landing (German → Turkish phrase map).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, '../src/i18n/locales');
const de = JSON.parse(fs.readFileSync(path.join(localesDir, 'de.json'), 'utf8'));

/** Longest-first phrase replacements (German → Turkish) */
const PHRASES = [
  ['No-Code KI-Sprach-Engine', 'Kodsuz Yapay Zeka Ses Motoru'],
  ['KI-SPRACHAGENTEN FÜR', 'YAPAY ZEKA SES AJANLARI'],
  ['KI-Sprachagenten-Plattform', 'Yapay Zeka Ses Ajanı Platformu'],
  ['KI-Sprachagenten', 'Yapay Zeka Ses Ajanları'],
  ['KI-Sprachagenten', 'Yapay Zeka Ses Ajanları'],
  ['KI-Sprachassistenten', 'Yapay Zeka Ses Asistanları'],
  ['KI-Sprach-Engine', 'Yapay Zeka Ses Motoru'],
  ['KI-gestützte Gespräche', 'yapay zeka destekli görüşmeler'],
  ['KI-gestützte', 'yapay zeka destekli'],
  ['KI-Agenten', 'Yapay Zeka Ajanları'],
  ['KI-Agent', 'Yapay Zeka Ajanı'],
  ['KI-Telefonagenten', 'Yapay zeka telefon ajanları'],
  ['KI-Sprachagenten', 'yapay zeka ses ajanları'],
  ['KI-Sprachagenten', 'yapay zeka ses ajanları'],
  ['KI-Sprachagenten', 'Yapay zeka ses ajanları'],
  ['KI-Sprachagenten', 'Yapay Zeka Ses Ajanları'],
  ['KI-Sprachagenten', 'Yapay zeka ses ajanları'],
  ['KI-Sprachagenten', 'Yapay Zeka Ses Ajanları'],
  ['KI-Sprachagenten', 'Yapay zeka ses ajanları'],
  ['KI-Sprachagenten', 'Yapay Zeka Ses Ajanları'],
  ['KI-Sprachagenten', 'Yapay zeka ses ajanları'],
  ['KI-Sprachagenten', 'Yapay Zeka Ses Ajanları'],
  ['KI-Sprachagenten', 'Yapay zeka ses ajanları'],
  ['KI-Sprachagenten', 'Yapay Zeka Ses Ajanları'],
  ['KI-Sprachagenten', 'Yapay zeka ses ajanları'],
  ['KI-Sprachagenten', 'Yapay Zeka Ses Ajanları'],
  ['KI-Sprachagenten', 'Yapay zeka ses ajanları'],
  ['KI-Sprachagenten', 'Yapay Zeka Ses Ajanları'],
  ['KI-Sprachagenten', 'Yapay zeka ses ajanları'],
  ['KI-Sprachagenten', 'Yapay Zeka Ses Ajanları'],
  ['KI-Sprachagenten', 'Yapay zeka ses ajanları'],
  ['KI-Sprachagenten', 'Yapay Zeka Ses Ajanları'],
  ['KI-Sprachagenten', 'Yapay zeka ses ajanları'],
  ['KI-Sprachagenten', 'Yapay Zeka Ses Ajanları'],
  ['KI-Sprachagenten', 'Yapay zeka ses ajanları'],
  ['KI-Sprachagenten', 'Yapay Zeka Ses Ajanları'],
  ['KI-Sprachagenten', 'Yapay zeka ses ajanları'],
  ['KI-Sprachagenten', 'Yapay Zeka Ses Ajanları'],
  ['JETZT STARTEN', 'HEMEN BAŞLA'],
  ['ANMELDEN', 'GİRİŞ YAP'],
  ['Kostenlos testen', 'Ücretsiz Deneyin'],
  ['Kostenlos starten', 'Ücretsiz Başlayın'],
  ['Jetzt starten', 'Hemen Başla'],
  ['14-Tage kostenlos testen', '14 Gün Ücretsiz Deneme'],
  ['10€ Startguthaben gratis', 'Ücretsiz 10$ Kredi'],
  ['Funktionen', 'Özellikler'],
  ['Anwendungsfälle', 'Kullanım Alanları'],
  ['Anwendungsfall', 'Kullanım alanı'],
  ['Preise', 'Fiyatlandırma'],
  ['Integrationen', 'Entegrasyonlar'],
  ['Kontakt', 'İletişim'],
  ['Sprache', 'Dil'],
  ['Vertrieb', 'Satış'],
  ['Support', 'Destek'],
  ['Akquise', 'Erişim'],
  ['Termine', 'Randevular'],
  ['Produkt', 'Ürün'],
  ['Ressourcen', 'Kaynaklar'],
  ['Newsletter abonnieren', 'Bültenimize abone olun'],
  ['E-Mail eingeben', 'E-postanızı girin'],
  ['Danke für Ihre Anmeldung!', 'Abone olduğunuz için teşekkürler!'],
  ['Sie erhalten unsere neuesten Updates und Tipps.', 'En son güncellemelerimizi ve ipuçlarımızı alacaksınız.'],
  ['Alle Rechte vorbehalten.', 'Tüm hakları saklıdır.'],
  ['Datenschutz', 'Gizlilik'],
  ['AGB', 'Şartlar'],
  ['Datenschutzrichtlinie', 'Gizlilik Politikası'],
  ['Nutzungsbedingungen', 'Hizmet Şartları'],
  ['Einfache,', 'Basit,'],
  ['Transparente', 'Şeffaf'],
  ['Monatlich', 'Aylık'],
  ['Jährlich', 'Yıllık'],
  ['20% sparen', '%20 tasarruf'],
  ['Beliebt', 'Popüler'],
  ['Kostenlos', 'Ücretsiz'],
  ['/Monat', '/ay'],
  ['/Jahr', '/yıl'],
  ['Monat', 'ay'],
  ['Jahr', 'yıl'],
  ['Kampagne', 'Kampanya'],
  ['Kampagnen', 'Kampanyalar'],
  ['Unbegrenzte', 'Sınırsız'],
  ['Unbegrenzt', 'Sınırsız'],
  ['Kontakte', 'Kişiler'],
  ['Wissensdatenbank', 'Bilgi Bankası'],
  ['Wissensdatenbanken', 'Bilgi Bankaları'],
  ['Telefonnummer', 'Telefon Numarası'],
  ['Telefonnummern', 'Telefon Numarları'],
  ['Webhook', 'Webhook'],
  ['Webhooks', 'Webhook'],
  ['Gratis-Credits', 'ücretsiz kredi'],
  ['Prioritäts-Support', 'Öncelikli destek'],
  ['Erweiterte Analysen', 'Gelişmiş analitik'],
  ['LLM-Modell wählen', 'LLM modelinizi seçin'],
  ['Menschenähnliche', 'İnsan benzeri'],
  ['Menschenähnlich', 'İnsan benzeri'],
  ['Produktivität', 'Verimlilik'],
  ['Skalierbarkeit', 'Ölçeklenebilirlik'],
  ['Meetings buchen', 'Toplantı Planla'],
  ['Interviews führen', 'Mülakat Yap'],
  ['Kaltakquise betreiben', 'Soğuk Arama'],
  ['Support anbieten', 'Destek Sun'],
  ['Ausgehende Anrufe', 'Giden Aramalar'],
  ['Eingehende Anrufe', 'Gelen Aramalar'],
  ['Agent erstellen', 'Ajan Oluştur'],
  ['Agent auswählen', 'Ajan Seç'],
  ['Ausgehender Anruf', 'Giden Arama'],
  ['Liste auswählen', 'Liste Seç'],
  ['Termine buchen', 'Randevu Al'],
  ['Leads qualifizieren', 'Potansiyel Müşteri Değerlendir'],
  ['Aufgaben & Aktionen automatisieren', 'Görevleri ve Eylemleri Otomatikleştirin'],
  ['Außergewöhnliche Technologie', 'Üstün Teknoloji'],
  ['Unübertroffene Leistung', 'Eşsiz Performans'],
  ['Anwendungsfälle', 'Kullanım Alanları'],
  ['Was unsere Kunden sagen', 'Müşterilerimiz ne diyor'],
  ['bei', '—'],
  ['Kontakt aufnehmen', 'İletişime Geçin'],
  ['Nachricht senden', 'Mesaj Gönder'],
  ['Wird gesendet...', 'Gönderiliyor...'],
  ['Keine Kreditkarte erforderlich', 'Kredi kartı gerekmez'],
  ['Einrichtung in 5 Minuten', '5 dakikada kurulum'],
  ['Für immer kostenloser Plan', 'Sonsuza kadar ücretsiz plan'],
  ['Globale Reichweite', 'Küresel Erişim'],
  ['Zuverlässige Anrufe', 'Güvenilir Aramalar'],
  ['KI & Automatisierungsfunktionen', 'Yapay Zeka ve Otomasyon'],
  ['Branche', 'Sektör'],
  ['Sprache', 'Dil'],
  ['Funktion', 'İşlev'],
  ['Schreiben Sie uns an', 'Bize yazın'],
  ['Ihr vollständiger Name', 'Adınız soyadınız'],
  ['Ihr Firmenname (optional)', 'Şirket adınız (isteğe bağlı)'],
  ['Erzählen Sie uns von Ihren Bedürfnissen...', 'İhtiyaçlarınızı anlatın...'],
  ['Ihre Daten sind sicher. Wir teilen Ihre Informationen niemals.', 'Verileriniz güvende. Bilgilerinizi asla paylaşmayız.'],
  ['Wir antworten innerhalb von 24 Stunden', '24 saat içinde yanıt veriyoruz'],
  ['Keine Verpflichtung erforderlich', 'Taahhüt gerekmez'],
  ['Kostenlose Beratung & personalisierte Demo', 'Ücretsiz danışmanlık ve kişiselleştirilmiş demo'],
  ['Vertraut von über 2.500 Unternehmen weltweit', 'Dünya genelinde 2.500+ işletme tarafından güveniliyor'],
  ['Nachricht erfolgreich gesendet!', 'Mesajınız başarıyla gönderildi!'],
  ['Wir melden uns innerhalb von 24 Stunden bei Ihnen.', '24 saat içinde size dönüş yapacağız.'],
  ['Nachricht konnte nicht gesendet werden', 'Mesaj gönderilemedi'],
  ['Bitte versuchen Sie es später erneut.', 'Lütfen daha sonra tekrar deneyin.'],
  ['Vertrieb kontaktieren', 'Satış Ekibiyle İletişim'],
  ['So funktioniert\'s', 'Nasıl çalışır'],
  ['Erstellen', 'Oluştur'],
  ['Bereitstellen', 'Yayınla'],
  ['Überwachen', 'İzle'],
  ['Demo ansehen', 'Demoyu İzle'],
  ['Kostenlos testen', 'Ücretsiz Deneyin'],
  ['Starten Sie kostenlos, upgraden Sie wenn Sie bereit sind', 'Ücretsiz başlayın, hazır olduğunuzda yükseltin'],
  ['Alle Pläne beinhalten eine 14-tägige Geld-zurück-Garantie. Keine Kreditkarte für den kostenlosen Plan erforderlich.', 'Tüm planlarda 14 gün para iade garantisi. Ücretsiz plan için kredi kartı gerekmez.'],
];

/** Exact overrides for hero/nav (German source from de.json) */
const EXACT = {
  'Erstellen Sie menschenähnliche KI-Sprachagenten für ausgehende und eingehende Anrufe, Terminbuchungen und automatisierte Aktionen rund um die Uhr.':
    'Giden ve gelen aramaları yöneten, toplantı planlayan ve 7/24 işlem yapan insan benzeri yapay zeka ses ajanları oluşturun.',
  'Erstellen Sie KI-Sprachassistenten, die 24/7 für Sie arbeiten':
    'Sizin için 7/24 çalışan yapay zeka ses asistanları oluşturun',
  'Schließen Sie sich Tausenden von Unternehmen an, die {{appName}} nutzen, um ihre Kundenkommunikation zu transformieren':
    'Müşteri iletişimini dönüştürmek için {{appName}} kullanan binlerce işletmeye katılın',
  'Verbinden Sie sich mit Ihren Lieblings-Tools und verbessern Sie Ihre {{appName}}-Erfahrung.':
    'Favori araçlarınıza bağlanın ve {{appName}} deneyiminizi geliştirin.',
  'Haben Sie Fragen zu {{appName}} KI-Sprachagenten? Möchten Sie eine personalisierte Demo? Unser Team hilft Ihnen gerne, Ihre Anrufoperationen zu automatisieren.':
    '{{appName}} yapay zeka ses ajanları hakkında sorularınız mı var? Kişiselleştirilmiş demo ister misiniz? Ekibimiz çağrı operasyonlarınızı otomatikleştirmenize yardımcı olur.',
  'Bereit, Ihre Anrufe zu transformieren?': 'Aramalarınızı dönüştürmeye hazır mısınız?',
  'Bereit, Ihre Anrufoperationen zu transformieren?': 'Çağrı operasyonlarınızı dönüştürmeye hazır mısınız?',
  'Schließen Sie sich Tausenden von Unternehmen an, die KI-Sprachagenten nutzen, um Anrufe zu automatisieren, Leads zu qualifizieren und die Kundenzufriedenheit zu steigern':
    'Aramaları otomatikleştirmek, potansiyel müşterileri değerlendirmek ve müşteri memnuniyetini artırmak için yapay zeka ses ajanları kullanan binlerce işletmeye katılın',
  'Kein Code. Kein Rätselraten. Erstellen, bereitstellen und verwalten Sie KI-Sprachagenten, die Kundenanrufe natürlich und intelligently bearbeiten.':
    'Kod yok. Tahmin yok. Müşteri aramalarını doğal ve akıllıca yöneten yapay zeka ses ajanlarını oluşturun, yayınlayın ve yönetin.',
  'KI-Agenten, die einfach funktionieren': 'Sorunsuz çalışan yapay zeka ajanları',
  'Leistungsstarke Sprachkonnektivität für': 'Güçlü ses bağlantısı:',
  'AI agents that connect with customers globally through reliable, high-quality voice interactions—all powered by premium call infrastructure.':
    'Premium çağrı altyapısıyla desteklenen, müşterilerle dünya genelinde güvenilir ve yüksek kaliteli ses etkileşimleri kuran yapay zeka ajanları.',
};

function translateString(s) {
  if (typeof s !== 'string') return s;
  if (EXACT[s]) return EXACT[s];
  let out = s;
  const sorted = [...PHRASES].sort((a, b) => b[0].length - a[0].length);
  for (const [de, tr] of sorted) {
    if (out.includes(de)) out = out.split(de).join(tr);
  }
  return out;
}

function walk(obj) {
  if (typeof obj === 'string') return translateString(obj);
  if (Array.isArray(obj)) return obj.map(walk);
  if (obj && typeof obj === 'object') {
    const r = {};
    for (const k of Object.keys(obj)) r[k] = walk(obj[k]);
    return r;
  }
  return obj;
}

const landing = walk(de.landing);

// Force critical hero/nav strings (Turkish, not German leftovers)
landing.navbar = {
  features: 'Özellikler',
  useCases: 'Kullanım Alanları',
  pricing: 'Fiyatlandırma',
  integrations: 'Entegrasyonlar',
  blog: 'Blog',
  contact: 'İletişim',
  login: 'GİRİŞ YAP',
  language: 'Dil',
};
landing.hero = {
  badge: 'Kodsuz Yapay Zeka Ses Motoru',
  headline: 'YAPAY ZEKA SES AJANLARI',
  rotatingWords: {
    sales: 'Satış',
    support: 'Destek',
    outreach: 'Erişim',
    appointments: 'Randevu',
  },
  subheadline:
    'Giden ve gelen aramaları yöneten, toplantı planlayan ve 7/24 işlem yapan insan benzeri yapay zeka ses ajanları oluşturun.',
  humanLike: 'İnsan benzeri',
  statsProductivity: 'Verimlilik',
  statsScalability: 'Ölçeklenebilirlik',
  getStarted: 'HEMEN BAŞLA',
  freeTrial: '14 Gün Ücretsiz Deneme',
  freeCredit: 'Ücretsiz 10$ Kredi',
};
landing.footer = {
  product: 'Ürün',
  resources: 'Kaynaklar',
  contactTitle: 'İletişim',
  newsletter: 'Bültenimize abone olun',
  emailPlaceholder: 'E-postanızı girin',
  thankYou: 'Abone olduğunuz için teşekkürler!',
  thankYouDesc: 'En son güncellemelerimizi ve ipuçlarımızı alacaksınız.',
  copyright: 'Tüm hakları saklıdır.',
  privacy: 'Gizlilik',
  terms: 'Şartlar',
  cookies: 'Çerezler',
  features: 'Özellikler',
  useCases: 'Kullanım Alanları',
  pricing: 'Fiyatlandırma',
  integrations: 'Entegrasyonlar',
  blog: 'Blog',
  contact: 'İletişim',
  privacyPolicy: 'Gizlilik Politikası',
  termsOfService: 'Hizmet Şartları',
};
landing.pricing = {
  ...landing.pricing,
  title: 'Basit,',
  titleHighlight: 'Şeffaf',
  titleEnd: 'Fiyatlandırma',
  description: 'Ücretsiz başlayın, hazır olduğunuzda yükseltin',
  monthly: 'Aylık',
  yearly: 'Yıllık',
  save20: '%20 tasarruf',
  popular: 'Popüler',
  free: 'Ücretsiz',
  perMonth: '/ay',
  perYear: '/yıl',
  getStarted: 'Hemen Başla',
  startFreeTrial: 'Ücretsiz Denemeyi Başlat',
  guarantee:
    'Tüm planlarda 14 gün para iade garantisi. Ücretsiz plan için kredi kartı gerekmez.',
};
landing.cta = {
  title: 'Çağrı operasyonlarınızı dönüştürmeye hazır mısınız?',
  description:
    'Aramaları otomatikleştirmek, potansiyel müşterileri değerlendirmek ve müşteri memnuniyetini artırmak için yapay zeka ses ajanları kullanan binlerce işletmeye katılın',
  button: 'Ücretsiz Başlayın',
  trustMessage: 'Kredi kartı gerekmez • 5 dakikada kurulum • Sonsuza kadar ücretsiz plan',
};
landing.featuresPage = {
  ...landing.featuresPage,
  seo: {
    title: 'Özellikler - Yapay Zeka Ses Ajanı Platformu',
    description:
      'Yapay zeka ses ajanı platformumuzun tüm güçlü özelliklerini keşfedin. Akış oluşturucu, çoklu motor desteği, kampanya yönetimi ve daha fazlası.',
  },
  hero: {
    badge: 'Kodsuz Yapay Zeka Ses Motoru',
    title: 'Sorunsuz çalışan yapay zeka ajanları',
    subtitle:
      'Kod yok. Tahmin yok. Müşteri aramalarını doğal ve akıllıca yöneten yapay zeka ses ajanlarını oluşturun, yayınlayın ve yönetin.',
    startFreeTrial: 'Ücretsiz Deneyin',
    contactSales: 'Satış Ekibiyle İletişim',
  },
};

const outPath = path.join(__dirname, 'tr-landing-patches.json');
fs.writeFileSync(outPath, JSON.stringify(landing, null, 2) + '\n', 'utf8');
console.log('Wrote', outPath);
