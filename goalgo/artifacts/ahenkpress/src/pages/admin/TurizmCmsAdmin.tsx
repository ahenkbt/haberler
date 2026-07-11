import { useCallback, useEffect, useState } from "react";
import { apiFetch, apiUrl } from "@/lib/apiBase";
import { Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";

const CMS_ADMIN = apiUrl("/api/tourism/admin/cms");

const CATEGORY_OPTIONS = [
  { value: "hub", label: "Seyahat Ana Sayfa" },
  { value: "konaklama", label: "Konaklama" },
  { value: "villa-ev", label: "Villa & Ev" },
  { value: "turlar", label: "Turlar" },
  { value: "arac", label: "Araç Kiralama" },
  { value: "yat", label: "Yat Turları" },
  { value: "servis", label: "VIP Servis" },
  { value: "otobus", label: "Otobüs (eski)" },
  { value: "ucus", label: "Uçuş" },
  { value: "etkinlik", label: "Etkinlik" },
  { value: "gezi-seyahat", label: "Gezi Seyahat" },
];

const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const sel = inp + " bg-white";

type CmsSubTab = "intro" | "banners" | "blog";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-gray-900 text-lg">{title}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

function IntroCardsPanel() {
  const [categorySlug, setCategorySlug] = useState("konaklama");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, string>>({ placement: "main", sortOrder: "0", isActive: "true" });
  const [editId, setEditId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await apiFetch(`${CMS_ADMIN}/intro-cards?categorySlug=${encodeURIComponent(categorySlug)}`)
      .then((x) => x.json())
      .catch(() => ({ cards: [] }));
    setRows((r as { cards?: Record<string, unknown>[] }).cards ?? []);
    setLoading(false);
  }, [categorySlug]);

  useEffect(() => { void load(); }, [load]);

  async function save() {
    const body = {
      categorySlug,
      title: form.title,
      description: form.description || null,
      imageUrl: form.imageUrl || null,
      linkUrl: form.linkUrl || null,
      placement: form.placement || "main",
      sectionTitle: form.sectionTitle || null,
      sectionDescription: form.sectionDescription || null,
      sortOrder: Number(form.sortOrder || 0),
      isActive: form.isActive !== "false",
      blogSlug: form.blogSlug || null,
    };
    if (editId) {
      await apiFetch(`${CMS_ADMIN}/intro-cards/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await apiFetch(`${CMS_ADMIN}/intro-cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    setForm({ placement: "main", sortOrder: "0", isActive: "true" });
    setEditId(null);
    void load();
  }

  async function remove(id: number) {
    if (!confirm("Intro kartı silinsin mi?")) return;
    await apiFetch(`${CMS_ADMIN}/intro-cards/${id}`, { method: "DELETE" });
    void load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <select className={sel + " w-auto"} value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)}>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <button type="button" onClick={() => void load()} className="text-sm text-blue-600 flex items-center gap-1">
          <RefreshCw size={14} /> Yenile
        </button>
        <p className="text-xs text-gray-500 w-full">
          Veritabanında kart yoksa site statik config kullanır. Sidebar kartları filtre kutusunun altında dikey gösterilir.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-2 p-4 bg-gray-50 rounded-xl border text-sm">
        <input className={inp} placeholder="Başlık *" value={form.title ?? ""} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        <select className={sel} value={form.placement ?? "main"} onChange={(e) => setForm((f) => ({ ...f, placement: e.target.value }))}>
          <option value="main">Üst intro alanı</option>
          <option value="sidebar">Sidebar promo (filtre altı)</option>
        </select>
        <input className={inp + " md:col-span-2"} placeholder="Açıklama" value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        <input className={inp + " md:col-span-2"} placeholder="Görsel URL (/turizm/category-intro/...)" value={form.imageUrl ?? ""} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} />
        <input className={inp} placeholder="Link URL (opsiyonel)" value={form.linkUrl ?? ""} onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))} />
        <input className={inp} placeholder="Blog slug (SEO sayfası)" value={form.blogSlug ?? ""} onChange={(e) => setForm((f) => ({ ...f, blogSlug: e.target.value }))} />
        <input className={inp} placeholder="Bölüm başlığı" value={form.sectionTitle ?? ""} onChange={(e) => setForm((f) => ({ ...f, sectionTitle: e.target.value }))} />
        <input className={inp} type="number" placeholder="Sıra" value={form.sortOrder ?? "0"} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} />
        <button type="button" onClick={() => void save()} className="md:col-span-2 bg-blue-600 text-white rounded-lg px-4 py-2 font-semibold">
          {editId ? "Güncelle" : "Intro kartı ekle"}
        </button>
      </div>

      {loading ? <p className="text-gray-400">Yükleniyor…</p> : (
        <div className="overflow-x-auto border rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left">Başlık</th>
                <th className="p-3 text-left">Yerleşim</th>
                <th className="p-3 text-left">Durum</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={String(r.id)} className="border-t">
                  <td className="p-3 font-medium">{String(r.title)}</td>
                  <td className="p-3">{String(r.placement)}</td>
                  <td className="p-3">{r.is_active ? "Aktif" : "Pasif"}</td>
                  <td className="p-3 text-right space-x-2">
                    <button type="button" onClick={() => { setEditId(Number(r.id)); setForm({
                      title: String(r.title ?? ""),
                      description: String(r.description ?? ""),
                      imageUrl: String(r.image_url ?? ""),
                      linkUrl: String(r.link_url ?? ""),
                      placement: String(r.placement ?? "main"),
                      sectionTitle: String(r.section_title ?? ""),
                      blogSlug: String(r.blog_slug ?? ""),
                      sortOrder: String(r.sort_order ?? 0),
                      isActive: r.is_active ? "true" : "false",
                    }); }} className="text-blue-600"><Pencil size={14} /></button>
                    <button type="button" onClick={() => void remove(Number(r.id))} className="text-red-600"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-gray-400">Bu kategori için DB kartı yok (statik config kullanılıyor)</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BannersPanel() {
  const [categorySlug, setCategorySlug] = useState("konaklama");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [form, setForm] = useState<Record<string, string>>({ sortOrder: "0", isActive: "true" });
  const [editId, setEditId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const r = await apiFetch(`${CMS_ADMIN}/banners?categorySlug=${encodeURIComponent(categorySlug)}`)
      .then((x) => x.json())
      .catch(() => ({ banners: [] }));
    setRows((r as { banners?: Record<string, unknown>[] }).banners ?? []);
  }, [categorySlug]);

  useEffect(() => { void load(); }, [load]);

  async function save() {
    const body = {
      categorySlug,
      imageUrl: form.imageUrl,
      linkUrl: form.linkUrl || null,
      title: form.title || null,
      sortOrder: Number(form.sortOrder || 0),
      isActive: form.isActive !== "false",
    };
    if (editId) {
      await apiFetch(`${CMS_ADMIN}/banners/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await apiFetch(`${CMS_ADMIN}/banners`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setForm({ sortOrder: "0", isActive: "true" });
    setEditId(null);
    void load();
  }

  async function remove(id: number) {
    if (!confirm("Banner silinsin mi?")) return;
    await apiFetch(`${CMS_ADMIN}/banners/${id}`, { method: "DELETE" });
    void load();
  }

  return (
    <div className="space-y-4">
      <select className={sel + " w-auto"} value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)}>
        {CATEGORY_OPTIONS.map((c) => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>
      <p className="text-xs text-gray-500">1 banner = %100 genişlik, 2 = %50+%50, 3 = üçte bir.</p>
      <div className="grid md:grid-cols-2 gap-2 p-4 bg-gray-50 rounded-xl border text-sm">
        <input className={inp + " md:col-span-2"} placeholder="Görsel URL *" value={form.imageUrl ?? ""} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} />
        <input className={inp} placeholder="Link URL" value={form.linkUrl ?? ""} onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))} />
        <input className={inp} placeholder="Başlık (opsiyonel)" value={form.title ?? ""} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        <button type="button" onClick={() => void save()} className="md:col-span-2 bg-blue-600 text-white rounded-lg px-4 py-2 font-semibold">
          {editId ? "Banner güncelle" : "Banner ekle"}
        </button>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={String(r.id)} className="flex items-center gap-3 border rounded-lg p-3">
            {r.image_url ? <img src={String(r.image_url)} alt="" className="w-24 h-14 object-cover rounded" /> : null}
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{String(r.title || r.image_url)}</div>
              <div className="text-xs text-gray-500">Sıra: {String(r.sort_order)}</div>
            </div>
            <button type="button" onClick={() => { setEditId(Number(r.id)); setForm({
              imageUrl: String(r.image_url ?? ""),
              linkUrl: String(r.link_url ?? ""),
              title: String(r.title ?? ""),
              sortOrder: String(r.sort_order ?? 0),
            }); }} className="text-blue-600"><Pencil size={14} /></button>
            <button type="button" onClick={() => void remove(Number(r.id))} className="text-red-600"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function BlogPanel() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [form, setForm] = useState<Record<string, string>>({ isPublished: "false", isFeatured: "false" });
  const [editId, setEditId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    const r = await apiFetch(`${CMS_ADMIN}/blog-posts`).then((x) => x.json()).catch(() => ({ posts: [] }));
    setRows((r as { posts?: Record<string, unknown>[] }).posts ?? []);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save() {
    const body = {
      title: form.title,
      slug: form.slug || undefined,
      metaTitle: form.metaTitle || form.title,
      metaDescription: form.metaDescription || null,
      excerpt: form.excerpt || null,
      bodyHtml: form.bodyHtml || null,
      coverImageUrl: form.coverImageUrl || null,
      categorySlug: form.categorySlug || null,
      isFeatured: form.isFeatured === "true",
      isPublished: form.isPublished === "true",
    };
    if (editId) {
      await apiFetch(`${CMS_ADMIN}/blog-posts/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await apiFetch(`${CMS_ADMIN}/blog-posts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setModalOpen(false);
    setEditId(null);
    setForm({ isPublished: "false", isFeatured: "false" });
    void load();
  }

  async function remove(id: number) {
    if (!confirm("Blog yazısı silinsin mi?")) return;
    await apiFetch(`${CMS_ADMIN}/blog-posts/${id}`, { method: "DELETE" });
    void load();
  }

  function openNew() {
    setEditId(null);
    setForm({ isPublished: "false", isFeatured: "false" });
    setModalOpen(true);
  }

  function openEdit(r: Record<string, unknown>) {
    setEditId(Number(r.id));
    setForm({
      title: String(r.title ?? ""),
      slug: String(r.slug ?? ""),
      metaTitle: String(r.meta_title ?? ""),
      metaDescription: String(r.meta_description ?? ""),
      excerpt: String(r.excerpt ?? ""),
      bodyHtml: String(r.body_html ?? ""),
      coverImageUrl: String(r.cover_image_url ?? ""),
      categorySlug: String(r.category_slug ?? ""),
      isFeatured: r.is_featured ? "true" : "false",
      isPublished: r.is_published ? "true" : "false",
    });
    setModalOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">Intro kart başlıkları <code className="text-xs">/turizm/blog/:slug</code> sayfalarına bağlanır.</p>
        <button type="button" onClick={openNew} className="inline-flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold">
          <Plus size={14} /> Yazı ekle
        </button>
      </div>
      <div className="overflow-x-auto border rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Başlık</th>
              <th className="p-3 text-left">Slug</th>
              <th className="p-3 text-left">Kategori</th>
              <th className="p-3 text-left">Manşet</th>
              <th className="p-3 text-left">Yayın</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)} className="border-t">
                <td className="p-3 font-medium">{String(r.title)}</td>
                <td className="p-3 text-gray-500">{String(r.slug)}</td>
                <td className="p-3">{String(r.category_slug || "—")}</td>
                <td className="p-3">{r.is_featured ? "✓" : "—"}</td>
                <td className="p-3">{r.is_published ? "Yayında" : "Taslak"}</td>
                <td className="p-3 text-right space-x-2">
                  <button type="button" onClick={() => openEdit(r)} className="text-blue-600"><Pencil size={14} /></button>
                  <button type="button" onClick={() => void remove(Number(r.id))} className="text-red-600"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen ? (
        <Modal title={editId ? "Blog yazısı düzenle" : "Yeni blog yazısı"} onClose={() => setModalOpen(false)}>
          <div className="grid gap-3 text-sm">
            <input className={inp} placeholder="Başlık *" value={form.title ?? ""} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <input className={inp} placeholder="Slug (boş = otomatik)" value={form.slug ?? ""} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
            <input className={inp} placeholder="Meta başlık" value={form.metaTitle ?? ""} onChange={(e) => setForm((f) => ({ ...f, metaTitle: e.target.value }))} />
            <input className={inp} placeholder="Meta açıklama" value={form.metaDescription ?? ""} onChange={(e) => setForm((f) => ({ ...f, metaDescription: e.target.value }))} />
            <textarea className={inp} rows={2} placeholder="Özet" value={form.excerpt ?? ""} onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))} />
            <textarea className={inp} rows={6} placeholder="HTML içerik" value={form.bodyHtml ?? ""} onChange={(e) => setForm((f) => ({ ...f, bodyHtml: e.target.value }))} />
            <input className={inp} placeholder="Kapak görseli URL" value={form.coverImageUrl ?? ""} onChange={(e) => setForm((f) => ({ ...f, coverImageUrl: e.target.value }))} />
            <select className={sel} value={form.categorySlug ?? ""} onChange={(e) => setForm((f) => ({ ...f, categorySlug: e.target.value }))}>
              <option value="">Kategori (genel)</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.isFeatured === "true"} onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked ? "true" : "false" }))} />
              Bölüm manşetine ekle
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.isPublished === "true"} onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked ? "true" : "false" }))} />
              Yayınla
            </label>
            <button type="button" onClick={() => void save()} className="bg-blue-600 text-white rounded-lg px-4 py-2 font-semibold">Kaydet</button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

export function TurizmCmsAdminTab() {
  const [sub, setSub] = useState<CmsSubTab>("intro");
  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b pb-2">
        {([
          ["intro", "Intro kartları"],
          ["banners", "Banner reklamları"],
          ["blog", "Blog / SEO sayfaları"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSub(id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${sub === id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {sub === "intro" ? <IntroCardsPanel /> : null}
      {sub === "banners" ? <BannersPanel /> : null}
      {sub === "blog" ? <BlogPanel /> : null}
    </div>
  );
}
