import { useState, useEffect, useCallback, useRef } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { applySocialShareMeta, resetSeoToSiteDefaults, seoPlainSnippet, applyTourismStructuredData } from "@/lib/pageSeo";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import {
  BookingCoreDetailLayout,
  type BcDetailListing,
  type BcDetailRoom,
  type BcBookingFormState,
  type BcRelatedListing,
} from "@/themes/bookingcore/components/BookingCoreDetailLayout";
import { YatportDetailPage } from "@/themes/turizm/components/YatportDetailPage";
import { isYatportListing, type YatportListing } from "@/themes/turizm/lib/yatportListing";
import { TURIZM } from "@/themes/turizm/turizmRoutes";
import { tourismListingHref } from "@/themes/bookingcore/lib/listingRoutes";
import {
  fetchAffiliateLink,
  LISTING_TYPE_TO_VERTICAL,
  type AffiliateResponse,
} from "@/themes/bookingcore/lib/travelpayouts";

const API = "/api";

const TYPE_LABELS: Record<string, string> = {
  hotel: "Otel",
  car: "Araç Kiralama",
  villa: "Villa & Ev",
  tour: "Tur",
  boat: "Yat Tekne Kiralama",
};

type Listing = BcDetailListing & {
  linked_listing_id?: number;
  themeKey?: string;
  themeConfig?: Record<string, string>;
  reservation_enabled?: boolean;
  map_business_fallback?: boolean;
  is_yatport?: boolean;
  import_source?: string;
};

type AvailabilityState = "idle" | "checking" | "available" | "unavailable";
type RoomAvailabilityMap = Record<number, { available: boolean; reason?: string }>;

function listingBackHref(type: string): string {
  if (type === "hotel") return TURIZM.konaklama.home;
  if (type === "villa") return TURIZM.villaEv.home;
  if (type === "car") return TURIZM.arac.home;
  if (type === "boat") return TURIZM.yat.home;
  if (type === "tour") return TURIZM.turlar.home;
  return TURIZM.hub;
}

function listingBreadcrumbs(listing: Listing) {
  const moduleLabel = TYPE_LABELS[listing.type] || "Seyahat";
  return [
    { label: "Seyahat", href: TURIZM.hub },
    { label: moduleLabel, href: listingBackHref(listing.type) },
    { label: listing.title },
  ];
}

