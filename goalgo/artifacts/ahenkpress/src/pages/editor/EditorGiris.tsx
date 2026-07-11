import { useEffect, useMemo, useState } from "react";

import { Link, Redirect, useLocation } from "wouter";

import { Lock, Mail, Building2, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { apiUrl } from "@/lib/apiBase";

import { useHmEditor } from "@/contexts/HmEditorContext";

import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";

import { isDefaultPortalHost } from "@/lib/hmPortalHosts";

import { readHmDomainSlugCache, writeHmDomainSlugCache, clearHmDomainSlugCache } from "@/lib/hmNestedMetaStorage";

import { useHmMetaByDomain } from "@/lib/fetchHmMetaByDomain";

import { stripRedundantEditorLoginNextFromBrowserUrl } from "@/lib/hmEditorPublicLinks";

import { LoginMathCaptcha, type LoginCaptchaValue } from "@/components/LoginMathCaptcha";



type EditorSiteHint = {

  slug: string;

  displayName?: string;

  contactEmail?: string;

};



function browserHostKey(): string {

  if (typeof window === "undefined") return "";

  return window.location.hostname.toLowerCase().split(":")[0] ?? "";

}



function stripEditorSlugFromBrowserUrl(): void {

  if (typeof window === "undefined") return;

  const host = browserHostKey();

  if (!host || isDefaultPortalHost(host)) return;

  const url = new URL(window.location.href);

  if (!url.searchParams.has("slug")) return;

  url.searchParams.delete("slug");

  const next = `${url.pathname}${url.search}${url.hash}`;

  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (next === current) return;

  window.history.replaceState(window.history.state, "", next);

}



export default function EditorGiris() {

  const [loc, setLocation] = useLocation();

  const { setSession, token, sessionStatus, logout } = useHmEditor();

  const host = browserHostKey();

  const isCustomDomain = !!host && !isDefaultPortalHost(host);

  const cachedDomainSlug = useMemo(

    () => (isCustomDomain ? readHmDomainSlugCache(host) : undefined),

    [host, isCustomDomain],

  );



  const { data: domainMeta, isFetched: domainFetched } = useHmMetaByDomain(host, {

    enabled: isCustomDomain,

    retry: false,

  });

  const domainSite = useMemo((): EditorSiteHint | null => {

    if (!domainMeta?.slug) return null;

    const slug = String(domainMeta.slug).trim().toLowerCase();

    if (!slug) return null;

    return {

      slug,

      displayName: String(domainMeta.displayName ?? "").trim() || undefined,

      contactEmail: String(domainMeta.contact?.email ?? "").trim().toLowerCase() || undefined,

    };

  }, [domainMeta]);



  const [slug, setSlug] = useState("");

  const [slugTouched, setSlugTouched] = useState(false);

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [captcha, setCaptcha] = useState<LoginCaptchaValue>({ token: "", answer: "" });

  const [err, setErr] = useState("");

  const [loading, setLoading] = useState(false);



  const resolvedSiteHint = useMemo(() => {
    if (domainSite?.slug) return domainSite;
    if (isCustomDomain && domainFetched && domainSite === null) return null;
    if (cachedDomainSlug) return { slug: cachedDomainSlug };
    return null;
  }, [domainSite, domainFetched, cachedDomainSlug, isCustomDomain]);

  const hideSiteField = isCustomDomain && !!resolvedSiteHint?.slug;



  function editorPostLoginPath(): string {

    const q = new URLSearchParams((loc.split("?")[1] ?? "").trim());

    const next = (q.get("next") || q.get("redirect") || "").trim();

    return next.startsWith("/editor") ? next : "/editor";

  }



  useEffect(() => {

    stripEditorSlugFromBrowserUrl();
    stripRedundantEditorLoginNextFromBrowserUrl();

  }, [loc]);



  useEffect(() => {

    const q = new URLSearchParams((loc.split("?")[1] ?? "").trim());

    const s = q.get("slug");

    if (s && !isCustomDomain) {

      setSlug(s.trim().toLowerCase());

      setSlugTouched(true);

    }

  }, [loc, isCustomDomain]);



  useEffect(() => {

    if (domainSite?.slug) writeHmDomainSlugCache(host, domainSite.slug);

  }, [domainSite?.slug, host]);



  useEffect(() => {

    if (isCustomDomain && domainFetched && domainSite === null) {

      clearHmDomainSlugCache(host);

    }

  }, [domainFetched, domainSite, host, isCustomDomain]);



  useEffect(() => {

    if (slugTouched || !resolvedSiteHint?.slug) return;

    setSlug(resolvedSiteHint.slug);

  }, [resolvedSiteHint?.slug, slugTouched]);



  useEffect(() => {

    if (sessionStatus === "denied") logout();

  }, [sessionStatus, logout]);



  if (token && (sessionStatus === "ok" || sessionStatus === "transient")) {

    return <Redirect to={editorPostLoginPath()} />;

  }



  if (token && sessionStatus === "checking") {

    return (

      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">

        <p className="text-sm text-slate-400">Oturum doğrulanıyor…</p>

      </div>

    );

  }



  const submit = async (e: React.FormEvent) => {

    e.preventDefault();

    setErr("");

    setLoading(true);

    const slugNorm = slug.trim().toLowerCase();

    const emailNorm = email.trim().toLowerCase();

    try {

      const res = await fetch(apiUrl("/api/hm/editor/login"), {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({
          slug: slugNorm,
          email: emailNorm,
          password,
          domain: isCustomDomain ? host : undefined,
          captchaToken: captcha.token,
          captchaAnswer: captcha.answer,
        }),

      });

      const j = (await res.json().catch(() => ({}))) as {

        token?: string;

        site?: { id: number; slug: string; domain: string | null; displayName: string };

        editor?: { id: number; email: string; displayName: string | null };

        error?: string;

      };

      if (!res.ok || !j.token || !j.site || !j.editor) {

        let message = j.error || "Giriş başarısız";

        if (message === "Site veya hesap bulunamadı") {

          message = "Yayın kodu, e-posta veya şifre hatalı.";

        } else if (message.includes("Güvenlik doğrulaması")) {

          setCaptcha((c) => ({ ...c, answer: "" }));

        }

        setErr(message);

        setLoading(false);

        return;

      }

      setSession(j.token, j.site, j.editor);

      setLocation(editorPostLoginPath());

    } catch {

      setErr("Bağlantı hatası");

    } finally {

      setLoading(false);

    }

  };



  const siteLabel = resolvedSiteHint?.displayName?.trim();



  return (

    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">

      <div className="w-full max-w-md">

        <div className="text-center mb-8">

          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-600 mb-3">

            <Building2 className="w-7 h-7 text-white" />

          </div>

          <h1 className="text-2xl font-black text-white tracking-tight">Haber Merkezi — Editör</h1>

          <p className="text-slate-400 text-sm mt-1">

            {siteLabel ? `${siteLabel} — yetkili editör girişi` : "Yetkili editör hesabı ile giriş"}

          </p>

        </div>



        <form onSubmit={submit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">

          {err ? <p className="text-sm text-red-400 font-medium">{err}</p> : null}

          {!hideSiteField ? (

            <div>

              <Label className="text-slate-400 text-xs uppercase font-bold">Yayın kodu</Label>

              <Input

                value={slug}

                onChange={(e) => {

                  setSlugTouched(true);

                  setSlug(e.target.value);

                }}

                placeholder="Size verilen kurum kodu"

                className="mt-1.5 bg-slate-950 border-slate-700 text-white"

                autoComplete="off"

                required

              />

              <p className="mt-1 text-xs text-slate-500">

                Haber merkezi kaydınızda tanımlı kısa kurum kodunuz (yalnızca yetkililerde).

              </p>

            </div>

          ) : null}

          <div>

            <Label className="text-slate-400 text-xs uppercase font-bold">Editör e-posta</Label>

            <div className="relative mt-1.5">

              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />

              <Input

                type="email"

                value={email}

                onChange={(e) => setEmail(e.target.value)}

                className="pl-10 bg-slate-950 border-slate-700 text-white"

                autoComplete="username"

                required

              />

            </div>

          </div>

          <div>

            <Label className="text-slate-400 text-xs uppercase font-bold">Şifre</Label>

            <div className="relative mt-1.5">

              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />

              <Input

                type="password"

                value={password}

                onChange={(e) => setPassword(e.target.value)}

                className="pl-10 bg-slate-950 border-slate-700 text-white"

                autoComplete="current-password"

                required

              />

            </div>

          </div>

          <LoginMathCaptcha value={captcha} onChange={setCaptcha} variant="dark" />

          <Button type="submit" disabled={loading || !captcha.token || !captcha.answer.trim()} className="w-full bg-red-600 hover:bg-red-700 font-bold gap-2">

            {loading ? "…" : "Giriş yap"}

            <ArrowRight className="w-4 h-4" />

          </Button>

          <p className="text-center text-xs text-slate-500">

            {slug.trim() ? (

              <>

                <Link

                  href={`/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(slug.trim().toLowerCase())}/yazar/giris`}

                  className="text-amber-300/90 hover:underline"

                  target="_blank"

                  rel="noreferrer"

                >

                  Köşe yazarı girişi

                </Link>

                {" · "}

              </>

            ) : null}

            <Link href="/habermerkezi" className="text-red-400 hover:underline">

              Haber merkezi girişi

            </Link>

          </p>

        </form>

      </div>

    </div>

  );

}


