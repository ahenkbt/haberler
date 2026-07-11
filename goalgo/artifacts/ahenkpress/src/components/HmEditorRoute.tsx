import { Redirect } from "wouter";
import { useHmEditor } from "@/contexts/HmEditorContext";

/** Editör JWT yoksa veya sunucu oturumu reddettiyse giriş sayfasına yönlendirir. */
export function HmEditorRoute({ children }: { children: React.ReactNode }) {
  const { token, sessionStatus } = useHmEditor();

  if (sessionStatus === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Oturum doğrulanıyor…</p>
      </div>
    );
  }

  if (!token || sessionStatus === "denied") {
    if (typeof window !== "undefined") {
      const pathOnly = (window.location.pathname || "/").replace(/\/+$/, "") || "/";
      const full = window.location.pathname + window.location.search;
      if (pathOnly.startsWith("/editor") && pathOnly !== "/editor/giris" && pathOnly !== "/editor") {
        return <Redirect to={`/editor/giris?next=${encodeURIComponent(full)}`} />;
      }
    }
    return <Redirect to="/editor/giris" />;
  }

  return <>{children}</>;
}
