import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Search, MapPin, Phone, Globe, Star, ChevronRight, BookOpen, Building2, ExternalLink } from "lucide-react";

const SEKTÖRLER = [
  { slug: "restoran", name: "Restoran & Kafe", icon: "🍽️" },
  { slug: "market", name: "Market & Bakkal", icon: "🛒" },
  { slug: "saglik", name: "Sağlık & Eczane", icon: "🏥" },
  { slug: "hizmet", name: "Hizmet & Tamirci", icon: "🔧" },
  { slug: "guzellik", name: "Güzellik & Kuaför", icon: "💇" },
  { slug: "egitim", name: "Eğitim & Kurs", icon: "📚" },
  { slug: "turizm", name: "Turizm & Otel", icon: "🏨" },
  { slug: "insaat", name: "İnşaat & Gayrimenkul", icon: "🏗️" },
  { slug: "oto", name: "Otomotiv & Servis", icon: "🚗" },
  { slug: "teknoloji", name: "Teknoloji & Yazılım", icon: "💻" },
  { slug: "finans", name: "Finans & Sigorta", icon: "💰" },
  { slug: "eglence", name: "Eğlence & Spor", icon: "🎭" },
];

interface Business {
  id: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  rating: number;
  photoUrl: string;
  description: string;
  category?: { name: string; icon?: string } | null;
  isPremium: boolean;
  hasDelivery: boolean;
  hasOnlineOrder: boolean;
  storeType: string | null;
}

