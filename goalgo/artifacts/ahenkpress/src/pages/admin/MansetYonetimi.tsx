import { AdminLayout } from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, asArray } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState } from "react";
import {
  GripVertical,
  ImageIcon,
  Save,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
} from "lucide-react";

export default function MansetYonetimi() {
  const qc = useQueryClient();

  const [settings, setSettings] = useState({
    sliderCount: "5",
    autoplaySpeed: "5",
    sliderSize: "large",
  });

  const { data: newsData, isLoading } = useQuery({
    queryKey: ["/api/news"],
    queryFn: () => apiRequest("/api/news?limit=30&status=published"),
  });

  const news = asArray((newsData as { items?: unknown } | undefined)?.items);

  const [featured, setFeatured] = useState<number[]>([]);
  const [initialized, setInitialized] = useState(false);

  if (!initialized && news.length > 0) {
    setFeatured(news.slice(0, 5).map((n: any) => n.id));
    setInitialized(true);
  }

  const toggleFeatured = (id: number) => {
    setFeatured((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]
    );
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const copy = [...featured];
    [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
    setFeatured(copy);
  };

  const moveDown = (index: number) => {
    if (index === featured.length - 1) return;
    const copy = [...featured];
    [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
    setFeatured(copy);
  };

  const featuredNews = featured
    .map((id) => news.find((n: any) => n.id === id))
    .filter(Boolean);

  const nonFeaturedNews = news.filter(
    (n: any) => !featured.includes(n.id)
  );

  return (
    <AdminLayout title="Manşet Yönetimi">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manşet Yönetimi</h1>
            <p className="text-gray-500 text-sm mt-1">
              Ana sayfada gösterilecek manşet haberleri ve slider ayarlarını yapılandırın.
            </p>
          </div>
          <Button className="bg-primary hover:bg-primary/90" onClick={() => alert("Kaydedildi!")}>
            <Save className="w-4 h-4 mr-2" />
            Kaydet
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Slider Settings */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Slider Ayarları</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Ana Slider Haber Sayısı</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={settings.sliderCount}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, sliderCount: e.target.value }))
                    }
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-400 mt-1">Slider'da gösterilecek maksimum haber sayısı</p>
                </div>

                <div>
                  <Label>Geçiş Süresi (Saniye)</Label>
                  <Input
                    type="number"
                    min={2}
                    max={15}
                    value={settings.autoplaySpeed}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, autoplaySpeed: e.target.value }))
                    }
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-400 mt-1">Otomatik geçiş süresi</p>
                </div>

                <div>
                  <Label>Slider Boyutu</Label>
                  <Select
                    value={settings.sliderSize}
                    onValueChange={(v) =>
                      setSettings((s) => ({ ...s, sliderSize: v }))
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Küçük</SelectItem>
                      <SelectItem value="medium">Orta</SelectItem>
                      <SelectItem value="large">Büyük</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3 bg-blue-50 rounded-md text-xs text-blue-700">
                  <strong>{featured.length}</strong> haber manşette gösterilecek.<br />
                  Sıralamayı aşağıdaki listeden değiştirebilirsiniz.
                </div>
              </CardContent>
            </Card>

            {/* All news list to toggle */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tüm Haberler</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Yükleniyor...
                  </div>
                ) : (
                  <div className="space-y-1 max-h-80 overflow-y-auto">
                    {nonFeaturedNews.map((n: any) => (
                      <div
                        key={n.id}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded text-sm cursor-pointer group"
                        onClick={() => toggleFeatured(n.id)}
                      >
                        <div className="w-10 h-10 rounded bg-gray-100 flex-shrink-0 overflow-hidden">
                          {n.imageUrl ? (
                            <img src={n.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-gray-400 m-3" />
                          )}
                        </div>
                        <span className="flex-1 line-clamp-2 leading-tight">{n.title}</span>
                        <EyeOff className="w-4 h-4 text-gray-300 group-hover:text-primary" />
                      </div>
                    ))}
                    {nonFeaturedNews.length === 0 && (
                      <p className="text-gray-400 text-xs text-center py-4">Tüm haberler manşette</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Featured order */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  Manşet Sırası
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {featuredNews.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Soldan haber seçin</p>
                    </div>
                  )}
                  {featuredNews.map((n: any, idx: number) => (
                    <div
                      key={n.id}
                      className="flex items-center gap-3 p-3 bg-white border rounded-lg hover:border-primary/30 transition-colors"
                    >
                      <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => moveUp(idx)}
                          disabled={idx === 0}
                          className="p-0.5 hover:bg-gray-100 rounded disabled:opacity-30"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveDown(idx)}
                          disabled={idx === featuredNews.length - 1}
                          className="p-0.5 hover:bg-gray-100 rounded disabled:opacity-30"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                      <Badge className="bg-primary/10 text-primary border-0 font-bold min-w-[24px] justify-center">
                        {idx + 1}
                      </Badge>
                      <div className="w-16 h-12 rounded bg-gray-100 flex-shrink-0 overflow-hidden">
                        {n.imageUrl ? (
                          <img src={n.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-gray-400 m-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-2 leading-tight">{n.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {n.category?.name ?? "—"}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleFeatured(n.id)}
                        className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <EyeOff className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
