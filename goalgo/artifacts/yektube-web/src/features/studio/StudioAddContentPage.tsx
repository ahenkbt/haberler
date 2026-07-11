import { useMemo, useRef, useState } from "react";
import { Link, useSearch } from "wouter";
import { Film, Link2, Loader2, Upload } from "lucide-react";
import { videoPathSlug } from "@workspace/yektube-core";
import { CATEGORY_LABELS } from "@/lib/constants";
import { submitCreatorSource, uploadCreatorVideo } from "@/lib/memberApi";
import { ytRoutes } from "@/lib/routes";
import { YEKCEK_MAX_DURATION_SECONDS } from "@/lib/yektubeVideoClassify";
import { assertYekcekDuration, readVideoFileDurationSeconds } from "@/lib/videoFileDuration";
import { useMemberAuth } from "@/features/auth/MemberAuth";
import { cn } from "@/lib/cn";

type SourceType = "channel" | "playlist" | "live";
type AddMode = "upload" | "link";

const MAX_UPLOAD_MB = 100;

export function StudioAddContentPage() {
  const search = useSearch();
  const { member, ready } = useMemberAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const defaultType = useMemo((): SourceType => {
    const tur = new URLSearchParams(search).get("tur");
    if (tur === "canli") return "live";
    if (tur === "playlist") return "playlist";
    return "channel";
  }, [search]);

  const defaultMode = useMemo((): AddMode => {
    const tur = new URLSearchParams(search).get("tur");
    if (tur === "yukle" || tur === "yekcek") return "upload";
    return "link";
  }, [search]);

  const isYekcekMode = useMemo(() => new URLSearchParams(search).get("tur") === "yekcek", [search]);

  const [mode, setMode] = useState<AddMode>(defaultMode);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>(defaultType);
  const [categorySlug, setCategorySlug] = useState("eglence");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [channelName, setChannelName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [watchHref, setWatchHref] = useState("");

  if (!ready) {
    return <p className="p-8 text-center text-sm text-[var(--color-yt-muted)]">Yükleniyor…</p>;
  }

  if (!member) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-[var(--color-yt-muted)]">Oturum gerekli.</p>
        <Link href={ytRoutes.yeklive()} className="mt-2 inline-block text-sm font-medium underline">
          Yek Gönder'e dön
        </Link>
      </div>
    );
  }

  const linkTitle =
    sourceType === "live" ? "Canlı yayın başlat" : sourceType === "playlist" ? "Playlist ekle" : "Video veya kanal ekle";

  const uploadMode = isYekcekMode || mode === "upload";

  return (
    <div className="mx-auto max-w-lg p-6 lg:p-8">
      <Link href={ytRoutes.userStudio()} className="text-sm text-[var(--color-yt-muted)] hover:underline">
        ← Stüdyo
      </Link>
      <h1 className="mt-2 text-xl font-bold">{isYekcekMode ? "Yekçek yükle" : "İçerik ekle"}</h1>
      <p className="mt-1 text-sm text-[var(--color-yt-muted)]">
        {isYekcekMode
          ? `Dikey kısa video yükleyin (en fazla ${YEKCEK_MAX_DURATION_SECONDS / 60} dakika). Yayınlandıktan sonra Yekçek akışında görünür.`
          : "Videonuzu doğrudan yükleyin veya YouTube / Dailymotion bağlantısı gönderin."}
      </p>

      {!isYekcekMode ? (
      <div className="mt-4 flex gap-2 rounded-xl border border-[var(--color-yt-border)] p-1">
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            mode === "upload" ? "yt-nav-active" : "yt-panel-hover",
          )}
        >
          <Upload className="h-4 w-4" />
          Video yükle
        </button>
        <button
          type="button"
          onClick={() => setMode("link")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            mode === "link" ? "yt-nav-active" : "yt-panel-hover",
          )}
        >
          <Link2 className="h-4 w-4" />
          Bağlantı ekle
        </button>
      </div>
      ) : null}

      {ok ? (
        <div className="mt-6 rounded-xl border border-green-600/30 bg-green-600/10 px-4 py-3 text-sm">
          {uploadMode ? (
            <>
              Videonuz yayında!{" "}
              {watchHref ? (
                <Link href={watchHref} className="font-medium underline">
                  {isYekcekMode ? "Yekçek'te izle" : "İzle"}
                </Link>
              ) : (
                <Link href={ytRoutes.home()} className="font-medium underline">
                  Ana sayfa
                </Link>
              )}
            </>
          ) : (
            <>
              Kaydınız alındı! Moderasyon sonrası yayına alınacak.{" "}
              <Link href={ytRoutes.live()} className="font-medium underline">
                Canlı Yayın
              </Link>{" "}
              sayfasından takip edebilirsiniz.
            </>
          )}
        </div>
      ) : uploadMode ? (
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!file) {
              setErr("Video dosyası seçin.");
              return;
            }
            if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
              setErr(`Dosya en fazla ${MAX_UPLOAD_MB} MB olabilir.`);
              return;
            }
            setLoading(true);
            setErr("");
            void (async () => {
              try {
                let durationSeconds: number | undefined;
                if (isYekcekMode) {
                  durationSeconds = await readVideoFileDurationSeconds(file);
                  assertYekcekDuration(durationSeconds);
                }
                const fd = new FormData();
                fd.set("title", title.trim());
                fd.set("description", description.trim());
                fd.set("channelName", (channelName.trim() || member.firstName).slice(0, 120));
                fd.set("categorySlug", categorySlug);
                if (isYekcekMode) {
                  fd.set("yekcek", "1");
                  fd.set("durationSeconds", String(durationSeconds));
                }
                fd.set("video", file);
                const { video, sourceId } = await uploadCreatorVideo(fd);
                setOk(true);
                if (isYekcekMode) {
                  setWatchHref(`${ytRoutes.shorts()}?v=${encodeURIComponent(video.videoId)}`);
                } else {
                  const slug = videoPathSlug(video.title, video.videoId);
                  setWatchHref(
                    ytRoutes.watch(sourceId, slug, channelName || member.firstName, video.title),
                  );
                }
              } catch (ex) {
                setErr(ex instanceof Error ? ex.message : "Yükleme başarısız");
              } finally {
                setLoading(false);
              }
            })();
          }}
        >
          <label className="block text-sm font-medium">
            Video başlığı
            <input
              required
              className="mt-1 w-full rounded-xl border border-[var(--color-yt-border)] bg-transparent px-3 py-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Videonuzun adı"
            />
          </label>
          <label className="block text-sm font-medium">
            Kanal adı
            <input
              className="mt-1 w-full rounded-xl border border-[var(--color-yt-border)] bg-transparent px-3 py-2 text-sm"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder={member.firstName}
            />
          </label>
          <label className="block text-sm font-medium">
            Açıklama
            <textarea
              rows={3}
              className="mt-1 w-full rounded-xl border border-[var(--color-yt-border)] bg-transparent px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="İsteğe bağlı"
            />
          </label>
          <label className="block text-sm font-medium">
            Kategori
            <select
              className="mt-1 w-full rounded-xl border border-[var(--color-yt-border)] bg-transparent px-2 py-2 text-sm"
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
            >
              {Object.entries(CATEGORY_LABELS).map(([slug, label]) => (
                <option key={slug} value={slug}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--color-yt-border)] px-4 py-8 yt-panel-hover"
            >
              <Film className="h-8 w-8 text-[var(--color-yt-muted)]" />
              {file ? (
                <span className="text-sm font-medium">{file.name}</span>
              ) : (
                <span className="text-sm text-[var(--color-yt-muted)]">MP4, WebM veya MOV seçin (en fazla {MAX_UPLOAD_MB} MB)</span>
              )}
            </button>
          </div>
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="yt-btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Videoyu yükle ve yayınla
          </button>
        </form>
      ) : (
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setLoading(true);
            setErr("");
            void submitCreatorSource({
              name: name.trim() || url.trim(),
              url: url.trim(),
              sourceType,
              categorySlug,
            })
              .then(() => setOk(true))
              .catch((ex: Error) => setErr(ex.message))
              .finally(() => setLoading(false));
          }}
        >
          <h2 className="text-sm font-semibold">{linkTitle}</h2>
          <p className="text-xs text-[var(--color-yt-muted)]">
            YouTube veya Dailymotion URL'si girin. İçerik onaylandıktan sonra yayında görünür.
          </p>
          <label className="block text-sm font-medium">
            Görünen ad
            <input
              className="mt-1 w-full rounded-xl border border-[var(--color-yt-border)] bg-transparent px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kanal veya yayın adı"
            />
          </label>
          <label className="block text-sm font-medium">
            Video / kanal URL
            <input
              required
              className="mt-1 w-full rounded-xl border border-[var(--color-yt-border)] bg-transparent px-3 py-2 text-sm"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/… veya https://dailymotion.com/…"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium">
              Tür
              <select
                className="mt-1 w-full rounded-xl border border-[var(--color-yt-border)] bg-transparent px-2 py-2 text-sm"
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as SourceType)}
              >
                <option value="channel">Kanal / Video</option>
                <option value="playlist">Playlist</option>
                <option value="live">Canlı</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Kategori
              <select
                className="mt-1 w-full rounded-xl border border-[var(--color-yt-border)] bg-transparent px-2 py-2 text-sm"
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
              >
                {Object.entries(CATEGORY_LABELS).map(([slug, label]) => (
                  <option key={slug} value={slug}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="yt-btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Gönder
          </button>
        </form>
      )}

      {mode === "upload" && !ok ? (
        <p className="mt-4 text-xs text-[var(--color-yt-muted)]">
          Canlı yayın için{" "}
          <Link href={ytRoutes.yekGonderBroadcast()} className="underline">
            Yek Gönder canlı yayın
          </Link>{" "}
          sayfasını kullanın.
        </p>
      ) : null}
    </div>
  );
}
