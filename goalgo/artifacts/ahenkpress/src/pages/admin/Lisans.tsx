import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { apiRequest, asArray } from "@/lib/queryClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck, Plus, Search, RefreshCw, Trash2, Edit2,
  CheckCircle2, XCircle, Clock, AlertCircle, Copy, Eye, EyeOff,
  Download, Package, Globe, Calendar, User, Phone, CreditCard,
  BadgeCheck, Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

type License = {
  id: number;
  customerName: string;
  customerEmail: string;
  phone?: string;
  domain?: string;
  activationCode: string;
  status: "pending" | "active" | "suspended" | "expired";
  plan: string;
  price?: number;
  paymentMethod?: string;
  paymentStatus: string;
  notes?: string;
  activatedAt?: string;
  expiresAt?: string;
  createdAt?: string;
};

const plans = [
  { value: "starter",    label: "Starter",    price: 1499 },
  { value: "pro",        label: "Pro",         price: 2999 },
  { value: "enterprise", label: "Enterprise",  price: 4999 },
];

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  active:    { label: "Aktif",      color: "bg-green-100 text-green-700 border-green-200",  icon: CheckCircle2 },
  pending:   { label: "Bekliyor",   color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Clock },
  suspended: { label: "Askıya Alındı", color: "bg-red-100 text-red-700 border-red-200",    icon: XCircle },
  expired:   { label: "Süresi Doldu",  color: "bg-gray-100 text-gray-600 border-gray-200",  icon: AlertCircle },
};

const payStatusConfig: Record<string, { label: string; color: string }> = {
  paid:    { label: "Ödendi",   color: "bg-green-100 text-green-700 border-green-200" },
  pending: { label: "Bekliyor", color: "bg-orange-100 text-orange-700 border-orange-200" },
};

