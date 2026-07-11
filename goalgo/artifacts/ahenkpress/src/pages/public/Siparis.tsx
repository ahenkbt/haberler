import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { ChevronRight, Smartphone, Store, BadgePercent } from "lucide-react";
import { DELIVERY_MODULES, type DeliveryBusinessModule } from "@/lib/deliveryModuleGroups";
import {
  StoreCard,
  Rail,
  SectionHeading,
  ItemCardVertical,
  AdminBannerRail,
  useModuleBanners,
  type SiparisVendor,
  type RailItem,
} from "@/pages/public/SiparisModulVitrin";
import { SADE_HERO_EYEBROW_CLASS, SADE_PUBLIC_HERO_CONTENT_CLASS, SADE_PUBLIC_HERO_STAGE_CLASS, SADE_PUBLIC_HERO_SURFACE_CLASS, SADE_PUBLIC_PAGE_BG_SIPARIS, SADE_PUBLIC_POST_HERO_MAIN_CLASS, sadePublicHeroFadeStyle } from "@/lib/yekpareSadeTheme";

const API = "/api";

/* 6amMart açık tema renkleri */
const GREEN = "#039D55";
const GREEN_DEEP = "#026034";
const GREEN_LIGHT = "#EBFDF2";

const MODULE_CHIPS: Record<DeliveryBusinessModule, string[]> = {
  food: ["Restoran", "Kafe", "Pastane", "Simit", "Börek"],
  market: ["Market", "Manav", "Kuruyemiş", "Kasap", "Şarküteri", "Fırın", "Su", "İçecek", "Balıkçı"],
  nearby: ["Yapı Market", "Elektronik", "Giyim", "Petshop", "Kozmetik", "Çiçekçi", "Nalburiye"],
};

/** Tüm modüllerden ürün toplar (indirimli veya popüler). */
function useCrossModuleItems(discounted: boolean, perModule: number): RailItem[] {
  const [items, setItems] = useState<RailItem[]>([]);
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      DELIVERY_MODULES.map((mod) =>
        fetch(`${API}/delivery/module-items?module=${encodeURIComponent(mod.key)}${discounted ? "&discounted=1" : ""}&limit=${perModule}`)
          .then((r) => (r.ok ? r.json() : []))
          .then((d) => (Array.isArray(d) ? (d as RailItem[]) : []))
          .catch(() => [] as RailItem[]),
      ),
    ).then((lists) => {
      if (cancelled) return;
      const seen = new Set<number>();
      const merged: RailItem[] = [];
      // Modüller arası dönüşümlü sıralama: tek modül rayı domine etmesin
      for (let i = 0; i < perModule; i++) {
        for (const list of lists) {
          const item = list[i];
          if (item && !seen.has(item.id)) {
            seen.add(item.id);
            merged.push(item);
          }
        }
      }
      setItems(merged);
    });
    return () => {
      cancelled = true;
    };
  }, [discounted, perModule]);
  return items;
}

