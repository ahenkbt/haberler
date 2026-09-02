import { useEffect } from "react";
import { Link, useRoute } from "wouter";
import { BILGI_AGACI_DISPLAY_NAME } from "@/lib/bilgiAgaciBrand";
import { YekpareGeoServiceIntro } from "@/components/YekpareGeoServiceIntro";
import {
  applySocialShareMeta,
  applyYekpareEntityGraph,
  resetSeoToSiteDefaults,
  type BreadcrumbItem,
} from "@/lib/pageSeo";

type BilgiPage = {
  slug: string;
  title: string;
  description: string;
  lead: string;
  sections: Array<{ heading: string; body: string }>;
  faq: Array<{ question: string; answer: string }>;
  links: Array<{ label: string; href: string }>;
  /** Tam marka entity grafiği (yalnızca yekpare-nedir). */
  fullEntityGraph?: boolean;
};

const PAGES: BilgiPage[] = [
  {
    slug: "ahenk-bilgi-teknolojileri",
    title: "Ahenk Bilgi Teknolojileri Nedir?",
    description:
      "Ahenk Bilgi Teknolojileri (ahenk.net.tr); ajans, müşteri hizmetleri, insan kaynakları ve kurumsal bilgi teknolojileri çözümleri sunan şirkettir. Resmi kurumsal sitesi ahenk.net.tr adresidir.",
    lead:
      "ahenk.net.tr, Ahenk Bilgi Teknolojileri'nin resmi kurumsal alan adıdır. Yekpare arama motoru ve Haber Merkezi yazılımı bu şirketin ürünleridir; kök sayfa şirket vitrinidir, gazete değildir.",
    sections: [
      {
        heading: "Şirket",
        body: "Ahenk Bilgi Teknolojileri Ankara merkezlidir. Ajans, müşteri hizmetleri, insan kaynakları, e-ticaret operasyonu ve kurumsal çözümler sunar. İletişim: 0541 313 62 45, ahenkbilgiteknoloji@gmail.com.",
      },
      {
        heading: "Yekpare ile ilişki",
        body: "Yekpare, Ahenk Bilgi Teknolojileri'nin geliştirdiği yerli arama motoru ve dijital hizmet platformudur. Haber Merkezi ise white-label haber sitesi yazılımıdır. Şirket adı Ahenk'tir; Yekpare ürün adıdır.",
      },
    ],
    faq: [
      {
        question: "Ahenk Bilgi Teknolojileri nedir?",
        answer:
          "Ahenk Bilgi Teknolojileri (ahenk.net.tr), Türkiye merkezli bir bilgi teknolojileri ve ajans şirketidir.",
      },
      {
        question: "ahenk.net.tr kimin sitesi?",
        answer: "ahenk.net.tr, Ahenk Bilgi Teknolojileri'nin resmi kurumsal web sitesidir.",
      },
      {
        question: "Ahenk ile Yekpare aynı şey midir?",
        answer:
          "Hayır. Ahenk Bilgi Teknolojileri şirkettir. Yekpare bu şirketin ürünüdür.",
      },
    ],
    links: [
      { label: "Kurumsal anasayfa", href: "/" },
      { label: "Hakkımızda", href: "/hakkimizda" },
      { label: "Hizmetler", href: "/hizmetler" },
      { label: "İletişim", href: "/iletisim" },
    ],
  },
  {
    slug: "yekpare-nedir",
    title: "Yekpare Nedir?",
    description:
      "Türk Ekosistemi; Türkiye'nin yerli arama motoru. Haber, YekTube, haritalar, alışveriş, turizm, Haber Merkezi, işletme web siteleri, özel domain, Yekpare AI ve Bilgi Ağacı modüllerini tek aramada keşfetmenizi sağlar.",
    lead:
      "Google'da «yekpare» sözcüğü Türkçede «bütün, tek parça» anlamına gelir; Türk Ekosistemi ise bu sözlük anlamından bağımsız bir marka ve hizmet platformudur. turk.eco, işletmelerin abonelikle yer aldığı bir firma rehberi ve pazaryeridir; site satıcı konumunda değildir. Sipariş, rezervasyon ve ödemeler doğrudan ilgili işletmeyle yapılır.",
    fullEntityGraph: true,
    sections: [
      {
        heading: "Platform modeli: firma rehberi ve pazaryeri",
        body: "Yekpare satıcı konumunda değildir. İşletmeler abonelikle listelenir; kullanıcılar sipariş, rezervasyon ve ödemeyi doğrudan ilgili işletmeyle tamamlar. TURSAB belgesi, ürün kalitesi ve hizmet ifası listelenen işletmenin sorumluluğundadır. Rezervasyon öncesi belgeleri işletmeden teyit etmeniz önerilir.",
      },
      {
        heading: "Yekpare bir web sitesi mi, uygulama mı?",
        body: "Yekpare hem web (turk.eco) hem mobil uyumlu arama motoru deneyimi sunar. Tek hesap ve tek arayüzle haber, sipariş, alışveriş, seyahat, haritalar ve bilgi modüllerine geçiş yapılır. İşletmeler servis sağlayıcı paneli üzerinden menü, mağaza veya turizm ilanı yayınlar.",
      },
      {
        heading: "Haberler ve YekTube",
        body: "Yekpare Haberler güncel manşet ve kategori akışı sunar. YekTube (turk.eco/yektube) video kanalları ve haber videoları için ayrı modüldür. Bağımsız haber siteleri Haber Merkezi altyapısıyla kendi domainlerinde de yayın yapabilir.",
      },
      {
        heading: "Keşfet, haritalar ve firma rehberi",
        body: "Keşfet modülünde restoran, kafe, mağaza ve hizmet işletmeleri harita ve arama ile listelenir. Haritalar (turk.eco/haritalar) tam ekran harita deneyimi sağlar. Firma rehberi işletme, ürün ve hizmet ilanlarını bir arada sunar.",
      },
      {
        heading: "Alışveriş ve seyahat",
        body: "Alışveriş modülü (/magaza) e-ticaret pazaryeridir. Seyahat modülü (/turizm) otel, villa, tur ve araç kiralama ilanları içerir. Restoran ve yerel işletmeler Keşfet ve Haritalar üzerinden listelenir.",
      },
      {
        heading: "Bilgi Ağacı ve Yekpare AI",
        body: `${BILGI_AGACI_DISPLAY_NAME} (/bilgiagaci) ansiklopedi ve bilgi içerikleri sunar. Yekpare AI asistanı (/ai-cagri-merkezi) ve yüzen sohbet kutusu platform hizmetlerine yönlendirme sağlar; işletmeler için AI çağrı merkezi hizmeti de sunulur.`,
      },
      {
        heading: "İşletme sayfaları, mini web sitesi ve özel domain",
        body: "Her işletme Yekpare'de kendi profil ve vitrin sayfasına sahiptir: e-ticaret mağazaları (/magaza/magaza/{slug}), Keşfet profilleri (/kesfet/{slug}) ve turizm ilanları. Servis sağlayıcı panelinden ürün, blog, galeri yönetilir; onaylı özel alan adı (custom domain) DNS kaydı ile işletme sayfasına bağlanabilir.",
      },
      {
        heading: "Haber Merkezi ve bağımsız yayın siteleri",
        body: "Haber Merkezi (turk.eco/habermerkezi) bağımsız haber sitelerinin kendi slug veya özel domainleriyle yayın yapmasını sağlar. Kurumsal vitrinler, RSS ve sitemap otomatik üretilir.",
      },
      {
        heading: "Sipariş takip, destek ve işletme panelleri",
        body: "Kullanıcılar /siparis-takip ile mağaza sipariş durumunu izler, /destek üzerinden yardım alır. İşletmeler /servis-saglayici-giris ve /turizm-paneli panellerinden operasyon yönetir.",
      },
    ],
    faq: [
      {
        question: "Yekpare satıcı mıdır?",
        answer:
          "Hayır. turk.eco işletmelerin abonelikle yer aldığı firma rehberi ve pazaryeridir. Sipariş, rezervasyon ve ödemeler doğrudan ilgili işletmeyle yapılır; Yekpare bu işlemlerde ödeme almaz ve satıcı sorumluluğu taşımaz.",
      },
      {
        question: "Yekpare nedir?",
        answer:
          "Türk Ekosistemi, Türkiye'nin yerli arama motorudur: haber, video, harita, e-ticaret alışverişi, firma rehberi ve turizm rezervasyonunu tek aramada birleştirir. Sözlükteki «yekpare» (bütün) anlamı ile marka adı farklı kavramlardır.",
      },
      {
        question: "Yekpare'de online alışveriş nasıl yapılır?",
        answer:
          "turk.eco/magaza adresinden mağaza seçin, ürünleri sepete ekleyin ve ödeme adımlarını tamamlayın. Sipariş durumunu /siparis-takip üzerinden takip edebilirsiniz.",
      },
      {
        question: "Yekpare alışveriş nedir?",
        answer:
          "Yekpare alışveriş modülü (turk.eco/magaza) çok satıcılı e-ticaret pazaryeridir. Mağaza vitrinleri, ürün kataloğu, sepet ve ödeme adımları tek platformda sunulur.",
      },
      {
        question: "Yekpare seyahat nedir?",
        answer:
          "Yekpare seyahat modülü (turk.eco/turizm) otel, villa, tur, araç kiralama ve yat turları ilanlarını listeler. İlan detayından rezervasyon veya iletişim talebi oluşturulur.",
      },
      {
        question: "Yekpare haritalar ne işe yarar?",
        answer:
          "Yekpare haritalar (turk.eco/haritalar ve turk.eco/kesfet) konum bazlı işletme keşfi, harita üzerinde arama ve tam ekran harita deneyimi sunar. Restoran ve mağaza profillerine haritadan geçiş yapılır.",
      },
      {
        question: "Yekpare ücretsiz mi?",
        answer:
          "Evet, Yekpare web ve mobil deneyimi son kullanıcılar için ücretsizdir. İşletmeler kendi panelinden hizmet sunar; ürün ve hizmet fiyatları ilgili işletmeye aittir.",
      },
      {
        question: "Yekpare hangi şehirlerde geçerli?",
        answer:
          "Platform Türkiye genelinde kullanılabilir (areaServed: Türkiye). İşletme ve ilan yoğunluğu şehir ve ilçeye göre değişir.",
      },
      {
        question: "Yekpare AI ve AI çağrı merkezi nedir?",
        answer:
          "Yekpare AI (/ai-cagri-merkezi) site genelinde yüzen sohbet kutusu ve yapay zeka asistanı sunar. İşletmeler için sesli AI çağrı merkezi hizmeti de bu modül altında tanıtılır.",
      },
      {
        question: "İşletmeler özel domain kullanabilir mi?",
        answer:
          "Evet. Onaylı işletmeler servis sağlayıcı panelinden özel alan adı (custom domain) talep edebilir; DNS doğrulaması sonrası mağaza veya işletme sayfası kendi domaininde açılır.",
      },
      {
        question: "Yekpare Haber Merkezi nedir?",
        answer:
          "Bağımsız haber sitelerinin Yekpare altyapısıyla kendi domainlerinde yayın yapabildiği white-label haber platformudur. Detay: turk.eco/bilgi/haber-merkezi-nedir",
      },
    ],
    links: [
      { label: "Alışveriş", href: "/magaza" },
      { label: "Seyahat", href: "/turizm" },
      { label: "Keşfet", href: "/kesfet" },
      { label: "Haritalar", href: "/haritalar" },
      { label: "Haberler", href: "/haberler" },
      { label: "Haber Merkezi", href: "/habermerkezi" },
      { label: "Yekpare AI", href: "/ai-cagri-merkezi" },
      { label: "Bilgi Ağacı", href: "/bilgiagaci" },
      { label: "YekTube", href: "/yektube" },
      { label: "Sipariş takip", href: "/siparis-takip" },
      { label: "Destek", href: "/destek" },
    ],
  },
  {
    slug: "online-siparis-nasil-verilir",
    title: "Yekpare'de Online Alışveriş Nasıl Yapılır?",
    description:
      "Yekpare mağaza modülünde ürün seçimi, sepet ve ödeme adımları ile online alışveriş.",
    lead: "Yekpare'de alışveriş yapmak için mağaza vitrininden ürünleri sepete ekleyin ve ödeme adımlarını tamamlayın.",
    sections: [
      {
        heading: "1. Mağaza veya ürün seçin",
        body: "turk.eco/magaza adresinden mağaza veya ürün vitrinine gidin; Keşfet ve arama ile de işletmelere ulaşabilirsiniz.",
      },
      {
        heading: "2. Sepete ürün ekleyin",
        body: "Ürün detayından adet ve varyant seçerek sepete ekleyin.",
      },
      {
        heading: "3. Ödeme ve takip",
        body: "Teslimat adresinizi doğrulayın; mağazanın desteklediği ödeme yöntemiyle siparişi tamamlayın. Sipariş numarası ile turk.eco/siparis-takip üzerinden durumu sorgulayabilirsiniz.",
      },
    ],
    faq: [
      {
        question: "Siparişimi nasıl takip ederim?",
        answer: "Sipariş onaylandıktan sonra durum bilgisi turk.eco/siparis-takip ve mağaza bildirimleri üzerinden güncellenir.",
      },
    ],
    links: [
      { label: "Mağaza", href: "/magaza" },
      { label: "Sipariş takip", href: "/siparis-takip" },
      { label: "Keşfet", href: "/kesfet" },
    ],
  },
  {
    slug: "alisveris-nedir",
    title: "Yekpare Alışveriş Nedir?",
    description:
      "Yekpare alışveriş modülü: e-ticaret pazaryeri, mağaza vitrinleri, ürün kataloğu ve online sipariş. turk.eco/magaza",
    lead: "Yekpare alışveriş (/magaza), çok satıcılı e-ticaret pazaryeridir. Kullanıcılar mağaza vitrinlerini gezer, ürünleri sepete ekler ve online ödeme ile sipariş verir.",
    sections: [
      {
        heading: "Mağaza vitrinleri",
        body: "Her satıcının kendi mağaza sayfası (turk.eco/magaza/magaza/{slug}) bulunur; ürünler, kampanyalar ve kargo bilgileri vitrinde listelenir.",
      },
      {
        heading: "Ürün arama ve kategoriler",
        body: "turk.eco/magaza/urunler ve kategori sayfalarından ürün aranır; indirimli ve öne çıkan ürünler anasayfada gösterilir.",
      },
      {
        heading: "Sepet ve ödeme",
        body: "Sepet ve ödeme adımları Yekpare alışveriş akışında tamamlanır; mesafeli satış ve ön bilgilendirme formları yasal gerekliliklere uygun sunulur.",
      },
    ],
    faq: [
      {
        question: "Yekpare alışveriş nedir?",
        answer: "turk.eco/magaza üzerinden çok satıcılı online alışveriş yapılan e-ticaret modülüdür.",
      },
      {
        question: "Mağaza nasıl açılır?",
        answer: "İşletme başvurusu veya mağaza satıcı kaydı ile servis sağlayıcı panelinden mağaza oluşturulur.",
      },
    ],
    links: [
      { label: "Alışveriş", href: "/magaza" },
      { label: "Ürünler", href: "/magaza/urunler" },
      { label: "Mağazalar", href: "/magaza/magazalar" },
    ],
  },
  {
    slug: "seyahat-nedir",
    title: "Yekpare Seyahat Nedir?",
    description:
      "Yekpare seyahat modülü: otel, villa, tur, araç kiralama ve destinasyon ilanları. Turizm rezervasyonu turk.eco/turizm",
    lead: "Yekpare seyahat (turk.eco/turizm), konaklama, tur ve ulaşım ilanlarını tek çatı altında sunar. Kullanıcılar ilan detayından rezervasyon veya iletişim talebi oluşturur.",
    sections: [
      {
        heading: "Konaklama ve villa",
        body: "Otel ve villa ilanları /turizm/konaklama ve /turizm/villa-ev rotalarında listelenir; fiyat, konum ve fotoğraflar ilan sayfasında yer alır.",
      },
      {
        heading: "Turlar ve aktiviteler",
        body: "Günübirlik ve çok günlük turlar /turizm/turlar altında; destinasyon rehberleri /turizm/destinasyonlar sayfasında sunulur.",
      },
      {
        heading: "Araç ve yat kiralama",
        body: "Rent a car ve yat turları ilgili alt kategorilerde listelenir; rezervasyon talebi işletmeye iletilir.",
      },
    ],
    faq: [
      {
        question: "Yekpare seyahat nedir?",
        answer: "turk.eco/turizm adresindeki turizm ve rezervasyon modülüdür; otel, villa, tur ve ulaşım ilanları içerir.",
      },
      {
        question: "Rezervasyon nasıl yapılır?",
        answer: "İlan detay sayfasından rezervasyon formu doldurulur; onay işletme tarafından iletişim kanallarıyla yapılır.",
      },
    ],
    links: [
      { label: "Seyahat", href: "/turizm" },
      { label: "Konaklama", href: "/turizm/konaklama" },
      { label: "Turlar", href: "/turizm/turlar" },
    ],
  },
  {
    slug: "haritalar-nedir",
    title: "Yekpare Haritalar Ne İşe Yarar?",
    description:
      "Yekpare haritalar ve Keşfet: konum bazlı işletme keşfi, interaktif harita, arama ve tam ekran harita deneyimi.",
    lead: "Yekpare haritalar modülü, kullanıcıların konumlarına göre işletmeleri harita üzerinde görmesini ve Keşfet ile detaylı profillere ulaşmasını sağlar.",
    sections: [
      {
        heading: "Keşfet haritası",
        body: "turk.eco/kesfet adresinde restoran, mağaza ve hizmet işletmeleri harita pinleri ve liste görünümüyle sunulur; kategori ve şehir filtreleri uygulanır.",
      },
      {
        heading: "Tam ekran haritalar",
        body: "turk.eco/haritalar tam ekran harita deneyimi sunar; konum arama ve işletme keşfi için genişletilmiş arayüz sağlar.",
      },
      {
        heading: "İşletme profiline geçiş",
        body: "Haritadan seçilen işletmenin adres, telefon, çalışma saatleri ve sipariş/alışveriş linkleri profil sayfasında gösterilir.",
      },
    ],
    faq: [
      {
        question: "Yekpare haritalar ne işe yarar?",
        answer: "Konum bazlı işletme keşfi, harita üzerinde arama ve yol tarifi için kullanılır; Keşfet ve Haritalar modülleri birlikte çalışır.",
      },
      {
        question: "İşletmem haritada nasıl görünür?",
        answer: "İşletme başvurusu veya servis sağlayıcı paneli üzerinden kayıt ve konum bilgisi eklenerek Keşfet'e dahil edilir.",
      },
    ],
    links: [
      { label: "Keşfet", href: "/kesfet" },
      { label: "Haritalar", href: "/haritalar" },
      { label: "İşletmeler", href: "/kesfet/liste" },
    ],
  },
  {
    slug: "bilgi-agaci-nedir",
    title: `${BILGI_AGACI_DISPLAY_NAME} Nedir?`,
    description:
      "Bilgi Ağacı ansiklopedi modülü: kaliteli maddeler, günün içeriği, konu keşfi ve Wikipedia entegrasyonu. turk.eco/bilgiagaci",
    lead: `${BILGI_AGACI_DISPLAY_NAME}, Yekpare platformundaki ansiklopedi ve bilgi portalıdır. Kullanıcılar konu arar, madde okur ve günlük öne çıkan içerikleri keşfeder.`,
    sections: [
      {
        heading: "Ansiklopedi maddeleri",
        body: "turk.eco/bilgiagaci adresinde konu bazlı maddeler listelenir; her madde SEO uyumlu detay sayfasına sahiptir.",
      },
      {
        heading: "Günlük bilgi akışı",
        body: "Anasayfada günün seçilmiş içeriği, kaliteli madde ve görsel kartları Bilgi Ağacı bandında sunulur.",
      },
      {
        heading: "Arama ve keşif",
        body: "Ansiklopedi arama kutusu ile konu bulunur; ilgili maddeler yapay zeka özetleri ve arama motorları için yapılandırılmış veri içerir.",
      },
    ],
    faq: [
      {
        question: "Bilgi Ağacı nedir?",
        answer: "turk.eco/bilgiagaci rotasındaki ansiklopedi ve bilgi modülünün kullanıcıya görünen adıdır.",
      },
      {
        question: "Bilgi Ağacı ücretsiz mi?",
        answer: "Evet, Yekpare kullanıcıları için ansiklopedi içeriklerine erişim ücretsizdir.",
      },
    ],
    links: [
      { label: "Bilgi Ağacı", href: "/bilgiagaci" },
      { label: "Ana sayfa", href: "/" },
    ],
  },
  {
    slug: "isletme-kesfet-rehberi",
    title: "Yekpare Keşfet: İşletme Bulma Rehberi",
    description:
      "Yekpare Keşfet ile harita ve arama üzerinden restoran, mağaza ve hizmet işletmelerini bulma; profil, yorum ve iletişim bilgileri.",
    lead: "Keşfet, Türkiye'deki işletmeleri harita üzerinde gösteren ve detaylı profil sayfaları sunan Yekpare modülüdür.",
    sections: [
      {
        heading: "Harita ve filtre",
        body: "Konumunuza göre yakın işletmeleri görün; kategori ve şehir filtreleriyle arama daraltın.",
      },
      {
        heading: "İşletme profili",
        body: "Her işletmede adres, telefon, çalışma saatleri, fotoğraflar ve kullanıcı yorumları yer alır.",
      },
      {
        heading: "Sipariş ve mağazaya geçiş",
        body: "Online sipariş veya alışveriş sunan işletmelerde profilden doğrudan mağaza sayfasına geçilir.",
      },
    ],
    faq: [
      {
        question: "İşletmemi Keşfet'e nasıl eklerim?",
        answer: "İşletme başvuru ve servis sağlayıcı paneli üzerinden kayıt oluşturulabilir.",
      },
      {
        question: "Keşfet URL formatı nedir?",
        answer: "turk.eco/kesfet/{isletme-slug} adresinden erişilir.",
      },
    ],
    links: [
      { label: "Keşfet", href: "/kesfet" },
      { label: "İşletme başvurusu", href: "/isletme-basvuru" },
    ],
  },
  {
    slug: "turizm-rezervasyon",
    title: "Yekpare Turizm: Rezervasyon Nasıl Yapılır?",
    description:
      "Yekpare turizm modülünde otel, villa, tur ve araç kiralama ilanlarını bulma ve online rezervasyon talebi oluşturma rehberi.",
    lead: "Turizm bölümünde konaklama, tur ve ulaşım ilanlarını filtreleyerek inceleyebilir, iletişim ve rezervasyon talebi oluşturabilirsiniz.",
    sections: [
      {
        heading: "Seyahat ana sayfası",
        body: "turk.eco/turizm adresinden otel, villa, tur, rent a car ve yat kiralama kategorilerine ulaşın.",
      },
      {
        heading: "İlan detayı",
        body: "Her ilanda fiyat, konum, açıklama ve fotoğraflar yer alır; uygun ilanda rezervasyon veya iletişim formu doldurulur.",
      },
      {
        heading: "Onay süreci",
        body: "Rezervasyon talebi ilgili işletmeye iletilir; dönüş telefon veya e-posta ile yapılır.",
      },
    ],
    faq: [
      {
        question: "Yekpare seyahat nedir?",
        answer: "turk.eco/turizm modülü; otel, villa, tur ve ulaşım rezervasyon ilanlarını kapsar.",
      },
      {
        question: "Ödeme Yekpare üzerinden mi alınır?",
        answer: "İlan türüne göre online ödeme veya işletme ile doğrudan iletişim seçenekleri sunulabilir.",
      },
    ],
    links: [
      { label: "Seyahat", href: "/turizm" },
      { label: "Keşfet", href: "/kesfet" },
    ],
  },
  {
    slug: "haber-merkezi-nedir",
    title: "Yekpare Haber Merkezi Nedir?",
    description:
      "Yekpare Haber Merkezi ile bağımsız haber siteleri, özel alan adları ve kurumsal vitrinler tek altyapıda yayınlanır.",
    lead: "Haber Merkezi; yerel ve ulusal haber sitelerinin kendi domainleriyle yayın yapabildiği, Yekpare altyapısına bağlı white-label haber platformudur.",
    sections: [
      {
        heading: "Kendi siteniz, kendi domaininiz",
        body: "Her haber sitesi özel slug veya özel alan adı (ör. siteadi.com) ile yayınlanır; içerik editör panelinden yönetilir.",
      },
      {
        heading: "Yekpare portal entegrasyonu",
        body: "Haberler turk.eco/haberler ve ilgili kategorilerde de listelenebilir; RSS ve sitemap otomatik üretilir.",
      },
      {
        heading: "Kurumsal vitrin",
        body: "Vakıf, dernek ve kurum siteleri için kurumsal tema, ansiklopedi ve özel sayfa modülleri desteklenir.",
      },
    ],
    faq: [
      {
        question: "Haber sitesi nasıl açılır?",
        answer: "Yekpare yönetim panelinden Haber Siteleri bölümünden yeni site oluşturulur ve domain yönlendirmesi yapılır.",
      },
    ],
    links: [
      { label: "Haberler", href: "/haberler" },
      { label: "Haber merkezi", href: "/habermerkezi" },
    ],
  },
  {
    slug: "ai-cagri-merkezi-nedir",
    title: "Yekpare AI ve AI Çağrı Merkezi Nedir?",
    description:
      "Yekpare AI asistanı ve AI çağrı merkezi: site rehberi sohbet kutusu, hizmet yönlendirme ve işletmeler için sesli yapay zeka desteği. turk.eco/ai-cagri-merkezi",
    lead: "Yekpare AI, kullanıcıların platformdaki yemek siparişi, alışveriş, seyahat, haritalar, haberler ve Bilgi Ağacı modüllerine hızlıca ulaşmasını sağlayan yapay zeka asistanıdır. AI Çağrı Merkezi ise işletmeler için sesli ve mesaj tabanlı destek hizmeti sunar.",
    sections: [
      {
        heading: "Yüzen Yekpare AI sohbet kutusu",
        body: "Site genelinde sol alt köşede Yekpare AI sohbet kutusu görünür; hızlı chip'ler (Yemek, Alışveriş, Seyahat, Haritalar, Haberler, Bilgi Ağacı) ile ilgili sayfaya yönlendirme ve soru yanıtlama sağlanır.",
      },
      {
        heading: "Platform bilgi tabanı",
        body: "Asistan, Yekpare modül rotalarını ve hizmet açıklamalarını bilir; kullanıcıya Türkçe yanıt verir ve doğru URL önerir.",
      },
      {
        heading: "AI çağrı merkezi (işletmeler)",
        body: "turk.eco/ai-cagri-merkezi landing sayfası işletmelere yapay zeka destekli çağrı ve mesajlaşma hizmetini tanıtır.",
      },
    ],
    faq: [
      {
        question: "Yekpare AI ücretsiz mi?",
        answer: "Evet, site ziyaretçileri için Yekpare AI sohbet kutusu ücretsizdir.",
      },
      {
        question: "AI çağrı merkezi kimler içindir?",
        answer: "Restoran, mağaza, turizm ve hizmet işletmeleri müşteri desteğini otomatikleştirmek için AI çağrı merkezi hizmetinden yararlanabilir.",
      },
    ],
    links: [
      { label: "Yekpare AI", href: "/ai-cagri-merkezi" },
      { label: "Destek", href: "/destek" },
      { label: "Yekpare nedir", href: "/bilgi/yekpare-nedir" },
    ],
  },
  {
    slug: "isletme-sayfasi-ozel-domain",
    title: "İşletme Sayfası ve Özel Domain",
    description:
      "Yekpare işletme profilleri, mini web sitesi vitrinleri ve onaylı özel alan adı (custom domain) bağlama.",
    lead: "Yekpare'de her işletme kendi dijital vitrinine sahiptir. Onaylı işletmeler servis sağlayıcı panelinden özel domain tanımlayarak sayfalarını kendi alan adlarında yayınlayabilir.",
    sections: [
      {
        heading: "İşletme sayfası türleri",
        body: "Mağaza: /magaza/magaza/{slug}; Keşfet: /kesfet/{slug}; turizm: /turizm/.../{slug}. Her sayfa SEO uyumlu vitrin sunar.",
      },
      {
        heading: "Mini web sitesi özellikleri",
        body: "Menü/ürün listesi, kampanya, blog, galeri, çalışma saatleri, harita konumu ve iletişim formu ile işletme sayfası bağımsız web sitesi gibi kullanılır.",
      },
      {
        heading: "Özel alan adı tanımlama",
        body: "Servis sağlayıcı panelinde özel domain talep edilir; DNS A/CNAME kayıtları doğrulandıktan sonra vitrin kendi domaininde açılır.",
      },
      {
        heading: "Haber Merkezi özel domain",
        body: "Haber siteleri Haber Merkezi altyapısıyla kendi domainlerinde yayın yapabilir.",
      },
    ],
    faq: [
      {
        question: "İşletmemi web sitesi gibi kullanabilir miyim?",
        answer: "Evet. Yekpare işletme sayfaları menü, ürün, blog ve iletişim modülleriyle tam işlevli vitrin sunar.",
      },
      {
        question: "Özel domain nasıl bağlanır?",
        answer: "Servis sağlayıcı paneli → Özel domain → DNS kayıtlarını talimatlara göre ekleyin → doğrulama sonrası yayına alınır.",
      },
    ],
    links: [
      { label: "İşletme başvurusu", href: "/isletme-basvuru" },
      { label: "Servis sağlayıcı girişi", href: "/servis-saglayici-giris" },
      { label: "Keşfet rehberi", href: "/bilgi/isletme-kesfet-rehberi" },
    ],
  },
  {
    slug: "yektube-nedir",
    title: "Yektube Nedir?",
    description:
      "Yektube, Yekpare içindeki video platformudur; canlı TV, kanallar ve haber video içeriklerine tek adresten erişim sağlar.",
    lead: "Yektube (turk.eco/yektube), Türkiye ve dünya kaynaklı video kanallarını ve haber videolarını izleyebileceğiniz Yekpare video modülüdür.",
    sections: [
      {
        heading: "Canlı TV ve kanallar",
        body: "Kategori bazlı kanal listesi ve tam ekran oynatıcı ile video içerikleri izlenir.",
      },
      {
        heading: "Haber videoları",
        body: "Haber detay sayfalarındaki video içerikleri Yektube oynatıcısı ile sunulabilir.",
      },
    ],
    faq: [
      {
        question: "Yektube ücretsiz mi?",
        answer: "Evet, Yekpare kullanıcıları için Yektube erişimi ücretsizdir.",
      },
    ],
    links: [
      { label: "Yektube", href: "/yektube" },
      { label: "Haberler", href: "/haberler" },
    ],
  },
];

