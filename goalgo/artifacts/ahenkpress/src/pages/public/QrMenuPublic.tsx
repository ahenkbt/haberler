import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { ChevronLeft, MapPin, Phone, Clock } from "lucide-react";
import { cleanAboutForPublic } from "@/lib/publicAboutText";
import { applySocialShareMeta, resetSeoToSiteDefaults, seoPlainSnippet } from "@/lib/pageSeo";
import { formatVendorWorkingHours } from "@/lib/formatVendorWorkingHours";
import { OrderTrackSearch } from "@/components/OrderTrackSearch";

const API = "/api";

type TableSection = { id: string; name: string; type: string };
type ServiceSettings = {
  tableServiceEnabled: boolean;
  reservationEnabled: boolean;
  reservationAutoConfirm: boolean;
  tableSections: TableSection[];
};
type Vendor = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  aboutHtml?: string | null;
  imageUrl?: string | null;
  coverUrl?: string | null;
  city?: string | null;
  district?: string | null;
  address?: string | null;
  phone?: string | null;
  workingHours?: string | null;
};
type MenuCategory = { id: number; name: string; position: number };
type MenuItem = {
  id: number;
  name: string;
  description?: string | null;
  price: string;
  salePrice?: string | null;
  imageUrl?: string | null;
  menuCategoryId?: number | null;
};

type Channel = "masa" | "gelal" | "adrese";

