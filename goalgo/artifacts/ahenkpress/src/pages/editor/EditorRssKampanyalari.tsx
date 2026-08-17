import { EditorLayout } from "@/components/EditorLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Play, Loader2, FileText, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useHmEditor } from "@/contexts/HmEditorContext";
import { hmEditorJson, hmEditorRequest } from "@/lib/hmEditorApi";
import { HM_EDITOR_RSS_CAMPAIGNS_QUERY_KEY } from "@/lib/hmEditorQueryKeys";

type RssCampaignRow = {
  id: number;
  name: string;
  active: boolean;
  categorySlug: string;
  intervalMinutes: number;
  addedCount?: number;
  lastRunAt?: string | null;
};

type CampaignList = {
  items?: RssCampaignRow[];
};

export default function EditorRssKampanyalari() {
  const { site } = useHmEditor();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [running, setRunning] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: [...HM_EDITOR_RSS_CAMPAIGNS_QUERY_KEY],
    queryFn: () => hmEditorJson<CampaignList>("/api/hm/editor/rss/campaigns"),
  });
  const campaigns = data?.items ?? [];

  const handleDelete = async (id: number, name: string) => {
    if (
      !confirm(
        `"${name}" kampanyası kalıcı olarak silinsin mi? İlgili RSS ayarları kaldırılır; eklenmiş haberler silinmez.`,
      )
    ) {
      return;
    }
    setDeletingId(id);
    try {
      await hmEditorJson(`/api/hm/editor/rss/campaigns/${id}`, { method: "DELETE" });
      await qc.invalidateQueries({ queryKey: [...HM_EDITOR_RSS_CAMPAIGNS_QUERY_KEY] });
      toast({ title: "Kampanya silindi" });
    } catch (e) {
      toast({
        title: "Silinemedi",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleRun = async (id: number, name: string) => {
    if (!confirm(`"${name}" kampanyası çalıştırılsın mı? Haberler ${site?.displayName || "bu siteye"} eklenecek.`)) {
      return;
    }
    setRunning(id);
    try {
      const res = await hmEditorRequest(`/api/hm/editor/rss/campaigns/${id}/run`, {
        method: "POST",
        body: "{}",
      });
      let dataJson: { added?: number; skipped?: number; message?: string; error?: string; accepted?: boolean } = {};
      try {
        dataJson = (await res.json()) as typeof dataJson;
      } catch {
        toast({
          title: "Bağlantı hatası",
          description: `Sunucu yanıtı okunamadı (HTTP ${res.status}).`,
          variant: "destructive",
        });
        return;
      }
      if (res.ok) {
        const accepted = res.status === 202 || dataJson.accepted === true;
        toast({
          title: accepted ? `"${name}" arka planda çalıştırılıyor` : `"${name}" kampanyası çalıştırıldı`,
          description:
            dataJson.message ||
            (accepted
              ? "Sonuç için birkaç dakika sonra İşlem Logları ve EKLENEN sütununu kontrol edin."
              : `${dataJson.added ?? 0} yeni haber eklendi.`),
        });
        if (!accepted) void refetch();
        else setTimeout(() => void refetch(), 8000);
      } else {
        toast({
          title: "Hata",
          description: dataJson.error || dataJson.message || "Kampanya çalıştırılamadı.",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "Bağlantı hatası",
        description: e instanceof Error ? e.message : "Bağlantı kurulamadı",
        variant: "destructive",
      });
    } finally {
      setRunning(null);
    }
  };

  return (
    <EditorLayout title="RSS Kampanyaları">
      <div className="bg-[#0b1328] text-white p-6 rounded-t-md flex justify-between items-center">
        <div>
          <div className="bg-[#e61e25] text-white text-[10px] font-bold px-2 py-1 rounded inline-block mb-2">
            RSS KAMPANYALARI
          </div>
          <h1 className="text-2xl font-bold">RSS Kampanya Yönetimi</h1>
          <p className="text-sm text-zinc-400 mt-1">
            RSS ve Haberler.com kaynaklarından {site?.displayName || "bu siteye"} haber ekleyin. Eklenen haberler{" "}
            <Link href="/editor/haberler" className="text-red-300 hover:underline">
              Haberler
            </Link>{" "}
            listesinde görünür.
          </p>
        </div>
      </div>

      <div className="bg-white p-4 border-x border-b shadow-sm rounded-b-md">
        <div className="flex flex-wrap gap-2 mb-6">
          <Button asChild className="bg-[#e61e25] hover:bg-[#c9181e] text-white rounded-full">
            <Link href="/editor/rss-kampanyalari/yeni">
              <Plus className="w-4 h-4 mr-2" />
              Yeni Kampanya Ekle
            </Link>
          </Button>
          <Button variant="outline" className="rounded-full gap-2" asChild>
            <Link href="/editor/rss-kampanyalari/loglar">
              <FileText className="w-4 h-4" />
              İşlem Logları
            </Link>
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">ID</TableHead>
              <TableHead>KAMPANYA ADI</TableHead>
              <TableHead>DURUM</TableHead>
              <TableHead>KATEGORİ</TableHead>
              <TableHead>ARALIK</TableHead>
              <TableHead>EKLENEN</TableHead>
              <TableHead>SON ÇALIŞMA</TableHead>
              <TableHead className="text-right">İŞLEMLER</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : campaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  Henüz kampanya bulunmuyor.{" "}
                  <Link href="/editor/rss-kampanyalari/yeni" className="text-red-600 hover:underline">
                    İlk kampanyayı ekle
                  </Link>
                </TableCell>
              </TableRow>
            ) : (
              campaigns.map((camp) => (
                <TableRow key={camp.id}>
                  <TableCell className="text-xs text-gray-400">#{camp.id}</TableCell>
                  <TableCell className="font-medium">{camp.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={camp.active ? "default" : "secondary"}
                      className={camp.active ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
                    >
                      {camp.active ? "Aktif" : "Pasif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{camp.categorySlug || "-"}</TableCell>
                  <TableCell className="text-sm">{camp.intervalMinutes} dk</TableCell>
                  <TableCell className="text-sm font-bold text-green-700">{camp.addedCount ?? 0}</TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {camp.lastRunAt ? new Date(camp.lastRunAt).toLocaleString("tr-TR") : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-[#e61e25] hover:bg-[#c9181e] text-white gap-1.5"
                        onClick={() => handleRun(camp.id, camp.name)}
                        disabled={running === camp.id || deletingId === camp.id}
                      >
                        {running === camp.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Play className="w-3.5 h-3.5" />
                        )}
                        {running === camp.id ? "Çalışıyor..." : "Çalıştır"}
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/editor/rss-kampanyalari/${camp.id}/duzenle`}>Düzenle</Link>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 gap-1.5"
                        onClick={() => void handleDelete(camp.id, camp.name)}
                        disabled={deletingId === camp.id || running === camp.id}
                        title="Kampanyayı sil"
                      >
                        {deletingId === camp.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        Sil
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </EditorLayout>
  );
}
