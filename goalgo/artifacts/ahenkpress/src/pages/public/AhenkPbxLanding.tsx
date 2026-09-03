import { Link } from "wouter";
import { AhenkAgencyChrome, AhenkFaqList, AhenkPageHero } from "@/components/ahenk-agency/AhenkAgencyChrome";
import { useAhenkAgencySite } from "@/hooks/useAhenkAgencySite";
import { ahenkWhatsAppHref } from "@/lib/ahenkAgencySeo";
import { AHENK_PHOTOS } from "@/lib/ahenkAgencySite";
import { formatTry, PBX_BASE_PER_AGENT_TL, PBX_MAX_AGENTS, PBX_TIER_DISCOUNT_TL, pbxPriceTiers } from "@/lib/ahenkPbxPricing";

const PBX_APP_URL = "https://pbx.goalgo.org/";

const FEATURES = [
  {
    title: "Temsilci oturumu",
    text: "Çağrı merkezi ajanları tarayıcıdan giriş yapar; dahili, kuyruk ve durum (müsait / meşgul / mola) tek panelde.",
  },
  {
    title: "Kuyruk ve IVR",
    text: "Gelen çağrıları kuyruğa alın, sesli karşılama ve tuş menüsüyle doğru ekibe yönlendirin.",
  },
  {
    title: "CRM kayıtları",
    text: "Müşteri kartı, görüşme notu, sonuç kodu (disposition) ve geçmiş aramalar aynı ekranda; takip kaybolmaz.",
  },
  {
    title: "Yapay zeka destekli operasyon",
    text: "Çağrı özeti, yönlendirme ve kampanya akışında yapay zeka katmanı; temsilci işi kapanır, kayıt CRM’de kalır.",
  },
  {
    title: "WhatsApp ve ses",
    text: "Gelen/giden arama ile mesajlaşma aynı operasyon masasında; müşteri tek kanaldan kaçmaz.",
  },
  {
    title: "Canlı izleme ve rapor",
    text: "Kuyruk bekleme, temsilci performansı, kampanya sonucu ve günlük döküm yöneticide anlık görünür.",
  },
];

const FAQS = [
  {
    q: "Ahenk PBX nedir?",
    a: "Ahenk Bilgi Teknolojileri’nin yapay zeka destekli çağrı merkezi CRM yazılımıdır. Temsilci, kuyruk, müşteri kaydı, arama ve rapor tek üründe toplanır. Giriş adresi pbx.goalgo.org’dur.",
  },
  {
    q: "Kullanım ücreti nasıl hesaplanır?",
    a: `Taban fiyat temsilci başı ${formatTry(PBX_BASE_PER_AGENT_TL)} / aydır. 10 temsilcide ${formatTry(7000)}, 20 temsilcide ${formatTry(13000)} (14.000 değil), 30 temsilcide ${formatTry(18000)} (21.000 değil). Her +10 temsilcide temsilci başı ${formatTry(PBX_TIER_DISCOUNT_TL)} düşer. Paketler 10’ar adımla ${PBX_MAX_AGENTS} temsilciye kadar çıkar.`,
  },
  {
    q: "50 temsilciden sonrası?",
    a: "Standart paketler 50 temsilciye kadardır. Daha büyük operasyon için WhatsApp’tan özel teklif alın.",
  },
  {
    q: "Kurulum ve numaralar dahil mi?",
    a: "Aylık tutar yazılım kullanım hakkıdır. SIP trunk, operatör hattı ve numaralar ayrı faturalanır. Keşifte netleştirilir.",
  },
];

