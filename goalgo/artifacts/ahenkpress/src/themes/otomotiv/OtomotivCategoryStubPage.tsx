import { Link } from "wouter";
import type { OtomotivCategorySlug } from "./otomotivHubConfig";
import { CATEGORY_HERO, OTOMOTIV_DISCLAIMER } from "./otomotivHubConfig";
import { OTOMOTIV } from "./otomotivRoutes";
import { YekpareFooterDisclaimer } from "@/components/YekpareFooterDisclaimer";
import "@/styles/bookingCoreTurizm.css";
import "@/styles/otomotivHub.css";

type Props = {
  slug: OtomotivCategorySlug;
  phaseNote?: string;
};

/** Kategori stub sayfaları — Phase 2'de gerçek listeleme gelecek */
export function OtomotivCategoryStubPage({ slug, phaseNote }: Props) {
  const hero = CATEGORY_HERO[slug];

  return (
    <div className="oto-stub" data-category={slug}>
      <section
        className="bc-hub-hero bc-hub-hero--bus bc-hub-hero--category oto-stub__hero"
        style={{ backgroundImage: `url(${hero.bg})` }}
      >
        <div className="bc-hub-hero__overlay bc-hub-hero__overlay--light" />
        <div className="bc-hub-hero__inner bc-hub-hero__inner--bus">
          <h1 className="bc-hub-hero__title bc-hub-hero__title--dark">{hero.title}</h1>
          <p className="bc-hub-hero__subtitle">{hero.subtitle}</p>
        </div>
      </section>

      <div className="oto-stub__body">
        <div className="oto-stub__placeholder">
          <p className="oto-stub__phase">
            {phaseNote ?? "Bu bölüm Phase 2 ile aktif olacak — ilan listesi, filtre ve detay sayfaları."}
          </p>
          <p className="oto-stub__hint">
            İşletmeler abonelikle listelenir; satış ve randevu doğrudan ilgili firmada tamamlanır.
          </p>
          <div className="oto-stub__actions">
            <Link href={OTOMOTIV.hub} className="oto-hub__cta oto-hub__cta--ghost">
              ← Otomotiv ana sayfa
            </Link>
            <Link href="/isletme-basvuru" className="oto-hub__cta oto-hub__cta--primary">
              İşletme başvurusu
            </Link>
          </div>
        </div>
        <aside className="oto-stub__sidebar">
          <h3>Yakında</h3>
          <ul>
            <li>Marka / model filtre</li>
            <li>Şehir ve fiyat aralığı</li>
            <li>İlan kartları ve detay</li>
            <li>Haritalardan işletme vitrini</li>
          </ul>
        </aside>
      </div>

      <aside className="oto-hub__disclaimer-wrap">
        <YekpareFooterDisclaimer className="oto-hub__disclaimer" />
        <p className="oto-hub__disclaimer-extra">{OTOMOTIV_DISCLAIMER}</p>
      </aside>
    </div>
  );
}
