import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ExternalLink, Globe2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, apiUrl, ensureAdminPanelBootstrap } from "@/lib/apiBase";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { parseNewsSiteLayoutFromJson } from "@/lib/newsSiteLayout";

type HmEditor = {
  id: number;
  email: string;
  displayName: string | null;
  isActive: boolean;
  createdAt?: string;
};

type SeoVerification = {
  googleSiteVerification?: string;
  bingSiteVerification?: string;
  yandexVerification?: string;
};

type HmSiteRow = {
  id: number;
  slug: string;
  domain?: string | null;
  domain2?: string | null;
  domain3?: string | null;
  displayName: string;
  description?: string | null;
  active: boolean;
  layoutJson?: string | null;
  hybridRssEnabled?: boolean;
  contact?: { phone?: string; email?: string; address?: string; notes?: string };
  seoVerification?: SeoVerification | null;
  editors?: HmEditor[];
  createdAt?: string;
};

type SiteForm = {
  slug: string;
  displayName: string;
  description: string;
  domain: string;
  domain2: string;
  domain3: string;
  contactPhone: string;
  contactEmail: string;
  contactAddress: string;
  googleSiteVerification: string;
  bingSiteVerification: string;
  yandexVerification: string;
  editorDisplayName: string;
  editorEmail: string;
  editorPassword: string;
  active: boolean;
  hybridRssEnabled: boolean;
};

const emptyForm: SiteForm = {
  slug: "",
  displayName: "",
  description: "",
  domain: "",
  domain2: "",
  domain3: "",
  contactPhone: "",
  contactEmail: "",
  contactAddress: "",
  googleSiteVerification: "",
  bingSiteVerification: "",
  yandexVerification: "",
  editorDisplayName: "",
  editorEmail: "",
  editorPassword: "",
  active: true,
  hybridRssEnabled: true,
};

async function fetchHmSites(): Promise<{ items: HmSiteRow[] }> {
  await ensureAdminPanelBootstrap();
  const r = await apiFetch(apiUrl("/api/hm/sites"));
  const text = await r.text();
  const j = text ? JSON.parse(text) as { items?: HmSiteRow[]; error?: string } : {};
  if (!r.ok) throw new Error(j.error || text || "Haber siteleri yüklenemedi");
  const items = Array.isArray(j.items)
    ? j.items.map((site) => {
        const layout = parseNewsSiteLayoutFromJson(site.layoutJson ?? null, site.slug ?? null);
        return { ...site, hybridRssEnabled: layout.hybridRssEnabled === true };
      })
    : [];
  return { items };
}

function formFromSite(site: HmSiteRow): SiteForm {
  const editor = site.editors?.[0];
  return {
    slug: site.slug ?? "",
    displayName: site.displayName ?? "",
    description: site.description ?? "",
    domain: site.domain ?? "",
    domain2: site.domain2 ?? "",
    domain3: site.domain3 ?? "",
    contactPhone: site.contact?.phone ?? "",
    contactEmail: site.contact?.email ?? "",
    contactAddress: site.contact?.address ?? "",
    googleSiteVerification: site.seoVerification?.googleSiteVerification ?? "",
    bingSiteVerification: site.seoVerification?.bingSiteVerification ?? "",
    yandexVerification: site.seoVerification?.yandexVerification ?? "",
    editorDisplayName: editor?.displayName ?? "",
    editorEmail: editor?.email ?? "",
    editorPassword: "",
    active: site.active !== false,
    hybridRssEnabled: site.hybridRssEnabled === true,
  };
}

function payloadFromForm(form: SiteForm, editorId?: number) {
  const body: Record<string, unknown> = {
    slug: form.slug,
    displayName: form.displayName,
    description: form.description || null,
    domain: form.domain || null,
    domain2: form.domain2 || null,
    domain3: form.domain3 || null,
    contact: {
      phone: form.contactPhone,
      email: form.contactEmail,
      address: form.contactAddress,
    },
    seoVerification: {
      googleSiteVerification: form.googleSiteVerification,
      bingSiteVerification: form.bingSiteVerification,
      yandexVerification: form.yandexVerification,
    },
    active: form.active,
  };
  if (editorId) body.editorId = editorId;
  if (form.editorDisplayName) body.editorDisplayName = form.editorDisplayName;
  if (form.editorEmail) body.editorEmail = form.editorEmail;
  if (form.editorPassword) body.editorPassword = form.editorPassword;
  return body;
}

