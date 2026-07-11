/** Footer yasal sayfaları — admin panelden düzenlenir; yoksa varsayılan metin. */

import {
  YEKPARE_GIZLILIK_BODY_HTML,
  YEKPARE_IADE_BODY_HTML,
  YEKPARE_KULLANIM_KOSULLARI_BODY_HTML,
  YEKPARE_MESAFELI_SATIS_BODY_HTML,
  YEKPARE_ON_BILGILENDIRME_BODY_HTML,
  YEKPARE_SSS_BODY_HTML,
  YEKPARE_TESLIMAT_BODY_HTML,
} from "./yekpareFaqContent.js";

export type LegalPageKey =
  | "mesafeli-satis-sozlesmesi"
  | "on-bilgilendirme"
  | "gizlilik-kvkk"
  | "iade-degisim"
  | "teslimat-kargo"
  | "kullanim-kosullari"
  | "sss"
  | "kunye"
  | "iletisim-kunye";

export type LegalPageContent = { title: string; bodyHtml: string };

export type LegalPagesContentMap = Record<LegalPageKey, LegalPageContent>;

export type LegalPageDefinition = {
  key: LegalPageKey;
  label: string;
  path: string;
  defaultTitle: string;
  defaultBodyHtml: string;
};

export const LEGAL_PAGE_DEFINITIONS: LegalPageDefinition[] = [
  {
    key: "mesafeli-satis-sozlesmesi",
    label: "Mesafeli satış",
    path: "/mesafeli-satis-sozlesmesi",
    defaultTitle: "Mesafeli Satış Sözleşmesi",
    defaultBodyHtml: YEKPARE_MESAFELI_SATIS_BODY_HTML,
  },
  {
    key: "on-bilgilendirme",
    label: "Ön bilgilendirme",
    path: "/on-bilgilendirme",
    defaultTitle: "Ön Bilgilendirme Formu",
    defaultBodyHtml: YEKPARE_ON_BILGILENDIRME_BODY_HTML,
  },
  {
    key: "gizlilik-kvkk",
    label: "Gizlilik · KVKK",
    path: "/gizlilik-kvkk",
    defaultTitle: "Gizlilik Politikası ve KVKK Aydınlatma Metni",
    defaultBodyHtml: YEKPARE_GIZLILIK_BODY_HTML,
  },
  {
    key: "iade-degisim",
    label: "İade / değişim",
    path: "/iade-degisim",
    defaultTitle: "İptal, İade ve Değişim Koşulları",
    defaultBodyHtml: YEKPARE_IADE_BODY_HTML,
  },
  {
    key: "teslimat-kargo",
    label: "Teslimat",
    path: "/teslimat-kargo",
    defaultTitle: "Teslimat ve Kargo Bilgileri",
    defaultBodyHtml: YEKPARE_TESLIMAT_BODY_HTML,
  },
  {
    key: "kullanim-kosullari",
    label: "Kullanım koşulları",
    path: "/kullanim-kosullari",
    defaultTitle: "Kullanım Koşulları / Üyelik Sözleşmesi",
    defaultBodyHtml: YEKPARE_KULLANIM_KOSULLARI_BODY_HTML,
  },
  {
    key: "sss",
    label: "SSS",
    path: "/sss",
    defaultTitle: "Sıkça Sorulan Sorular (SSS)",
    defaultBodyHtml: YEKPARE_SSS_BODY_HTML,
  },
  {
    key: "kunye",
    label: "Künye (/kunye)",
    path: "/kunye",
    defaultTitle: "Künye",
    defaultBodyHtml: `<p>Yayın ilkeleri, sorumlu müdür ve iletişim bilgileri burada yer alır.</p>
<ul><li>Sorumlu müdür</li><li>Yayın politikası</li><li>Adres ve kayıt bilgileri</li></ul>`,
  },
  {
    key: "iletisim-kunye",
    label: "İletişim & Künye",
    path: "/iletisim-kunye",
    defaultTitle: "İletişim & Künye",
    defaultBodyHtml: "",
  },
];

export const LEGAL_PAGE_KEYS = LEGAL_PAGE_DEFINITIONS.map((d) => d.key);

const DEFAULT_MAP: LegalPagesContentMap = Object.fromEntries(
  LEGAL_PAGE_DEFINITIONS.map((d) => [d.key, { title: d.defaultTitle, bodyHtml: d.defaultBodyHtml }]),
) as LegalPagesContentMap;

function defByKey(key: string): LegalPageDefinition | undefined {
  return LEGAL_PAGE_DEFINITIONS.find((d) => d.key === key);
}

function cleanTitle(raw: unknown, fallback: string): string {
  const t = String(raw ?? "").trim();
  if (!t) return fallback;
  return t.slice(0, 200);
}

function cleanBodyHtml(raw: unknown, fallback: string): string {
  const t = String(raw ?? "");
  if (!t.trim()) return fallback;
  return t.slice(0, 120_000);
}

export function defaultLegalPagesContent(): LegalPagesContentMap {
  return { ...DEFAULT_MAP };
}

export function parseLegalPagesJson(json: string | null | undefined): LegalPagesContentMap {
  const base = defaultLegalPagesContent();
  if (json == null || String(json).trim() === "") return base;
  try {
    const data = JSON.parse(json) as unknown;
    if (!data || typeof data !== "object") return base;
    const out = { ...base };
    for (const key of LEGAL_PAGE_KEYS) {
      const row = (data as Record<string, unknown>)[key];
      if (!row || typeof row !== "object") continue;
      const def = defByKey(key)!;
      out[key] = {
        title: cleanTitle((row as { title?: unknown }).title, def.defaultTitle),
        bodyHtml: cleanBodyHtml((row as { bodyHtml?: unknown }).bodyHtml, def.defaultBodyHtml),
      };
    }
    return out;
  } catch {
    return base;
  }
}

export function serializeLegalPagesJson(map: LegalPagesContentMap): string {
  const out: Partial<LegalPagesContentMap> = {};
  for (const key of LEGAL_PAGE_KEYS) {
    const def = defByKey(key)!;
    const row = map[key] ?? { title: def.defaultTitle, bodyHtml: def.defaultBodyHtml };
    out[key] = {
      title: cleanTitle(row.title, def.defaultTitle),
      bodyHtml: cleanBodyHtml(row.bodyHtml, def.defaultBodyHtml),
    };
  }
  return JSON.stringify(out);
}

export function validateLegalPagesJsonInput(
  raw: string | null,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (raw === null) return { ok: true, value: null };
  const s = String(raw).trim();
  if (s === "") return { ok: true, value: null };
  try {
    const parsed = parseLegalPagesJson(s);
    return { ok: true, value: serializeLegalPagesJson(parsed) };
  } catch {
    return { ok: false, error: "legalPagesJson geçerli değil" };
  }
}

export function legalPageByPath(pathname: string): LegalPageDefinition | undefined {
  const p = String(pathname || "").replace(/\/+$/, "") || "/";
  return LEGAL_PAGE_DEFINITIONS.find((d) => d.path === p);
}
