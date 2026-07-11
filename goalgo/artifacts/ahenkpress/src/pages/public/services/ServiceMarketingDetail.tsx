import { useEffect } from "react";
import { Link, useParams } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  Globe2,
  Newspaper,
  Package,
  Plane,
  ShoppingBag,
  Sparkles,
  Truck,
  Utensils,
} from "lucide-react";
import { ServiceMarketingCta, ServiceMarketingCtaGroup } from "@/components/services/ServiceMarketingCta";
import { ServicesMarketingChrome } from "@/components/services/ServicesMarketingChrome";
import {
  getServiceMarketingModule,
  SERVICES_MARKETING_BASE,
  type ServiceMarketingModule,
  type ServiceMarketingSlug,
} from "@/lib/servicesMarketingData";
import { applySocialShareMeta, resetSeoToSiteDefaults } from "@/lib/pageSeo";
import {
  SADE_CARD_INLINE_CLASS,
  SADE_PUBLIC_HERO_CONTENT_CLASS,
  SADE_HERO_EYEBROW_CLASS,
  SADE_HERO_GLOW_CLASS,
  SADE_HERO_SHELL_CLASS,
  SADE_PUBLIC_POST_HERO_BODY_CLASS,
} from "@/lib/yekpareSadeTheme";
import { YEKPARE_PAGE_CONTAINER_CLASS } from "@/lib/yekpareLayout";
import NotFound from "@/pages/not-found";

const MODULE_ICONS: Record<ServiceMarketingSlug, typeof Utensils> = {
  siparis: Utensils,
  alisveris: ShoppingBag,
  ulasim: Truck,
  turizm: Plane,
  "haber-merkezi": Newspaper,
  "ai-cagri-merkezi": Bot,
};

