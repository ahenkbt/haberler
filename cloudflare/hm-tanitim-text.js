/**
 * "Toplu Basın Bülteni ve Tanıtım Haberi Dağıtım Beyanı" (user text 2026-10-08 23:35, verbatim).
 * Used by turkatahaber.com/daha (intro section) — the PHP news sites carry the same text on /tanitim (src/Tanitim.php).
 */
/**
 * logogrid 2026-10-09 (user): the site count is LIVE — "{N}" = every active news site incl. il siteleri
 * (GET /api/hm/public/news-sites → total; corporate 7/11/61 and suspended kirsehirhaber.org excluded there).
 */
export const TANITIM_COUNT_FALLBACK = 25;
export const TANITIM_TEXT = Object.freeze({
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
});

/** TANITIM_TEXT with "{N}" replaced by the live site count. */
export function tanitimTextWithCount(count) {
  const n = Number(count) > 0 ? String(Math.floor(Number(count))) : String(TANITIM_COUNT_FALLBACK);
  const f = (v) => String(v).split("{N}").join(n);
  const t = TANITIM_TEXT;
  return {
    title: t.title,
    salutation: t.salutation,
    intro: t.intro.map(f),
    advTitle: t.advTitle,
    advantages: t.advantages.map((a) => [a[0], f(a[1])]),
    outro: t.outro.map(f),
  };
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

const ICONS = [
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2.4"/><circle cx="5" cy="18" r="2.4"/><circle cx="19" cy="18" r="2.4"/><path d="M12 7.4v4.1m0 0-5.6 4.6M12 11.5l5.6 4.6M7.4 18h9.2"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5.5 5.5M8 11.5l2 2 3.5-4"/></svg>',
  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="5" rx="1.2"/><path d="M5 9v9.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V9M10 13h4"/></svg>',
];

export const TANITIM_STYLE = `<style>
.tn-intro{--tn-a:var(--ys-accent,#0b3362);margin:0 0 30px;padding:clamp(20px,3.6vw,40px);border-radius:22px;background:#fff;border:1px solid rgba(15,23,42,.07);box-shadow:0 22px 56px rgba(15,23,42,.1);color:#14213d}
.tn-intro .tn-eyebrow{display:inline-block;font-size:.74rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;padding:6px 12px;border-radius:999px;background:color-mix(in srgb,var(--tn-a) 10%,#fff);color:var(--tn-a)}
.tn-intro h2.tn-title{font-family:Georgia,"Times New Roman",serif;font-size:clamp(1.5rem,3.2vw,2.2rem);line-height:1.18;margin:14px 0 10px;border:0;padding:0}
.tn-intro .tn-sal{font-family:Georgia,serif;font-style:italic;color:var(--tn-a);font-size:1.08rem;margin:0 0 12px}
.tn-intro .tn-lead p{font-size:1.04rem;line-height:1.75;margin:0 0 12px;color:#253047}
.tn-intro h3.tn-h{font-family:Georgia,serif;font-size:1.3rem;margin:24px 0 14px}
.tn-intro .tn-adv{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;list-style:none;margin:0;padding:0}
.tn-intro .tn-adv li{padding:20px 18px;border-radius:16px;background:linear-gradient(180deg,color-mix(in srgb,var(--tn-a) 7%,#fff),#fff);border:1px solid color-mix(in srgb,var(--tn-a) 16%,#e5e7eb)}
.tn-intro .tn-ic{display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:13px;background:var(--tn-a);color:#fff;margin-bottom:12px}
.tn-intro .tn-ic svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.tn-intro .tn-adv h4{margin:0 0 6px;font-size:1.02rem}
.tn-intro .tn-adv p{margin:0;font-size:.94rem;line-height:1.6;color:#5b6474}
.tn-intro .tn-outro{margin-top:22px;padding:16px 20px;border-left:4px solid var(--tn-a);border-radius:0 14px 14px 0;background:color-mix(in srgb,var(--tn-a) 6%,#f8fafc)}
.tn-intro .tn-outro p{margin:0 0 8px;line-height:1.7}
.tn-intro .tn-outro p:last-child{margin:0;font-family:Georgia,serif;font-style:italic}
@media (max-width:900px){.tn-intro .tn-adv{grid-template-columns:1fr}}
</style>`;

/** Premium intro block (replaces the /daha "hakkımızda" intro; the live logo grid follows it). */
export function renderTanitimIntro({ id = "daha-hakkimizda", contactHref = "/iletisim", count = 0 } = {}) {
  const t = tanitimTextWithCount(count);
  return `${TANITIM_STYLE}<section id="${esc(id)}" class="hm-daha-about tn-intro"><span class="tn-eyebrow">Tanıtım</span><h2 class="tn-title">${esc(t.title)}</h2><p class="tn-sal">${esc(t.salutation)}</p><div class="tn-lead">${t.intro.map((p) => `<p>${esc(p)}</p>`).join("")}</div><h3 class="tn-h">${esc(t.advTitle)}</h3><ul class="tn-adv">${t.advantages.map((a, i) => `<li><span class="tn-ic">${ICONS[i] || ICONS[0]}</span><h4>${esc(a[0])}</h4><p>${esc(a[1])}</p></li>`).join("")}</ul><div class="tn-outro">${t.outro.map((p) => `<p>${esc(p)}</p>`).join("")}</div><p style="margin:18px 0 0"><a href="${esc(contactHref)}">Bize iletişim sayfamızdan ulaşabilirsiniz →</a></p></section>`;
}
