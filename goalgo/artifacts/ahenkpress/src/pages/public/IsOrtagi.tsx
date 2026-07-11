import { useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  Globe2,
  Map,
  MessageCircle,
  Newspaper,
  Package,
  Plane,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Utensils,
  Users,
} from "lucide-react";
import { applyFaqStructuredData, applySocialShareMeta, resetSeoToSiteDefaults } from "@/lib/pageSeo";
import {
  SADE_EDITORIAL_EYEBROW_CLASS,
  SADE_EDITORIAL_HERO_SECTION_CLASS,
  SADE_HERO_GLOW_CLASS,
} from "@/lib/yekpareSadeTheme";

const FEATURES = [
  {
    icon: <Globe2 className="h-5 w-5" />,
    title: "Web Sitesi ve Domain",
    desc: "İşletmenize özel web sitesi, mağaza vitrini, özel domain bağlama ve SEO uyumlu sayfa yapısı.",
  },
  {
    icon: <Utensils className="h-5 w-5" />,
    title: "Sipariş ve Paket Servis",
    desc: "Restoran, kafe ve yerel işletmeler için menü, sepet, sipariş, kurye ve servis personeli yönetimi.",
  },
  {
    icon: <ShoppingBag className="h-5 w-5" />,
    title: "Ürün Satışı",
    desc: "Alışveriş mağazaları için ürün kataloğu, kategori, stok, sepet, ödeme ve kargo entegrasyonu.",
  },
  {
    icon: <Plane className="h-5 w-5" />,
    title: "Rezervasyon",
    desc: "Turizm, otel, villa, tur, yat, araç kiralama ve hizmet işletmeleri için rezervasyon altyapısı.",
  },
  {
    icon: <Truck className="h-5 w-5" />,
    title: "Ulaşım ve Kurye",
    desc: "Ulaşım sayfası, kurye, taksi, çekici, servis, kargo ve saha operasyonu için talep toplama.",
  },
  {
    icon: <Map className="h-5 w-5" />,
    title: "Keşfet ve Firma Rehberi",
    desc: "Keşfet navigasyonu, harita görünürlüğü ve yakında eklenecek firma rehberi web sitesi altyapısı.",
  },
  {
    icon: <Newspaper className="h-5 w-5" />,
    title: "Haber Merkezi",
    desc: "Yerel haber sitesi, kurumsal yayın, içerik aktarımı ve otomatik haber vitrini isteyen işletmeler için altyapı.",
  },
  {
    icon: <Bot className="h-5 w-5" />,
    title: "SEO ve GEO Dostu",
    desc: "Google SEO, yapay zeka aramaları, ChatGPT/Perplexity/AI Overview için açıklayıcı içerik ve yapılandırılmış sayfa mantığı.",
  },
];

const MODULES = [
  {
    title: "Alışveriş Mağazaları",
    href: "/alisveris",
    desc: "Online mağaza aç, ürünlerini yayınla, sepet ve kargo akışıyla satış yap.",
    items: ["Ürün ve kategori yönetimi", "Sepet ve ödeme altyapısı", "Kargo/kurye ve domain desteği"],
  },
  {
    title: "Sipariş Mağazaları",
    href: "/siparis",
    desc: "Restoran, kafe, market ve yerel işletmeler için sipariş ve teslimat paneli.",
    items: ["Menü ve seçenek yönetimi", "Sipariş, kurye, servis personeli", "WhatsApp ve telefonla hızlı iletişim"],
  },
  {
    title: "Turizm Mağazaları",
    href: "/turizm",
    desc: "Otel, villa, tur, yat ve araç kiralama için rezervasyon ve vitrin sayfası.",
    items: ["Rezervasyon talebi", "Tema destekli turizm vitrini", "Harita ve özel domain"],
  },
  {
    title: "Ulaşım Mağazaları",
    href: "/ulasim",
    desc: "Taksi, transfer, kurye, çekici ve lojistik işletmeleri için dijital görünürlük.",
    items: ["Ulaşım sayfasında görünürlük", "Talep toplama", "Firma ve servis tanıtımı"],
  },
  {
    title: "Haber Merkezi",
    href: "/habermerkezi",
    desc: "Yerel medya ve kurumsal yayın için haber sitesi, içerik akışı ve SEO altyapısı.",
    items: ["Haber sitesi vitrini", "İçerik ve kategori yapısı", "Yapay zeka dostu yayın sayfaları"],
  },
  {
    title: "Firma Rehberi",
    href: "/kesfet",
    desc: "Firma rehberine eklenen işletmelere de özel web sitesi ve domain bağlama desteği verilecek.",
    items: ["Rehber profili", "Özel web sitesi", "Domain bağlama"],
  },
];

const SEO_KEYWORDS = [
  "günde 10 TL'ye web sitesi",
  "şirket sitesi kurulumu",
  "kurumsal site kurulumu",
  "işletme web sitesi",
  "online sipariş sistemi",
  "rezervasyon sistemi",
  "e-ticaret mağazası açma",
  "firma rehberi web sitesi",
  "domain bağlama",
  "Google SEO ve yapay zeka GEO",
];

