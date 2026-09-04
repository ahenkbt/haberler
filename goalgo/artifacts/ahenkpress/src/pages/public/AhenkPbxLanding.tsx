import { useEffect, useState } from "react";
import { Link } from "wouter";
import { AhenkAgencyChrome, AhenkFaqList, AhenkPageHero } from "@/components/ahenk-agency/AhenkAgencyChrome";
import { useAhenkAgencySite } from "@/hooks/useAhenkAgencySite";
import { ahenkWhatsAppHref } from "@/lib/ahenkAgencySeo";
import { AHENK_PHOTOS } from "@/lib/ahenkAgencySite";
import { formatTry, PBX_BASE_PER_AGENT_TL, PBX_MAX_AGENTS, PBX_TIER_DISCOUNT_TL, pbxPriceTiers } from "@/lib/ahenkPbxPricing";

const PBX_APP_URL = "https://pbx.goalgo.org/";

const GALLERY = [
  {
    src: "/ahenk-pbx-gallery/01-gosterge-peri.png",
    title: "Gösterge paneli ve Peri",
    caption:
      "Canlı temsilci tablosu, personel performansı ve Peri — şans perin: arama, görüşme dakikası ve satış hedefleriyle AI danış.",
  },
  {
    src: "/ahenk-pbx-gallery/02-listeli-arama.png",
    title: "Listeli arama",
    caption:
      "Kampanya listesinden tek tıkla ara; il filtresi, Excel (CSV) indirme, not, randevu, sonuç ve yönetici notu aynı satırda.",
  },
  {
    src: "/ahenk-pbx-gallery/03-canli-temsilciler.png",
    title: "Canlı temsilciler",
    caption: "Aktif çağrı, cevaplanan arama, çalışma süresi ve mola sayısı; temsilci durumları gerçek zamanlı izlenir.",
  },
  {
    src: "/ahenk-pbx-gallery/04-freepbx.png",
    title: "FreePBX ve dahililer",
    caption: "Bağlantı, dahili, temsilci ve numaralar. Yeni dahili ekleme, aktif/pasif durum ve santral yönetimi.",
  },
  {
    src: "/ahenk-pbx-gallery/05-veri-kazima.png",
    title: "Veri kazıma",
    caption:
      "Google Haritalar, OpenStreetMap ve sektör/il bazlı arama ile lead toplama. Yarıçap, anahtar kelime ve kazımayı başlat.",
  },
  {
    src: "/ahenk-pbx-gallery/06-geliver-kargo.png",
    title: "Geliver kargo",
    caption: "Satış teyidinden sonra kargo kesimi. yekpare.net işletme paneli ile aynı Geliver API hesabı.",
  },
  {
    src: "/ahenk-pbx-gallery/07-ai-satis-temsilcisi.png",
    title: "AI satış temsilcisi",
    caption:
      "ElevenLabs Agents → SIP → FreePBX. NVIDIA NIM, OpenAI, Gemini ve DeepSeek yedekleriyle otomatik giden arama.",
  },
] as const;

