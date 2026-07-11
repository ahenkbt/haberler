import { useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  Bot,
  Building2,
  Check,
  Globe2,
  Headphones,
  Mail,
  Newspaper,
  Package,
  Plane,
  ShoppingBag,
  Sparkles,
  Truck,
  Utensils,
  Users,
} from "lucide-react";
import { ServiceMarketingCta } from "@/components/services/ServiceMarketingCta";
import { ServicesMarketingChrome } from "@/components/services/ServicesMarketingChrome";
import {
  SERVICES_MARKETING_BASE,
  SERVICES_MARKETING_MODULES,
  SERVICES_MARKETING_ORDER,
  SERVICES_PLATFORM_BENEFITS,
} from "@/lib/servicesMarketingData";
import { applySocialShareMeta, resetSeoToSiteDefaults } from "@/lib/pageSeo";
import {
  SADE_PUBLIC_HERO_CONTENT_CLASS,
  SADE_HERO_EYEBROW_CLASS,
  SADE_HERO_GLOW_CLASS,
  SADE_HERO_SHELL_CLASS,
  SADE_PUBLIC_POST_HERO_BODY_CLASS,
} from "@/lib/yekpareSadeTheme";
import { YEKPARE_PAGE_CONTAINER_CLASS } from "@/lib/yekpareLayout";

const MODULE_ICONS = {
  siparis: Utensils,
  alisveris: ShoppingBag,
  ulasim: Truck,
  turizm: Plane,
  "haber-merkezi": Newspaper,
  "ai-cagri-merkezi": Bot,
} as const;

const OVERVIEW_STATS = [
  { value: "6", label: "Entegre modül", desc: "Siparişten AI desteğine tek platform" },
  { value: "7/24", label: "Operasyon", desc: "Panel, vitrin ve bildirim katmanı" },
  { value: "1", label: "Hesap", desc: "Çoklu servis ve panel yönetimi" },
] as const;

