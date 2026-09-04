import { Link } from "wouter";
import { AhenkAgencyChrome, AhenkPageHero, AhenkSmartLink } from "@/components/ahenk-agency/AhenkAgencyChrome";
import { AHENK_PRODUCTS } from "@/lib/ahenkProducts";

export default function AhenkUrunlerimiz() {
  return (
    <AhenkAgencyChrome
      title="Ürünlerimiz | Ahenk Bilgi Teknolojileri"
      description="Ahenk Asistan AI, WhatsApp çağrı merkezi, Polis AI, yekpare.net, Aiaddin, PBX CRM, Haber Merkezi, YekTube, Haberler, haber haritası ve web yazılımı."
    >
      <AhenkPageHero
        crumb={
          <>
            <Link href="/">Anasayfa</Link> / Ürünlerimiz
          </>
        }
        title="Ürünlerimiz"
        lead="Yapay zeka asistanından hazır siteye, çağrı merkezi CRM’den Haber Merkezi, YekTube ve haber haritasına — Ahenk BT yazılım ailesi."
        image={AHENK_PRODUCTS[0]?.image}
      />
      <section className="ahenk-section">
        <div className="ahenk-product-board">
          {AHENK_PRODUCTS.map((item) => (
            <AhenkSmartLink
              key={item.slug}
              href={item.href}
              className={`ahenk-product-tile${item.featured ? " is-featured" : ""}`}
            >
              <span className="ahenk-product-photo">
                <img src={item.image} alt="" loading="lazy" />
              </span>
              <span className="ahenk-product-copy">
                <span className="ahenk-kicker">{item.kicker}</span>
                <strong>{item.title}</strong>
                <span>{item.excerpt}</span>
                <em>İncele →</em>
              </span>
            </AhenkSmartLink>
          ))}
        </div>
      </section>
    </AhenkAgencyChrome>
  );
}
