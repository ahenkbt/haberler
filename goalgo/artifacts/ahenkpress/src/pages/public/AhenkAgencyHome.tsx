import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  AhenkAgencyChrome,
  AhenkCardGrid,
  AhenkFaqList,
  AhenkFeatureChips,
  AhenkSmartLink,
} from "@/components/ahenk-agency/AhenkAgencyChrome";
import { useAhenkAgencySite } from "@/hooks/useAhenkAgencySite";
import { ahenkWhatsAppHref } from "@/lib/ahenkAgencySeo";
import { safeAhenkImageUrl, type AhenkContentCard } from "@/lib/ahenkAgencySite";
import { YEKPARE_ECOSYSTEM_POINTS, YEKPARE_HOME_FAQS } from "@/lib/ahenkYekpareDemos";
import { AHENK_ASISTAN_IMG, AHENK_PRODUCTS } from "@/lib/ahenkProducts";

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

function AhenkHomeSlider({
  slides,
  phone,
  wa,
}: {
  slides: { id: string; title: string; subtitle: string; ctaLabel: string; ctaHref: string; image?: string }[];
  phone: string;
  wa: string;
}) {
  const list = slides.filter((s) => s.title.trim());
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = list.length;

  useEffect(() => {
    if (idx >= n && n > 0) setIdx(0);
  }, [idx, n]);

  useEffect(() => {
    if (n < 2 || paused) return;
    const t = window.setInterval(() => setIdx((i) => (i + 1) % n), 6500);
    return () => window.clearInterval(t);
  }, [n, paused]);

  if (!n) return null;
  const current = list[Math.min(idx, n - 1)]!;

  return (
    <section
      className="ahenk-hero ahenk-hero-slider"
      aria-label="Anasayfa slaytları"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {list.map((slide, i) => {
        const img = safeAhenkImageUrl(slide.image, "");
        return (
          <div
            key={slide.id}
            className={`ahenk-hero-layer${i === idx ? " is-active" : ""}`}
            aria-hidden={i !== idx}
          >
            {img ? (
              <div className="ahenk-hero-photo">
                <img src={img} alt="" />
              </div>
            ) : null}
          </div>
        );
      })}
      <div className="ahenk-hero-slide">
        <div className="ahenk-hero-inner">
          <span className="ahenk-kicker">Ahenk Bilgi Teknolojileri</span>
          <p className="ahenk-hero-index">
            {String(idx + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
          </p>
          <h1>{current.title}</h1>
          <p>{current.subtitle}</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <AhenkSmartLink href={current.ctaHref || "/urunlerimiz"} className="ahenk-btn">
              {current.ctaLabel || "İncele"}
            </AhenkSmartLink>
            <a className="ahenk-btn ahenk-btn-ghost" href={wa} target="_blank" rel="noreferrer">
              WhatsApp {phone}
            </a>
          </div>
        </div>
      </div>
      {n > 1 ? (
        <>
          <button
            type="button"
            className="ahenk-hero-arrow ahenk-hero-prev"
            aria-label="Önceki slayt"
            onClick={() => setIdx((i) => (i - 1 + n) % n)}
          >
            ‹
          </button>
          <button
            type="button"
            className="ahenk-hero-arrow ahenk-hero-next"
            aria-label="Sonraki slayt"
            onClick={() => setIdx((i) => (i + 1) % n)}
          >
            ›
          </button>
          <div className="ahenk-hero-dots">
            {list.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                className={i === idx ? "is-active" : ""}
                aria-label={`${slide.title} slaytı`}
                onClick={() => setIdx(i)}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

export default function AhenkAgencyHome() {
  const site = useAhenkAgencySite();
  const yekpareSrc = safeAhenkImageUrl(site.yekpare.image, "");
  const aboutSrc = safeAhenkImageUrl(site.aboutImage, "");
  const sectors = site.softwareSectors.map(sectorForHome);
  const featured = sectors.slice(0, 3);
  const restSectors = sectors.slice(3);
  const wa = ahenkWhatsAppHref(
    site.whatsappTel || site.phoneTel,
    "Merhaba, yekpare.net hazır web sitesi / özel yazılım istiyorum.",
  );

  return (
    <AhenkAgencyChrome title={site.seoTitle} description={site.seoDescription}>
      <AhenkHomeSlider slides={site.slides} phone={site.phone} wa={wa} />

      <section className="ahenk-polis-home ahenk-split-promo" id="asistan-ai">
        <div className="ahenk-polis-home-visual" aria-hidden>
          <img src={AHENK_ASISTAN_IMG} alt="" />
        </div>
        <div className="ahenk-polis-home-copy">
          <span className="ahenk-kicker">7/24 otonom satış · WhatsApp + ses</span>
          <h2>Ahenk Asistan AI</h2>
          <p>
            Gelen çağrı ve WhatsApp cevapsız kalmaz. Asistan menüyü sunar, sipariş ve rezervasyonu alır, stok kontrol
            eder; mutfak, kurye, kasa ve yöneticiye anlık rol bildirimi düşer. ElevenLabs ses, OpenAI / Gemini anlama,
            yekpare.net entegrasyonu.
          </p>
          <ul>
            <li>Kişiye özel hitap ve çapraz satış önerisi.</li>
            <li>Toplu WhatsApp, AI chat ve otomatik arama kampanyası.</li>
            <li>Google Maps konum, Geliver kargo, sıfır kurulum senkronu.</li>
          </ul>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
            <Link href="/asistan-ai" className="ahenk-btn">
              Detaylı tanıtım
            </Link>
            <Link href="/whatsapp-cagri-merkezi" className="ahenk-btn ahenk-btn-ghost">
              WhatsApp çağrı merkezi
            </Link>
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
          <img src="/ahenk-polis-ai/hero.png" alt="" />
        </div>
        <div className="ahenk-polis-home-copy">
          <span className="ahenk-kicker">Yapım aşamasında · web · App Store · Play Store</span>
          <h2>Polis AI</h2>
          <p>
            Akıllı şehir ve bireysel güvenlik ekosistemi. Tek tuşla sessiz ihbar, yapay zeka risk analizi, 112’ye
            otomatik sesli anons ve PIN ile canlı konum / görüntü. Legal-tech avukat pazaryeri, kategorik ihbar (polis ·
            trafik · zabıta) ve siber / aile kalkanı.
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

      <section className="ahenk-section" id="urunler">
        <h2>Ürünlerimiz</h2>
          <p className="ahenk-lead">
            Asistan AI, WhatsApp çağrı merkezi, Polis AI, yekpare.net, Aiaddin, PBX CRM, Haber Merkezi, YekTube, Haberler
            ve web yazılımı.
          </p>
        <div className="ahenk-product-board">
          {AHENK_PRODUCTS.slice(0, 4).map((item) => (
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
        <div style={{ marginTop: 22, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/urunlerimiz" className="ahenk-btn">
            Tüm ürünler
          </Link>
          <Link href="/hizmetlerimiz" className="ahenk-btn ahenk-btn-ghost">
            Hizmetlerimiz
          </Link>
        </div>
      </section>

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
