import { Link } from "wouter";
import {
  AhenkAgencyChrome,
  AhenkMediaCard,
  AhenkPageHero,
} from "@/components/ahenk-agency/AhenkAgencyChrome";
import { useAhenkAgencySite } from "@/hooks/useAhenkAgencySite";
import { ahenkOperationalServices } from "@/lib/ahenkAgencySeo";

export default function AhenkAgencyHizmetler() {
  const site = useAhenkAgencySite();
  const ops = ahenkOperationalServices(site).filter((s) => s.slug !== "ajans-hizmetleri");
  const items = [
    ...site.agencyOffers.map((item) => ({
      slug: item.slug,
      href: item.href,
      image: item.image,
      title: item.title,
      excerpt: item.excerpt,
      icon: item.icon,
    })),
    ...ops.map((svc) => ({
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
      title="Hizmetlerimiz | Ajans ve çağrı merkezi | Ahenk BT"
      description="Ahenk Bilgi Teknolojileri hizmetleri: ajans stüdyosu, grafik, film, reklam, SEO, müşteri hizmetleri ve çağrı merkezi operasyonu."
    >
      <AhenkPageHero
        crumb={
          <>
            <Link href="/">Anasayfa</Link> / Hizmetlerimiz
          </>
        }
        title="Hizmetlerimiz"
        lead="Ajans stüdyosu, çağrı merkezi ve operasyon. Grafik, film, reklam, SEO, müşteri hizmetleri ve sipariş hattı aynı çatıda."
        image={site.agencyOffers[0]?.image || site.servicesHeroImage}
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
