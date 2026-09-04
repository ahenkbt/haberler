import { Link } from "wouter";
import {
  AhenkAgencyChrome,
  AhenkMediaCard,
  AhenkPageHero,
} from "@/components/ahenk-agency/AhenkAgencyChrome";
import { useAhenkAgencySite } from "@/hooks/useAhenkAgencySite";
import { ahenkOperationalServices } from "@/lib/ahenkAgencySeo";
import { AHENK_SERVICE_APPEND_SLUGS } from "@/lib/ahenkAgencySite";

export default function AhenkAgencyHizmetler() {
  const site = useAhenkAgencySite();
  const ops = ahenkOperationalServices(site).filter((s) => s.slug !== "ajans-hizmetleri");
  const consultingSlugs = new Set<string>(AHENK_SERVICE_APPEND_SLUGS);
  const consulting = ops.filter((s) => consultingSlugs.has(s.slug));
  const restOps = ops.filter((s) => !consultingSlugs.has(s.slug));
  const items = [
    ...consulting.map((svc) => ({
      slug: svc.slug,
      href: `/hizmet/${svc.slug}`,
      image: svc.image,
      title: svc.title,
      excerpt: svc.excerpt,
      icon: svc.icon,
    })),
    ...site.agencyOffers.map((item) => ({
      slug: item.slug,
      href: item.href,
      image: item.image,
      title: item.title,
      excerpt: item.excerpt,
      icon: item.icon,
    })),
    ...restOps.map((svc) => ({
      slug: svc.slug,
      href: `/hizmet/${svc.slug}`,
      image: svc.image,
      title: svc.title,
      excerpt: svc.excerpt,
      icon: svc.icon,
    })),
  ];

  return (
    <AhenkAgencyChrome
      title="Hizmetlerimiz | Danışmanlık, ajans ve çağrı merkezi | Ahenk BT"
      description="Uluslararası şirket ve STK kuruluşu, e-ticaret ödeme kuruluşu kaydı, e-Residency, ajans stüdyosu ve çağrı merkezi. Ahenk Bilgi Teknolojileri."
    >
      <AhenkPageHero
        crumb={
          <>
            <Link href="/">Anasayfa</Link> / Hizmetlerimiz
          </>
        }
        title="Hizmetlerimiz"
        lead="Uluslararası kuruluş ve ödeme danışmanlığı, dijital göçebe / e-Residency, ajans stüdyosu ve çağrı merkezi operasyonu."
        image={site.servicesHeroImage || site.agencyOffers[0]?.image}
      />
      <section className="ahenk-section">
        <div className="ahenk-grid">
          {items.map((item) => (
            <AhenkMediaCard
              key={item.slug}
              href={item.href}
              image={item.image}
              title={item.title}
              excerpt={item.excerpt}
              icon={item.icon}
              cta="İncele"
            />
          ))}
        </div>
      </section>
    </AhenkAgencyChrome>
  );
}