function normalizeSlugInput(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function HaberSiteleri() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<SiteForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/hm/sites", "admin-panel"],
    queryFn: fetchHmSites,
    retry: false,
  });

  const sites = data?.items ?? [];
  const filteredSites = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    if (!q) return sites;
    return sites.filter((s) =>
      [s.displayName, s.slug, s.domain, s.domain2, s.domain3]
        .filter(Boolean)
        .some((v) => String(v).toLocaleLowerCase("tr-TR").includes(q)),
    );
  }, [query, sites]);

  function update<K extends keyof SiteForm>(key: K, value: SiteForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function startEdit(site: HmSiteRow) {
    setEditingId(site.id);
    setForm(formFromSite(site));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function saveSite() {
    if (!form.slug.trim() || !form.displayName.trim()) {
      toast({ title: "Slug ve site adı gerekli", variant: "destructive" });
      return;
    }
    if (!editingId && (!form.editorEmail.trim() || form.editorPassword.length < 8)) {
      toast({ title: "Yeni site için editör e-postası ve en az 8 karakter şifre gerekli", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      await ensureAdminPanelBootstrap();
      const current = editingId ? sites.find((s) => s.id === editingId) : undefined;
      const editorId = current?.editors?.[0]?.id;
      const r = await apiFetch(apiUrl(editingId ? `/api/hm/sites/${editingId}` : "/api/hm/sites"), {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFromForm(form, editorId)),
      });
      const text = await r.text();
      const j = text ? JSON.parse(text) as { error?: string } : {};
      if (!r.ok) throw new Error(j.error || text || "Kaydedilemedi");
      toast({ title: editingId ? "Haber sitesi güncellendi" : "Haber sitesi oluşturuldu" });
      resetForm();
      await qc.invalidateQueries({ queryKey: ["/api/hm/sites", "admin-panel"] });
    } catch (e) {
      toast({
        title: "Kaydedilemedi",
        description: String((e as Error)?.message ?? e).slice(0, 240),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(site: HmSiteRow) {
    try {
      await ensureAdminPanelBootstrap();
      const r = await apiFetch(apiUrl(`/api/hm/sites/${site.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !site.active }),
      });
      if (!r.ok) throw new Error(await r.text());
      await qc.invalidateQueries({ queryKey: ["/api/hm/sites", "admin-panel"] });
    } catch (e) {
      toast({ title: "Durum değiştirilemedi", description: String(e).slice(0, 180), variant: "destructive" });
    }
  }

  async function deleteSite(site: HmSiteRow) {
    if (!window.confirm(`${site.displayName} haber sitesini silmek istediğinize emin misiniz?`)) return;
    try {
      await ensureAdminPanelBootstrap();
      const r = await apiFetch(apiUrl(`/api/hm/sites/${site.id}`), { method: "DELETE" });
      if (!r.ok && r.status !== 204) throw new Error(await r.text());
      toast({ title: "Haber sitesi silindi" });
      if (editingId === site.id) resetForm();
      await qc.invalidateQueries({ queryKey: ["/api/hm/sites", "admin-panel"] });
    } catch (e) {
      toast({ title: "Silinemedi", description: String(e).slice(0, 180), variant: "destructive" });
    }
  }

  return (
    <AdminLayout title="Haber Siteleri">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Haber Siteleri</h1>
            <p className="mt-1 text-sm text-gray-600">
              Haber merkezi sitelerini, domainleri, editör hesaplarını ve SEO doğrulamalarını yönetin.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/icerik-havuzu" className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              İçerik Havuzu
            </Link>
            <Link href="/admin/hm-haber-ice-aktar" className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Haber İçe Aktar
            </Link>
            <Link href="/admin/hm-kose-ice-aktar" className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              Köşe İçe Aktar
            </Link>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-gray-900">
                  {editingId ? "Haber Sitesini Düzenle" : "Yeni Haber Sitesi"}
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Slug portal yoludur: <code>/tr/slug</code>. Domain alanlarına çıplak alan adını yazın.
                </p>
              </div>
              {editingId ? (
                <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                  <Plus className="mr-1 h-4 w-4" /> Yeni
                </Button>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="space-y-1.5">
                  <Label>Slug</Label>
                  <Input value={form.slug} onChange={(e) => update("slug", normalizeSlugInput(e.target.value))} placeholder="ankara-haber" />
                </div>
                <div className="space-y-1.5">
                  <Label>Site adı</Label>
                  <Input value={form.displayName} onChange={(e) => update("displayName", e.target.value)} placeholder="Ankara Haber" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Açıklama</Label>
                <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={3} placeholder="Kısa site açıklaması" />
              </div>

              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <div className="space-y-1.5">
                  <Label>Domain 1</Label>
                  <Input value={form.domain} onChange={(e) => update("domain", e.target.value)} placeholder="ornek.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Domain 2</Label>
                  <Input value={form.domain2} onChange={(e) => update("domain2", e.target.value)} placeholder="www.ornek.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Domain 3</Label>
                  <Input value={form.domain3} onChange={(e) => update("domain3", e.target.value)} placeholder="alternatif.com" />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="space-y-1.5">
                  <Label>İletişim telefonu</Label>
                  <Input value={form.contactPhone} onChange={(e) => update("contactPhone", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>İletişim e-postası</Label>
                  <Input value={form.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Adres</Label>
                <Input value={form.contactAddress} onChange={(e) => update("contactAddress", e.target.value)} />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">SEO doğrulama</div>
                <div className="space-y-3">
                  <Input value={form.googleSiteVerification} onChange={(e) => update("googleSiteVerification", e.target.value)} placeholder="Google site verification content" />
                  <Input value={form.bingSiteVerification} onChange={(e) => update("bingSiteVerification", e.target.value)} placeholder="Bing msvalidate.01 content" />
                  <Input value={form.yandexVerification} onChange={(e) => update("yandexVerification", e.target.value)} placeholder="Yandex verification content" />
                </div>
              </div>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
                <div className="mb-3 text-xs font-black uppercase tracking-wide text-indigo-700">Editör hesabı</div>
                <div className="space-y-3">
                  <Input value={form.editorDisplayName} onChange={(e) => update("editorDisplayName", e.target.value)} placeholder="Editör adı" />
                  <Input value={form.editorEmail} onChange={(e) => update("editorEmail", e.target.value)} placeholder="editor@ornek.com" />
                  <Input value={form.editorPassword} onChange={(e) => update("editorPassword", e.target.value)} placeholder={editingId ? "Yeni şifre (boş bırak: değişmesin)" : "En az 8 karakter şifre"} type="password" />
                </div>
              </div>

              <label className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2">
                <span className="text-sm font-semibold text-gray-800">Aktif</span>
                <Switch checked={form.active} onCheckedChange={(v) => update("active", Boolean(v))} />
              </label>

              <Button type="button" disabled={saving} onClick={saveSite} className="w-full bg-[#e61e25] hover:bg-[#c91820]">
                <Save className="mr-2 h-4 w-4" /> {saving ? "Kaydediliyor..." : editingId ? "Güncelle" : "Site Oluştur"}
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-900">Kayıtlı Haber Siteleri</h2>
                <p className="text-xs text-gray-500">{sites.length} site kayıtlı</p>
              </div>
              <Input className="sm:w-72" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Site, slug veya domain ara..." />
            </div>

            {error ? (
              <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {(error as Error).message}
              </div>
            ) : isLoading ? (
              <div className="p-5 text-sm text-gray-500">Haber siteleri yükleniyor...</div>
            ) : filteredSites.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">Kayıt bulunamadı.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredSites.map((site) => {
                  const publicHref = `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(site.slug)}`;
                  const domains = [site.domain, site.domain2, site.domain3].filter(Boolean) as string[];
                  return (
                    <article key={site.id} className="p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-black text-gray-900">{site.displayName}</h3>
                            <Badge variant={site.active ? "default" : "secondary"}>{site.active ? "Aktif" : "Pasif"}</Badge>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">/{site.slug}</span>
                          </div>
                          {site.description ? <p className="mb-3 text-sm text-gray-600 line-clamp-2">{site.description}</p> : null}
                          <div className="flex flex-wrap gap-2 text-xs">
                            <a href={publicHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 font-semibold text-red-700 hover:bg-red-100">
                              <ExternalLink className="h-3 w-3" /> Portal vitrini
                            </a>
                            {domains.map((domain) => (
                              <a key={domain} href={`https://${domain}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-200">
                                <Globe2 className="h-3 w-3" /> {domain}
                              </a>
                            ))}
                            {domains.length === 0 ? (
                              <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">Domain tanımlı değil</span>
                            ) : null}
                          </div>
                          {site.editors?.length ? (
                            <div className="mt-3 text-xs text-gray-500">
                              Editör: {site.editors.map((e) => e.displayName || e.email).join(", ")}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700">
                            Aktif
                            <Switch checked={site.active} onCheckedChange={() => toggleActive(site)} />
                          </label>
                          <Button type="button" variant="outline" size="sm" onClick={() => startEdit(site)}>
                            <Pencil className="mr-1 h-4 w-4" /> Düzenle
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => deleteSite(site)} className="border-red-200 text-red-600 hover:bg-red-50">
                            <Trash2 className="mr-1 h-4 w-4" /> Sil
                          </Button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
