import { useState, useEffect, type FormEvent } from "react";
import { useRoute, Link } from "wouter";
import { Calendar, ChevronLeft, Search, SlidersHorizontal, Users } from "lucide-react";
import { ListingCard } from "./TurizmLegacyExports";

const TYPE_META: Record<string,{ label:string; icon:string; priceLabel:string }> = {
  hotel:  { label:"Oteller",      icon:"🏨", priceLabel:"gecelik" },
  car:    { label:"Rent a Car",   icon:"🚗", priceLabel:"günlük" },
  villa:  { label:"Villa & Ev",   icon:"🏡", priceLabel:"gecelik" },
  tour:   { label:"Turlar",       icon:"🗺️", priceLabel:"kişi başı" },
  boat:   { label:"Yat Tekne Kiralama", icon:"⛵", priceLabel:"günlük" },
};

const ALL_CITIES = ["İstanbul","Ankara","İzmir","Antalya","Bodrum","Muğla","Fethiye","Alanya","Bursa","Trabzon","Kapadokya","Marmaris"];

interface Listing {
  id: number; type: string; title: string; slug: string; city: string;
  image_url: string | null; price: string; sale_price: string | null;
  price_unit: string; star_rating: number | null; rating: number; review_count: number;
}

const VEHICLE_CATEGORIES = [
  { label: "Ekonomik", icon: "🚗", query: "ekonomik" },
  { label: "SUV", icon: "🚙", query: "suv" },
  { label: "Aile", icon: "🚐", query: "aile" },
  { label: "Lüks", icon: "🏎️", query: "lüks" },
  { label: "Minibüs", icon: "🚐", query: "minibüs" },
];

