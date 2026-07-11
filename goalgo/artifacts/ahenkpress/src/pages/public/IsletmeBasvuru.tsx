import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { useGetSiteSettings } from "@workspace/api-client-react";
import L from "leaflet";
import { LocationPickerGooglePrimary } from "@/components/LocationPickerGooglePrimary";
import "leaflet/dist/leaflet.css";

const API = "/api";

/* ── Servis tipleri ── */
const SERVICE_TYPES = [
  {
    id: "siparis",
    icon: "🍔",
    title: "Sipariş İşletmesi",
    desc: "Müşterilere teslimat ve paket servis yapan işletmeler",
    subtypes: [
      { id: "restoran", label: "Restoran / Kafe" },
      { id: "market",   label: "Market / Bakkal" },
      { id: "bitkisel", label: "Bitkisel Ürünler Mağazası" },
      { id: "cicekci",  label: "Çiçekçi / Bitki" },
      { id: "diger",    label: "Diğer" },
    ],
  },
  {
    id: "alisveris",
    icon: "🛍️",
    title: "Alışveriş Mağazası",
    desc: "Online ürün satışı yapan e-ticaret işletmeleri",
    subtypes: [
      { id: "giyim",     label: "Giyim / Tekstil" },
      { id: "elektronik",label: "Elektronik / Teknoloji" },
      { id: "kitap",     label: "Kitap / Kırtasiye" },
      { id: "ev",        label: "Ev & Yaşam" },
      { id: "spor",      label: "Spor / Outdoor" },
      { id: "kozmetik",  label: "Kozmetik / Güzellik" },
      { id: "diger",     label: "Diğer" },
    ],
  },
  {
    id: "hizmet",
    icon: "🔧",
    title: "Hizmet Sağlayıcı",
    desc: "Yerinde veya uzaktan hizmet veren işletmeler",
    subtypes: [
      { id: "cekici",    label: "Çekici / Yol Yardım" },
      { id: "nakliyeci", label: "Nakliyeci" },
      { id: "oto_galeri",label: "Oto Galeri / 2. El Araç" },
      { id: "kurs",      label: "Kurs / Eğitim Merkezi" },
      { id: "tadilat",   label: "Tadilat / Tamir / Usta" },
      { id: "temizlik",  label: "Temizlik Hizmetleri" },
      { id: "boya",      label: "Boya / Badana" },
      { id: "guzellik",  label: "Güzellik Salonu / Kuaför" },
      { id: "saglik",    label: "Sağlık / Klinik / Muayene" },
      { id: "diger",     label: "Diğer" },
    ],
  },
  {
    id: "turizm",
    icon: "✈️",
    title: "Turizm & Seyahat",
    desc: "Otel, araç kiralama, villa, tur ve yat & tekne işletmeleri",
    subtypes: [
      { id: "otel", label: "🏨 Otel" },
      { id: "arac", label: "🚗 Rent a Car" },
      { id: "villa", label: "🏡 Villa & Ev Kiralama" },
      { id: "tur",  label: "🗺️ Tur Operatörü" },
      { id: "yat",  label: "⛵ Yat & Tekne" },
    ],
  },
];

interface FormState {
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  mahalle: string;
  description: string;
  docKimlik: string;
  docVergi: string;
  docImza: string;
  lat: number | null;
  lng: number | null;
  revenueModel: "subscription" | "commission";
  commissionRatePct: string;
}

const EMPTY_FORM: FormState = {
  businessName: "", ownerName: "", ownerEmail: "", phone: "",
  address: "", city: "", district: "", mahalle: "", description: "",
  docKimlik: "", docVergi: "", docImza: "",
  lat: null, lng: null,
  revenueModel: "subscription",
  commissionRatePct: "",
};

