import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { SariSayfalarNavLink } from "@/lib/sariSayfalarNav";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  ChevronRight,
  Globe,
  MapPin,
  Navigation,
  Phone,
  Star,
} from "lucide-react";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { haritalarDirectionsHref, haritalarNavHref } from "@/lib/haritalarNav";
import { cleanAboutForPublic } from "@/lib/publicAboutText";
import {
  buildSariSayfalarListPath,
  buildSariSayfalarDetailPath,
  resolveSariSayfalarAddress,
  resolveSariSayfalarCategoryLabel,
  resolveSariSayfalarPhone,
} from "@/lib/sariSayfalarUtils";
import { applyMapBusinessStructuredData, applySocialShareMeta, resetSeoToSiteDefaults, seoPlainSnippet } from "@/lib/pageSeo";
import { SADE_PUBLIC_POST_HERO_BODY_CLASS } from "@/lib/yekpareSadeTheme";
import type { SariSayfalarBusiness } from "./SariSayfalarHub";
import "@/styles/sariSayfalar.css";

const API = "/api";

type DetailTab = "info" | "map";

function normalizeWebsite(url: string | null | undefined): string {
  const raw = String(url ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function displayWebsite(url: string | null | undefined): string {
  return String(url ?? "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "");
}

function contactLabel(biz: SariSayfalarBusiness): string {
  const fromApi = String(biz.responsiblePerson ?? biz.authorizedPersonName ?? "").trim();
  if (fromApi) return fromApi;
  const extras = (biz.googlePlacesExtras ?? null) as Record<string, unknown> | null;
  for (const key of ["responsiblePerson", "authorizedPersonName"]) {
    const val = String(extras?.[key] ?? "").trim();
    if (val) return val;
  }
  const desc = String(biz.description ?? "");
  const m = desc.match(/Yetkili:\s*([^.\n]+)/i);
  if (m?.[1]?.trim()) return m[1].trim();
  return "";
}

function verifyHref(biz: SariSayfalarBusiness, field?: "phone" | "address"): string {
  const base = `/isletme-basvuru?mapBusinessId=${encodeURIComponent(biz.id)}&businessName=${encodeURIComponent(biz.name)}`;
  return field ? `${base}&missing=${field}` : base;
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>{children}</td>
    </tr>
  );
}

function parseTrAddressLocationParts(address: string | null | undefined): { city: string; district: string } {
  const raw = String(address ?? "").trim();
  if (!raw) return { city: "", district: "" };
  const slashMatch = raw.match(/([^/\n]+)\/([^/\n,]+)/);
  if (!slashMatch) return { city: "", district: "" };
  const left = slashMatch[1].replace(/^\d+\s*/, "").trim();
  const right = slashMatch[2].replace(/,\s*Türkiye.*$/i, "").trim();
  return { district: left, city: right };
}

function resolveSariSayfalarCity(biz: SariSayfalarBusiness): string {
  const fromRow = String(biz.city?.nameTr || biz.city?.name || "").trim();
  if (fromRow) return fromRow;
  const extras = biz.googlePlacesExtras as Record<string, unknown> | null | undefined;
  const wf = extras?.importWorkflow as { actualLocation?: { province?: string } } | undefined;
  const fromActual = String(wf?.actualLocation?.province ?? "").trim();
  if (fromActual) return fromActual;
  return parseTrAddressLocationParts(biz.address).city;
}

function resolveSariSayfalarDistrict(biz: SariSayfalarBusiness): string {
  const fromRow = String(biz.district?.name || "").trim();
  if (fromRow) return fromRow;
  const extras = biz.googlePlacesExtras as Record<string, unknown> | null | undefined;
  const wf = extras?.importWorkflow as { actualLocation?: { district?: string } } | undefined;
  const fromActual = String(wf?.actualLocation?.district ?? "").trim();
  if (fromActual) return fromActual;
  return parseTrAddressLocationParts(biz.address).district;
}

export default function SariSayfalarDetay() {
  const [location] = useLocation();
  const [, params] = useRoute("/kesfet/sarisayfalar/:id");
  const id = String(params?.id ?? "").trim();
  const [biz, setBiz] = useState<SariSayfalarBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("info");

  useEffect(() => {
    if (!id) {
      setError("Geçersiz işletme.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${API}/map/businesses/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (!d?.success || !d?.data) {
          setError(d?.error || "İşletme bulunamadı");
          setBiz(null);
          return;
        }
        const row = d.data as SariSayfalarBusiness;
        const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (uuidRe.test(id) && String(row.id) !== id) {
          setError("İşletme bulunamadı");
          setBiz(null);
          return;
        }
        setBiz(row);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Bağlantı hatası");
          setBiz(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!biz) {
      resetSeoToSiteDefaults();
      return;
    }
    const desc = cleanAboutForPublic(biz.description ?? "") || `${biz.name} — Yekpare Sarı Sayfalar`;
    const cityName = resolveSariSayfalarCity(biz);
    const districtName = resolveSariSayfalarDistrict(biz);
    const detailPath = buildSariSayfalarDetailPath(biz);
    applySocialShareMeta({
      title: `${biz.name} | Sarı Sayfalar`,
      descriptionPrimary: seoPlainSnippet(desc, 160),
      canonicalPath: detailPath,
      imageUrl: resolveClientMediaSrc(biz.photoUrl || biz.coverPhotoUrl || null) || undefined,
    });
    applyMapBusinessStructuredData({
      name: biz.name,
      description: desc,
      canonicalPath: detailPath,
      imageUrl: resolveClientMediaSrc(biz.photoUrl || biz.coverPhotoUrl || null),
      phone: biz.phone,
      address: biz.address,
      city: cityName,
      district: districtName,
      lat: biz.latitude,
      lng: biz.longitude,
    });
    return () => resetSeoToSiteDefaults();
  }, [biz]);

  const mapsHref = biz
    ? haritalarNavHref({ id: biz.id, slug: biz.slug, lat: biz.latitude, lng: biz.longitude })
    : "/haritalar";
  const web = normalizeWebsite(biz?.website);
  const city = biz ? resolveSariSayfalarCity(biz) : "";
  const district = biz ? resolveSariSayfalarDistrict(biz) : "";
  const category = biz ? resolveSariSayfalarCategoryLabel(biz) : "";
  const about = cleanAboutForPublic(biz?.description ?? "");
  const contact = biz ? contactLabel(biz) : "";
  const phone = biz ? resolveSariSayfalarPhone(biz) : "";
  const address = biz ? resolveSariSayfalarAddress(biz) : "";
  const lat = biz?.latitude;
  const lng = biz?.longitude;

  const mapEmbed = useMemo(() => {
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.015}%2C${lat - 0.01}%2C${lng + 0.015}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}`;
  }, [lat, lng]);

  const directionsHref = useMemo(() => {
    if (!biz) return null;
    return haritalarDirectionsHref({
      id: biz.id,
      slug: biz.slug,
      lat,
      lng,
      location: address || null,
    });
  }, [biz, lat, lng, address]);

  const listBackHref = buildSariSayfalarListPath({ city, district, q: category });

  return (
    <div className="ss-detail min-h-screen bg-white" data-page="sari-sayfalar-detay" key={location}>
      <div className={`mx-auto px-4 py-8 ss-detail-wrap ${SADE_PUBLIC_POST_HERO_BODY_CLASS}`}>
        <SariSayfalarNavLink
          href={listBackHref}
          className="mb-4 inline-flex items-center gap-2 text-sm font-black text-[#0f766e] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Sarı Sayfalar listesine dön
        </SariSayfalarNavLink>

        {biz ? (
          <nav className="ss-breadcrumb mb-4" aria-label="Konum">
            <SariSayfalarNavLink href="/">Ana Sayfa</SariSayfalarNavLink>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
            <SariSayfalarNavLink href="/kesfet">Keşfet</SariSayfalarNavLink>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
            <SariSayfalarNavLink href="/kesfet/sarisayfalar">Sarı Sayfalar</SariSayfalarNavLink>
            {city ? (
              <>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
                <SariSayfalarNavLink href={buildSariSayfalarListPath({ city })}>{city}</SariSayfalarNavLink>
              </>
            ) : null}
            {district ? (
              <>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
                <SariSayfalarNavLink href={buildSariSayfalarListPath({ city, district })}>{district}</SariSayfalarNavLink>
              </>
            ) : null}
            {category ? (
              <>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
                <SariSayfalarNavLink href={buildSariSayfalarListPath({ city, district, q: category })}>{category}</SariSayfalarNavLink>
              </>
            ) : null}
            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
            <span aria-current="page">{biz.name}</span>
          </nav>
        ) : null}

        {loading ? (
          <div className="ss-detail-card animate-pulse p-8">
            <div className="h-8 w-2/3 rounded bg-slate-200" />
            <div className="mt-4 h-4 w-full rounded bg-slate-100" />
            <div className="mt-2 h-4 w-5/6 rounded bg-slate-100" />
          </div>
        ) : error || !biz ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-10 text-center">
            <Building2 className="mx-auto mb-3 h-10 w-10 text-red-300" />
            <p className="font-black text-slate-800">{error || "İşletme bulunamadı"}</p>
            <SariSayfalarNavLink href="/kesfet/sarisayfalar" className="mt-4 inline-block text-sm font-bold text-[#0f766e] hover:underline">
              Listeye dön
            </SariSayfalarNavLink>
          </div>
        ) : (
          <article className={`ss-detail-card${biz.isPremium ? " featured" : ""}`}>
            <header className="ss-detail-hero">
              {biz.isPremium ? (
                <span className="ss-featured-badge mb-2">
                  <Star className="h-3 w-3 fill-white" />
                  Öne çıkan firma
                </span>
              ) : null}
              <h1>
                {biz.name}
                {contact ? <span className="ss-card-contact"> ({contact})</span> : null}
              </h1>
              <div className="ss-card-loc">
                {city ? (
                  <SariSayfalarNavLink href={buildSariSayfalarListPath({ city })} className="ss-link-city">
                    {city}
                  </SariSayfalarNavLink>
                ) : null}
                {district ? (
                  <>
                    {city ? <span className="text-slate-300">·</span> : null}
                    <SariSayfalarNavLink href={buildSariSayfalarListPath({ city, district })} className="ss-link-district">
                      {district}
                    </SariSayfalarNavLink>
                  </>
                ) : null}
                {category ? <span className="ss-tag-cat">{category}</span> : null}
              </div>
            </header>

            <div className="ss-detail-tabs" role="tablist" aria-label="Firma sekmeleri">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "info"}
                className={activeTab === "info" ? "active" : undefined}
                onClick={() => setActiveTab("info")}
              >
                Firma Bilgileri
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "map"}
                className={activeTab === "map" ? "active" : undefined}
                onClick={() => setActiveTab("map")}
              >
                Harita
              </button>
            </div>

            <div className="ss-detail-body">
              {activeTab === "info" ? (
                <>
                  <table className="ss-info-table">
                    <tbody>
                      <InfoRow label="Firma adı">{biz.name}</InfoRow>
                      {contact ? <InfoRow label="Yetkili">{contact}</InfoRow> : null}
                      <InfoRow label="Telefon">
                        {phone ? (
                          <a href={`tel:${phone}`}>{phone}</a>
                        ) : (
                          <Link href={verifyHref(biz, "phone")} className="ss-ekle-link">
                            Telefon ekle →
                          </Link>
                        )}
                      </InfoRow>
                      <InfoRow label="Adres">
                        {address ? (
                          address
                        ) : (
                          <Link href={verifyHref(biz, "address")} className="ss-ekle-link">
                            Adres ekle →
                          </Link>
                        )}
                      </InfoRow>
                      {web ? (
                        <InfoRow label="Web sitesi">
                          <a href={web} target="_blank" rel="noopener noreferrer">
                            {displayWebsite(biz.website)}
                          </a>
                        </InfoRow>
                      ) : null}
                      {category ? <InfoRow label="Kategori">{category}</InfoRow> : null}
                      {city ? (
                        <InfoRow label="Şehir">
                          <SariSayfalarNavLink href={buildSariSayfalarListPath({ city })}>{city}</SariSayfalarNavLink>
                        </InfoRow>
                      ) : null}
                      {district ? (
                        <InfoRow label="İlçe">
                          <SariSayfalarNavLink href={buildSariSayfalarListPath({ city, district })}>{district}</SariSayfalarNavLink>
                        </InfoRow>
                      ) : null}
                    </tbody>
                  </table>

                  <h2 className="ss-section-title">Şirket tanımı</h2>
                  {about ? (
                    <p className="ss-about-text">{about}</p>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Bu firma için henüz açıklama eklenmemiş.{" "}
                      <Link href={verifyHref(biz)} className="ss-ekle-link">
                        Bilgi ekle →
                      </Link>
                    </p>
                  )}

                  {category ? (
                    <>
                      <h2 className="ss-section-title">Hizmet tanımı</h2>
                      <p className="ss-about-text">
                        {about || `${biz.name}, ${[district, city].filter(Boolean).join(" / ")} bölgesinde ${category} hizmeti sunmaktadır.`}
                      </p>
                    </>
                  ) : null}
                </>
              ) : mapEmbed ? (
                <div className="ss-map-block">
                  <iframe title={`${biz.name} konum haritası`} src={mapEmbed} loading="lazy" />
                  <div className="ss-map-actions">
                    <Link href={mapsHref}>
                      <MapPin className="h-3.5 w-3.5" />
                      Yekpare Haritalar&apos;da aç
                    </Link>
                    {directionsHref ? (
                      <Link href={directionsHref}>
                        <Navigation className="h-3.5 w-3.5" />
                        Yol tarifi al
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : address ? (
                <div className="ss-map-block">
                  <div className="flex items-start gap-2 p-4 text-sm text-slate-600">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#0f766e]" />
                    <span>{address}</span>
                  </div>
                  <div className="ss-map-actions">
                    <Link href={mapsHref}>
                      <MapPin className="h-3.5 w-3.5" />
                      Haritalarda göster
                    </Link>
                    {directionsHref ? (
                      <Link href={directionsHref}>
                        <Navigation className="h-3.5 w-3.5" />
                        Yol tarifi al
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Konum bilgisi henüz eklenmemiş.</p>
              )}

              <div className="ss-verify-block">
                <h2>
                  <BadgeCheck className="h-5 w-5 text-[#0f766e]" />
                  İşletme sahibi misiniz?
                </h2>
                <p>
                  Bilgileri güncelleyin, doğrulama rozeti alın ve Yekpare Keşfet&apos;te öne çıkın.
                </p>
                <Link href={verifyHref(biz)} className="ss-verify-cta">
                  İşletmeni doğrula
                </Link>
              </div>

              <div className="ss-detail-actions">
                {phone ? (
                  <a href={`tel:${phone}`} className="ss-vbtn">
                    <Phone className="h-3.5 w-3.5" />
                    Telefon
                  </a>
                ) : null}
                <Link href={mapsHref} className="ss-vbtn">
                  <MapPin className="h-3.5 w-3.5" />
                  Harita
                </Link>
                {web ? (
                  <a href={web} target="_blank" rel="noopener noreferrer" className="ss-vbtn">
                    <Globe className="h-3.5 w-3.5" />
                    Web
                  </a>
                ) : null}
              </div>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
