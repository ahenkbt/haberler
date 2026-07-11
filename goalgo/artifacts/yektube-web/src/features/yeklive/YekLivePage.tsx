import { Link } from "wouter";
import { Clapperboard, ListVideo, Radio, Upload, Video } from "lucide-react";
import { ytRoutes } from "@/lib/routes";
import { useMemberAuth } from "@/features/auth/MemberAuth";
import { MemberAuthPanel } from "@/features/auth/MemberAuthPanel";
import { useState } from "react";

const actions = [
  {
    href: () => ytRoutes.studioAdd({ upload: true }),
    label: "Video yükle",
    desc: "MP4 veya WebM dosyanızı doğrudan Yektube'de yayınlayın",
    icon: Upload,
    color: "bg-emerald-600/10 text-emerald-600",
  },
  {
    href: () => `${ytRoutes.yeklive()}/yayin`,
    label: "Canlı yayın başlat",
    desc: "Kamera ve mikrofonunuzdan doğrudan Yektube'de yayın yapın",
    icon: Radio,
    color: "bg-red-600/10 text-red-600",
  },
  {
    href: () => ytRoutes.studioAdd(),
    label: "Bağlantı ekle",
    desc: "YouTube veya Dailymotion kanalı / videosu bağlayın",
    icon: Upload,
    color: "bg-blue-600/10 text-blue-600",
  },
  {
    href: () => ytRoutes.studioAdd({ playlist: true }),
    label: "Oynatma listesi içe aktar",
    desc: "YouTube playlist URL'si ile toplu video ekleyin",
    icon: ListVideo,
    color: "bg-purple-600/10 text-purple-600",
  },
  {
    href: () => ytRoutes.shorts(),
    label: "Yekçek yükle",
    desc: "Kısa dikey videolarınızı paylaşın (yakında)",
    icon: Clapperboard,
    color: "bg-orange-600/10 text-orange-600",
    soon: true as const,
  },
] as const;

export function YekLivePage() {
  const { member, ready, login, register } = useMemberAuth();
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  return (
    <div className="min-h-full px-4 py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-white">
            <Video className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold">Yek Gönder</h1>
            <p className="text-sm text-[var(--color-yt-muted)]">
              Canlı yayın aç, video yükle veya kanal bağla
            </p>
          </div>
        </div>

        {!ready ? (
          <p className="mt-8 text-center text-sm text-[var(--color-yt-muted)]">Yükleniyor…</p>
        ) : !member ? (
          <div className="mt-8 rounded-2xl border border-[var(--color-yt-border)] yt-panel p-4 lg:p-6">
            <p className="mb-4 text-sm text-[var(--color-yt-muted)]">
              Canlı yayın veya içerik eklemek için Yekpare hesabınızla giriş yapın.
            </p>
            <MemberAuthPanel mode={authMode} onModeChange={setAuthMode} onLogin={login} onRegister={register} />
          </div>
        ) : (
          <>
            <p className="mt-4 text-sm text-[var(--color-yt-muted)]">
              Hoş geldin, {member.firstName}! İçeriklerinizi{" "}
              <Link href={ytRoutes.userStudio()} className="font-medium underline">
                Stüdyo
              </Link>
              'dan yönetebilirsiniz.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {actions.map((item) => {
                const { href, label, desc, icon: Icon, color } = item;
                const soon = "soon" in item && item.soon;
                return soon ? (
                  <div
                    key={label}
                    className="flex items-start gap-4 rounded-2xl border border-dashed border-[var(--color-yt-border)] p-4 opacity-60"
                  >
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold">{label}</p>
                      <p className="mt-0.5 text-xs text-[var(--color-yt-muted)]">{desc}</p>
                      <span className="mt-2 inline-block rounded-full bg-[var(--color-yt-chip)] px-2 py-0.5 text-[10px] font-bold">
                        YAKINDA
                      </span>
                    </div>
                  </div>
                ) : (
                  <Link
                    key={label}
                    href={href()}
                    className="flex items-start gap-4 rounded-2xl border border-[var(--color-yt-border)] p-4 yt-panel-hover"
                  >
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold">{label}</p>
                      <p className="mt-0.5 text-xs text-[var(--color-yt-muted)]">{desc}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
            <div className="mt-6 rounded-xl border border-[var(--color-yt-border)] bg-[var(--color-yt-chip)] px-4 py-3 text-sm text-[var(--color-yt-muted)]">
              TV canlı yayınlarını izlemek için{" "}
              <Link href={ytRoutes.live()} className="font-medium text-[var(--color-yt-text)] underline">
                Canlı Yayın
              </Link>{" "}
              sayfasına gidin.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
