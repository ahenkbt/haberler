import { postAdminJson, adminFetchErrorHint } from "@/lib/apiBase";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  getListRssCampaignsQueryKey,
  useDeleteRssCampaign,
  useListRssCampaigns,
} from "@workspace/api-client-react";
import { Plus, Play, Loader2, FileText, Settings, Trash2, Wrench } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function RssKampanyalari() {
  const qc = useQueryClient();
  const { data: campaigns, isLoading, refetch } = useListRssCampaigns();
  const { toast } = useToast();
  const [running, setRunning] = useState<number | null>(null);
  const [repairingTitles, setRepairingTitles] = useState(false);

  const deleteMut = useDeleteRssCampaign({
    mutation: {
      onSuccess: async () => {
        await qc.invalidateQueries({ queryKey: getListRssCampaignsQueryKey() });
        toast({ title: "Kampanya silindi" });
      },
      onError: (e) =>
        toast({
          title: "Silinemedi",
          description: e instanceof Error ? e.message : undefined,
          variant: "destructive",
        }),
    },
  });

  const handleDelete = (id: number, name: string) => {
    if (
      !confirm(
        `"${name}" kampanyası kalıcı olarak silinsin mi? İlgili RSS ayarları kaldırılır; eklenmiş haberler silinmez.`,
      )
    ) {
      return;
    }
    deleteMut.mutate({ id });
  };

  const handleRun = async (id: number, name: string) => {
    if (!confirm(`"${name}" kampanyası çalıştırılsın mı?`)) return;
    setRunning(id);
    try {
      const res = await postAdminJson(`/api/rss/campaigns/${id}/run`, {});
      let data: { added?: number; skipped?: number; message?: string; error?: string };
      try {
        data = await res.json();
      } catch {
        const hint = adminFetchErrorHint(String(res.status));
        toast({
          title: "Bağlantı hatası",
          description: `Sunucu yanıtı okunamadı (HTTP ${res.status}).${hint}`,
          variant: "destructive",
        });
        return;
      }
      if (res.ok) {
        const accepted = res.status === 202 || (data as { accepted?: boolean }).accepted === true;
        toast({
          title: accepted ? `"${name}" arka planda çalıştırılıyor` : `"${name}" kampanyası çalıştırıldı`,
          description:
            data.message ||
            (accepted
              ? "Sonuç için birkaç dakika sonra İşlem Logları ve EKLENEN sütununu kontrol edin."
              : `${data.added ?? 0} yeni haber eklendi.`),
        });
        if (!accepted) refetch();
        else {
          setTimeout(() => void refetch(), 8000);
        }
      } else {
        toast({
          title: "Hata",
          description: data.error || data.message || "Kampanya çalıştırılamadı.",
          variant: "destructive",
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Bağlantı kurulamadı";
      toast({
        title: "Bağlantı hatası",
        description: `${msg}${adminFetchErrorHint(msg)}`,
        variant: "destructive",
      });
    } finally {
      setRunning(null);
    }
  };

  const handleRepairTitles = async () => {
    if (
      !confirm(
        "Bozuk RSS başlıkları kaynak URL'den geri yüklensin mi? (Savunma gündemi / Denizden gibi sahte önekler temizlenir.)",
      )
    ) {
      return;
    }
    setRepairingTitles(true);
    try {
      const res = await postAdminJson("/api/rss/repair-import-titles", { limit: 200 });
      const data = await res.json();
      if (res.ok) {
        toast({
          title: "RSS başlıkları onarıldı",
          description: `${data.fixed ?? 0} haber düzeltildi, ${data.failed ?? 0} başarısız.`,
        });
      } else {
        toast({
          title: "Onarım başarısız",
          description: data.error || "Başlıklar düzeltilemedi.",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Bağlantı hatası", variant: "destructive" });
    } finally {
      setRepairingTitles(false);
    }
  };

  return (
    <AdminLayout title="RSS Kampanyaları">
      <div className="bg-[#0b1328] text-white p-6 rounded-t-md flex justify-between items-center">
        <div>
          <div className="bg-[#e61e25] text-white text-[10px] font-bold px-2 py-1 rounded inline-block mb-2">AHENK HABER BOTU</div>
          <h1 className="text-2xl font-bold">RSS Kampanya Yönetimi</h1>
          <p className="text-sm text-zinc-400 mt-1">
            RSS ve Haberler.com kazıma kampanyalarını yönetin. Haberler.com için kampanyada kaynak tipi:{" "}
            <strong className="text-zinc-200">Haberler.com Kazıma</strong>. Eklenen haberler{" "}
            <code className="text-[10px] text-zinc-300">news</code> tablosuna yazılır; düzenlemek için{" "}
            <Link href="/admin/haberler" className="text-red-300 hover:underline">
              Haberler
            </Link>{" "}
            veya henüz aktarılmamış hibrit RSS için{" "}
            <Link href="/admin/rss-haberleri" className="text-red-300 hover:underline">
              RSS Haberleri
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="bg-white p-4 border-x border-b shadow-sm rounded-b-md">
        <div className="flex flex-wrap gap-2 mb-6">
          <Button asChild className="bg-[#e61e25] hover:bg-[#c9181e] text-white rounded-full">
            <Link href="/admin/rss-kampanyalari/yeni">
              <Plus className="w-4 h-4 mr-2" />
              Yeni Kampanya Ekle
            </Link>
          </Button>
          <Button variant="outline" className="rounded-full gap-2" asChild>
            <Link href="/admin/rss-kampanyalari/loglar">
              <FileText className="w-4 h-4" />
              İşlem Logları
            </Link>
          </Button>
          <Button variant="outline" className="rounded-full gap-2" asChild>
            <Link href="/admin/ai-icerik-robotu">
              <Settings className="w-4 h-4" />
              Bot Ayarları
            </Link>
          </Button>
          <Button
            variant="outline"
            className="rounded-full gap-2"
            disabled={repairingTitles}
            onClick={handleRepairTitles}
          >
            {repairingTitles ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
            {repairingTitles ? "Onarılıyor..." : "Bozuk Başlıkları Onar"}
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
            ) : (campaigns?.items ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  Henüz kampanya bulunmuyor.{" "}
                  <Link href="/admin/rss-kampanyalari/yeni" className="text-red-600 hover:underline">
                    İlk kampanyayı ekle
                  </Link>
                </TableCell>
              </TableRow>
            ) : (
              (campaigns?.items ?? []).map(camp => (
                <TableRow key={camp.id}>
                  <TableCell className="text-xs text-gray-400">#{camp.id}</TableCell>
                  <TableCell className="font-medium">{camp.name}</TableCell>
                  <TableCell>
                    <Badge variant={camp.active ? "default" : "secondary"}
                      className={camp.active ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}>
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
                        disabled={running === camp.id || deleteMut.isPending}
                      >
                        {running === camp.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Play className="w-3.5 h-3.5" />
                        )}
                        {running === camp.id ? "Çalışıyor..." : "Çalıştır"}
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/rss-kampanyalari/${camp.id}/duzenle`}>Düzenle</Link>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 gap-1.5"
                        onClick={() => handleDelete(camp.id, camp.name)}
                        disabled={deleteMut.isPending || running === camp.id}
                        title="Kampanyayı sil"
                      >
                        {deleteMut.isPending && deleteMut.variables?.id === camp.id ? (
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
    </AdminLayout>
  );
}
