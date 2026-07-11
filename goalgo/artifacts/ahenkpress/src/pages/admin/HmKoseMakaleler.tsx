import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { apiFetch, apiUrl, ensureAdminPanelBootstrap } from "@/lib/apiBase";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ExternalLink, Pencil, RefreshCw, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type HmSiteRow = { id: number; slug: string; displayName: string; active: boolean };

type MakaleRow = {
  id: number;
  siteId: number;
  title: string;
  slug: string;
  status: string;
  authorName?: string | null;
  createdAt: string;
};

async function fetchHmSites(): Promise<{ items: HmSiteRow[] }> {
  await ensureAdminPanelBootstrap();
  const r = await apiFetch(apiUrl("/api/hm/sites"));
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function fetchAdminMakaleler(siteId: number): Promise<{ items: MakaleRow[] }> {
  await ensureAdminPanelBootstrap();
  const q = new URLSearchParams({ siteId: String(siteId), limit: "500" });
  const r = await apiFetch(apiUrl(`/api/hm/admin/makaleler?${q}`));
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

function editorGirisHref(slug: string, nextPath: string): string {
  const q = new URLSearchParams({
    slug: slug.trim().toLowerCase(),
    next: nextPath.startsWith("/editor") ? nextPath : "/editor/makaleler",
  });
  return `/editor/giris?${q.toString()}`;
}

export default function HmKoseMakaleler() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { data: sitesData, isLoading: sitesLoading, error: sitesError } = useQuery({
    queryKey: ["/api/hm/sites", "admin-makaleler"],
    queryFn: fetchHmSites,
  });
  const sites = useMemo(() => (sitesData?.items ?? []).filter((s) => s.active), [sitesData?.items]);
  const [siteId, setSiteId] = useState<number | null>(null);

  const effectiveSiteId = siteId ?? sites[0]?.id ?? null;

  const {
    data: makData,
    isLoading: makLoading,
    error: makError,
    refetch: refetchMak,
    isFetching: makFetching,
  } = useQuery({
    queryKey: ["/api/hm/admin/makaleler", effectiveSiteId],
    queryFn: () => fetchAdminMakaleler(effectiveSiteId!),
    enabled: effectiveSiteId != null,
  });

  const items = makData?.items ?? [];
  const selectedSlug = sites.find((s) => s.id === effectiveSiteId)?.slug ?? "";

  const deleteMakale = async (makaleId: number) => {
    if (effectiveSiteId == null) return;
    if (!window.confirm(`Köşe makalesi #${makaleId} kalıcı olarak silinsin mi?`)) return;
    setDeletingId(makaleId);
    try {
      await ensureAdminPanelBootstrap();
      const q = new URLSearchParams({ siteId: String(effectiveSiteId) });
      const r = await apiFetch(apiUrl(`/api/hm/admin/makaleler/${makaleId}?${q}`), { method: "DELETE" });
      if (!r.ok && r.status !== 204) {
        const t = await r.text().catch(() => "");
        toast({ title: "Silinemedi", description: t || `HTTP ${r.status}`, variant: "destructive" });
        return;
      }
      toast({ title: "Silindi", description: `Makale #${makaleId}` });
      await qc.invalidateQueries({ queryKey: ["/api/hm/admin/makaleler", effectiveSiteId] });
    } catch (e) {
      toast({
        title: "Bağlantı hatası",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout title="Köşe makaleleri (HM)">
      <div className="space-y-4">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-5">
          <h1 className="text-lg font-bold text-gray-900">Köşe makaleleri (HM)</h1>
          <p className="text-sm text-gray-600 mt-1 max-w-3xl">
            Her haber merkezi sitesindeki AHB köşe kayıtları (<code className="text-xs bg-gray-100 px-1 rounded">hm_makaleler</code>
            ). <strong>Silme</strong> aşağıdaki tablodan yapılabilir. <strong>Metin / görsel düzenleme</strong> için ilgili sitenin{" "}
            <strong>editör hesabı</strong> ile <span className="font-mono text-xs">/editor/makaleler</span> (açılan bağlantı önce
            giriş ekranına götürür) kullanın.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="min-w-[220px]">
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Haber sitesi</p>
              {sitesLoading ? (
                <p className="text-sm text-muted-foreground">Siteler yükleniyor…</p>
              ) : sites.length === 0 ? (
                <p className="text-sm text-amber-800">Aktif HM sitesi yok.</p>
              ) : (
                <Select
                  value={effectiveSiteId != null ? String(effectiveSiteId) : ""}
                  onValueChange={(v) => setSiteId(parseInt(v, 10))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Site seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.displayName} ({s.slug})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 mt-6 sm:mt-0"
              disabled={effectiveSiteId == null || makFetching}
              onClick={() => void refetchMak()}
            >
              <RefreshCw className={`h-4 w-4 ${makFetching ? "animate-spin" : ""}`} />
              Yenile
            </Button>
          </div>
          {sitesError ? (
            <p className="text-sm text-red-600 mt-2">{sitesError instanceof Error ? sitesError.message : String(sitesError)}</p>
          ) : null}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-0 overflow-hidden">
          <div className="border-b px-4 py-3 flex items-center justify-between bg-gray-50/80">
            <p className="text-sm font-semibold text-gray-800">Liste</p>
            {effectiveSiteId != null && selectedSlug ? (
              <a
                className="text-xs font-semibold text-red-600 hover:underline inline-flex items-center gap-1"
                href={`/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(selectedSlug)}/kategori/blog`}
                target="_blank"
                rel="noreferrer"
              >
                Vitrinde blog
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
          {makError ? (
            <p className="p-4 text-sm text-red-600">
              {makError instanceof Error ? makError.message : String(makError)}
            </p>
          ) : effectiveSiteId == null ? (
            <p className="p-6 text-sm text-muted-foreground text-center">Önce bir site seçin.</p>
          ) : makLoading && items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">Yükleniyor…</p>
          ) : items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">Bu sitede köşe makalesi yok.</p>
          ) : (
            <div className="overflow-x-auto max-h-[min(70vh,720px)] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80">
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Başlık</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Yazar</TableHead>
                    <TableHead className="whitespace-nowrap">Tarih</TableHead>
                    <TableHead className="text-right">Bağlantı</TableHead>
                    <TableHead className="text-right w-[140px]">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs text-muted-foreground">{m.id}</TableCell>
                      <TableCell>
                        <div className="font-medium text-gray-900 line-clamp-2">{m.title}</div>
                        <div className="text-xs text-muted-foreground font-mono">{m.slug}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.status === "published" ? "default" : "secondary"}>{m.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{m.authorName ?? "—"}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                        {format(new Date(m.createdAt), "dd.MM.yyyy HH:mm", { locale: tr })}
                      </TableCell>
                      <TableCell className="text-right">
                        {selectedSlug ? (
                          <a
                            className="text-xs font-semibold text-red-600 hover:underline inline-flex items-center gap-1"
                            href={`/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(selectedSlug)}/haber/${m.id}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Görüntüle
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {selectedSlug ? (
                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                              <a
                                href={editorGirisHref(selectedSlug, `/editor/makaleler/${m.id}/duzenle`)}
                                target="_blank"
                                rel="noreferrer"
                                title="Editörde düzenle (giriş gerekir)"
                              >
                                <Pencil className="h-4 w-4" />
                              </a>
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                            title="Kalıcı sil"
                            disabled={deletingId === m.id}
                            onClick={() => void deleteMakale(m.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
