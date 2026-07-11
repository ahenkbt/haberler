import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search } from "lucide-react";
import { apiUrl } from "@/lib/apiBase";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { hmSiteContentShellClass } from "@/lib/hmChromeLayout";

export type HmSehitSearchKind = "canakkale" | "tsk";

export type HmSehitCanakkaleSearchParams = {
  q: string;
  province: string;
  district: string;
  serialNo: string;
};

type Props = {
  variant?: "home" | "embedded";
  /** Kurumsal anasayfa sidebar grid sol sütununda; tam genişlik koyu şerit yerine. */
  layout?: "full" | "sidebarMain";
  activeKind?: HmSehitSearchKind;
  showKindTabs?: boolean;
  showFullListLinks?: boolean;
  initialQ?: string;
  initialProvince?: string;
  initialDistrict?: string;
  initialSerial?: string;
  onCanakkaleSearch?: (params: HmSehitCanakkaleSearchParams) => void;
  onTskSearch?: (q: string) => void;
};

function buildCanakkaleQuery(params: HmSehitCanakkaleSearchParams): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.province) sp.set("province", params.province);
  if (params.district) sp.set("district", params.district);
  if (params.serialNo) sp.set("serialNo", params.serialNo);
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

const inputClass =
  "w-full min-w-0 rounded-md border border-[#E4DDD5] bg-[#F5F1EB] px-3 py-2 text-sm text-[#16181C] outline-none focus:border-[#8C1A2E] focus:ring-1 focus:ring-[#8C1A2E]/30";
const labelClass = "mb-1 block text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#9CA3AF]";