function RentalCarExperience({
  listings,
  loading,
  city,
  setCity,
  search,
  setSearch,
}: {
  listings: Listing[];
  loading: boolean;
  city: string;
  setCity: (city: string) => void;
  search: string;
  setSearch: (search: string) => void;
}) {
  const [pickupDate, setPickupDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [passengers, setPassengers] = useState("4");
  const visible = listings.filter((item) => {
    const q = search.trim().toLocaleLowerCase("tr-TR");
    if (!q) return true;
    return `${item.title} ${item.city}`.toLocaleLowerCase("tr-TR").includes(q);
  });
  const quickPicks = visible.slice(0, 5);
  const topRated = [...visible].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 8);

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    const q = new URLSearchParams();
    if (city.trim()) q.set("city", city.trim());
    if (search.trim()) q.set("q", search.trim());
    window.history.replaceState(null, "", `/turizm/car${q.toString() ? `?${q}` : ""}`);
  }

  return (
    <div className="min-h-screen bg-white">
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50 via-white to-white">
        <div className="absolute inset-x-0 top-0 h-52 bg-[linear-gradient(180deg,rgba(16,185,129,.10),transparent)]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-10">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Yekpare Araç Kiralama</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900 md:text-4xl">En uygun aracı hızlıca bulun</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Yakındaki kiralama işletmelerini, müsait araçları ve günlük fiyatları tek akışta karşılaştırın.
            </p>
          </div>

          <form onSubmit={submitSearch} className="mx-auto mt-8 grid max-w-4xl gap-2 rounded-2xl border border-emerald-100 bg-white p-2 shadow-xl md:grid-cols-[1fr_160px_160px_120px_auto]">
            <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3">
              <Search className="h-4 w-4 text-emerald-600" />
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Teslim alma konumu" className="w-full bg-transparent text-sm font-semibold outline-none" />
            </label>
            <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3">
              <Calendar className="h-4 w-4 text-emerald-600" />
              <input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} className="w-full bg-transparent text-sm font-semibold outline-none" />
            </label>
            <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3">
              <Calendar className="h-4 w-4 text-emerald-600" />
              <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className="w-full bg-transparent text-sm font-semibold outline-none" />
            </label>
            <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3">
              <Users className="h-4 w-4 text-emerald-600" />
              <select value={passengers} onChange={(e) => setPassengers(e.target.value)} className="w-full bg-transparent text-sm font-semibold outline-none">
                {[2, 4, 5, 7, 9].map((n) => <option key={n} value={n}>{n} kişi</option>)}
              </select>
            </label>
            <button type="submit" className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black text-white hover:bg-emerald-700">Ara</button>
          </form>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {["İstanbul", "Ankara", "İzmir", "Antalya"].map((item) => (
              <button key={item} type="button" onClick={() => setCity(item)} className="rounded-full border border-emerald-100 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm hover:border-emerald-300">
                {item}
              </button>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-6 px-4 pb-14 pt-3 md:space-y-7 md:pt-4 md:pb-16">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900">Hızlı seçimler</h2>
            <Link href="/turizm/car" className="text-xs font-black text-emerald-700">Tüm araçlar</Link>
          </div>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-5">{[...Array(5)].map((_, i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />)}</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-5">
              {(quickPicks.length ? quickPicks : visible.slice(0, 5)).map((item) => (
                <Link key={item.id} href={`/turizm/car/${item.slug}`} className="group overflow-hidden rounded-2xl bg-slate-900 text-white shadow-sm">
                  <div className="h-28 bg-slate-800">
                    {item.image_url ? <img src={item.image_url} alt={item.title} className="h-full w-full object-cover opacity-80 transition group-hover:scale-105" /> : <div className="flex h-full items-center justify-center text-4xl">🚗</div>}
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-1 text-xs font-black">{item.title}</p>
                    <p className="mt-1 text-[10px] text-white/65">{item.city || "Türkiye"}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900">En beğenilen araçlar</h2>
            <p className="text-xs font-semibold text-slate-500">{visible.length} ilan</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(topRated.length ? topRated : visible).slice(0, 8).map((item) => <ListingCard key={item.id} listing={item} />)}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900">Araç kategorileri</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {VEHICLE_CATEGORIES.map((cat) => (
              <button key={cat.label} type="button" onClick={() => setSearch(cat.query)} className="rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
                <span className="text-4xl">{cat.icon}</span>
                <span className="mt-3 block text-sm font-black text-slate-800">{cat.label}</span>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function TurizmListe() {
  const [matchAll, paramsAll] = useRoute("/turizm/liste");
  const [matchType, paramsType] = useRoute("/turizm/:type");
  const type = matchType && paramsType?.type && paramsType.type !== "liste" ? paramsType.type : "";
  const meta = type ? TYPE_META[type] : null;

  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [city, setCity] = useState(new URLSearchParams(window.location.search).get("city") || "");
  const [search, setSearch] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { load(1); }, [type, city]);

  const load = async (p: number) => {
    setLoading(true);
    const q = new URLSearchParams({ page: String(p), limit: "12" });
    if (type) q.set("type", type);
    if (city) q.set("city", city);
    const r = await fetch(`/api/tourism/listings?${q}`).then(x=>x.json()).catch(()=>({listings:[],total:0}));
    if (p === 1) setListings(r.listings || []);
    else setListings(prev => [...prev, ...(r.listings||[])]);
    setTotal(r.total || 0);
    setPage(p);
    setLoading(false);
  };

  const filtered = listings.filter(l => {
    if (search && !l.title.toLowerCase().includes(search.toLowerCase()) && !l.city?.toLowerCase().includes(search.toLowerCase())) return false;
    if (maxPrice && parseFloat(l.sale_price||l.price) > parseFloat(maxPrice)) return false;
    return true;
  });

  if (type === "car") {
    return (
      <RentalCarExperience
        listings={filtered}
        loading={loading}
        city={city}
        setCity={(next) => {
          setCity(next);
          setPage(1);
        }}
        search={search}
        setSearch={setSearch}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/turizm" className="text-gray-400 hover:text-gray-600 transition">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="text-lg font-black text-gray-900">
            {meta ? `${meta.icon} ${meta.label}` : "✈️ Tüm İlanlar"}
          </div>
          <div className="flex-1" />
          <button onClick={() => setShowFilters(v=>!v)} className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition">
            <SlidersHorizontal className="w-4 h-4" /> Filtrele
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="max-w-5xl mx-auto px-4 pb-3 flex flex-wrap gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" />
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Başlık ara..."
                className="pl-8 pr-3 py-2 border rounded-lg text-sm w-48 focus:outline-none focus:border-cyan-400" />
            </div>
            <select value={city} onChange={e=>{setCity(e.target.value); setPage(1);}}
              className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-cyan-400">
              <option value="">Tüm Şehirler</option>
              {ALL_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="number" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} placeholder="Maks fiyat ₺"
              className="px-3 py-2 border rounded-lg text-sm w-36 focus:outline-none focus:border-cyan-400" />
            {!type && (
              <div className="flex gap-1">
                {Object.entries(TYPE_META).map(([t,m]) => (
                  <Link key={t} href={`/turizm/${t}`}
                    className="px-3 py-1.5 border rounded-lg text-xs font-medium text-gray-600 hover:bg-cyan-50 hover:border-cyan-300 hover:text-cyan-700 transition">
                    {m.icon} {m.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-6 pt-3 md:pt-4">
        {/* Category pills if not filtered */}
        {!type && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none">
            {Object.entries(TYPE_META).map(([t,m]) => (
              <Link key={t} href={`/turizm/${t}`}
                className="flex items-center gap-1.5 px-4 py-2 bg-white border rounded-xl text-sm font-bold text-gray-700 whitespace-nowrap hover:bg-cyan-50 hover:border-cyan-300 hover:text-cyan-700 transition shadow-sm">
                {m.icon} {m.label}
              </Link>
            ))}
          </div>
        )}

        {/* Results info */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-gray-600 text-sm">
            {filtered.length} ilan {city && `· ${city}`}
          </p>
        </div>

        {loading && listings.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_,i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 h-64 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-black text-gray-800 mb-2">İlan bulunamadı</h3>
            <p className="text-gray-500 mb-4">Farklı filtreler deneyebilirsiniz</p>
            <Link href="/turizm" className="text-cyan-600 font-semibold hover:underline">Tüm kategorilere dön →</Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>

            {listings.length < total && (
              <div className="text-center mt-8">
                <button onClick={() => load(page+1)} disabled={loading}
                  className="px-8 py-3 bg-cyan-600 text-white rounded-xl font-bold hover:bg-cyan-700 transition disabled:opacity-50">
                  {loading ? "Yükleniyor..." : "Daha Fazla Göster"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
