import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { hmPublicSiteOrigin } from "@/lib/hmPublicLinks";

function origin(): string {
  if (typeof window === "undefined") return "https://yekpare.net";
  return window.location.origin;
}

export default function SiteneEkle() {
  const { toast } = useToast();
  const [loc] = useLocation();
  const hmCtx = useHmPublicLinkContextOptional();
  const hmLink = useHmPublicHref();
  const { data: settings } = useGetSiteSettings();
  const [sablon, setSablon] = useState("manset");
  const [logo, setLogo] = useState("1");
  const [sayi, setSayi] = useState(20);
  const [w, setW] = useState(300);
  const [frameH, setFrameH] = useState(400);
  const [tema, setTema] = useState("acik");
  const [copied, setCopied] = useState(false);
  const [siteId, setSiteId] = useState("");

  useEffect(() => {
    const q = new URLSearchParams((loc.split("?")[1] ?? "").trim());
    const fromHm = q.get("siteId") ?? q.get("hmSiteId") ?? "";
    if (fromHm.trim()) setSiteId(fromHm.trim());
  }, [loc]);

  useEffect(() => {
    if (hmCtx?.siteId) setSiteId(String(hmCtx.siteId));
  }, [hmCtx?.siteId]);

  const iframeSrc = useMemo(() => {
    const o = hmPublicSiteOrigin(hmCtx?.domain ?? null) ?? origin();
    const q = new URLSearchParams({
      sablon,
      logo,
      sayi: String(sayi),
      tema,
    });
    const sid = parseInt(siteId.trim(), 10);
    if (Number.isFinite(sid) && sid > 0) q.set("siteId", String(sid));
    return `${o.replace(/\/+$/, "")}/embed/haber?${q.toString()}`;
  }, [sablon, logo, sayi, tema, siteId, hmCtx?.domain]);

  const iframeCode = `<iframe src="${iframeSrc}" width="${w}" height="${frameH}" style="border:0;max-width:100%;" loading="lazy" title="${settings?.siteName ?? "Haber"}" referrerpolicy="no-referrer-when-downgrade"></iframe>`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(iframeCode);
      setCopied(true);
      toast({ title: "Kopyalandı" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Kopyalanamadı", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-10 sm:py-14">
        <Link href={hmCtx ? hmLink("/") : "/haberler"} className="text-sm font-semibold text-red-600 hover:underline">
          ← {hmCtx ? "Site vitrin" : "Haberler"}
        </Link>
        <h1 className="mt-4 text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Sitene ekle</h1>
        <p className="mt-2 text-slate-600 text-sm max-w-2xl">
          Manşet, köşe yazarları veya son haberler için <strong>iframe</strong> kodu üretin. İsteğe bağlı{" "}
          <strong>haber sitesi ID</strong> (<code className="text-xs bg-slate-100 px-1 rounded">siteId</code>) ile
          yalnızca o siteye atanmış haberler ve vitrin renkleri kullanılır; tıklanan haber tam sayfada açılır.
        </p>

        <div className="grid gap-6 mt-10 md:grid-cols-3">
          {[
            { id: "manset", title: "Manşet haberler", desc: "Büyük görsel + başlık" },
            { id: "kose", title: "Köşe yazarları", desc: "Dikey yazar listesi" },
            { id: "son", title: "Son eklenenler", desc: "Saat + başlık listesi" },
          ].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSablon(c.id)}
              className={`text-left rounded-2xl border-2 p-4 transition shadow-sm hover:shadow-md ${
                sablon === c.id ? "border-red-600 bg-red-50/50" : "border-slate-200 bg-white"
              }`}
            >
              <p className="font-black text-slate-900">{c.title}</p>
              <p className="text-xs text-slate-500 mt-1">{c.desc}</p>
              <span className="mt-3 inline-block text-[10px] font-bold uppercase text-red-600">&lt;/&gt; Kodu oluştur</span>
            </button>
          ))}
        </div>

        <Card className="mt-10 border-slate-200 shadow-md">
          <CardHeader>
            <CardTitle>Kod oluştur</CardTitle>
            <CardDescription>Parametreleri seçin; aşağıdaki HTML’i sitenize yapıştırın.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-xs font-bold uppercase text-slate-500">Site logosu</Label>
              <RadioGroup value={logo} onValueChange={setLogo} className="flex gap-6 mt-2">
                <label htmlFor="lg1" className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="1" id="lg1" />
                  Göster
                </label>
                <label htmlFor="lg0" className="flex items-center gap-2 text-sm cursor-pointer">
                  <RadioGroupItem value="0" id="lg0" />
                  Gösterme
                </label>
              </RadioGroup>
            </div>

            <div>
              <Label>Haber sitesi ID (isteğe bağlı)</Label>
              <Input
                type="number"
                min={1}
                placeholder="Örn. 1 — boş bırakılırsa tüm yayınlanan haberler"
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="mt-1 max-w-md"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Yalnızca belirli bir haber merkezine ait içerik göstermek istiyorsanız, yönetimden size iletilen numarayı
                girin; aksi halde boş bırakın.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <Label>Haber / kayıt sayısı</Label>
                <Input type="number" min={3} max={30} value={sayi} onChange={(e) => setSayi(+e.target.value || 10)} className="mt-1" />
              </div>
              <div>
                <Label>Genişlik (px)</Label>
                <Input type="number" value={w} onChange={(e) => setW(+e.target.value || 300)} className="mt-1" />
              </div>
              <div>
                <Label>Yükseklik (px)</Label>
                <Input type="number" value={frameH} onChange={(e) => setFrameH(+e.target.value || 400)} className="mt-1" />
              </div>
            </div>

            <div>
              <Label>Renk şeması</Label>
              <Select value={tema} onValueChange={setTema}>
                <SelectTrigger className="mt-1 max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="acik">Açık (beyaz)</SelectItem>
                  <SelectItem value="koyu">Koyu (demo)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>HTML kodu</Label>
              <pre className="mt-2 p-4 rounded-xl bg-slate-900 text-slate-100 text-xs overflow-x-auto whitespace-pre-wrap break-all">
                {iframeCode}
              </pre>
              <Button className="mt-3 w-full sm:w-auto bg-red-600 hover:bg-red-700" onClick={copy}>
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                Kodu kopyala
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-10">
          <h2 className="text-lg font-black text-slate-900 mb-3">Canlı önizleme</h2>
          <div
            className="mx-auto rounded-xl border-2 border-dashed border-slate-300 bg-slate-100 p-2 flex items-start justify-center overflow-hidden"
            style={{ maxWidth: w + 32 }}
          >
            <iframe src={iframeSrc} width={w} height={frameH} className="bg-white rounded-lg shadow max-w-full" title="Önizleme" />
          </div>
        </div>
      </div>
    </div>
  );
}
