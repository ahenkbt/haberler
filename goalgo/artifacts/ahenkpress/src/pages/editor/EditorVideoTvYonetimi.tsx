import { Link } from "wouter";
import { useCallback, useEffect, useRef } from "react";
import { ExternalLink } from "lucide-react";
import { EditorLayout } from "@/components/EditorLayout";
import { VideoTvBrandLogo } from "@/components/VideoTvBrandLogo";
import { useHmEditor } from "@/contexts/HmEditorContext";
import { readHmJwt } from "@/lib/hmSession";
import { resolveHmNewsVideoTvEnabled } from "@/lib/newsSiteLayout";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";

/** Aynı origin — HM editör oturumu + /api çerezleri; middleware /yp/admin'a izin verir. */
const YEKTUBE_ADMIN_EMBED = "/yp/admin?embed=1";
const HM_EDITOR_JWT_POST_MESSAGE = "goalgo:hm-editor-jwt";

export default function EditorVideoTvYonetimi() {
  const { site, newsLayoutPrefs, token } = useHmEditor();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoTvEnabled = resolveHmNewsVideoTvEnabled(newsLayoutPrefs);
  const publicVideoTvHref = site?.slug
    ? `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(site.slug)}/video-tv`
    : null;

  const postJwtToIframe = useCallback(() => {
    const jwt = token ?? readHmJwt();
    const win = iframeRef.current?.contentWindow;
    if (!jwt || !win) return;
    win.postMessage({ type: HM_EDITOR_JWT_POST_MESSAGE, token: jwt }, window.location.origin);
  }, [token]);

  useEffect(() => {
    postJwtToIframe();
  }, [postJwtToIframe]);

  if (!videoTvEnabled) {
    return (
      <EditorLayout title="Video TV yönetimi">
        <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
          <p className="font-medium">Video TV bu sitede kapalı.</p>
          <p>
            Vitrin ayarlarından <strong>Video TV / Yektube</strong> seçeneğini açın; ardından kanal ve video
            yönetimine buradan erişebilirsiniz.
          </p>
          <Link href="/editor/vitrin" className="inline-flex font-semibold text-amber-900 underline">
            Vitrin ayarlarına git
          </Link>
        </div>
      </EditorLayout>
    );
  }

  return (
    <EditorLayout title="Video TV yönetimi">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <VideoTvBrandLogo className="h-11 w-auto max-w-[220px] object-contain object-left" />
          <div className="min-w-0 text-sm text-slate-600">
            <p className="font-medium text-slate-900">Video TV Studio — kanal, video ve senkron</p>
            <p className="mt-1">
              Aşağıdaki panel editör hesabınızla açılır. Zaten editör paneline giriş yaptıysanız otomatik yüklenir;
              aksi halde site e-posta ve şifrenizi kullanın.
            </p>
          </div>
        </div>
        {publicVideoTvHref ? (
          <Link
            href={publicVideoTvHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Video TV vitrini
            <ExternalLink className="h-4 w-4" />
          </Link>
        ) : null}
      </div>

      <iframe
        ref={iframeRef}
        title="Video TV yönetimi"
        src={YEKTUBE_ADMIN_EMBED}
        onLoad={postJwtToIframe}
        className="h-[min(78vh,calc(100dvh-14rem))] w-full rounded-xl border border-slate-200 bg-white shadow-sm"
        allow="clipboard-write"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </EditorLayout>
  );
}
