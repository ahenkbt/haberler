import { pgTable, text, serial, boolean, integer, decimal, timestamp } from "drizzle-orm/pg-core";

export const siteSettingsTable = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  siteName: text("site_name").notNull().default("Yekpare"),
  tagline: text("tagline").notNull().default(
    "Haber Video Haritalar Sipariş Alışveriş Rezervasyon ve İlan Portalı",
  ),
  logoText1: text("logo_text_1").notNull().default("Yek"),
  logoText2: text("logo_text_2").notNull().default("pare"),
  primaryColor: text("primary_color").notNull().default("#CC0000"),
  secondaryColor: text("secondary_color").notNull().default("#1F2937"),
  navbarBg: text("navbar_bg").notNull().default("#FFFFFF"),
  navbarText: text("navbar_text").notNull().default("#111827"),
  /** Legacy column; API always returns yekpare-sade (single public theme). */
  publicThemeKey: text("public_theme_key").notNull().default("yekpare-sade"),
  breakingBg: text("breaking_bg").notNull().default("#CC0000"),
  financeBg: text("finance_bg").notNull().default("#0F172A"),
  footerText: text("footer_text")
    .notNull()
    .default("Yekpare — haber, video, harita, sipariş ve ilan portalı."),
  copyrightText: text("copyright_text")
    .notNull()
    .default("© Yekpare. Tüm hakları saklıdır."),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  whatsapp: text("whatsapp"),
  facebook: text("facebook"),
  twitter: text("twitter"),
  instagram: text("instagram"),
  youtube: text("youtube"),
  telegram: text("telegram"),
  /** JSON string: sıralı menü anahtarları, örn. ["haberler","yektube",...] */
  mainNavJson: text("main_nav_json"),
  /** Tam URL veya site köküne göre yol — üst logo resmi */
  logoUrl: text("logo_url"),
  /** Üst menü ile aynı anahtar dizisi; footer link sırası */
  footerNavJson: text("footer_nav_json"),
  /** JSON dizi: [{ "label": "...", "href": "/..." }] yasal / alt bilgi satırı */
  footerLegalLinksJson: text("footer_legal_links_json"),
  /** JSON dizi: [{ "label": "...", "href": "/..." }] bilgi rehberi satırı */
  footerInfoLinksJson: text("footer_info_links_json"),
  /** JSON nesne: yasal sayfa anahtarı → { title, bodyHtml } */
  legalPagesJson: text("legal_pages_json"),
  /** JSON nesne: anahtar → açık mı (false = modül gizli) */
  modulesEnabledJson: text("modules_enabled_json"),
  /** JSON dizi: { id, enabled } anasayfa blokları */
  homeSectionsJson: text("home_sections_json"),
  /** JSON string: Yekpare `/haberler` vitrin düzeni (NewsSiteLayoutPrefs). */
  newsLayoutJson: text("news_layout_json"),
  /** JSON string: Yekpare `/` landing vitrin düzeni (YekpareLandingDesign). */
  homepageDesignJson: text("homepage_design_json"),
  /** Google Maps JavaScript API tarayıcı anahtarı (HTTP referrer kısıtlı önerilir) */
  mapsGoogleBrowserKey: text("maps_google_browser_key"),
  /** true ise konum çözümlemesinde önce Google Geocoder denenir; kota/hata → OSM */
  mapsGoogleEnabled: boolean("maps_google_enabled").notNull().default(false),
  /** Admin merkezi ayar: Google Places server API key */
  googlePlacesApiKey: text("google_places_api_key"),
  /** Admin merkezi ayar: Google Maps server API key */
  googleMapsServerKey: text("google_maps_server_key"),
  /** Admin merkezi ayar: OpenAI API key */
  openaiApiKey: text("openai_api_key"),
  /** Admin merkezi ayar: OpenAI model */
  openaiModel: text("openai_model"),
  /** Magnific stok API — https://docs.magnific.com/introduction */
  magnificApiKey: text("magnific_api_key"),
  /** Magnific webhook doğrulama (async işler); stok araması için zorunlu değil */
  magnificWebhookSecret: text("magnific_webhook_secret"),
  /** Anasayfa “Öne çıkan işletmeler” vitrini kart sayısı (örn. 15 = 5×3) */
  homeRecentBusinessLimit: integer("home_recent_business_limit").notNull().default(15),
  /** Admin genel ayarlar: havale/EFT alıcı adı */
  bankAccountHolder: text("bank_account_holder"),
  /** Admin genel ayarlar: havale/EFT IBAN */
  bankIban: text("bank_iban"),
  /** Admin genel ayarlar: banka adı/şube */
  bankNameBranch: text("bank_name_branch"),
  /** Admin genel ayarlar: hesap numarası (opsiyonel) */
  bankAccountNumber: text("bank_account_number"),
  /** Platform CallMeBot API — kayıt / şifre sıfırlama gibi mesajları işletme numarasına gönderir */
  adminCallmebotApiKey: text("admin_callmebot_api_key"),
  smtpHost: text("smtp_host"),
  smtpPort: text("smtp_port"),
  smtpUser: text("smtp_user"),
  smtpPass: text("smtp_pass"),
  smtpFrom: text("smtp_from"),
  imapHost: text("imap_host"),
  imapPort: text("imap_port"),
  imapUser: text("imap_user"),
  imapPass: text("imap_pass"),
  imapFolder: text("imap_folder"),
  geminiApiKey: text("gemini_api_key"),
  /** YekTube — YouTube Data API v3 anahtarı (kanal video/playlist senkronu) */
  youtubeApiKey: text("youtube_api_key"),
  deepseekApiKey: text("deepseek_api_key"),
  /** Travelpayouts (Hotellook/Aviasales vb.) affiliate API token — tüm seyahat dikeyleri paylaşır */
  travelpayoutsApiToken: text("travelpayouts_api_token"),
  /** Travelpayouts marker (partner ID) — affiliate deep-link'lerde kullanılır */
  travelpayoutsMarker: text("travelpayouts_marker"),
  /** Servis sağlayıcı standart üyelik aylık (USD) */
  providerMembershipStandardUsd: decimal("provider_membership_standard_usd", { precision: 10, scale: 2 }).notNull().default("10"),
  /** Gold üyelik aylık (USD) */
  providerMembershipGoldUsd: decimal("provider_membership_gold_usd", { precision: 10, scale: 2 }).notNull().default("20"),
  /** Premium: işletme başına aylık ek (USD), Gold özellikleri dahil */
  providerMembershipPremiumPerBusinessUsd: decimal("provider_membership_premium_per_business_usd", {
    precision: 10,
    scale: 2,
  }).notNull().default("10"),
  /** Son bilinen USD→TRY kuru (manuel veya API) */
  usdTryRate: decimal("usd_try_rate", { precision: 14, scale: 6 }),
  usdTryUpdatedAt: timestamp("usd_try_updated_at"),
  /** JSON: Google/Bing/Yandex Search Console doğrulama meta etiketleri */
  verificationJson: text("verification_json"),
  /** JSON: Yektube bölüm kategorileri (yektube / müzik / çocuk) */
  yektubeSectionConfigJson: text("yektube_section_config_json"),
});

export type SiteSettingsRow = typeof siteSettingsTable.$inferSelect;
