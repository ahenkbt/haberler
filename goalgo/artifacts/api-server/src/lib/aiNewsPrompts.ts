import {
  ASG_ANKARA_EDITOR_AI_RULES,
  HM_LOCAL_CATEGORY_EDITOR_AI_RULES,
  KAMU_YEREL_CUMHA_EDITOR_AI_RULES,
} from "./hm-local-category-router.js";
import { normalizeSiteYonelim, type SiteYonelim } from "./hm-rss-kaynak-yonelim.js";

/** AI haber üretiminde `icerik` alanı için ortak HTML kuralları. */
export const AI_NEWS_ICERIK_HTML_RULES =
  'Alan "icerik" yalnızca geçerli HTML olsun (Markdown yasak: **bold** veya ## başlık kullanma; <strong> ve <h3> kullan). ' +
  "Yapı: önce özet niteliğinde tek <p> giriş paragrafı; ardından tam 2–4 adet <h3> alt başlık; " +
  "her <h3> altında en fazla 2 kısa <p> paragraf (her paragraf en fazla 2–3 cümle). " +
  "Tek blok yığma metin, uzun paragraf veya alt başlıksız gövde yazma.";

/** Türkçe haber (makale / köşe yazısı değil) üslup kuralları. */
export const AI_NEWS_TR_STYLE_RULES =
  "Türkiye haber sitelerindeki güncel haber dili: ters piramit (en önemli bilgi ilk paragrafta), 5N1K (kim, ne, nerede, ne zaman, neden, nasıl). " +
  "Kısa, net cümleler; akademik makale, deneme, köşe yazısı veya uzun analiz tonu kullanma. " +
  "Kaynakta geçmeyen yabancı ülke/örnek (Vietnam, Çin vb.) ekleme; konu Türkiye veya kaynak başlığındaki olayla sınırlı kalsın. " +
  "Spekülasyon ve 'gelecekte olabilir' tarzı yorumları en aza indir; doğrulanmış bilgiyi aktar.";

/**
 * Site yönelimine göre yeniden yazma tonu.
 * Boş/verilmezse kural eklenmez (eski çağrılar aynı promptu korur).
 * sol: yeniden yaz, kaynak cümlesini kopyalama, kaynak tonunu koru.
 * karma: orta ve dengeli. sag: daha ılımlı ve yumuşak.
 */
export function editorYonelimRewriteRules(yonelim: unknown): string {
  const v: SiteYonelim = normalizeSiteYonelim(yonelim);
  if (v === "sol") {
    return (
      "Haberi yeniden yaz; kaynak cümlelerini aynen kopyalama, ifadeyi özgünleştir. " +
      "Kaynağın net ve açık tonunu koru: yumuşatma, tarafsızlaştırma veya sert dili törpüleme. " +
      "Olayın kaynağındaki duruş ve netlik yerinde kalsın."
    );
  }
  if (v === "sag") {
    return (
      "Haberi yeniden yaz; kaynak cümlelerini aynen kopyalama. " +
      "Üslup özellikle ılımlı, yumuşak ve tarafsız olsun: sert, suçlayıcı ve kutuplaştırıcı dili çıkar; " +
      "olayı sakin ve ölçülü aktar."
    );
  }
  return (
    "Haberi yeniden yaz; kaynak cümlelerini aynen kopyalama. " +
    "Üslup orta ve dengeli olsun: taraf tutmadan, sert ve kutuplaştırıcı dili yumuşatarak olayı aktar."
  );
}

export function aiNewsSystemPrompt(opts: {
  langInstruction: string;
  extra?: string;
  /** ASG/AHG Ankara kategorisi için ek kurallar */
  ankaraLocalOnly?: boolean;
  /** HM yerel kategori yönlendirme kuralı (tüm haber siteleri) */
  hmLocalCategoryRules?: boolean;
  /** turkatahaber.com / yerel.net.tr Cumha taksonomisi */
  kamuYerelCumhaRules?: boolean;
  /**
   * Hedef sitenin yönelimi. Verilmezse ton kuralı eklenmez.
   * sol = kaynak tonunu koruyarak yeniden yaz, karma = dengeli, sag = ılımlı.
   */
  siteYonelim?: unknown;
}): string {
  const extra = opts.extra ? `${opts.extra.trim()} ` : "";
  const trStyle = /türkçe|turkish/i.test(opts.langInstruction) ? `${AI_NEWS_TR_STYLE_RULES} ` : "";
  const hmLocal =
    opts.hmLocalCategoryRules === true ? `${HM_LOCAL_CATEGORY_EDITOR_AI_RULES} ` : "";
  const kamuYerel = opts.kamuYerelCumhaRules === true ? `${KAMU_YEREL_CUMHA_EDITOR_AI_RULES} ` : "";
  const ankara = opts.ankaraLocalOnly === true ? `${ASG_ANKARA_EDITOR_AI_RULES} ` : "";
  const tone =
    opts.siteYonelim == null || String(opts.siteYonelim).trim() === ""
      ? ""
      : `${editorYonelimRewriteRules(opts.siteYonelim)} `;
  return (
    `Sen profesyonel bir haber editörüsün. ${opts.langInstruction} ${trStyle}${hmLocal}${kamuYerel}${ankara}${tone}${extra}` +
    `Özgün, bilgilendirici haber metni yaz (makale veya essay değil). Yalnızca JSON döndür. ${AI_NEWS_ICERIK_HTML_RULES}`
  );
}

export function aiNewsUserJsonHint(wordCount: number, fields = '"baslik","spot","icerik","etiketler"'): string {
  return `JSON: {${fields}} — "icerik" yukarıdaki HTML yapısına uymalı. Yaklaşık ${wordCount} kelime.`;
}
