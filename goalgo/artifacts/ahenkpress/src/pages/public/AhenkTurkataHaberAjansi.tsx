import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AhenkAgencyChrome, AhenkPageHero } from "@/components/ahenk-agency/AhenkAgencyChrome";
import { apiUrl } from "@/lib/apiBase";
import { fetchPublicJson } from "@/lib/fetchPublicJson";
import { TURKATA_ABOUT_INTRO, TURKATA_ABOUT_TAGLINE, TURKATA_ABOUT_TITLE, TURKATA_ORIGIN } from "@/lib/turkataHaber";
import { TANITIM_TEXT } from "@/lib/tanitimBulteni";

type PublicNewsSite = {
  id: number;
  slug: string;
  name: string;
  domain: string;
  url: string;
  logo: string;
  logoBg?: string;
  il?: string;
  plate?: string;
  region?: string;
};

type PublicNewsSitesBody = { sites?: PublicNewsSite[]; ilSites?: PublicNewsSite[] };

const THA_SUBSCRIBER_HEADING =
  "Ahenk Bilgi Teknolojileri Haber Alt yapısını kullanan THA TürkAta Haber Ajansı abonesi haber siteleri";
/** 81 İl Haber Ağı (2026-10-09): il siteleri (<il>.fix.tc) ayrı grup. */
const THA_IL_SITES_HEADING = "İl Siteleri";

function SiteLogoGrid({ sites }: { sites: PublicNewsSite[] }) {
  // Logo dosyası henüz yoksa (404) kartta site adı görünsün.
  const [brokenLogos, setBrokenLogos] = useState<Record<number, true>>({});
  return (
    <ul className="ahenk-subscriber-logos">
      {sites.map((site) => (
        <li key={site.id}>
          <a className="ahenk-subscriber-logo" href={site.url} target="_blank" rel="noopener noreferrer">
            <span className="ahenk-subscriber-mark" style={site.logoBg ? { background: site.logoBg } : undefined}>
              {site.logo && !brokenLogos[site.id] ? (
                <img
                  src={site.logo}
                  alt={`${site.name} logosu`}
                  loading="lazy"
                  decoding="async"
                  onError={() => setBrokenLogos((prev) => ({ ...prev, [site.id]: true }))}
                />
              ) : (
                <span className="ahenk-subscriber-initial">{site.name}</span>
              )}
            </span>
            <span className="ahenk-subscriber-name">{site.name}</span>
            <span className="ahenk-subscriber-domain">{site.domain}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function ThaSubscriberSites() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/hm/public/news-sites"],
    queryFn: async () => {
      const { ok, status, data: body } = await fetchPublicJson<PublicNewsSitesBody>(apiUrl("/api/hm/public/news-sites"));
      if (!ok) throw new Error(`HTTP ${status}`);
      return {
        sites: Array.isArray(body?.sites) ? body.sites : [],
        ilSites: Array.isArray(body?.ilSites) ? body.ilSites : [],
      };
    },
    staleTime: 60_000,
    retry: 2,
  });
  const sites = data?.sites ?? [];
  const ilSites = data?.ilSites ?? [];

  return (
    <>
      <section className="ahenk-section" aria-labelledby="tha-subscriber-sites">
        <h2 id="tha-subscriber-sites" className="ahenk-subscriber-heading">{THA_SUBSCRIBER_HEADING}</h2>
        {isLoading ? <p className="ahenk-lead">Yükleniyor…</p> : null}
        {isError ? <p className="ahenk-lead">Haber siteleri şu anda listelenemedi.</p> : null}
        {!isLoading && !isError && sites.length === 0 ? <p className="ahenk-lead">Yayında haber sitesi yok.</p> : null}
        {sites.length > 0 ? <SiteLogoGrid sites={sites} /> : null}
      </section>
      {ilSites.length > 0 ? (
        <section className="ahenk-section" aria-labelledby="tha-il-sites">
          <h2 id="tha-il-sites" className="ahenk-subscriber-heading">{THA_IL_SITES_HEADING}</h2>
          <SiteLogoGrid sites={ilSites} />
          <p className="ahenk-lead">
            <a href="https://gundemi.org/iller" target="_blank" rel="noopener noreferrer">
              81 İl Haber Ağı — tüm iller
            </a>
          </p>
        </section>
      ) : null}
    </>
  );
}

/** Tanıtım metni (kullanıcı 2026-10-08): ajans sayfasının giriş yazısı, logo ızgarası altında. */
function TanitimBulteni() {
  const t = TANITIM_TEXT;
  return (
    <div className="ahenk-tanitim">
      <span className="ahenk-tanitim-eyebrow">Tanıtım</span>
      <h2>{t.title}</h2>
      <p className="ahenk-tanitim-sal">{t.salutation}</p>
      {t.intro.map((p) => (
        <p key={p}>{p}</p>
      ))}
      <h3>{t.advTitle}</h3>
      <ul className="ahenk-tanitim-cards">
        {t.advantages.map(([h, p]) => (
          <li key={h}>
            <strong>{h}</strong>
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <div className="ahenk-tanitim-outro">
        {t.outro.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
    </div>
  );
}

export default function AhenkTurkataHaberAjansi() {
  return (
    <AhenkAgencyChrome title="TürkAta Haber Ajansı | Ahenk Bilgi Teknolojileri" description={TURKATA_ABOUT_INTRO[0]}>
      <AhenkPageHero
        crumb={
          <>
            <Link href="/">Anasayfa</Link> / TürkAta Haber Ajansı
          </>
        }
        title={TURKATA_ABOUT_TITLE}
        lead={TURKATA_ABOUT_TAGLINE}
      />
      <section className="ahenk-section ahenk-detail">
        <div>
          <TanitimBulteni />
          <p>
            <a className="ahenk-btn" href={TURKATA_ORIGIN}>
              turkatahaber.com — resmi site
            </a>
          </p>
        </div>
      </section>
      <ThaSubscriberSites />
      <section className="ahenk-cta">
        <div className="ahenk-cta-inner">
          <div>
            <h2>Güncel haberler</h2>
            <p>Ajansın kanonik sitesi turkatahaber.com’dur. Haberler bu adreste yayınlanır.</p>
          </div>
          <a className="ahenk-btn" href={TURKATA_ORIGIN}>
            turkatahaber.com
          </a>
        </div>
      </section>
    </AhenkAgencyChrome>
  );
}
