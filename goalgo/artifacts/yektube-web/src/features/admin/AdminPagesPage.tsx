import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import {
  adminCreateStaticPage,
  adminDeleteStaticPage,
  adminFetchStaticPages,
  adminUpdateStaticPage,
  type YektubeStaticPageAdmin,
} from "@/lib/adminApi";
import { ytRoutes } from "@/lib/routes";
import { AdminAlert, AdminBtn, AdminCard, AdminInput, AdminPageHeader } from "./ui/adminUi";

function pagePublicHref(slug: string): string {
  if (slug === "telif-kullanim") return ytRoutes.staticPage(slug);
  return ytRoutes.staticPageGeneric(slug);
}

function emptyDraft(): Partial<YektubeStaticPageAdmin> {
  return {
    slug: "",
    title: "",
    lastUpdated: "",
    body: "",
    sidebarLabel: "",
  };
}

export function AdminPagesPage() {
  const qc = useQueryClient();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Partial<YektubeStaticPageAdmin>>(emptyDraft());

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-static-pages"],
    queryFn: adminFetchStaticPages,
    retry: 1,
  });

  const pages = data?.pages ?? [];

  const startEdit = (page: YektubeStaticPageAdmin) => {
    setCreating(false);
    setEditingId(page.id);
    setDraft({
      slug: page.slug,
      title: page.title,
      lastUpdated: page.lastUpdated,
      body: page.body,
      sidebarLabel: page.sidebarLabel ?? "",
    });
    setMsg("");
  };

  const startCreate = () => {
    setCreating(true);
    setEditingId(null);
    setDraft(emptyDraft());
    setMsg("");
  };

  const cancelForm = () => {
    setCreating(false);
    setEditingId(null);
    setDraft(emptyDraft());
  };

  const save = async () => {
    setBusy(true);
    setMsg("");
    try {
      if (creating) {
        await adminCreateStaticPage({
          slug: draft.slug ?? "",
          title: draft.title ?? "",
          lastUpdated: draft.lastUpdated,
          body: draft.body,
          sidebarLabel: draft.sidebarLabel?.trim() || null,
        });
        setMsg("Sayfa oluşturuldu");
        setCreating(false);
      } else if (editingId) {
        await adminUpdateStaticPage(editingId, {
          slug: draft.slug,
          title: draft.title,
          lastUpdated: draft.lastUpdated,
          body: draft.body,
          sidebarLabel: draft.sidebarLabel?.trim() || null,
        });
        setMsg("Sayfa kaydedildi");
        setEditingId(null);
      }
      setDraft(emptyDraft());
      await qc.invalidateQueries({ queryKey: ["admin-static-pages"] });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Kaydedilemedi");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (page: YektubeStaticPageAdmin) => {
    if (!window.confirm(`"${page.title}" sayfası silinsin mi?`)) return;
    setBusy(true);
    setMsg("");
    try {
      await adminDeleteStaticPage(page.id);
      if (editingId === page.id) cancelForm();
      setMsg("Sayfa silindi");
      await qc.invalidateQueries({ queryKey: ["admin-static-pages"] });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Silinemedi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Sayfalar"
        description="YekTube statik sayfalarını (telif, kullanım şartları vb.) yönetin."
        actions={
          <AdminBtn variant="primary" onClick={startCreate} disabled={busy || creating}>
            <Plus className="mr-1.5 inline h-4 w-4" />
            Yeni sayfa
          </AdminBtn>
        }
      />

      {msg ? (
        <AdminAlert tone={msg.includes("Silinemedi") || msg.includes("Kaydedilemedi") ? "warn" : "success"}>
          {msg}
        </AdminAlert>
      ) : null}

      {(creating || editingId) && (
        <AdminCard
          title={creating ? "Yeni sayfa" : "Sayfayı düzenle"}
          description="Başlık, son güncelleme tarihi ve gövde metni (Markdown: ## başlık, ### alt başlık, - madde, **kalın**)."
          className="mb-6"
        >
          <div className="grid gap-4">
            <label className="block space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Slug (URL)</span>
              <AdminInput
                value={draft.slug ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
                placeholder="ornek-sayfa"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Başlık</span>
              <AdminInput
                value={draft.title ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Son güncelleme</span>
              <AdminInput
                value={draft.lastUpdated ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, lastUpdated: e.target.value }))}
                placeholder="29 Haziran 2026"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Sol menü etiketi (boş bırakılırsa menüde görünmez)
              </span>
              <AdminInput
                value={draft.sidebarLabel ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, sidebarLabel: e.target.value }))}
                placeholder="Telif & Kullanım"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Gövde metni</span>
              <textarea
                value={draft.body ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                rows={18}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-white focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/30"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <AdminBtn variant="primary" onClick={save} disabled={busy}>
                Kaydet
              </AdminBtn>
              <AdminBtn variant="secondary" onClick={cancelForm} disabled={busy}>
                İptal
              </AdminBtn>
            </div>
          </div>
        </AdminCard>
      )}

      {isLoading ? (
        <p className="text-sm text-zinc-500">Sayfalar yükleniyor…</p>
      ) : isError ? (
        <AdminAlert tone="warn">
          Sayfalar yüklenemedi ({error instanceof Error ? error.message : "hata"}). API sunucusunun güncellenmesi
          gerekebilir.
        </AdminAlert>
      ) : (
        <div className="space-y-3">
          {pages.map((page) => (
            <AdminCard key={page.id} title={page.title} description={`/${page.slug}`}>
              <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
                <span>Son güncelleme: {page.lastUpdated}</span>
                {page.sidebarLabel ? (
                  <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                    Menü: {page.sidebarLabel}
                  </span>
                ) : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <AdminBtn variant="secondary" onClick={() => startEdit(page)} disabled={busy}>
                  <Pencil className="mr-1.5 inline h-4 w-4" />
                  Düzenle
                </AdminBtn>
                <a href={pagePublicHref(page.slug)} target="_blank" rel="noopener noreferrer">
                  <AdminBtn variant="ghost" type="button">
                    <ExternalLink className="mr-1.5 inline h-4 w-4" />
                    Görüntüle
                  </AdminBtn>
                </a>
                {pages.length > 1 ? (
                  <AdminBtn variant="danger" onClick={() => remove(page)} disabled={busy}>
                    <Trash2 className="mr-1.5 inline h-4 w-4" />
                    Sil
                  </AdminBtn>
                ) : null}
              </div>
            </AdminCard>
          ))}
        </div>
      )}
    </div>
  );
}
