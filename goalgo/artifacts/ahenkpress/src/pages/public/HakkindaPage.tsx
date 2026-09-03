import { useEffect } from "react";
import { Link } from "wouter";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { geoEntityByDomain, geoEntityBySlug, type GeoSiteEntity } from "@/lib/geoSiteEntities";
import { applyHmNewsSiteHomeMeta, applyJsonLd } from "@/lib/pageSeo";
import { hmPublicSiteOrigin } from "@/lib/hmPublicLinks";

function resolveEntity(slug?: string | null, domain?: string | null): GeoSiteEntity | null {
  return (
    geoEntityBySlug(slug) ||
    geoEntityByDomain(domain) ||
    (typeof window !== "undefined" ? geoEntityByDomain(window.location.hostname) : null)
  );
}

export default function HakkindaPage() {
  const ctx = useHmPublicLinkContextOptional();
  const entity = resolveEntity(ctx?.slug, ctx?.domain);
  const name = entity?.officialName || ctx?.displayName || "Haber sitesi";
  const domain = entity?.domain || ctx?.domain || (typeof window !== "undefined" ? window.location.hostname : "");
  const origin = (hmPublicSiteOrigin(ctx?.domain) || (typeof window !== "undefined" ? window.location.origin : "")).replace(
    /\/+$/,
    "",
  );

  useEffect(() => {
    if (!ctx && !entity) return;
    const siteName = ctx?.displayName || name;
    applyHmNewsSiteHomeMeta({
      siteName,
      browserTitle: `${name} nedir? — ${domain}`,
      description: entity?.description || `${name} resmi haber sitesi.`,
      canonicalPath: "/hakkinda",
      canonicalOrigin: origin || undefined,
      imageUrl: ctx?.layoutPrefs.logoUrl,
      logoUrl: ctx?.layoutPrefs.logoUrl,
      faviconUrl: ctx?.layoutPrefs.faviconUrl,
    });
    if (entity && origin) {
      applyJsonLd(
        [
          {
            "@context": "https://schema.org",
            "@type": ["NewsMediaOrganization", "Organization"],
            "@id": `${origin}/#organization`,
            name: entity.officialName,
            alternateName: entity.alternateName,
            url: `${origin}/`,
            description: entity.description,
            disambiguatingDescription: entity.disambiguatingDescription,
            identifier: { "@type": "PropertyValue", name: "domain", value: entity.domain },
            areaServed: { "@type": "Country", name: "Türkiye" },
            inLanguage: "tr-TR",
          },
          {
            "@context": "https://schema.org",
            "@type": "AboutPage",
            "@id": `${origin}/hakkinda#page`,
            name: `${entity.officialName} nedir?`,
            url: `${origin}/hakkinda`,
            about: { "@id": `${origin}/#organization` },
            mainEntity: { "@id": `${origin}/#organization` },
            inLanguage: "tr-TR",
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: entity.faq.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: { "@type": "Answer", text: item.answer },
            })),
          },
        ],
        "about",
      );
    }
  }, [ctx?.slug, ctx?.displayName, ctx?.domain, entity?.slug, name, domain, origin]);

  return (
    <div style={{ background: "var(--hm-page-bg, #ffffff)" }}>
      <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
          <div className="border-b border-emerald-100 bg-[#f4fbf7] px-6 py-5 md:px-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0f766e]">Kurumsal</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
              {name} nedir?
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-600">
              Resmi alan adı: <strong>{domain}</strong>
            </p>
          </div>
          <div className="space-y-5 px-6 py-8 text-sm leading-relaxed text-slate-700 md:px-8 md:text-base">
            <p>{entity?.description || `${name} resmi haber sitesidir.`}</p>
            {entity?.disambiguatingDescription ? <p>{entity.disambiguatingDescription}</p> : null}
            {entity?.alternateName?.length ? (
              <section>
                <h2 className="mb-2 text-lg font-bold text-slate-900">Diğer adlar</h2>
                <ul className="list-disc pl-5">
                  {entity.alternateName.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </section>
            ) : null}
            {entity?.notToBeConfusedWith?.length ? (
              <section>
                <h2 className="mb-2 text-lg font-bold text-slate-900">Karıştırılmaması gerekenler</h2>
                <ul className="list-disc pl-5">
                  {entity.notToBeConfusedWith.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </section>
            ) : null}
            {entity?.faq?.length ? (
              <section>
                <h2 className="mb-2 text-lg font-bold text-slate-900">Sık sorulanlar</h2>
                {entity.faq.map((item) => (
                  <div key={item.question} className="mb-4">
                    <h3 className="font-semibold text-slate-900">{item.question}</h3>
                    <p className="mt-1">{item.answer}</p>
                  </div>
                ))}
              </section>
            ) : null}
            <p>
              Yayın altyapısı:{" "}
              <a href="https://ahenk.net.tr" rel="noreferrer" target="_blank">
                Ahenk Bilgi Teknolojileri
              </a>
            </p>
            <p>
              Künye: <Link href="/kunye">/kunye</Link>
              {" · "}
              İletişim: <Link href="/iletisim">/iletisim</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
