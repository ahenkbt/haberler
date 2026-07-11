import { useState, useEffect, useCallback } from "react";

const API = "/api";

const PROVIDER_TYPE_LABELS: Record<string, string> = {
  siparis: "Sipariş İşletmesi",
  alisveris: "Alışveriş Mağazası",
  hizmet: "Hizmet Sağlayıcı",
  ilan: "İlan Odaklı",
  delivery: "Sipariş İşletmesi",
  ecommerce: "Alışveriş Mağazası",
};
const SUBTYPE_LABELS: Record<string, string> = {
  restoran: "Restoran / Kafe", market: "Market / Bakkal", bitkisel: "Bitkisel Ürünler Mağazası", eczane: "Eczane",
  cicekci: "Çiçekçi", giyim: "Giyim / Tekstil", elektronik: "Elektronik",
  kitap: "Kitap / Kırtasiye", ev: "Ev & Yaşam", spor: "Spor / Outdoor",
  kozmetik: "Kozmetik / Güzellik", cekici: "Çekici / Yol Yardım",
  nakliyeci: "Nakliyeci", oto_galeri: "Oto Galeri",
  kurs: "Kurs / Eğitim", tadilat: "Tadilat / Tamir", temizlik: "Temizlik",
  boya: "Boya / Badana", guzellik: "Güzellik Salonu", saglik: "Sağlık / Klinik",
  ikinci_el: "2. El Eşya", is_makinesi: "İş Makineleri", telefon: "Telefon / GSM",
  beyaz_esya: "Beyaz Eşya", hayvan: "Hayvanlar / Pet", diger: "Diğer",
};

interface Provider {
  id: number; name: string; slug: string;
  vendor_type: string; provider_type: string; provider_subtype: string;
  application_status: string; rejection_reason: string | null;
  owner_name: string | null; owner_email: string | null;
  phone: string | null; email: string | null;
  address: string | null; city: string | null; district: string | null;
  lat: number | null; lng: number | null;
  description: string | null; image_url: string | null;
  active: boolean; featured: boolean; rating: number; review_count: number;
  doc_kimlik: string | null; doc_vergi: string | null; doc_imza: string | null;
  verified_at: string | null; notes: string | null;
  created_at: string; order_count: number; product_count: number;
  revenue_model?: string | null;
  commission_rate_pct?: string | number | null;
  payout_bank_holder?: string | null;
  payout_bank_iban?: string | null;
  payout_bank_branch?: string | null;
  geliver_api_token_masked?: string | null;
  geliver_configured?: boolean;
  geliver_sender_zip?: string | null;
  geliver_sender_mahalle?: string | null;
  geliver_auto_ship_on_order?: boolean;
}
interface SubscriptionRequest {
  id: number;
  vendor_id: number;
  vendor_name: string;
  vendor_slug: string;
  owner_name: string | null;
  owner_email: string | null;
  city: string | null;
  district: string | null;
  start_date: string;
  end_date: string;
  payment_method: string;
  receipt_url: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  processed_at: string | null;
  created_at: string;
}
interface ExpiringSubscription {
  vendor_id: number;
  vendor_name: string;
  vendor_slug: string;
  owner_name: string | null;
  owner_email: string | null;
  city: string | null;
  district: string | null;
  start_date: string | null;
  end_date: string;
}
interface DomainRequest {
  id: number;
  vendor_id: number;
  domain: string;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  verified_at: string | null;
  requested_at: string;
  vendor_name: string;
  vendor_slug: string;
  provider_type: string | null;
  provider_subtype: string | null;
}

type Tab = "pending" | "approved" | "rejected" | "all";

const TABS: { id: Tab; label: string }[] = [
  { id: "pending",  label: "Bekleyen Başvurular" },
  { id: "approved", label: "Aktif Sağlayıcılar" },
  { id: "rejected", label: "Reddedilenler" },
  { id: "all",      label: "Tümü" },
];

