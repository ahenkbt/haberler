import { useEffect, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { Calendar, Car, Search, Users } from "lucide-react";
import { TURIZM } from "@/themes/turizm/turizmRoutes";
import { ListingCard } from "@/pages/public/TurizmLegacyExports";
import { fetchTourismListings } from "@/themes/bookingcore/lib/fetchTourismListings";
import "@/styles/sixamRentalTurizm.css";

import type { TourismListingRow } from "@/themes/bookingcore/lib/normalizeTourismListing";

type Listing = TourismListingRow;

const VEHICLE_CATEGORIES = [
  { label: "Ekonomik", query: "ekonomik" },
  { label: "SUV", query: "suv" },
  { label: "Aile", query: "aile" },
  { label: "Lüks", query: "lüks" },
  { label: "Minibüs", query: "minibüs" },
];

/** 6amMart rental modülü — yeşil chrome, Turinet nav yok */
export default function SixAmMartRentalTurizmPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState(new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("city") || "");
  const [search, setSearch] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [passengers, setPassengers] = useState("4");

  useEffect(() => {
    setLoading(true);
    fetchTourismListings({ type: "car", city: city || undefined, limit: 24 })
      .then(setListings)
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, [city]);

  const visible = listings.filter((item) => {
    const q = search.trim().toLocaleLowerCase("tr-TR");
    if (!q) return true;
    return `${item.title} ${item.city}`.toLocaleLowerCase("tr-TR").includes(q);
  });

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    const q = new URLSearchParams();
    if (city.trim()) q.set("city", city.trim());
    if (search.trim()) q.set("q", search.trim());
    window.history.replaceState(null, "", `${TURIZM.arac.home}${q.toString() ? `?${q}` : ""}`);
  }

  return (
    <div className="sixam-rental-yekpare min-h-screen bg-white" data-page="turizm-arac-kiralama">
      <section className="sixam-rental-hero">
        <div className="sixam-rental-hero__inner">
          <p className="sixam-rental-kicker">Yekpare Araç Kiralama</p>
          <h1>En uygun aracı hızlıca bulun</h1>
          <p>Yakındaki kiralama işletmelerini, müsait araçları ve günlük fiyatları karşılaştırın.</p>

          <form onSubmit={submitSearch} className="sixam-rental-search">
            <label>
              <Search className="h-4 w-4" />
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Teslim alma konumu" />
            </label>
            <label>
              <Calendar className="h-4 w-4" />
              <input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
            </label>
            <label>
              <Calendar className="h-4 w-4" />
              <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
            </label>
            <label>
              <Users className="h-4 w-4" />
              <select value={passengers} onChange={(e) => setPassengers(e.target.value)}>
                {[2, 4, 5, 7, 9].map((n) => (
                  <option key={n} value={n}>
                    {n} kişi
                  </option>
                ))}
              </select>
            </label>
            <button type="submit">Ara</button>
          </form>
        </div>
      </section>

      <main className="sixam-rental-main">
        <section>
          <h2>Hızlı seçimler</h2>
          <div className="sixam-rental-quick">
            {loading
              ? [...Array(5)].map((_, i) => <div key={i} className="sixam-rental-skeleton" />)
              : visible.slice(0, 5).map((item) => (
                  <Link key={item.id} href={TURIZM.arac.detay(item.slug)} className="sixam-rental-quick-card">
                    {item.image_url ? <img src={item.image_url} alt={item.title} /> : <Car className="h-8 w-8 opacity-60" aria-hidden />}
                    <strong>{item.title}</strong>
                    <small>{item.city || "Türkiye"}</small>
                  </Link>
                ))}
          </div>
        </section>

        <section>
          <h2>En beğenilen araçlar</h2>
          {loading ? (
            <div className="sixam-rental-grid">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="sixam-rental-skeleton h-64" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <p className="text-sm font-semibold text-slate-500">Araç ilanı bulunamadı.</p>
          ) : (
            <div className="sixam-rental-grid">
              {visible.slice(0, 8).map((item) => (
                <ListingCard key={item.id} listing={{ ...item, href: TURIZM.arac.detay(item.slug) }} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2>Araç kategorileri</h2>
          <div className="sixam-rental-cats">
            {VEHICLE_CATEGORIES.map((cat) => (
              <button key={cat.label} type="button" onClick={() => setSearch(cat.query)}>
                <Car className="h-4 w-4 opacity-70" aria-hidden />
                {cat.label}
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
