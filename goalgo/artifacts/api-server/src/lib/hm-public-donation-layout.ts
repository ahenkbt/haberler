import { isLegacyHmDonationHtml, stripLegacyHmDonationHtml } from "./hmLegacyDonationHtml.js";

/** Anasayfa bağış düzeni: tek kutu (destek bandı + IBAN), alt footer modülü yok. */

export function isHmDonationLayoutActive(layout: Record<string, unknown>): boolean {
  const raw = layout.hmCorporateDonation;
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return o.enabled !== false;
}

function normalizeSupportBandHighlights(raw: unknown): string | null {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  if (/<(ul|ol|li|p)\b/i.test(t)) return t.slice(0, 4000);
  const lines = t
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const bulletish = lines.filter((line) => /^[🏅🎓📜⭐🎖️•\-*]|\bfa[\s-]/i.test(line));
  if (bulletish.length >= 2) {
    const items = bulletish.map((line) => `<li>${line}</li>`).join("");
    return `<ul class="vkv-donation-bullets">${items}</ul>`;
  }
  if (lines.length === 1) {
    return `<p class="vkv-donation-lead">${lines[0]}</p>`;
  }
  return `<p class="vkv-donation-lead">${t.slice(0, 2000)}</p>`;
}

function normalizeCorporateDonationBlock(raw: unknown): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const bandRaw = o.supportBand;
  const band =
    bandRaw && typeof bandRaw === "object" && !Array.isArray(bandRaw) ? (bandRaw as Record<string, unknown>) : {};
  const highlightsHtml =
    (typeof band.highlightsHtml === "string" && band.highlightsHtml.trim()) ||
    normalizeSupportBandHighlights(band.text) ||
    null;
  const buttonRaw = String(o.buttonText ?? "").trim();
  const buttonText =
    !buttonRaw || /^bağış\s*yap$/i.test(buttonRaw) ? "IBAN Kopyala" : buttonRaw.slice(0, 40);

  return {
    ...o,
    description: null,
    amounts: [],
    buttonText,
    supportBand: {
      ...band,
      text: highlightsHtml ? null : band.text ?? null,
      highlightsHtml,
    },
  };
}

const VKD_DONATION_SUPPORT_HIGHLIGHTS_HTML = `<ul class="vkv-donation-bullets"><li>🎖️ Gazilerimizin haklarının korunması ve iyileştirilmesi için hukuki ve sosyal destek</li><li>🎓 Şehit ve gazi çocuklarına eğitim bursları</li><li>📜 Türk kahramanlarının hikâyelerinin gelecek nesillere aktarılması</li></ul>`;

const VKD_DONATION_CHIP_ITEMS = ["🎖️ GAZİ HAKLARI", "🎓 EĞİTİM BURSU", "📜 TOPLUMSAL FAYDA"];

/** VKD: IBAN ve destek metni DB'de boşsa kurumsal varsayılanları yazar (editör özelleştirmesini ezmez). */
export function applyVkdDonationLayoutDefaults(layout: Record<string, unknown>): Record<string, unknown> {
  if (!isHmDonationLayoutActive(layout)) return layout;
  const next = { ...layout };
  const raw = next.hmCorporateDonation;
  const o: Record<string, unknown> =
    raw && typeof raw === "object" && !Array.isArray(raw) ? ({ ...(raw as Record<string, unknown>) }) : {};
  const bandRaw = o.supportBand;
  const band: Record<string, unknown> =
    bandRaw && typeof bandRaw === "object" && !Array.isArray(bandRaw)
      ? ({ ...(bandRaw as Record<string, unknown>) })
      : {};

  if (!String(o.iban ?? "").trim()) {
    o.iban = "TR66 0010 3000 0000 0084 0744 71";
  }
  if (!String(o.accountName ?? "").trim()) {
    o.accountName = "VATAN KAHRAMANLARI SAVUNMA HİZMETLERİ";
  }
  const title = String(o.title ?? "").trim();
  if (!title || /^kurumsal yayıncılığa destek/i.test(title)) {
    o.title = "Çalışmalarımıza Destek Olun.";
  }
  if (!String(band.highlightsHtml ?? "").trim() && !String(band.text ?? "").trim()) {
    band.highlightsHtml = VKD_DONATION_SUPPORT_HIGHLIGHTS_HTML;
  }
  const items = Array.isArray(band.items) ? band.items.map((i) => String(i).trim()).filter(Boolean) : [];
  const genericItems =
    items.length === 3 &&
    items.every((line) => /^(yerel habercilik|bağımsız yayın|toplumsal fayda)$/i.test(line));
  if (!items.length || genericItems) {
    band.items = VKD_DONATION_CHIP_ITEMS;
  }
  const bandTitle = String(band.title ?? "").trim();
  if (!bandTitle || /^desteğiniz haber merkezinin yanında$/i.test(bandTitle)) {
    band.title = "Çalışmalarımıza Destek Olun.";
  }
  o.supportBand = band;
  next.hmCorporateDonation = o;
  return next;
}

export function normalizeHmPublicDonationLayout(layout: Record<string, unknown>): Record<string, unknown> {
  const next = { ...layout };
  if (!isHmDonationLayoutActive(next)) return next;

  const donation = normalizeCorporateDonationBlock(next.hmCorporateDonation);
  if (donation) next.hmCorporateDonation = donation;

  const order = next.hmCorporateHomeModuleOrder;
  if (Array.isArray(order)) {
    next.hmCorporateHomeModuleOrder = order.filter((id) => String(id) !== "donationFooter");
  }

  const mansetHtml = next.hmMansetBelowAdHtml;
  if (typeof mansetHtml === "string" && isLegacyHmDonationHtml(mansetHtml)) {
    next.hmMansetBelowAdHtml = stripLegacyHmDonationHtml(mansetHtml) || null;
  }

  const adSlots = next.hmAdSlots;
  if (Array.isArray(adSlots)) {
    next.hmAdSlots = adSlots.map((slot) => {
      if (!slot || typeof slot !== "object") return slot;
      const s = slot as Record<string, unknown>;
      const html = s.html;
      if (typeof html !== "string" || !isLegacyHmDonationHtml(html)) return slot;
      const cleaned = stripLegacyHmDonationHtml(html);
      return { ...s, html: cleaned || null, enabled: cleaned ? s.enabled : false };
    });
  }

  return next;
}