export function HmSehitSearchModule({
  variant = "home",
  layout = "full",
  activeKind,
  showKindTabs = true,
  showFullListLinks = true,
  initialQ = "",
  initialProvince = "",
  initialDistrict = "",
  initialSerial = "",
  onCanakkaleSearch,
  onTskSearch,
}: Props) {
  const ctx = useHmPublicLinkContextOptional();
  const h = useHmPublicHref();
  const shellClass = hmSiteContentShellClass(ctx?.layoutPrefs, "py-0");

  const [kind, setKind] = useState<HmSehitSearchKind>(activeKind ?? "canakkale");
  const [q, setQ] = useState(initialQ);
  const [province, setProvince] = useState(initialProvince);
  const [district, setDistrict] = useState(initialDistrict);
  const [serialNo, setSerialNo] = useState(initialSerial);

  useEffect(() => {
    if (activeKind) setKind(activeKind);
  }, [activeKind]);

  useEffect(() => {
    setQ(initialQ);
    setProvince(initialProvince);
    setDistrict(initialDistrict);
    setSerialNo(initialSerial);
  }, [initialQ, initialProvince, initialDistrict, initialSerial]);

  const { data: provinces } = useQuery({
    queryKey: ["/api/vkd/canakkale-sehitleri/stats/provinces"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/vkd/canakkale-sehitleri/stats/provinces"));
      const j = (await r.json()) as { success?: boolean; data?: Array<{ province: string }> };
      if (!r.ok || !j.success || !j.data) return [];
      return j.data;
    },
    staleTime: 60 * 60 * 1000,
    enabled: kind === "canakkale",
  });

  const canakkaleHref = h("/canakkale-sehitleri");
  const tskHref = h("/sehitlerimiz");
  const kindLabel = useMemo(
    () =>
      kind === "canakkale"
        ? { short: "Çanakkale", full: "Çanakkale Şehitleri" }
        : { short: "TSK", full: "TSK Şehitleri" },
    [kind],
  );

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    if (kind === "canakkale") {
      const params = {
        q: q.trim(),
        province: province.trim(),
        district: district.trim(),
        serialNo: serialNo.trim(),
      };
      if (onCanakkaleSearch) {
        onCanakkaleSearch(params);
        return;
      }
      window.location.assign(`${canakkaleHref}${buildCanakkaleQuery(params)}`);
      return;
    }
    const query = q.trim();
    if (onTskSearch) {
      onTskSearch(query);
      return;
    }
    window.location.assign(query ? `${tskHref}?q=${encodeURIComponent(query)}` : tskHref);
  }

  const listLinkClass =
    "hm-sehit-full-list-link inline-flex min-h-[38px] max-w-full items-center justify-center rounded-md border border-[#E4DDD5] bg-[#F5F1EB] px-3 py-2 text-center text-[9px] font-bold leading-snug text-[#475569] hover:border-[#8C1A2E] hover:text-[#8C1A2E] sm:text-[10px]";

  const cardShell =
    variant === "embedded"
      ? "hm-sehit-search-card max-w-full overflow-hidden rounded-xl border border-white/10 bg-white p-4 text-[#16181C] shadow-2xl shadow-black/30 md:p-5"
      : "hm-sehit-search-card max-w-full overflow-hidden rounded-xl border border-[#E4DDD5] bg-white p-4 text-[#16181C] shadow-lg md:p-5";

  const searchCard = (
    <div className={cardShell}>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[#E4DDD5] pb-3">
        <div className="text-[9px] font-extrabold uppercase tracking-[0.24em] text-[#8C1A2E]">Şehit Sorgulama</div>
        {showKindTabs ? (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setKind("canakkale")}
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition ${
                kind === "canakkale" ? "bg-[#8C1A2E] text-white" : "bg-[#F5F1EB] text-[#6B7280] hover:text-[#8C1A2E]"
              }`}
            >
              Çanakkale
            </button>
            <button
              type="button"
              onClick={() => setKind("tsk")}
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition ${
                kind === "tsk" ? "bg-[#8C1A2E] text-white" : "bg-[#F5F1EB] text-[#6B7280] hover:text-[#8C1A2E]"
              }`}
            >
              TSK
            </button>
          </div>
        ) : null}
      </div>

      <form onSubmit={submitSearch} className="space-y-2 sm:space-y-3">
        <div className="hm-sehit-search-fields flex min-w-0 w-full flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-end sm:gap-2 md:gap-3">
          <label className="block w-full shrink-0 sm:min-w-[140px] sm:flex-1 sm:basis-[160px]">
            <span className={labelClass}>{kind === "canakkale" ? "Ad / kelime" : "Şehit adı"}</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={kind === "canakkale" ? "Mehmet" : "Ahmet YILMAZ"}
              className={inputClass}
            />
          </label>

          {kind === "canakkale" ? (
            <>
              <label className="block w-full shrink-0 sm:min-w-[100px] sm:flex-1 sm:basis-[120px]">
                <span className={labelClass}>İl</span>
                <input
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  placeholder="Bursa"
                  list="hm-sehit-province-list"
                  className={inputClass}
                />
              </label>
              <label className="block w-full shrink-0 sm:min-w-[100px] sm:flex-1 sm:basis-[120px]">
                <span className={labelClass}>İlçe</span>
                <input
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="İnegöl"
                  className={inputClass}
                />
              </label>
              <label className="block w-full shrink-0 sm:w-[88px]">
                <span className={labelClass}>Sıra No</span>
                <input
                  value={serialNo}
                  onChange={(e) => setSerialNo(e.target.value)}
                  placeholder="1234"
                  inputMode="numeric"
                  className={inputClass}
                />
              </label>
              <datalist id="hm-sehit-province-list">
                {(provinces ?? []).map((p) => (
                  <option key={p.province} value={p.province} />
                ))}
              </datalist>
            </>
          ) : null}

          <div className="hm-sehit-search-actions flex w-full min-w-0 shrink-0 flex-col gap-1.5 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 sm:pb-0.5">
            <button
              type="submit"
              className="inline-flex h-[38px] w-full shrink-0 items-center justify-center gap-1.5 rounded-md bg-[#8C1A2E] px-4 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white hover:bg-[#6E1222] sm:w-auto"
            >
              <Search className="h-3.5 w-3.5" aria-hidden />
              Ara
            </button>
            {showFullListLinks ? (
              <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
                {onCanakkaleSearch ? (
                  <button
                    type="button"
                    onClick={() => onCanakkaleSearch({ q: "", province: "", district: "", serialNo: "" })}
                    className={`${listLinkClass} w-full sm:w-auto`}
                  >
                    ÇANAKKALE ŞEHİTLERİMİZ
                  </button>
                ) : (
                  <Link href={canakkaleHref} className={`${listLinkClass} w-full sm:w-auto`}>
                    ÇANAKKALE ŞEHİTLERİMİZ
                  </Link>
                )}
                {onTskSearch ? (
                  <button
                    type="button"
                    onClick={() => onTskSearch("")}
                    className={`${listLinkClass} w-full sm:w-auto`}
                  >
                    TSK ŞEHİTLERİMİZ
                  </button>
                ) : (
                  <Link href={tskHref} className={`${listLinkClass} w-full sm:w-auto`}>
                    TSK ŞEHİTLERİMİZ
                  </Link>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </form>
    </div>
  );

  if (variant === "embedded") {
    return searchCard;
  }

  const homeHeader = (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div>
        <div className="text-[9px] font-extrabold uppercase tracking-[0.28em] text-[#C9A84C]">Şehit Arama</div>
        <h2 className="font-serif text-lg font-bold text-white md:text-xl">
          {kindLabel.full} · <span className="text-[#C9A84C]">Vatan Size Minnettardır</span>
        </h2>
      </div>
    </div>
  );

  if (layout === "sidebarMain") {
    return (
      <div className="vkv-sehit-search vkv-sehit-search--sidebar-main mb-5 w-full min-w-0 max-w-full overflow-hidden rounded-xl bg-[#0A0C0E] text-white">
        <div className="min-w-0 max-w-full px-4 py-5 md:px-5 md:py-6">
          {homeHeader}
          {searchCard}
        </div>
      </div>
    );
  }

  return (
    <section className="vkv-sehit-search w-full max-w-full overflow-hidden bg-[#0A0C0E] text-white">
      <div className={`${shellClass} min-w-0 max-w-full py-5 md:py-6`}>
        {homeHeader}
        {searchCard}
      </div>
    </section>
  );
}
