import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useListAuthors } from "@workspace/api-client-react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { apiFetch, apiUrl, ensureAdminPanelBootstrap, resolveClientMediaSrc } from "@/lib/apiBase";
import { useToast } from "@/hooks/use-toast";

type HmSiteRow = { id: number; slug: string; displayName: string; active: boolean };

type AuthorRow = {
  id: number;
  name: string;
  title?: string | null;
  avatarUrl?: string | null;
  hmSiteId?: number | null;
};

async function fetchHmSites(): Promise<{ items: HmSiteRow[] }> {
  await ensureAdminPanelBootstrap();
  const r = await apiFetch(apiUrl("/api/hm/sites"));
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

function editorGirisHref(slug: string, nextPath: string): string {
  const q = new URLSearchParams({
    slug: slug.trim().toLowerCase(),
    next: nextPath.startsWith("/editor") ? nextPath : "/editor/kose-yazarlari",
  });
  return `/editor/giris?${q.toString()}`;
}

export default function KoseYazarlari() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: authors, isLoading, queryKey } = useListAuthors();
  const { data: sitesData } = useQuery({
    queryKey: ["/api/hm/sites", "kose-yazarlari-slugs"],
    queryFn: fetchHmSites,
  });
  const siteSlugById = useMemo(() => {
    const m = new Map<number, string>();
    for (const s of sitesData?.items ?? []) {
      if (s.active) m.set(s.id, s.slug);
    }
    return m;
  }, [sitesData?.items]);
  const list = (Array.isArray(authors) ? authors : []) as AuthorRow[];
  const [picked, setPicked] = useState<Record<number, boolean>>({});
  const [busy, setBusy] = useState(false);

  const selectedIds = useMemo(() => list.filter((a) => picked[a.id]).map((a) => a.id), [list, picked]);
  const allPicked = list.length > 0 && list.every((a) => picked[a.id]);

  const deleteOne = async (id: number, name: string) => {
    if (!window.confirm(`“${name}” silinsin mi?`)) return;
    setBusy(true);
    try {
      await ensureAdminPanelBootstrap();
      const r = await apiFetch(apiUrl(`/api/authors/${id}`), { method: "DELETE" });
      if (!r.ok && r.status !== 204) {
        const t = await r.text().catch(() => "");
        toast({ title: "Silinemedi", description: t || `HTTP ${r.status}`, variant: "destructive" });
        return;
      }
      toast({ title: "Silindi", description: name });
      setPicked((p) => {
        const n = { ...p };
        delete n[id];
        return n;
      });
      await qc.invalidateQueries({ queryKey });
    } catch (e) {
      toast({
        title: "Bağlantı hatası",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.length === 0) {
      toast({ title: "Seçim yok", description: "En az bir yazar işaretleyin.", variant: "destructive" });
      return;
    }
    if (!window.confirm(`${selectedIds.length} yazarı silmek istediğinize emin misiniz?`)) return;
    setBusy(true);
    try {
      await ensureAdminPanelBootstrap();
      const r = await apiFetch(apiUrl("/api/authors/bulk-delete"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!r.ok || !j.ok) {
        toast({
          title: "Toplu silme başarısız",
          description: j.error || (await r.text().catch(() => "")),
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Silindi", description: `${selectedIds.length} yazar kaldırıldı.` });
      setPicked({});
      await qc.invalidateQueries({ queryKey });
    } catch (e) {
      toast({
        title: "Bağlantı hatası",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout title="Köşe Yazarları">
      <div className="bg-white rounded-md shadow-sm border p-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
          <div>
            <h2 className="text-lg font-bold">Köşe Yazarları</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              <strong>Sil</strong> bu tablodan yapılır. Haber merkezi sitesine bağlı yazarların <strong>düzenle</strong> bağlantısı
              ilgili site slug’ı ile <span className="font-mono text-xs">/editor/giris</span> üzerinden Köşe Yazarları sayfasına
              gider (editör hesabı gerekir). İçerik Havuzu yalnızca yazarları sitelere <em>atar</em>; silmez.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={busy || selectedIds.length === 0}
              onClick={() => void bulkDelete()}
            >
              Seçilenleri sil ({selectedIds.length})
            </Button>
            <Button
              className="bg-[#e61e25] hover:bg-[#c9181e] text-white"
              type="button"
              title="Yeni köşe yazarı: HM sitelerinde /editor/kose-yazarlari veya API POST /api/authors"
              onClick={() =>
                toast({
                  title: "Yeni yazar",
                  description:
                    "Merkez veya HM köşe yazarı eklemek için haber merkezi editöründeki Köşe Yazarları menüsünü veya API kullanın.",
                })
              }
            >
              <Plus className="w-4 h-4 mr-2" />
              Yeni Yazar
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allPicked}
                  onCheckedChange={(c) => {
                    const on = c === true;
                    const next: Record<number, boolean> = {};
                    if (on) for (const a of list) next[a.id] = true;
                    setPicked(next);
                  }}
                  aria-label="Tümünü seç"
                />
              </TableHead>
              <TableHead>YAZAR</TableHead>
              <TableHead>ÜNVAN</TableHead>
              <TableHead className="text-right">İŞLEMLER</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  Yükleniyor...
                </TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                  Yazar bulunamadı.
                </TableCell>
              </TableRow>
            ) : (
              list.map((author) => {
                const av = resolveClientMediaSrc(author.avatarUrl);
                const hmSid = author.hmSiteId;
                const hmSlug = typeof hmSid === "number" ? siteSlugById.get(hmSid) : undefined;
                return (
                  <TableRow key={author.id}>
                    <TableCell>
                      <Checkbox
                        checked={!!picked[author.id]}
                        onCheckedChange={(c) => setPicked((p) => ({ ...p, [author.id]: c === true }))}
                        aria-label={`Seç: ${author.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                          {av ? (
                            <img src={av} alt={author.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-gray-500 font-bold">{author.name.charAt(0)}</span>
                          )}
                        </div>
                        {author.name}
                      </div>
                    </TableCell>
                    <TableCell>{author.title || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {hmSlug ? (
                          <Button variant="ghost" size="icon" type="button" title="HM editör — Köşe Yazarları" asChild>
                            <a href={editorGirisHref(hmSlug, "/editor/kose-yazarlari")} target="_blank" rel="noreferrer">
                              <Edit2 className="w-4 h-4" />
                            </a>
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            title="Merkez (Yekpare) yazarları: fotoğraf için Medya yükleyip bu listeden silip yeniden ekleyin veya API kullanın"
                            onClick={() =>
                              toast({
                                title: "Düzenleme",
                                description:
                                  "Bu kayıt bir HM sitesine bağlı değil. Profil için genelde HM editör veya yazar API’si kullanılır.",
                              })
                            }
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600"
                          disabled={busy}
                          onClick={() => void deleteOne(author.id, author.name)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </AdminLayout>
  );
}
