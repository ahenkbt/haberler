/** "Toplu Basın Bülteni ve Tanıtım Haberi Dağıtım Beyanı" — kullanıcı metni (2026-10-08 23:35), aynen. */
export type TanitimText = {
  title: string;
  salutation: string;
  intro: string[];
  advTitle: string;
  advantages: [string, string][];
  outro: string[];
};

export const TANITIM_TEXT: TanitimText = {
  "title": "Toplu Basın Bülteni ve Tanıtım Haberi Dağıtım Beyanı",
  "salutation": "İş ortaklarımızın ve ajanslarımızın dikkatine;",
  "intro": [
    "Bünyemizde faaliyet gösteren {N} farklı haber ve yayın portalımız üzerinden yürütülen tanıtım haberi, basın bülteni ve dijital PR çalışmalarında, içeriğinizin dijital görünürlüğünü en üst seviyeye çıkarmak adına senkronize bir yayın süreci uygulanmaktadır.",
    "Tarafımıza iletilen ve yayın onayından geçen tanıtım haberiniz, dijital yayın ağımızda yer alan {N} haber sitemizin tamamında eksiksiz ve eş zamanlı olarak yayınlanmıştır."
  ],
  "advTitle": "Yayın Süreci ve Sağlanan Avantajlar",
  "advantages": [
    [
      "Eksiksiz Ağ Kapsamı",
      "Gönderilen metin ve görsel materyaller, {N} haber portalımızın tamamında özgün yayın standartlarına uygun şekilde okuyuculara sunulmuştur."
    ],
    [
      "SEO ve Arama Motoru İndeksi",
      "Tüm sitelerimizde gerçekleşen yayınlar, arama motorları (Google, Yandex vb.) tarafından hızlıca indekslenecek teknik altyapıyla servis edilmiş; markanızın dijital ayak izi ve arama sonuçlarındaki varlığı güçlendirilmiştir."
    ],
    [
      "Kalıcı Yayın Garantisi",
      "İlgili içerikler, aksine bir anlaşma veya hukuki bir talep olmadığı sürece sitelerimizde kalıcı olarak arşivlenecektir."
    ]
  ],
  "outro": [
    "Yayınlanan haberlere ait aktif bağlantı (link) listesi ve performans istatistikleri raporlanarak tarafınıza sunulacaktır.",
    "Markanızın iletişim ve PR süreçlerinde ağımızı tercih ettiğiniz için teşekkür eder, başarılı çalışmalar dileriz."
  ]
};

/**
 * logogrid 2026-10-09 (user): "{N}" = live count of active news sites (GET /api/hm/public/news-sites → total,
 * il siteleri dahil; kurumsal 7/11/61 ve kapalı kirsehirhaber.org hariç).
 */
export const TANITIM_COUNT_FALLBACK = 25;

export function tanitimTextWithCount(count: number | null | undefined): TanitimText {
  const n = Number(count) > 0 ? String(Math.floor(Number(count))) : String(TANITIM_COUNT_FALLBACK);
  const f = (v: string) => v.split("{N}").join(n);
  const t = TANITIM_TEXT;
  return {
    title: t.title,
    salutation: t.salutation,
    intro: t.intro.map(f),
    advTitle: t.advTitle,
    advantages: t.advantages.map(([h, p]) => [h, f(p)] as [string, string]),
    outro: t.outro.map(f),
  };
}
