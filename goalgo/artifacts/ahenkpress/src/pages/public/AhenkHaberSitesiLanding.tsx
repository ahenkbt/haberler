import { useState } from "react";
import { Link } from "wouter";
import { AhenkAgencyChrome, AhenkFaqList, AhenkPageHero } from "@/components/ahenk-agency/AhenkAgencyChrome";
import { useAhenkAgencySite } from "@/hooks/useAhenkAgencySite";
import { apiUrl } from "@/lib/apiBase";
import { ahenkPackageFromFields } from "@/lib/ahenkCampaignPrice";
import { ahenkWhatsAppHref } from "@/lib/ahenkAgencySeo";

type FormState = {
  publicationName: string;
  contactName: string;
  email: string;
  phone: string;
  desiredSlug: string;
  domain: string;
  city: string;
  website: string;
  message: string;
};

const EMPTY_FORM: FormState = {
  publicationName: "",
  contactName: "",
  email: "",
  phone: "",
  desiredSlug: "",
  domain: "",
  city: "",
  website: "",
  message: "",
};

export default function AhenkHaberSitesiLanding() {
  const site = useAhenkAgencySite();
  const pkg = ahenkPackageFromFields(site);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const wa = ahenkWhatsAppHref(
    site.whatsappTel || site.phoneTel,
    `Merhaba, haber sitesi yazılımı istiyorum. Paket ${pkg.display}.`,
  );
  const title = site.landingTitle || "Haber sitesi yazılımı — sunucu ve domain dahil";
  const lead =
    site.landingLead ||
    "Yapay zeka destekli haber sitesi yazılımı ve kurumsal web sitesi. Sunucu ve domain pakete dahildir. Teslim 1–3 gün.";
  const kicker = site.landingKicker || site.brandName;
  const cta = site.landingCtaLabel || "Teklif / başvuru";
  const features = site.landingFeatures?.length ? site.landingFeatures : [];

  function field<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const bodyLines = [
        `Yayın adı: ${form.publicationName}`,
        `İletişim: ${form.contactName}`,
        `Telefon: ${form.phone || "—"}`,
        `İstenen slug: ${form.desiredSlug || "—"}`,
        `Alan adı: ${form.domain || "—"}`,
        `Şehir: ${form.city || "—"}`,
        `Mevcut site: ${form.website || "—"}`,
        `Paket: ${pkg.display} · ${pkg.includes}`,
        "",
        form.message || "(Ek mesaj yok)",
      ];
      const res = await fetch(apiUrl("/api/site/contact"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.contactName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          subject: `Haber sitesi yazılımı — ${form.publicationName.trim()} · ${pkg.display}`.slice(0, 200),
          message: bodyLines.join("\n").slice(0, 8000),
          pageSource: "ahenk-haber-sitesi-basvuru",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Başvuru gönderilemedi.");
        return;
      }
      setDone(true);
      setForm(EMPTY_FORM);
    } catch {
      setError("Bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AhenkAgencyChrome
      title={`${title} | ${site.brandName}`}
      description={`${lead}`}
    >
      <AhenkPageHero
        crumb={
          <>
            <Link href="/">Anasayfa</Link> / Haber sitesi yazılımı
          </>
        }
        title={title}
        lead={lead}
        image={site.heroImage}
      />

      <section className="ahenk-section">
        <h2>Haber sitesi yazılımı özellikleri</h2>
        <p className="ahenk-lead">
          {site.brandName} — yapay zeka destekli haber sitesi yazılımı, haber scripti ve kurumsal web sitesi. Sunucu ve
          domain kampanya paketine dahildir.
        </p>
        <div className="ahenk-grid">
          {features.map((item) => (
            <article key={item.title} className="ahenk-card">
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ahenk-section" id="fiyat">
        <h2>Paket</h2>
        <p className="ahenk-lead">
          {pkg.note} Teslim 1–3 gün. {pkg.display}
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a className="ahenk-btn" href="#basvuru-formu">
            {cta}
          </a>
          <a className="ahenk-btn ahenk-btn-ghost" href={wa} target="_blank" rel="noreferrer">
            WhatsApp {site.phone}
          </a>
        </div>
      </section>

      <section className="ahenk-section" id="basvuru-formu">
        <div className="ahenk-split">
          <form className="ahenk-form" onSubmit={(e) => void submit(e)}>
            <h2>{cta}</h2>
            <p className="ahenk-lead">
              Haber sitesi veya kurumsal web sitesi için formu doldurun. Paket {pkg.display}, {pkg.includes}
            </p>
            {done ? (
              <div className="ahenk-msg ahenk-msg-ok">Başvurunuz alındı. {site.email} veya WhatsApp üzerinden dönüş yapılır.</div>
            ) : null}
            {error ? <div className="ahenk-msg ahenk-msg-err">{error}</div> : null}
            {!done ? (
              <>
                <input
                  required
                  value={form.publicationName}
                  onChange={(e) => field("publicationName", e.target.value)}
                  placeholder="Yayın / gazete / kurum adı"
                />
                <input
                  required
                  value={form.contactName}
                  onChange={(e) => field("contactName", e.target.value)}
                  placeholder="Yetkili ad soyad"
                />
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => field("email", e.target.value)}
                  placeholder="E-posta"
                />
                <input
                  value={form.phone}
                  onChange={(e) => field("phone", e.target.value)}
                  placeholder="Telefon"
                />
                <input
                  value={form.desiredSlug}
                  onChange={(e) => field("desiredSlug", e.target.value)}
                  placeholder="İstenen site slug (ornek-gazete)"
                />
                <input
                  value={form.domain}
                  onChange={(e) => field("domain", e.target.value)}
                  placeholder="Alan adı (varsa)"
                />
                <input
                  value={form.city}
                  onChange={(e) => field("city", e.target.value)}
                  placeholder="Şehir"
                />
                <input
                  value={form.website}
                  onChange={(e) => field("website", e.target.value)}
                  placeholder="Mevcut web sitesi"
                />
                <textarea
                  value={form.message}
                  onChange={(e) => field("message", e.target.value)}
                  placeholder="Ek not"
                />
                <button type="submit" className="ahenk-btn" disabled={loading}>
                  {loading ? "Gönderiliyor…" : "Başvuruyu gönder"}
                </button>
              </>
            ) : null}
          </form>
          <div>
            <h2>Paket</h2>
            <p className="ahenk-lead">{pkg.note}</p>
            <p>
              {pkg.campaign
                ? `2026 sonuna kadar ${pkg.display} kampanya (${pkg.listDisplay} yerine). 2027’den itibaren ${pkg.listDisplay}.`
                : `Güncel paket ${pkg.display}. ${pkg.includes}`}
            </p>
            <p style={{ marginTop: 16 }}>
              <a className="ahenk-btn" href={wa} target="_blank" rel="noreferrer">
                WhatsApp {site.phone}
              </a>
            </p>
            <p style={{ marginTop: 18 }}>
              <Link href="/haber-sitesi">Haber scripti</Link>
              {" · "}
              <Link href="/kurumsal-web-sitesi">Kurumsal web sitesi</Link>
              {" · "}
              <Link href="/iletisim">İletişim</Link>
            </p>
          </div>
        </div>
      </section>

      <section className="ahenk-section" style={{ paddingTop: 0 }}>
        <h2>Sık sorulan sorular</h2>
        <AhenkFaqList faqs={site.faqs} />
      </section>
    </AhenkAgencyChrome>
  );
}
