import { useEffect, useMemo, useState, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import type { ReactNode } from "react";

export type TrAddressValue = {
  city: string;
  district: string;
  mahalle: string;
  sokak?: string;
};

type ProvinceRow = { plaka: number; adi: string; kayit_no?: number | null };
type DistrictRow = { kimlikNo: string; ilPlaka: number; adi: string; kayit_no?: number | null };
type MahRow = { kimlikNo: string; adi: string; bilesen: string };
type SokRow = { kimlikNo: string; adi: string; bilesen: string };

function norm(s: string) {
  return s.trim().toLocaleUpperCase("tr-TR").replace(/\s+/g, " ");
}

type Props = {
  value: TrAddressValue;
  onChange: (v: TrAddressValue) => void;
  /** Sokak araması (mahalle listeden seçilmiş olmalı) */
  showSokak?: boolean;
  /** Üyelik profili gibi sadece il + ilçe */
  showMahalle?: boolean;
  /** İl, ilçe, mahalle tek satır (3 sütun) */
  singleRow?: boolean;
  /** Koyu arka plan (işletme paneli vb.) */
  variant?: "light" | "dark";
  className?: string;
  mahalleAction?: ReactNode;
};

/**
 * Türkiye il / ilçe / (isteğe bağlı) mahalle / sokak — `/api/tr-address/*` + DB verisi gerekir.
 * Veri yoksa kısa uyarı ve serbest metin alanlarına düşer.
 */
export function TrAddressFields({
  value,
  onChange,
  showSokak = false,
  showMahalle = true,
  singleRow = false,
  variant = "light",
  className,
  mahalleAction,
}: Props) {
  const [warn, setWarn] = useState<string | null>(null);
  const [provinces, setProvinces] = useState<ProvinceRow[]>([]);
  const [districts, setDistricts] = useState<DistrictRow[]>([]);
  const [ilPlaka, setIlPlaka] = useState<number | "">("");
  const [ilceKimlik, setIlceKimlik] = useState<string>("");
  const [mahalleKimlik, setMahalleKimlik] = useState<string>("");
  const [sokakKimlik, setSokakKimlik] = useState<string>("");
  const [mhList, setMhList] = useState<MahRow[]>([]);
  const [skList, setSkList] = useState<SokRow[]>([]);
  const [mhOpen, setMhOpen] = useState(false);
  const [skOpen, setSkOpen] = useState(false);
  const [mhQ, setMhQ] = useState("");

  const emit = useCallback(
    (patch: Partial<TrAddressValue>) => {
      onChange({ ...value, ...patch });
    },
    [onChange, value],
  );

  useEffect(() => {
    let cancelled = false;
    apiRequest("/api/tr-address/provinces")
      .then((rows: ProvinceRow[]) => {
        if (cancelled) return;
        if (!Array.isArray(rows) || rows.length === 0) {
          setWarn("Adres veritabanı boş. Sunucuda migration + import script çalıştırın.");
          setProvinces([]);
          return;
        }
        setWarn(null);
        setProvinces(rows);
      })
      .catch(() => {
        if (!cancelled) {
          setWarn("Adres listesi yüklenemedi (API).");
          setProvinces([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!provinces.length || !value.city) return;
    const hit = provinces.find((p) => norm(p.adi) === norm(value.city));
    if (hit && hit.plaka !== ilPlaka) {
      setIlPlaka(hit.plaka);
    }
  }, [provinces, value.city, ilPlaka]);

  useEffect(() => {
    if (ilPlaka === "" || ilPlaka == null) {
      setDistricts([]);
      return;
    }
    let cancelled = false;
    apiRequest(`/api/tr-address/districts?plaka=${encodeURIComponent(String(ilPlaka))}`)
      .then((rows: DistrictRow[]) => {
        if (cancelled) return;
        setDistricts(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setDistricts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [ilPlaka]);

  useEffect(() => {
    if (!districts.length || !value.district) return;
    const hit = districts.find((d) => norm(d.adi) === norm(value.district));
    if (hit && String(hit.kimlikNo) !== ilceKimlik) {
      setIlceKimlik(String(hit.kimlikNo));
    }
  }, [districts, value.district, ilceKimlik]);

  useEffect(() => {
    if (!showMahalle || !ilceKimlik) {
      setMhList([]);
      return;
    }
    const t = window.setTimeout(() => {
      const q = mhQ.trim() || "";
      apiRequest(
        `/api/tr-address/neighborhoods?ilceKimlik=${encodeURIComponent(ilceKimlik)}&q=${encodeURIComponent(q)}&limit=80`,
      )
        .then((rows: MahRow[]) => setMhList(Array.isArray(rows) ? rows : []))
        .catch(() => setMhList([]));
    }, 200);
    return () => clearTimeout(t);
  }, [ilceKimlik, mhQ, showMahalle]);

  useEffect(() => {
    if (!showSokak || !ilceKimlik) {
      setSkList([]);
      return;
    }
    const q = (value.sokak ?? "").trim().slice(0, 60);
    if (q.length < 2) {
      setSkList([]);
      return;
    }
    const t = window.setTimeout(() => {
      const path = mahalleKimlik
        ? `/api/tr-address/streets?mahalleKimlik=${encodeURIComponent(mahalleKimlik)}&q=${encodeURIComponent(q)}&limit=60`
        : `/api/tr-address/streets-in-ilce?ilceKimlik=${encodeURIComponent(ilceKimlik)}&q=${encodeURIComponent(q)}&limit=40`;
      apiRequest(path)
        .then((rows: SokRow[]) => setSkList(Array.isArray(rows) ? rows : []))
        .catch(() => setSkList([]));
    }, 280);
    return () => clearTimeout(t);
  }, [showSokak, mahalleKimlik, ilceKimlik, value.sokak]);

  const lab = variant === "dark" ? "text-white/60" : "text-xs font-semibold text-gray-900";
  const baseSelect =
    variant === "dark"
      ? "w-full text-sm border border-white/20 rounded-md px-3 py-2 bg-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
      : "w-full text-sm border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400/50";
  const warnBox =
    variant === "dark"
      ? "text-xs text-amber-200 bg-amber-500/10 border border-amber-400/30 rounded-md px-2 py-1.5 mb-2"
      : "text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 mb-2";

  const onProvinceChange = (plakaStr: string) => {
    const p = parseInt(plakaStr, 10);
    if (!Number.isFinite(p)) {
      setIlPlaka("");
      setIlceKimlik("");
      setMahalleKimlik("");
      setSokakKimlik("");
      emit({ city: "", district: "", mahalle: "", sokak: "" });
      return;
    }
    const row = provinces.find((x) => x.plaka === p);
    setIlPlaka(p);
    setIlceKimlik("");
    setMahalleKimlik("");
    setSokakKimlik("");
    setMhQ("");
    emit({ city: row?.adi ?? "", district: "", mahalle: "", sokak: "" });
  };

  const onDistrictChange = (kimlik: string) => {
    setIlceKimlik(kimlik);
    setMahalleKimlik("");
    setSokakKimlik("");
    setMhQ("");
    const row = districts.find((d) => String(d.kimlikNo) === kimlik);
    emit({ district: row?.adi ?? "", mahalle: "", sokak: "" });
  };

  const pickMahalle = (r: MahRow) => {
    setMahalleKimlik(String(r.kimlikNo));
    setMhOpen(false);
    emit({ mahalle: r.adi });
  };

  const pickSokak = (r: SokRow) => {
    setSokakKimlik(String(r.kimlikNo));
    setSkOpen(false);
    emit({ sokak: r.bilesen || r.adi });
  };

  const provinceValue = useMemo(() => (ilPlaka === "" ? "" : String(ilPlaka)), [ilPlaka]);

  const ilIlceMahalleGrid = singleRow ? "grid grid-cols-3 gap-1.5 sm:gap-2 min-w-0" : "grid sm:grid-cols-2 gap-2";
  const cellMin = singleRow ? "min-w-0" : "";

  const ilBlock = (
    <div className={cellMin}>
      <label className={`${lab} mb-0.5 block`}>İl</label>
      <select
        className={baseSelect}
        value={provinceValue}
        onChange={(e) => onProvinceChange(e.target.value)}
        disabled={!provinces.length}
      >
        <option value="">Seçin…</option>
        {provinces.map((p) => (
          <option key={p.plaka} value={p.plaka}>
            {p.adi}
          </option>
        ))}
      </select>
    </div>
  );

  const ilceBlock = (
    <div className={cellMin}>
      <label className={`${lab} mb-0.5 block`}>İlçe</label>
      <select
        className={baseSelect}
        value={ilceKimlik}
        onChange={(e) => onDistrictChange(e.target.value)}
        disabled={!districts.length}
      >
        <option value="">Seçin…</option>
        {districts.map((d) => (
          <option key={String(d.kimlikNo)} value={String(d.kimlikNo)}>
            {d.adi}
          </option>
        ))}
      </select>
    </div>
  );

  const mahalleBlock = showMahalle ? (
    <div className={`relative ${cellMin}`}>
      <div className="mb-0.5 flex items-center justify-between gap-1 min-w-0">
        <label className={`${lab} truncate`}>Mahalle</label>
        {mahalleAction ? <div className="shrink-0">{mahalleAction}</div> : null}
      </div>
      <input
        className={baseSelect}
        value={value.mahalle}
        onChange={(e) => {
          emit({ mahalle: e.target.value });
          setMhQ(e.target.value);
          setMahalleKimlik("");
          setMhOpen(true);
        }}
        onFocus={() => setMhOpen(true)}
        onBlur={() => window.setTimeout(() => setMhOpen(false), 200)}
        placeholder="Yazın veya seçin"
        disabled={!ilceKimlik}
      />
      {mhOpen && mhList.length > 0 ? (
        <ul
          className={`absolute z-30 mt-0.5 max-h-48 overflow-auto w-full rounded-md shadow text-sm ${
            variant === "dark" ? "bg-slate-900 border border-white/20 text-white" : "bg-white border border-gray-200"
          }`}
        >
          {mhList.map((r) => (
            <li key={String(r.kimlikNo)}>
              <button
                type="button"
                className={`w-full text-left px-2 py-1.5 ${variant === "dark" ? "hover:bg-white/10" : "hover:bg-gray-50"}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickMahalle(r)}
              >
                <span className="font-medium">{r.adi}</span>
                {r.bilesen && r.bilesen !== r.adi ? (
                  <span className={`${variant === "dark" ? "text-white/45" : "text-gray-500"} text-xs block truncate`}>{r.bilesen}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  ) : null;

  return (
    <div className={className}>
      {warn ? <p className={warnBox}>{warn}</p> : null}
      {singleRow && showMahalle ? (
        <div className={ilIlceMahalleGrid}>
          {ilBlock}
          {ilceBlock}
          {mahalleBlock}
        </div>
      ) : (
        <>
          <div className={ilIlceMahalleGrid}>
            {ilBlock}
            {ilceBlock}
          </div>
          {mahalleBlock ? <div className="mt-2">{mahalleBlock}</div> : null}
        </>
      )}
      {showSokak ? (
        <div className="mt-2 relative">
          <label className={`${lab} mb-0.5 block`}>Sokak / cadde</label>
          <input
            className={baseSelect}
            value={value.sokak ?? ""}
            onChange={(e) => {
              emit({ sokak: e.target.value });
              setSokakKimlik("");
              setSkOpen(true);
            }}
            onFocus={() => setSkOpen(true)}
            onBlur={() => window.setTimeout(() => setSkOpen(false), 200)}
            placeholder={ilceKimlik ? "Cadde / sokak yazın (ör. Ata…) — öneriler DB’den" : "Önce il ve ilçe seçin"}
            disabled={!ilceKimlik}
          />
          {skOpen && skList.length > 0 ? (
            <ul
              className={`absolute z-30 mt-0.5 max-h-40 overflow-auto w-full rounded-md shadow text-sm ${
                variant === "dark" ? "bg-slate-900 border border-white/20 text-white" : "bg-white border border-gray-200"
              }`}
            >
              {skList.map((r) => (
                <li key={String(r.kimlikNo)}>
                  <button
                    type="button"
                    className={`w-full text-left px-2 py-1.5 ${variant === "dark" ? "hover:bg-white/10" : "hover:bg-gray-50"}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickSokak(r)}
                  >
                    {r.bilesen || r.adi}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
