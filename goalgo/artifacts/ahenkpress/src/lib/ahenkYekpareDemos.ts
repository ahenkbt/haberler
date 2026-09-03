/** Anasayfa demoları: HM editör siteleri + yekpare.net servis sağlayıcı vitrinleri. */

export type AhenkDemoLink = {
  href: string;
  title: string;
  note: string;
};

export const YEKPARE_SERVICE_DEMOS: AhenkDemoLink[] = [
  { href: "https://yekpare.net/saglik", title: "Sağlık", note: "yekpare.net servis vitrini" },
  { href: "https://yekpare.net/hukuk", title: "Hukuk", note: "yekpare.net servis vitrini" },
  {
    href: "https://yekpare.net/alisveris/magaza/imece",
    title: "İmece mağaza",
    note: "Alışveriş / mağaza",
  },
  {
    href: "https://yekpare.net/siparis/satici/kafe-bazar",
    title: "Kafe Bazar",
    note: "Sipariş / satıcı",
  },
];

export const HM_EDITOR_DEMOS: AhenkDemoLink[] = [
  {
    href: "https://ankarasehirgazetesi.com/",
    title: "Ankara Şehir Gazetesi",
    note: "HM editör sitesi",
  },
  {
    href: "https://vatankahramanlari.org/",
    title: "Vatan Kahramanları",
    note: "HM editör sitesi",
  },
];

export const YEKPARE_HOME_FAQS: { q: string; a: string }[] = [
  {
    q: "Ahenk BT ne üretir?",
    a: "Ahenk Bilgi Teknolojileri, yekpare.net hazır web siteleri üretir. Haber siteleri HM editör altyapısıyla, sektör siteleri yekpare.net servis sağlayıcı vitrinleriyle yayına alınır.",
  },
  {
    q: "yekpare.net’te listelenmek ücretli mi?",
    a: "Hayır. yekpare.net üzerinde listelenmek ücretsizdir. Haritalar kaydı, sarı sayfalar ve onlarca özellik aynı sistemde size trafik sağlar.",
  },
  {
    q: "Siteme nasıl sipariş ve rezervasyon gelir?",
    a: "yekpare.net reklamları ve keşif ağı sitenizin trafiğini artırır. Sistemde onbinlerce işletme kaydı vardır; sipariş, satış ve rezervasyon bu ağ üzerinden alınır.",
  },
  {
    q: "Özel yazılım yaptırabilir miyim?",
    a: "Evet. Hazır yekpare.net sitelerinin dışında özel yazılımlar için bizimle iletişime geçin — WhatsApp veya iletişim formu yeterlidir.",
  },
];

export const YEKPARE_ECOSYSTEM_POINTS: { title: string; text: string }[] = [
  {
    title: "Ücretsiz liste",
    text: "yekpare.net üzerinde işletmenizin listelenmesi ücretsizdir. Vitrininiz keşif ağına düşer.",
  },
  {
    title: "Reklam ve trafik",
    text: "yekpare.net reklamları sitenizin trafiğini artırır; sipariş, satış ve rezervasyon buradan gelir.",
  },
  {
    title: "Onbinlerce işletme",
    text: "Sistemde onbinlerce işletme kaydı vardır. Aynı ağda görünürlük ve güven oluşur.",
  },
  {
    title: "Haritalar kaydı",
    text: "Yekpare haritalar kaydı ile konumunuz haritada pinlenir; yakındaki aramalarda çıkarsınız.",
  },
  {
    title: "Sarı sayfalar",
    text: "Sarı sayfalar kaydı sektör ve şehir dizininde sizi bulunur kılar.",
  },
  {
    title: "Sipariş · satış · rezervasyon",
    text: "Onlarca özellikle sipariş alın, satış yapın, randevu ve rezervasyon kabul edin.",
  },
];
