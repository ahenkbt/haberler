import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Eye, Film, Loader2, PlusCircle, Radio, Upload, Users } from "lucide-react";
import { ytRoutes } from "@/lib/routes";
import { useMemberAuth } from "@/features/auth/MemberAuth";
import { MemberAuthPanel } from "@/features/auth/MemberAuthPanel";
import { fetchCreatorAnalytics, fetchCreatorSubmissions, type CreatorSubmission } from "@/lib/memberApi";
import { categoryLabel } from "@/lib/constants";
import { useState } from "react";

function submissionStatusLabel(item: CreatorSubmission): string {
  if (item.status === "pending") return "Moderasyonda";
  if (item.kind === "upload") return "Yayında";
  return "Onaylandı";
}

function submissionKindLabel(kind: CreatorSubmission["kind"]): string {
  if (kind === "upload") return "Video yükleme";
  if (kind === "live") return "Canlı yayın";
  if (kind === "playlist") return "Oynatma listesi";
  return "Bağlantı";
}

function formatSubmittedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function UserStudioDashboard() {
  const { member, ready, login, register } = useMemberAuth();
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const { data: submissions = [], isLoading: submissionsLoading } = useQuery({
    queryKey: ["creator-submissions"],
    queryFn: fetchCreatorSubmissions,
    enabled: Boolean(member),
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["creator-analytics"],
    queryFn: fetchCreatorAnalytics,
    enabled: Boolean(member),
  });

  if (!ready) {
    return <p className="p-8 text-center text-sm text-[var(--color-yt-muted)]">Yükleniyor…</p>;
  }

  if (!member) {
    return (
      <div className="mx-auto max-w-md p-6">
        <h1 className="text-xl font-bold">Yek Gönder Stüdyo</h1>
        <p className="mt-2 text-sm text-[var(--color-yt-muted)]">Devam etmek için oturum açın.</p>
        <div className="mt-6">
          <MemberAuthPanel mode={authMode} onModeChange={setAuthMode} onLogin={login} onRegister={register} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6 lg:p-8">
      <h1 className="text-2xl font-bold">Merhaba, {member.firstName}</h1>
      <p className="mt-1 text-sm text-[var(--color-yt-muted)]">Kanal ve videolarınızı buradan yönetin.</p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Özet</h2>
        {analyticsLoading ? (
          <div className="mt-4 flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-yt-muted)]" />
          </div>
        ) : analytics ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[var(--color-yt-border)] p-4 yt-panel">
              <div className="flex items-center gap-2 text-[var(--color-yt-muted)]">
                <Film className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Yayında</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{analytics.publishedCount}</p>
              <p className="text-xs text-[var(--color-yt-muted)]">{analytics.videoCount} toplam video</p>
            </div>
            <div className="rounded-xl border border-[var(--color-yt-border)] p-4 yt-panel">
              <div className="flex items-center gap-2 text-[var(--color-yt-muted)]">
                <Eye className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Görüntülenme</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{analytics.totalViews.toLocaleString("tr-TR")}</p>
              <p className="text-xs text-[var(--color-yt-muted)]">İzleme geçmişi kayıtları</p>
            </div>
            <div className="rounded-xl border border-[var(--color-yt-border)] p-4 yt-panel">
              <div className="flex items-center gap-2 text-[var(--color-yt-muted)]">
                <Users className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Abone</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{analytics.subscriberCount.toLocaleString("tr-TR")}</p>
              <p className="text-xs text-[var(--color-yt-muted)]">
                {analytics.hasChannel ? "Kanalınıza abone olanlar" : "Henüz kanal yok"}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--color-yt-border)] p-4 yt-panel">
              <div className="flex items-center gap-2 text-[var(--color-yt-muted)]">
                <Loader2 className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">Bekleyen</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{analytics.pendingLinks + analytics.pendingUploads}</p>
              <p className="text-xs text-[var(--color-yt-muted)]">
                {analytics.pendingLinks} bağlantı · {analytics.pendingUploads} yükleme
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href={ytRoutes.studioAdd({ upload: true })}
          className="flex flex-col items-center rounded-2xl border border-[var(--color-yt-border)] p-6 text-center yt-panel-hover"
        >
          <Film className="mb-2 h-8 w-8 text-emerald-600" />
          <span className="font-semibold">Video yükle</span>
          <span className="mt-1 text-xs text-[var(--color-yt-muted)]">MP4 / WebM yayınla</span>
        </Link>
        <Link
          href={ytRoutes.studioAdd()}
          className="flex flex-col items-center rounded-2xl border border-[var(--color-yt-border)] p-6 text-center yt-panel-hover"
        >
          <Upload className="mb-2 h-8 w-8 text-blue-600" />
          <span className="font-semibold">Bağlantı ekle</span>
          <span className="mt-1 text-xs text-[var(--color-yt-muted)]">YouTube / Dailymotion</span>
        </Link>
        <Link
          href={ytRoutes.studioAdd({ live: true })}
          className="flex flex-col items-center rounded-2xl border border-[var(--color-yt-border)] p-6 text-center yt-panel-hover"
        >
          <Radio className="mb-2 h-8 w-8 text-red-600" />
          <span className="font-semibold">Canlı yayın</span>
          <span className="mt-1 text-xs text-[var(--color-yt-muted)]">Yayına başla</span>
        </Link>
        <Link
          href={ytRoutes.userPanel()}
          className="flex flex-col items-center rounded-2xl border border-[var(--color-yt-border)] p-6 text-center yt-panel-hover"
        >
          <PlusCircle className="mb-2 h-8 w-8" />
          <span className="font-semibold">Hesabım</span>
          <span className="mt-1 text-xs text-[var(--color-yt-muted)]">Geçmiş & listeler</span>
        </Link>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Gönderilerim</h2>
        <p className="mt-1 text-sm text-[var(--color-yt-muted)]">
          Eklediğiniz bağlantılar moderasyon sonrası yayına alınır; yüklediğiniz videolar doğrudan kanalınızda listelenir.
        </p>
        {submissionsLoading ? (
          <div className="mt-4 flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-yt-muted)]" />
          </div>
        ) : submissions.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-[var(--color-yt-border)] px-4 py-8 text-center text-sm text-[var(--color-yt-muted)]">
            Henüz gönderi yok. Video yükleyin veya kanal bağlantısı ekleyin.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--color-yt-border)] rounded-xl border border-[var(--color-yt-border)] yt-panel">
            {submissions.map((item) => (
              <li key={`${item.kind}-${item.sourceId}-${item.videoId ?? "s"}`} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--color-yt-muted)]">
                    {submissionKindLabel(item.kind)} · {categoryLabel(item.categorySlug)} · {formatSubmittedAt(item.createdAt)}
                  </p>
                  {item.url ? (
                    <p className="mt-1 truncate text-xs text-[var(--color-yt-muted)]">{item.url}</p>
                  ) : null}
                </div>
                <span
                  className={`shrink-0 self-start rounded-full px-3 py-1 text-xs font-semibold sm:self-center ${
                    item.status === "pending"
                      ? "bg-amber-100 text-amber-900"
                      : "bg-emerald-100 text-emerald-900"
                  }`}
                >
                  {submissionStatusLabel(item)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 rounded-xl border border-[var(--color-yt-border)] bg-[var(--color-yt-chip)] px-4 py-3 text-sm text-[var(--color-yt-muted)]">
        Eklediğiniz içerikler moderasyon sonrası yayına alınır. Yönetici iseniz{" "}
        <Link href={ytRoutes.admin()} className="underline">
          Yektube Yönetim Studio
        </Link>
        'ya da gidebilirsiniz.
      </p>
    </div>
  );
}