const FAQ = [
  {
    question: "Yekpare İşletme Üyelik ücreti nedir?",
    answer: "Tek paket işletme üyeliği kampanya döneminde günlük 10 TL, yıllık 3650 TL olarak sunulur. Daha kapsamlı özel ihtiyaçlar için iletişim sayfasından bilgi alınabilir.",
  },
  {
    question: "Günde 10 TL ile web sitesi kurulumu yapılır mı?",
    answer: "Yekpare işletmelere mağaza vitrini, web sitesi altyapısı, ürün/sipariş/rezervasyon modülleri ve özel domain bağlama imkanı sunar.",
  },
  {
    question: "Hangi işletmeler Yekpare'de mağaza açabilir?",
    answer: "Restoran, kafe, alışveriş mağazası, turizm işletmesi, ulaşım firması, kurye/servis işletmesi, haber sitesi ve firma rehberi işletmeleri başvuru yapabilir.",
  },
  {
    question: "Başvuru nereden yapılır?",
    answer: "İşletme üyeliği başvurusu yekpare.net/is-ortagi/basvuru adresinden yapılır.",
  },
];

export default function IsOrtagi() {
  useEffect(() => {
    applySocialShareMeta({
      title: "Günde 10 TL'ye Web Sitesi, Sipariş, Rezervasyon ve Online Mağaza — Yekpare İş Ortağı",
      descriptionPrimary:
        "Yekpare ile işletmenize günde 10 TL'ye, yıllık 3650 TL'ye web sitesi, online sipariş, ürün satışı, rezervasyon, kargo/kurye, firma rehberi ve özel domain bağlama altyapısı kurun. Google SEO ve yapay zeka GEO dostu işletme sayfaları.",
      canonicalPath: "/is-ortagi",
    });
    applyFaqStructuredData(FAQ);
    return () => resetSeoToSiteDefaults();
  }, []);

  return (
    <main className="min-h-screen bg-[#f4fbf7] text-slate-950">
      <section className={`${SADE_EDITORIAL_HERO_SECTION_CLASS}`}>
        <div className={SADE_HERO_GLOW_CLASS} />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className={`mb-5 ${SADE_EDITORIAL_EYEBROW_CLASS}`}>
              <ShieldCheck className="mr-2 inline h-4 w-4" />
              Tek işletme paketi: Günde 10 TL
            </div>
            <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-6xl">
              Günde 10 TL&apos;ye işletmenize web sitesi, sipariş, rezervasyon ve online satış altyapısı kurun.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
              Yekpare; şirket sitesi kurulumu, kurumsal site kurulumu, mağaza açma, firma rehberi,
              online sipariş, ürün satışı, turizm rezervasyonu, ulaşım talebi, kargo/kurye yönetimi
              ve özel domain bağlama özelliklerini tek panelde toplar.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/is-ortagi/basvuru"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-7 py-4 text-base font-black text-slate-950 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400"
              >
                İşletme Üyelik Başvurusu <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/iletisim"
                className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-white px-7 py-4 text-base font-black text-[#0f766e] transition hover:bg-emerald-50"
              >
                Daha fazlası için iletişim
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
              {SEO_KEYWORDS.map((keyword) => (
                <span key={keyword} className="rounded-full border border-emerald-100 bg-white px-3 py-1">
                  {keyword}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-emerald-100 bg-white p-5 shadow-xl">
            <div className="rounded-[1.5rem] bg-[#f8fcf9] p-6 text-slate-950">
              <div className="text-sm font-black uppercase tracking-wide text-emerald-600">Yekpare İşletme Üyelik</div>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-6xl font-black">10 TL</span>
                <span className="pb-2 text-lg font-bold text-slate-500">/ gün</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Yıllık 3650 TL. Tüm işletme paketleri tek pakette. Sipariş, rezervasyon, ürün satış, kargo, kurye,
                servis personeli, domain, keşfet navigasyon ve firma rehberi altyapısı.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  "Web sitesi ve özel domain bağlama",
                  "Sipariş, sepet, ödeme ve ürün satışı",
                  "Rezervasyon, turizm vitrini ve ulaşım sayfası",
                  "Kargo/kurye, servis personeli ve operasyon yönetimi",
                  "Google SEO + yapay zeka GEO dostu içerik yapısı",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm font-semibold text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                    {item}
                  </div>
                ))}
              </div>
              <Link
                href="/is-ortagi/basvuru"
                className="mt-7 block rounded-2xl bg-[#0f766e] px-5 py-4 text-center text-sm font-black text-white transition hover:bg-[#0b5f59]"
              >
                Başvuru formuna git
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="nasil-calisir" className="bg-white px-4 py-16 text-slate-950">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <div className="text-sm font-black uppercase tracking-wide text-emerald-600">Neler sunuyoruz?</div>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Mağaza açan işletmeye sadece listeleme değil, satış yapan dijital işletme altyapısı veriyoruz.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Yekpare&apos;de işletmenizin Keşfet sayfası, mağaza vitrini, ürünleri, menüleri, rezervasyonları,
              kargo/kurye akışı, personel yönetimi ve özel domainli web sitesi tek ekosistemde çalışır.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                  {feature.icon}
                </div>
                <h3 className="text-base font-black text-slate-950">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{feature.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-16 text-slate-950">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <div className="text-sm font-black uppercase tracking-wide text-blue-600">Modüller</div>
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">Her sektör için mağaza ve web sitesi</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600">
              Alışveriş, sipariş, turizm, ulaşım, haber merkezi ve firma rehberi özellikleri aynı işletme üyeliğiyle tanıtılır.
            </p>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {MODULES.map((module) => (
              <Link
                key={module.title}
                href={module.href}
                className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-950">{module.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{module.desc}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:text-emerald-600" />
                </div>
                <ul className="mt-5 space-y-2">
                  {module.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 text-slate-950">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <div className="text-sm font-black uppercase tracking-wide text-violet-600">SEO + GEO</div>
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">
              Google&apos;da ve yapay zeka cevaplarında bulunabilir işletme sitesi.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              İşletmenizi yalnızca bir ilan olarak değil; açıklamaları, hizmetleri, fiyatlandırma dili,
              kategori yapısı, adres ve iletişim bilgileriyle arama motorlarının ve yapay zeka sistemlerinin
              anlayabileceği bir kurumsal web sitesi gibi konumlandırırız.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: <Search className="h-5 w-5" />, title: "Google SEO", text: "Şirket sitesi kurulumu, işletme web sitesi ve yerel hizmet aramalarına uygun içerik." },
              { icon: <Bot className="h-5 w-5" />, title: "Yapay Zeka GEO", text: "ChatGPT, Perplexity ve AI Overview gibi sistemlere açıklayıcı işletme bağlamı." },
              { icon: <Building2 className="h-5 w-5" />, title: "Kurumsal Site", text: "Hakkımızda, ürünler, hizmetler, iletişim, keşfet ve mağaza bağlantıları." },
              { icon: <MessageCircle className="h-5 w-5" />, title: "Dönüşüm", text: "WhatsApp, telefon, sipariş, rezervasyon ve başvuru CTA akışları." },
            ].map((item) => (
              <div key={item.title} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                  {item.icon}
                </div>
                <h3 className="font-black">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-emerald-600 px-4 py-14 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="text-sm font-black uppercase tracking-wide text-emerald-100">Tek paket</div>
            <h2 className="mt-2 text-3xl font-black">Tüm işletme paketleri: günde 10 TL, yıllık 3650 TL</h2>
            <p className="mt-3 text-sm leading-7 text-emerald-50">
              Online satış, sipariş, rezervasyon, ürün kataloğu, kargo/kurye, servis personeli,
              Keşfet navigasyonu, firma rehberi, haber merkezi ve domain bağlama özellikleri tek işletme üyeliğinde anlatılır.
              Daha kapsamlı özel entegrasyon, özel geliştirme veya kurumsal ihtiyaçlar için iletişim sayfasına yönlendirme yapılır.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/is-ortagi/basvuru"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-black text-emerald-700 transition hover:bg-emerald-50"
            >
              İşletme Üyelik Başvurusu <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/iletisim"
              className="inline-flex items-center justify-center rounded-2xl border border-white/30 px-6 py-4 text-sm font-black text-white transition hover:bg-white/10"
            >
              Daha fazlası için iletişim
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-emerald-100 bg-white px-4 py-16 text-slate-950">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              { icon: <Users className="h-5 w-5" />, value: "Tek panel", label: "Mağaza, sipariş, rezervasyon ve firma profili" },
              { icon: <Package className="h-5 w-5" />, value: "10 TL/gün", label: "Yıllık 3650 TL işletme üyelik modeli" },
              { icon: <Globe2 className="h-5 w-5" />, value: "Domain", label: "İşletmeye özel alan adı bağlama imkanı" },
            ].map((stat) => (
              <div key={stat.value} className="rounded-3xl border border-emerald-100 bg-[#f4fbf7] p-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#0f766e] shadow-sm">
                  {stat.icon}
                </div>
                <div className="text-2xl font-black text-slate-950">{stat.value}</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{stat.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 rounded-[2rem] border border-emerald-100 bg-[#f4fbf7] p-8 text-center">
            <h2 className="text-3xl font-black text-slate-950">İşletmenizi Yekpare&apos;de açın.</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Günde 10 TL&apos;ye, yıllık 3650 TL&apos;ye web sitesi, sipariş alma, rezervasyon alma, ürün satışı,
              kargo/kurye ekleme, servis personeli ekleme, domain bağlama ve firma rehberi görünürlüğü için başvuru yapın.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/is-ortagi/basvuru"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-8 py-4 text-base font-black text-slate-950 transition hover:bg-emerald-400"
              >
                Başvuruya Başla <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/iletisim"
                className="inline-flex items-center justify-center rounded-2xl border border-white/15 px-8 py-4 text-base font-black text-white transition hover:bg-white/10"
              >
                İletişime Geç
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
