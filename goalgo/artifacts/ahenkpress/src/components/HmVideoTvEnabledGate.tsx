import type { ReactNode } from "react";
import { Link } from "wouter";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { resolveHmNewsVideoTvEnabled } from "@/lib/newsSiteLayout";

/** Video TV kapalıysa bilgi mesajı; açıksa çocukları render eder. */
export function HmVideoTvEnabledGate({ children }: { children: ReactNode }) {
  const ctx = useHmPublicLinkContextOptional();
  const enabled = resolveHmNewsVideoTvEnabled(ctx?.layoutPrefs);

  if (!ctx || !enabled) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 text-center text-sm text-slate-600">
        <p className="font-medium text-slate-800">Video TV bu sitede devre dışı.</p>
        <p className="max-w-md text-slate-500">
          Editör panelinde <strong>Vitrin ayarları</strong> bölümünden &quot;Video TV / Yektube&quot; seçeneğini açın ve kaydedin.
        </p>
        <Link href="/editor/vitrin" className="text-sm font-semibold text-slate-800 underline">
          Vitrin ayarlarına git
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
