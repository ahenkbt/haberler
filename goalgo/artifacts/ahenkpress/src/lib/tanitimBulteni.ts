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
    "Bünyemizde faaliyet gösteren 25 farklı haber ve yayın portalımız üzerinden yürütülen tanıtım haberi, basın bülteni ve dijital PR çalışmalarında, içeriğinizin dijital görünürlüğünü en üst seviyeye çıkarmak adına senkronize bir yayın süreci uygulanmaktadır.",
    "Tarafımıza iletilen ve yayın onayından geçen tanıtım haberiniz, dijital yayın ağımızda yer alan 25 haber sitemizin tamamında eksiksiz ve eş zamanlı olarak yayınlanmıştır."
  ],
  "advTitle": "Yayın Süreci ve Sağlanan Avantajlar",
  "advantages": [
    [
      "Eksiksiz Ağ Kapsamı",
      "Gönderilen metin ve görsel materyaller, 25 haber portalımızın tamamında özgün yayın standartlarına uygun şekilde okuyuculara sunulmuştur."
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
