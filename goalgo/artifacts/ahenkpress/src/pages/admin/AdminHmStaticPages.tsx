import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Pencil } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  adminFetchHmStaticPages,
  adminUpdateHmStaticPage,
  type HmStaticPagePublic,
} from "@/lib/hmStaticPagesApi";
import { HM_TELIF_KULLANIM_SLUG } from "@/lib/hmTelifDefaults";

export default function AdminHmStaticPages() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<HmStaticPagePublic>>({});
  const [saving, setSaving] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-hm-static-pages"],
    queryFn: adminFetchHmStaticPages,
    retry: 1,
  });

  const pages = data?.pages ?? [];

  const startEdit = (page: HmStaticPagePublic) => {
    setEditingId(page.id);
    setDraft({
      slug: page.slug,
      title: page.title,
      lastUpdated: page.lastUpdated,
      body: page.body,
      menuLabel: page.menuLabel ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft({});
  };

  const save = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await adminUpdateHmStaticPage(editingId, {
        slug: draft.slug,
        title: draft.title,
        lastUpdated: draft.lastUpdated,
        body: draft.body,
        menuLabel: draft.menuLabel?.trim() || null,
      });
      toast({ title: "Kaydedildi" });
      cancelEdit();
      await qc.invalidateQueries({ queryKey: ["admin-hm-static-pages"] });
    } catch (e) {
      toast({
        title: "Kaydedilemedi",
        description: e instanceof Error ? e.message : "Hata",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="HM Telif Sayfaları">
      <div className="max-w-4xl space-y-6">
        <p className="text-sm text-slate-600">
          Haber Merkezi sitelerinde varsayılan telif / kullanım şartları metni. Site editörleri{" "}
          <strong>Editör → Sayfalar</strong> bölümünden slug <strong>{HM_TELIF_KULLANIM_SLUG}</strong> ile siteye özel
          içerik ekleyerek bu varsayılanı geçersiz kılabilir.
        </p>

        {isLoading ? (
          <p className="text-sm text-slate-500">Sayfalar yükleniyor…</p>
        ) : isError ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Sayfalar yüklenemedi. API sunucusunun güncellenmesi gerekebilir.
          </p>
        ) : (
          <div className="space-y-4">
            {pages.map((page) => (
              <div key={page.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                {editingId === page.id ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label>Slug (URL)</Label>
                        <Input
                          className="mt-1 font-mono text-sm"
                          value={draft.slug ?? ""}
                          onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Son güncelleme</Label>
                        <Input
                          className="mt-1"
                          value={draft.lastUpdated ?? ""}
                          onChange={(e) => setDraft((d) => ({ ...d, lastUpdated: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Başlık</Label>
                      <Input
                        className="mt-1"
                        value={draft.title ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Menü etiketi (footer)</Label>
                      <Input
                        className="mt-1"
                        value={draft.menuLabel ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, menuLabel: e.target.value }))}
                        placeholder="Telif & Kullanım"
                      />
                    </div>
                    <div>
                      <Label>Gövde (Markdown: ##, ###, -, **kalın**)</Label>
                      <Textarea
                        className="mt-1 min-h-[320px] font-mono text-xs"
                        value={draft.body ?? ""}
                        onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" onClick={save} disabled={saving}>
                        Kaydet
                      </Button>
                      <Button type="button" variant="outline" onClick={cancelEdit} disabled={saving}>
                        İptal
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-lg font-bold text-slate-900">{page.title}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      /{page.slug} · Son güncelleme: {page.lastUpdated}
                      {page.menuLabel ? ` · Menü: ${page.menuLabel}` : null}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => startEdit(page)}>
                        <Pencil className="mr-1.5 h-4 w-4" />
                        Düzenle
                      </Button>
                      <Button type="button" variant="ghost" size="sm" asChild>
                        <a href={`/${page.slug}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-1.5 h-4 w-4" />
                          Önizle (portal)
                        </a>
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