function ModuleShowcaseRail({ moduleKey, label, href }: { moduleKey: DeliveryBusinessModule; label: string; href: string }) {
  const [vendors, setVendors] = useState<SiparisVendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/delivery/vendors?type=delivery&limit=8&module=${encodeURIComponent(moduleKey)}`)
      .then((r) => r.json())
      .then((d) => setVendors(Array.isArray(d) ? d : []))
      .catch(() => setVendors([]))
      .finally(() => setLoading(false));
  }, [moduleKey]);

  if (!loading && vendors.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-900 md:text-xl">{label} vitrininde öne çıkanlar</h2>
        <Link href={href} className="flex shrink-0 items-center gap-1 text-sm font-semibold hover:underline" style={{ color: GREEN }}>
          Tümünü Gör <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="yekpare-scrollbar flex gap-3 overflow-x-auto pb-2">
        {loading
          ? [...Array(4)].map((_, i) => <div key={i} className="h-56 w-60 shrink-0 animate-pulse rounded-2xl bg-gray-100" />)
          : vendors.map((v) => <StoreCard key={v.id} vendor={v} compact />)}
      </div>
    </section>
  );
}

export default function Siparis() {
  const adminBanners = useModuleBanners("siparis");
  const offerItems = useCrossModuleItems(true, 8);
  const popularItems = useCrossModuleItems(false, 8);

  const [allVendors, setAllVendors] = useState<SiparisVendor[]>([]);
  useEffect(() => {
    fetch(`${API}/delivery/vendors?type=delivery&limit=60`)
      .then((r) => r.json())
      .then((d) => setAllVendors(Array.isArray(d) ? d : []))
      .catch(() => setAllVendors([]));
  }, []);

  const newestVendors = useMemo(
    () =>
      [...allVendors]
        .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
        .slice(0, 12),
    [allVendors],
  );

  return (
    <div className="min-h-screen" style={{ background: "#FCFCFD" }}>
      {/* ÜST BANNER */}
      <div className={SADE_PUBLIC_HERO_STAGE_CLASS}>
        <div className={SADE_PUBLIC_HERO_SURFACE_CLASS} style={sadePublicHeroFadeStyle(SADE_PUBLIC_PAGE_BG_SIPARIS)}>
          <div className={`${SADE_PUBLIC_HERO_CONTENT_CLASS} flex flex-col items-center text-center`}>
          <p className={SADE_HERO_EYEBROW_CLASS}>Yekpare Sipariş</p>
          <h1 className="mt-2 max-w-3xl text-2xl font-black text-slate-950 md:text-4xl">
            Yemek, market ve yakınındaki işletmeler; hepsi ayrı vitrinlerde
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-semibold text-slate-600 md:text-base">
            Aradığın vitrini seç: sıcak yemekler, günlük market ihtiyaçları veya çevrendeki yerel işletmeler.
          </p>
        </div>
        </div>
      </div>

      <div className={`mx-auto max-w-6xl px-4 pb-12 ${SADE_PUBLIC_POST_HERO_MAIN_CLASS}`}>
        {/* ÜÇ VİTRİN KARTI */}
        <section className="-mt-4 md:-mt-5">
          <div className="grid gap-4 md:grid-cols-3">
            {DELIVERY_MODULES.map((mod) => (
              <Link
                key={mod.key}
                href={mod.href}
                className="group flex flex-col rounded-3xl border border-gray-100 bg-white p-5 shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
              >
                <span className="grid h-14 w-14 place-items-center rounded-2xl text-3xl" style={{ background: GREEN_LIGHT }}>
                  {mod.emoji}
                </span>
                <h2 className="mt-3 text-lg font-black text-gray-900">{mod.label}</h2>
                <p className="mt-1 text-sm leading-relaxed text-gray-500">{mod.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {MODULE_CHIPS[mod.key].slice(0, 6).map((chip) => (
                    <span key={chip} className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: GREEN_LIGHT, color: GREEN_DEEP }}>
                      {chip}
                    </span>
                  ))}
                </div>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-black" style={{ color: GREEN }}>
                  Vitrine git <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ADMIN KAMPANYA BANNERLARI (panelden eklenir; yoksa bölüm görünmez) */}
        <AdminBannerRail banners={adminBanners} />

        {/* GÜNÜN FIRSATLARI — tüm vitrinlerden indirimli ürünler */}
        {offerItems.length > 0 && (
          <section>
            <SectionHeading title="Günün Fırsatları" subtitle="Yemek, market ve yakınımdaki vitrinlerinden indirimli ürünler" />
            <Rail>
              {offerItems.map((item) => <ItemCardVertical key={item.id} item={item} />)}
            </Rail>
          </section>
        )}

        {/* ÖNE ÇIKAN ÜRÜNLER — tüm vitrinlerden popüler ürünler */}
        {popularItems.length > 0 && (
          <section>
            <SectionHeading title="Öne Çıkan Ürünler" subtitle="Vitrinlerdeki en sevilen lezzetler ve ürünler" />
            <Rail>
              {popularItems.map((item) => <ItemCardVertical key={item.id} item={item} />)}
            </Rail>
          </section>
        )}

        {/* MODÜL BAŞINA ÖNE ÇIKAN İŞLETME RAYLARI */}
        {DELIVERY_MODULES.map((mod) => (
          <ModuleShowcaseRail key={mod.key} moduleKey={mod.key} label={mod.label} href={mod.href} />
        ))}

        {/* GENİŞ KAMPANYA BANDI */}
        <section
          className="relative flex flex-col items-start justify-center gap-2 overflow-hidden rounded-2xl p-6 md:flex-row md:items-center md:justify-between"
          style={{ background: `linear-gradient(100deg, ${GREEN_DEEP}, ${GREEN} 70%, #0DCB72)` }}
        >
          <span className="absolute -left-8 -bottom-10 h-36 w-36 rounded-full bg-white/10" />
          <span className="absolute right-24 -top-10 h-28 w-28 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center gap-2 text-white">
              <BadgePercent className="h-5 w-5" />
              <h3 className="text-lg font-black md:text-xl">Kampanyalı işletmeleri kaçırma</h3>
            </div>
            <p className="mt-1 max-w-xl text-sm text-white/85">
              İndirimli ürünler, ücretsiz teslimat ve öne çıkan işletme fırsatları vitrinlerde seni bekliyor.
            </p>
          </div>
          <Link
            href="/yemek"
            className="relative w-fit shrink-0 rounded-full bg-white px-5 py-2.5 text-sm font-bold transition hover:bg-gray-100"
            style={{ color: GREEN_DEEP }}
          >
            Fırsatları Keşfet
          </Link>
        </section>

        {/* YENİ KATILAN İŞLETMELER */}
        {newestVendors.length > 0 && (
          <section>
            <SectionHeading title="Yeni Katılan İşletmeler" subtitle="Yekpare vitrinlerine son eklenen işletmeler" />
            <Rail>
              {newestVendors.map((v) => <StoreCard key={v.id} vendor={v} compact />)}
            </Rail>
          </section>
        )}

        {/* İŞLETME KAYIT + UYGULAMA BANNERI */}
        <section className="grid gap-3 md:grid-cols-2">
          <div className="relative flex min-h-[150px] flex-col justify-center overflow-hidden rounded-2xl p-6" style={{ background: `linear-gradient(120deg, ${GREEN_DEEP}, ${GREEN})` }}>
            <span className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">İşletme sahibi misin?</p>
            <h3 className="mt-1 max-w-[280px] text-lg font-black leading-snug text-white">İşletmeni vitrine taşı, siparişleri almaya başla</h3>
            <a href="/servis-saglayici-giris" className="mt-3 flex w-fit items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold transition hover:bg-gray-100" style={{ color: GREEN_DEEP }}>
              <Store className="h-3.5 w-3.5" /> İşletmeni Ekle
            </a>
          </div>
          <div className="relative flex min-h-[150px] flex-col justify-center overflow-hidden rounded-2xl border border-gray-100 p-6" style={{ background: GREEN_LIGHT }}>
            <span className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full" style={{ background: "rgba(3,157,85,0.12)" }} />
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: GREEN }}>Yekpare cebinde</p>
            <h3 className="mt-1 max-w-[280px] text-lg font-black leading-snug text-gray-900">Uygulamayı ekle, siparişini her yerden takip et</h3>
            <a href="/uygulamayi-indir" className="mt-3 flex w-fit items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white transition hover:opacity-90" style={{ background: GREEN }}>
              <Smartphone className="h-3.5 w-3.5" /> Uygulamayı İndir
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
