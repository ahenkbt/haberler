import { useState } from "react";
import { Link, Redirect, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiUrl } from "@/lib/apiBase";
import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";

export default function YazarSifremiUnuttum() {
  const params = useParams<{ slug: string }>();
  const slug = String(params?.slug ?? "").trim();
  const h = useHmPublicHref();
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [doneMsg, setDoneMsg] = useState("");

  if (!slug) return <Redirect to="/" />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setDoneMsg("");
    setLoading(true);
    try {
      const r = await fetch(apiUrl("/api/hm/author/password-reset-request"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), siteSlug: slug }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!r.ok) {
        setErr(j.error || "İşlem başarısız");
        return;
      }
      setDoneMsg(j.message || "Talebiniz alındı.");
    } catch {
      setErr("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <p className="mb-6 text-sm text-slate-600">
        <Link
          href={`/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(slug)}/yazar/giris`}
          className="font-semibold text-red-600 hover:underline"
        >
          ← Girişe dön
        </Link>
        {" · "}
        <Link href={h("/")} className="font-semibold text-slate-600 hover:underline">
          Vitrin
        </Link>
      </p>
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-black text-slate-900">Şifremi unuttum</h1>
        <p className="text-sm text-slate-600">
          Kayıtlı e-posta adresinize şifre sıfırlama bağlantısı gönderilir. SMTP yapılandırması yoksa site
          yöneticinizden yardım isteyin.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="ysu-email">E-posta</Label>
            <Input
              id="ysu-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
          {doneMsg ? <p className="text-sm text-emerald-700">{doneMsg}</p> : null}
          <Button type="submit" disabled={loading} className="w-full bg-slate-900 text-white">
            {loading ? "Gönderiliyor…" : "Bağlantı gönder"}
          </Button>
        </form>
      </div>
    </div>
  );
}
