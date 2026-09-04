import { Link } from "wouter";
import { AhenkAgencyChrome, AhenkFaqList, AhenkPageHero } from "@/components/ahenk-agency/AhenkAgencyChrome";
import { useAhenkAgencySite } from "@/hooks/useAhenkAgencySite";
import { ahenkWhatsAppHref } from "@/lib/ahenkAgencySeo";

const PDF_HREF = "/ahenk-polis-ai/Polis-AI-Presentation.pdf";

const VISUALS = [
  {
    src: "/ahenk-polis-ai/hero.png",
    title: "Akıllı şehir güvenliği",
    caption: "Tek tuşla sessiz ihbar, canlı konum ve yapay zeka destekli 112 bildirimi.",
  },
  {
    src: "/ahenk-polis-ai/citizen.png",
    title: "Vatandaş yanında",
    caption: "Panik anında konuşamasanız bile konum, ses ve görüntü güvenli şekilde iletilir.",
  },
  {
    src: "/ahenk-polis-ai/city.png",
    title: "Tek platform",
    caption: "Acil durum, hukuk rehberi, saha takibi ve siber kalkan aynı ekosistemde.",
  },
] as const;

const BENEFITS = [
  {
    title: "Tek tuşla yardım",
    text: "Acil butona basınca konumunuz ve ortam kaydı başlar. Adres tarif etmek zorunda kalmazsınız.",
  },
  {
    title: "112’ye net özet",
    text: "Sistem durumu sizin yerinize anlatır. Operatör uygulamayı indirmeden canlı yayına bakabilir.",
  },
  {
    title: "Doğru ekibe gider",
    text: "İhbar polis, trafik veya zabıta olarak ayrılır. Tek hatta yığılma azalır.",
  },
  {
    title: "Yanınızda hukuk",
    text: "Gözaltı, kaza veya ifade öncesi doğrulanmış avukatla görüntülü görüşme.",
  },
  {
    title: "Aile ve siber kalkan",
    text: "Şüpheli mesaj ve bağlantıları ayıklar; sevdikleriniz için konum çemberi kurar.",
  },
  {
    title: "Saha kaydı",
    text: "Olay yerinde ses tutanağa dönüşür, görüntü ve plaka analizi hızlanır.",
  },
];

const FLOW = [
  { n: "1", title: "Yardım istersiniz", text: "Tek tuş. Konum, ses ve kamera arka planda çalışır." },
  { n: "2", title: "Asistan anlar", text: "Ortam sesi ve stres düzeyine bakarak aciliyeti tahminler." },
  { n: "3", title: "112 haberdar olur", text: "Kısa sesli özet ve dört haneli erişim kodu iletilir." },
  { n: "4", title: "Canlıya bağlanır", text: "Operatör erişim kodunu yazar; harita ve yayını görür." },
];

const TECH = [
  { title: "Flutter", text: "iPhone, Android ve web aynı üründe." },
  { title: "Canlı yayın", text: "Konum, ses ve görüntü anlık akar." },
  { title: "OpenAI", text: "Durumu anlar, özet üretir." },
  { title: "ElevenLabs", text: "112’ye doğal Türkçe anons." },
];

const FAQS = [
  {
    q: "Polis AI nedir?",
    a: "Ahenk Bilgi Teknolojileri’nin yapım aşamasındaki güvenlik uygulamasıdır. Acil yardım, hukuk rehberi ve saha takibini tek yerde toplar. App Store, Play Store ve web — çok yakında.",
  },
  {
    q: "Resmi emniyet uygulaması mı?",
    a: "Hayır. Ahenk BT projesidir. Hedef 112 ve ilgili kurumlarla birlikte çalışmaktır. Bu sayfa kamu duyurusu değildir.",
  },
  {
    q: "Uygulamayı ne zaman indiririm?",
    a: "Yapım aşamasındadır. Gelişmeler için WhatsApp veya bilgi@ahenk.net.tr.",
  },
];

export default function AhenkPolisAiLanding() {
  const site = useAhenkAgencySite();
  const wa = ahenkWhatsAppHref(
    site.whatsappTel || site.phoneTel,
    "Merhaba, Polis AI hakkında bilgi almak istiyorum.",
  );

  return (
    <AhenkAgencyChrome
      title="Polis AI | Akıllı şehir ve bireysel güvenlik | Ahenk BT"
      description="Polis AI: tek tuşla acil yardım, 112 bildirimi, hukuk rehberi ve siber kalkan. Ahenk Bilgi Teknolojileri. Yapım aşamasında — web, App Store, Play Store."
    >
      <AhenkPageHero
        crumb={
          <>
            <Link href="/">Anasayfa</Link> / <Link href="/urunlerimiz">Ürünlerimiz</Link> / Polis AI
          </>
        }
        title="Güvenli şehirler, bilinçli bireyler"
        lead="Polis AI, panik anında sizin yerinize konuşur. Konumu iletir, 112’yi haberdar eder, doğru ekibi çağırır. Yapım aşamasında — web, App Store ve Play Store."
        image="/ahenk-polis-ai/hero.png"
      />

      <section className="ahenk-section" id="gorseller">
        <h2>Polis AI</h2>
        <p className="ahenk-lead">
          Ahenk Bilgi Teknolojileri’nin akıllı şehir ve bireysel güvenlik uygulaması. Vatandaşa anlık yardım; sahaya
          net görüntü.
        </p>
        <div className="ahenk-gallery ahenk-polis-visuals">
          {VISUALS.map((item) => (
            <figure key={item.src}>
              <a href={item.src} target="_blank" rel="noreferrer">
                <img src={item.src} alt={item.title} width={1600} height={900} />
              </a>
              <figcaption>
                <strong>{item.title}</strong>
                <span>{item.caption}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="ahenk-section" id="nedir">
        <h2>Size ne kazandırır?</h2>
        <div className="ahenk-grid">
          {BENEFITS.map((item) => (
            <article key={item.title} className="ahenk-card">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ahenk-section" id="akis">
        <h2>Nasıl işler?</h2>
        <p className="ahenk-lead">Dört sade adım. Teknik kurulum yok; operatör tarayıcıdan bakar.</p>
        <div className="ahenk-grid ahenk-grid-2">
          {FLOW.map((item) => (
            <article key={item.n} className="ahenk-card">
              <span className="ahenk-kicker">{item.n}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ahenk-section" id="teknoloji">
        <h2>Kullanılan teknolojiler</h2>
        <p className="ahenk-lead">Arka planda güçlü altyapı; önde sade bir deneyim.</p>
        <div className="ahenk-grid ahenk-grid-2">
          {TECH.map((item) => (
            <article key={item.title} className="ahenk-card">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ahenk-section" id="sunum">
        <h2>Daha fazlası</h2>
        <p className="ahenk-lead">Sunum dosyası ve hedef yayın adresi. Resmi kamu sistemi değildir.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a className="ahenk-btn" href={wa} target="_blank" rel="noreferrer">
            WhatsApp {site.phone}
          </a>
          <a className="ahenk-btn ahenk-btn-ghost" href={PDF_HREF} target="_blank" rel="noreferrer">
            Sunum PDF
          </a>
        </div>
      </section>

      <section className="ahenk-section" id="sss">
        <h2>Sık sorulan sorular</h2>
        <AhenkFaqList faqs={FAQS} />
      </section>
    </AhenkAgencyChrome>
  );
}
