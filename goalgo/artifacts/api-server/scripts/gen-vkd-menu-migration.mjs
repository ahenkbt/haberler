/**
 * VKD kurumsal menü + eksik sayfa stub'ları için 0052 migration SQL üretir.
 *
 *   node ./scripts/gen-vkd-menu-migration.mjs
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.resolve(__dirname, "../../../lib/db/migrations/0052_vkd_corporate_menu.sql");

const stubBody = (title) =>
  `<div class="tp-sec"><div class="tp-sec-w"><h2 class="tp-sec-title">${title}</h2><p>Bu sayfanın içeriği yakında eklenecektir.</p></div></div>`;

const newExtraPages = [
  { id: "vkd-page-kadin-kahramanlarimiz", title: "Kadın Kahramanlarımız", slug: "kadin-kahramanlarimiz" },
  { id: "vkd-page-isimsiz-kahramanlar", title: "İsimsiz Kahramanlar", slug: "isimsiz-kahramanlar" },
  { id: "vkd-page-turk-dunyasi-kahramanlari", title: "Türk Dünyası Kahramanları", slug: "turk-dunyasi-kahramanlari" },
  { id: "vkd-page-turk-tarihi", title: "Türk Tarihi", slug: "turk-tarihi" },
].map((p) => ({
  ...p,
  bodyHtml: stubBody(p.title),
  enabled: true,
  fullWidth: true,
}));

/** Ekran görüntülerindeki VKD ana menü ağacı */
const hmCorporateMenuItems = [
  { id: "vkd-menu-kurumsal", label: "KURUMSAL", href: "#", enabled: true },
  { id: "vkd-menu-kur-hakkimizda", label: "Hakkımızda", href: "/hakkimizda", parentId: "vkd-menu-kurumsal", enabled: true },
  { id: "vkd-menu-kur-baskan", label: "Genel Başkan", href: "/baskan", parentId: "vkd-menu-kurumsal", enabled: true },
  { id: "vkd-menu-kur-faaliyetler", label: "Faaliyetler", href: "/faaliyetler", parentId: "vkd-menu-kurumsal", enabled: true },
  { id: "vkd-menu-kur-dernegimiz", label: "Derneğimiz", href: "/kategori/dernegimiz", parentId: "vkd-menu-kurumsal", enabled: true },
  { id: "vkd-menu-kur-isbirligi", label: "İşbirliği", href: "/isbirligi", parentId: "vkd-menu-kurumsal", enabled: true },
  { id: "vkd-menu-kur-hizmet", label: "Hizmet Bölgelerimiz", href: "/hizmet-bolgesi", parentId: "vkd-menu-kurumsal", enabled: true },
  { id: "vkd-menu-kur-hukuk", label: "Hukuk ve Savunuculuk", href: "/hukuk-savunuculuk", parentId: "vkd-menu-kurumsal", enabled: true },
  { id: "vkd-menu-kur-stk", label: "Uluslararası STK", href: "/uluslararasi-stk", parentId: "vkd-menu-kurumsal", enabled: true },
  { id: "vkd-menu-kur-bagis", label: "Bağış", href: "/bagis", parentId: "vkd-menu-kurumsal", enabled: true },

  { id: "vkd-menu-kahramanlar", label: "KAHRAMANLARIMIZ", href: "#", enabled: true },
  { id: "vkd-menu-kah-kadin", label: "Kadın Kahramanlarımız", href: "/kadin-kahramanlarimiz", parentId: "vkd-menu-kahramanlar", enabled: true },
  { id: "vkd-menu-kah-isimsiz", label: "İsimsiz Kahramanlar", href: "/isimsiz-kahramanlar", parentId: "vkd-menu-kahramanlar", enabled: true },
  { id: "vkd-menu-kah-kahramanlar", label: "Kahramanlar", href: "/kahramanlar", parentId: "vkd-menu-kahramanlar", enabled: true },
  { id: "vkd-menu-kah-turk-dunyasi", label: "Türk Dünyası Kahramanları", href: "/turk-dunyasi-kahramanlari", parentId: "vkd-menu-kahramanlar", enabled: true },
  { id: "vkd-menu-kah-sehitler", label: "Şehitlerimiz", href: "/sehitlerimiz", parentId: "vkd-menu-kahramanlar", enabled: true },
  { id: "vkd-menu-kah-sehitlikler", label: "Şehitliklerimiz", href: "/sehitliklerimiz", parentId: "vkd-menu-kahramanlar", enabled: true },
  { id: "vkd-menu-kah-gaziler", label: "Gazilerimiz", href: "/gazilerimiz", parentId: "vkd-menu-kahramanlar", enabled: true },

  { id: "vkd-menu-tarih", label: "TARİH", href: "#", enabled: true },
  { id: "vkd-menu-tarih-turk", label: "Türk Tarihi", href: "/turk-tarihi", parentId: "vkd-menu-tarih", enabled: true },
  { id: "vkd-menu-tarih-kurtulus", label: "Kurtuluş Savaşı", href: "/savaslar/kurtulus-savasi", parentId: "vkd-menu-tarih", enabled: true },
  { id: "vkd-menu-tarih-canakkale", label: "Çanakkale", href: "/savaslar/canakkale-savasi", parentId: "vkd-menu-tarih", enabled: true },
  { id: "vkd-menu-tarih-milli", label: "Millî Günler", href: "/milli-gunler", parentId: "vkd-menu-tarih", enabled: true },

  { id: "vkd-menu-sosyal", label: "SOSYAL HİZMETLER", href: "#", enabled: true },
  { id: "vkd-menu-sos-haklar", label: "Şehit-Gazi Hakları", href: "/sehit-gazi-haklari", parentId: "vkd-menu-sosyal", enabled: true },
  { id: "vkd-menu-sos-uluslararasi", label: "Uluslararası Ş-G Hakları", href: "/uluslararasi-sehit-gazi-haklari", parentId: "vkd-menu-sosyal", enabled: true },
  { id: "vkd-menu-sos-yurtici", label: "Yurtiçi Kuruluşlar", href: "/turkiye-sehit-gazi-dernekleri", parentId: "vkd-menu-sosyal", enabled: true },
  { id: "vkd-menu-sos-yurtdisi", label: "Yurtdışı Kuruluşlar", href: "/dunya-sehit-gazi-kuruluslari", parentId: "vkd-menu-sosyal", enabled: true },

  { id: "vkd-menu-ataturk", label: "ATATÜRK", href: "#", enabled: true },
  { id: "vkd-menu-ataturk-kose", label: "Atatürk Köşesi", href: "/ataturk", parentId: "vkd-menu-ataturk", enabled: true },
  { id: "vkd-menu-ataturk-hayati", label: "Atatürk'ün Hayatı", href: "/ataturk/hayati", parentId: "vkd-menu-ataturk", enabled: true },
  { id: "vkd-menu-ataturk-kronoloji", label: "Atatürk Kronolojisi", href: "/ataturk/kronoloji", parentId: "vkd-menu-ataturk", enabled: true },
  { id: "vkd-menu-ataturk-ilkeler", label: "Atatürk İlkeleri", href: "/ataturk/ilkeler", parentId: "vkd-menu-ataturk", enabled: true },
  { id: "vkd-menu-ataturk-sozleri", label: "Atatürk Sözleri", href: "/ataturk/sozleri", parentId: "vkd-menu-ataturk", enabled: true },

  { id: "vkd-menu-haberler", label: "HABERLER", href: "/tum-haberler", enabled: true },
];

const menuJson = JSON.stringify(hmCorporateMenuItems);
const pagesJson = JSON.stringify(newExtraPages);

const sql = `-- VKD kurumsal header menüsü (ekran görüntüsü yapısı) + eksik sayfa stub'ları
UPDATE hm_news_sites
SET
  layout_json = jsonb_set(
    jsonb_set(
      layout_json,
      '{hmCorporateMenuItems}',
      $vkd_menu_json$${menuJson}$vkd_menu_json$::jsonb,
      true
    ),
    '{hmExtraPages}',
    COALESCE(layout_json->'hmExtraPages', '[]'::jsonb) || $vkd_new_pages_json$${pagesJson}$vkd_new_pages_json$::jsonb,
    true
  ),
  updated_at = now()
WHERE slug = 'vkd';
`;

writeFileSync(outPath, sql, "utf8");
console.log(`Wrote ${outPath}`);
console.log(`Menu items: ${hmCorporateMenuItems.length}, new stub pages: ${newExtraPages.length}`);