export default function ServicesMarketingOverview() {
  useEffect(() => {
    applySocialShareMeta({
      title: "Yekpare Servisler — Platform hizmetleri ve imkanlar",
      descriptionPrimary:
        "Sipariş, alışveriş, ulaşım, turizm, haber merkezi ve AI çağrı merkezi. Servis sağlayıcı panelleri, CRM, POS ve operasyonel özellikler tek platformda.",
      canonicalPath: SERVICES_MARKETING_BASE,
    });
    return () => resetSeoToSiteDefaults();
  }, []);

  return (
    <ServicesMarketingChrome>
      <div className="sade-public-page flex min-w-0 flex-1 flex-col text-slate-900">
        <section className={`sade-public-hero ${SADE_HERO_SHELL_CLASS}`}>
          <div className={SADE_HERO_GLOW_CLASS} />
          <div className={`${SADE_PUBLIC_HERO_CONTENT_CLASS} py-12 md:py-16`}>
            <p className={SADE_HERO_EYEBROW_CLASS}>Yekpare platform</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
              İşletmeniz için profesyonel dijital servis ekosistemi
            </h1>
            <p className="mt-4 max-w-2xl text-base font-semibold leading-relaxed text-slate-600 sm:text-lg">
              Siparişten haber yayınına, ulaşımdan yapay zekâ destekli müşteri hizmetlerine kadar tüm modüller tek çatı
              altında. Her servis için ayrıntılı tanıtım, sağlayıcı paneli ve canlı vitrin bağlantıları bu sayfada.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ServiceMarketingCta href="/is-ortagi" label="İş ortağı olun" variant="primary">
                <Sparkles className="h-4 w-4" />
                İş ortağı olun
              </ServiceMarketingCta>
              <ServiceMarketingCta href="/servis-saglayici-giris" label="Panel girişi" variant="secondary">
                <Building2 className="h-4 w-4" />
                Panel girişi
              </ServiceMarketingCta>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {OVERVIEW_STATS.map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-emerald-100/80 bg-white/70 px-5 py-4 backdrop-blur-sm"
                >
                  <p className="text-2xl font-black text-[#0f766e]">{s.value}</p>
                  <p className="mt-1 text-sm font-black text-slate-950">{s.label}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className={`${SADE_PUBLIC_POST_HERO_BODY_CLASS} ${YEKPARE_PAGE_CONTAINER_CLASS} pb-16`}>
          <section className="py-10">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Altı güçlü modül</h2>
                <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-500">
                  Her servis için özellik listesi, panel yetenekleri, kullanım senaryoları ve doğrudan erişim
                  bağlantıları.
                </p>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {SERVICES_MARKETING_ORDER.map((slug) => {
                const mod = SERVICES_MARKETING_MODULES[slug];
                const Icon = MODULE_ICONS[slug];
                return (
                  <Link
                    key={slug}
                    href={`${SERVICES_MARKETING_BASE}/${slug}`}
                    className="group relative flex flex-col overflow-hidden rounded-[1.75rem] border border-emerald-100 bg-white p-6 shadow-sm transition hover:border-[#039D55] hover:shadow-md"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#0f766e] transition group-hover:bg-[#0f766e] group-hover:text-white">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-black text-slate-950 group-hover:text-[#039D55]">{mod.title}</h3>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{mod.tagline}</p>
                    <ul className="mt-4 flex-1 space-y-1.5">
                      {mod.highlights.slice(0, 4).map((h) => (
                        <li key={h} className="flex items-start gap-2 text-xs font-bold text-slate-600">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#039D55]" />
                          {h}
                        </li>
                      ))}
                    </ul>
                    <span className="mt-5 inline-flex items-center gap-1 text-sm font-black text-[#0f766e]">
                      Detaylı tanıtım
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-8 md:p-10">
            <div className="mb-8 max-w-2xl">
              <p className={SADE_HERO_EYEBROW_CLASS}>Platform avantajları</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                Tüm servislerde ortak altyapı
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                Domain, e-posta, CRM, POS ve personel yönetimi modüller arasında tutarlı çalışır; tek Yekpare hesabıyla
                birden fazla servisi aynı anda yönetebilirsiniz.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SERVICES_PLATFORM_BENEFITS.map((b) => (
                <div
                  key={b.title}
                  className="rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm backdrop-blur-sm"
                >
                  <h3 className="text-sm font-black text-slate-950">{b.title}</h3>
                  <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{b.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="py-12">
            <div className="mb-8">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">Paneller ve yönetim</h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                Servis sağlayıcı, satıcı ve editör panelleri işletmenizin ihtiyacına göre özelleştirilmiştir. Giriş
                adresleri servis detay sayfalarında listelenir.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {[
                {
                  icon: Building2,
                  title: "Servis sağlayıcı paneli",
                  href: "/servis-saglayici-giris",
                  items: ["Şube ve operasyon yönetimi", "Stok, kasa ve POS", "Personel maaş takibi", "Müşteri CRM"],
                },
                {
                  icon: Users,
                  title: "Satıcı / mağaza paneli",
                  href: "/magaza/satici-ol",
                  items: ["Ürün ve kategori", "Çoklu kargo gönderimi", "Kampanya ve kupon", "Özel domain"],
                },
                {
                  icon: Newspaper,
                  title: "Editör paneli",
                  href: "/editor/giris",
                  items: ["Haber ve makale editörü", "Yazar yönetimi", "RSS ve senkron", "SEO araçları"],
                },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.title}
                    className="flex flex-col rounded-[1.75rem] border border-emerald-100 bg-white p-6 shadow-sm"
                  >
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#0f766e] text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-black text-slate-950">{card.title}</h3>
                    <ul className="mt-4 flex-1 space-y-2">
                      {card.items.map((item) => (
                        <li key={item} className="flex items-center gap-2 text-xs font-bold text-slate-600">
                          <Check className="h-3.5 w-3.5 text-[#039D55]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <ServiceMarketingCta href={card.href} label="Panele git" variant="secondary" className="mt-5 w-full" />
                  </div>
                );
              })}
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-[1.75rem] border border-emerald-100 bg-white p-8 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <Globe2 className="h-6 w-6 text-[#0f766e]" />
                <h3 className="text-lg font-black text-slate-950">Özel domain ve e-posta</h3>
              </div>
              <p className="text-sm font-semibold leading-6 text-slate-500">
                Markanıza özel web adresi bağlayın; kurumsal e-posta kutunuzu Yekpare altyapısıyla kullanın. Sipariş,
                alışveriş, turizm ve haber siteleriniz profesyonel bir kimlikle yayında kalır.
              </p>
            </div>
            <div className="rounded-[1.75rem] border border-emerald-100 bg-white p-8 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <Headphones className="h-6 w-6 text-[#0f766e]" />
                <h3 className="text-lg font-black text-slate-950">AI Çağrı Merkezi</h3>
              </div>
              <p className="text-sm font-semibold leading-6 text-slate-500">
                Yekpare AI asistan tüm servislerinizde müşteri rehberliği sunar. Canlı çağrı merkezi platformu{" "}
                <strong className="text-slate-700">call.yekpare.net</strong> üzerinden kampanya ve hat yönetimi sağlar.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <ServiceMarketingCta
                  href={`${SERVICES_MARKETING_BASE}/ai-cagri-merkezi`}
                  label="Servis detayı"
                  variant="secondary"
                />
                <ServiceMarketingCta href="/ai-cagri-merkezi" label="Tanıtım sayfası" variant="secondary" />
                <ServiceMarketingCta
                  href="https://call.yekpare.net/"
                  label="Canlı platform"
                  variant="primary"
                  external
                />
              </div>
            </div>
          </section>

          <section className="mt-12 overflow-hidden rounded-[2rem] bg-[#0f766e] p-8 text-white md:p-12">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-100">Hemen başlayın</p>
                <h2 className="mt-2 text-2xl font-black sm:text-3xl">İşletmenizi Yekpare'ye taşıyın</h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-emerald-50">
                  Ücretsiz keşif, panel demo ve modül seçimi için ekibimizle iletişime geçin veya doğrudan başvuru
                  formunu doldurun.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <ServiceMarketingCta href="/is-ortagi" label="Başvuru yap" variant="onTeal">
                  <Package className="h-4 w-4" />
                  Başvuru yap
                </ServiceMarketingCta>
                <ServiceMarketingCta href="/iletisim-kunye" label="İletişim" variant="ghostOnTeal">
                  <Mail className="h-4 w-4" />
                  İletişim
                </ServiceMarketingCta>
              </div>
            </div>
          </section>
        </div>
      </div>
    </ServicesMarketingChrome>
  );
}
