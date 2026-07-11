import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useListNews, useUpdateNews, useDeleteNews, getListNewsQueryKey } from "@workspace/api-client-react";
import { Switch } from "@/components/ui/switch";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Trash2, AlertCircle } from "lucide-react";

export default function BantYonetimi() {
  const { data: breaking, isLoading } = useListNews({ limit: 100 });
  const updateNews = useUpdateNews();
  const deleteNews = useDeleteNews();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const breakingItems = breaking?.items?.filter(n => n.isBreaking) ?? [];
  const allItems = breaking?.items ?? [];

  const toggleBreaking = (newsItem: any, checked: boolean) => {
    updateNews.mutate({
      id: newsItem.id,
      data: { ...newsItem, isBreaking: checked }
    }, {
      onSuccess: () => {
        toast({ title: checked ? "Son Dakika bandına eklendi" : "Son Dakika bandından çıkarıldı" });
        queryClient.invalidateQueries({ queryKey: getListNewsQueryKey() });
      }
    });
  };

  const handleDelete = (id: number, title: string) => {
    if (!confirm(`"${title.slice(0, 50)}" haberini silmek istediğinize emin misiniz?`)) return;
    deleteNews.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Haber silindi" });
        queryClient.invalidateQueries({ queryKey: getListNewsQueryKey() });
      }
    });
  };

  return (
    <AdminLayout title="Bant Yönetimi">
      <div className="space-y-6">
        {/* Active Breaking News Section */}
        <div className="bg-red-50 border border-red-200 p-4 rounded-md">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-bold text-red-800">Aktif Son Dakika Bandı ({breakingItems.length})</h2>
          </div>
          <p className="mb-3 text-sm text-red-700">
            Burada işaretlenen haberler kurumsal temada manuel sliderın hemen altındaki haber bandında gösterilir.
          </p>
          {breakingItems.length === 0 ? (
            <p className="text-sm text-red-600">Şu anda son dakika bandında haber yok.</p>
          ) : (
            <div className="space-y-2">
              {breakingItems.map(news => (
                <div key={news.id} className="flex items-center justify-between bg-white rounded border border-red-200 px-4 py-2">
                  <span className="text-sm font-medium flex-1 mr-3 truncate">{news.title}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={true} onCheckedChange={(v) => toggleBreaking(news, v)} />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:bg-red-100"
                      onClick={() => handleDelete(news.id, news.title)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All News Table */}
        <div className="bg-white p-4 rounded-md shadow-sm border">
          <h2 className="text-xl font-bold mb-4">Tüm Haberler — Son Dakika Bandı Kontrolü</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">ID</TableHead>
                <TableHead>BAŞLIK</TableHead>
                <TableHead>KATEGORİ</TableHead>
                <TableHead>TARİH</TableHead>
                <TableHead className="text-center">SON DAKİKA</TableHead>
                <TableHead className="text-right">İŞLEM</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">Yükleniyor...</TableCell>
                </TableRow>
              ) : allItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Haber bulunamadı.</TableCell>
                </TableRow>
              ) : (
                allItems.map(news => (
                  <TableRow key={news.id} className={news.isBreaking ? "bg-red-50" : ""}>
                    <TableCell className="text-xs text-gray-400">#{news.id}</TableCell>
                    <TableCell className="font-medium max-w-xs truncate">{news.title}</TableCell>
                    <TableCell className="text-sm text-gray-500">{news.categoryName || news.categorySlug || "-"}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(news.createdAt).toLocaleDateString("tr-TR")}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={!!news.isBreaking}
                        onCheckedChange={(v) => toggleBreaking(news, v)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700"
                        onClick={() => handleDelete(news.id, news.title)}
                        title="Haberi Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
