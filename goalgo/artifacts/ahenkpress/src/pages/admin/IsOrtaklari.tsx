import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Briefcase, Check, X, Eye, Clock, ChevronDown, Phone, Mail, MapPin, RefreshCw } from "lucide-react";

interface Application {
  id: number; partnerType: string; firstName: string; lastName: string;
  email: string; phone: string; companyName: string; taxNumber: string;
  taxOffice?: string; address: string; city: string; district?: string;
  website?: string; description?: string; businessCategories?: string[];
  status: string; reviewNote?: string; emailVerified: boolean;
  createdAt: string; reviewedAt?: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Bekliyor", reviewing: "İnceleniyor", approved: "Onaylandı", rejected: "Reddedildi",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800", reviewing: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800", rejected: "bg-red-100 text-red-800",
};
const PARTNER_TYPE_LABELS: Record<string, string> = {
  sahis: "Şahıs Firması", limited: "Limited Şirket", anonim: "Anonim Şirket",
};

export default function IsOrtaklari() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [reviewModal, setReviewModal] = useState<Application | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    setLoading(true);
    let url = "/api/partners/admin/applications";
    if (statusFilter) url += `?status=${statusFilter}`;
    const d = await fetch(url).then(r => r.json()).catch(() => []);
    setApps(Array.isArray(d) ? d : []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [statusFilter]);

  const updateStatus = async (id: number, status: string) => {
    setProcessing(true);
    await fetch(`/api/partners/admin/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reviewNote }),
    });
    await load();
    setReviewModal(null);
    setReviewNote("");
    setProcessing(false);
  };

  const counts = {
    pending: apps.filter(a => a.status === "pending").length,
    reviewing: apps.filter(a => a.status === "reviewing").length,
    approved: apps.filter(a => a.status === "approved").length,
    rejected: apps.filter(a => a.status === "rejected").length,
  };

  return (
    <AdminLayout title="İş Ortağı Başvuruları">
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Briefcase className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">İş Ortağı Başvuruları</h1>
          </div>
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">
            <RefreshCw className="w-4 h-4" /> Yenile
          </button>
        </div>

        {/* Summary counts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {(["pending", "reviewing", "approved", "rejected"] as const).map(s => (
            <button key={s}
              onClick={() => setStatusFilter(statusFilter === s ? "" : s)}
              className={`rounded-xl border p-3 text-left transition ${statusFilter === s ? "border-blue-500 bg-blue-50" : "bg-white hover:bg-gray-50"}`}
            >
              <div className={`text-2xl font-black ${s === "pending" ? "text-amber-600" : s === "approved" ? "text-green-600" : s === "rejected" ? "text-red-600" : "text-blue-600"}`}>
                {counts[s]}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{STATUS_LABELS[s]}</div>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : apps.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Başvuru bulunamadı.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {apps.map(app => {
              const isExpanded = expanded === app.id;
              return (
                <div key={app.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                  <div
                    className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpanded(isExpanded ? null : app.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900">{app.firstName} {app.lastName}</div>
                      <div className="text-sm text-gray-500">{app.companyName} · {PARTNER_TYPE_LABELS[app.partnerType] ?? app.partnerType}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!app.emailVerified && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">E-posta doğrulanmamış</span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[app.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABELS[app.status] ?? app.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 hidden sm:block">
                      {new Date(app.createdAt).toLocaleDateString("tr-TR")}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </div>

                  {isExpanded && (
                    <div className="border-t px-4 py-4 bg-gray-50 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-start gap-2">
                          <Mail className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                          <div>
                            <div className="text-gray-500 text-xs">E-posta</div>
                            <a href={`mailto:${app.email}`} className="text-blue-600">{app.email}</a>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Phone className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                          <div>
                            <div className="text-gray-500 text-xs">Telefon</div>
                            <a href={`tel:${app.phone}`} className="text-blue-600">{app.phone}</a>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                          <div>
                            <div className="text-gray-500 text-xs">Adres</div>
                            <p className="text-gray-800">{app.address}, {app.district} {app.city}</p>
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs">Vergi No / Dairesi</div>
                          <p className="text-gray-800">{app.taxNumber} / {app.taxOffice ?? "—"}</p>
                        </div>
                        {app.website && (
                          <div>
                            <div className="text-gray-500 text-xs">Web Sitesi</div>
                            <a href={app.website} target="_blank" rel="noopener" className="text-blue-600 hover:underline">{app.website}</a>
                          </div>
                        )}
                        {app.businessCategories && app.businessCategories.length > 0 && (
                          <div>
                            <div className="text-gray-500 text-xs">Faaliyet Alanları</div>
                            <p className="text-gray-800">{app.businessCategories.join(", ")}</p>
                          </div>
                        )}
                      </div>
                      {app.description && (
                        <div className="bg-white border rounded-lg p-3 text-sm text-gray-700">{app.description}</div>
                      )}
                      {app.reviewNote && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                          <strong>İnceleme Notu:</strong> {app.reviewNote}
                        </div>
                      )}

                      {/* Action buttons */}
                      {app.status !== "approved" && app.status !== "rejected" && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => { setReviewModal(app); setReviewNote(""); }}
                            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
                          >
                            <Eye className="w-4 h-4" /> İncele / Karar Ver
                          </button>
                          {app.status === "pending" && (
                            <button
                              onClick={() => updateStatus(app.id, "reviewing")}
                              className="flex items-center gap-1.5 px-3 py-2 border border-blue-300 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-50 transition"
                            >
                              <Clock className="w-4 h-4" /> İncelemeye Al
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Başvuru Kararı</h2>
              <button onClick={() => setReviewModal(null)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              <strong>{reviewModal.firstName} {reviewModal.lastName}</strong> — {reviewModal.companyName}
            </p>
            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-500 block mb-1">Karar Notu (isteğe bağlı)</label>
              <textarea
                value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
                rows={3}
                placeholder="Başvuru sahibine gösterilecek not..."
                className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => updateStatus(reviewModal.id, "approved")}
                disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 transition disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> Onayla
              </button>
              <button
                onClick={() => updateStatus(reviewModal.id, "rejected")}
                disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition disabled:opacity-50"
              >
                <X className="w-4 h-4" /> Reddet
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
