import { Link } from "wouter";
import {
  AhenkAgencyChrome,
  AhenkCardGrid,
  AhenkFaqList,
  AhenkFeatureChips,
  AhenkMediaCard,
  AhenkSmartLink,
} from "@/components/ahenk-agency/AhenkAgencyChrome";
import { useAhenkAgencySite } from "@/hooks/useAhenkAgencySite";
import { ahenkCallCenterServices, ahenkWhatsAppHref } from "@/lib/ahenkAgencySeo";
import { AHENK_PHOTOS, safeAhenkImageUrl, type AhenkContentCard } from "@/lib/ahenkAgencySite";
import { formatTry, PBX_BASE_PER_AGENT_TL, pbxMonthlyTl } from "@/lib/ahenkPbxPricing";
import { YEKPARE_ECOSYSTEM_POINTS, YEKPARE_HOME_FAQS } from "@/lib/ahenkYekpareDemos";

function hideHomeCampaignPrice(text: string): string {
  return text
    .replace(/\s*[—–-]\s*\d{1,3}(?:\.\d{3})*\s*TL/gi, "")
    .replace(/\d{1,3}(?:\.\d{3})*\s*TL(?:’den|\b)/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+·\s+·/g, " · ")
    .trim();
}

function sectorForHome(item: AhenkContentCard): AhenkContentCard {
  return {
    ...item,
    title: hideHomeCampaignPrice(item.title),
    excerpt: hideHomeCampaignPrice(item.excerpt),
  };
}