export default function AhenkPbxLanding() {
  const site = useAhenkAgencySite();
  const tiers = pbxPriceTiers();
  const wa = ahenkWhatsAppHref(
    site.whatsappTel || site.phoneTel,
    "Merhaba, yapay zeka destekli çağrı merkezi CRM (Ahenk PBX) hakkında bilgi almak istiyorum.",
  );

  return (
    <AhenkAgencyChrome
      title="Yapay zeka destekli çağrı merkezi CRM | Ahenk PBX"
      description="Ahenk PBX: yapay zeka destekli çağrı merkezi CRM yazılımı. Temsilci başı 700 TL, 10 kişide 7.000 TL, 20 kişide 13.000 TL, 30 kişide 18.000 TL. Her +10 temsilcide 50 TL indirim, 50 ajana kadar."
    >
      <AhenkPageHero
        crumb={
          <>
            <Link href="/">Anasayfa</Link> / Çağrı merkezi CRM
          </>
        }
        title="Yapay zeka destekli çağrı merkezi CRM"
        lead="Ahenk PBX; temsilci, kuyruk, müşteri kaydı ve raporlamayı tek yazılımda birleştirir. Kullanım pbx.goalgo.org üzerinden, aylık temsilci paketiyle."
        image={AHENK_PHOTOS.callCenter}
      />

      <section className="ahenk-price" id="fiyat">
        <div className="ahenk-price-inner">
          <div>
            <span className="ahenk-kicker">Kullanım ücreti</span>
            <strong>{formatTry(PBX_BASE_PER_AGENT_TL)} / temsilci</strong>
            <p>
              10 temsilci {formatTry(7000)} · 20 temsilci {formatTry(13000)} · 30 temsilci {formatTry(18000)}. Her +10
              temsilcide kişi başı {formatTry(PBX_TIER_DISCOUNT_TL)} düşer, {PBX_MAX_AGENTS} ajana kadar.
            </p>
          </div>
          <a className="ahenk-btn" href={wa} target="_blank" rel="noreferrer">
            WhatsApp ile teklif
          </a>
        </div>
      </section>

      <section className="ahenk-section">
        <h2>Ne işe yarar?</h2>
        <p className="ahenk-lead">
          Klasik santral + Excel CRM yerine tek operasyon masası: çağrı düşer, müşteri kartı açılır, not yazılır, sonuç
          kodu basılır. Yapay zeka özet ve yönlendirmede temsilciye yardım eder.
        </p>
        <div className="ahenk-grid">
          {FEATURES.map((item) => (
            <article key={item.title} className="ahenk-card">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ahenk-section" id="paketler">
        <h2>Aylık paketler</h2>
        <p className="ahenk-lead">
          Taban {formatTry(PBX_BASE_PER_AGENT_TL)} / temsilci. Hacim arttıkça birim fiyat düşer — 20 kişilik pakette
          14.000 TL değil {formatTry(13000)}; 30 kişide 21.000 TL değil {formatTry(18000)}.
        </p>
        <div className="ahenk-table-wrap">
          <table className="ahenk-table">
            <thead>
              <tr>
                <th>Temsilci</th>
                <th>Kişi başı / ay</th>
                <th>Aylık toplam</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((row) => (
                <tr key={row.agents}>
                  <td>{row.agents} temsilci</td>
                  <td>{formatTry(row.perAgentTl)}</td>
                  <td>
                    <strong>{formatTry(row.monthlyTl)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ahenk-lead" style={{ marginTop: 16 }}>
          Örnek: 10×700 = 7.000 · 20×650 = 13.000 · 30×600 = 18.000 · 40×550 = 22.000 · 50×500 = 25.000.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
          <a className="ahenk-btn" href={wa} target="_blank" rel="noreferrer">
            WhatsApp {site.phone}
          </a>
          <a className="ahenk-btn ahenk-btn-ghost" href={PBX_APP_URL} target="_blank" rel="noreferrer">
            pbx.goalgo.org giriş
          </a>
          <Link href="/hizmetler" className="ahenk-btn ahenk-btn-light">
            Çağrı merkezi hizmetleri
          </Link>
        </div>
      </section>

      <section className="ahenk-section" id="sss">
        <h2>Sık sorulan sorular</h2>
        <AhenkFaqList faqs={FAQS} />
      </section>
    </AhenkAgencyChrome>
  );
}
