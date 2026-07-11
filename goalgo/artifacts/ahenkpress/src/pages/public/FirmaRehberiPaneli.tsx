import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarClock,
  Edit3,
  Link2,
  MapPinned,
  PackagePlus,
  PlusCircle,
  Save,
  Send,
  ShoppingBag,
} from "lucide-react";
import {
  FIRMA_REHBERI_CATEGORIES,
  FIRMA_REHBERI_LOCATION_DISTRICTS,
  FIRMA_REHBERI_POPULAR_CITIES,
  FIRMA_REHBERI_TRANSFER_DESTINATIONS,
} from "@/lib/firmaRehberiData";

type ProductMode = "satış" | "listeleme";
type BusinessMode = "add" | "edit";

type PanelItem = {
  id: number;
  type: "Ürün" | "Hizmet" | "İlan";
  title: string;
  detail: string;
  status: string;
};

const inputClass = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#0f766e]";

export default function FirmaRehberiPaneli() {
  const [businessMode, setBusinessMode] = useState<BusinessMode>("add");
  const [productMode, setProductMode] = useState<ProductMode>("satış");
  const [serviceAppointment, setServiceAppointment] = useState(true);
  const [transferTarget, setTransferTarget] = useState("alisveris");
  const [category, setCategory] = useState(FIRMA_REHBERI_CATEGORIES[0]?.name ?? "Sağlık");
  const [city, setCity] = useState(FIRMA_REHBERI_POPULAR_CITIES[0] ?? "İstanbul");
  const [district, setDistrict] = useState(FIRMA_REHBERI_LOCATION_DISTRICTS[FIRMA_REHBERI_POPULAR_CITIES[0] ?? "İstanbul"]?.[0] ?? "");
  const [businessName, setBusinessName] = useState("Örnek Firma Rehberi İşletmesi");
  const [items, setItems] = useState<PanelItem[]>([
    {
      id: 1,
      type: "Hizmet",
      title: "Diş muayenesi",
      detail: "Randevu alınabilir hizmet",
      status: "Keşfet profiline bağlanacak",
    },
    {
      id: 2,
      type: "Ürün",
      title: "Ev tekstili katalog ürünü",
      detail: "Listeleme modu",
      status: "Alışverişe aktarılabilir",
    },
  ]);
  const [flash, setFlash] = useState("");

  const subcategories = useMemo(
    () => FIRMA_REHBERI_CATEGORIES.find((item) => item.name === category)?.subcategories ?? [],
    [category],
  );
  const districtOptions = FIRMA_REHBERI_LOCATION_DISTRICTS[city] ?? [];
  const transfer = FIRMA_REHBERI_TRANSFER_DESTINATIONS.find((item) => item.key === transferTarget) ?? FIRMA_REHBERI_TRANSFER_DESTINATIONS[0];

  function addItem(type: PanelItem["type"], title: string, detail: string) {
    setItems((prev) => [{ id: Date.now(), type, title, detail, status: "Taslak olarak eklendi" }, ...prev]);
    setFlash(`${type} taslağı eklendi. Kalıcı kayıt akışı hazır olduğunda otomatik yayına alınacak.`);
  }

  return (
    <div className="sade-public-page min-h-screen text-slate-900">
      <header className="sade-public-hero sade-public-hero-surface rounded-b-[2rem] border-b border-emerald-100 text-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <Link href="/firma-rehberi" className="text-sm font-black text-[#0f766e] underline">
            Firma Rehberi
          </Link>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0f766e]">Servis sağlayıcı paneli</p>
              <h1 className="mt-2 text-4xl font-black tracking-tight">Firma Rehberi işletme yönetimi</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-slate-600">
                İşletme ekleyin, mevcut profili düzenleyin, ürün/hizmet/ilan içeriklerini hazırlayın ve uygun kayıtları diğer Yekpare servislerine aktarın.
              </p>
            </div>
            <a href="/kesfet" className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950">
              Keşfet profiline bağla
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-8 xl:grid-cols-[1fr_.85fr]">
        <section className="space-y-5">
          {flash ? (
            <div className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">{flash}</div>
          ) : null}

          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-white p-5 text-slate-950">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0f766e] text-white">
                    <MapPinned className="h-6 w-6" />
                  </span>
                  <div>
                    <h2 className="text-xl font-black">İşletme ekle / düzenle</h2>
                    <p className="text-sm font-semibold text-slate-600">Keşfet ve Firma Rehberi kartı için ana profil.</p>
                  </div>
                </div>
                <div className="flex rounded-2xl bg-white/10 p-1">
                  {[
                    { key: "add", label: "İşletme ekle", icon: PlusCircle },
                    { key: "edit", label: "İşletme düzenle", icon: Edit3 },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setBusinessMode(item.key as BusinessMode)}
                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${
                          businessMode === item.key ? "bg-white text-slate-950" : "text-white hover:bg-white/10"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="p-5">
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
                {businessMode === "add"
                  ? "Yeni işletme kaydı taslak olarak hazırlanır; onaylandığında sağlayıcı hesabına kalıcı kaydedilecek."
                  : "Mevcut işletme bilgilerini düzenleme ekranı. İlk sürümde örnek kayıt üzerinde çalışır."}
              </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input className={inputClass} placeholder="İşletme / firma adı" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
                {FIRMA_REHBERI_CATEGORIES.map((item) => (
                  <option key={item.name} value={item.name}>{item.name}</option>
                ))}
              </select>
              <select className={inputClass}>
                {subcategories.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              <select
                className={inputClass}
                value={city}
                onChange={(e) => {
                  const nextCity = e.target.value;
                  setCity(nextCity);
                  setDistrict(FIRMA_REHBERI_LOCATION_DISTRICTS[nextCity]?.[0] ?? "");
                }}
              >
                {FIRMA_REHBERI_POPULAR_CITIES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              <select className={inputClass} value={district} onChange={(e) => setDistrict(e.target.value)}>
                {districtOptions.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              <input className={inputClass} placeholder="Mahalle / adres başlığı" defaultValue="Caferağa Mahallesi" />
              <input className={inputClass} placeholder="Açık adres" defaultValue="Örnek Cadde No: 12" />
              <input className={inputClass} placeholder="Telefon" defaultValue="+90 555 000 00 00" />
              <input className={inputClass} placeholder="Web sitesi" defaultValue="https://ornekfirma.com" />
              <input className={inputClass} placeholder="Keşfet profil linki" defaultValue="/kesfet/ornek-firma-rehberi-isletmesi" />
              <input className={inputClass} placeholder="Harita yer kimliği" defaultValue="Yer kimliği" />
              <input className={inputClass} placeholder="Harita kaynak bağlantısı" defaultValue="https://..." />
              <select className={inputClass} defaultValue="harita">
                <option value="harita">Kaynak: Harita verisi</option>
                <option value="tarama">Kaynak: İşletme taraması</option>
                <option value="acik_veri">Kaynak: Açık harita verisi</option>
                <option value="manual">Kaynak: Manuel giriş</option>
              </select>
              <textarea className={`${inputClass} md:col-span-2`} rows={3} placeholder="Firma açıklaması, çalışma saatleri, uzmanlıklar ve vitrin metni" defaultValue="Firma Rehberi profilinde gösterilecek kısa açıklama." />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={() => setFlash(`${businessName || "İşletme"} için ${businessMode === "add" ? "ekleme" : "düzenleme"} taslağı kaydedildi.`)} className="sade-btn-primary inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black">
                <Save className="h-4 w-4" />
                {businessMode === "add" ? "İşletme taslağı kaydet" : "Düzenlemeyi kaydet"}
              </button>
              <button type="button" onClick={() => setFlash("Harita işletme aktarımı hazır olduğunda bu profil otomatik doldurulacak.")} className="inline-flex items-center gap-2 rounded-2xl border border-dashed border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700">
                <MapPinned className="h-4 w-4" />
                Haritadan içe aktar
              </button>
              <Link href="/kesfet" className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
                <Link2 className="h-4 w-4" />
                Keşfet profilini aç
              </Link>
            </div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <PackagePlus className="h-6 w-6 text-[#203949]" />
                <h2 className="text-xl font-black">Ürün ekle / düzenle</h2>
              </div>
              <div className="mt-4 space-y-3">
                <input className={inputClass} placeholder="Ürün adı" id="firma-product-title" />
                <select className={inputClass} value={productMode} onChange={(e) => setProductMode(e.target.value as ProductMode)}>
                  <option value="satış">Satış yapılacak</option>
                  <option value="listeleme">Sadece listeleme</option>
                </select>
                <input className={inputClass} placeholder="Fiyat / stok / SKU bilgisi" />
                <textarea className={inputClass} rows={3} placeholder="Ürün açıklaması, fiyat veya katalog notu" />
                <div className="grid gap-2 sm:grid-cols-2">
                  <button type="button" onClick={() => addItem("Ürün", productMode === "satış" ? "Satış ürünü" : "Listeleme ürünü", `${productMode} modu`)} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
                    Ürün taslağı ekle
                  </button>
                  <button type="button" onClick={() => setFlash("Seçili ürün düzenleme moduna alındı.")} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-black text-slate-900">
                    Ürün düzenle
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <CalendarClock className="h-6 w-6 text-[#203949]" />
                <h2 className="text-xl font-black">Hizmet ekle / düzenle</h2>
              </div>
              <div className="mt-4 space-y-3">
                <input className={inputClass} placeholder="Hizmet adı" />
                <input className={inputClass} placeholder="Servis bölgesi / fiyat başlangıcı" />
                <label className="flex items-center gap-3 border border-slate-200 px-4 py-3 text-sm font-bold">
                  <input type="checkbox" checked={serviceAppointment} onChange={(e) => setServiceAppointment(e.target.checked)} />
                  Randevu alınabilir
                </label>
                <textarea className={inputClass} rows={3} placeholder="Randevu saatleri, servis bölgesi veya hizmet detayı" />
                <div className="grid gap-2 sm:grid-cols-2">
                  <button type="button" onClick={() => addItem("Hizmet", "Randevulu hizmet", serviceAppointment ? "Randevu açık" : "Talep formu")} className="sade-btn-primary rounded-2xl px-4 py-3 text-sm font-black">
                    Hizmet taslağı ekle
                  </button>
                  <button type="button" onClick={() => setFlash("Seçili hizmet düzenleme moduna alındı.")} className="rounded-2xl border border-red-200 px-4 py-3 text-sm font-black text-red-700">
                    Hizmet düzenle
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <BriefcaseBusiness className="h-6 w-6 text-[#203949]" />
              <h2 className="text-xl font-black">İş ilanı / duyuru ekle</h2>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
              <input className={inputClass} placeholder="İlan başlığı" />
              <input className={inputClass} placeholder="İlan türü: iş, kampanya, duyuru..." />
              <input className={inputClass} placeholder="Çalışma şekli / son başvuru" />
              <button type="button" onClick={() => addItem("İlan", "Yeni ilan", "İlanlar sayfasına aktarılacak")} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
                İlan taslağı ekle
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <Send className="h-6 w-6 text-[#f7b91e]" />
              <h2 className="text-xl font-black">Başka servise aktar</h2>
            </div>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
              Firma Rehberi kaydını Alışveriş, Sipariş, Ulaşım veya Turizm servis sağlayıcı paneline çapraz yayınlayın.
            </p>
            <select className={`${inputClass} mt-4`} value={transferTarget} onChange={(e) => setTransferTarget(e.target.value)}>
              {FIRMA_REHBERI_TRANSFER_DESTINATIONS.map((item) => (
                <option key={item.key} value={item.key}>{item.label}</option>
              ))}
            </select>
            <div className="mt-4 bg-amber-50 p-4 text-sm text-[#203949]">
              <p className="font-black">{transfer?.label} aktarımı</p>
              <p className="mt-1 text-xs font-semibold">{transfer?.examples}</p>
              <p className="mt-2 text-[11px] font-bold text-amber-800">
                Aktarım isteği hazırlandığında ilgili panele sağlayıcı kaydı açılacak.
              </p>
            </div>
            <button type="button" onClick={() => setFlash(`${transfer?.label} için aktarım isteği hazırlandı.`)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
              Aktarım isteği oluştur
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-6 w-6 text-[#203949]" />
              <h2 className="text-xl font-black">Taslak kayıtlar</h2>
            </div>
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <article key={item.id} className="border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-black">{item.title}</p>
                    <span className="bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600">{item.type}</span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{item.detail}</p>
                  <p className="mt-2 text-[11px] font-bold text-amber-700">{item.status}</p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => setFlash(`${item.title} düzenleme moduna alındı.`)} className="inline-flex items-center gap-1 bg-slate-100 px-3 py-2 text-[11px] font-black text-[#203949]">
                      <Edit3 className="h-3.5 w-3.5" />
                      Düzenle
                    </button>
                    <button type="button" onClick={() => setFlash(`${item.title} Keşfet profiline bağlanmak üzere işaretlendi.`)} className="inline-flex items-center gap-1 bg-amber-50 px-3 py-2 text-[11px] font-black text-amber-800">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Yayına hazırla
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