export default function TurizmDetay() {
  const [loc] = useLocation();
  const path = loc.split("?")[0] ?? "";
  const [, legacyParams] = useRoute("/turizm/:type/:slug");
  const [, konakParams] = useRoute("/turizm/konaklama/:slug");
  const [, villaEvParams] = useRoute("/turizm/villa-ev/:slug");
  const [, aracParams] = useRoute("/turizm/arac-kiralama/:slug");
  const [, yatParams] = useRoute("/turizm/yat-turlari/:slug");
  const [, turParams] = useRoute("/turizm/tur/:slug");

  let slug = "";
  if (konakParams?.slug) slug = konakParams.slug;
  else if (villaEvParams?.slug) slug = villaEvParams.slug;
  else if (aracParams?.slug) slug = aracParams.slug;
  else if (yatParams?.slug) slug = yatParams.slug;
  else if (turParams?.slug) slug = turParams.slug;
  else if (legacyParams?.slug) slug = legacyParams.slug;
  else {
    const parts = path.split("/").filter(Boolean);
    if (parts[0] === "turizm" && parts.length >= 3) slug = parts[parts.length - 1] ?? "";
  }

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<BcDetailRoom | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [success, setSuccess] = useState("");
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [form, setForm] = useState<BcBookingFormState>({
    name: "",
    phone: "",
    email: "",
    checkIn: "",
    checkOut: "",
    guests: "2",
    notes: "",
  });
  const [relatedListings, setRelatedListings] = useState<BcRelatedListing[]>([]);
  const [availabilityState, setAvailabilityState] = useState<AvailabilityState>("idle");
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [roomAvailability, setRoomAvailability] = useState<RoomAvailabilityMap>({});
  const [quotedTotal, setQuotedTotal] = useState<number | null>(null);
  const [affiliate, setAffiliate] = useState<AffiliateResponse | null>(null);
  const availTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bookingListingId = listing?.linked_listing_id ?? listing?.id ?? null;
  const isYat = isYatportListing(listing);
  const needsStayDates = listing ? ["hotel", "villa"].includes(listing.type) || (listing.type === "boat" && !isYat) : false;

  const runAvailabilityCheck = useCallback(
    async (opts?: { allRooms?: boolean }) => {
      if (!listing || !bookingListingId || bookingListingId < 0) {
        setAvailabilityState("idle");
        setAvailabilityMessage("");
        setRoomAvailability({});
        setQuotedTotal(null);
        return;
      }
      if (needsStayDates && (!form.checkIn || !form.checkOut)) {
        setAvailabilityState("idle");
        setAvailabilityMessage("Müsaitlik için giriş ve çıkış tarihi seçin.");
        setRoomAvailability({});
        setQuotedTotal(null);
        return;
      }
      setAvailabilityState("checking");
      setAvailabilityMessage("");
      setErr("");
      const payload: Record<string, unknown> = {
        listingId: bookingListingId,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        guests: Number(form.guests) || 1,
        allRooms: opts?.allRooms ?? (listing.type === "hotel" && !selectedRoom),
      };
      if (selectedRoom?.id) payload.roomId = selectedRoom.id;

      const r = await fetch(`${API}/tourism/availability/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then((x) => x.json())
        .catch(() => ({ available: false, reason: "Müsaitlik kontrol edilemedi" }));

      if (Array.isArray(r.rooms)) {
        const map: RoomAvailabilityMap = {};
        for (const row of r.rooms as { roomId: number; available: boolean; reason?: string }[]) {
          map[row.roomId] = { available: row.available, reason: row.reason };
        }
        setRoomAvailability(map);
      } else {
        setRoomAvailability({});
      }

      if (r.available) {
        setAvailabilityState("available");
        setAvailabilityMessage(
          r.nights
            ? `${r.nights} gece · tahmini ${Number(r.totalPrice || 0).toLocaleString("tr-TR")} ₺`
            : "Seçilen tarihler müsait",
        );
        setQuotedTotal(typeof r.totalPrice === "number" ? r.totalPrice : null);
      } else {
        setAvailabilityState("unavailable");
        setAvailabilityMessage(r.reason || r.error || "Seçilen tarihlerde müsait değil");
        setQuotedTotal(null);
      }
    },
    [
      listing,
      bookingListingId,
      needsStayDates,
      form.checkIn,
      form.checkOut,
      form.guests,
      selectedRoom,
    ],
  );

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`${API}/tourism/listings/${encodeURIComponent(slug)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok || d.error) {
          setListing(null);
          return;
        }
        setListing(d);
        if (d.rooms?.length) setSelectedRoom(d.rooms[0]);
      })
      .catch(() => setListing(null))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!listing || !needsStayDates) return;
    if (!form.checkIn || !form.checkOut) {
      setAvailabilityState("idle");
      setAvailabilityMessage("");
      setRoomAvailability({});
      setQuotedTotal(null);
      return;
    }
    if (availTimer.current) clearTimeout(availTimer.current);
    availTimer.current = setTimeout(() => {
      void runAvailabilityCheck({ allRooms: listing.type === "hotel" });
    }, 450);
    return () => {
      if (availTimer.current) clearTimeout(availTimer.current);
    };
  }, [listing, needsStayDates, form.checkIn, form.checkOut, form.guests, selectedRoom?.id, runAvailabilityCheck]);

  useEffect(() => {
    if (!listing || listing.type !== "hotel") {
      setRelatedListings([]);
      return;
    }
    const q = new URLSearchParams({ type: "hotel", limit: "6" });
    if (listing.city) q.set("city", listing.city);
    fetch(`${API}/tourism/listings?${q.toString()}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok || !Array.isArray(d.listings)) return [];
        return d.listings as BcRelatedListing[];
      })
      .then((rows) =>
        setRelatedListings(rows.filter((row) => row.slug !== listing.slug).slice(0, 4)),
      )
      .catch(() => setRelatedListings([]));
  }, [listing]);

  // Affiliate (Travelpayouts) yönlendirmesi: doğrulanmış vendor YOKSA ve dikey affiliate destekliyorsa
  // (otel/araç/tur/etkinlik) marker'lı affiliate URL'sini çek. Yat/tekne (boat) destek dışı → null kalır.
  useEffect(() => {
    if (!listing) {
      setAffiliate(null);
      return;
    }
    const reservationOpen =
      listing.reservation_enabled !== undefined
        ? listing.reservation_enabled
        : !(listing.map_business_fallback && !listing.linked_listing_id);
    const vertical = LISTING_TYPE_TO_VERTICAL[listing.type];
    // Yat/tekne artık SEARADAR ile affiliate destekli — boat dahil tüm haritalanan dikeyler yönlenir.
    if (reservationOpen || !vertical) {
      setAffiliate(null);
      return;
    }
    let cancelled = false;
    fetchAffiliateLink(vertical, {
      location: listing.city || listing.district || undefined,
      query: listing.title,
      propertyType: listing.type === "villa" ? "apartment" : undefined,
    })
      .then((res) => {
        if (!cancelled) setAffiliate(res && res.affiliate ? res : null);
      })
      .catch(() => {
        if (!cancelled) setAffiliate(null);
      });
    return () => {
      cancelled = true;
    };
  }, [listing]);

  useEffect(() => {
    if (!listing || !slug) return;
    const canonicalPath = tourismListingHref(listing);
    const typeLabel = TYPE_LABELS[listing.type] || listing.type;
    const snippet = seoPlainSnippet(listing.description) || `${typeLabel} ilanı, fiyat ve müsaitlik.`;
    const locText = [listing.district, listing.city].filter(Boolean).join(", ");
    const primary = [listing.title, snippet, locText ? `Konum: ${locText}.` : null, "Turizm ve rezervasyon."]
      .filter(Boolean)
      .join(" ");
    applySocialShareMeta({
      title: `${listing.title} — ${typeLabel}`,
      descriptionPrimary: primary,
      canonicalPath,
      imageUrl: listing.image_url,
    });
    applyTourismStructuredData({
      title: listing.title,
      description: listing.description,
      canonicalPath,
      imageUrl: listing.image_url,
      listingType: listing.type,
      city: listing.city,
      price: Number(listing.sale_price || listing.price || 0) || null,
    });
    return () => resetSeoToSiteDefaults();
  }, [listing, slug]);

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!listing) return;
    if (!form.name || !form.phone) {
      setErr("Ad ve telefon zorunlu");
      return;
    }
    if (needsStayDates && (!form.checkIn || !form.checkOut)) {
      setErr("Giriş ve çıkış tarihi zorunlu");
      return;
    }
    if (
      bookingListingId &&
      bookingListingId > 0 &&
      needsStayDates &&
      availabilityState === "unavailable"
    ) {
      setErr(availabilityMessage || "Seçilen tarihlerde müsait değil");
      return;
    }
    setSending(true);
    setErr("");
    const idForBooking = bookingListingId ?? listing.id;
    const r = await fetch(`${API}/tourism/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId: idForBooking,
        roomId: selectedRoom?.id || null,
        customerName: form.name,
        customerPhone: form.phone,
        customerEmail: form.email || null,
        checkIn: form.checkIn || null,
        checkOut: form.checkOut || null,
        guests: form.guests,
        notes: form.notes,
        paymentMethod: "offline",
      }),
    })
      .then(async (x) => ({ status: x.status, body: await x.json() }))
      .catch(() => ({ status: 0, body: { error: "Bağlantı hatası" } }));
    setSending(false);
    if (r.body.success && r.body.bookingRef) {
      const ref = String(r.body.bookingRef);
      setSuccess(`Rezervasyonunuz alındı! Kod: ${ref}`);
      setShowForm(false);
      window.location.href = `/turizm/rezervasyon/${encodeURIComponent(ref)}`;
      return;
    }
    setErr(r.body.error || "Rezervasyon oluşturulamadı");
    if (r.status === 409) {
      setAvailabilityState("unavailable");
      setAvailabilityMessage(r.body.error || "Seçilen tarihlerde müsait değil");
    }
  }

  function calcNights() {
    if (!form.checkIn || !form.checkOut) return 0;
    const d = (new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()) / 86400000;
    return Math.max(1, Math.ceil(d));
  }

  function calcTotal() {
    if (!listing) return 0;
    if (quotedTotal != null && quotedTotal > 0) return quotedTotal;
    const price = parseFloat(selectedRoom?.price || listing.sale_price || listing.price || "0");
    if (listing.price_unit === "person" || listing.price_unit === "kişi") {
      return price * Number(form.guests || 1);
    }
    const n = calcNights();
    return price * (n || 1);
  }

  if (loading) {
    return (
      <div className="bc-yekpare min-h-[40vh] flex items-center justify-center">
        <div className="bc-skeleton bc-skeleton--tile" style={{ width: 280, height: 48, borderRadius: 8 }} />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="bc-yekpare bc-empty">
        <div className="text-5xl mb-3">🔍</div>
        <h2 className="text-xl font-bold text-[#1a2b48]">İlan bulunamadı</h2>
        <Link href={TURIZM.hub} className="bc-stub__back">
          ← Seyahate dön
        </Link>
      </div>
    );
  }

  const gallery = (listing.gallery?.length ? listing.gallery : listing.image_url ? [listing.image_url] : [])
    .map((img) => resolveClientMediaSrc(img) || img)
    .filter(Boolean);

  // Rezervasyon kapısı: backend bayrağı varsa onu kullan; yoksa scrape edilmiş
  // (sahiplenilmemiş) Google işletmesi → rezervasyona kapalı.
  const reservationEnabled =
    listing.reservation_enabled !== undefined
      ? listing.reservation_enabled
      : !(listing.map_business_fallback && !listing.linked_listing_id);

  if (isYatportListing(listing)) {
    const related = (listing as YatportListing).related_listings ?? [];
    return (
      <YatportDetailPage
        listing={listing}
        breadcrumbs={listingBreadcrumbs(listing)}
        gallery={gallery}
        form={form}
        onFormChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        onSubmit={handleBook}
        sending={sending}
        err={err}
        success={success}
        reservationEnabled={reservationEnabled}
        relatedListings={related as BcRelatedListing[]}
      />
    );
  }

  return (
    <BookingCoreDetailLayout
      listing={listing}
      breadcrumbs={listingBreadcrumbs(listing)}
      gallery={gallery}
      activeImg={activeImg}
      onActiveImgChange={setActiveImg}
      selectedRoom={selectedRoom}
      onSelectRoom={setSelectedRoom}
      showForm={showForm}
      onShowForm={setShowForm}
      form={form}
      onFormChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
      onSubmit={handleBook}
      sending={sending}
      err={err}
      success={success}
      calcNights={calcNights}
      calcTotal={calcTotal}
      relatedListings={relatedListings}
      availabilityState={availabilityState}
      availabilityMessage={availabilityMessage}
      roomAvailability={roomAvailability}
      onCheckAvailability={() => void runAvailabilityCheck({ allRooms: listing.type === "hotel" })}
      reservationEnabled={reservationEnabled}
      verifyHref="/isletme-giris"
      affiliateUrl={!reservationEnabled ? (affiliate?.affiliateUrl ?? null) : null}
      affiliateProgram={affiliate?.program ?? null}
    />
  );
}