export default function SariSayfalar() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filtered, setFiltered] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [activeSektor, setActiveSektor] = useState("tumu");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetch("/api/map/businesses?limit=200&active=true")
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d?.data) ? d.data : (Array.isArray(d) ? d : []);
        setBusinesses(list);
        setFiltered(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let result = businesses;
    if (search) result = result.filter(b => b.name?.toLowerCase().includes(search.toLowerCase()) || b.description?.toLowerCase().includes(search.toLowerCase()));
    if (city) result = result.filter(b => b.address?.toLowerCase().includes(city.toLowerCase()));
    if (activeSektor !== "tumu") {
      const sektorMap: Record<string, string[]> = {
        restoran: ["restoran", "kafe", "yemek", "cafe"],
        market: ["market", "bakkal", "süpermarket"],
        saglik: ["sağlık", "eczane", "klinik", "hastane", "doktor"],
        hizmet: ["hizmet", "tamirci", "teknik servis"],
        guzellik: ["kuaför", "güzellik", "berber"],
        egitim: ["eğitim", "kurs", "okul"],
        turizm: ["turizm", "otel", "pansiyon"],
        insaat: ["inşaat", "gayrimenkul"],
        oto: ["oto", "araç", "servis"],
        teknoloji: ["teknoloji", "yazılım"],
        finans: ["finans", "sigorta", "banka"],
        eglence: ["eğlence", "spor", "sinema"],
      };
      const keywords = sektorMap[activeSektor] || [];
      result = result.filter(b =>
        keywords.some(k => b.category?.name?.toLowerCase().includes(k) || b.name?.toLowerCase().includes(k))
      );
    }
    setFiltered(result);
  }, [search, city, activeSektor, businesses]);

  const premiumList = filtered.filter(b => b.isPremium);
  const freeList = filtered.filter(b => !b.isPremium);

  return (
    <div className="min-h-screen bg-yellow-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-400 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-3">
            <BookOpen className="w-10 h-10" />
            <h1 className="text-4xl font-black">Harita & işletmeler</h1>
          </div>
          <p className="text-yellow-100 text-lg">Bölgenizdeki tüm işletmeleri keşfedin</p>
        </div>
        {/* Search */}
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex items-center bg-white rounded-xl px-4 gap-2">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              className="flex-1 py-3 text-gray-800 bg-transparent outline-none placeholder-gray-400"
              placeholder="İşletme veya hizmet ara..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center bg-white/20 rounded-xl px-4 gap-2 min-w-[150px]">
            <MapPin className="w-4 h-4 text-white shrink-0" />
            <input
              className="py-3 text-white bg-transparent outline-none placeholder-white/80 w-full"
              placeholder="Şehir / İlçe..."
              value={city} onChange={e => setCity(e.target.value)}
            />
          </div>
        </div>
        {/* Stats */}
        <div className="max-w-3xl mx-auto mt-5 flex justify-center gap-8 text-sm text-yellow-100">
          <span><strong className="text-white text-lg">{businesses.length}</strong> işletme</span>
          <span><strong className="text-white text-lg">{premiumList.length}</strong> premium üye</span>
        </div>
      </div>

      {/* Sektör tabs */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveSektor("tumu")}
            className={`shrink-0 px-4 py-2 rounded-full font-semibold text-sm transition ${activeSektor === "tumu" ? "bg-yellow-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            🏢 Tümü
          </button>
          {SEKTÖRLER.map(s => (
            <button key={s.slug} onClick={() => setActiveSektor(s.slug)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full font-semibold text-sm transition ${activeSektor === s.slug ? "bg-yellow-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              <span>{s.icon}</span> {s.name}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Register CTA */}
        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-black text-white text-lg">İşletmenizi listeleyin!</h3>
            <p className="text-yellow-100 text-sm">Haritaya ücretsiz eklenin, milyonlarca müşteriye ulaşın.</p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="shrink-0 bg-white text-yellow-600 font-bold px-6 py-3 rounded-xl hover:bg-yellow-50 transition shadow-sm">
            Ücretsiz Listele
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(9)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <>
            {/* Premium */}
            {premiumList.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-400" /> Premium İşletmeler
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {premiumList.map(b => <BusinessCard key={b.id} b={b} premium />)}
                </div>
              </section>
            )}

            {/* Free */}
            {freeList.length > 0 && (
              <section>
                {premiumList.length > 0 && (
                  <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-gray-400" /> Diğer İşletmeler
                  </h2>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {freeList.map(b => <BusinessCard key={b.id} b={b} premium={false} />)}
                </div>
              </section>
            )}

            {filtered.length === 0 && (
              <div className="text-center py-20 text-gray-400">
                <Building2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-xl font-semibold">Bu kriterlere uygun işletme bulunamadı</p>
                <p className="mt-2 text-sm">Farklı anahtar kelimeler deneyin</p>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && <RegisterModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

function BusinessCard({ b, premium }: { b: Business; premium: boolean }) {
  const storeLink = b.storeType === "siparis"
    ? null
    : b.storeType === "alisveris"
    ? null
    : null;

  return (
    <Link href={`/kesfet/isletme/${b.id}`}>
      <div className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer group border ${premium ? "border-yellow-300" : "border-gray-100"}`}>
        {/* Photo */}
        <div className="relative h-40 bg-gray-100 overflow-hidden">
          {b.photoUrl ? (
            <img src={b.photoUrl} alt={b.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-yellow-100 to-orange-100 flex items-center justify-center text-4xl">
              {b.category?.icon || "🏢"}
            </div>
          )}
          {premium && (
            <span className="absolute top-2 left-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <Star className="w-3 h-3 fill-white" /> Premium
            </span>
          )}
          {b.storeType && (
            <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-1 rounded-full ${b.storeType === "siparis" ? "bg-orange-500 text-white" : b.storeType === "alisveris" ? "bg-blue-500 text-white" : "bg-green-500 text-white"}`}>
              {b.storeType === "siparis" ? "🛵 Sipariş" : b.storeType === "alisveris" ? "🛒 Alışveriş" : "🔧 Hizmet"}
            </span>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between mb-1">
            <h3 className="font-bold text-gray-900 text-base leading-tight">{b.name}</h3>
            <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
          </div>
          {b.category?.name && (
            <span className="inline-block text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full mb-2">{b.category.name}</span>
          )}
          {b.description && (
            <p className="text-xs text-gray-500 mb-2 line-clamp-2">{b.description}</p>
          )}
          {b.rating > 0 && (
            <div className="flex items-center gap-1 text-xs text-amber-500 mb-2">
              <Star className="w-3 h-3 fill-amber-400" /> <span className="font-semibold">{b.rating.toFixed(1)}</span>
            </div>
          )}
          <div className="space-y-1 text-xs text-gray-500">
            {b.address && (
              <div className="flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" /><span className="line-clamp-1">{b.address}</span></div>
            )}
            {b.phone && (
              <div className="flex items-center gap-1"><Phone className="w-3 h-3 shrink-0" /><span>{b.phone}</span></div>
            )}
            {b.website && (
              <div className="flex items-center gap-1 text-blue-500">
                <Globe className="w-3 h-3 shrink-0" />
                <span className="truncate">{b.website.replace(/^https?:\/\//, "")}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden animate-pulse">
      <div className="h-40 bg-gray-200" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  );
}

function RegisterModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: "", phone: "", city: "", category: "", website: "", email: "" });
  const [sent, setSent] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/map/contact-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, type: "sari_sayfalar_kayit" }),
    }).catch(() => {});
    setSent(true);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-t-2xl p-5">
          <h2 className="text-xl font-black text-white">İşletmenizi Listeleyin</h2>
          <p className="text-yellow-100 text-sm">Haritaya ücretsiz eklenin</p>
        </div>
        {sent ? (
          <div className="p-8 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Başvurunuz alındı!</h3>
            <p className="text-gray-500 text-sm mb-4">En kısa sürede sizinle iletişime geçeceğiz.</p>
            <button onClick={onClose} className="bg-yellow-500 text-white font-bold px-6 py-2 rounded-xl">Kapat</button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-5 space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">İşletme Adı *</label>
              <input required value={form.name} onChange={e => set("name", e.target.value)}
                className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" placeholder="Örn: Ahmet'in Lokantası" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Telefon *</label>
                <input required value={form.phone} onChange={e => set("phone", e.target.value)}
                  className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" placeholder="05xx..." />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Şehir</label>
                <input value={form.city} onChange={e => set("city", e.target.value)}
                  className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" placeholder="İstanbul..." />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Sektör / Kategori</label>
              <input value={form.category} onChange={e => set("category", e.target.value)}
                className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" placeholder="Restoran, Market, Kuaför..." />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">E-posta</label>
              <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" placeholder="isletme@..." />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Web Sitesi</label>
              <input value={form.website} onChange={e => set("website", e.target.value)}
                className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" placeholder="https://..." />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-2 rounded-xl border text-gray-600 font-semibold hover:bg-gray-50 transition">İptal</button>
              <button type="submit"
                className="flex-1 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-white font-bold transition">Gönder</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