export default function AhenkAgencyHome() {
  const site = useAhenkAgencySite();
  const heroSrc = safeAhenkImageUrl(site.heroImage, "");
  const yekpareSrc = safeAhenkImageUrl(site.yekpare.image, "");
  const aboutSrc = safeAhenkImageUrl(site.aboutImage, "");
  const sectors = site.softwareSectors.map(sectorForHome);
  const featured = sectors.slice(0, 3);
  const restSectors = sectors.slice(3);
  const callCenter = ahenkCallCenterServices(site);
  const wa = ahenkWhatsAppHref(
    site.whatsappTel || site.phoneTel,
    "Merhaba, yekpare.net hazır web sitesi / özel yazılım istiyorum.",
  );

  return (
    <AhenkAgencyChrome title={site.seoTitle} description={site.seoDescription}>
      <section className="ahenk-hero" aria-label="yekpare.net hazır web sitesi">
        {heroSrc ? (
          <div className="ahenk-hero-photo" aria-hidden>
            <img src={heroSrc} alt="Ahenk yekpare.net hazır web sitesi" />
          </div>
        ) : null}
        <div className="ahenk-hero-slide">
          <div className="ahenk-hero-inner">
            <span className="ahenk-kicker">Ahenk Bilgi Teknolojileri</span>
            <h1>yekpare.net hazır web sitesi</h1>
            <p>
              Ahenk BT markası, yekpare.net üzerinde hazır web siteleri üretir. Haber siteleri HM editör altyapısıyla,
              sağlık, hukuk, mağaza ve sipariş vitrinleri yekpare.net servis sağlayıcı siteleriyle yayına alınır.
            </p>
            <p className="ahenk-hero-ai">Özel yazılımlar için bizimle iletişime geçin.</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a className="ahenk-btn" href="#polis-ai">
                Polis AI
              </a>
              <Link href="/iletisim" className="ahenk-btn ahenk-btn-ghost">
                Özel yazılım için iletişim
              </Link>
              <a className="ahenk-btn ahenk-btn-ghost" href={wa} target="_blank" rel="noreferrer">
                WhatsApp {site.phone}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="ahenk-section" id="yekpare-ekosistem">
        <h2>yekpare.net’te yayınlanmanın avantajı</h2>
        <p className="ahenk-lead">
          Hazır siteniz yalnızca bir vitrin değildir: ücretsiz liste, reklam trafiği, harita ve sarı sayfalar kaydı,
          onbinlerce işletmenin bulunduğu ağ. Sipariş, satış ve rezervasyon bu sistemden gelir.
        </p>
        <div className="ahenk-grid">
          {YEKPARE_ECOSYSTEM_POINTS.map((item) => (
            <article key={item.title} className="ahenk-card">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ahenk-polis-home" id="polis-ai">
        <div className="ahenk-polis-home-visual" aria-hidden>
          <img src="/ahenk-polis-ai/02-vatandas-poster.jpg" alt="" />
        </div>
        <div className="ahenk-polis-home-copy">
          <span className="ahenk-kicker">Yapım aşamasında · web · App Store · Play Store</span>
          <h2>Polis AI</h2>
          <p>
            Akıllı şehir ve bireysel güvenlik ekosistemi. Tek tuşla sessiz ihbar, yapay zeka risk analizi, 112’ye
            otomatik sesli anons ve <strong>polisai.net</strong> PIN ile canlı konum / görüntü. Legal-tech avukat
            pazaryeri, kategorik ihbar (polis · trafik · zabıta) ve siber / aile kalkanı.
          </p>
          <ul>
            <li>PIN protokolü: operatör uygulama yüklemeden canlı veriye bakar.</li>
            <li>Vatandaş: sesli acil durum, canlı medya, interaktif hukuk, siber suç önleme.</li>
            <li>Saha: olay yeri tutanak, görsel analitik, siber devriye — proje hedefi.</li>
          </ul>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
            <Link href="/polis-ai" className="ahenk-btn">
              Detaylı sunum
            </Link>
            <a className="ahenk-btn ahenk-btn-ghost" href="/ahenk-polis-ai/Polis-AI-Presentation.pdf" download>
              PDF indir
            </a>
          </div>
        </div>
      </section>

      <section className="ahenk-section" id="yazilim">
        <h2>{site.softwareTitle}</h2>
        <p className="ahenk-lead">
          Sektör şablonları yekpare.net hazır site olarak teslim edilir. Avukat, doktor, restoran, haber, emlak ve diğer
          dikeyler; özel yazılım ihtiyacında Ahenk BT ile görüşülür.
        </p>
        {featured.length ? <AhenkCardGrid items={featured} cta="Web yazılımı" /> : null}
        {restSectors.length ? (
          <div className="ahenk-grid ahenk-grid-tight" style={{ marginTop: 18 }}>
            {restSectors.map((item) => (
              <AhenkSmartLink key={item.slug} href={item.href} className="ahenk-card ahenk-card-media">
                <span className="ahenk-card-photo ahenk-card-photo-sm">
                  {item.image ? <img src={item.image} alt={item.title} loading="lazy" /> : null}
                </span>
                <span className="ahenk-card-body">
                  <h3>{item.title}</h3>
                  <p>{item.excerpt}</p>
                  <AhenkFeatureChips features={item.features} limit={4} />
                  <span className="ahenk-card-cta">Detay →</span>
                </span>
              </AhenkSmartLink>
            ))}
          </div>
        ) : null}
      </section>

      <section className="ahenk-section ahenk-section-flush" id="ajans">
        <div className="ahenk-section">
          <h2>{site.agencyTitle}</h2>
          <p className="ahenk-lead">{site.agencyLead}</p>
          <AhenkCardGrid items={site.agencyOffers} cta="Ajans" />
        </div>
      </section>

      <section className="ahenk-section" id="urunler">
        <h2>Yazılım ürünlerimiz</h2>
        <p className="ahenk-lead">
          Polis AI (yapım aşamasında), kurumsal yapay zeka IDE (Aiaddin) ve çağrı merkezi CRM (Ahenk PBX).
        </p>
        <div className="ahenk-grid">
          <AhenkSmartLink href="/polis-ai" className="ahenk-card ahenk-card-media">
            <span className="ahenk-card-photo ahenk-card-photo-sm">
              <img src="/ahenk-polis-ai/01-nedir.jpg" alt="Polis AI" loading="lazy" />
            </span>
            <span className="ahenk-card-body">
              <span className="ahenk-kicker">polisai.net</span>
              <h3>Polis AI — akıllı güvenlik</h3>
              <p>
                112 PIN protokolü, legal-tech, şehir ihbar akışı. App Store ve Play Store çok yakında. Sunum ve PDF
                detay sayfasında.
              </p>
              <span className="ahenk-card-cta">Polis AI sunumu →</span>
            </span>
          </AhenkSmartLink>
          <AhenkSmartLink href="/aiaddin" className="ahenk-card ahenk-card-media">
            <span className="ahenk-card-photo ahenk-card-photo-sm">
              <img src={AHENK_PHOTOS.code} alt="Aiaddin" loading="lazy" />
            </span>
            <span className="ahenk-card-body">
              <span className="ahenk-kicker">aiaddin.net</span>
              <h3>Aiaddin — kurumsal yapay zeka IDE</h3>
              <p>
                Monaco, gerçek terminal, semantik bağlam ve Composer ajanı tarayıcıda. BYOK ile Claude / GPT / DeepSeek.
                Free $0, Pro $20/ay, Enterprise özel.
              </p>
              <span className="ahenk-card-cta">Aiaddin tanıtımı →</span>
            </span>
          </AhenkSmartLink>
          <AhenkSmartLink href="/cagri-merkezi-crm" className="ahenk-card ahenk-card-media">
            <span className="ahenk-card-photo ahenk-card-photo-sm">
              <img src={AHENK_PHOTOS.callCenter} alt="Ahenk PBX" loading="lazy" />
            </span>
            <span className="ahenk-card-body">
              <span className="ahenk-kicker">pbx.goalgo.org</span>
              <h3>Ahenk PBX — çağrı merkezi CRM</h3>
              <p>
                Yapay zeka destekli çağrı merkezi CRM. Temsilci başı {formatTry(PBX_BASE_PER_AGENT_TL)}; 10 kişide{" "}
                {formatTry(pbxMonthlyTl(10))}, 20 kişide {formatTry(pbxMonthlyTl(20))}, 30 kişide{" "}
                {formatTry(pbxMonthlyTl(30))}. Her +10 temsilcide 50 TL indirim, 50 ajana kadar.
              </p>
              <span className="ahenk-card-cta">PBX fiyatları →</span>
            </span>
          </AhenkSmartLink>
        </div>
      </section>

      {callCenter.length ? (
        <section className="ahenk-section" id="cagri-merkezi">
          <h2>Çağrı merkezi hizmetleri</h2>
          <p className="ahenk-lead">
            Web yazılımı ve ajansın ardından operasyon: müşteri hizmetleri ve çağrı merkezi sipariş sistemi.
          </p>
          <div className="ahenk-grid">
            {callCenter.map((svc) => (
              <AhenkMediaCard
                key={svc.slug}
                href={`/hizmet/${svc.slug}`}
                image={svc.image}
                title={svc.title}
                excerpt={svc.excerpt}
                icon={svc.icon}
                cta="İncele"
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="ahenk-promo" aria-label="Yekpare">
        {yekpareSrc ? (
          <div className="ahenk-promo-visual">
            <img src={yekpareSrc} alt="Yekpare.net" />
          </div>
        ) : (
          <div className="ahenk-promo-visual ahenk-promo-fallback" />
        )}
        <div className="ahenk-promo-copy">
          <span className="ahenk-kicker">yekpare.net</span>
          <h2>Hazır siteniz keşif ve sipariş ağına bağlanır</h2>
          <p>
            Ücretsiz liste, yekpare.net reklamları, haritalar ve sarı sayfalar. Onbinlerce işletme kaydı; sipariş, satış
            ve rezervasyon bu trafikten gelir.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
            <a className="ahenk-btn" href="https://yekpare.net" target="_blank" rel="noreferrer">
              yekpare.net’i aç
            </a>
            <Link href="/yekpare" className="ahenk-btn ahenk-btn-ghost">
              Yekpare sayfası
            </Link>
          </div>
        </div>
      </section>

      <section className="ahenk-section" id="yayin">
        <h2>{site.platformTitle}</h2>
        <p className="ahenk-lead">{site.platformLead}</p>
        <AhenkCardGrid items={site.platformProducts} cta="Aç" />
        <div style={{ marginTop: 22 }}>
          <Link href="/haber-merkezi" className="ahenk-btn ahenk-btn-light">
            Haber sitesi yazılımı
          </Link>
        </div>
      </section>

      <section className="ahenk-section" id="sss">
        <h2>Sık sorulan sorular</h2>
        <p className="ahenk-lead">Hazır yekpare.net sitesi, ücretsiz liste ve özel yazılım.</p>
        <AhenkFaqList faqs={YEKPARE_HOME_FAQS} />
      </section>

      <section className="ahenk-band">
        <div className="ahenk-section ahenk-about-split">
          {aboutSrc ? (
            <div className="ahenk-about-photo">
              <img src={aboutSrc} alt="" />
            </div>
          ) : null}
          <div>
            <h2>{site.aboutTitle}</h2>
            <div className="ahenk-prose" dangerouslySetInnerHTML={{ __html: site.aboutHtml }} />
            <div style={{ marginTop: 20 }}>
              <Link href="/hakkimizda" className="ahenk-btn">
                Hakkımızda
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="ahenk-cta">
        <div className="ahenk-cta-inner">
          <div>
            <h2>Özel yazılımlar için bizimle iletişime geçin</h2>
            <p>
              Hazır yekpare.net sitesi dışında kurumunuza özel yazılım, entegrasyon veya yayın kurgusu için Ahenk BT
              ofisleri ve WhatsApp hattı açık.
            </p>
            <p className="ahenk-iban" style={{ marginTop: 12 }}>
              {site.ibanBank} · {site.ibanHolder}
              <br />
              <span className="ahenk-iban-num">{site.iban}</span>
            </p>
          </div>
          <a className="ahenk-btn" href={wa} target="_blank" rel="noreferrer">
            WhatsApp {site.phone}
          </a>
        </div>
      </section>

      <section className="ahenk-section">
        <h2>Ofislerimiz</h2>
        <p className="ahenk-lead">Türkiye, Gürcistan, İngiltere, ABD ve Azerbaycan.</p>
        <div className="ahenk-offices">
          {site.offices.map((o) => (
            <article key={o.id} className="ahenk-office">
              <h3>
                {o.flag} {o.country}
              </h3>
              <p>{o.address}</p>
            </article>
          ))}
        </div>
      </section>
    </AhenkAgencyChrome>
  );
}
