import type { HmAdSlotState } from "@/lib/newsSiteLayout";

/** Yaygın yapıştırma hatası: `<img …>` sonrası eşleşmeyen `</a>` (açılış `<a>` yok). */
export function sanitizeHmEditorAdSlotHtml(html: string | null | undefined): string {
  let h = (html ?? "").trimEnd();
  while (h.length > 0) {
    const m = h.match(/<\/a>\s*$/i);
    if (!m) break;
    const before = h.slice(0, h.length - m[0].length);
    if (/<\s*a\b/i.test(before)) break;
    h = before.trimEnd();
  }
  return h;
}

function escapeHtmlAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/\r?\n/g, " ");
}

/** Editör “görsel yükle” ile üretilen güvenli HTML (hm-ad-slot-uploaded işaretçisi). */
export function buildHmAdSlotImageHtml(mediaUrl: string, clickUrl?: string | null): string {
  const u = escapeHtmlAttr(mediaUrl.trim());
  const img = `<img src="${u}" alt="" class="max-w-full h-auto mx-auto hm-ad-slot-uploaded" loading="lazy" />`;
  const wrap = (inner: string) => `<div class="flex justify-center hm-ad-slot-banner">${inner}</div>`;
  const c = (clickUrl ?? "").trim();
  if (c) {
    return wrap(
      `<a href="${escapeHtmlAttr(c)}" target="_blank" rel="noopener noreferrer sponsored">${img}</a>`,
    );
  }
  return wrap(img);
}

/** Kayıtlı HTML bizim görsel şablonundan geliyorsa img src çıkarır. */
export function extractHmAdSlotImageSrc(html: string | null | undefined): string | null {
  const h = html?.trim() ?? "";
  if (!h.includes("hm-ad-slot-uploaded")) return null;
  const m = h.match(/<img[^>]*\ssrc=["']([^"']+)["']/i);
  return m?.[1]?.trim() ?? null;
}

function decodeMinimalHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Görsel banner şablonunda sarmalayıcı `<a href>` varsa adresi çıkarır (API yalnızca html sakladığı için). */
export function extractHmAdSlotImageClickUrl(html: string | null | undefined): string | null {
  const h = html?.trim() ?? "";
  if (!h.includes("hm-ad-slot-uploaded")) return null;
  const m = h.match(/hm-ad-slot-banner[^>]*>[\s\S]*?<a\s[^>]*href=["']([^"']+)["']/i);
  const raw = m?.[1]?.trim();
  if (!raw) return null;
  return decodeMinimalHtmlEntities(raw);
}

/** Haber merkezi vitrininde kullanılan slot anahtarları — admin Reklam Alanları ile aynı isimler. */
export type HmAdSlotDef = {
  slotKey: string;
  name: string;
  description: string;
  /** Vitrin temalarında göründüğü konumlar (editör rehberi). */
  themePlacements?: string[];
};

