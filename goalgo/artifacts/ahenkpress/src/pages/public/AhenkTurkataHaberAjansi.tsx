import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AhenkAgencyChrome, AhenkPageHero } from "@/components/ahenk-agency/AhenkAgencyChrome";
import { TurkataAboutBody } from "@/pages/public/TurkataStaticPages";
import { apiUrl } from "@/lib/apiBase";
import { fetchPublicJson } from "@/lib/fetchPublicJson";
import { TURKATA_ABOUT_INTRO, TURKATA_ABOUT_TAGLINE, TURKATA_ABOUT_TITLE, TURKATA_ORIGIN } from "@/lib/turkataHaber";

type PublicNewsSite = {
  id: number;
  slug: string;
  name: string;
  domain: string;
  url: string;
  logo: string;
  logoBg?: string;
};

const THA_SUBSCRIBER_HEADING =
  "Ahenk Bilgi Teknolojileri Haber Alt yapısını kullanan THA TürkAta Haber Ajansı abonesi haber siteleri";

function ThaSubscriberSites() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/hm/public/news-sites"],
    queryFn: async () => {
      const { ok, status, data: body } = await fetchPublicJson<{ sites?: PublicNewsSite[] }>(
        apiUrl("/api/hm/public/news-sites"),
      );
      if (!ok) throw new Error(`HTTP ${status}`);
      return Array.isArray(body?.sites) ? body.sites : [];
    },
    staleTime: 60_000,
    retry: 2,
  });
  const sites = data ?? [];
  // Logo dosyası henüz yoksa (404) kartta site adı görünsün.
  const [brokenLogos, setBrokenLogos] = useState<Record<number, true>>({});

  return (
    <section className="ahenk-section" aria-labelledby="tha-subscriber-sites">
      <h2 id="tha-subscriber-sites" className="ahenk-subscriber-heading">{THA_SUBSCRIBER_HEADING}</h2>
      {isLoading ? <p className="ahenk-lead">Yükleniyor…</p> : null}
      {isError ? <p className="ahenk-lead">Haber siteleri şu anda listelenemedi.</p> : null}
      {!isLoading && !isError && sites.length === 0 ? <p className="ahenk-lead">Yayında haber sitesi yok.</p> : null}
      {sites.length > 0 ? (
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
      ) : null}
    </section>
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
          <TurkataAboutBody />
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
