import { useState } from "react";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { Link } from "wouter";
import type { OtomotivBusiness } from "../otomotivAdminTypes";
import type { OtomotivBusinessDetailTab } from "../otomotivAdminConfig";
import { BUSINESS_TYPE_TABS, businessTypeLabel } from "../otomotivAdminConfig";
import { Badge, Btn, StubNotice } from "./OtomotivAdminUi";

type Props = {
  business: OtomotivBusiness;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRefresh: () => void;
};

export function BusinessTypeDetailPanel({ business, onClose, onEdit, onDelete }: Props) {
  const tabs = BUSINESS_TYPE_TABS[business.business_type] ?? BUSINESS_TYPE_TABS.genel;
  const [subTab, setSubTab] = useState<OtomotivBusinessDetailTab>(tabs[0]?.id ?? "profil");

  return (
    <div className="border rounded-xl bg-white overflow-hidden">
      <div className="px-4 py-3 border-b bg-gradient-to-r from-slate-50 to-blue-50 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-bold text-gray-900">{business.name}</h3>
          <p className="text-xs text-gray-500">{businessTypeLabel(business.business_type)} · {business.city || "—"} · <Badge status={business.status} /></p>
        </div>
        <div className="flex gap-1">
          {business.slug ? (
            <Link href={`/kesfet/${business.slug}`} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-[#1e3a5f] hover:underline">
              <ExternalLink size={12} /> Vitrin
            </Link>
          ) : null}
          <Btn onClick={onEdit} className="bg-white border text-gray-600 text-xs"><Pencil size={12} /> Düzenle</Btn>
          <Btn onClick={onDelete} className="bg-red-50 text-red-700 text-xs"><Trash2 size={12} /></Btn>
          <Btn onClick={onClose} className="bg-gray-100 text-gray-600 text-xs">Kapat</Btn>
        </div>
      </div>

      <div className="flex gap-0.5 px-2 pt-2 border-b overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
              subTab === t.id ? "border-[#1e3a5f] text-[#1e3a5f]" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 min-h-[280px]">
        {subTab === "profil" ? (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-xs text-gray-500">Telefon</dt><dd className="font-medium">{business.phone || "—"}</dd></div>
            <div><dt className="text-xs text-gray-500">E-posta</dt><dd className="font-medium">{business.email || "—"}</dd></div>
            <div className="col-span-2"><dt className="text-xs text-gray-500">Adres</dt><dd className="font-medium">{business.address || "—"}</dd></div>
            <div className="col-span-2"><dt className="text-xs text-gray-500">Açıklama</dt><dd>{business.description || "—"}</dd></div>
            <div><dt className="text-xs text-gray-500">Abonelik</dt><dd>{business.subscription_tier}</dd></div>
            <div><dt className="text-xs text-gray-500">İlan sayısı</dt><dd>{business.listing_count}</dd></div>
          </dl>
        ) : null}

        {subTab === "araclar" ? (
          <StubNotice phase="Galeri — Araçlar (Phase 2)">
            Sıfır + 2. el araç ekleme: marka, model, yıl, km, yakıt, vites, fiyat, fotoğraf galerisi. B2C galeri ve C2C sahibinden ilanları.
          </StubNotice>
        ) : null}

        {subTab === "fotograflar" ? (
          <StubNotice phase="Galeri — Fotoğraflar (Phase 2)">Araç fotoğraf vitrini ve öne çıkan görsel yönetimi.</StubNotice>
        ) : null}

        {subTab === "urunler" ? (
          <StubNotice phase="Parça / Lastik — Ürünler (Phase 4)">
            SKU, stok, fiyat, uyumluluk matrisi. VIN/şasi sorgusu ile uyumlu parça filtresi Phase 4&apos;te.
          </StubNotice>
        ) : null}

        {subTab === "uyumluluk" ? (
          <StubNotice phase="Uyumluluk (Phase 4)">
            Marka / model / nesil / motor uyumluluk şeması — TecDoc benzeri entegrasyon hedefi.
          </StubNotice>
        ) : null}

        {subTab === "kargo" ? (
          <StubNotice phase="Kargo (Phase 4)">
            Desi bazlı Yurtiçi, Aras, MNG entegrasyonu — mevcut Geliver altyapısı ile birleştirilecek.
          </StubNotice>
        ) : null}

        {subTab === "hizmetler" ? (
          <StubNotice phase="Hizmetler / Paketler (Phase 3)">
            Servis, yıkama ve lastik montaj hizmet listesi + fiyatlandırma.
          </StubNotice>
        ) : null}

        {subTab === "randevular" ? (
          <StubNotice phase="Randevu Slotları (Phase 3)">
            Gerçek zamanlı müsaitlik takvimi, hizmet seçimi ve plaka bazlı hatırlatmalar (muayene, yağ değişimi km).
          </StubNotice>
        ) : null}

        {subTab === "calisma_saatleri" ? (
          <StubNotice phase="Çalışma Saatleri (Phase 3)">Haftalık çalışma saatleri ve tatil günleri JSON editörü.</StubNotice>
        ) : null}

        {subTab === "belgeler" ? (
          <StubNotice phase="Belgeler & Abonelik (Phase 4)">
            Ticari belgeler, abonelik paketi, doping/öne çıkarma ayarları.
          </StubNotice>
        ) : null}
      </div>
    </div>
  );
}