function useLicenses(q?: string) {
  return useQuery<License[]>({
    queryKey: ["licenses", q],
    queryFn: () => apiRequest(`/api/licenses${q ? `?q=${encodeURIComponent(q)}` : ""}`).then(asArray),
  });
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="ml-1 text-gray-400 hover:text-gray-700 transition-colors"
      title="Kopyala"
    >
      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ─── Yeni / Düzenle Modal ─────────────────────────────────────────────────────
function LicenseModal({ license, onClose }: { license?: License; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    customerName:  license?.customerName  ?? "",
    customerEmail: license?.customerEmail ?? "",
    phone:         license?.phone         ?? "",
    domain:        license?.domain        ?? "",
    plan:          license?.plan          ?? "pro",
    price:         license?.price?.toString() ?? "",
    paymentMethod: license?.paymentMethod ?? "bank",
    paymentStatus: license?.paymentStatus ?? "pending",
    status:        license?.status        ?? "pending",
    notes:         license?.notes         ?? "",
    expiresAt:     license?.expiresAt ? license.expiresAt.split("T")[0] : "",
  });

  const saveMut = useMutation({
    mutationFn: (data: typeof form) =>
      license
        ? apiRequest(`/api/licenses/${license.id}`, { method: "PUT", body: JSON.stringify(data) })
        : apiRequest("/api/licenses", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["licenses"] }); onClose(); },
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const isBusy = saveMut.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="font-bold text-lg text-gray-900">
            {license ? "Lisans Düzenle" : "Yeni Lisans Oluştur"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Müşteri Adı *</label>
              <Input value={form.customerName} onChange={(e) => set("customerName", e.target.value)} placeholder="Ahmet Yılmaz" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-posta *</label>
              <Input type="email" value={form.customerEmail} onChange={(e) => set("customerEmail", e.target.value)} placeholder="musteri@mail.com" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefon</label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+90 555 000 00 00" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Domain</label>
              <Input value={form.domain} onChange={(e) => set("domain", e.target.value)} placeholder="siteadi.com" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Plan</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.plan} onChange={(e) => { set("plan", e.target.value); set("price", plans.find(p => p.value === e.target.value)?.price.toString() ?? ""); }}>
                {plans.map(p => <option key={p.value} value={p.value}>{p.label} — ₺{p.price.toLocaleString("tr-TR")}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fiyat (₺)</label>
              <Input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="2999" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Geçerlilik</label>
              <Input type="date" value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ödeme Yöntemi</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)}>
                <option value="bank">Banka Havalesi</option>
                <option value="stripe">Stripe</option>
                <option value="other">Diğer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ödeme Durumu</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.paymentStatus} onChange={(e) => set("paymentStatus", e.target.value)}>
                <option value="pending">Bekliyor</option>
                <option value="paid">Ödendi</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Lisans Durumu</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="pending">Bekliyor</option>
                <option value="active">Aktif</option>
                <option value="suspended">Askıya Al</option>
                <option value="expired">Süresi Doldu</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notlar</label>
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm resize-none h-20" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="İç notlar..." />
          </div>

          {saveMut.isError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2">
              Hata oluştu. Lütfen tekrar deneyin.
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button onClick={() => saveMut.mutate(form)} disabled={isBusy || !form.customerName || !form.customerEmail} className="flex-1 bg-[#e61e25] hover:bg-[#c9181e] text-white">
              {isBusy ? "Kaydediliyor..." : license ? "Güncelle" : "Lisans Oluştur"}
            </Button>
            <Button variant="outline" onClick={onClose}>İptal</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────
export default function Lisans() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<License | null>(null);
  const [showCodes, setShowCodes] = useState<Record<number, boolean>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const { data: licenses, isLoading, refetch } = useLicenses(search || undefined);

  const regenerateMut = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/licenses/${id}/regenerate-code`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["licenses"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/licenses/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["licenses"] }); setDeleteConfirm(null); },
  });

  const activateMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest(`/api/licenses/${id}`, { method: "PUT", body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["licenses"] }),
  });

  // Stats
  const all = asArray(licenses);
  const activeCount    = all.filter(l => l.status === "active").length;
  const pendingCount   = all.filter(l => l.status === "pending").length;
  const paidCount      = all.filter(l => l.paymentStatus === "paid").length;
  const totalRevenue   = all.filter(l => l.paymentStatus === "paid").reduce((sum, l) => sum + (l.price ?? 0), 0);

  return (
    <AdminLayout title="Lisans Yönetimi">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Toplam Lisans", value: all.length, icon: Package,      color: "text-blue-600",  bg: "bg-blue-50" },
            { label: "Aktif",         value: activeCount, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
            { label: "Bekleyen",      value: pendingCount,icon: Clock,        color: "text-orange-600",bg: "bg-orange-50" },
            { label: "Toplam Gelir",  value: `₺${totalRevenue.toLocaleString("tr-TR")}`, icon: CreditCard, color: "text-purple-600", bg: "bg-purple-50" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white border rounded-xl p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <div className="text-xl font-black text-gray-900">{value}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Ad, e-posta, domain veya kod ara..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setSearch(q)}
              />
            </div>
            <Button variant="outline" onClick={() => setSearch(q)} size="icon"><Search className="w-4 h-4" /></Button>
            {search && <Button variant="ghost" onClick={() => { setQ(""); setSearch(""); }} size="sm">Temizle</Button>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-1" /> Yenile
            </Button>
            <Button className="bg-[#e61e25] hover:bg-[#c9181e] text-white" size="sm" onClick={() => { setSelected(null); setModal("create"); }}>
              <Plus className="w-4 h-4 mr-1" /> Yeni Lisans
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="py-16 text-center text-gray-400">Yükleniyor...</div>
          ) : !all.length ? (
            <div className="py-16 text-center text-gray-400 flex flex-col items-center gap-3">
              <Package className="w-10 h-10 text-gray-200" />
              <div className="font-medium">{search ? "Sonuç bulunamadı" : "Henüz lisans oluşturulmamış"}</div>
              {!search && (
                <Button className="bg-[#e61e25] hover:bg-[#c9181e] text-white mt-2" size="sm" onClick={() => { setSelected(null); setModal("create"); }}>
                  <Plus className="w-4 h-4 mr-1" /> İlk Lisansı Oluştur
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {["Müşteri", "Plan", "Domain", "Aktivasyon Kodu", "Ödeme", "Durum", "Geçerlilik", "İşlemler"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {all.map((lic) => {
                    const sc = statusConfig[lic.status] ?? statusConfig.pending;
                    const StatusIcon = sc.icon;
                    const pc = payStatusConfig[lic.paymentStatus] ?? payStatusConfig.pending;
                    const isCodeVisible = showCodes[lic.id];

                    return (
                      <tr key={lic.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{lic.customerName}</div>
                          <div className="text-xs text-gray-500">{lic.customerEmail}</div>
                          {lic.phone && <div className="text-xs text-gray-400">{lic.phone}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {plans.find(p => p.value === lic.plan)?.label ?? lic.plan}
                          </span>
                          {lic.price ? <div className="text-xs text-gray-500 mt-0.5">₺{lic.price.toLocaleString("tr-TR")}</div> : null}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{lic.domain || <span className="text-gray-300">—</span>}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <code className={`text-xs font-mono ${isCodeVisible ? "text-gray-900" : "text-gray-300 select-none"}`}>
                              {isCodeVisible ? lic.activationCode : "AP-••••••-••••••-••••••"}
                            </code>
                            <button onClick={() => setShowCodes(p => ({ ...p, [lic.id]: !p[lic.id] }))} className="text-gray-400 hover:text-gray-700 ml-1">
                              {isCodeVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            {isCodeVisible && <CopyBtn text={lic.activationCode} />}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${pc.color}`}>
                            {pc.label}
                          </span>
                          {lic.paymentMethod && <div className="text-xs text-gray-400 mt-0.5">{lic.paymentMethod === "bank" ? "Havale" : lic.paymentMethod === "stripe" ? "Stripe" : lic.paymentMethod}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${sc.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {lic.expiresAt ? format(new Date(lic.expiresAt), "d MMM yyyy", { locale: tr }) : <span className="text-gray-300">Sınırsız</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {lic.status !== "active" && (
                              <button
                                onClick={() => activateMut.mutate({ id: lic.id, status: "active" })}
                                className="p-1.5 rounded hover:bg-green-50 text-green-600 transition-colors"
                                title="Aktif Et"
                              >
                                <BadgeCheck className="w-4 h-4" />
                              </button>
                            )}
                            {lic.status === "active" && (
                              <button
                                onClick={() => activateMut.mutate({ id: lic.id, status: "suspended" })}
                                className="p-1.5 rounded hover:bg-orange-50 text-orange-500 transition-colors"
                                title="Askıya Al"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => regenerateMut.mutate(lic.id)}
                              className="p-1.5 rounded hover:bg-blue-50 text-blue-500 transition-colors"
                              title="Kodu Yenile"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setSelected(lic); setModal("edit"); }}
                              className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors"
                              title="Düzenle"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(lic.id)}
                              className="p-1.5 rounded hover:bg-red-50 text-red-400 transition-colors"
                              title="Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* License System Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Lisans Sistemi Bilgisi
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
            <div>
              <div className="font-semibold mb-1">Aktivasyon API</div>
              <code className="text-xs bg-blue-100 px-2 py-1 rounded block break-all">POST /api/licenses/validate</code>
            </div>
            <div>
              <div className="font-semibold mb-1">Banka Bilgileri</div>
              <div className="text-xs">Ödeme alındığında "Ödendi" işaretleyip lisansı "Aktif Et" butonuyla aktifleştirin.</div>
            </div>
            <div>
              <div className="font-semibold mb-1">WhatsApp Dekontu</div>
              <div className="text-xs">Müşteri dekontu gönderdiğinde ödemeyi doğrulayın ve aktivasyon kodunu iletişim yoluyla gönderin.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {(modal === "create" || modal === "edit") && (
        <LicenseModal license={modal === "edit" ? selected ?? undefined : undefined} onClose={() => { setModal(null); setSelected(null); }} />
      )}

      {/* Delete confirm */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-bold text-lg text-gray-900 mb-2">Lisansı Sil</h3>
            <p className="text-sm text-gray-500 mb-6">Bu lisansı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
            <div className="flex gap-3">
              <Button onClick={() => deleteMut.mutate(deleteConfirm)} disabled={deleteMut.isPending} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                {deleteMut.isPending ? "Siliniyor..." : "Evet, Sil"}
              </Button>
              <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1">İptal</Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