function cls(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export default function IsletmeBasvuru() {
  const { data: siteSettings } = useGetSiteSettings();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedSubtype, setSelectedSubtype] = useState<string>("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const serviceType = SERVICE_TYPES.find(t => t.id === selectedType);

  type StringField = { [K in keyof FormState]: FormState[K] extends string ? K : never }[keyof FormState];
  function field(name: StringField) {
    return {
      value: form[name] as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(f => ({ ...f, [name]: e.target.value })),
    };
  }

  async function submit() {
    if (form.revenueModel === "commission") {
      const r = parseFloat(String(form.commissionRatePct).replace(",", "."));
      if (!Number.isFinite(r) || r <= 0 || r > 100) {
        setError("Komisyon modelinde geçerli bir komisyon oranı girin (%1–100).");
        return;
      }
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/providers/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerType: selectedType,
          providerSubtype: selectedSubtype,
          registrationHost: typeof window !== "undefined" ? window.location.hostname : undefined,
          businessName: form.businessName,
          ownerName: form.ownerName,
          ownerEmail: form.ownerEmail,
          phone: form.phone,
          address: [form.mahalle, form.address].map((s) => String(s || "").trim()).filter(Boolean).join(", ") || form.address,
          city: form.city,
          district: form.district,
          description: form.description,
          lat: form.lat,
          lng: form.lng,
          docKimlik: form.docKimlik || null,
          docVergi: form.docVergi || null,
          docImza: form.docImza || null,
          revenueModel: form.revenueModel,
          commissionRatePct:
            form.revenueModel === "commission"
              ? parseFloat(String(form.commissionRatePct).replace(",", "."))
              : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Hata oluştu");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  /* ── Başarı ekranı ── */
  if (done) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col px-4 py-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="w-20 h-20 bg-emerald-400/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mb-3 text-2xl font-black text-slate-950">Başvurunuz Alındı!</h2>
          <p className="mb-2 text-sm text-slate-600">
            <strong className="text-slate-900">{form.businessName}</strong> için başvurunuz alınmıştır.
          </p>
          <p className="text-slate-500 text-sm mb-8">
            Belgeleriniz incelendikten sonra (1–2 iş günü) onay e-postası gönderilecektir.
            Onay sonrasında haritada premium pin olarak görüneceksiniz.
          </p>
          <Link href="/" className="inline-block rounded-2xl bg-[#0f766e] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0b5f59]" style={{ color: "#fff" }}>
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 mb-4">
            <span>🚀</span> Servis Sağlayıcı Başvurusu
          </div>
          <h1 className="text-3xl font-black text-slate-950 mb-2">Platforma Katılın</h1>
          <p className="text-slate-500 text-sm">İşletmenizi kaydedin, premium harita pini kazanın ve müşterilerinize ulaşın</p>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {[1, 2, 3, 4].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={cls(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition",
                step >= s ? "bg-[#0f766e] text-white" : "bg-slate-200 text-slate-400",
              )}>{s}</div>
              {i < 3 && (
                <div className={cls(
                  "w-12 h-0.5 transition",
                  step > s ? "bg-[#0f766e]" : "bg-slate-200",
                )} />
              )}
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">

          {/* ADIM 1: Servis Tipi */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-slate-950 mb-1">Hangi türde servis sağlayıcısınız?</h2>
              <p className="text-slate-500 text-sm mb-6">İşletmeniz için en uygun kategoriyi seçin</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SERVICE_TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedType(t.id); setSelectedSubtype(""); }}
                    className={cls(
                      "text-left p-5 rounded-2xl border-2 transition",
                      selectedType === t.id
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-slate-200 bg-slate-50 hover:border-emerald-200 hover:bg-emerald-50",
                    )}
                  >
                    <div className="text-3xl mb-2">{t.icon}</div>
                    <div className="font-semibold text-slate-950 text-sm mb-1">{t.title}</div>
                    <div className="text-slate-500 text-xs">{t.desc}</div>
                  </button>
                ))}
              </div>
              <button
                disabled={!selectedType}
                onClick={() => setStep(2)}
                className="mt-6 w-full py-3.5 bg-[#0f766e] text-white rounded-2xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#0f766e] transition"
              >
                Devam Et →
              </button>
            </div>
          )}

          {/* ADIM 2: Alt Tip */}
          {step === 2 && serviceType && (
            <div>
              <button onClick={() => setStep(1)} className="text-slate-400 text-sm mb-4 flex items-center gap-1 hover:text-slate-600 transition">
                ← Geri
              </button>
              <h2 className="text-xl font-bold text-slate-950 mb-1">{serviceType.icon} {serviceType.title}</h2>
              <p className="text-slate-500 text-sm mb-6">İşletmenizin alt kategorisini seçin</p>
              <div className="grid grid-cols-2 gap-2">
                {serviceType.subtypes.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSubtype(s.id)}
                    className={cls(
                      "text-left px-4 py-3 rounded-xl border-2 transition text-sm font-medium",
                      selectedSubtype === s.id
                        ? "border-emerald-500 bg-emerald-50 text-slate-950"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-200 hover:text-slate-900",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <button
                disabled={!selectedSubtype}
                onClick={() => setStep(3)}
                className="mt-6 w-full py-3.5 bg-[#0f766e] text-white rounded-2xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#0f766e] transition"
              >
                Devam Et →
              </button>
            </div>
          )}

          {/* ADIM 3: İşletme Bilgileri */}
          {step === 3 && (
            <div>
              <button onClick={() => setStep(2)} className="text-slate-400 text-sm mb-4 flex items-center gap-1 hover:text-slate-600 transition">
                ← Geri
              </button>
              <h2 className="text-xl font-bold text-slate-950 mb-1">İşletme Bilgileri</h2>
              <p className="text-slate-500 text-sm mb-6">Doğru ve güncel bilgi giriniz</p>
              <div className="space-y-4">
                <GlassInput label="İşletme Adı *" placeholder="örn. Ahmet'in Restoran" {...field("businessName")} />
                <div className="grid grid-cols-2 gap-3">
                  <GlassInput label="Yetkili Adı Soyadı *" placeholder="Ad Soyad" {...field("ownerName")} />
                  <GlassInput label="E-Posta *" placeholder="ornek@email.com" type="email" {...field("ownerEmail")} />
                </div>
                <GlassInput label="Telefon *" placeholder="05XX XXX XX XX" {...field("phone")} />
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <LocationPickerGooglePrimary
                    mapsSettings={siteSettings ?? null}
                    variant="dark"
                    compactGoogle
                    googleLabel="1) Konum araması"
                    value={{ city: form.city, district: form.district, mahalle: form.mahalle, sokak: form.address }}
                    onChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        city: v.city,
                        district: v.district,
                        mahalle: v.mahalle,
                        address: v.sokak?.trim() ? v.sokak : f.address,
                      }))
                    }
                    showSokak
                    onGooglePick={(r) =>
                      setForm((f) => ({
                        ...f,
                        address: (f.address || "").trim() ? f.address : r.addressLine,
                      }))
                    }
                  />
                </div>
                <GlassInput label="Açık adres (sokak, bina no)" placeholder="Sokak, bina no, daire..." {...field("address")} />
                <GlassTextarea
                  label="İşletme Tanıtımı"
                  placeholder="İşletmeniz hakkında kısa bir tanıtım yazın..."
                  {...field("description")}
                />

                {/* Harita Konum Seçici */}
                <div>
                  <label className="block text-slate-500 text-xs font-medium mb-1.5 tracking-wide">
                    Konum Seçin (İsteğe Bağlı — Haritada Görünmek İçin)
                  </label>
                  <MapPicker
                    lat={form.lat}
                    lng={form.lng}
                    onPick={(lat, lng) => setForm(f => ({ ...f, lat, lng }))}
                  />
                  {form.lat && form.lng && (
                    <div className="mt-1.5 flex items-center justify-between">
                      <p className="text-emerald-400 text-xs">
                        📍 {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
                      </p>
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, lat: null, lng: null }))}
                        className="text-slate-950/30 hover:text-red-400 text-xs transition"
                      >
                        Konumu Temizle ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <button
                disabled={!form.businessName || !form.ownerName || !form.ownerEmail || !form.phone}
                onClick={() => setStep(4)}
                className="mt-6 w-full py-3.5 bg-[#0f766e] text-white rounded-2xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#0f766e] transition"
              >
                Devam Et →
              </button>
            </div>
          )}

          {/* ADIM 4: Belgeler + Gönder */}
          {step === 4 && (
            <div>
              <button onClick={() => setStep(3)} className="text-slate-400 text-sm mb-4 flex items-center gap-1 hover:text-slate-600 transition">
                ← Geri
              </button>
              <h2 className="text-xl font-bold text-slate-950 mb-1">Belgeler &amp; iş birliği modeli</h2>
              <p className="text-slate-500 text-sm mb-2">
                Belgelerinizi güvenli bir dosya paylaşım alanına yükleyip bağlantısını yapıştırın.
              </p>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 mb-5 space-y-3">
                <p className="text-slate-600 text-xs font-medium">Platform ile çalışma şekli *</p>
                <div className="grid gap-2">
                  <label className={cls(
                    "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition text-sm",
                    form.revenueModel === "subscription" ? "border-emerald-500 bg-emerald-50 text-slate-900" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-200",
                  )}>
                    <input
                      type="radio"
                      className="mt-1"
                      checked={form.revenueModel === "subscription"}
                      onChange={() => setForm((f) => ({ ...f, revenueModel: "subscription", commissionRatePct: "" }))}
                    />
                    <span>
                      <span className="font-semibold block">Abonelik</span>
                      <span className="text-slate-500 text-xs">Ürün ve ödemeleri kendi kanallarınızdan tahsil edersiniz; platform ücreti abonelik / paket üzerinden yürütülür.</span>
                    </span>
                  </label>
                  <label className={cls(
                    "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition text-sm",
                    form.revenueModel === "commission" ? "border-emerald-400 bg-emerald-500/15 text-slate-950" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-200",
                  )}>
                    <input
                      type="radio"
                      className="mt-1"
                      checked={form.revenueModel === "commission"}
                      onChange={() => setForm((f) => ({ ...f, revenueModel: "commission" }))}
                    />
                    <span>
                      <span className="font-semibold block">Komisyon</span>
                      <span className="text-slate-500 text-xs">Satışlar site üzerinden yapıldığında belirlenen oranda komisyon mahsuplaştırılır. Onay sonrası panelden IBAN ile ödeme hesabınızı girmeniz gerekir.</span>
                    </span>
                  </label>
                </div>
                {form.revenueModel === "commission" && (
                  <div>
                    <label className="block text-slate-500 text-xs font-medium mb-1">Komisyon oranı (%)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="örn. 8 veya 12.5"
                      value={form.commissionRatePct}
                      onChange={(e) => setForm((f) => ({ ...f, commissionRatePct: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400"
                    />
                    <p className="text-slate-950/35 text-[11px] mt-1.5">Hesaplama: (ürün ara toplamı − indirim) × oran. Kargo / teslimat ücreti komisyona dahil edilmez.</p>
                  </div>
                )}
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs mb-5">
                💡 Belgeler isteğe bağlıdır, ancak onay sürecinizi hızlandırır.
              </div>
              <div className="space-y-4">
                <GlassInput
                  label="Kimlik Belgesi (URL)"
                  placeholder="https://drive.google.com/... (TC kimlik/pasaport linki)"
                  {...field("docKimlik")}
                />
                <GlassInput
                  label="Vergi Levhası (URL)"
                  placeholder="https://drive.google.com/... (vergi levhası linki)"
                  {...field("docVergi")}
                />
                <GlassInput
                  label="İmza Sirküleri (URL)"
                  placeholder="https://drive.google.com/... (isteğe bağlı)"
                  {...field("docImza")}
                />
              </div>

              {/* Özet */}
              <div className="mt-5 space-y-1 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <div className="mb-2 font-semibold text-slate-900">Başvuru Özeti</div>
                <div><span className="text-slate-400">İşletme:</span> {form.businessName}</div>
                <div><span className="text-slate-400">Tür:</span> {SERVICE_TYPES.find(t => t.id === selectedType)?.title} — {serviceType?.subtypes.find(s => s.id === selectedSubtype)?.label}</div>
                <div><span className="text-slate-400">Model:</span> {form.revenueModel === "commission" ? `Komisyon %${form.commissionRatePct || "—"}` : "Abonelik"}</div>
                <div><span className="text-slate-400">Yetkili:</span> {form.ownerName} ({form.ownerEmail})</div>
                <div><span className="text-slate-400">Telefon:</span> {form.phone}</div>
                {form.city && <div><span className="text-slate-400">Şehir:</span> {form.city}</div>}
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-300 text-sm">{error}</div>
              )}

              <button
                onClick={submit}
                disabled={loading}
                className="mt-5 w-full py-4 bg-[#0f766e] text-white rounded-2xl font-bold text-sm disabled:opacity-50 hover:bg-[#0f766e] transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Gönderiliyor...
                  </>
                ) : (
                  "🚀 Başvuruyu Gönder"
                )}
              </button>
              <p className="text-center text-slate-950/30 text-xs mt-3">
                Başvurunuz incelendikten sonra e-posta ile bilgilendirileceksiniz.
              </p>
            </div>
          )}
        </div>

        {/* Footer link */}
        <div className="text-center mt-6">
          <Link href="/" className="text-slate-400 text-sm hover:text-slate-600 transition">
            ← Ana sayfaya dön
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── MapPicker bileşeni ── */
interface MapPickerProps {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
}

