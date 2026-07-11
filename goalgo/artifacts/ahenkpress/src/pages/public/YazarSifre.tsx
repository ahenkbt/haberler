import { useState } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiUrl } from "@/lib/apiBase";
import { readHmAuthorJwt } from "@/lib/hmAuthorSession";
import { useToast } from "@/hooks/use-toast";
import { YazarPanelNav } from "@/components/YazarPanelNav";

function YazarSifreForm({ slug }: { slug: string }) {
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [next1, setNext1] = useState("");
  const [next2, setNext2] = useState("");
  const [loading, setLoading] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next1.length < 8) {
      toast({ title: "Yeni şifre en az 8 karakter", variant: "destructive" });
      return;
    }
    if (next1 !== next2) {
      toast({ title: "Yeni şifreler eşleşmiyor", variant: "destructive" });
      return;
    }
    const t = readHmAuthorJwt();
    if (!t) return;
    setLoading(true);
    try {
      const r = await fetch(apiUrl("/api/hm/author/me/password"), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next1 }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        toast({ title: j.error || "Güncellenemedi", variant: "destructive" });
        return;
      }
      toast({ title: "Şifre güncellendi" });
      setCurrent("");
      setNext1("");
      setNext2("");
    } catch {
      toast({ title: "Bağlantı hatası", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6">
      <YazarPanelNav slug={slug} />
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-black text-slate-900 mb-4">Şifre değiştir</h1>
        <form onSubmit={save} className="space-y-4">
          <div>
            <Label>Mevcut şifre</Label>
            <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className="mt-1" required />
          </div>
          <div>
            <Label>Yeni şifre</Label>
            <Input type="password" value={next1} onChange={(e) => setNext1(e.target.value)} className="mt-1" required />
          </div>
          <div>
            <Label>Yeni şifre (tekrar)</Label>
            <Input type="password" value={next2} onChange={(e) => setNext2(e.target.value)} className="mt-1" required />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-slate-900 text-white">
            {loading ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function YazarSifre() {
  const params = useParams<{ slug: string }>();
  const slug = String(params?.slug ?? "").trim();
  return (
    <div className="mx-auto max-w-screen-lg px-3 py-6">
      <YazarSifreForm slug={slug} />
    </div>
  );
}
