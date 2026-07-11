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

export function aiNewsSystemPrompt(opts: { langInstruction: string; extra?: string }): string {
  const extra = opts.extra ? `${opts.extra.trim()} ` : "";
  const trStyle = /türkçe|turkish/i.test(opts.langInstruction) ? `${AI_NEWS_TR_STYLE_RULES} ` : "";
  return (
    `Sen profesyonel bir haber editörüsün. ${opts.langInstruction} ${trStyle}${extra}` +
    `Özgün, bilgilendirici haber metni yaz (makale veya essay değil). Yalnızca JSON döndür. ${AI_NEWS_ICERIK_HTML_RULES}`
  );
}

export function aiNewsUserJsonHint(wordCount: number, fields = '"baslik","spot","icerik","etiketler"'): string {
  return `JSON: {${fields}} — "icerik" yukarıdaki HTML yapısına uymalı. Yaklaşık ${wordCount} kelime.`;
}