const FEATURES = [
  {
    title: "Peri — şans perin",
    text: "ÇM CRM içindeki yapay zeka asistanı. Temsilciye günlük arama, görüşme dakikası ve satış hedefini gösterir; “AI danış” ile konuşur, tempo tutar, arkadaş gibi motive eder.",
  },
  {
    title: "Canlı gösterge paneli",
    text: "Temsilci durumu (çağrıda / çevrimiçi / çevrimdışı / mola), arama sayısı, konuşma süresi ve pasta grafikte personel performansı anlık görünür.",
  },
  {
    title: "Listeli arama",
    text: "Kampanya rehberinden manuel softphone ile ara. WhatsApp şablonu görüşmede gider; not, sonuç, randevu ve yönetici notu otomatik kaydolur.",
  },
  {
    title: "AI arama / AI satış temsilcisi",
    text: "Yapay zeka kişiyi arar, konuşur; kapanmazsa canlı temsilciye aktarır. Native motor pbx.goalgo.org, ses ve model, satış & aktarım sekmeleri.",
  },
  {
    title: "WhatsApp mesajları",
    text: "Gelen/giden WhatsApp, şablon gönderimi ve çağrı aynı operasyon masasında. Müşteri tek kanaldan kaçmaz.",
  },
  {
    title: "FreePBX ve SIP",
    text: "Dahili numaralar, bağlantı, temsilci ataması ve hatlar. Üst barda SIP hazır göstergesi; tarayıcıdan arama.",
  },
  {
    title: "Veri kazıma",
    text: "Google Maps ve OpenStreetMap’ten il, yarıçap, sektör ve anahtar kelimeyle işletme listesi çekin; kampanyaya aktarın.",
  },
  {
    title: "Kampanya, satış ve kargo",
    text: "Kampanya listeleri, satış kaydı ve Geliver kargo: teyit sonrası aynı hesaptan kargo kesilir (yekpare.net ile ortak API).",
  },
  {
    title: "CRM: müşteri, bayi, grup",
    text: "Müşterilerim, kullanıcılar, bayiler ve gruplar. Arama geçmişi, aktiflik talepleri ve yönetici notu tek üründe.",
  },
  {
    title: "SSS (AI) ve konuşma metni",
    text: "AI sık sorulan sorular bilgi tabanı, konuşma metni / senaryo ve AI Editör ile temsilci script’i.",
  },
  {
    title: "Mola ve temsilci oturumu",
    text: "Müsait / meşgul / mola, dahili numarası ve çıkış. Kuyruk ve IVR gelen çağrıyı doğru ekibe düşürür.",
  },
  {
    title: "Excel ve rapor",
    text: "Listeden CSV indir, günlük döküm, aktif çağrı ve cevaplanma oranı. Yönetici canlı izler.",
  },
];

