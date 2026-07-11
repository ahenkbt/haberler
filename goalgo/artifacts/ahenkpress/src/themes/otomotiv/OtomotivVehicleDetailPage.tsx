import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { ArrowLeft, Calendar, Gauge, Fuel, MapPin, Phone, Settings2 } from "lucide-react";
import type { OtomotivCategorySlug } from "./otomotivHubConfig";
import { OTOMOTIV_DISCLAIMER } from "./otomotivHubConfig";
import { OTOMOTIV } from "./otomotivRoutes";
import { YekpareFooterDisclaimer } from "@/components/YekpareFooterDisclaimer";
import { SigortaLeadForm } from "./SigortaLeadForm";
import {
  fetchOtomotivListingBySlug,
  formatVehiclePrice,
  listingPhotoUrl,
  type OtomotivVehicleListing,
  type VehicleListingMode,
} from "./lib/vehicleListings";
import "@/styles/bookingCoreTurizm.css";
import "@/styles/otomotivHub.css";

function slugToMode(slug: OtomotivCategorySlug): VehicleListingMode {
  if (slug === "sifir") return "sifir";
  if (slug === "ikinci-el") return "ikinci-el";
  return "galeri";
}

function listHome(slug: OtomotivCategorySlug): string {
  if (slug === "sifir") return OTOMOTIV.sifir.home;
  if (slug === "ikinci-el") return OTOMOTIV.ikinciEl.home;
  return OTOMOTIV.galeri.home;
}

type Props = { slug: OtomotivCategorySlug };

/** Araç ilanı detay — Phase 2 stub (iletişim + galeri) */
export function OtomotivVehicleDetailPage({ slug }: Props) {
  const [, params] = useRoute(`${listHome(slug)}/:listingSlug`);
  const listingSlug = params?.listingSlug ?? "";
  const [listing, setListing] = useState<OtomotivVehicleListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!listingSlug) return;
    setLoading(true);
    void fetchOtomotivListingBySlug(listingSlug)
      .then((row) => {
        setListing(row);
        setNotFound(!row);
      })
      .finally(() => setLoading(false));
  }, [listingSlug]);

  const home = listHome(slug);

  if (loading) {
    return <div className="oto-detail oto-detail--loading">İlan yükleniyor…</div>;
  }

  if (notFound || !listing) {
    return (
      <div className="oto-detail oto-detail--empty">
        <p>İlan bulunamadı.</p>
        <Link href={home} className="oto-hub__cta oto-hub__cta--ghost"><ArrowLeft size={16} /> Listeye dön</Link>
      </div>
    );
  }

  const photos = Array.isArray(listing.photos_json)
    ? (listing.photos_json as string[]).filter((p) => typeof p === "string")
    : [];
  const mainPhoto = photos[0] ?? listingPhotoUrl(listing);

  return (
    <div className="oto-detail" data-listing={listing.slug}>
      <div className="oto-detail__breadcrumb">
        <Link href={OTOMOTIV.hub}>Otomotiv</Link>
        <span>/</span>
        <Link href={home}>{slug === "sifir" ? "Sıfır" : slug === "ikinci-el" ? "2. El" : "Galeri"}</Link>
        <span>/</span>
        <span>{listing.title}</span>
      </div>

      <div className="oto-detail__layout">
        <div className="oto-detail__gallery">
          <img src={mainPhoto} alt={listing.title} className="oto-detail__hero-img" />
          {photos.length > 1 ? (
            <div className="oto-detail__thumbs">
              {photos.slice(0, 6).map((url) => (
                <img key={url} src={url} alt="" loading="lazy" />
              ))}
            </div>
          ) : null}
        </div>

        <aside className="oto-detail__sidebar">
          <h1>{listing.title}</h1>
          <p className="oto-detail__price">{formatVehiclePrice(listing.price, listing.currency)}</p>
          <ul className="oto-detail__specs">
            {listing.brand_name || listing.model_name ? (
              <li><strong>Marka / Model:</strong> {[listing.brand_name, listing.model_name].filter(Boolean).join(" ")}</li>
            ) : null}
            {listing.year ? <li><Calendar size={16} /> {listing.year} model</li> : null}
            {listing.km != null ? <li><Gauge size={16} /> {listing.km.toLocaleString("tr-TR")} km</li> : null}
            {listing.fuel ? <li><Fuel size={16} /> {listing.fuel}</li> : null}
            {listing.transmission ? <li><Settings2 size={16} /> {listing.transmission}</li> : null}
            {(listing.business_city || listing.business_district) ? (
              <li><MapPin size={16} /> {[listing.business_district, listing.business_city].filter(Boolean).join(", ")}</li>
            ) : null}
          </ul>

          <div className="oto-detail__dealer">
            <h3>{listing.business_name ?? "Galeri"}</h3>
            {listing.business_phone ? (
              <a href={`tel:${listing.business_phone}`} className="oto-hub__cta oto-hub__cta--primary">
                <Phone size={16} /> {listing.business_phone}
              </a>
            ) : (
              <Link href="/isletme-basvuru" className="oto-hub__cta oto-hub__cta--primary">İletişim için başvur</Link>
            )}
          </div>

          <section className="oto-detail__sigorta" aria-labelledby="oto-sigorta-heading">
            <h3 id="oto-sigorta-heading">Sigorta teklifi</h3>
            <p className="oto-detail__sigorta-hint">
              Bu araç için trafik/kasko teklif talebi — canlı fiyat broker API sonrası. Poliçe lisanslı acente ile.
            </p>
            <SigortaLeadForm
              compact
              prefill={{
                listingId: listing.id,
                listingTitle: listing.title,
                brand: listing.brand_name,
                model: listing.model_name,
                year: listing.year,
              }}
            />
          </section>

          <p className="oto-detail__note">
            Satış ve ödeme doğrudan ilgili galeri / işletme ile yapılır. Yekpare aracılık etmez.
          </p>
        </aside>
      </div>

      {listing.description ? (
        <section className="oto-detail__desc">
          <h2>Açıklama</h2>
          <p>{listing.description}</p>
        </section>
      ) : null}

      <aside className="oto-hub__disclaimer-wrap">
        <YekpareFooterDisclaimer className="oto-hub__disclaimer" />
        <p className="oto-hub__disclaimer-extra">{OTOMOTIV_DISCLAIMER}</p>
      </aside>
    </div>
  );
}
