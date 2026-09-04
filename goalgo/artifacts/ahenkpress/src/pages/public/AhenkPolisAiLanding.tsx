import { Link } from "wouter";
import { AhenkAgencyChrome, AhenkFaqList, AhenkPageHero } from "@/components/ahenk-agency/AhenkAgencyChrome";
import { useAhenkAgencySite } from "@/hooks/useAhenkAgencySite";
import { ahenkWhatsAppHref } from "@/lib/ahenkAgencySeo";

const PDF_HREF = "/ahenk-polis-ai/Polis-AI-Presentation.pdf";
const POLISAI_WEB = "https://polisai.net";

const VISUALS = [
  {
    src: "/ahenk-polis-ai/01-nedir.jpg",
    title: "Polis AI nedir?",
    caption: "Akıllı kamu ve güvenlik platformu: acil müdahale, hukuki rehberlik, saha takibi.",
  },
  {
    src: "/ahenk-polis-ai/02-vatandas-poster.jpg",
    title: "Vatandaş ve saha",
    caption: "Sesli acil durum, canlı konum, interaktif hukuk, siber suç önleme — App Store ve Play Store çok yakında.",
  },
  {
    src: "/ahenk-polis-ai/03-isbirligi.jpg",
    title: "Tek akıllı çözüm",
    caption: "Saha güvenliğinden adli analize; KVKK, etik ve hedeflenen resmi entegrasyon protokolleri.",
  },
] as const;

const PROBLEMS = [
  {
    title: "Acil durum gecikmeleri",
    text: "Adres tarifindeki zorluk ve panik anında sesli iletişim kuramama, müdahaleyi geciktirir.",
  },
  {
    title: "Kategorize edilemeyen ihbarlar",
    text: "Polis, trafik ve zabıta ihbarlarının tek hatta yığılması süreçleri yavaşlatır.",
  },
  {
    title: "Hukuki desteğe yetersiz erişim",
    text: "Olay anında veya sonrasında vatandaş anlık, yasal çerçevede yönlendirme bulamaz.",
  },
  {
    title: "Dijital tehditler",
    text: "Oltalama (phishing), siber dolandırıcılık ve dijital taciz vakaları artıyor.",
  },
];

const MODULES = [
  {
    title: "Otomatik 112 AI anonsu",
    text: "Risk analizi sonrası 112’ye otomatik, detaylı sesli bildirim. Operatör kurulum yapmaz.",
  },
  {
    title: "polisai.net PIN protokolü",
    text: "4 haneli PIN ile canlı GPS, ses ve görüntüye tarayıcıdan erişim. Uygulama yüklemeye gerek yok.",
  },
  {
    title: "Legal-Tech pazaryeri",
    text: "Baro sicili ve e-Devlet ile doğrulanmış avukatlar; görüntülü danışmanlık ve dekont onaylı ödeme.",
  },
  {
    title: "Kategorik ihbar akışı",
    text: "Polis, trafik ve zabıta ayrımı; onaylanmış olayların anonim şehir timeline’ı.",
  },
  {
    title: "360° siber ve aile kalkanı",
    text: "Dolandırıcılık tespiti, şüpheli SMS/link analizi ve aile bireyleri için coğrafi çit.",
  },
  {
    title: "Saha destek modülleri",
    text: "Olay yeri tutanak (ses → kayıt), görsel analitik, siber devriye — yapım aşamasında.",
  },
];

const PIN_STEPS = [
  {
    n: "1",
    title: "Sessiz ihbar",
    text: "Vatandaş acil butonuna basar; arka planda GPS, ses ve kamera kaydı başlar.",
  },
  {
    n: "2",
    title: "AI analizi",
    text: "Yapay zeka ortam sesini, gürültüyü ve stres seviyesini analiz eder; olay şiddetini tahminler.",
  },
  {
    n: "3",
    title: "112 açıklaması",
    text: "Sistem 112’yi arayarak duruma dair sesli bilgi verir ve 4 haneli PIN iletir (ör. 8492).",
  },
  {
    n: "4",
    title: "Canlı yayın",
    text: "Operatör polisai.net adresine PIN girerek canlı konum, ses ve görüntüye erişir.",
  },
];

const LEGAL = [
  "Doğrulanmış avukat: baro sicil numarası ve e-Devlet entegrasyonu.",
  "Gözaltı, kaza veya ifade öncesi anlık sesli / görüntülü görüşme.",
  "Avukat IBAN ekler; vatandaş havale yapıp dekont yükler.",
  "Avukat onayladığında görüşme odası otomatik açılır.",
];

const CITY_CATS = [
  { title: "Polis", text: "Asayiş, hırsızlık, kavga, şüpheli durumlar." },
  { title: "Trafik", text: "Kaza, hatalı park, yol tıkanıklığı." },
  { title: "Zabıta", text: "Seyyar satıcı, gürültü, fiyat ve hijyen denetimi." },
];

