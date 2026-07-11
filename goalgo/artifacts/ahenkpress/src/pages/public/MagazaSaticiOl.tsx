import { Link } from "wouter";
import { ArrowRight, BarChart3, CheckCircle2, ClipboardList, Headphones, PackageCheck, ShieldCheck, Store, Truck } from "lucide-react";

const steps = [
  { title: "Başvurunu gönder", text: "İş ortağı başvuru formunda alışveriş mağazanı ve iletişim bilgilerini paylaş." },
  { title: "Mağaza panelin açılsın", text: "Yekpare ekibi başvurunu onayladıktan sonra servis sağlayıcı paneline erişim tanımlar." },
  { title: "Ürünlerini yayınla", text: "Kategori, ürün, kampanya ve blog alanlarıyla mağazanı yayına al." },
];

const features = [
  { icon: Store, title: "Profesyonel mağaza vitrini", text: "Mağaza ana sayfası, ürün listesi, blog ve iletişim alanları tek panelden yönetilir." },
  { icon: PackageCheck, title: "Ürün kataloğu", text: "Stok, indirimli fiyat, kategori ve görsel alanları marketplace içinde görünür." },
  { icon: Truck, title: "Sipariş ve teslimat", text: "Mevcut Yekpare sipariş takip ve sağlayıcı paneli akışlarına bağlanır." },
  { icon: BarChart3, title: "Büyüme araçları", text: "Kampanya, öne çıkarma ve raporlama alanlarıyla mağaza performansını artır." },
];

export default function MagazaSaticiOl() {
  return (
    <div className="min-h-screen bg-white text-slate-950">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(16,185,129,0.35),transparent_30%),radial-gradient(circle_at_12%_25%,rgba(250,204,21,0.22),transparent_28%)]" />
        <div className="relative mx-auto grid max-w-[1440px] gap-10 px-4 py-16 lg:grid-cols-[1fr_0.88fr] lg:items-center lg:py-24">
          <div>
            <Link href="/magaza" className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black text-emerald-100 hover:bg-white/15">
              <Store className="h-4 w-4" />
              Yekpare Pazaryeri
            </Link>
            <h1 className="max-w-4xl text-4xl font-black leading-[1.04] tracking-tight md:text-6xl">
              Ürünlerini Yekpare pazaryerinde satmaya başla
            </h1>
            <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-slate-300 md:text-lg">
              Bu sayfa, Yekpare'nin mevcut iş ortağı başvurusu ve servis sağlayıcı paneline bağlanır. Yeni ve kopuk bir backend yerine canlı başvuru süreci kullanılır.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/is-ortagi/basvuru?tur=alisveris" className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-6 py-3 text-sm font-black text-white hover:bg-emerald-800">
                Başvuruya devam et
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/servis-saglayici-giris" className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-6 py-3 text-sm font-black text-white hover:bg-white/15">
                Panel girişini aç
              </Link>
            </div>
            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              {["Komisyonsuz vitrin seçenekleri", "Yerel mağaza görünürlüğü", "Panelden hızlı yönetim"].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/10 p-3 text-sm font-bold text-slate-100">
                  <CheckCircle2 className="mb-2 h-5 w-5 text-emerald-300" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white p-5 text-slate-950 shadow-2xl">
            <div className="rounded-[1.5rem] bg-[#f3fbf7] p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Satıcı başvuru özeti</p>
              <h2 className="mt-2 text-2xl font-black">Mağazanı yayına alma kontrol listesi</h2>
              <div className="mt-5 space-y-3">
                {[
                  "Firma ve yetkili bilgileri",
                  "Mağaza adı, kategori ve şehir",
                  "Ürün kataloğu ve görseller",
                  "Teslimat / ödeme tercihleri",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl bg-white p-3 text-sm font-black shadow-sm">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-4 w-4" /></span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1440px] space-y-7 px-4 pb-10 pt-3 md:space-y-8 md:pt-4 md:pb-12">
        <section className="grid gap-4 md:grid-cols-4">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm">
              <feature.icon className="mb-4 h-8 w-8 text-emerald-600" />
              <h2 className="text-lg font-black">{feature.title}</h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">{feature.text}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm lg:grid-cols-[0.8fr_1.2fr] lg:p-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Nasıl çalışır?</p>
            <h2 className="mt-2 text-3xl font-black">Tek başvuru, tam mağaza altyapısı</h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">
              Yekpare'de alışveriş sağlayıcıları ürün vitrinini, mağaza temasını, blog içeriklerini ve sipariş operasyonunu aynı servis sağlayıcı panelinden yönetir.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {steps.map((step, index) => (
              <article key={step.title} className="rounded-[1.5rem] bg-slate-50 p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">{index + 1}</span>
                <h3 className="mt-4 font-black">{step.title}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-[1.75rem] border border-slate-100 bg-white p-6 shadow-sm">
            <ShieldCheck className="mb-4 h-8 w-8 text-emerald-600" />
            <h2 className="text-xl font-black">Güvenli onay süreci</h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">Başvurular mevcut iş ortağı akışında değerlendirilir, mağaza yetkileri onay sonrası açılır.</p>
          </div>
          <div className="rounded-[1.75rem] border border-slate-100 bg-white p-6 shadow-sm">
            <ClipboardList className="mb-4 h-8 w-8 text-emerald-600" />
            <h2 className="text-xl font-black">Panel sayfaları hazır</h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">Ürünler, kampanyalar, temalar, blog ve destek modülleri servis sağlayıcı panelinde konumlanır.</p>
          </div>
          <div className="rounded-[1.75rem] border border-slate-100 bg-white p-6 shadow-sm">
            <Headphones className="mb-4 h-8 w-8 text-emerald-600" />
            <h2 className="text-xl font-black">Yekpare desteği</h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">Başvuru, yayın ve mağaza kurulum adımlarında platform destek akışları kullanılabilir.</p>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] bg-emerald-950 text-white shadow-xl">
          <div className="grid gap-6 p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">Hazır mısın?</p>
              <h2 className="mt-2 text-3xl font-black">Yekpare alışveriş sağlayıcısı ol</h2>
              <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-emerald-50/80">Başvurunu mevcut iş ortağı formuyla gönder, onay sonrası marketplace sayfalarında ürünlerin görünmeye başlasın.</p>
            </div>
            <Link href="/is-ortagi/basvuru?tur=alisveris" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black text-emerald-950 hover:bg-emerald-50">
              Hemen başvur
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