function MapPicker({ lat, lng, onPick }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    /* Leaflet ikon yolu düzeltmesi */
    (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl = undefined;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    const map = L.map(mapRef.current, {
      center: [39.9208, 32.8541], /* Ankara */
      zoom: 14,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    /* İlk marker */
    if (lat && lng) {
      markerRef.current = L.marker([lat, lng]).addTo(map);
      map.setView([lat, lng], 16);
    }

    /* Tıklama ile konum seç */
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      if (markerRef.current) {
        markerRef.current.setLatLng([clickLat, clickLng]);
      } else {
        markerRef.current = L.marker([clickLat, clickLng]).addTo(map);
      }
      onPick(clickLat, clickLng);
    });

    leafletMap.current = map;

    return () => {
      map.remove();
      leafletMap.current = null;
      markerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Dışarıdan lat/lng değişirse markeri güncelle */
  useEffect(() => {
    if (!leafletMap.current) return;
    if (lat && lng) {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng]).addTo(leafletMap.current);
      }
      leafletMap.current.setView([lat, lng], 16);
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, [lat, lng]);

  function useMyLocation() {
    navigator.geolocation?.getCurrentPosition(pos => {
      onPick(pos.coords.latitude, pos.coords.longitude);
    });
  }

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/15">
      <div ref={mapRef} style={{ height: 260, width: "100%" }} />
      {/* Konumumu kullan butonu */}
      <button
        type="button"
        onClick={useMyLocation}
        title="Konumumu kullan"
        className="absolute bottom-2 right-2 z-[1000] bg-white text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg hover:bg-slate-100 transition flex items-center gap-1.5"
      >
        <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Konumumu Kullan
      </button>
      {/* Tıklama ipucu */}
      {!lat && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-black/60 text-slate-950 text-xs px-3 py-1 rounded-full pointer-events-none">
          Haritaya tıklayarak konum seçin
        </div>
      )}
    </div>
  );
}

/* ── Bileşenler ── */
interface InputProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
}

function GlassInput({ label, value, onChange, placeholder, type = "text" }: InputProps) {
  return (
    <div>
      <label className="block text-slate-500 text-xs font-medium mb-1.5 tracking-wide">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400"
      />
    </div>
  );
}

interface TextareaProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
}

function GlassTextarea({ label, value, onChange, placeholder }: TextareaProps) {
  return (
    <div>
      <label className="block text-slate-500 text-xs font-medium mb-1.5 tracking-wide">{label}</label>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400"
      />
    </div>
  );
}
