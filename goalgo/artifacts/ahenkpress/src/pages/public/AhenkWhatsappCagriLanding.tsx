import { Link } from "wouter";
import { AhenkAgencyChrome, AhenkPageHero } from "@/components/ahenk-agency/AhenkAgencyChrome";
import { useAhenkAgencySite } from "@/hooks/useAhenkAgencySite";
import { ahenkWhatsAppHref } from "@/lib/ahenkAgencySeo";
import { AHENK_WHATSAPP_IMG, AHENK_WHATSAPP_INFO } from "@/lib/ahenkProducts";

const MODULES = [
  {
    title: "Toplu WhatsApp mesajları",
    text: "Binlerce kişiye anında ulaşın. Kampanya yönetimi, analiz ve rapor.",
  },
  {
    title: "Kişiye özel hitap",
    text: "Müşteri adıyla dinamik selamlama, profile göre kişiselleştirme, yüksek memnuniyet.",
  },
  {
    title: "Yapay zeka canlı chat",
    text: "Anlık otomatik yanıt, akıllı yönlendirme, insan–makine hibrit operasyon.",
  },
  {
    title: "Kampanya ve otomatik arama",
    text: "Kendi kampanyanız, giden otomatik arama (dialer), temsilci dağıtımı.",
  },
];

const INTEGRATIONS = [
  { title: "ElevenLabs", text: "Gerçekçi Türkçe ses" },
  { title: "Google Maps", text: "Rota ve konum" },
  { title: "Geliver kargo", text: "Lojistik takibi" },
  { title: "OpenAI", text: "Zeki metin / GPT" },
  { title: "Gemini", text: "Gelişmiş AI" },
  { title: "yekpare.net", text: "İşletme ve menü senkronu" },
];

export default function AhenkWhatsappCagriLanding() {
  const site = useAhenkAgencySite();
  const wa = ahenkWhatsAppHref(
    site.whatsappTel || site.phoneTel,
    "Merhaba, WhatsApp çağrı merkezi / Ahenk Asistan AI hakkında bilgi almak istiyorum.",
  );

  return (
    <AhenkAgencyChrome
      title="WhatsApp çağrı merkezi | Ahenk Asistan AI"
      description="Devrim niteliğinde WhatsApp çağrı merkezi: toplu mesaj, kişiye özel hitap, yapay zeka chat, otomatik arama. ElevenLabs, OpenAI, Gemini, Geliver, yekpare.net."
    >
      <AhenkPageHero
        crumb={
          <>
            <Link href="/">Anasayfa</Link> / <Link href="/urunlerimiz">Ürünlerimiz</Link> / WhatsApp çağrı merkezi
          </>
        }
        title="Devrim niteliğinde WhatsApp çağrı merkezi"
        lead="Geleceğin iletişim platformu: hepsi bir arada. Toplu mesaj, kişiselleştirme, AI chat ve otomatik arama — Ahenk Asistan AI ailesi."
        image={AHENK_WHATSAPP_IMG}
      />

      <section className="ahenk-section">
        <figure className="ahenk-premium-figure">
          <img src={AHENK_WHATSAPP_INFO} alt="WhatsApp çağrı merkezi infografiği" width={1600} height={1000} />
          <figcaption>Toplu WhatsApp, kişiye özel hitap, AI chat, kampanya ve otomatik arama.</figcaption>
        </figure>
      </section>

      <section className="ahenk-section">
        <h2>Dört çekirdek modül</h2>
        <div className="ahenk-grid ahenk-grid-2">
          {MODULES.map((item) => (
            <article key={item.title} className="ahenk-card">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ahenk-section">
        <h2>Güçlü sistem entegrasyonları</h2>
        <div className="ahenk-grid">
          {INTEGRATIONS.map((item) => (
            <article key={item.title} className="ahenk-card">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
          <a className="ahenk-btn" href={wa} target="_blank" rel="noreferrer">
            WhatsApp {site.phone}
          </a>
          <Link href="/asistan-ai" className="ahenk-btn ahenk-btn-ghost">
            Ahenk Asistan AI
          </Link>
          <Link href="/cagri-merkezi-crm" className="ahenk-btn ahenk-btn-light">
            PBX CRM
          </Link>
        </div>
      </section>
    </AhenkAgencyChrome>
  );
}
