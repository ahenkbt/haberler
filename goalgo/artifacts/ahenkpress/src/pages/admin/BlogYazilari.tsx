import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useListNews, useDeleteNews, getListNewsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit2, Trash2, FileText, Eye, Calendar } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { isBlogCategoryNews } from "@/lib/blogNews";

export default function BlogYazilari() {
  const { data: allNews, isLoading } = useListNews();
  const deleteNews = useDeleteNews();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const blogPosts =
    allNews?.items?.filter((n) => {
      const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase());
      return matchSearch && isBlogCategoryNews(n);
    }) ?? [];

  const handleDelete = (id: number) => {
    if (!confirm("Bu blog yazısını silmek istediğinize emin misiniz?")) return;
    deleteNews.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Blog yazısı silindi" });
          queryClient.invalidateQueries({ queryKey: getListNewsQueryKey() });
        },
      }
    );
  };

  return (
    <AdminLayout title="Blog Yazıları">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Blog Yazıları</h1>
          <p className="text-sm text-gray-500 mt-1">
            {blogPosts.length} yazı — merkez <code className="text-xs bg-gray-100 px-1 rounded">news</code> tablosunda,
            kategori <code className="text-xs bg-gray-100 px-1 rounded">blog</code>. Haber merkezi sitelerinde AHB ile
            gelen köşe metinleri <strong>hm_makaleler</strong> içindedir; site editörü → Blog veya Yönetim → AI Robot
            sayfasındaki AHB içe aktarma bağlantısından yönetilir.
          </p>
        </div>
        <Link href="/admin/haberler/yeni">
          <Button className="bg-[#e61e25] hover:bg-[#c9181e] text-white gap-2">
            <Plus className="w-4 h-4" />
            Yeni Blog Yazısı
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-md shadow-sm border">
        <div className="p-4 border-b flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Yazılarda ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-gray-500">Yükleniyor...</div>
        ) : blogPosts.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center gap-3">
            <FileText className="w-10 h-10 text-gray-300" />
            <h3 className="font-medium text-gray-700">Henüz blog yazısı yok</h3>
            <p className="text-sm text-gray-500">İlk blog yazınızı oluşturun</p>
          </div>
        ) : (
          <div className="divide-y">
            {blogPosts.map((post) => (
              <div
                key={post.id}
                className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                {post.imageUrl ? (
                  <img
                    src={post.imageUrl}
                    alt={post.title}
                    className="w-14 h-14 object-cover rounded-lg shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6 text-gray-400" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold uppercase"
                      style={{ color: post.categoryColor || "#e61e25", borderColor: post.categoryColor || "#e61e25" }}
                    >
                      {post.categoryName || "Genel"}
                    </Badge>
                    {post.isFeatured && (
                      <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">
                        Manşet
                      </Badge>
                    )}
                    {post.isBreaking && (
                      <Badge className="text-[10px] bg-red-100 text-red-700 border-red-200">
                        Son Dakika
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm line-clamp-1 text-gray-900">
                    {post.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {post.createdAt
                        ? format(new Date(post.createdAt), "d MMM yyyy", { locale: tr })
                        : "Tarih yok"}
                    </span>
                    {post.authorName && (
                      <span>{post.authorName}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <a href={`/haber/${post.id}`} target="_blank" rel="noreferrer">
                    <Button variant="ghost" size="sm" className="text-gray-500 hover:text-blue-600">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </a>
                  <Link href={`/admin/haberler/${post.id}/duzenle`}>
                    <Button variant="ghost" size="sm" className="text-gray-500 hover:text-blue-600">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-red-600"
                    onClick={() => handleDelete(post.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