export const HM_EDITOR_AD_SLOT_DEFS: HmAdSlotDef[] = [
  {
    slotKey: "header_top",
    name: "Header Üst Banner",
    description: "Logo üzeri / sağ banner (728x90)",
    themePlacements: ["Tüm haber temaları — logo üstü", "Trabzonik — logo sağı banner"],
  },
  {
    slotKey: "header_logo_side",
    name: "Logo Yanı Banner",
    description: "Logo satırında sağda kompakt reklam alanı",
    themePlacements: ["Varsayılan header — logo yanı", "Trabzonik — logo sağı"],
  },
  {
    slotKey: "header_bottom",
    name: "Header Alt Banner",
    description: "Menü altı leaderboard",
    themePlacements: ["Tüm haber temaları — menü hemen altı"],
  },
  {
    slotKey: "home_middle",
    name: "Anasayfa Orta",
    description: "Modüller arası reklam",
    themePlacements: [
      "Klasik / Portal3 — kategori blokları ile editör seçimleri arası",
      "Esen — video bloğu altı",
      "Ajans / WSJ / Haber — modül sırasında «Orta reklam alanı»",
    ],
  },
  {
    slotKey: "manset_alti",
    name: "Manşet Altı",
    description: "Haber ana sayfası slider hemen altı",
    themePlacements: [
      "Klasik / Portal3 — manşet grid hemen altı (tam genişlik)",
      "Esen — slider sonrası geniş bant",
      "Ajans / WSJ / Haber — «Manşet altı / banner reklam» modülü",
    ],
  },
  {
    slotKey: "sidebar_top",
    name: "Yan Kolon Üst",
    description: "Liste / detay yan kolonu üstü",
    themePlacements: [
      "Klasik / Portal3 — manşet yanı sağ sütun üstü (Son Haberler üzeri)",
      "Haber — Güncel Haberler kutusu sağ sidebar üstü",
      "Kategori / detay — sağ yan kolon üstü",
    ],
  },
  {
    slotKey: "article_inline",
    name: "Makale İçi",
    description: "Haber detayda yazı arası HTML",
    themePlacements: ["Haber detay — gövde metni içi"],
  },
  {
    slotKey: "footer",
    name: "Footer Banner",
    description: "Sayfa sonu banner",
    themePlacements: ["Tüm haber temaları — alt bilgi üstü (yakında)"],
  },
  {
    slotKey: "siparis_empty",
    name: "Sipariş — Boş liste",
    description: "Sipariş modülü boş liste alanı (genelde kullanılmaz)",
    themePlacements: ["Sipariş modülü — boş sepet/liste"],
  },
];

export function mergeHmAdSlots(saved: HmAdSlotState[] | null | undefined): HmAdSlotState[] {
  const byKey = new Map<string, HmAdSlotState>();
  for (const s of saved ?? []) {
    if (!s?.slotKey) continue;
    const raw = s as HmAdSlotState;
    let html = raw.html ?? "";
    let contentMode: "html" | "image" = raw.contentMode === "image" ? "image" : "html";
    let imageMediaUrl =
      typeof raw.imageMediaUrl === "string" && raw.imageMediaUrl.trim() ? raw.imageMediaUrl.trim() : null;
    let imageClickUrl =
      typeof raw.imageClickUrl === "string" && raw.imageClickUrl.trim() ? raw.imageClickUrl.trim() : null;
    if (!imageMediaUrl && html.includes("hm-ad-slot-uploaded")) {
      const extracted = extractHmAdSlotImageSrc(html);
      if (extracted) {
        imageMediaUrl = extracted;
        contentMode = "image";
      }
    }
    if (!imageClickUrl && html.includes("hm-ad-slot-uploaded")) {
      imageClickUrl = extractHmAdSlotImageClickUrl(html);
    }
    byKey.set(s.slotKey, {
      slotKey: s.slotKey,
      enabled: !!s.enabled,
      html,
      contentMode,
      imageMediaUrl,
      imageClickUrl,
    });
  }
  return HM_EDITOR_AD_SLOT_DEFS.map((d) => {
    const cur = byKey.get(d.slotKey);
    return {
      slotKey: d.slotKey,
      enabled: cur?.enabled ?? false,
      html: cur?.html ?? "",
      contentMode: cur?.contentMode === "image" ? "image" : "html",
      imageMediaUrl: cur?.imageMediaUrl ?? null,
      imageClickUrl: cur?.imageClickUrl ?? null,
    };
  });
}

/** Kayıt öncesi: görsel modunda güvenli HTML üret; HTML modunda sadece sınırlı temizlik (yetim `</a>` vb.). */
export function normalizeHmAdSlotsForSave(list: HmAdSlotState[]): HmAdSlotState[] {
  return list.map((s) => {
    if (s.contentMode === "image" && s.imageMediaUrl?.trim()) {
      return {
        ...s,
        html: buildHmAdSlotImageHtml(s.imageMediaUrl.trim(), s.imageClickUrl),
      };
    }
    const rawHtml = s.html ?? "";
    const cleaned = sanitizeHmEditorAdSlotHtml(rawHtml);
    if (cleaned === rawHtml) return s;
    return { ...s, html: cleaned };
  });
}
