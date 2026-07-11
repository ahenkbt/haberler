import { useState, useEffect } from "react";
import { Link, Redirect, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useHmMetaByDomain, type HmMetaByDomain } from "@/lib/fetchHmMetaByDomain";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { isDefaultPortalHost } from "@/lib/hmPortalHosts";
import { apiUrl, resolveClientMediaSrc } from "@/lib/apiBase";
import { PWA_APP_NAME, PORTAL_BRAND_SHORT, PWA_ICON_PATH, PWA_STORE_NAME } from "@/lib/portalBrand";
import { hmSiteIconUrlFromLayout } from "@/lib/hmNestedMetaStorage";

const INITIAL_DOWNLOAD_COUNT = 100_000;
const STORAGE_KEY = "ap_download_count";
const REVIEWS_KEY = "ap_user_reviews";

const FAKE_REVIEWS = [
  {
    id: 1,
    name: "Mehmet K.",
    avatar: "M",
    avatarColor: "from-blue-500 to-indigo-600",
    date: "28 Nisan 2026",
    stars: 5,
    text: "Harika bir uygulama! Türkiye'nin en kapsamlı haber ve harita uygulaması. Günde birkaç kez kullanıyorum, çok işe yarıyor.",
    helpful: 42,
  },
  {
    id: 2,
    name: "Ayşe D.",
    avatar: "A",
    avatarColor: "from-pink-500 to-rose-600",
    date: "25 Nisan 2026",
    stars: 5,
    text: "Keşfet özelliği süper! Bulunduğum yere en yakın işletmeleri anında buluyorum. Arayüz de çok şık ve kullanışlı.",
    helpful: 38,
  },
  {
    id: 3,
    name: "Hüseyin T.",
    avatar: "H",
    avatarColor: "from-emerald-500 to-teal-600",
    date: "22 Nisan 2026",
    stars: 5,
    text: "Son dakika haberler çok hızlı geliyor. Wikipedia entegrasyonu ile turistik yerleri öğrenmek artık çok kolay. Teşekkürler Yekpare ekibi!",
    helpful: 29,
  },
  {
    id: 4,
    name: "Fatma Ş.",
    avatar: "F",
    avatarColor: "from-violet-500 to-purple-600",
    date: "19 Nisan 2026",
    stars: 5,
    text: "Canlı TV özelliği mükemmel. Hem haberler hem de işletme rehberi bir arada. Kesinlikle tavsiye ediyorum!",
    helpful: 21,
  },
  {
    id: 5,
    name: "Ali R.",
    avatar: "A",
    avatarColor: "from-amber-500 to-orange-600",
    date: "15 Nisan 2026",
    stars: 4,
    text: "Genel olarak çok iyi. Haritalar sayfası özellikle işime çok yarıyor. Küçük bir hız iyileştirmesi ile 5 yıldız olur.",
    helpful: 15,
  },
  {
    id: 6,
    name: "Zeynep A.",
    avatar: "Z",
    avatarColor: "from-cyan-500 to-blue-600",
    date: "12 Nisan 2026",
    stars: 5,
    text: "Ana ekrana ekledim, gerçek uygulama gibi çalışıyor. İnternet olmasa bile çalışıyor, çok kullanışlı.",
    helpful: 33,
  },
];

const FEATURES = [
  { icon: "📰", label: "Son Dakika Haberler", desc: "Türkiye ve dünyadan anlık haberler" },
  { icon: "🗺️", label: "Akıllı Harita", desc: "Yakınımdaki işletmeler ve turistik yerler" },
  { icon: "📺", label: "Canlı TV", desc: "Binlerce kanal ve video içeriği" },
  { icon: "🏪", label: "İşletme Rehberi", desc: "Restoran, kafe, eczane ve daha fazlası" },
  { icon: "📖", label: "Ansiklopedi", desc: "Wikipedia entegrasyonlu bilgi portalı" },
  { icon: "🛍️", label: "Online Mağaza", desc: "Güvenli alışveriş deneyimi" },
];

