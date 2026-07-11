import { Link } from "wouter";
import { TravllaShell } from "../TravllaShell";
import { TravllaInnerBanner } from "../components/TravllaInnerBanner";
import { TURIZM } from "@/themes/turizm/turizmRoutes";

const BLOG = [
  { title: "Kapadokya: Balon turu rehberi", date: "10 Haziran 2026", excerpt: "En iyi kalkış saatleri, hava koşulları ve rezervasyon ipuçları." },
  { title: "Antalya körfez tekne rotaları", date: "5 Haziran 2026", excerpt: "Kekova, Kaş ve Phaselis için günlük tur önerileri." },
  { title: "Karadeniz yayla turları", date: "1 Haziran 2026", excerpt: "Ayder, Pokut ve Huser için 3 günlük program önerisi." },
];

const GALLERY = [
  { title: "Kapadokya", img: "https://images.unsplash.com/photo-1504198458649-3128b932f49e?w=800&q=80" },
  { title: "Antalya", img: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&q=80" },
  { title: "Trabzon", img: "https://images.unsplash.com/photo-1596484552834-066a48842388?w=800&q=80" },
  { title: "Bodrum", img: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&q=80" },
  { title: "İstanbul", img: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&q=80" },
  { title: "Fethiye", img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80" },
];

const FAQ = [
  { q: "Rezervasyon nasıl onaylanır?", a: "Talebiniz işletmeye iletilir; onay sonrası e-posta ve SMS bilgilendirmesi yapılır." },
  { q: "İptal koşulları nelerdir?", a: "Tur paketine göre değişir; detay sayfasında ve onay e-postasında belirtilir." },
  { q: "Ödeme nasıl yapılır?", a: "Şu an talep/ön rezervasyon akışı aktiftir; ödeme entegrasyonu işletme onayı sonrası tamamlanır." },
  { q: "Grup indirimi var mı?", a: "10+ kişilik gruplar için işletme üzerinden özel fiyat talep edebilirsiniz." },
];

const PRICING = [
  { name: "Standart Tur", price: "₺990+", features: ["Liste görünürlüğü", "Temel rezervasyon formu", "Destinasyon etiketi"] },
  { name: "Öne Çıkan", price: "₺2.490/ay", features: ["Ana sayfa vitrini", "Öncelikli sıralama", "Galeri + yorum modülü"] },
  { name: "Premium", price: "Teklif", features: ["Özel landing", "API entegrasyonu", "Öncelikli destek"] },
];

const COMPARE = [
  { name: "Kapadokya Demo", days: "2 gün", price: "₺4.500", rating: "4.8" },
  { name: "Antalya Tekne", days: "1 gün", price: "₺1.200", rating: "4.6" },
  { name: "Karadeniz Yayla", days: "3 gün", price: "₺6.800", rating: "4.9" },
];

const TEAM = [
  { name: "Elif Y.", role: "Tur operasyon", bio: "Kapadokya ve İç Anadolu rotaları" },
  { name: "Can D.", role: "Rezervasyon", bio: "7/24 talep ve iptal koordinasyonu" },
  { name: "Selin A.", role: "İşletme ilişkileri", bio: "Turizm sağlayıcı onboarding" },
];

type StaticSlug = "blog" | "galeri" | "sss" | "fiyat" | "karsilastirma" | "ekip";

const META: Record<StaticSlug, { title: string; intro: string }> = {
  blog: { title: "Turizm Blogu", intro: "Destinasyon ipuçları, sezon rehberleri ve Yekpare tur deneyimleri." },
  galeri: { title: "Fotoğraf Galerisi", intro: "Yekpare tur rotalarından seçilmiş kareler." },
  sss: { title: "Sık Sorulan Sorular", intro: "Tur rezervasyonu, iptal ve ödeme hakkında yanıtlar." },
  fiyat: { title: "Fiyatlandırma", intro: "Tur paketleri ve işletme listeleme planları." },
  karsilastirma: { title: "Tur Karşılaştırma", intro: "Popüler demo turlarını yan yana karşılaştırın." },
  ekip: { title: "Ekibimiz", intro: "Yekpare tur operasyon ve destek ekibi." },
};

function TravllaStaticPage({ slug }: { slug: StaticSlug }) {
  const page = META[slug];

  return (
    <TravllaShell page="static">
      <TravllaInnerBanner title={page.title} crumbs={[{ label: "Turlar", href: TURIZM.turlar.home }, { label: page.title }]} />
      <div className="container" style={{ padding: "2rem 1rem 3rem" }}>
        <p style={{ maxWidth: 640, marginBottom: "1.5rem" }}>{page.intro}</p>

        {slug === "blog" &&
          BLOG.map((item) => (
            <article key={item.title} className="trv-static-card">
              <time>{item.date}</time>
              <h3>{item.title}</h3>
              <p>{item.excerpt}</p>
            </article>
          ))}

        {slug === "galeri" && (
          <div className="trv-gallery-grid">
            {GALLERY.map((item) => (
              <figure key={item.title} className="trv-gallery-item">
                <img src={item.img} alt={item.title} loading="lazy" />
                <figcaption>{item.title}</figcaption>
              </figure>
            ))}
          </div>
        )}

        {slug === "sss" &&
          FAQ.map((item) => (
            <details key={item.q} className="trv-faq-item">
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}

        {slug === "fiyat" && (
          <div className="trv-pricing-grid">
            {PRICING.map((plan) => (
              <div key={plan.name} className="trv-pricing-card">
                <h3>{plan.name}</h3>
                <p className="trv-pricing-price">{plan.price}</p>
                <ul>
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <Link href="/isletme-basvuru" className="site-button">
                  Başvur
                </Link>
              </div>
            ))}
          </div>
        )}

        {slug === "karsilastirma" && (
          <div className="trv-compare-table-wrap">
            <table className="trv-compare-table">
              <thead>
                <tr>
                  <th>Tur</th>
                  <th>Süre</th>
                  <th>Fiyat</th>
                  <th>Puan</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>{row.days}</td>
                    <td>{row.price}</td>
                    <td>{row.rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {slug === "ekip" && (
          <div className="trv-team-grid">
            {TEAM.map((member) => (
              <div key={member.name} className="trv-team-card">
                <div className="trv-team-avatar">{member.name.charAt(0)}</div>
                <h3>{member.name}</h3>
                <p className="trv-team-role">{member.role}</p>
                <p>{member.bio}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </TravllaShell>
  );
}

export default function TravllaBlog() {
  return <TravllaStaticPage slug="blog" />;
}
export function TravllaGaleri() {
  return <TravllaStaticPage slug="galeri" />;
}
export function TravllaSSS() {
  return <TravllaStaticPage slug="sss" />;
}
export function TravllaFiyatlandirma() {
  return <TravllaStaticPage slug="fiyat" />;
}
export function TravllaKarsilastirma() {
  return <TravllaStaticPage slug="karsilastirma" />;
}
export function TravllaEkip() {
  return <TravllaStaticPage slug="ekip" />;
}
