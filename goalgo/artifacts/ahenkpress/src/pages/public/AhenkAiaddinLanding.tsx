import { Link } from "wouter";
import { AhenkAgencyChrome, AhenkFaqList, AhenkPageHero } from "@/components/ahenk-agency/AhenkAgencyChrome";
import { useAhenkAgencySite } from "@/hooks/useAhenkAgencySite";
import { ahenkWhatsAppHref } from "@/lib/ahenkAgencySeo";
import { AHENK_PHOTOS } from "@/lib/ahenkAgencySite";

const AIADDIN_URL = "https://aiaddin.net/";
const AIADDIN_PRICING_URL = "https://aiaddin.net/pricing";

const FEATURES = [
  {
    title: "Monaco editör",
    text: "VS Code kısayolları, çoklu sekme, dosya gezgini ve Open VSX eklenti desteği. Kurulum yok; tarayıcıda açılır.",
  },
  {
    title: "Gerçek terminal",
    text: "xterm.js + WebSocket ile canlı shell. Konteyner oturumu, komut ve dağıtım aynı pencerede.",
  },
  {
    title: "Semantik kod bağlamı",
    text: "Proje dosyaları vektör indekslenir; model ilgili kodu kendisi bulur. @file, @folder, @code, @docs, @git.",
  },
  {
    title: "Composer agent",
    text: "Çok dosyalı otonom üretim, commit ve dağıtım pipeline’ı. Inline edit, chat ve tam uygulama ajanı.",
  },
  {
    title: "BYOK — anahtarı siz getirin",
    text: "Claude, GPT, Gemini, DeepSeek, OpenRouter. Kendi anahtarınızla Fast Request kredisi düşmez; AES-256-GCM saklanır.",
  },
  {
    title: "Tek tık dağıtım",
    text: "Cloudflare Pages/Workers, Hostinger, Vercel, Netlify. yekpare.net ve ahenk.net.tr gibi canlı sitelere pipeline.",
  },
];

const PLANS = [
  {
    name: "Free / Starter",
    price: "$0 / ay",
    note: "Bireysel deneme ve açık kaynak.",
    items: [
      "NVIDIA NIM modelleri (ücretsiz katman)",
      "50 Fast Request / ay",
      "BYOK açık",
      "1 aktif çalışma alanı",
      "GitHub senkronizasyonu",
    ],
  },
  {
    name: "Pro Developer",
    price: "$20 / ay",
    note: "Frontier modeller ve doğrudan dağıtım.",
    items: [
      "500 Fast Request / ay",
      "Claude 3.5 · GPT-4o · DeepSeek",
      "@web canlı arama",
      "GitHub / GitLab / Bitbucket",
      "Cloudflare ve Hostinger dağıtımı",
    ],
  },
  {
    name: "Enterprise / Team",
    price: "Özel",
    note: "Takım, MCP ve SLA.",
    items: [
      "Sınırsız / özel kredi",
      "Çok kullanıcılı çalışma alanları",
      "Paylaşımlı BYOK",
      "Özel MCP sunucuları",
      "SSO, denetim günlüğü, SLA",
    ],
  },
];

const FAQS = [
  {
    q: "Aiaddin nedir?",
    a: "Aiaddin, kurumsal yapay zeka IDE ve DevOps platformudur. Monaco editör, gerçek terminal, semantik bağlam ve Composer ajanı tarayıcıda; kendi API anahtarınızla (BYOK) Claude, GPT veya DeepSeek kullanırsınız.",
  },
  {
    q: "Fiyatlar nerede geçerli?",
    a: "Aiaddin aboneliği aiaddin.net/pricing üzerinden dolar cinsindendir (Free $0, Pro $20, Enterprise özel). Fast Request, platform anahtarıyla yapılan AI isteğidir; BYOK isteklerinde kredi düşmez. Güncel tablo için aiaddin.net/pricing.",
  },
  {
    q: "Ahenk sitelerine dağıtım var mı?",
    a: "Evet. Cloudflare Pages/Workers ve benzeri hedeflere tek tık dağıtım; yekpare.net ve ahenk.net.tr gibi canlı projelere pipeline kurulabilir.",
  },
];

export default function AhenkAiaddinLanding() {
  const site = useAhenkAgencySite();
  const wa = ahenkWhatsAppHref(
    site.whatsappTel || site.phoneTel,
    "Merhaba, Aiaddin (kurumsal yapay zeka IDE) hakkında bilgi almak istiyorum.",
  );

  return (
    <AhenkAgencyChrome
      title="Aiaddin | Kurumsal yapay zeka IDE ve DevOps"
      description="Aiaddin: tarayıcıda Monaco, gerçek terminal, semantik kod bağlamı ve Composer ajanı. BYOK ile Claude / GPT / DeepSeek. Free $0, Pro $20/ay, Enterprise özel. Dağıtım: Cloudflare, yekpare.net, ahenk.net.tr."
    >
      <AhenkPageHero
        crumb={
          <>
            <Link href="/">Anasayfa</Link> / Aiaddin
          </>
        }
        title="Kurumsal yapay zeka IDE & DevOps"
        lead="Kurulum yok. Ekip için paylaşımlı çalışma alanları, BYOK ve dağıtım pipeline’ları tek platformda — aiaddin.net."
        image={AHENK_PHOTOS.code}
      />

      <section className="ahenk-section">
        <h2>Cursor seviyesinde, tarayıcıda</h2>
        <p className="ahenk-lead">
          Monaco, terminal, semantik bağlam ve ajan aynı üründe. Kural motoru (.aiaddinrules / .cursorrules), Git
          kontrolü ve 20+ entegrasyon.
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

      <section className="ahenk-section" id="fiyat">
        <h2>Paketler</h2>
        <p className="ahenk-lead">
          Kaynak:{" "}
          <a href={AIADDIN_PRICING_URL} target="_blank" rel="noreferrer">
            aiaddin.net/pricing
          </a>
          . PayTR veya Stripe. Ahenk üzerinden kurumsal onboarding için WhatsApp.
        </p>
        <div className="ahenk-grid">
          {PLANS.map((plan) => (
            <article key={plan.name} className="ahenk-card">
              <span className="ahenk-kicker">{plan.name}</span>
              <h3 style={{ marginTop: 8 }}>{plan.price}</h3>
              <p>{plan.note}</p>
              <ul className="ahenk-check-list">
                {plan.items.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
          <a className="ahenk-btn" href={AIADDIN_URL} target="_blank" rel="noreferrer">
            aiaddin.net
          </a>
          <a className="ahenk-btn ahenk-btn-ghost" href={AIADDIN_PRICING_URL} target="_blank" rel="noreferrer">
            Fiyatlandırma
          </a>
          <a className="ahenk-btn ahenk-btn-light" href={wa} target="_blank" rel="noreferrer">
            WhatsApp {site.phone}
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