const FAQS = [
  {
    q: "Ahenk PBX / ÇM CRM nedir?",
    a: "Ahenk Bilgi Teknolojileri’nin yapay zeka destekli çağrı merkezi CRM yazılımıdır (ekranda ÇM CRM). Temsilci, FreePBX, listeli arama, WhatsApp, veri kazıma, satış, kargo ve Peri asistanı tek üründe. Giriş adresi pbx.goalgo.org’dur.",
  },
  {
    q: "Peri kimdir?",
    a: "Peri, ÇM CRM içindeki şans perisi / AI danışmandır. Temsilciye arama sayısı, görüşme dakikası ve satış hedefini hatırlatır; “Yaz bana, birlikte bakalım” ve AI danış ile sohbet eder. Motivasyon ve günlük tempo için tasarlanmıştır.",
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
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const wa = ahenkWhatsAppHref(
    site.whatsappTel || site.phoneTel,
    "Merhaba, yapay zeka destekli çağrı merkezi CRM (Ahenk PBX / Peri) hakkında bilgi almak istiyorum.",
  );

  useEffect(() => {
    if (openIndex == null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenIndex(null);
      if (event.key === "ArrowRight") setOpenIndex((i) => (i == null ? i : (i + 1) % GALLERY.length));
      if (event.key === "ArrowLeft") setOpenIndex((i) => (i == null ? i : (i - 1 + GALLERY.length) % GALLERY.length));
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [openIndex]);

  const openItem = openIndex != null ? GALLERY[openIndex] : null;

  return (
    <AhenkAgencyChrome
      title="Yapay zeka destekli çağrı merkezi CRM | Ahenk PBX"
      description="ÇM CRM: Peri AI asistanı, listeli arama, FreePBX, WhatsApp, veri kazıma, AI satış temsilcisi ve Geliver kargo. pbx.goalgo.org"
    >
      <AhenkPageHero
        crumb={
          <>
            <Link href="/">Anasayfa</Link> / Çağrı merkezi CRM
          </>
        }
        title="Yapay zeka destekli çağrı merkezi CRM"
        lead="ÇM CRM; temsilci, FreePBX, listeli arama, WhatsApp, veri kazıma ve Peri — şans perin asistanını tek yazılımda birleştirir. Giriş: pbx.goalgo.org."
        image={AHENK_PHOTOS.callCenter}
      />

      <section className="ahenk-section" id="peri">
        <h2>Peri — şans perin</h2>
        <div className="ahenk-split ahenk-peri">
          <div>
            <p className="ahenk-lead">
              Peri, çağrı merkezi temsilcisinin yanındaki yapay zeka arkadaşıdır. Gösterge panelinde kendini tanıtır:
              “Benim adım Peri. Ben senin şans perinim.” Günlük arama sayısı (ör. hedef 250–300), görüşme dakikası ve
              satış hedefini (ör. 5+) kartlarda tutar; eksik kalanı söyler, tempo tut der.
            </p>
            <ul className="ahenk-peri-list">
              <li>AI danış: sohbet kutusu, “Yaz bana, birlikte bakalım.”</li>
              <li>Hedef kartları: arama, görüşme dakikası, satış.</li>
              <li>Canlı temsilci tablosu ve pasta grafikle aynı ekranda.</li>
              <li>Her sayfada yüzen AI danış düğmesi — listeli arama, FreePBX, kazıma, kargo.</li>
            </ul>
          </div>
          <button
            type="button"
            className="ahenk-gallery-shot"
            onClick={() => setOpenIndex(0)}
            aria-label="Peri ekran görüntüsünü büyüt"
          >
            <img src={GALLERY[0].src} alt={GALLERY[0].title} width={1280} height={800} />
          </button>
        </div>
      </section>

      <section className="ahenk-section" id="ozellikler">
        <h2>Özellikler</h2>
        <p className="ahenk-lead">
          Klasik santral + Excel yerine tek operasyon masası. Çağrı düşer, müşteri kartı açılır, not yazılır, WhatsApp
          gider, kargo kesilir. Yapay zeka hem Peri ile temsilciye hem AI satış temsilcisi ile hatta yardım eder.
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

      <section className="ahenk-section" id="galeri">
        <h2>Ekran görüntüleri</h2>
        <p className="ahenk-lead">
          ÇM CRM’den gerçek paneller: gösterge ve Peri, listeli arama, canlı temsilciler, FreePBX, veri kazıma, Geliver
          kargo ve AI satış temsilcisi. Görsele tıklayınca büyür.
        </p>
        <div className="ahenk-gallery">
          {GALLERY.map((item, index) => (
            <figure key={item.src}>
              <button type="button" onClick={() => setOpenIndex(index)} aria-label={`${item.title} görselini aç`}>
                <img src={item.src} alt={item.title} width={1280} height={800} loading="lazy" />
              </button>
              <figcaption>
                <strong>{item.title}</strong>
                <span>{item.caption}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {openItem ? (
        <div
          className="ahenk-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={openItem.title}
          onClick={() => setOpenIndex(null)}
        >
          <button type="button" className="ahenk-lightbox-close" onClick={() => setOpenIndex(null)}>
            Kapat
          </button>
          {openIndex != null && GALLERY.length > 1 ? (
            <>
              <button
                type="button"
                className="ahenk-lightbox-nav ahenk-lightbox-prev"
                aria-label="Önceki görsel"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenIndex((openIndex - 1 + GALLERY.length) % GALLERY.length);
                }}
              >
                ‹
              </button>
              <button
                type="button"
                className="ahenk-lightbox-nav ahenk-lightbox-next"
                aria-label="Sonraki görsel"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenIndex((openIndex + 1) % GALLERY.length);
                }}
              >
                ›
              </button>
            </>
          ) : null}
          <figure onClick={(event) => event.stopPropagation()}>
            <img src={openItem.src} alt={openItem.title} />
            <figcaption>
              <strong>{openItem.title}</strong>
              {openItem.caption}
            </figcaption>
          </figure>
        </div>
      ) : null}

      <section className="ahenk-section" id="paketler">
        <h2>Paketler</h2>
        <p className="ahenk-lead">
          Kullanım hakkı temsilci sayısına göre. Detay tablo aşağıda; teklif için WhatsApp.
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
          <Link href="/hizmetlerimiz" className="ahenk-btn ahenk-btn-light">
            Hizmetlerimiz
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
