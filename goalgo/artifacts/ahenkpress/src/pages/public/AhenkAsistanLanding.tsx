import { Link } from "wouter";
import { AhenkAgencyChrome, AhenkFaqList, AhenkPageHero, AhenkSmartLink } from "@/components/ahenk-agency/AhenkAgencyChrome";
import { useAhenkAgencySite } from "@/hooks/useAhenkAgencySite";
import { ahenkWhatsAppHref } from "@/lib/ahenkAgencySeo";
import { AHENK_ASISTAN_IMG, AHENK_WHATSAPP_INFO } from "@/lib/ahenkProducts";

const ROLES = [
  { title: "Mutfak", text: "Sipariş detayı ve özel müşteri istekleri WhatsApp’a düşer." },
  { title: "Kurye", text: "Adres, Google Maps konumu ve teslimat notu." },
  { title: "Kasa / sekreterya", text: "Adisyon özeti ve ödeme yöntemi." },
  { title: "Yönetici", text: "Anlık ciro, sipariş adedi ve operasyon raporu." },
];

const WHY = [
  {
    title: "Sıfır çağrı ve mesaj kaybı",
    text: "Yoğun saatte bile yüzlerce gelen çağrı ve WhatsApp, insan doğallığında yanıtlanır.",
  },
  {
    title: "Akıllı sipariş ve rezervasyon",
    text: "Menüyü sunar, özel talebi alır, stok kontrol eder, rezervasyonu saniyeler içinde kapatır.",
  },
  {
    title: "Ciro artırıcı öneri motoru",
    text: "Geçmiş tercihleri hatırlar: “Ahmet Bey, geçen haftaki orta boy pizzanızdan yine ister misiniz?”",
  },
  {
    title: "Rol bazlı WhatsApp",
    text: "Her sipariş mutfak, kurye, kasa ve yönetici hatlarına kategorize edilerek gider.",
  },
];

const TECH = [
  { title: "OpenAI GPT-4o", text: "Niyet analizi, sipariş ayıklama, çapraz satış." },
  { title: "Google Gemini", text: "Hızlı bağlam ve yüksek hacimli metin." },
  { title: "ElevenLabs", text: "İnsan doğallığında Türkçe ses sentezi." },
  { title: "Deepgram / Whisper", text: "Çağrıyı anlık metne çevirir." },
  { title: "WhatsApp Cloud API", text: "Şablon, butonlu onay, canlı sohbet." },
  { title: "WebRTC / VoIP", text: "Asterisk / Twilio ile sesli asistan." },
  { title: "Google Maps", text: "Adres, mesafe ve süre." },
  { title: "Geliver + yekpare.net", text: "Kurye / kargo ve menü-stok senkronu." },
];

const STEPS = [
  { n: "1", title: "Müşteri ulaşır", text: "Yekpare.net üzerindeki numarayı arar veya WhatsApp’tan yazar." },
  { n: "2", title: "Yapay zeka karşılar", text: "Talebi dinler, sipariş veya rezervasyonu alır, panele kaydeder." },
  { n: "3", title: "Ekibe iletilir", text: "Mutfak, kurye, kasa ve yönetici WhatsApp’ına görev bazlı bildirim düşer." },
];

const FAQS = [
  {
    q: "Ahenk Asistan AI nedir?",
    a: "Yekpare.net ile entegre çalışan otonom ses ve WhatsApp asistanıdır. Gelen çağrı ve mesajı kaçırmaz; sipariş, rezervasyon ve CRM kaydını yapar; personelinize rol bazlı WhatsApp bildirimi gönderir.",
  },
  {
    q: "WhatsApp çağrı merkezi ayrı ürün mü?",
    a: "Aynı ailenin WhatsApp odaklı katmanıdır: toplu mesaj, kişiye özel hitap, AI chat ve otomatik arama. Detay: /whatsapp-cagri-merkezi.",
  },
  {
    q: "Kurulum gerekir mi?",
    a: "Yekpare.net işletme profili, menü ve hizmetlerle senkronize olur. Numara, WhatsApp Business ve ses hattı keşifte netleştirilir.",
  },
];

