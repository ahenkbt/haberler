import { useEffect, useState } from "react";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { hasLocalAdminAuthFlag, verifyAdminPanelSession } from "@/lib/apiBase";
import {
  getCachedAdminRouteVerification,
  setCachedAdminRouteVerification,
} from "@/lib/adminRouteAuthCache";

export function ProtectedAdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { markPanelAuthenticated, logout } = useAuth();
  const [status, setStatus] = useState<"checking" | "ok" | "denied">("checking");

  useEffect(() => {
    let cancelled = false;
    const cached = getCachedAdminRouteVerification();
    if (cached) {
      if (cached.result === "ok") {
        markPanelAuthenticated();
        setStatus("ok");
      } else {
        logout();
        setStatus("denied");
      }
      return () => {
        cancelled = true;
      };
    }

    void verifyAdminPanelSession()
      .then((result) => {
        if (cancelled) return;
        if (result === "ok") {
          markPanelAuthenticated();
          setCachedAdminRouteVerification("ok");
          setStatus("ok");
          return;
        }
        if (result === "transient" && hasLocalAdminAuthFlag()) {
          markPanelAuthenticated();
          setCachedAdminRouteVerification("ok");
          setStatus("ok");
          return;
        }
        setCachedAdminRouteVerification("denied");
        logout();
        setStatus("denied");
      });
    return () => {
      cancelled = true;
    };
  }, [logout, markPanelAuthenticated]);

  if (status === "checking") {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin" aria-hidden />
        <p className="text-sm">Oturum doğrulanıyor…</p>
      </div>
    );
  }
  if (status !== "ok") return <Redirect to="/admin/giris" />;
  return <Component />;
}