export default function QrMenuPublic() {
  const params = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [menuCats, setMenuCats] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [serviceSettings, setServiceSettings] = useState<ServiceSettings | null>(null);
  const [channel, setChannel] = useState<Channel>("masa");
  const [tableSectionId, setTableSectionId] = useState<string>("");
  const [mapBusinessId, setMapBusinessId] = useState<string | null>(null);

  useEffect(() => {
    const slug = params.slug?.trim();
    if (!slug) return;
    let c = false;
    setLoading(true);
    setErr(null);
    fetch(`${API}/delivery/public/qr-menu/${encodeURIComponent(slug)}`)
      .then((r) => {
        if (!r.ok) throw new Error("notfound");
        return r.json();
      })
      .then((d) => {
        if (c) return;
        setVendor(d.vendor ?? null);
        setMenuCats(Array.isArray(d.menuCats) ? d.menuCats : []);
        setMenuItems(Array.isArray(d.menuItems) ? d.menuItems : []);
        setServiceSettings(d.serviceSettings ?? null);
        setMapBusinessId(d.mapBusinessId != null ? String(d.mapBusinessId) : null);
        const tableOn = Boolean(d.serviceSettings?.tableServiceEnabled);
        const qMasa =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("masa")?.trim() || ""
            : "";
        setTableSectionId(qMasa);
        setChannel(tableOn && qMasa ? "masa" : tableOn ? "masa" : "adrese");
      })
      .catch(() => {
        if (!c) setErr("Bu işletme için QR menü bulunamadı veya kapalı.");
      })
      .finally(() => {
        if (!c) setLoading(false);
      });
    return () => {
      c = true;
    };
  }, [params.slug]);

  const slug = params.slug?.trim() ?? "";

  useEffect(() => {
    if (!vendor || !slug) return;
    const path = `/siparis/qr-menu/${encodeURIComponent(slug)}`;
    const snippet =
      seoPlainSnippet(String(vendor.description ?? "")) ||
      seoPlainSnippet(cleanAboutForPublic(String(vendor.aboutHtml ?? ""))) ||
      "Dijital menü ve sipariş.";
    const loc = [vendor.district, vendor.city].filter(Boolean).join(", ");
    const primary = [vendor.name + ":", snippet, loc ? `${loc}.` : null, "QR menü ve masada sipariş."].filter(Boolean).join(" ");
    applySocialShareMeta({
      title: `${vendor.name} — QR menü`,
      descriptionPrimary: primary,
      canonicalPath: path,
      imageUrl: vendor.coverUrl || vendor.imageUrl,
    });
    return () => resetSeoToSiteDefaults();
  }, [vendor, slug]);

  const aboutText = cleanAboutForPublic(
    String(vendor?.aboutHtml ?? "").trim() || String(vendor?.description ?? "").trim(),
  );

  function goSiparis(urunId?: number) {
    const q = new URLSearchParams();
    q.set("teslimat", channel === "masa" ? "masa" : channel === "gelal" ? "gelal" : "adrese");
    if (channel === "masa" && tableSectionId) q.set("masa", tableSectionId);
    if (urunId != null) q.set("urun", String(urunId));
    navigate(`/siparis/satici/${encodeURIComponent(slug)}?${q.toString()}#menu`);
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#0f172a] text-slate-300">
        <div className="w-10 h-10 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm">Menü yükleniyor…</p>
      </div>
    );
  }

  if (err || !vendor) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#0f172a] text-slate-200 px-6 text-center">
        <p className="text-sm mb-4">{err ?? "Menü yüklenemedi."}</p>
        <button
          type="button"
          onClick={() => navigate("/siparis")}
          className="text-indigo-300 text-sm font-semibold underline"
        >
          Sipariş işletmelerine dön
        </button>
      </div>
    );
  }

  const tableOn = Boolean(serviceSettings?.tableServiceEnabled);
  const tableLabel =
    tableSectionId && serviceSettings?.tableSections?.length
      ? serviceSettings.tableSections.find((s) => s.id === tableSectionId)
      : null;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[#0f172a] to-[#1e1b4b] text-slate-100 pb-10">
      <header className="sticky top-0 z-10 bg-[#0f172a]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate("/siparis")}
            className="mt-0.5 p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
            aria-label="Geri"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-black text-lg leading-tight truncate">{vendor.name}</h1>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-400">
              {(vendor.district || vendor.city) && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3 shrink-0" />
                  {[vendor.district, vendor.city].filter(Boolean).join(", ")}
                </span>
              )}
              {vendor.phone ? (
                <a href={`tel:${vendor.phone}`} className="inline-flex items-center gap-1 text-indigo-300">
                  <Phone className="w-3 h-3 shrink-0" />
                  {vendor.phone}
                </a>
              ) : null}
              {vendor.workingHours ? (
                <span className="inline-flex items-center gap-1 whitespace-pre-line">
                  <Clock className="w-3 h-3 shrink-0" />
                  {formatVendorWorkingHours(vendor.workingHours)}
                </span>
              ) : null}
            </div>
          </div>
          {vendor.imageUrl ? (
            <img src={vendor.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-white/20 shrink-0" />
          ) : null}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {tableLabel ? (
          <div className="rounded-xl border border-violet-400/40 bg-violet-500/15 px-4 py-3 text-center">
            <p className="text-xs font-bold text-violet-200 uppercase tracking-wide">Masadan sipariş</p>
            <p className="text-sm font-black text-white mt-0.5">
              {tableLabel.type === "masa" ? "🪑 Masa" : tableLabel.type === "oda" ? "🚪 Oda" : "📍"} {tableLabel.name}
            </p>
          </div>
        ) : null}
        {aboutText ? (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-indigo-300 mb-2">Genel bakış</h2>
            <p className="text-sm text-slate-200 whitespace-pre-line leading-relaxed">{aboutText}</p>
          </section>
        ) : null}

        <section className="rounded-2xl border border-white/10 bg-white/5 p-3">
          <p className="text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wide">Sipariş türü</p>
          <div className="flex flex-wrap gap-2">
            {tableOn ? (
              <button
                type="button"
                onClick={() => setChannel("masa")}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition ${channel === "masa" ? "bg-violet-500 text-white" : "bg-white/10 text-slate-300"}`}
              >
                Masada
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setChannel("gelal")}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition ${channel === "gelal" ? "bg-amber-500 text-white" : "bg-white/10 text-slate-300"}`}
            >
              Gel al
            </button>
            <button
              type="button"
              onClick={() => setChannel("adrese")}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition ${channel === "adrese" ? "bg-orange-500 text-white" : "bg-white/10 text-slate-300"}`}
            >
              Adrese
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 leading-snug">
            {channel === "adrese"
              ? "Sepete ekleyip adresinizle tamamlayın."
              : channel === "gelal"
                ? "İşletmeden teslim; adım adım sipariş formuna yönlendirilirsiniz."
                : "Masa veya bölüm bilgisiyle sipariş oluşturulur."}
          </p>
        </section>

        <section>
          <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3">Menü</h2>
          <div className="space-y-6">
            {menuCats.length === 0 ? (
              <div className="space-y-3">
                {menuItems.map((item) => (
                  <QrMenuRow key={item.id} item={item} onSiparis={() => goSiparis(item.id)} />
                ))}
              </div>
            ) : (
              menuCats.map((cat) => {
                const items = menuItems.filter((m) => m.menuCategoryId === cat.id);
                if (items.length === 0) return null;
                return (
                  <div key={cat.id}>
                    <h3 className="text-sm font-bold text-indigo-200 border-b border-white/10 pb-2 mb-3">{cat.name}</h3>
                    <div className="space-y-3">
                      {items.map((item) => (
                        <QrMenuRow key={item.id} item={item} onSiparis={() => goSiparis(item.id)} />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {mapBusinessId ? (
          <section className="rounded-2xl border border-indigo-400/30 bg-indigo-950/40 p-4">
            <p className="text-[11px] font-black uppercase tracking-wider text-indigo-200 mb-2">Keşfet</p>
            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              Harita, yorumlar ve fotoğraflar için işletme profilini Keşfet üzerinden açın.
            </p>
            <Link
              href={`/kesfet/isletme/${mapBusinessId}`}
              className="inline-flex w-full justify-center rounded-xl bg-indigo-500 py-2.5 text-sm font-bold text-white hover:bg-indigo-400 transition"
            >
              Keşfet profiline git
            </Link>
          </section>
        ) : null}

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">Sipariş takibi</h2>
          <p className="text-[10px] text-slate-500 mb-3 leading-snug">
            Sipariş numaranızı girerek durumu sorgulayın.
          </p>
          <div className="[&_input]:bg-slate-900/80 [&_input]:border-white/10 [&_input]:text-slate-100">
            <OrderTrackSearch compact />
          </div>
        </section>
      </div>
    </div>
  );
}

function QrMenuRow({ item, onSiparis }: { item: MenuItem; onSiparis: () => void }) {
  const price = parseFloat(item.salePrice ?? item.price);
  const orig = item.salePrice ? parseFloat(item.price) : null;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-3 flex gap-3 items-start">
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-white">{item.name}</div>
        {item.description ? (
          <p className="text-xs text-slate-400 line-clamp-2 mt-1">{item.description}</p>
        ) : null}
        <div className="flex items-center gap-2 mt-2">
          <span className="font-black text-indigo-200">{price.toFixed(2)}₺</span>
          {orig != null && Number.isFinite(orig) ? (
            <span className="text-[11px] text-slate-500 line-through">{orig.toFixed(2)}₺</span>
          ) : null}
        </div>
      </div>
      {item.imageUrl ? (
        <img src={item.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0 border border-white/10" />
      ) : null}
      <button
        type="button"
        onClick={onSiparis}
        className="shrink-0 self-center px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-black shadow-lg shadow-orange-900/30"
      >
        Sipariş ver
      </button>
    </div>
  );
}