export default function AhenkAsistanLanding() {
  const site = useAhenkAgencySite();
  const wa = ahenkWhatsAppHref(
    site.whatsappTel || site.phoneTel,
    "Merhaba, Ahenk Asistan AI / WhatsApp çağrı merkezi için canlı demo istiyorum.",
  );

  return (
    <AhenkAgencyChrome
      title="Ahenk Asistan AI | 7/24 yapay zeka müşteri hizmetleri"
      description="Ahenk Asistan AI: gelen çağrı ve WhatsApp’ı otonom yanıtlar, sipariş ve rezervasyon alır, mutfak-kurye-kasa-yöneticiye anlık bildirim düşer. yekpare.net entegre. ElevenLabs, OpenAI, Gemini."
    >
      <AhenkPageHero
        crumb={
          <>
            <Link href="/">Anasayfa</Link> / <Link href="/urunlerimiz">Ürünlerimiz</Link> / Asistan AI
          </>
        }
        title="Müşteri hizmetlerinizi yapay zeka ile geleceğe taşıyın"
        lead="Telefonlarınız cevapsız kalmasın, işletmeniz 7/24 kesintisiz satış yapsın. Ahenk Asistan AI; çağrı, sipariş, rezervasyon ve CRM’i otonom yönetir."
        image={AHENK_ASISTAN_IMG}
      />

      <section className="ahenk-cta" id="dikkat">
        <div className="ahenk-cta-inner">
          <div>
            <span className="ahenk-kicker">Yekpare.net entegre</span>
            <h2>Kaçan her çağrı, rakibe kaptırılan kazançtır</h2>
            <p>
              Yoğun saatte yetişmeyen telefon, geç dönülen WhatsApp ve yanlış sipariş cironuzu eritir. Asistan AI
              bekletmez.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a className="ahenk-btn" href={wa} target="_blank" rel="noreferrer">
              WhatsApp demo
            </a>
            <Link href="/whatsapp-cagri-merkezi" className="ahenk-btn ahenk-btn-ghost">
              WhatsApp çağrı merkezi
            </Link>
          </div>
        </div>
      </section>

      <section className="ahenk-section">
        <div className="ahenk-split">
          <div>
            <h2>Neden Ahenk Asistan AI?</h2>
            <p className="ahenk-lead">
              7/24 çalışan, yorulmayan, müşterinizi ismen tanıyan dijital çalışan. Robotik ses değil: ElevenLabs
              diksiyonu; anlama: OpenAI GPT-4o ve Gemini.
            </p>
            <div className="ahenk-grid ahenk-grid-2" style={{ marginTop: 8 }}>
              {WHY.map((item) => (
                <article key={item.title} className="ahenk-card">
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
          <a href={AHENK_WHATSAPP_INFO} target="_blank" rel="noreferrer" className="ahenk-gallery-shot">
            <img src={AHENK_WHATSAPP_INFO} alt="Ahenk WhatsApp çağrı merkezi infografiği" width={1200} height={800} />
          </a>
        </div>
      </section>

      <section className="ahenk-section" id="roller">
        <h2>WhatsApp rol bildirimleri</h2>
        <p className="ahenk-lead">Alınan her sipariş ve rezervasyon ilgili personelin hattına kategorize düşer.</p>
        <div className="ahenk-grid ahenk-grid-2">
          {ROLES.map((item) => (
            <article key={item.title} className="ahenk-card">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ahenk-section" id="akis">
        <h2>3 adımda nasıl çalışır?</h2>
        <div className="ahenk-grid">
          {STEPS.map((item) => (
            <article key={item.n} className="ahenk-card">
              <span className="ahenk-kicker">Adım {item.n}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
        <p className="ahenk-lead" style={{ marginTop: 18 }}>
          Çağrı / mesaj → konuşmayı metne çevirme ve NLP → yekpare.net stok ve menü → kişiselleştirilmiş öneri → sesli
          veya WhatsApp onay → Ahenk paneline kayıt → rol bazlı WhatsApp dağıtımı.
        </p>
      </section>

      <section className="ahenk-section" id="teknoloji">
        <h2>Teknoloji yığını</h2>
        <div className="ahenk-grid ahenk-grid-2">
          {TECH.map((item) => (
            <article key={item.title} className="ahenk-card">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ahenk-section" id="sss">
        <h2>Sık sorulan sorular</h2>
        <AhenkFaqList faqs={FAQS} />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
          <a className="ahenk-btn" href={wa} target="_blank" rel="noreferrer">
            WhatsApp {site.phone}
          </a>
          <Link href="/iletisim" className="ahenk-btn ahenk-btn-ghost">
            İletişim / demo talebi
          </Link>
          <AhenkSmartLink href="/urunlerimiz" className="ahenk-btn ahenk-btn-light">
            Tüm ürünler
          </AhenkSmartLink>
        </div>
      </section>
    </AhenkAgencyChrome>
  );
}
