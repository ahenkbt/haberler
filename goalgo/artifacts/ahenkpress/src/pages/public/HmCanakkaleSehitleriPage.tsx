import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "@/lib/apiBase";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { hmSiteContentShellClass } from "@/lib/hmChromeLayout";
import {
  SADE_EDITORIAL_EYEBROW_CLASS,
  SADE_EDITORIAL_HERO_SECTION_CLASS,
  SADE_HERO_GLOW_CLASS,
} from "@/lib/yekpareSadeTheme";
import { HmSehitSearchModule } from "@/components/HmSehitSearchModule";

type ProvinceStat = { province: string; total: number };
type DistrictStat = { district: string; total: number };

type SehitRecord = {
  id: number;
  serialNo: number;
  name: string;
  fatherName: string;
  birthYear: number | null;
  nickname: string;
  province: string;
  district: string;
  bucak: string;
  village: string;
  branchClass: string;
  rank: string;
  unitText: string;
  martyrdomPlace: string;
  martyrdomDate: string;
};

type SearchPayload = {
  items: SehitRecord[];
  page: number;
  limit: number;
  total: number;
};

const PAGE_SIZE = 50;

function formatNumber(n: number): string {
  return new Intl.NumberFormat("tr-TR").format(n);
}

export default function HmCanakkaleSehitleriPage() {
  const ctx = useHmPublicLinkContextOptional();
  const shellClass = hmSiteContentShellClass(ctx?.layoutPrefs, "py-0");

  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [searchPage, setSearchPage] = useState(1);
  const [hasSearched, setHasSearched] = useState(false);
  const [submitted, setSubmitted] = useState({ q: "", province: "", district: "", serialNo: "" });

  const { data: meta } = useQuery({
    queryKey: ["/api/vkd/canakkale-sehitleri/meta"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/vkd/canakkale-sehitleri/meta"));
      const j = (await r.json()) as { success?: boolean; data?: { total: number; source: string }; error?: string };
      if (!r.ok || !j.success || !j.data) throw new Error(j.error ?? "Meta alınamadı");
      return j.data;
    },
    staleTime: 60 * 60 * 1000,
  });

  const { data: provinces, isLoading: provincesLoading } = useQuery({
    queryKey: ["/api/vkd/canakkale-sehitleri/stats/provinces"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/vkd/canakkale-sehitleri/stats/provinces"));
      const j = (await r.json()) as { success?: boolean; data?: ProvinceStat[]; error?: string };
      if (!r.ok || !j.success || !j.data) throw new Error(j.error ?? "İl istatistikleri alınamadı");
      return j.data;
    },
    staleTime: 60 * 60 * 1000,
  });

  const { data: districtStats, isLoading: districtsLoading } = useQuery({
    queryKey: ["/api/vkd/canakkale-sehitleri/stats/districts", selectedProvince],
    enabled: Boolean(selectedProvince),
    queryFn: async () => {
      const r = await fetch(
        apiUrl(`/api/vkd/canakkale-sehitleri/stats/districts?province=${encodeURIComponent(selectedProvince ?? "")}`),
      );
      const j = (await r.json()) as {
        success?: boolean;
        data?: { province: string; districts: DistrictStat[] };
        error?: string;
      };
      if (!r.ok || !j.success || !j.data) throw new Error(j.error ?? "İlçe istatistikleri alınamadı");
      return j.data;
    },
    staleTime: 60 * 60 * 1000,
  });

  const searchQueryKey = [
    "/api/vkd/canakkale-sehitleri/search",
    submitted.q,
    submitted.province,
    submitted.district,
    submitted.serialNo,
    searchPage,
  ] as const;

  const {
    data: searchResult,
    isLoading: searchLoading,
    isFetching: searchFetching,
  } = useQuery({
    queryKey: searchQueryKey,
    enabled: hasSearched,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (submitted.q) params.set("q", submitted.q);
      if (submitted.province) params.set("province", submitted.province);
      if (submitted.district) params.set("district", submitted.district);
      if (submitted.serialNo) params.set("serialNo", submitted.serialNo);
      params.set("page", String(searchPage));
      params.set("limit", String(PAGE_SIZE));
      const r = await fetch(apiUrl(`/api/vkd/canakkale-sehitleri/search?${params.toString()}`));
      const j = (await r.json()) as { success?: boolean; data?: SearchPayload; error?: string };
      if (!r.ok || !j.success || !j.data) throw new Error(j.error ?? "Arama başarısız");
      return j.data;
    },
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (!ctx) return;
    document.title = `Çanakkale Şehitleri · ${ctx.displayName}`;
  }, [ctx]);

  const topProvinces = useMemo(() => (provinces ?? []).slice(0, 5), [provinces]);
  const totalPages = Math.max(1, Math.ceil((searchResult?.total ?? 0) / PAGE_SIZE));

  function runSearch(next: { q: string; province: string; district: string; serialNo: string }, page = 1) {
    setSearchPage(page);
    setSubmitted(next);
    setHasSearched(true);
  }

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const q = sp.get("q") ?? "";
    const province = sp.get("province") ?? "";
    const district = sp.get("district") ?? "";
    const serialNo = sp.get("serialNo") ?? "";
    if (q || province || district || serialNo) {
      runSearch({ q, province, district, serialNo });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- URL query only on first load
  }, []);

  function openSearchForProvince(province: string) {
    setSelectedProvince(province);
    runSearch({ q: "", province, district: "", serialNo: "" });
  }

  function openSearchForDistrict(province: string, district: string) {
    setSelectedProvince(province);
    runSearch({ q: "", province, district: district === "—" ? "" : district, serialNo: "" });
  }

  const searchModule = (
    <HmSehitSearchModule
      variant="embedded"
      activeKind="canakkale"
      showKindTabs
      showFullListLinks
      initialQ={submitted.q}
      initialProvince={submitted.province}
      initialDistrict={submitted.district}
      initialSerial={submitted.serialNo}
      onCanakkaleSearch={(params) =>
        runSearch({
          q: params.q.trim(),
          province: params.province.trim(),
          district: params.district.trim(),
          serialNo: params.serialNo.trim(),
        })
      }
    />
  );

  return (
    <div className="min-w-0 bg-[#F5F1EB] text-[#16181C]">
      <section className={SADE_EDITORIAL_HERO_SECTION_CLASS}>
        <div className={SADE_HERO_GLOW_CLASS} />
        <div className={`${shellClass} relative z-[1]`}>
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-10">
            <div>
              <div className={`mb-4 ${SADE_EDITORIAL_EYEBROW_CLASS}`}>Çanakkale Cephesi</div>
              <h1 className="font-serif text-3xl font-bold leading-tight text-slate-950 md:text-4xl">
                Çanakkale
                <span className="mt-1 block bg-gradient-to-br from-[#C9A84C] via-[#e8c96a] to-[#C9A84C] bg-clip-text italic text-transparent">
                  Şehitlerimiz
                </span>
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 md:text-base">
                Çanakkale Cephesi şehit listesi; ad, baba adı, il, ilçe ve sıra numarasına göre sorgulanabilir.
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3 shadow-sm">
                  <div className="font-serif text-2xl font-bold text-[#0f766e]">{meta ? formatNumber(meta.total) : "…"}</div>
                  <div className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-slate-500">Kayıtlı Şehit</div>
                </div>
                {topProvinces[0] ? (
                  <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3 shadow-sm">
                    <div className="font-serif text-sm font-bold text-[#0f766e]">{topProvinces[0].province}</div>
                    <div className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
                      En çok ({formatNumber(topProvinces[0].total)})
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="w-full min-w-0">{searchModule}</div>
          </div>
        </div>
      </section>

      <main className={`${shellClass} space-y-8 py-8 md:py-10`}>
        {!hasSearched ? (
          <div className="rounded-xl border border-dashed border-[#E4DDD5] bg-white/70 px-6 py-12 text-center">
            <div className="text-3xl opacity-40">🕊️</div>
            <h3 className="mt-3 font-serif text-xl font-bold text-[#3D4451]">Şehit kaydı sorgulayın</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#9CA3AF]">
              Yukarıdaki formdan ad, il veya sıra numarası girerek arama yapın. İsterseniz &quot;Tüm kayıtlar&quot; ile
              listeyi görüntüleyebilirsiniz.
            </p>
          </div>
        ) : searchLoading ? (
          <div className="flex flex-col items-center gap-4 py-16 text-sm text-[#6B7280]">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#0f766e] border-t-transparent" />
            Kayıtlar yükleniyor…
          </div>
        ) : (
          <section className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#E4DDD5] pb-4">
              <div>
                <div className="text-[9px] font-extrabold uppercase tracking-[0.25em] text-[#0f766e]">Sonuçlar</div>
                <h3 className="font-serif text-xl font-bold md:text-2xl">
                  {formatNumber(searchResult?.total ?? 0)} kayıt bulundu
                  {searchFetching ? " …" : ""}
                </h3>
                {(submitted.q || submitted.province || submitted.district || submitted.serialNo) && (
                  <p className="mt-1 text-xs text-[#9CA3AF]">
                    {[
                      submitted.q && `Kelime: ${submitted.q}`,
                      submitted.province && `İl: ${submitted.province}`,
                      submitted.district && `İlçe: ${submitted.district}`,
                      submitted.serialNo && `Sıra: ${submitted.serialNo}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
              {totalPages > 1 ? (
                <div className="text-xs text-[#6B7280]">
                  Sayfa {searchPage} / {totalPages}
                </div>
              ) : null}
            </div>

            {(searchResult?.items ?? []).length === 0 ? (
              <div className="rounded-xl border border-[#E4DDD5] bg-white py-16 text-center">
                <div className="text-4xl opacity-40">🔍</div>
                <h3 className="mt-3 font-serif text-xl font-bold text-[#3D4451]">Sonuç bulunamadı</h3>
                <p className="mt-2 text-sm text-[#9CA3AF]">Arama kriterlerini değiştirin veya alanları boşaltın.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#E4DDD5] bg-white shadow-sm">
                <table className="min-w-[960px] w-full text-left text-sm">
                  <thead className="bg-emerald-50 text-[10px] uppercase tracking-[0.14em] text-slate-600">
                    <tr>
                      <th className="px-3 py-3">Sıra</th>
                      <th className="px-3 py-3">Ad Soyad</th>
                      <th className="px-3 py-3">Baba Adı</th>
                      <th className="px-3 py-3">Doğum</th>
                      <th className="px-3 py-3">İl / İlçe</th>
                      <th className="px-3 py-3">Rütbe / Sınıf</th>
                      <th className="px-3 py-3">Şehadet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(searchResult?.items ?? []).map((row) => (
                      <tr key={row.id} className="border-t border-[#E4DDD5] odd:bg-[#F5F2ED]/55 align-top">
                        <td className="px-3 py-3 font-mono text-xs text-[#6B7280]">{row.serialNo}</td>
                        <td className="px-3 py-3">
                          <div className="font-bold text-[#16181C]">{row.name}</div>
                          {row.nickname ? <div className="text-xs text-[#9CA3AF]">({row.nickname})</div> : null}
                        </td>
                        <td className="px-3 py-3 text-[#3D4451]">{row.fatherName || "—"}</td>
                        <td className="px-3 py-3 text-[#6B7280]">{row.birthYear ?? "—"}</td>
                        <td className="px-3 py-3">
                          <div>{row.province || "—"}</div>
                          <div className="text-xs text-[#9CA3AF]">
                            {[row.district, row.bucak, row.village].filter(Boolean).join(" · ") || "—"}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div>{row.rank || "—"}</div>
                          <div className="text-xs text-[#9CA3AF]">{row.branchClass || row.unitText || "—"}</div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-medium text-[#0f766e]">{row.martyrdomDate || "—"}</div>
                          <div className="text-xs text-[#9CA3AF]">{row.martyrdomPlace || "—"}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 ? (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={searchPage <= 1}
                  onClick={() => setSearchPage((p) => Math.max(1, p - 1))}
                  className="rounded border border-[#E4DDD5] bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#0f766e] disabled:opacity-40"
                >
                  Önceki
                </button>
                <span className="px-3 text-xs text-[#6B7280]">
                  {searchPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={searchPage >= totalPages}
                  onClick={() => setSearchPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded border border-[#E4DDD5] bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#0f766e] disabled:opacity-40"
                >
                  Sonraki
                </button>
              </div>
            ) : null}
          </section>
        )}

        <details className="group rounded-xl border border-[#E4DDD5] bg-white shadow-sm">
          <summary className="cursor-pointer list-none px-5 py-4 md:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[9px] font-extrabold uppercase tracking-[0.25em] text-[#0f766e]">İstatistik</div>
                <h2 className="font-serif text-lg font-bold md:text-xl">İl / İlçe Dağılımı</h2>
              </div>
              <span className="text-xs font-bold uppercase tracking-wide text-[#0f766e] group-open:hidden">Göster ▾</span>
              <span className="hidden text-xs font-bold uppercase tracking-wide text-[#0f766e] group-open:inline">Gizle ▴</span>
            </div>
          </summary>
          <div className="border-t border-[#E4DDD5] px-5 py-6 md:px-6">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <section>
                <p className="mb-4 text-sm text-[#6B7280]">Bir ile tıklayarak ilçe dağılımını görün veya doğrudan sorgulayın.</p>
                {provincesLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#0f766e] border-t-transparent" />
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-[#E4DDD5]">
                    <table className="min-w-[360px] w-full text-left text-sm">
                      <thead className="bg-emerald-50 text-[10px] uppercase tracking-[0.16em] text-slate-600">
                        <tr>
                          <th className="px-4 py-3">#</th>
                          <th className="px-4 py-3">İl</th>
                          <th className="px-4 py-3 text-right">Şehit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(provinces ?? []).map((row, idx) => {
                          const active = selectedProvince === row.province;
                          return (
                            <tr
                              key={row.province}
                              className={`cursor-pointer border-t border-[#E4DDD5] transition hover:bg-[#FFF5F5] ${active ? "bg-[#FFF5F5]" : "odd:bg-[#F5F2ED]/55"}`}
                              onClick={() => setSelectedProvince(row.province)}
                            >
                              <td className="px-4 py-3 text-[#9CA3AF]">{idx + 1}</td>
                              <td className="px-4 py-3 font-bold">{row.province}</td>
                              <td className="px-4 py-3 text-right font-black text-[#0f766e]">{formatNumber(row.total)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section>
                <h3 className="font-serif text-lg font-bold">
                  {selectedProvince ? `${selectedProvince} — İlçeler` : "İlçe seçimi"}
                </h3>
                {!selectedProvince ? (
                  <div className="mt-6 rounded-lg border border-dashed border-[#E4DDD5] px-4 py-12 text-center text-sm text-[#9CA3AF]">
                    Sol tablodan bir il seçin
                  </div>
                ) : districtsLoading ? (
                  <div className="mt-6 flex justify-center py-10">
                    <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#0f766e] border-t-transparent" />
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => openSearchForProvince(selectedProvince)}
                      className="mt-4 rounded border border-[#0f766e] px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-[#0f766e] hover:bg-[#FFF5F5]"
                    >
                      Tüm {selectedProvince} kayıtlarını sorgula
                    </button>
                    <div className="mt-4 overflow-x-auto rounded-lg border border-[#E4DDD5]">
                      <table className="min-w-[320px] w-full text-left text-sm">
                        <thead className="bg-emerald-50 text-[10px] uppercase tracking-[0.16em] text-slate-600">
                          <tr>
                            <th className="px-4 py-3">İlçe</th>
                            <th className="px-4 py-3 text-right">Şehit</th>
                            <th className="px-4 py-3 text-right">İşlem</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(districtStats?.districts ?? []).map((row) => (
                            <tr key={`${selectedProvince}-${row.district}`} className="border-t border-[#E4DDD5] odd:bg-[#F5F2ED]/55">
                              <td className="px-4 py-3 font-medium">{row.district}</td>
                              <td className="px-4 py-3 text-right font-black text-[#0f766e]">{formatNumber(row.total)}</td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => openSearchForDistrict(selectedProvince, row.district)}
                                  className="text-[11px] font-bold uppercase tracking-wide text-[#0f766e] hover:underline"
                                >
                                  Sorgula
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </section>
            </div>
          </div>
        </details>

        {meta?.source ? (
          <p className="border-t border-[#E4DDD5] pt-4 text-xs leading-6 text-[#6B7280]">
            Kaynak: <strong className="text-[#3D4451]">{meta.source}</strong>
          </p>
        ) : null}
      </main>

      <section className="border-t border-emerald-100 bg-[#f4fbf7] px-4 py-14 text-center text-slate-900">
        <div className={`${shellClass} max-w-3xl`}>
          <div className="mb-4 flex items-center justify-center gap-3 text-2xl text-[#C9A84C]">☽ ★ ☽</div>
          <h2 className="font-serif text-2xl font-bold text-slate-950 md:text-3xl">Ruhları Şad, Mekânları Cennet Olsun</h2>
          <div className="mx-auto my-4 h-px w-16 bg-gradient-to-r from-transparent via-[#0f766e] to-transparent" />
          <p className="text-sm leading-8 text-slate-600">
            Çanakkale&apos;de vatan uğruna can veren aziz şehitlerimizi minnetle anıyoruz.
          </p>
        </div>
      </section>
    </div>
  );
}
