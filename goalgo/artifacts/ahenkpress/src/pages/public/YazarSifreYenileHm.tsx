import { useState, useEffect } from "react";
import { Link, Redirect, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiUrl } from "@/lib/apiBase";
import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";

export default function YazarSifreYenileHm() {
  const params = useParams<{ slug: string }>();
  const slug = String(params?.slug ?? "").trim();
  const h = useHmPublicHref();
  const [token, setToken] = useState("");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    setToken(t ?? "");
    if (!t) setErr("Geçersiz veya eksik sıfırlama bağlantısı.");
  }, []);

  if (!slug) return <Redirect to="/" />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (pw1.length < 8) {
      setErr("Şifre en az 8 karakter olmalı.");
      return;
    }
    if (pw1 !== pw2) {
      setErr("Şifreler eşleşmiyor.");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(apiUrl("/api/hm/author/password-reset"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: pw1 }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        setErr(j.error || "Güncellenemedi");
        return;
      }
      setDone(true);
    } catch {
      setErr("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  };

  const giris = `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(slug)}/yazar/giris`;

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <p className="mb-6 text-sm text-slate-600">
        <Link href={giris} className="font-semibold text-red-600 hover:underline">
          ← Girişe dön
        </Link>
        {" · "}
        <Link href={h("/")} className="font-semibold text-slate-600 hover:underline">
          Vitrin
        </Link>
      </p>
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-black text-slate-900">Yeni şifre</h1>
        {done ? (
          <p className="text-sm text-emerald-700">
            Şifreniz güncellendi.{" "}
            <Link href={giris} className="font-semibold text-red-600 underline">
              Giriş yapın
            </Link>
            .
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="ysy-p1">Yeni şifre</Label>
              <Input
                id="ysy-p1"
                type="password"
                autoComplete="new-password"
                value={pw1}
                onChange={(e) => setPw1(e.target.value)}
                className="mt-1"
                required
                minLength={8}
              />
            </div>
            <div>
              <Label htmlFor="ysy-p2">Yeni şifre (tekrar)</Label>
              <Input
                id="ysy-p2"
                type="password"
                autoComplete="new-password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                className="mt-1"
                required
                minLength={8}
              />
            </div>
            {err ? <p className="text-sm text-red-600">{err}</p> : null}
            <Button type="submit" disabled={loading || !token} className="w-full bg-slate-900 text-white">
              {loading ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