function StarRow({ count, filled }: { count: number; filled: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-0.5">
      <span className="text-xs text-gray-500 w-4">{count}</span>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${filled ? "bg-green-500" : "bg-gray-300"}`}
          style={{ width: count === 5 ? "82%" : count === 4 ? "11%" : count === 3 ? "4%" : count === 2 ? "2%" : "1%" }}
        />
      </div>
    </div>
  );
}

function StarDisplay({ stars, size = "sm" }: { stars: number; size?: "sm" | "lg" }) {
  const sz = size === "lg" ? "w-5 h-5" : "w-3.5 h-3.5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} className={`${sz} ${s <= stars ? "text-yellow-400" : "text-gray-300"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      ))}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button key={s} type="button"
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
          className="transition-transform hover:scale-110">
          <svg className={`w-7 h-7 ${s <= (hover || value) ? "text-yellow-400" : "text-gray-300"} transition-colors`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
          </svg>
        </button>
      ))}
    </div>
  );
}

function UygulamayiIndirYekpareBody() {
  const { state, triggerInstall } = usePWAInstall();
  const [downloadCount, setDownloadCount] = useState(INITIAL_DOWNLOAD_COUNT);
  const [installed, setInstalled] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);
  const [reviews, setReviews] = useState<typeof FAKE_REVIEWS>([]);
  const [newReview, setNewReview] = useState({ name: "", stars: 5, text: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [helpedIds, setHelpedIds] = useState<number[]>([]);
  const [helpedCounts, setHelpedCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const count = stored ? parseInt(stored, 10) : INITIAL_DOWNLOAD_COUNT;
    setDownloadCount(count);

    const storedReviews = localStorage.getItem(REVIEWS_KEY);
    const userReviews = storedReviews ? JSON.parse(storedReviews) : [];
    setReviews([...userReviews, ...FAKE_REVIEWS]);
  }, []);

  function formatCount(n: number) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " Mn+";
    if (n >= 1_000) return Math.floor(n / 1_000) + " B+";
    return n.toString();
  }

  async function handleInstall() {
    if (state === "ios") {
      setShowIosGuide(true);
    } else if (state === "android-manual") {
      setShowAndroidGuide(true);
    } else if (state === "chrome-prompt") {
      await triggerInstall();
      const newCount = downloadCount + 1;
      localStorage.setItem(STORAGE_KEY, String(newCount));
      setDownloadCount(newCount);
      setInstalled(true);
    } else {
      setShowAndroidGuide(true);
    }
  }

  function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!newReview.name.trim() || !newReview.text.trim() || newReview.stars === 0) return;
    setSubmitting(true);
    setTimeout(() => {
      const now = new Date();
      const dateStr = `${now.getDate()} ${["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"][now.getMonth()]} ${now.getFullYear()}`;
      const colors = ["from-blue-500 to-indigo-600","from-pink-500 to-rose-600","from-emerald-500 to-teal-600","from-violet-500 to-purple-600","from-amber-500 to-orange-600","from-cyan-500 to-blue-600"];
      const newEntry = {
        id: Date.now(),
        name: newReview.name.trim(),
        avatar: newReview.name.trim()[0].toUpperCase(),
        avatarColor: colors[Math.floor(Math.random() * colors.length)],
        date: dateStr,
        stars: newReview.stars,
        text: newReview.text.trim(),
        helpful: 0,
      };
      const storedReviews = localStorage.getItem(REVIEWS_KEY);
      const existing = storedReviews ? JSON.parse(storedReviews) : [];
      const updated = [newEntry, ...existing];
      localStorage.setItem(REVIEWS_KEY, JSON.stringify(updated));
      setReviews([newEntry, ...reviews]);
      setNewReview({ name: "", stars: 5, text: "" });
      setSubmitting(false);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    }, 800);
  }

  function handleHelp(id: number) {
    if (helpedIds.includes(id)) return;
    setHelpedIds(p => [...p, id]);
    setHelpedCounts(p => ({ ...p, [id]: (p[id] || 0) + 1 }));
  }

  const avgRating = (reviews.reduce((s, r) => s + r.stars, 0) / reviews.length).toFixed(1);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar — mimics Play Store green */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/pwastore" className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
          </Link>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900">{PWA_STORE_NAME}</p>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
      </div>

      <div className="max-w-lg mx-auto">
        {/* App hero header */}
        <div className="bg-white px-4 pt-5 pb-4">
          <div className="flex items-start gap-4">
            {/* App icon */}
            <div className="w-20 h-20 rounded-[22px] overflow-hidden shadow-lg shrink-0 ring-1 ring-gray-100">
              <img src={PWA_ICON_PATH} alt={PORTAL_BRAND_SHORT} className="w-full h-full object-cover"/>
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <h1 className="text-xl font-black text-gray-900 leading-tight">{PWA_APP_NAME}</h1>
              <p className="text-sm font-semibold text-green-600 mt-0.5">Ahenk Bilgi Teknolojileri</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <StarDisplay stars={5} size="sm"/>
                </div>
                <span className="text-xs text-gray-500 font-medium">4.8</span>
                <span className="text-gray-300 text-xs">•</span>
                <span className="text-xs text-gray-500 font-medium">{formatCount(downloadCount)} indirme</span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-0 mt-5 border border-gray-100 rounded-2xl overflow-hidden">
            <div className="flex flex-col items-center py-3 border-r border-gray-100">
              <span className="text-base font-black text-gray-900">{formatCount(downloadCount)}</span>
              <span className="text-[10px] text-gray-400 font-medium mt-0.5">İndirme</span>
            </div>
            <div className="flex flex-col items-center py-3 border-r border-gray-100">
              <div className="flex items-center gap-0.5">
                <span className="text-base font-black text-gray-900">4.8</span>
                <svg className="w-3.5 h-3.5 text-yellow-400 mb-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              </div>
              <span className="text-[10px] text-gray-400 font-medium mt-0.5">Puan</span>
            </div>
            <div className="flex flex-col items-center py-3">
              <span className="text-base font-black text-gray-900">Ücretsiz</span>
              <span className="text-[10px] text-gray-400 font-medium mt-0.5">Fiyat</span>
            </div>
          </div>

          {/* Install button */}
          {installed ? (
            <div className="mt-4 flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-50 text-green-700 font-bold text-sm ring-2 ring-green-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
              </svg>
              Başarıyla Yüklendi!
            </div>
          ) : (
            <button onClick={handleInstall}
              className="mt-4 w-full py-3 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-base shadow-lg shadow-green-400/30 hover:from-green-600 hover:to-emerald-700 transition active:scale-[0.98]">
              ⬇ Yükle — Ücretsiz
            </button>
          )}
          <p className="text-center text-[10px] text-gray-400 mt-2">Türkçe · Haber, Harita, TV, Mağaza</p>
        </div>

        {/* iOS Guide */}
        {showIosGuide && (
          <div className="mx-4 mt-2 bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-blue-800 text-sm">iPhone/iPad'e Yükleme</p>
              <button onClick={() => setShowIosGuide(false)} className="text-blue-400 hover:text-blue-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0">1</span>
                <p className="text-sm text-blue-800">Safari'de alt menüde <strong>Paylaş</strong> <svg className="w-4 h-4 inline text-blue-600 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"/></svg> düğmesine bas</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0">2</span>
                <p className="text-sm text-blue-800"><strong>"Ana Ekrana Ekle"</strong> seçeneğine dokun</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0">3</span>
                <p className="text-sm text-blue-800">Sağ üstte <strong>"Ekle"</strong> ye bas — tamam!</p>
              </div>
            </div>
          </div>
        )}

        {/* Android Guide */}
        {showAndroidGuide && (
          <div className="mx-4 mt-2 bg-green-50 border border-green-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-green-800 text-sm">Android'e Yükleme</p>
              <button onClick={() => setShowAndroidGuide(false)} className="text-green-400 hover:text-green-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-green-600 text-white text-xs font-black flex items-center justify-center shrink-0">1</span>
                <p className="text-sm text-green-800">Tarayıcıda sağ üstteki <strong>⋮</strong> menüye dokun</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-green-600 text-white text-xs font-black flex items-center justify-center shrink-0">2</span>
                <p className="text-sm text-green-800"><strong>"Ana ekrana ekle"</strong> veya <strong>"Uygulamayı yükle"</strong> seçeneğini bul</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-green-600 text-white text-xs font-black flex items-center justify-center shrink-0">3</span>
                <p className="text-sm text-green-800"><strong>"Ekle"</strong> ye dokun — kurulum tamamlandı!</p>
              </div>
            </div>
          </div>
        )}

        {/* Screenshots / preview */}
        <div className="bg-white mt-2 px-4 pt-4 pb-5">
          <h2 className="text-sm font-black text-gray-900 mb-3">Ekran Görüntüleri</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {[
              { bg: "from-red-500 to-rose-600", label: "📰 Haberler", sub: "Son dakika & canlı akış" },
              { bg: "from-blue-500 to-indigo-600", label: "🗺️ Keşfet", sub: "Harita & işletme rehberi" },
              { bg: "from-purple-500 to-violet-600", label: "📺 Canlı TV", sub: "Binlerce kanal" },
              { bg: "from-emerald-500 to-teal-600", label: "📖 Ansiklopedi", sub: "Wikipedia entegrasyonu" },
              { bg: "from-amber-500 to-orange-600", label: "🛍️ Mağaza", sub: "Online alışveriş" },
            ].map((s, i) => (
              <div key={i} className={`flex-shrink-0 w-28 h-48 rounded-2xl bg-gradient-to-b ${s.bg} flex flex-col items-center justify-end p-3 shadow-md`}>
                <p className="text-white text-xs font-black leading-tight text-center">{s.label}</p>
                <p className="text-white/70 text-[9px] text-center mt-0.5 leading-tight">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* About */}
        <div className="bg-white mt-2 px-4 py-4">
          <h2 className="text-sm font-black text-gray-900 mb-2">Uygulama Hakkında</h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            <strong>{PORTAL_BRAND_SHORT}</strong>, Türkiye'nin en kapsamlı dijital medya ve süper-uygulama platformudur.
            Son dakika haberlerden canlı TV'ye, interaktif haritalardan online mağazaya kadar tüm dijital ihtiyaçlarınız tek bir uygulamada.
          </p>
          <p className="text-sm text-gray-700 leading-relaxed mt-2">
            <strong>Öne Çıkan Özellikler:</strong> Keşfet sayfasında bulunduğunuz yere en yakın restoranları, kafeleri, hastaneleri ve daha fazlasını anında keşfedin.
            Wikipedia entegrasyonu ile turistik yerleri derinlemesine öğrenin. Çevrimdışı da çalışır, daha hızlı açılır.
          </p>
        </div>

        {/* Features list */}
        <div className="bg-white mt-2 px-4 py-4">
          <h2 className="text-sm font-black text-gray-900 mb-3">Özellikler</h2>
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map((f) => (
              <div key={f.label} className="flex items-start gap-2.5 bg-gray-50 rounded-2xl p-3">
                <span className="text-xl shrink-0">{f.icon}</span>
                <div>
                  <p className="text-xs font-bold text-gray-900 leading-tight">{f.label}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Developer info */}
        <div className="bg-white mt-2 px-4 py-4">
          <h2 className="text-sm font-black text-gray-900 mb-3">Geliştirici Bilgileri</h2>
          <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-lg shrink-0 shadow-md">
              A
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Ahenk Bilgi Teknolojileri</p>
              <p className="text-xs text-gray-500 mt-0.5">Türkiye · Dijital Medya & Teknoloji</p>
              <p className="text-xs text-green-600 font-semibold mt-1">✓ Doğrulanmış Geliştirici</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="bg-gray-50 rounded-xl p-2.5 text-center">
              <p className="text-xs font-black text-gray-900">v2.1</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Sürüm</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-2.5 text-center">
              <p className="text-xs font-black text-gray-900">2024</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Yayın Yılı</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-2.5 text-center">
              <p className="text-xs font-black text-gray-900">Tüm Yaşlar</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Yaş Sınırı</p>
            </div>
          </div>
        </div>

        {/* Ratings */}
        <div className="bg-white mt-2 px-4 py-4">
          <h2 className="text-sm font-black text-gray-900 mb-4">Derecelendirmeler ve Yorumlar</h2>
          <div className="flex items-center gap-6 mb-4">
            <div className="text-center">
              <p className="text-5xl font-black text-gray-900">{avgRating}</p>
              <StarDisplay stars={5} size="sm"/>
              <p className="text-[10px] text-gray-400 mt-1">{reviews.length} değerlendirme</p>
            </div>
            <div className="flex-1">
              {[5, 4, 3, 2, 1].map(n => <StarRow key={n} count={n} filled={n >= 4}/>)}
            </div>
          </div>

          {/* Reviews */}
          <div className="space-y-4">
            {reviews.slice(0, 8).map((r) => (
              <div key={r.id} className="pb-4 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${r.avatarColor} flex items-center justify-center text-white font-black text-sm shrink-0`}>
                    {r.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{r.name}</p>
                    <div className="flex items-center gap-1.5">
                      <StarDisplay stars={r.stars} size="sm"/>
                      <span className="text-[10px] text-gray-400">{r.date}</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{r.text}</p>
                <button
                  onClick={() => handleHelp(r.id)}
                  className={`mt-2 flex items-center gap-1.5 text-[11px] font-semibold transition ${helpedIds.includes(r.id) ? "text-green-600" : "text-gray-400 hover:text-gray-600"}`}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/>
                  </svg>
                  Yararlı ({(r.helpful || 0) + (helpedCounts[r.id] || 0)})
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Add review */}
        <div className="bg-white mt-2 px-4 py-4 mb-6">
          <h2 className="text-sm font-black text-gray-900 mb-4">Yorum Yaz</h2>
          {submitted ? (
            <div className="flex items-center gap-2 py-3 px-4 bg-green-50 rounded-2xl text-green-700 font-semibold text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
              </svg>
              Yorumunuz yayınlandı! Teşekkürler.
            </div>
          ) : (
            <form onSubmit={handleSubmitReview} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Puanınız</label>
                <StarPicker value={newReview.stars} onChange={s => setNewReview(p => ({ ...p, stars: s }))}/>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Adınız</label>
                <input
                  type="text"
                  value={newReview.name}
                  onChange={e => setNewReview(p => ({ ...p, name: e.target.value }))}
                  placeholder="Adınız veya takma adınız"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent bg-gray-50"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Yorumunuz</label>
                <textarea
                  value={newReview.text}
                  onChange={e => setNewReview(p => ({ ...p, text: e.target.value }))}
                  placeholder="Uygulama hakkındaki düşüncelerinizi paylaşın..."
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent bg-gray-50 resize-none"
                />
              </div>
              <button type="submit" disabled={submitting || !newReview.name.trim() || !newReview.text.trim()}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-sm shadow-md shadow-green-400/30 disabled:opacity-50 disabled:cursor-not-allowed hover:from-green-600 hover:to-emerald-700 transition active:scale-[0.98]">
                {submitting ? "Gönderiliyor..." : "Yorumu Gönder"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function pwastoreHref(): string {
  if (typeof window === "undefined") return "https://yekpare.net/pwastore";
  const h = window.location.hostname.toLowerCase().split(":")[0] ?? "";
  if (isDefaultPortalHost(h)) return `${window.location.origin}/pwastore`;
  return "https://yekpare.net/pwastore";
}

type HmMeta = HmMetaByDomain;

function UygulamayiIndirHmByHost() {
  const host = typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";
  const { data, isLoading, isError } = useHmMetaByDomain(host, {
    enabled: typeof window !== "undefined" && !!host,
  });
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 text-sm">Yükleniyor…</div>
    );
  }
  if (isError || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-gray-700 font-medium text-center">Bu alan için uygulama bilgisi bulunamadı.</p>
        <a href={pwastoreHref()} className="text-green-600 font-bold hover:underline">
          {PWA_STORE_NAME}
        </a>
      </div>
    );
  }

  const logoUrl = hmSiteIconUrlFromLayout(data.layout);
  const logo = logoUrl ? resolveClientMediaSrc(logoUrl) : "";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <a href={pwastoreHref()} className="p-2 rounded-full hover:bg-gray-100 text-gray-600 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </a>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{PWA_STORE_NAME}</p>
            <p className="text-[10px] text-gray-500 truncate">Mağazaya dön</p>
          </div>
        </div>
      </div>
      <div className="max-w-lg mx-auto px-4 pt-6 pb-10">
        <div className="flex items-start gap-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="w-20 h-20 rounded-[22px] overflow-hidden shadow-lg shrink-0 ring-1 ring-gray-100 bg-slate-900">
            {logo ? (
              <img src={logo} alt="" className="w-full h-full object-contain p-1" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-black text-xl">
                {data.displayName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-gray-900 leading-tight">{data.displayName}</h1>
            <p className="text-sm text-gray-600 mt-1">Haber merkezi PWA — ana ekrana ekleyerek siteyi uygulama gibi kullanın.</p>
            <p className="text-xs text-gray-400 mt-2 break-all">{data.domain ?? host}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
            if (ios) setShowIosGuide(true);
            else setShowAndroidGuide(true);
          }}
          className="mt-6 w-full py-3 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-base shadow-lg"
        >
          Nasıl yüklenir?
        </button>
        {data.domain ? (
          <a
            href={`https://${data.domain.replace(/^https?:\/\//, "").split("/")[0]}/`}
            className="mt-3 block text-center text-sm font-semibold text-green-700 hover:underline"
          >
            Siteyi tarayıcıda aç →
          </a>
        ) : null}
        {showIosGuide ? (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-900">
            <p className="font-bold mb-2">iPhone / iPad</p>
            <p>Safari’de Paylaş → Ana Ekrana Ekle.</p>
            <button type="button" className="mt-2 text-blue-600 underline" onClick={() => setShowIosGuide(false)}>
              Kapat
            </button>
          </div>
        ) : null}
        {showAndroidGuide ? (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-2xl p-4 text-sm text-green-900">
            <p className="font-bold mb-2">Android</p>
            <p>Menü (⋮) → Ana ekrana ekle / Uygulamayı yükle.</p>
            <button type="button" className="mt-2 text-green-700 underline" onClick={() => setShowAndroidGuide(false)}>
              Kapat
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function normalizeHost(d: string): string {
  return d.replace(/^https?:\/\//, "").split("/")[0]?.toLowerCase() ?? "";
}

function UygulamayiIndirHmMetaCard({ meta }: { meta: HmMeta }) {
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);
  const logoUrl = hmSiteIconUrlFromLayout(meta.layout);
  const logo = logoUrl ? resolveClientMediaSrc(logoUrl) : "";
  const openUrl = meta.domain
    ? `https://${normalizeHost(meta.domain)}/`
    : `${typeof window !== "undefined" ? window.location.origin : ""}/tr/${encodeURIComponent(meta.slug)}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/pwastore" className="p-2 rounded-full hover:bg-gray-100 text-gray-600 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{PWA_STORE_NAME}</p>
          </div>
        </div>
      </div>
      <div className="max-w-lg mx-auto px-4 pt-6 pb-10">
        <div className="flex items-start gap-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="w-20 h-20 rounded-[22px] overflow-hidden shadow-lg shrink-0 ring-1 ring-gray-100 bg-slate-900">
            {logo ? (
              <img src={logo} alt="" className="w-full h-full object-contain p-1" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-black text-xl">
                {meta.displayName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-gray-900 leading-tight">{meta.displayName}</h1>
            <p className="text-sm text-gray-600 mt-1">Haber sitesi uygulaması — yüklemek için aşağıdaki adımları izleyin.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
            if (ios) setShowIosGuide(true);
            else setShowAndroidGuide(true);
          }}
          className="mt-6 w-full py-3 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-base shadow-lg"
        >
          Nasıl yüklenir?
        </button>
        <a href={openUrl} className="mt-4 block text-center text-sm font-semibold text-green-700 hover:underline">
          Siteyi tarayıcıda aç →
        </a>
        {showIosGuide ? (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-900">
            <p className="font-bold mb-2">iPhone / iPad</p>
            <p className="mb-2">
              <strong className="break-all">{openUrl}</strong> adresini Safari’de açın; Paylaş → Ana Ekrana Ekle.
            </p>
            <button type="button" className="text-blue-600 underline" onClick={() => setShowIosGuide(false)}>
              Kapat
            </button>
          </div>
        ) : null}
        {showAndroidGuide ? (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-2xl p-4 text-sm text-green-900">
            <p className="font-bold mb-2">Android</p>
            <p className="mb-2">
              <strong className="break-all">{openUrl}</strong> adresini Chrome’da açın; menüden Ana ekrana ekle.
            </p>
            <button type="button" className="text-green-700 underline" onClick={() => setShowAndroidGuide(false)}>
              Kapat
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function UygulamayiIndirHmBySlug({ slug }: { slug: string }) {
  const host = typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";
  const { data, isLoading } = useQuery({
    queryKey: ["/api/hm/meta/by-slug", slug],
    queryFn: async () => {
      const r = await fetch(apiUrl(`/api/hm/meta/by-slug/${encodeURIComponent(slug)}`));
      if (!r.ok) throw new Error("404");
      return (await r.json()) as HmMeta;
    },
  });
  if (isLoading || !data) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 text-sm">Yükleniyor…</div>;
  }
  if (data.domain && normalizeHost(data.domain) === normalizeHost(host)) {
    return <UygulamayiIndirHmByHost />;
  }
  return <UygulamayiIndirHmMetaCard meta={data} />;
}

function UygulamayiIndirKesfet({ slug }: { slug: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/map/businesses/by-slug", slug],
    queryFn: async () => {
      const r = await fetch(apiUrl(`/api/map/businesses/by-slug/${encodeURIComponent(slug)}`));
      if (!r.ok) throw new Error("404");
      const j = (await r.json()) as {
        success?: boolean;
        data?: { name?: string; photoUrl?: string | null; coverPhotoUrl?: string | null };
      };
      if (!j.success || !j.data?.name) throw new Error("404");
      return j.data;
    },
  });
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);
  const kesfetUrl =
    typeof window !== "undefined" ? `${window.location.origin}/kesfet/${encodeURIComponent(slug)}` : `/kesfet/${encodeURIComponent(slug)}`;

  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 text-sm">Yükleniyor…</div>;
  }
  if (isError || !data?.name) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-gray-700">İşletme bulunamadı.</p>
        <Link href="/pwastore" className="text-green-600 font-bold hover:underline">
          {PWA_STORE_NAME}
        </Link>
      </div>
    );
  }

  const img = resolveClientMediaSrc(data.photoUrl || data.coverPhotoUrl || "");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/pwastore" className="p-2 rounded-full hover:bg-gray-100 text-gray-600 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{PWA_STORE_NAME}</p>
          </div>
        </div>
      </div>
      <div className="max-w-lg mx-auto px-4 pt-6 pb-10">
        <div className="flex items-start gap-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="w-20 h-20 rounded-[22px] overflow-hidden shadow-lg shrink-0 ring-1 ring-gray-100 bg-slate-100">
            {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">🏪</div>}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-gray-900 leading-tight">{data.name}</h1>
            <p className="text-sm text-gray-600 mt-1">Keşfet işletme sayfasını ana ekrana ekleyerek uygulama gibi kullanın.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
            if (ios) setShowIosGuide(true);
            else setShowAndroidGuide(true);
          }}
          className="mt-6 w-full py-3 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-base shadow-lg"
        >
          Nasıl yüklenir?
        </button>
        <a href={kesfetUrl} className="mt-4 block text-center text-sm font-semibold text-green-700 hover:underline">
          Keşfet sayfasını aç →
        </a>
        {showIosGuide ? (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-900">
            <p className="font-bold mb-2">iPhone / iPad</p>
            <p className="mb-2 break-all">{kesfetUrl} — Safari’de Paylaş → Ana Ekrana Ekle.</p>
            <button type="button" className="text-blue-600 underline" onClick={() => setShowIosGuide(false)}>
              Kapat
            </button>
          </div>
        ) : null}
        {showAndroidGuide ? (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-2xl p-4 text-sm text-green-900">
            <p className="font-bold mb-2">Android</p>
            <p className="mb-2 break-all">{kesfetUrl} — Chrome menü → Ana ekrana ekle.</p>
            <button type="button" className="text-green-700 underline" onClick={() => setShowAndroidGuide(false)}>
              Kapat
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function UygulamayiIndir() {
  const [loc] = useLocation();
  const host = typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";
  const qs = new URLSearchParams(loc.includes("?") ? loc.slice(loc.indexOf("?") + 1) : "");
  const hmQ = qs.get("hm")?.trim() || "";
  const kesfetQ = qs.get("kesfet")?.trim() || "";
  const yekpareQ = qs.get("yekpare") === "1";

  if (isDefaultPortalHost(host) && !hmQ && !kesfetQ && !yekpareQ) {
    return <Redirect to="/pwastore" />;
  }
  if (!isDefaultPortalHost(host)) {
    return <UygulamayiIndirHmByHost />;
  }
  if (kesfetQ) {
    return <UygulamayiIndirKesfet slug={kesfetQ} />;
  }
  if (hmQ) {
    return <UygulamayiIndirHmBySlug slug={hmQ} />;
  }
  return <UygulamayiIndirYekpareBody />;
}
