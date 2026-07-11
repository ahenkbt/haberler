import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Megaphone, RefreshCw, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Audience = "all" | "members" | "customers" | "vendors";

interface BroadcastRow {
  id: number;
  audience: string;
  title: string;
  body: string;
  image_url?: string | null;
  whatsapp_requested?: boolean;
  whatsapp_sent?: number;
  created_at: string;
}

function pickRow(raw: Record<string, unknown>): BroadcastRow | null {
  const id = Number(raw.id);
  if (!Number.isFinite(id)) return null;
  return {
    id,
    audience: String(raw.audience ?? ""),
    title: String(raw.title ?? ""),
    body: String(raw.body ?? ""),
    image_url: raw.image_url != null ? String(raw.image_url) : raw.imageUrl != null ? String(raw.imageUrl) : null,
    whatsapp_requested: Boolean(raw.whatsapp_requested ?? raw.whatsappRequested),
    whatsapp_sent: Number(raw.whatsapp_sent ?? raw.whatsappSent ?? 0),
    created_at: String(raw.created_at ?? raw.createdAt ?? ""),
  };
}

export default function PlatformDuyurular() {
  const { toast } = useToast();
  const [list, setList] = useState<BroadcastRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [audience, setAudience] = useState<Audience>("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sendWhatsapp, setSendWhatsapp] = useState(false);
  const [imageData, setImageData] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/site/admin/broadcasts", { credentials: "include" });
      const data = (await res.json()) as { broadcasts?: unknown[] };
      const rows = (data.broadcasts ?? [])
        .map((b) => (b && typeof b === "object" ? pickRow(b as Record<string, unknown>) : null))
        .filter((x): x is BroadcastRow => x != null);
      setList(rows);
    } catch {
      setList([]);
      toast({ title: "Liste alınamadı", variant: "destructive" });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast referansı döngü tetikleyebilir
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function onImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 400 * 1024) {
      toast({ title: "Görsel en fazla 400 KB olmalıdır.", variant: "destructive" });
      return;
    }
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result || "");
      if (s.startsWith("data:image/")) setImageData(s);
    };
    r.readAsDataURL(f);
    e.target.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch("/api/site/admin/broadcasts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience,
          title: title.trim(),
          body: body.trim(),
          imageUrl: imageData || undefined,
          sendWhatsapp,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: data.error ?? "Gönderilemedi", variant: "destructive" });
        return;
      }
      toast({
        title: "Duyuru oluşturuldu",
        description:
          sendWhatsapp && typeof data.whatsappSent === "number"
            ? `WhatsApp: ${data.whatsappSent} gönderim (sınır ve anahtar ayarlarına bağlı).`
            : "Kullanıcı panellerinde bildirim olarak görünecek.",
      });
      setTitle("");
      setBody("");
      setImageData(null);
      setSendWhatsapp(false);
      await load();
    } catch {
      toast({ title: "Bağlantı hatası", variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  return (
    <AdminLayout title="Platform duyuruları">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Megaphone className="w-7 h-7 text-[#e61e25]" />
              Kitle mesajı
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Üye, müşteri veya işletme oturumlarında bildirim olarak gösterilir. İsteğe bağlı WhatsApp (CallMeBot
              anahtarı ve telefon kaydı gerekir; yoğun gönderimde üst sınır uygulanır).
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>
        </div>

        <form onSubmit={submit} className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
          <div>
            <Label>Hedef kitle</Label>
            <select
              className="mt-1.5 w-full max-w-md border rounded-lg px-3 py-2 text-sm"
              value={audience}
              onChange={(e) => setAudience(e.target.value as Audience)}
            >
              <option value="all">Herkes (üye + müşteri + işletme)</option>
              <option value="members">Yalnız site üyeleri (Keşfet / seri ilan oturumu)</option>
              <option value="customers">Yalnız mağaza müşterileri (Hesabım oturumu)</option>
              <option value="vendors">Yalnız işletme panelleri (servis sağlayıcı)</option>
            </select>
          </div>
          <div>
            <Label>Başlık</Label>
            <Input className="mt-1.5" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
          </div>
          <div>
            <Label>Metin</Label>
            <Textarea className="mt-1.5 min-h-[140px]" value={body} onChange={(e) => setBody(e.target.value)} required />
          </div>
          <div className="rounded-lg border border-dashed border-gray-200 p-4 bg-gray-50/80">
            <Label className="cursor-pointer text-sm text-gray-700">
              Görsel (isteğe bağlı, base64, max 400 KB)
              <input type="file" accept="image/*" className="block mt-2 text-xs" onChange={onImagePick} />
            </Label>
            {imageData && (
              <div className="mt-3 flex items-center gap-3">
                <img src={imageData} alt="" className="h-20 rounded border object-contain" />
                <Button type="button" variant="ghost" size="sm" onClick={() => setImageData(null)}>
                  Kaldır
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Switch id="wa" checked={sendWhatsapp} onCheckedChange={setSendWhatsapp} />
            <Label htmlFor="wa" className="text-sm cursor-pointer">
              Aynı metni WhatsApp ile de gönder (CallMeBot)
            </Label>
          </div>
          <Button type="submit" disabled={sending} className="bg-[#e61e25] hover:bg-[#c9181e] text-white gap-2">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Yayınla
          </Button>
        </form>

        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Son duyurular</h2>
          {loading && list.length === 0 ? (
            <p className="text-gray-500 py-8 text-center">Yükleniyor…</p>
          ) : list.length === 0 ? (
            <p className="text-gray-500 text-sm">Henüz kayıt yok.</p>
          ) : (
            <ul className="space-y-3">
              {list.map((b) => (
                <li key={b.id} className="rounded-xl border border-gray-100 bg-white p-4 text-sm shadow-sm">
                  <div className="flex flex-wrap justify-between gap-2 text-xs text-gray-400 mb-1">
                    <span className="font-mono uppercase">{b.audience}</span>
                    <span>{b.created_at ? new Date(b.created_at).toLocaleString("tr-TR") : ""}</span>
                  </div>
                  <p className="font-bold text-gray-900">{b.title}</p>
                  <p className="text-gray-700 mt-1 whitespace-pre-wrap">{b.body}</p>
                  {b.image_url && b.image_url.startsWith("data:image/") && (
                    <img src={b.image_url} alt="" className="mt-2 max-h-48 rounded-lg border object-contain" />
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    WhatsApp: {b.whatsapp_requested ? `${b.whatsapp_sent ?? 0} gönderim` : "kapalı"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