export default function ServisSaglayicilar() {
  const [tab, setTab] = useState<Tab>("pending");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Provider | null>(null);
  const [rejectModal, setRejectModal] = useState<Provider | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [waLink, setWaLink] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [subReqs, setSubReqs] = useState<SubscriptionRequest[]>([]);
  const [subLoading, setSubLoading] = useState(false);
  const [subStatus, setSubStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [subNotes, setSubNotes] = useState<Record<number, string>>({});
  const [savingSubNoteId, setSavingSubNoteId] = useState<number | null>(null);
  const [expiringSubs, setExpiringSubs] = useState<ExpiringSubscription[]>([]);
  const [expLoading, setExpLoading] = useState(false);
  const [revEdit, setRevEdit] = useState<{ model: "subscription" | "commission"; rate: string }>({ model: "subscription", rate: "" });
  const [savingRev, setSavingRev] = useState(false);
  const [geliverAdmin, setGeliverAdmin] = useState({ token: "", zip: "", mahalle: "", auto: false });
  const [savingGeliverAdmin, setSavingGeliverAdmin] = useState(false);
  const [adminPanelPw, setAdminPanelPw] = useState("Yekpare");
  const [savingAdminPanelPw, setSavingAdminPanelPw] = useState(false);
  const [extendMonths, setExtendMonths] = useState(12);
  const [extendNote, setExtendNote] = useState("");
  const [extendSaving, setExtendSaving] = useState(false);
  const [domainReqs, setDomainReqs] = useState<DomainRequest[]>([]);
  const [domainLoading, setDomainLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab !== "all") params.set("status", tab);
      if (q) params.set("q", q);
      const res = await fetch(`${API}/admin/providers?${params}`);
      const data = await res.json();
      setProviders(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [tab, q]);

  useEffect(() => { load(); }, [load]);
  const loadSubscriptionRequests = useCallback(async () => {
    setSubLoading(true);
    try {
      const r = await fetch(`${API}/admin/providers/subscription-requests?status=${subStatus}`);
      const d = await r.json();
      const rows = Array.isArray(d) ? d as SubscriptionRequest[] : [];
      setSubReqs(rows);
      setSubNotes(Object.fromEntries(rows.map((x) => [x.id, x.admin_note || ""])));
    } finally {
      setSubLoading(false);
    }
  }, [subStatus]);

  const loadExpiringSubscriptions = useCallback(async () => {
    setExpLoading(true);
    try {
      const r = await fetch(`${API}/admin/providers/subscription-expiring?days=30`);
      const d = await r.json();
      setExpiringSubs(Array.isArray(d) ? d as ExpiringSubscription[] : []);
    } finally {
      setExpLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSubscriptionRequests();
  }, [loadSubscriptionRequests]);

  useEffect(() => {
    void loadExpiringSubscriptions();
  }, [loadExpiringSubscriptions]);

  const loadDomainRequests = useCallback(async () => {
    setDomainLoading(true);
    try {
      const r = await fetch(`${API}/admin/vendor-domain-requests`);
      const d = await r.json();
      setDomainReqs(Array.isArray(d.requests) ? d.requests as DomainRequest[] : []);
    } finally {
      setDomainLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDomainRequests();
  }, [loadDomainRequests]);

  useEffect(() => {
    if (selected) setNotes(selected.notes || "");
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const m = selected.revenue_model === "commission" ? "commission" : "subscription";
    setRevEdit({
      model: m,
      rate: selected.commission_rate_pct != null && selected.commission_rate_pct !== ""
        ? String(selected.commission_rate_pct)
        : "",
    });
  }, [selected?.id]);

  useEffect(() => {
    if (!selected) return;
    setGeliverAdmin({
      token: "",
      zip: String(selected.geliver_sender_zip ?? "").replace(/\D/g, "").slice(0, 5),
      mahalle: String(selected.geliver_sender_mahalle ?? "").trim(),
      auto: Boolean(selected.geliver_auto_ship_on_order),
    });
  }, [selected?.id, selected?.geliver_sender_zip, selected?.geliver_sender_mahalle, selected?.geliver_auto_ship_on_order]);

  useEffect(() => {
    if (selected) setAdminPanelPw("Yekpare");
  }, [selected?.id]);

  async function saveAdminPanelPassword() {
    if (!selected || adminPanelPw.trim().length < 4) return;
    setSavingAdminPanelPw(true);
    try {
      const res = await fetch(`${API}/admin/providers/${selected.id}/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPanelPw.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMsg("❌ " + (data.error || "Şifre kaydedilemedi"));
        return;
      }
      setActionMsg("✅ Panel şifresi güncellendi (servis-saglayici-giris).");
      setAdminPanelPw("Yekpare");
      load();
    } finally {
      setSavingAdminPanelPw(false);
      setTimeout(() => setActionMsg(""), 6000);
    }
  }

  async function manualSubscriptionExtend() {
    if (!selected) return;
    setExtendSaving(true);
    try {
      const res = await fetch(`${API}/admin/providers/${selected.id}/subscription-manual-extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          months: Math.max(1, Math.min(60, Math.floor(Number(extendMonths) || 12))),
          adminNote: extendNote.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; start_date?: string; end_date?: string; vendor_id?: number };
      if (!res.ok) {
        setActionMsg("❌ " + (data.error || "Uzatma kaydedilemedi"));
        setTimeout(() => setActionMsg(""), 8000);
        return;
      }
      setActionMsg(
        `✅ Manuel abonelik: ${data.start_date ?? "?"} → ${data.end_date ?? "?"} (vendor #${data.vendor_id ?? selected.id})`,
      );
      setExtendNote("");
      void loadSubscriptionRequests();
      void loadExpiringSubscriptions();
      load();
    } finally {
      setExtendSaving(false);
      setTimeout(() => setActionMsg(""), 8000);
    }
  }

  async function saveRevenueModel() {
    if (!selected) return;
    setSavingRev(true);
    try {
      const res = await fetch(`${API}/admin/providers/${selected.id}/revenue-model`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revenueModel: revEdit.model,
          commissionRatePct: revEdit.model === "commission" ? revEdit.rate : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMsg("❌ " + (data.error || "Kaydedilemedi"));
        return;
      }
      setActionMsg("✅ Gelir modeli güncellendi.");
      setSelected({ ...selected, revenue_model: revEdit.model, commission_rate_pct: revEdit.model === "commission" ? revEdit.rate : null });
      load();
    } finally {
      setSavingRev(false);
      setTimeout(() => setActionMsg(""), 6000);
    }
  }

  async function saveAdminGeliver(opts?: { clearToken?: boolean }) {
    if (!selected) return;
    setSavingGeliverAdmin(true);
    try {
      const isEcom =
        selected.vendor_type === "ecommerce" ||
        selected.provider_type === "alisveris" ||
        selected.provider_type === "ecommerce";
      const body: Record<string, unknown> = {
        geliverSenderZip: geliverAdmin.zip.replace(/\D/g, "").slice(0, 5) || null,
        geliverSenderMahalle: geliverAdmin.mahalle.trim() || null,
      };
      if (isEcom) body.geliverAutoShipOnOrder = geliverAdmin.auto;
      if (opts?.clearToken) body.geliverApiToken = "";
      else if (geliverAdmin.token.trim()) body.geliverApiToken = geliverAdmin.token.trim();

      const res = await fetch(`${API}/admin/providers/${selected.id}/geliver-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionMsg("❌ " + (data.error || "Geliver kaydedilemedi"));
        return;
      }
      setActionMsg("✅ Geliver ayarları güncellendi.");
      setGeliverAdmin((g) => ({ ...g, token: "" }));
      setSelected({
        ...selected,
        geliver_api_token_masked: data.geliver_api_token_masked ?? "",
        geliver_configured: Boolean(data.geliver_configured),
        geliver_sender_zip: data.geliver_sender_zip ?? null,
        geliver_sender_mahalle: data.geliver_sender_mahalle ?? null,
        geliver_auto_ship_on_order: Boolean(data.geliver_auto_ship_on_order),
      });
      load();
    } finally {
      setSavingGeliverAdmin(false);
      setTimeout(() => setActionMsg(""), 6000);
    }
  }

  function revenueLabel(p: Provider): string {
    if (p.revenue_model === "commission") {
      const pct = p.commission_rate_pct != null && String(p.commission_rate_pct).trim() !== ""
        ? String(p.commission_rate_pct)
        : "—";
      return `Komisyon %${pct}`;
    }
    return "Abonelik";
  }

  async function approve(id: number) {
    const res = await fetch(`${API}/admin/providers/${id}/approve`, { method: "PUT" });
    const data = await res.json();
    if (data.success) {
      const wa = data.whatsapp as { sent?: boolean; link?: string } | undefined;
      if (wa?.sent) {
        setActionMsg("✅ Onaylandı, WhatsApp bildirimi otomatik gönderildi.");
        setWaLink(null);
      } else if (wa?.link) {
        setActionMsg("✅ Onaylandı. WhatsApp bildirimi için butona tıklayın:");
        setWaLink(wa.link);
      } else {
        setActionMsg("✅ Onaylandı. Sağlayıcı aktif edildi ve harita premium pini eklendi.");
        setWaLink(null);
      }
      setSelected(null);
      load();
    } else {
      setActionMsg("❌ Hata: " + (data.error || "bilinmeyen hata"));
    }
    setTimeout(() => { setActionMsg(""); setWaLink(null); }, 8000);
  }

  async function reject() {
    if (!rejectModal) return;
    const res = await fetch(`${API}/admin/providers/${rejectModal.id}/reject`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: rejectReason }),
    });
    const data = await res.json();
    if (data.success) {
      const wa = data.whatsapp as { sent?: boolean; link?: string } | undefined;
      if (wa?.sent) {
        setActionMsg("Red bildirimi WhatsApp ile otomatik gönderildi.");
        setWaLink(null);
      } else if (wa?.link) {
        setActionMsg("Reddedildi. WhatsApp bildirimi için butona tıklayın:");
        setWaLink(wa.link);
      } else {
        setActionMsg("Başvuru reddedildi.");
        setWaLink(null);
      }
      setRejectModal(null);
      setRejectReason("");
      setSelected(null);
      load();
    }
    setTimeout(() => { setActionMsg(""); setWaLink(null); }, 8000);
  }

  async function saveNotes(id: number) {
    setSavingNotes(true);
    await fetch(`${API}/admin/providers/${id}/notes`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setSavingNotes(false);
    setActionMsg("Not kaydedildi.");
    setTimeout(() => setActionMsg(""), 2000);
    load();
  }

  async function approveSubRequest(id: number) {
    const res = await fetch(`${API}/admin/providers/subscription-requests/${id}/approve`, { method: "PATCH" });
    const data = await res.json();
    if (data?.success) {
      await loadSubscriptionRequests();
      await loadExpiringSubscriptions();
      setActionMsg("✅ Abonelik uzatma onaylandı ve aktif edildi.");
      load();
      setTimeout(() => setActionMsg(""), 4000);
    }
  }

  async function rejectSubRequest(id: number) {
    const reason = prompt("Reddetme notu (opsiyonel):") || "";
    const res = await fetch(`${API}/admin/providers/subscription-requests/${id}/reject`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminNote: reason }),
    });
    const data = await res.json();
    if (data?.success) {
      await loadSubscriptionRequests();
      setActionMsg("Abonelik uzatma talebi reddedildi.");
      setTimeout(() => setActionMsg(""), 4000);
    }
  }

  async function saveSubAdminNote(id: number) {
    setSavingSubNoteId(id);
    try {
      const res = await fetch(`${API}/admin/providers/subscription-requests/${id}/note`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNote: subNotes[id] ?? "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || "Not kaydedilemedi");
      setActionMsg("Abonelik admin notu kaydedildi.");
      setTimeout(() => setActionMsg(""), 2500);
      await loadSubscriptionRequests();
    } catch (e: any) {
      setActionMsg(`❌ ${e?.message || "Not kaydedilemedi."}`);
      setTimeout(() => setActionMsg(""), 3500);
    } finally {
      setSavingSubNoteId(null);
    }
  }

  async function updateDomainRequest(id: number, action: "approve" | "reject") {
    const adminNote = action === "reject" ? (prompt("Red notu (opsiyonel):") || "") : "";
    const res = await fetch(`${API}/admin/vendor-domain-requests/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, adminNote }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      setActionMsg("❌ " + (data?.error || "Domain talebi güncellenemedi"));
      setTimeout(() => setActionMsg(""), 5000);
      return;
    }
    setActionMsg(action === "approve" ? "✅ Domain onaylandı ve aktif edildi." : "Domain talebi reddedildi.");
    await loadDomainRequests();
    setTimeout(() => setActionMsg(""), 5000);
  }

  const statusBadge = (s: string) => {
    if (s === "approved") return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Onaylı</span>;
    if (s === "pending")  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Bekliyor</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Reddedildi</span>;
  };

  const typeLabel = (p: Provider) =>
    PROVIDER_TYPE_LABELS[p.provider_type || p.vendor_type] || p.provider_type || p.vendor_type || "—";
  const subtypeLabel = (p: Provider) =>
    SUBTYPE_LABELS[p.provider_subtype] || p.provider_subtype || "—";

  /* Sayılar */
  const counts = { pending: 0, approved: 0, rejected: 0, all: providers.length };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Servis Sağlayıcı Yönetimi</h1>
          <p className="text-slate-500 text-sm mt-1">Başvuruları yönetin · onaylayın · reddedin</p>
        </div>
        <a
          href="/isletme-basvuru"
          target="_blank"
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
        >
          Başvuru Formu ↗
        </a>
      </div>

      {actionMsg && (
        <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-sm font-medium flex items-center gap-3 flex-wrap">
          <span>{actionMsg}</span>
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.553 4.118 1.52 5.855L0 24l6.337-1.662A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.375l-.36-.214-3.733.979 1.001-3.638-.235-.374A9.818 9.818 0 0112 2.182c5.426 0 9.818 4.392 9.818 9.818 0 5.427-4.392 9.818-9.818 9.818z"/></svg>
              WhatsApp ile Bildir
            </a>
          )}
        </div>
      )}

      <div className="mb-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="font-bold text-slate-800">Özel Domain Talepleri</h2>
            <p className="text-xs text-slate-500">Servis sağlayıcıların Vercel DNS yönlendirmesi sonrası onay bekleyen alan adları.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadDomainRequests()}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Yenile
          </button>
        </div>
        {domainLoading ? (
          <p className="text-sm text-slate-500">Yükleniyor…</p>
        ) : domainReqs.length === 0 ? (
          <p className="text-sm text-slate-500">Henüz domain talebi yok.</p>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {domainReqs.slice(0, 12).map((req) => (
              <div key={req.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900">{req.domain}</div>
                    <div className="text-xs text-slate-500">#{req.vendor_id} · {req.vendor_name}</div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    req.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                    req.status === "rejected" ? "bg-red-100 text-red-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>
                    {req.status === "approved" ? "Aktif" : req.status === "rejected" ? "Reddedildi" : "Bekliyor"}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  DNS: <code>ns1.vercel-dns.com</code> / <code>ns2.vercel-dns.com</code>
                </div>
                {req.admin_note ? <div className="text-xs text-slate-600">Not: {req.admin_note}</div> : null}
                {req.status === "pending" ? (
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => void updateDomainRequest(req.id, "approve")}
                      className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      Onayla
                    </button>
                    <button
                      type="button"
                      onClick={() => void updateDomainRequest(req.id, "reject")}
                      className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
                    >
                      Reddet
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs + Arama */}
      <div className="flex gap-2 mb-5 flex-wrap items-center">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              tab === t.id
                ? "bg-indigo-600 text-white shadow"
                : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-300"
            }`}
          >
            {t.label}
            {t.id === "pending" && counts.pending > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-xs">{counts.pending}</span>
            )}
          </button>
        ))}
        <div className="ml-auto flex gap-1">
          <input
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400 w-44"
            placeholder="İşletme, slug veya e-posta…"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === "Enter" && load()}
          />
          <button onClick={load} className="px-3 py-2 bg-slate-100 rounded-xl text-sm hover:bg-slate-200 transition">Ara</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-800">Abonelik Uzatma Talepleri</h2>
          <span className="text-xs text-slate-500">Kayıt: {subReqs.length}</span>
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          {[
            { id: "pending", label: "Bekleyen" },
            { id: "approved", label: "Onaylanan" },
            { id: "rejected", label: "Reddedilen" },
            { id: "all", label: "Tümü" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setSubStatus(f.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${subStatus === f.id ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {subLoading ? (
          <div className="text-sm text-slate-400 py-4">Yükleniyor...</div>
        ) : subReqs.length === 0 ? (
          <div className="text-sm text-slate-500 py-2">Bekleyen abonelik uzatma talebi yok.</div>
        ) : (
          <div className="space-y-2">
            {subReqs.map((r) => (
              <div key={r.id} className="border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-800">{r.vendor_name}</div>
                  <div className="text-xs text-slate-500">{r.city || "—"} / {r.district || "—"} · {r.start_date} → {r.end_date}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Ödeme:{" "}
                    {r.payment_method === "stripe"
                      ? "Stripe"
                      : r.payment_method === "admin_manual"
                        ? "Admin (manuel)"
                        : "Havale/EFT"}
                  </div>
                  {r.receipt_url && <a href={r.receipt_url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline">Dekontu aç</a>}
                </div>
                <div className="min-w-[240px] space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Durum:</span>
                    {statusBadge(r.status)}
                  </div>
                  <textarea
                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-indigo-400 resize-none"
                    rows={2}
                    value={subNotes[r.id] ?? ""}
                    onChange={(e) => setSubNotes((p) => ({ ...p, [r.id]: e.target.value }))}
                    placeholder="Admin notu..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveSubAdminNote(r.id)}
                      disabled={savingSubNoteId === r.id}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 disabled:opacity-50"
                    >
                      {savingSubNoteId === r.id ? "Kaydediliyor..." : "Not Kaydet"}
                    </button>
                    {r.status === "pending" && (
                      <>
                        <button onClick={() => approveSubRequest(r.id)} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700">Onayla</button>
                        <button onClick={() => rejectSubRequest(r.id)} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700">Reddet</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-rose-200 shadow-sm p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-rose-700">Abonelik Bitişi Yaklaşanlar (30 gün)</h2>
          <span className="text-xs text-rose-500">Toplam: {expiringSubs.length}</span>
        </div>
        {expLoading ? (
          <div className="text-sm text-slate-400 py-4">Yükleniyor...</div>
        ) : expiringSubs.length === 0 ? (
          <div className="text-sm text-slate-500 py-2">Yakın bitişli abonelik bulunmuyor.</div>
        ) : (
          <div className="space-y-2">
            {expiringSubs.map((x) => (
              <div key={x.vendor_id} className="border border-rose-200 bg-rose-50/40 rounded-xl p-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-800">{x.vendor_name}</div>
                  <div className="text-xs text-slate-600">{x.city || "—"} / {x.district || "—"} · Bitiş: {x.end_date}</div>
                </div>
                <a href={`/siparis/${x.vendor_slug}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-rose-700 hover:underline">
                  İşletmeyi Aç
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tablo */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Yükleniyor...</div>
        ) : providers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-3xl mb-3">🏢</div>
            <div className="text-slate-500">
              {tab === "pending" ? "Bekleyen başvuru yok." : "Bu kategoride kayıt bulunamadı."}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">#</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">İşletme</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Servis Türü</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Yetkili</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Şehir</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Gelir</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Kargo</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Durum</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Tarih</th>
                  <th className="text-right px-4 py-3 text-slate-500 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {providers.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-slate-400 text-xs">{p.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{p.name}</div>
                      <div className="text-xs text-slate-400">{p.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700 font-medium text-xs">{typeLabel(p)}</div>
                      <div className="text-xs text-slate-400">{subtypeLabel(p)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700 text-xs">{p.owner_name || "—"}</div>
                      <div className="text-xs text-slate-400">{p.owner_email || p.email || "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{p.city || "—"}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className={`inline-flex px-2 py-0.5 rounded-lg font-medium ${p.revenue_model === "commission" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-slate-100 text-slate-700 border border-slate-200"}`}>
                        {revenueLabel(p)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-center">
                      {p.geliver_configured ? (
                        <span className="text-emerald-600 font-semibold" title="Geliver API kayıtlı">✓</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{statusBadge(p.application_status)}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString("tr-TR") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => setSelected(p)}
                          className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-100 transition"
                        >
                          Detay
                        </button>
                        {p.application_status === "pending" && (
                          <>
                            <button
                              onClick={() => approve(p.id)}
                              className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium hover:bg-emerald-100 transition"
                            >
                              Onayla
                            </button>
                            <button
                              onClick={() => { setRejectModal(p); setRejectReason(""); }}
                              className="px-3 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100 transition"
                            >
                              Reddet
                            </button>
                          </>
                        )}
                        {p.application_status === "rejected" && (
                          <button
                            onClick={() => approve(p.id)}
                            className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-100 transition"
                          >
                            Tekrar Onayla
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4 pt-10">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 mb-10">
            <div className="p-5 border-b border-slate-100 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">{selected.name}</h2>
                <div className="text-sm text-slate-500 flex gap-2 items-center mt-1 flex-wrap">
                  {statusBadge(selected.application_status)}
                  <span className="text-slate-400">•</span>
                  <span>{typeLabel(selected)}</span>
                  {selected.provider_subtype && (
                    <><span className="text-slate-400">→</span><span>{subtypeLabel(selected)}</span></>
                  )}
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700 text-xl leading-none ml-4">✕</button>
            </div>

            <div className="p-5 space-y-5">
              {/* İşletme */}
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">İşletme Bilgileri</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Vendor ID" value={String(selected.id)} />
                  <Info label="İşletme Adı" value={selected.name} />
                  <Info label="Slug" value={selected.slug} />
                  <Info label="Telefon" value={selected.phone} />
                  <Info label="E-Posta" value={selected.email || selected.owner_email} />
                  <Info label="Adres" value={selected.address} />
                  <Info label="Şehir / İlçe" value={[selected.city, selected.district].filter(Boolean).join(" / ")} />
                  {selected.lat && <Info label="Koordinat" value={`${selected.lat?.toFixed(4)}, ${selected.lng?.toFixed(4)}`} />}
                  {selected.description && <Info label="Açıklama" value={selected.description} />}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Manuel abonelik uzatma</h3>
                <p className="text-xs text-slate-500 mb-3">
                  Son onaylı bitiş tarihinden sonraki günden başlayarak yeni bir <strong>onaylı</strong> abonelik satırı oluşturur. Yıl dolduğunda veya
                  talep gelmeden süre vermek için kullanın; kayıtlar «Abonelik uzatma talepleri» listesinde <code className="bg-slate-100 px-1 rounded">admin_manual</code>{" "}
                  ödeme tipiyle görünür.
                </p>
                <div className="flex flex-wrap gap-3 items-end">
                  <label className="text-xs text-slate-600 block">
                    Ay sayısı (1–60)
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={extendMonths}
                      onChange={(e) => setExtendMonths(Number(e.target.value) || 12)}
                      className="mt-1 block w-28 border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="text-xs text-slate-600 block flex-1 min-w-[200px]">
                    Admin notu (isteğe bağlı)
                    <input
                      value={extendNote}
                      onChange={(e) => setExtendNote(e.target.value)}
                      className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                      placeholder="örn. Havale dekontu mailde"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={extendSaving || selected.application_status !== "approved"}
                    onClick={() => void manualSubscriptionExtend()}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {extendSaving ? "Kaydediliyor…" : "Süreyi uzat"}
                  </button>
                </div>
                {selected.application_status !== "approved" ? (
                  <p className="text-[11px] text-amber-800 mt-2">Önce başvuruyu onaylayın; manuel uzatma yalnızca aktif işletmeler için geçerlidir.</p>
                ) : null}
              </section>

              {/* Yetkili */}
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Yetkili Bilgileri</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Yetkili Adı" value={selected.owner_name} />
                  <Info label="Yetkili E-Posta" value={selected.owner_email} />
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Panel giriş şifresi</h3>
                <p className="text-xs text-slate-500 mb-2">
                  Tüm işletme türleri aynı giriş sayfasını kullanır:{" "}
                  <code className="bg-slate-100 px-1 rounded">/servis-saglayici-giris</code>
                  . Giriş e-postası yetkili veya işletme e-postası olabilir.
                </p>
                <p className="text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 mb-2">
                  Aynı e-posta ile birden fazla kayıt varsa giriş, <strong>en son güncellenen</strong> satıra göre yapılır. Şifreyi mutlaka{" "}
                  <strong>listede seçtiğiniz işletmenin</strong> kimliği için kaydedin.
                </p>
                <div className="flex flex-wrap gap-2 items-end">
                  <label className="text-xs text-slate-600 block min-w-[160px] flex-1">
                    Yeni şifre
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={adminPanelPw}
                      onChange={(e) => setAdminPanelPw(e.target.value)}
                      className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                      placeholder="En az 4 karakter"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={savingAdminPanelPw || adminPanelPw.trim().length < 4}
                    onClick={() => void saveAdminPanelPassword()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {savingAdminPanelPw ? "Kaydediliyor…" : "Şifreyi kaydet"}
                  </button>
                </div>
              </section>

              {/* Belgeler */}
              {(selected.doc_kimlik || selected.doc_vergi || selected.doc_imza) && (
                <section>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Yüklenen Belgeler</h3>
                  <div className="space-y-2">
                    {selected.doc_kimlik && <DocLink label="Kimlik Belgesi" url={selected.doc_kimlik} />}
                    {selected.doc_vergi  && <DocLink label="Vergi Levhası"  url={selected.doc_vergi} />}
                    {selected.doc_imza   && <DocLink label="İmza Sirküleri" url={selected.doc_imza} />}
                  </div>
                </section>
              )}

              {/* İstatistik */}
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">İstatistikler</h3>
                <div className="grid grid-cols-3 gap-3">
                  <Stat label="Sipariş" value={selected.order_count} />
                  <Stat label="Ürün / Menü" value={selected.product_count} />
                  <Stat label="Puan" value={`${selected.rating || 0} (${selected.review_count})`} />
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Geliver kargo</h3>
                <p className="text-xs text-slate-500 mb-3">
                  API girildiğinde işletme panelinde kargo aktif olur. Sipariş işletmelerinde fiş <strong>manuel</strong>; alışverişte isteğe bağlı otomatik.
                </p>
                {selected.geliver_api_token_masked ? (
                  <p className="text-xs text-slate-700 mb-2">
                    Kayıtlı anahtar: <span className="font-mono font-semibold">{selected.geliver_api_token_masked}</span>
                  </p>
                ) : (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 mb-2">API anahtarı yok.</p>
                )}
                <div className="space-y-2">
                  <label className="block text-xs text-slate-600">
                    Yeni API anahtarı
                    <input
                      type="password"
                      autoComplete="off"
                      value={geliverAdmin.token}
                      onChange={(e) => setGeliverAdmin((g) => ({ ...g, token: e.target.value }))}
                      className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                      placeholder="app.geliver.io → API token"
                    />
                  </label>
                  <label className="block text-xs text-slate-600">
                    Gönderici posta kodu
                    <input
                      value={geliverAdmin.zip}
                      onChange={(e) => setGeliverAdmin((g) => ({ ...g, zip: e.target.value.replace(/\D/g, "").slice(0, 5) }))}
                      className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                      placeholder="34000"
                    />
                  </label>
                  <label className="block text-xs text-slate-600">
                    Gönderici mahalle (Geliver address1 başı)
                    <input
                      value={geliverAdmin.mahalle}
                      onChange={(e) => setGeliverAdmin((g) => ({ ...g, mahalle: e.target.value }))}
                      className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                      placeholder="Mahalle adı"
                    />
                  </label>
                  {(selected.vendor_type === "ecommerce" || selected.provider_type === "alisveris") && (
                    <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={geliverAdmin.auto}
                        onChange={(e) => setGeliverAdmin((g) => ({ ...g, auto: e.target.checked }))}
                        className="mt-0.5 rounded border-slate-300"
                      />
                      <span>Yeni e-ticaret siparişinde otomatik Geliver fişi</span>
                    </label>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      disabled={savingGeliverAdmin}
                      onClick={() => void saveAdminGeliver()}
                      className="px-4 py-2 bg-sky-600 text-white rounded-lg text-xs font-semibold hover:bg-sky-700 disabled:opacity-50"
                    >
                      {savingGeliverAdmin ? "Kaydediliyor…" : "Geliver kaydet"}
                    </button>
                    {selected.geliver_configured && (
                      <button
                        type="button"
                        disabled={savingGeliverAdmin}
                        onClick={() => void saveAdminGeliver({ clearToken: true })}
                        className="px-4 py-2 border border-red-200 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-50 disabled:opacity-50"
                      >
                        Anahtarı sil
                      </button>
                    )}
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Gelir modeli &amp; komisyon</h3>
                <p className="text-xs text-slate-500 mb-3">Başvuruda seçilen modeli düzeltebilir veya komisyon oranını güncelleyebilirsiniz.</p>
                <div className="flex flex-wrap gap-3 items-end">
                  <label className="text-xs text-slate-600 block">
                    Model
                    <select
                      value={revEdit.model}
                      onChange={(e) =>
                        setRevEdit((r) => ({
                          ...r,
                          model: e.target.value === "commission" ? "commission" : "subscription",
                          rate: e.target.value === "subscription" ? "" : r.rate,
                        }))
                      }
                      className="mt-1 block w-44 border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                    >
                      <option value="subscription">Abonelik</option>
                      <option value="commission">Komisyon</option>
                    </select>
                  </label>
                  {revEdit.model === "commission" && (
                    <label className="text-xs text-slate-600 block">
                      Komisyon %
                      <input
                        type="text"
                        inputMode="decimal"
                        value={revEdit.rate}
                        onChange={(e) => setRevEdit((r) => ({ ...r, rate: e.target.value }))}
                        className="mt-1 block w-28 border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
                        placeholder="örn. 10"
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    disabled={savingRev || (revEdit.model === "commission" && !revEdit.rate.trim())}
                    onClick={() => void saveRevenueModel()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {savingRev ? "Kaydediliyor…" : "Kaydet"}
                  </button>
                </div>
                {selected.revenue_model === "commission" && (
                  <div className="mt-3 text-xs text-slate-600 space-y-1 border border-slate-100 rounded-xl p-3 bg-slate-50/80">
                    <div><span className="text-slate-400">IBAN:</span> {selected.payout_bank_iban ? `${String(selected.payout_bank_iban).slice(0, 8)}…${String(selected.payout_bank_iban).slice(-4)}` : "— (işletme henüz girmedi)"}</div>
                    <div><span className="text-slate-400">Hesap sahibi:</span> {selected.payout_bank_holder || "—"}</div>
                    {selected.payout_bank_branch && <div><span className="text-slate-400">Şube:</span> {selected.payout_bank_branch}</div>}
                  </div>
                )}
              </section>

              {/* Red sebebi */}
              {selected.rejection_reason && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <span className="font-semibold">Red sebebi: </span>{selected.rejection_reason}
                </div>
              )}

              {/* Admin Notu */}
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Admin Notu (İç)</h3>
                <textarea
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-400 resize-none"
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="İçeri not ekle (ziyaretçiye görünmez)..."
                />
                <button
                  onClick={() => saveNotes(selected.id)}
                  disabled={savingNotes}
                  className="mt-1.5 px-4 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 transition disabled:opacity-50"
                >
                  {savingNotes ? "Kaydediliyor..." : "Notu Kaydet"}
                </button>
              </section>

              {/* Eylemler */}
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                {selected.application_status !== "approved" && (
                  <button
                    onClick={() => approve(selected.id)}
                    className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition"
                  >
                    ✓ Onayla &amp; Aktifleştir
                  </button>
                )}
                {selected.application_status !== "rejected" && (
                  <button
                    onClick={() => { setRejectModal(selected); setRejectReason(""); }}
                    className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition"
                  >
                    ✗ Reddet
                  </button>
                )}
                <a
                  href={`/siparis/${selected.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition"
                >
                  Vitrine Git →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 p-6">
            <h3 className="text-base font-bold text-slate-800 mb-1">Başvuruyu Reddet</h3>
            <p className="text-sm text-slate-500 mb-4">"{rejectModal.name}" için red sebebini giriniz.</p>
            <textarea
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-400 resize-none mb-4"
              rows={4}
              placeholder="Red sebebini girin (isteğe bağlı, başvuru sahibine iletilir)"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={reject}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition"
              >
                Reddet
              </button>
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-xs text-slate-400 mb-0.5">{label}</div>
      <div className="text-slate-700 font-medium">{value || "—"}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 text-center">
      <div className="text-lg font-bold text-slate-800">{value ?? "0"}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}

function DocLink({ label, url }: { label: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 hover:bg-blue-100 transition"
    >
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {label}
    </a>
  );
}
