import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { fetchHmSiteEditors } from "@/lib/adminApi";
import { isAdminEmbedLight } from "./adminEmbedTheme";
import { useAdminAuth } from "./AdminAuth";
import { AdminCard, AdminPageHeader } from "./ui/adminUi";

export function AdminEditorsPage() {
  const embedLight = isAdminEmbedLight();
  const { fullAdmin } = useAdminAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["hm-site-editors"],
    queryFn: fetchHmSiteEditors,
    enabled: embedLight,
    retry: false,
  });

  const platformAdminHref =
    typeof window !== "undefined" ? `${window.location.origin}/admin/haber-siteleri` : "/admin/haber-siteleri";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminPageHeader
        title="Editörler"
        description={
          embedLight
            ? "Bu haber sitesine bağlı editör hesapları. Yeni editör ve şifre işlemleri Haber Merkezi yönetiminden yapılır."
            : "Platform genelinde haber sitesi editörleri Haber Siteleri panelinden yönetilir."
        }
      />

      {fullAdmin && !embedLight ? (
        <AdminCard title="Haber Merkezi editörleri">
          <p className="mb-4 text-sm text-zinc-500">
            Yektube Studio kanal/video yönetimidir. Site editör hesapları (e-posta, şifre) ayrı paneldedir.
          </p>
          <a
            href={platformAdminHref}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            <Users className="h-4 w-4" />
            Haber siteleri & editörler
          </a>
        </AdminCard>
      ) : null}

      {embedLight ? (
        <AdminCard title="Site editörleri">
          {isLoading ? <p className="text-sm text-zinc-500">Yükleniyor…</p> : null}
          {error ? (
            <p className="text-sm text-amber-700">Editör listesi alınamadı. Editör paneline giriş yaptığınızdan emin olun.</p>
          ) : null}
          {data?.items?.length ? (
            <ul className="divide-y divide-slate-200">
              {data.items.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div>
                    <p className="font-medium text-zinc-900">{e.displayName?.trim() || e.email}</p>
                    <p className="text-zinc-500">{e.email}</p>
                  </div>
                  <span
                    className={
                      e.isActive
                        ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                        : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                    }
                  >
                    {e.isActive ? "Aktif" : "Pasif"}
                  </span>
                </li>
              ))}
            </ul>
          ) : !isLoading && !error ? (
            <p className="text-sm text-zinc-500">Kayıtlı editör bulunamadı.</p>
          ) : null}
          <p className="mt-4 text-xs text-zinc-500">
            Yeni editör eklemek veya şifre sıfırlamak için platform yöneticinize başvurun veya{" "}
            <a href={platformAdminHref} className="font-medium text-red-600 underline">
              Haber siteleri
            </a>{" "}
            panelini kullanın.
          </p>
        </AdminCard>
      ) : null}
    </div>
  );
}
