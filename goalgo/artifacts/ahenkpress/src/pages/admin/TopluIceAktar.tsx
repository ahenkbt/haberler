import { apiUrl } from "@/lib/apiBase";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useListCategories } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Upload, FileText, Rss, Loader2, CheckCircle, AlertCircle, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ImportResult { success: number; failed: number; errors: string[]; }

export default function TopluIceAktar() {
  const { data: categories } = useListCategories();
  const { toast } = useToast();

  const [csvText, setCsvText] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [rssUrl, setRssUrl] = useState("");
  const [rssCategory, setRssCategory] = useState("");
  const [rssMax, setRssMax] = useState("10");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleCsvImport = async () => {
    const lines = csvText.trim().split("\n").filter(l => l.trim());
    if (lines.length < 2) { toast({ title: "En az 1 veri satırı gerekli (başlık + veri)", variant: "destructive" }); return; }

    setLoading(true);
    setResult(null);
    const errors: string[] = [];
    let success = 0;

    const header = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));
    const titleIdx = header.findIndex(h => h.includes("başlık") || h === "title");
    const contentIdx = header.findIndex(h => h.includes("içerik") || h === "content");
    const imageIdx = header.findIndex(h => h.includes("resim") || h.includes("image"));

    if (titleIdx === -1) { toast({ title: "CSV'de 'başlık' veya 'title' sütunu bulunamadı", variant: "destructive" }); setLoading(false); return; }

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map(c => c.trim().replace(/"/g, ""));
      const title = cols[titleIdx];
      if (!title) { errors.push(`Satır ${i + 1}: Başlık boş`); continue; }
      try {
        const res = await fetch(apiUrl("/api/news"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            content: contentIdx !== -1 ? cols[contentIdx] : "",
            imageUrl: imageIdx !== -1 ? cols[imageIdx] : undefined,
            categorySlug: categorySlug || "gundem",
            status: "draft",
          }),
        });
        if (res.ok) success++; else errors.push(`Satır ${i + 1}: API hatası`);
      } catch { errors.push(`Satır ${i + 1}: Bağlantı hatası`); }
    }
    setResult({ success, failed: errors.length, errors });
    setLoading(false);
    if (success > 0) toast({ title: `${success} haber taslak olarak eklendi` });
  };

  const handleRssImport = async () => {
    if (!rssUrl.trim()) { toast({ title: "RSS URL gerekli", variant: "destructive" }); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(apiUrl("/api/rss/direct-import"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: rssUrl, categorySlug: rssCategory || "gundem", maxItems: parseInt(rssMax) || 10 }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ success: data.added ?? 0, failed: 0, errors: [] });
        toast({ title: `${data.added ?? 0} haber RSS'ten eklendi` });
      } else {
        setResult({ success: 0, failed: 1, errors: [data.error || "RSS içe aktarılamadı"] });
      }
    } catch { setResult({ success: 0, failed: 1, errors: ["Bağlantı hatası"] }); }
    finally { setLoading(false); }
  };

  const CSV_TEMPLATE = `başlık,içerik,resim_url
"Birinci Haber Başlığı","Haber içeriği buraya gelir...","https://example.com/image.jpg"
"İkinci Haber","İkinci haberın içeriği...","https://example.com/image2.jpg"`;

  return (
    <AdminLayout title="Toplu İçe Aktar">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Toplu içe aktar</h1>
          <p className="text-sm text-gray-500 mt-1">
            Yalnızca <strong>haber</strong> içeriği: CSV veya RSS. (E-ticaret ürün CSV’si işletme paneli →{" "}
            <strong>Aktarım</strong> sekmesindedir.)
          </p>
        </div>
      </div>

      {result && (
        <div className={`mb-6 p-4 rounded-lg border ${result.failed === 0 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
          <div className="flex items-center gap-2 mb-1">
            {result.failed === 0 ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-amber-600" />}
            <span className="font-bold">{result.success} haber eklendi{result.failed > 0 ? `, ${result.failed} başarısız` : ""}</span>
          </div>
          {result.errors.length > 0 && (
            <ul className="text-sm text-amber-700 list-disc list-inside mt-2 space-y-0.5">
              {result.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
              {result.errors.length > 5 && <li>... ve {result.errors.length - 5} daha</li>}
            </ul>
          )}
        </div>
      )}

      <Tabs defaultValue="csv">
        <TabsList className="mb-6">
          <TabsTrigger value="csv" className="gap-2"><FileText className="w-4 h-4" />CSV İçe Aktar</TabsTrigger>
          <TabsTrigger value="rss" className="gap-2"><Rss className="w-4 h-4" />RSS Direkt İçe Aktar</TabsTrigger>
        </TabsList>

        <TabsContent value="csv">
          <div className="bg-white p-6 rounded-md shadow-sm border space-y-5">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-800 mb-2">CSV Formatı</p>
              <p className="text-sm text-blue-700">Başlık satırı şu sütunları içermelidir:</p>
              <ul className="list-disc list-inside text-sm text-blue-700 mt-1">
                <li><code>başlık</code> veya <code>title</code> (zorunlu)</li>
                <li><code>içerik</code> veya <code>content</code> (opsiyonel)</li>
                <li><code>resim_url</code> veya <code>image</code> (opsiyonel)</li>
              </ul>
              <Button
                variant="link"
                size="sm"
                className="text-blue-600 p-0 h-auto mt-2 gap-1"
                onClick={() => {
                  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = "haber-sablonu.csv"; a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="w-3.5 h-3.5" /> Şablon İndir
              </Button>
            </div>

            <div>
              <Label>Hedef Kategori</Label>
              <Select value={categorySlug} onValueChange={setCategorySlug}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Kategori Seç" /></SelectTrigger>
                <SelectContent>
                  {categories?.map(c => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>CSV Verisi</Label>
              <Textarea
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                placeholder={CSV_TEMPLATE}
                rows={12}
                className="mt-1 font-mono text-sm"
              />
            </div>

            <Button
              className="bg-[#e61e25] hover:bg-[#c9181e] text-white gap-2"
              onClick={handleCsvImport}
              disabled={loading || !csvText.trim()}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {loading ? "İçe Aktarılıyor..." : "İçe Aktar"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="rss">
          <div className="bg-white p-6 rounded-md shadow-sm border space-y-5">
            <div>
              <Label>RSS URL</Label>
              <Input value={rssUrl} onChange={e => setRssUrl(e.target.value)}
                placeholder="https://www.haberler.com/rss/tum_haberler.xml" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Hedef Kategori</Label>
                <Select value={rssCategory} onValueChange={setRssCategory}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Kategori Seç" /></SelectTrigger>
                  <SelectContent>
                    {categories?.map(c => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Maksimum Haber Sayısı</Label>
                <Input type="number" value={rssMax} onChange={e => setRssMax(e.target.value)} min="1" max="100" className="mt-1" />
              </div>
            </div>
            <Button
              className="bg-[#e61e25] hover:bg-[#c9181e] text-white gap-2"
              onClick={handleRssImport}
              disabled={loading || !rssUrl.trim()}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rss className="w-4 h-4" />}
              {loading ? "İçe Aktarılıyor..." : "RSS'ten İçe Aktar"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