const REVENUE = [
  { ch: "B2C", mod: "Plus / Pro: siber kalkan, aile takibi, otomatik 112 anonsu", pay: "Aylık / yıllık abonelik" },
  { ch: "Legal-Tech", mod: "Avukat görüşmesi ve randevu altyapısı", pay: "İşlem başı komisyon / liste ücreti" },
  { ch: "B2B", mod: "Özel güvenlik ve sigorta için AI analiz API", pay: "SaaS / lisans" },
  { ch: "B2G", mod: "Zabıta ve trafik saha yönetim panelleri", pay: "Kurumsal lisans ve bakım" },
];

const STACK = [
  { title: "Mobil", text: "Flutter (Dart) — iOS ve Android tek kod tabanı. App Store ve Play Store yayın hedefi." },
  { title: "Web paneli", text: "polisai.net — Flutter Web / React; sıfır kurulumlu PIN erişim paneli." },
  { title: "Canlı veri", text: "Firebase / Supabase ve WebRTC (Agora / LiveKit) ile konum ve medya akışı." },
  { title: "Yapay zeka", text: "OpenAI ve ElevenLabs ile ses analizi ve doğal Türkçe anons." },
];

const ROADMAP = [
  { faz: "Faz 1 — MVP", text: "Flutter tabanlı mobil uygulamanın temel acil buton ve konum akışı." },
  { faz: "Faz 2 — PIN", text: "112 AI anonsu ve polisai.net 4 haneli PIN doğrulama paneli." },
  { faz: "Faz 3 — Legal-Tech", text: "Avukat doğrulama ve dekont onaylı randevu / görüşme odası." },
  { faz: "Faz 4 — Ölçek", text: "B2B güvenlik firmaları ve belediye / zabıta panelleri." },
];

const TRUST = [
  { title: "KVKK ve gizlilik", text: "Kişisel verilerin korunması mevzuatına uygun tasarım; acil kayıtların güvenli sunucuda tutulması." },
  { title: "Etik ve tarafsızlık", text: "Önyargı ve ayrımcılıktan arındırılmış model kullanımı hedefi." },
  { title: "Resmi entegrasyon", text: "EGM, 112 ve İçişleri birimleriyle koordinasyon protokolü — proje hedefi, henüz canlı kamu sistemi değildir." },
];

const FAQS = [
  {
    q: "Polis AI nedir?",
    a: "Ahenk Bilgi Teknolojileri’nin yapım aşamasındaki akıllı şehir ve bireysel güvenlik ekosistemidir. Acil ihbar, 112 PIN protokolü, legal-tech avukat pazaryeri, kategorik şehir akışı ve siber/aile kalkanını tek platformda toplar. Yayın: web, App Store ve Play Store (çok yakında).",
  },
  {
    q: "Resmi emniyet uygulaması mı?",
    a: "Hayır. Polis AI, Ahenk BT projesidir. Hedef; 112, EGM ve ilgili kamu birimleriyle entegrasyon protokolleridir. Bu sayfa bir kamu resmi duyurusu değildir.",
  },
  {
    q: "PIN protokolü nasıl işler?",
    a: "Acil buton sessiz kayıt başlatır, yapay zeka ortamı analiz eder, 112’ye sesli özet ve 4 haneli PIN iletilir. Operatör polisai.net’e PIN girerek canlı veriye bakar; uygulama yüklemez.",
  },
  {
    q: "Uygulama ne zaman iner?",
    a: "Yapım aşamasındadır. App Store ve Google Play rozetleri “çok yakında”dır. Gelişmeleri WhatsApp veya bilgi@ahenk.net.tr üzerinden takip edebilirsiniz.",
  },
];