function PanelBlock({ block }: { block: ServiceMarketingModule["providerPanel"] }) {
  return (
    <div className={SADE_CARD_INLINE_CLASS}>
      <div className="h-1.5 w-full shrink-0 rounded-t-[2rem] bg-[#039D55]" />
      <h3 className="text-xl font-black text-slate-950">{block.title}</h3>
      <p className="mt-1 text-sm font-semibold text-slate-500">{block.subtitle}</p>
      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        {block.items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm font-semibold text-slate-600">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#039D55]" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ServiceDetailContent({ mod }: { mod: ServiceMarketingModule }) {
  const Icon = MODULE_ICONS[mod.slug];

  return (
    <div className="sade-public-page flex min-w-0 flex-1 flex-col text-slate-900">
      <section className={`sade-public-hero ${SADE_HERO_SHELL_CLASS}`}>
        <div className={SADE_HERO_GLOW_CLASS} />
        <div className={`${SADE_PUBLIC_HERO_CONTENT_CLASS} py-10 md:py-14`}>
          <Link
            href={SERVICES_MARKETING_BASE}
            className="mb-6 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#0f766e] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Tüm hizmetler
          </Link>
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0f766e] text-white shadow-lg shadow-emerald-900/15">
                <Icon className="h-7 w-7" />
              </div>
              <p className={SADE_HERO_EYEBROW_CLASS}>Yekpare {mod.title}</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{mod.tagline}</h1>
              <p className="mt-4 text-base font-semibold leading-relaxed text-slate-600">{mod.description}</p>
              {mod.audienceNotes?.length ? (
                <div className="mt-5 space-y-2">
                  {mod.audienceNotes.map((note) => (
                    <p key={note} className="text-sm font-semibold leading-6 text-slate-500">
                      {note}
                    </p>
                  ))}
                </div>
              ) : null}
              <div className="mt-6 flex flex-wrap gap-2">
                {mod.highlights.map((h) => (
                  <span
                    key={h}
                    className="rounded-full border border-emerald-100 bg-white/80 px-3 py-1.5 text-xs font-black text-slate-700"
                  >
                    {h}
                  </span>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <ServiceMarketingCta
                  href={mod.heroCta.href}
                  label={mod.heroCta.label}
                  external={mod.heroCta.external}
                >
                  {mod.heroCta.label}
                  <ArrowRight className="h-4 w-4" />
                </ServiceMarketingCta>
                {mod.secondaryCta ? (
                  <ServiceMarketingCta
                    href={mod.secondaryCta.href}
                    label={mod.secondaryCta.label}
                    variant="secondary"
                    external={mod.secondaryCta.external}
                  />
                ) : null}
              </div>
              {mod.extraCtas?.length ? (
                <ServiceMarketingCtaGroup items={mod.extraCtas} variant="secondary" className="mt-3" />
              ) : null}
            </div>
            {mod.platformExtras.length ? (
              <div className="w-full max-w-xs shrink-0 rounded-2xl border border-emerald-100 bg-white/90 p-5 shadow-sm backdrop-blur-sm">
                <p className="text-xs font-black uppercase tracking-wider text-[#0f766e]">Platform ekstraları</p>
                <ul className="mt-3 space-y-2">
                  {mod.platformExtras.map((x) => (
                    <li key={x} className="flex items-center gap-2 text-sm font-bold text-slate-700">
                      <Sparkles className="h-3.5 w-3.5 text-[#039D55]" />
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className={`${SADE_PUBLIC_POST_HERO_BODY_CLASS} ${YEKPARE_PAGE_CONTAINER_CLASS} space-y-12 pb-16`}>
        {mod.useCases?.length ? (
          <section>
            <h2 className="text-2xl font-black tracking-tight text-slate-950">Kimler için?</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-500">
              Tipik işletme profilleri ve bu modülle elde edilen sonuçlar.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {mod.useCases.map((u) => (
                <div
                  key={u.title}
                  className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-white p-6"
                >
                  <h3 className="text-base font-black text-slate-950">{u.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{u.desc}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <h2 className="text-2xl font-black tracking-tight text-slate-950">Müşteri deneyimi</h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-500">
            Son kullanıcıya sunulan özellikler, arayüz ve fırsatlar.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mod.customerFeatures.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm transition hover:border-[#039D55]/40"
              >
                <h3 className="text-sm font-black text-slate-950">{f.title}</h3>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <PanelBlock block={mod.providerPanel} />
          {mod.editorPanel ? <PanelBlock block={mod.editorPanel} /> : null}
          <PanelBlock block={mod.operations} />
        </section>

        <section>
          <h2 className="text-2xl font-black tracking-tight text-slate-950">Büyüme fırsatları</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">İşletmeniz için verimlilik ve gelir avantajları.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {mod.opportunities.map((o) => (
              <div key={o.title} className="rounded-2xl bg-gradient-to-br from-emerald-50 to-white p-6 ring-1 ring-emerald-100">
                <h3 className="text-base font-black text-slate-950">{o.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{o.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-[1.75rem] border border-emerald-100 bg-white p-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <Globe2 className="mt-1 h-8 w-8 shrink-0 text-[#0f766e]" />
            <div>
              <h3 className="text-lg font-black text-slate-950">Özel domain ve kurumsal e-posta</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {mod.title} modülünüzü kendi markanızla yayınlayın; profesyonel e-posta ile müşterilerinize ulaşın.
              </p>
            </div>
          </div>
          <ServiceMarketingCta href="/is-ortagi" label="Başvuru" variant="primary">
            <Package className="h-4 w-4" />
            Başvuru
          </ServiceMarketingCta>
        </section>

        <section className="overflow-hidden rounded-[2rem] bg-[#0f766e] p-8 text-white">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-100">Sonraki adım</p>
          <h2 className="mt-2 text-xl font-black">{mod.title} modülünü deneyin</h2>
          <p className="mt-2 max-w-lg text-sm font-semibold text-emerald-50">
            Canlı vitrine gidin, sağlayıcı paneline giriş yapın veya diğer Yekpare servislerini keşfedin.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ServiceMarketingCta href={mod.heroCta.href} label={mod.heroCta.label} variant="onTeal" external={mod.heroCta.external}>
              {mod.heroCta.label}
              <ArrowRight className="h-4 w-4" />
            </ServiceMarketingCta>
            {mod.secondaryCta ? (
              <ServiceMarketingCta
                href={mod.secondaryCta.href}
                label={mod.secondaryCta.label}
                variant="ghostOnTeal"
                external={mod.secondaryCta.external}
              />
            ) : null}
            <ServiceMarketingCta href={SERVICES_MARKETING_BASE} label="Diğer servisler" variant="ghostOnTeal" />
          </div>
        </section>
      </div>
    </div>
  );
}

export default function ServiceMarketingDetail() {
  const params = useParams<{ slug?: string }>();
  const slug = params.slug ?? "";
  const mod = getServiceMarketingModule(slug);

  useEffect(() => {
    if (!mod) return;
    applySocialShareMeta({
      title: `Yekpare ${mod.title} — Özellikler ve imkanlar`,
      descriptionPrimary: mod.description,
      canonicalPath: `${SERVICES_MARKETING_BASE}/${mod.slug}`,
    });
    return () => resetSeoToSiteDefaults();
  }, [mod]);

  if (!mod) {
    return (
      <ServicesMarketingChrome>
        <NotFound />
      </ServicesMarketingChrome>
    );
  }

  return (
    <ServicesMarketingChrome searchPlaceholder={`${mod.title} özelliklerinde ara`}>
      <ServiceDetailContent mod={mod} />
    </ServicesMarketingChrome>
  );
}
