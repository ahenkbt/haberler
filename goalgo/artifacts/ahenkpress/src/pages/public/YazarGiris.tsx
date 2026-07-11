import { useState } from "react";
import { Link, Redirect, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiUrl } from "@/lib/apiBase";
import {
  readHmAuthorJwt,
  readHmAuthorPayload,
  writeHmAuthorSession,
  type HmAuthorStoredPayload,
} from "@/lib/hmAuthorSession";
import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";

export default function YazarGiris() {
  const params = useParams<{ slug: string }>();
  const slug = String(params?.slug ?? "").trim();
  const h = useHmPublicHref();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  if (!slug) return <Redirect to="/" />;
  const existingT = readHmAuthorJwt();
  const existingP = readHmAuthorPayload();
  if (existingT && existingP?.site?.slug === slug) {
    return <Redirect to={`/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(slug)}/yazar/haberler`} />;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const r = await fetch(apiUrl("/api/hm/author/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, siteSlug: slug }),
      });
      const j = (await r.json().catch(() => ({}))) as {
        token?: string;
        site?: HmAuthorStoredPayload["site"];
        author?: HmAuthorStoredPayload["author"];
        error?: string;
      };
      if (!r.ok || !j.token || !j.site || !j.author) {
        setErr(j.error || "Giriş başarısız");
        return;
      }
      writeHmAuthorSession(j.token, { site: j.site, author: j.author });
      window.location.href = `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(slug)}/yazar/haberler`;
    } catch {
      setErr("Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <p className="text-sm text-slate-600 mb-6">
        <Link href={h("/")} className="font-semibold text-red-600 hover:underline">
          ← Vitrine dön
        </Link>
      </p>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h1 className="text-xl font-black text-slate-900">Köşe yazarı girişi</h1>
        <p className="text-sm text-slate-600">
          Editörün tanımladığı e-posta ve şifre ile giriş yapın. Hesabınız yoksa site editörüne başvurun.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="yg-email">E-posta</Label>
            <Input
              id="yg-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="yg-pw">Şifre</Label>
            <Input
              id="yg-pw"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1"
              required
            />
          </div>
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
          <Button type="submit" disabled={loading} className="w-full bg-slate-900 text-white">
            {loading ? "Giriş…" : "Giriş yap"}
          </Button>
          <p className="text-center text-sm">
            <Link
              href={`/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(slug)}/yazar/sifremi-unuttum`}
              className="text-red-600 hover:underline"
            >
              Şifremi unuttum
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
