import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Briefcase, Check, ExternalLink, Mail, Phone, RefreshCw } from "lucide-react";

interface CareerApplication {
  id: number;
  position_slug: string;
  position_title: string;
  full_name: string;
  email: string;
  phone: string;
  city: string | null;
  experience_years: string | null;
  cover_letter: string;
  cv_url: string | null;
  cv_file_name: string | null;
  is_read: boolean;
  status: string;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export default function KariyerBasvurulari() {
  const [applications, setApplications] = useState<CareerApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = useCallback(async (p = 1, unread = unreadOnly) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(p) });
      if (unread) qs.set("unread", "1");
      const r = await fetch(`/api/career/admin/applications?${qs.toString()}`);
      const data = (await r.json()) as {
        applications?: CareerApplication[];
        total?: number;
        page?: number;
      };
      setApplications(data.applications ?? []);
      setTotal(data.total ?? 0);
      setPage(data.page ?? p);
    } catch {
      setApplications([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  useEffect(() => {
    void load(1, unreadOnly);
  }, [load, unreadOnly]);

  const markRead = async (id: number) => {
    await fetch(`/api/career/admin/applications/${id}/read`, { method: "PATCH" });
    void load(page, unreadOnly);
  };

  const unreadCount = applications.filter((a) => !a.is_read).length;

  return (
    <AdminLayout title="Kariyer Başvuruları">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-emerald-700" />
              <h1 className="text-2xl font-bold text-gray-900">Kariyer başvuruları</h1>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {total} kayıt · <span className="font-mono text-xs">/kariyer</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={unreadOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setUnreadOnly((v) => !v)}
            >
              {unreadOnly ? "Tümünü göster" : `Okunmamış${unreadCount ? ` (${unreadCount})` : ""}`}
            </Button>
            <Button variant="outline" size="sm" onClick={() => void load(page)} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Yenile
            </Button>
          </div>
        </div>

        {loading && applications.length === 0 ? (
          <p className="py-12 text-center text-gray-500">Yükleniyor...</p>
        ) : applications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center text-gray-500">
            <Briefcase className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            Henüz başvuru yok. Adaylar <code className="rounded bg-white px-1 text-xs">/kariyer</code> sayfasından
            başvurabilir.
          </div>
        ) : (
          <ul className="space-y-3">
            {applications.map((app) => {
              const expanded = expandedId === app.id;
              return (
                <li
                  key={app.id}
                  className={`rounded-xl border p-4 ${
                    app.is_read ? "border-gray-100 bg-white" : "border-amber-200 bg-amber-50/80"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        className="text-left"
                        onClick={() => setExpandedId(expanded ? null : app.id)}
                      >
                        <span className="font-bold text-gray-900">{app.full_name}</span>
                        <span className="mx-2 text-gray-400">·</span>
                        <span className="text-sm text-gray-600">{app.position_title}</span>
                      </button>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                        <a href={`mailto:${app.email}`} className="inline-flex items-center gap-1 text-indigo-600 hover:underline">
                          <Mail className="h-3.5 w-3.5" />
                          {app.email}
                        </a>
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {app.phone}
                        </span>
                        {app.city ? <span>{app.city}</span> : null}
                        {app.experience_years ? <span>Deneyim: {app.experience_years}</span> : null}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-gray-400">{new Date(app.created_at).toLocaleString("tr-TR")}</span>
                      {!app.is_read ? (
                        <Button size="sm" variant="secondary" className="h-8" onClick={() => void markRead(app.id)}>
                          <Check className="mr-1 h-3.5 w-3.5" />
                          Okundu
                        </Button>
                      ) : (
                        <span className="text-xs font-medium text-green-700">İncelendi</span>
                      )}
                    </div>
                  </div>

                  {expanded ? (
                    <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ön yazı</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{app.cover_letter}</p>
                      </div>
                      {app.cv_url ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">CV</p>
                          <a
                            href={app.cv_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline"
                          >
                            {app.cv_file_name || "CV dosyasını aç"}
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      ) : null}
                      {app.review_note ? (
                        <p className="text-xs text-gray-500">Not: {app.review_note}</p>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {total > 30 ? (
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => void load(page - 1)}>
              Önceki
            </Button>
            <span className="self-center px-2 text-sm text-gray-600">
              Sayfa {page} / {Math.ceil(total / 30)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= Math.ceil(total / 30)}
              onClick={() => void load(page + 1)}
            >
              Sonraki
            </Button>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  );
}