const PAGE_MAP = new Map(PAGES.map((p) => [p.slug, p]));

function bilgiBreadcrumbs(page: BilgiPage): BreadcrumbItem[] {
  return [
    { name: "Ana sayfa", path: "/" },
    { name: "Bilgi", path: "/bilgi/yekpare-nedir" },
    { name: page.title, path: `/bilgi/${page.slug}` },
  ];
}

export default function BilgiSayfasi() {
  const [, params] = useRoute("/bilgi/:slug");
  const slug = params?.slug ?? "";
  const page = PAGE_MAP.get(slug);

  useEffect(() => {
    if (!page) return;
    const path = `/bilgi/${page.slug}`;
    const crumbs = bilgiBreadcrumbs(page);
    applySocialShareMeta({
      title: `${page.title} — Yekpare`,
      descriptionPrimary: page.description,
      canonicalPath: path,
    });
    if (page.fullEntityGraph) {
      applyYekpareEntityGraph({
        faq: page.faq,
        breadcrumbs: crumbs,
        aboutPage: {
          headline: page.title,
          description: page.description,
          canonicalPath: path,
        },
      });
    } else {
      applyYekpareEntityGraph({
        faq: page.faq,
        breadcrumbs: crumbs,
        aboutPage: {
          headline: page.title,
          description: page.description,
          canonicalPath: path,
        },
        services: [],
      });
    }
    return () => resetSeoToSiteDefaults();
  }, [page]);

  if (!page) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-800">Sayfa bulunamadı</h1>
        <Link href="/bilgi/yekpare-nedir" className="text-[#039D55] underline mt-4 inline-block font-semibold">
          Yekpare nedir?
        </Link>
      </div>
    );
  }

  return (
    <article className="max-w-3xl mx-auto px-4 py-10 text-slate-900">
      <nav className="text-sm text-slate-500 mb-6" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-[#039D55] font-semibold">Ana sayfa</Link>
        <span className="mx-2">/</span>
        <Link href="/bilgi/yekpare-nedir" className="hover:text-[#039D55] font-semibold">Bilgi</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">{page.title}</span>
      </nav>
      <header className="mb-8 rounded-[18px] border border-emerald-100 bg-[#f7fbf8] p-6">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#039D55]">Türk Ekosistemi</p>
        <h1 className="text-3xl font-black text-slate-900 mt-2 mb-4">{page.title}</h1>
        <p className="text-base text-slate-700 leading-relaxed font-semibold">{page.lead}</p>
      </header>
      {page.sections.map((sec) => (
        <section key={sec.heading} className="mb-8">
          <h2 className="text-xl font-black text-slate-900 mb-2">{sec.heading}</h2>
          <p className="text-slate-700 leading-relaxed font-medium">{sec.body}</p>
        </section>
      ))}
      {page.slug === "yekpare-nedir" ? (
        <div className="mb-8 -mx-4 sm:mx-0">
          <YekpareGeoServiceIntro compact />
        </div>
      ) : null}
      <section className="mb-8">
        <h2 className="text-xl font-black text-slate-900 mb-4">Sık sorulan sorular</h2>
        <div className="space-y-4">
          {page.faq.map((item) => (
            <div key={item.question} className="border border-emerald-50 rounded-[14px] p-4 bg-white shadow-sm">
              <h3 className="font-black text-slate-900">{item.question}</h3>
              <p className="text-slate-700 mt-2 text-sm leading-relaxed font-medium">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="text-lg font-black text-slate-900 mb-3">İlgili hizmetler</h2>
        <div className="flex flex-wrap gap-2">
          {page.links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-4 py-2 rounded-full bg-[#039D55] text-white text-sm font-black hover:bg-[#028347]"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </section>
      <aside className="mt-10 pt-6 border-t border-emerald-50 text-sm text-slate-500">
        <p className="font-semibold text-slate-700">Diğer bilgi sayfaları</p>
        <ul className="mt-2 space-y-1">
          {PAGES.filter((p) => p.slug !== page.slug).map((p) => (
            <li key={p.slug}>
              <Link href={`/bilgi/${p.slug}`} className="text-[#039D55] hover:underline font-semibold">
                {p.title}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </article>
  );
}
