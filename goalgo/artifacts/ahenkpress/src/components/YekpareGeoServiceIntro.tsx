import { Link } from "wouter";
import { BILGI_AGACI_DISPLAY_NAME } from "@/lib/bilgiAgaciBrand";

const SERVICES = [
  {
    title: "Yemek siparişi",
    href: "/yemek",
    text: "Restoran ve paket servis işletmelerinden online yemek siparişi; menü, teslimat ve /siparis-takip ile takip.",
    bilgi: "/bilgi/online-siparis-nasil-verilir",
  },
  {
    title: "Market",
    href: "/market",
    text: "Market ve gıda ürünleri siparişi; hızlı teslimat ve yakınındaki marketler.",
    bilgi: "/bilgi/online-siparis-nasil-verilir",
  },
  {
    title: "Alışveriş",
    href: "/magaza",
    text: "Çok satıcılı e-ticaret pazaryeri; mağaza vitrinleri, sepet ve online ödeme.",
    bilgi: "/bilgi/alisveris-nedir",
  },
  {
    title: "Seyahat",
    href: "/turizm",
    text: "Otel, villa, tur ve araç kiralama ilanları; rezervasyon talebi oluşturma.",
    bilgi: "/bilgi/seyahat-nedir",
  },
  {
    title: "Ulaşım",
    href: "/ulasim",
    text: "Kurye, taksi, ortak yolculuk, çekici, nakliyat ve kargo talepleri.",
    bilgi: "/bilgi/ulasim-kurye-taksi-cekici",
  },
  {
    title: "Keşfet ve haritalar",
    href: "/kesfet",
    text: "Harita üzerinden işletme keşfi; tam ekran haritalar ve işletme profilleri.",
    bilgi: "/bilgi/haritalar-nedir",
  },
  {
    title: "Haberler",
    href: "/haberler",
    text: "Güncel haber akışı, kategoriler ve manşet özeti.",
    bilgi: "/bilgi/haber-merkezi-nedir",
  },
  {
    title: "Haber Merkezi",
    href: "/habermerkezi",
    text: "Bağımsız haber siteleri; özel domain ile white-label yayın altyapısı.",
    bilgi: "/bilgi/haber-merkezi-nedir",
  },
  {
    title: "Yekpare AI",
    href: "/ai-cagri-merkezi",
    text: "Yapay zeka asistanı ve işletmeler için AI çağrı merkezi hizmeti.",
    bilgi: "/bilgi/ai-cagri-merkezi-nedir",
  },
  {
    title: "İşletme sayfası",
    href: "/isletme-basvuru",
    text: "Mini web sitesi vitrini, menü/ürün yönetimi ve özel domain bağlama.",
    bilgi: "/bilgi/isletme-sayfasi-ozel-domain",
  },
  {
    title: BILGI_AGACI_DISPLAY_NAME,
    href: "/bilgiagaci",
    text: "Ansiklopedi ve bilgi ağacı; kaliteli maddeler ve günün içeriği.",
    bilgi: "/bilgi/bilgi-agaci-nedir",
  },
  {
    title: "YekTube",
    href: "/yektube",
    text: "Video kanalları, canlı TV ve haber videoları.",
    bilgi: "/bilgi/yektube-nedir",
  },
] as const;

const FAQ = [
  {
    q: "Yekpare nedir?",
    a: "Yekpare (yekpare.net), Türkiye'nin yerli arama motorudur — haber, video, harita, yemek ve market siparişi, alışveriş, firma rehberi ve turizm rezervasyonunu tek aramada birleştirir. Sözlük anlamı «yekpare» (bütün, tek parça) ile marka adı farklıdır.",
  },
  {
    q: "Yekpare ile yemek siparişi nasıl verilir?",
    a: "yekpare.net/yemek veya /siparis adresinden işletme seçin, menüden ürünleri sepete ekleyin ve teslimat adresinizle siparişi tamamlayın.",
  },
  {
    q: "Yekpare alışveriş nedir?",
    a: "Yekpare alışveriş modülü (/magaza) çok satıcılı e-ticaret pazaryeridir; mağaza vitrinleri, ürün kataloğu ve online ödeme sunar.",
  },
] as const;

/** Bilgi sayfalarında (ör. /bilgi/yekpare-nedir) hizmet kartları — Yekpare Sade tema. */
export function YekpareGeoServiceIntro({ compact = false }: { compact?: boolean }) {
  return (
    <section
      className="sixam-section mx-auto w-full max-w-[1440px] px-4"
      aria-labelledby="yekpare-geo-intro-heading"
    >
      <div className="rounded-[18px] border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#039D55]">Yekpare nedir?</p>
            <h2 id="yekpare-geo-intro-heading" className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">
              Türkiye&apos;nin yerli arama motoru: haber, sipariş, alışveriş, seyahat ve daha fazlası
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
              <strong className="font-black text-slate-800">Yekpare.net</strong> bir haber sitesi veya sözlük girişi değildir;
              kullanıcıların yemek siparişi, online alışveriş, turizm rezervasyonu, harita keşfi, haber okuma, YekTube video
              ve {BILGI_AGACI_DISPLAY_NAME} içeriklerine tek adresten ulaştığı hizmet platformudur.
            </p>
          </div>
          <Link
            href="/bilgi/yekpare-nedir"
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#039D55] px-5 py-2.5 text-sm font-black text-white hover:bg-[#028347]"
          >
            Yekpare nedir? →
          </Link>
        </div>

        <div className={`mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`}>
          {SERVICES.map((item) => (
            <article
              key={item.href}
              className="rounded-[14px] border border-slate-100 bg-[#f7fbf8] p-4"
            >
              <h3 className="text-sm font-black text-slate-900">
                <Link href={item.href} className="hover:text-[#039D55]">
                  {item.title}
                </Link>
              </h3>
              <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-600">{item.text}</p>
              <Link href={item.bilgi} className="mt-2 inline-block text-xs font-black text-[#039D55] hover:underline">
                Detaylı bilgi
              </Link>
            </article>
          ))}
        </div>

        {!compact ? (
          <div className="mt-5 border-t border-emerald-50 pt-5">
            <h3 className="text-sm font-black text-slate-900">Sık sorulan sorular</h3>
            <dl className="mt-3 space-y-3">
              {FAQ.map((item) => (
                <div key={item.q} className="rounded-[12px] bg-slate-50 px-4 py-3">
                  <dt className="text-sm font-black text-slate-900">{item.q}</dt>
                  <dd className="mt-1 text-xs font-semibold leading-5 text-slate-600">{item.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </div>
    </section>
  );
}
