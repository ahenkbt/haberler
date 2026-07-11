import { useQuery } from "@tanstack/react-query";
import { PORTAL_ORIGIN } from "@/lib/portalBrand";
import { Link } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ArrowRight,
  Bot,
  Building2,
  Check,
  Cloud,
  GitBranch,
  Globe2,
  Lock,
  Newspaper,
  Sparkles,
  Zap,
  AlertCircle,
} from "lucide-react";
import { apiUrl, resolveClientMediaSrc, portalCanonicalAdminPath } from "@/lib/apiBase";
import { fetchPublicJson } from "@/lib/fetchPublicJson";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { applySocialShareMeta, resetSeoToSiteDefaults } from "@/lib/pageSeo";
import { SADE_HERO_SHELL_CLASS, SADE_PUBLIC_PAGE_BG, SADE_PUBLIC_POST_HERO_BODY_CLASS, sadePublicHeroFadeStyle } from "@/lib/yekpareSadeTheme";

type HmSlugRow = { id?: number; slug: string; displayName: string };

type ShowcaseSite = {
  slug: string;
  displayName: string;
  domain: string | null;
  logoUrl: string | null;
  createdAt?: string;
};

function vitrinHref(slug: string): string {
  return `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(slug)}`;
}

function publicSiteUrl(site: ShowcaseSite): string {
  const raw = (site.domain ?? "").trim().toLowerCase().replace(/^https?:\/\//, "");
  const host = raw.split("/")[0]?.trim() ?? "";
  if (host) return `https://${host}`;
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${vitrinHref(site.slug)}`;
  }
  return `${PORTAL_ORIGIN}${vitrinHref(site.slug)}`;
}

function domainLabel(site: ShowcaseSite): string {
  const raw = (site.domain ?? "").trim().toLowerCase().replace(/^https?:\/\//, "");
  return raw.split("/")[0]?.trim() || `yekpare.net${vitrinHref(site.slug)}`;
}

function formatHmApiError(prefix: string, err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return `${prefix}: ${msg || "Bilinmeyen hata"}`;
}

export default function Habermerkezi() {
  useEffect(() => {
    applySocialShareMeta({
      title: "Yekpare Haber Merkezi — Yapay zekâ destekli haber siteniz",
      descriptionPrimary:
        "Ajans ve sunucu derdi olmadan haber siteniz anında yayında. Yapay zekâ ile özgün içerik, havuz, otomatik güncelleme ve köşe yazarları — Yekpare.",
      canonicalPath: "/habermerkezi",
    });
    return () => resetSeoToSiteDefaults();
  }, []);

  const { data: slugs, isLoading: slugsLoading, isError: slugsError, error: slugsErr } = useQuery({
    queryKey: ["/api/hm/meta/slugs"],
    queryFn: async () => {
      const { ok, status, data } = await fetchPublicJson<HmSlugRow[]>(apiUrl("/api/hm/meta/slugs"));
      if (!ok) throw new Error(`HTTP ${status}`);
      return Array.isArray(data) ? data : [];
    },
    retry: 2,
    staleTime: 60_000,
  });

  const {
    data: showcase,
    isLoading: showcaseLoading,
    isError: showcaseError,
    error: showcaseErr,
  } = useQuery({
    queryKey: ["/api/hm/showcase-sites"],
    queryFn: async () => {
      const { ok, status, data } = await fetchPublicJson<ShowcaseSite[]>(apiUrl("/api/hm/showcase-sites"));
      if (!ok) throw new Error(`HTTP ${status}`);
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60_000,
    retry: 2,
  });

  const list = useMemo(() => (Array.isArray(slugs) ? slugs : []), [slugs]);
  const clients = useMemo(() => (Array.isArray(showcase) ? showcase : []), [showcase]);
  const [slug, setSlug] = useState("");
  const effectiveSlug = slug || list[0]?.slug || "";
  const hmApiBroken = slugsError || showcaseError;

  return (
    <div className="sade-public-page flex min-w-0 flex-1 flex-col text-slate-900">
      {hmApiBroken ? (
        <div className="border-b border-destructive/30 bg-destructive/5 px-4 py-3">
          <Alert variant="destructive" className="mx-auto max-w-4xl border-destructive/40">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>API’ye ulaşılamıyor</AlertTitle>
            <AlertDescription className="space-y-1 text-xs sm:text-sm">
              {slugsError ? (
                <p>{formatHmApiError("Site listesi (/api/hm/meta/slugs)", slugsErr)}</p>
              ) : null}
              {showcaseError ? (
                <p>{formatHmApiError("Vitrin listesi (/api/hm/showcase-sites)", showcaseErr)}</p>
              ) : null}
              <p className="mt-2 text-muted-foreground">
                Canlı vitrin verileri şu anda alınamıyor. Yönetim için{" "}
                <a className="font-medium underline" href={portalCanonicalAdminPath("/admin/haber-siteleri")}>
                  ana portaldaki Haber siteleri
                </a>{" "}
                bağlantısını kullanabilirsiniz. Lütfen bir süre sonra yeniden deneyin.
              </p>
            </AlertDescription>
          </Alert>
        </div>
      ) : null}
      {/* Hero */}
      <section className={`sade-public-hero ${SADE_HERO_SHELL_CLASS}`} style={sadePublicHeroFadeStyle(SADE_PUBLIC_PAGE_BG)}>
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:py-20 md:py-24">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0f766e] text-2xl font-black text-white shadow-lg shadow-emerald-900/15">
            HM
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#0f766e]">Yekpare</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
            Haber Merkezi
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Yapay zekâ destekli haber siteniz <strong className="text-slate-900">anında yayında</strong>. Güncelleme yapmanıza gerek
            kalmadan spor, dünya ve onlarca kategoride haberler sistem tarafından yapay zekâ ile özgünleştirilerek günlük ve
            otomatik güncellenir.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button className="sade-btn-primary px-6 text-base font-bold" asChild>
              <a href={portalCanonicalAdminPath("/admin/haber-siteleri")}>Haber sitelerim</a>
            </Button>
            <Button
              variant="outline"
              className="border-white/60 bg-white px-6 text-base font-bold text-slate-900 shadow-sm hover:bg-emerald-50 hover:text-slate-900"
              asChild
            >
              <Link href="/haberler">Yekpare haber akışı</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Özellikler */}
      <section className={`mx-auto max-w-5xl px-4 pb-10 md:pb-12 ${SADE_PUBLIC_POST_HERO_BODY_CLASS}`}>
        <h2 className="text-center text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          Nasıl çalışır?
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
          Eklediğiniz haberler <strong>haber havuzuna</strong> düşer; diğer haber sitelerinde sizin imzanızla yapay zekâ ile
          özgünleştirilerek yayınlanabilir. Siz arkanıza yaslanın — yapay zekâ vitrininizi düzenli günceller; siz yalnızca
          özel haberlerinizi ekleyin, köşe yazarlarınızı yönetin, siteniz <strong>7/24 güncel</strong> kalsın.
        </p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Sparkles,
              title: "Özgün içerik",
              text: "Gündem, ekonomi, dünya, spor ve daha fazlasında AI ile özgünleştirilmiş metinler.",
            },
            {
              icon: Newspaper,
              title: "Havuz ve yayılım",
              text: "Haber havuzu ile ağ içi paylaşım; kendi markanızla yayın.",
            },
            {
              icon: Bot,
              title: "AI editör",
              text: "Haber ekleme ve içerik araçları yapay zekâ ile entegre.",
            },
            {
              icon: Globe2,
              title: "Özel kategori",
              text: "İsteğe bağlı ekstra şehir veya konuya özel kategori ekleyin.",
            },
            {
              icon: Zap,
              title: "Yekpare akışı",
              text: "Yekpare Haber Merkezi AI ile otomatik günlük haber akışı.",
            },
            {
              icon: Cloud,
              title: "Sıfır operasyon stresi",
              text: "Ajansa para yok, bakım masrafı yok, sunucu ödeme derdi yok; kesinti ve bakım kaygısı minimize.",
            },
          ].map((item) => (
            <li
              key={item.title}
              className="flex gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0f766e] text-white">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Altyapı */}
      <section className="border-y border-slate-200 bg-white/80 py-14 sm:py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-2xl font-black text-slate-900 sm:text-3xl">Güvenilir yayın altyapısı</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            İçerik ve kod dünyanın en yaygın güvenilir platformlarında saklanır ve dağıtılır.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <GitBranch className="h-5 w-5 text-slate-700" />
                  Sürüm kayıtları
                </CardTitle>
                <CardDescription>Düzenli kayıt ve yedekleme</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-slate-600 leading-relaxed">
                Yayın değişiklikleri izlenebilir şekilde saklanır; yedekleme ve ekip çalışması standarttır.
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Cloud className="h-5 w-5 text-slate-700" />
                  Yayın servisleri
                </CardTitle>
                <CardDescription>İçerik ve veri katmanı</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-slate-600 leading-relaxed">
                İçerik servisleri ve veri katmanı ölçeklenebilir yapı üzerinde çalışır.
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe2 className="h-5 w-5 text-slate-700" />
                  Hızlı vitrin
                </CardTitle>
                <CardDescription>Ziyaretçi arayüzü</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-slate-600 leading-relaxed">
                Ziyaretçilerin gördüğü arayüz hızlı açılır ve güvenli bağlantı üzerinden sunulur.
              </CardContent>
            </Card>
          </div>
          <p className="mt-8 text-center text-sm text-slate-500">
            Otomatik güncelleme, sunucu ve yapay zekâ destekli editör hizmetleri paketlere dahildir.
          </p>
        </div>
      </section>

      {/* Fiyatlandırma */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
        <h2 className="text-center text-2xl font-black text-slate-900 sm:text-3xl">Üyelik paketleri</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-500">
          Kampanya fiyatları örnek tanıtım amaçlıdır; kesin sözleşme ve faturalama için Yekpare ile iletişime geçin.
        </p>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <Card className="relative flex flex-col border-2 border-slate-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-xl">Standart</CardTitle>
              <CardDescription>Otomatik günlük haber + AI editör</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col space-y-4">
              <div>
                <p className="text-sm text-slate-500 line-through">2.000 TL / ay</p>
                <p className="text-3xl font-black text-[#0f766e]">1.000 TL</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Aylık</p>
              </div>
              <p className="text-sm font-semibold text-slate-700">1 yıllık: <span className="text-slate-900">10.000 TL</span></p>
              <ul className="flex-1 space-y-2 text-sm text-slate-600">
                {["Sunucu + otomatik güncelleme", "Yapay zekâ editör", "Günlük özgün haber akışı"].map((t) => (
                  <li key={t} className="flex gap-2">
                    <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                    {t}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="relative flex flex-col border-2 border-amber-400/80 bg-amber-50/30 shadow-lg ring-1 ring-amber-200">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
              Gold
            </div>
            <CardHeader className="pt-6">
              <CardTitle className="text-xl">Gold</CardTitle>
              <CardDescription>Sosyal otomasyon</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col space-y-4">
              <div>
                <p className="text-sm text-slate-500 line-through">3.000 TL / ay</p>
                <p className="text-3xl font-black text-amber-700">2.000 TL</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Aylık</p>
              </div>
              <ul className="flex-1 space-y-2 text-sm text-slate-600">
                <li className="flex gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                  Standart paketteki her şey
                </li>
                <li className="flex gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                  Haberleriniz isterseniz otomatik <strong>Facebook</strong> ve <strong>LinkedIn</strong> sayfalarınıza postlanır
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="relative flex flex-col border-2 border-violet-300 bg-violet-50/40 shadow-lg">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
              Premium
            </div>
            <CardHeader className="pt-6">
              <CardTitle className="text-xl">Premium</CardTitle>
              <CardDescription>Reels ve çoklu video ağı</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col space-y-4">
              <div>
                <p className="text-sm text-slate-500 line-through">5.000 TL / ay</p>
                <p className="text-3xl font-black text-violet-700">3.000 TL</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Aylık</p>
              </div>
              <p className="rounded-lg bg-white/80 px-3 py-2 text-xs font-semibold text-violet-900 ring-1 ring-violet-200">
                Yıllık ödemede ek <strong>%10 indirim</strong>
              </p>
              <ul className="flex-1 space-y-2 text-sm text-slate-600">
                <li className="flex gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                  Gold’daki özellikler
                </li>
                <li className="flex gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                  Haberleriniz <strong>Reels</strong> formatında <strong>Instagram, YouTube, Facebook, TikTok</strong> hesaplarınıza
                  postlanabilir
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Bizi tercih edenler */}
      <section className="border-t border-emerald-100 bg-gradient-to-b from-emerald-50/50 to-white py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-black text-slate-900 sm:text-3xl">Bizi tercih edenler</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-600">
            Yönetim panelinden eklenen her aktif haber sitesi bu listede görünür; liste API ile canlı güncellenir.
          </p>
          {showcaseLoading ? (
            <p className="mt-10 text-center text-sm text-slate-500">Yükleniyor…</p>
          ) : showcaseError ? (
            <p className="mt-10 text-center text-sm text-red-600">
              Vitrin listesi şu anda yüklenemedi.
            </p>
          ) : clients.length === 0 ? (
            <p className="mt-10 text-center text-sm text-slate-500">Henüz kayıtlı site yok — ilk siz olun.</p>
          ) : (
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {clients.map((site) => {
                const href = publicSiteUrl(site);
                const logoSrc = site.logoUrl ? resolveClientMediaSrc(site.logoUrl) : "";
                return (
                  <li key={site.slug}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-full flex-col items-center rounded-2xl border border-emerald-100 bg-white p-5 text-center shadow-sm transition hover:border-[#039D55]/40 hover:shadow-md"
                    >
                      <div className="flex h-16 w-full max-w-[160px] items-center justify-center rounded-xl bg-slate-50 p-2">
                        {logoSrc ? (
                          <img src={logoSrc} alt="" className="max-h-12 w-auto max-w-full object-contain" loading="lazy" />
                        ) : (
                          <span className="text-2xl font-black text-[#0f766e]">{site.displayName.slice(0, 1)}</span>
                        )}
                      </div>
                      <span className="mt-3 line-clamp-2 text-sm font-bold text-slate-900">{site.displayName}</span>
                      <span className="mt-1 break-all text-xs text-[#0f766e] hover:underline">{domainLabel(site)}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Editör girişi (mevcut akış) */}
      <section className="mx-auto w-full max-w-lg px-4 py-14 sm:py-16">
        <div className="text-center mb-8">
          <h2 className="text-xl font-black text-slate-900 md:text-2xl">Zaten haber siteniz var mı?</h2>
          <p className="mt-2 text-sm text-slate-600">
            Slug seçin; vitrin veya editör paneline geçin.{" "}
            seçtiğiniz sitenin vitrinine veya editör girişine geçin.
          </p>
        </div>

        <Card className="border-slate-200 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-[#0f766e]" />
              Site seçin
            </CardTitle>
            <CardDescription className="text-slate-500">
              {slugsLoading
                ? "Siteler yükleniyor…"
                : slugsError
                  ? "API hatası — site listesi alınamadı."
                  : list.length === 0
                    ? "Henüz kayıtlı haber sitesi yok."
                    : "Aktif haber merkezi siteleri."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Haber sitesi</label>
              {list.length === 0 && !slugsLoading ? (
                slugsError ? (
                  <p className="mt-2 text-sm text-red-600">API yanıt vermiyor veya erişim reddedildi.</p>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">—</p>
                )
              ) : (
                <Select value={effectiveSlug} onValueChange={setSlug} disabled={slugsLoading || list.length === 0}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder={slugsLoading ? "Yükleniyor…" : "Slug seçin"} />
                  </SelectTrigger>
                  <SelectContent>
                    {list.map((d) => (
                      <SelectItem key={d.slug} value={d.slug}>
                        {d.displayName} ({d.slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {effectiveSlug ? (
                <Button variant="outline" asChild>
                  <Link href={vitrinHref(effectiveSlug)}>Vitrin sayfası</Link>
                </Button>
              ) : (
                <Button variant="outline" disabled>Vitrin sayfası</Button>
              )}
              {effectiveSlug ? (
                <Button className="sade-btn-primary gap-2 font-semibold" asChild>
                  <Link href={`/editor/giris?slug=${encodeURIComponent(effectiveSlug)}`}>
                  <Lock className="h-4 w-4" />
                  Editör girişi
                  <ArrowRight className="ml-auto h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button className="sade-btn-primary gap-2 font-semibold" disabled>
                  <Lock className="h-4 w-4" />
                  Editör girişi
                </Button>
              )}
            </div>

            <p className="text-center text-[11px] text-slate-500">
              Merkezi operasyon:{" "}
              <a href={portalCanonicalAdminPath("/admin/haber-siteleri")} className="font-medium text-red-600 hover:underline">
                Haber siteleri
              </a>{" "}
              ·{" "}
              <a href={portalCanonicalAdminPath("/admin")} className="font-medium text-red-600 hover:underline">
                Yönetim
              </a>
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