export default function AhenkPolisAiLanding() {
  const site = useAhenkAgencySite();
  const wa = ahenkWhatsAppHref(
    site.whatsappTel || site.phoneTel,
    "Merhaba, Polis AI (akıllı şehir ve bireysel güvenlik) projesi hakkında bilgi almak istiyorum.",
  );

  return (
    <AhenkAgencyChrome
      title="Polis AI | Akıllı şehir ve bireysel güvenlik | Ahenk BT"
      description="Polis AI: yapım aşamasında akıllı kamu ve güvenlik platformu. 112 PIN protokolü, legal-tech, kategorik ihbar, siber kalkan. Web, App Store ve Play Store."
    >
      <AhenkPageHero
        crumb={
          <>
            <Link href="/">Anasayfa</Link> / Polis AI
          </>
        }
        title="Polis AI — akıllı şehir ve bireysel güvenlik"
        lead="Ahenk Bilgi Teknolojileri projesi. Yapay zeka destekli operasyonel şehir güvenliği, 112 entegrasyonu ve legal-tech pazaryeri. Yapım aşamasında — web, App Store, Play Store."
        image={VISUALS[1].src}
      />

      <section className="ahenk-price" id="durum">
        <div className="ahenk-price-inner">
          <div>
            <span className="ahenk-kicker">Yapım aşamasında · 2026</span>
            <strong>Web · App Store · Play Store</strong>
            <p>
              Pasif asistandan aktif operasyonel platforma: otomatik 112 AI anonsu, polisai.net PIN, avukat pazaryeri ve
              şehir timeline’ı.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a className="ahenk-btn" href={PDF_HREF} download>
              Sunum PDF
            </a>
            <a className="ahenk-btn ahenk-btn-ghost" href={wa} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          </div>
        </div>
      </section>

      <section className="ahenk-section" id="gorseller">
        <h2>Görseller</h2>
        <p className="ahenk-lead">Proje afişleri ve “Polis AI nedir?” infografiği.</p>
        <div className="ahenk-gallery ahenk-polis-visuals">
          {VISUALS.map((item) => (
            <figure key={item.src}>
              <a href={item.src} target="_blank" rel="noreferrer">
                <img src={item.src} alt={item.title} width={1200} height={800} />
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
        <h2>Polis AI nedir?</h2>
        <p className="ahenk-lead">
          Acil müdahale, hukuki rehberlik, kamu güvenliği ve siber korumayı tek çatıda toplayan akıllı kamu ve güvenlik
          platformu. Vatandaşa anlık çözüm; saha ekiplerine operasyonel takip. Henüz yayınlanmamıştır.
        </p>
        <div className="ahenk-grid">
          {MODULES.map((item) => (
            <article key={item.title} className="ahenk-card">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ahenk-section" id="sorun">
        <h2>Günümüz güvenlik ve müdahale sorunları</h2>
        <div className="ahenk-grid ahenk-grid-2">
          {PROBLEMS.map((item) => (
            <article key={item.title} className="ahenk-card">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ahenk-section" id="pin">
        <h2>Acil durum ve PIN protokolü</h2>
        <p className="ahenk-lead">
          İnovatif protokol: sessiz ihbar → AI analizi → 112 sesli özet + PIN → {POLISAI_WEB.replace("https://", "")}{" "}
          canlı yayın.
        </p>
        <div className="ahenk-grid ahenk-grid-2">
          {PIN_STEPS.map((item) => (
            <article key={item.n} className="ahenk-card">
              <span className="ahenk-kicker">Aşama {item.n}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ahenk-section" id="hukuk">
        <h2>Legal-Tech ve hukuk pazaryeri</h2>
        <p className="ahenk-lead">
          Baro onaylı avukatlardan anlık görüntülü danışmanlık. Ödeme dekont onayına bağlıdır; onayda oda açılır.
        </p>
        <ul className="ahenk-peri-list">
          {LEGAL.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section className="ahenk-section" id="sehir">
        <h2>Kategorik ihbar ve canlı şehir akışı</h2>
        <div className="ahenk-grid">
          {CITY_CATS.map((item) => (
            <article key={item.title} className="ahenk-card">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
        <p className="ahenk-lead" style={{ marginTop: 18 }}>
          Onaylanmış ve anonimleştirilmiş olaylar şehir haritası / timeline’da şeffaf yayımlanır.
        </p>
      </section>

      <section className="ahenk-section" id="gelir">
        <h2>İş ve gelir modeli</h2>
        <div className="ahenk-table-wrap">
          <table className="ahenk-table">
            <thead>
              <tr>
                <th>Kanal</th>
                <th>Modül</th>
                <th>Ödeme</th>
              </tr>
            </thead>
            <tbody>
              {REVENUE.map((row) => (
                <tr key={row.ch}>
                  <td>
                    <strong>{row.ch}</strong>
                  </td>
                  <td>{row.mod}</td>
                  <td>{row.pay}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ahenk-section" id="teknoloji">
        <h2>Teknoloji yığını</h2>
        <div className="ahenk-grid ahenk-grid-2">
          {STACK.map((item) => (
            <article key={item.title} className="ahenk-card">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ahenk-section" id="yol-haritasi">
        <h2>Yol haritası</h2>
        <div className="ahenk-grid ahenk-grid-2">
          {ROADMAP.map((item) => (
            <article key={item.faz} className="ahenk-card">
              <h3>{item.faz}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ahenk-section" id="guven">
        <h2>Kritik güven protokolleri</h2>
        <div className="ahenk-grid">
          {TRUST.map((item) => (
            <article key={item.title} className="ahenk-card">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ahenk-section" id="sunum">
        <h2>Sunum dosyası</h2>
        <p className="ahenk-lead">
          16:9 proje sunumu PDF (Polis AI Presentation). Kapak, sorun, çözüm, PIN, legal-tech, gelir, yığın ve yol
          haritası.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a className="ahenk-btn" href={PDF_HREF} target="_blank" rel="noreferrer">
            PDF’yi aç / indir
          </a>
          <a className="ahenk-btn ahenk-btn-ghost" href={POLISAI_WEB} target="_blank" rel="noreferrer">
            polisai.net
          </a>
          <Link href="/" className="ahenk-btn ahenk-btn-light">
            Anasayfa
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
