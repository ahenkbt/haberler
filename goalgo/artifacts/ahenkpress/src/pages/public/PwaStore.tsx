import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiUrl, resolveClientMediaSrc } from "@/lib/apiBase";
import { PWA_STORE_NAME, PWA_STORE_TAGLINE } from "@/lib/portalBrand";

type StorePayload = {
  portalOrigin: string;
  yekpare: { displayName: string; tagline: string; icon: string; installQuery: string };
  hmSites: Array<{ id: number; slug: string; displayName: string; domain: string | null; icon: string; installQuery: string }>;
  businesses: Array<{ slug: string; name: string; icon: string; installQuery: string }>;
};

function AppTile({
  href,
  icon,
  title,
  subtitle,
  badge,
}: {
  href: string;
  icon: string;
  title: string;
  subtitle: string;
  badge?: string;
}) {
  const src = icon ? resolveClientMediaSrc(icon) : "";
  return (
    <Link
      href={href}
      className="flex gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm transition hover:border-green-300 hover:shadow-md active:scale-[0.99]"
    >
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-gray-100">
        {src ? (
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-lg">📱</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-black text-gray-900">{title}</p>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-gray-500">{subtitle}</p>
        {badge ? <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-green-600">{badge}</p> : null}
      </div>
      <div className="flex shrink-0 flex-col items-end justify-center gap-1">
        <span className="rounded-full bg-green-600 px-2.5 py-1 text-[10px] font-black text-white">İndir</span>
      </div>
    </Link>
  );
}

export default function PwaStore() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/hm/pwa-store"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/hm/pwa-store"));
      if (!r.ok) throw new Error(await r.text());
      return (await r.json()) as StorePayload;
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white">
      <div className="sticky top-0 z-40 border-b border-white/10 bg-slate-900/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <Link href="/" className="rounded-full p-2 text-white/80 hover:bg-white/10">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-black tracking-tight">{PWA_STORE_NAME}</h1>
            <p className="truncate text-[10px] text-white/50">{PWA_STORE_TAGLINE}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6">
        {isLoading ? <p className="py-16 text-center text-sm text-white/60">Mağaza yükleniyor…</p> : null}
        {isError ? (
          <p className="py-16 text-center text-sm text-red-300">Mağaza listesi alınamadı. Bir süre sonra tekrar deneyin.</p>
        ) : null}
        {data ? (
          <div className="space-y-8">
            <section>
              <h2 className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-green-400">Öne çıkan</h2>
              <AppTile
                href={`/uygulamayi-indir?${data.yekpare.installQuery}`}
                icon={data.yekpare.icon}
                title={data.yekpare.displayName}
                subtitle={data.yekpare.tagline}
                badge="Arama motoru"
              />
            </section>

            <section>
              <h2 className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-green-400">Haber siteleri</h2>
              <div className="space-y-2">
                {data.hmSites.length === 0 ? (
                  <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-4 text-sm text-white/60">Kayıtlı haber sitesi yok.</p>
                ) : (
                  data.hmSites.map((s) => (
                    <AppTile
                      key={s.id}
                      href={`/uygulamayi-indir?${s.installQuery}`}
                      icon={s.icon}
                      title={s.displayName}
                      subtitle={s.domain ? s.domain : `/${s.slug}`}
                      badge="Haber merkezi"
                    />
                  ))
                )}
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-green-400">
                Servis sağlayıcı ve Keşfet PWA
              </h2>
              <p className="mb-3 text-[11px] leading-relaxed text-white/50">
                Kart, ilgili işletmenin{" "}
                <strong className="text-white/70">PWA indir ve ana ekrana ekleme</strong> sayfasına gider (
                <code className="rounded bg-white/10 px-1">/uygulamayi-indir?kesfet=…</code>).
              </p>
              <div className="space-y-2">
                {data.businesses.length === 0 ? (
                  <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-4 text-sm text-white/60">Keşfet işletmesi yok.</p>
                ) : (
                  data.businesses.map((b) => (
                    <AppTile
                      key={b.slug}
                      href={`/uygulamayi-indir?${b.installQuery}`}
                      icon={b.icon}
                      title={b.name}
                      subtitle={`Servis sağlayıcı PWA · /kesfet/${b.slug}`}
                      badge="PWA indir sayfası"
                    />
                  ))
                )}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
