import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Loader2, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/apiBase";
import { callCenterWorkspaceUrl } from "@/lib/callCenterWorkspace";
import { YekpareAiCallLayout } from "./YekpareAiCallLayout";
import { Button } from "@/components/ui/button";

type GateResponse = {
  ok: boolean;
  reason?: string;
  workspaceAppPrefix?: string;
};

/** Abonelik doğrulaması sonrası tam çalışma alanına yönlendirir (iframe yok). */
export default function YekpareAiCallWorkspaceRedirect() {
  const [loc] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setChecking(true);
      setError(null);
      const subPath = loc.replace(/^\/admin\/yekpare-ai-call\/w\/?/, "") || "app";
      const target = callCenterWorkspaceUrl(subPath.startsWith("app") ? `/${subPath}` : `/app/${subPath}`);

      try {
        const res = await apiFetch("/api/call-center/workspace-gate");
        const data = (await res.json()) as GateResponse;
        if (cancelled) return;
        if (!res.ok || !data.ok) {
          const reason =
            data.reason === "subscription"
              ? "Yekpare AI Call aboneliği aktif değil."
              : data.reason === "not_configured"
                ? "AGENTLABS_URL yapılandırılmamış."
                : "Çalışma alanına erişim reddedildi.";
          setError(reason);
          setChecking(false);
          return;
        }
        window.location.replace(target);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Bağlantı hatası");
          setChecking(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [loc]);

  return (
    <YekpareAiCallLayout title="Çalışma alanı">
      <div className="rounded-xl border bg-white p-8 text-center max-w-md mx-auto">
        {checking ? (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-[#e61e25] mx-auto mb-4" />
            <p className="text-sm text-gray-600">Abonelik kontrol ediliyor, çalışma alanına yönlendiriliyorsunuz…</p>
          </>
        ) : error ? (
          <>
            <AlertCircle className="w-10 h-10 text-amber-600 mx-auto mb-4" />
            <p className="font-medium text-gray-900 mb-2">{error}</p>
            <p className="text-sm text-gray-500 mb-4">
              Aboneliği panelden etkinleştirin veya tanıtım sayfasından talep oluşturun.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link href="/admin/yekpare-ai-call">
                <Button type="button" className="bg-[#e61e25] hover:bg-[#c91920] w-full sm:w-auto">
                  Panele dön
                </Button>
              </Link>
              <Link href="/ai-cagri-merkezi">
                <Button type="button" variant="outline" className="w-full sm:w-auto">
                  Abonelik talebi
                </Button>
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </YekpareAiCallLayout>
  );
}
