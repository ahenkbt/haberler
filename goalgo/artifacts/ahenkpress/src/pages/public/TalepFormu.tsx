import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { apiUrl } from "@/lib/apiBase";
import { useHmPublicLinkContextOptional, useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import {
  type HmRequestIntentId,
  buildHmRequestFormSubject,
  isHmCorporateTheme,
  resolveHmRequestCategoriesForIntent,
  resolveHmRequestFormEnabled,
  resolveHmRequestIntentLabel,
  resolveHmRequestIntentOptions,
} from "@/lib/hmRequestForm";

type SubmitState = "idle" | "sending" | "sent";

export default function TalepFormu() {
  const hm = useHmPublicLinkContextOptional();
  const h = useHmPublicHref();
  const layoutPrefs = hm?.layoutPrefs ?? null;
  const corporate = isHmCorporateTheme(layoutPrefs);
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState("");
  const [intent, setIntent] = useState<HmRequestIntentId>("need-help");
  const [categoryId, setCategoryId] = useState("");

  const enabled = resolveHmRequestFormEnabled(layoutPrefs);
  const intentOptions = useMemo(() => resolveHmRequestIntentOptions(layoutPrefs), [layoutPrefs]);
  const categories = useMemo(
    () => resolveHmRequestCategoriesForIntent(layoutPrefs, intent),
    [layoutPrefs, intent],
  );

  useEffect(() => {
    const first = categories[0]?.id ?? "";
    setCategoryId((prev) => (categories.some((c) => c.id === prev) ? prev : first));
  }, [categories, intent]);

  const selectedCategory = categories.find((c) => c.id === categoryId) ?? categories[0] ?? null;
  const categoryLegend = corporate ? "Talep konusu" : intent === "want-help" ? "Teklif konusu" : "Talep konusu";

  if (!enabled) {
    return (
      <main className="hm-news-submit-page bg-slate-50 px-3 py-8 sm:px-4">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">Talep Formu</h1>
          <p className="mt-3 text-sm text-slate-600">Bu form site yöneticisi tarafından devre dışı bırakılmıştır.</p>
          <Link href={h("/")} className="mt-6 inline-block text-sm font-semibold text-red-600 hover:underline">
            Anasayfaya dön
          </Link>
        </div>
      </main>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    setError("");
    if (!hm?.slug) {
      setError("Site bilgisi alınamadı.");
      return;
    }
    const cat = categories.find((c) => c.id === categoryId) ?? categories[0];
    if (!cat) {
      setError("En az bir talep konusu tanımlanmalıdır.");
      return;
    }

    const form = new FormData(formEl);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const message = String(form.get("message") ?? "").trim();

    if (name.length < 2 || email.length < 5 || message.length < 10) {
      setError("Ad, e-posta ve mesaj alanlarını kontrol edin.");
      return;
    }

    const subject = buildHmRequestFormSubject(intent, cat.label, layoutPrefs);
    const body = [
      `Talep türü: ${resolveHmRequestIntentLabel(intent, layoutPrefs)}`,
      `Konu: ${cat.label}`,
      "",
      message,
    ].join("\n");

    setState("sending");
    try {
      const res = await fetch(apiUrl("/api/site/contact"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          subject,
          message: body,
          siteId: hm.siteId,
          hmSiteSlug: hm.slug,
          pageSource: `hm/${hm.slug}/talep-formu`.slice(0, 80),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Talep kaydedilemedi.");
      formEl.reset();
      setIntent("need-help");
      setCategoryId(categories[0]?.id ?? "");
      setState("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState("idle");
    }
  }

  return (
    <main className="hm-news-submit-page bg-slate-50 px-3 py-8 sm:px-4">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">Talep formu</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">Talep Formu</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {corporate
              ? "Yardım talebinizi veya destek teklifinizi iletin. Mesajınız site editör paneline düşer."
              : "Talebinizi veya iş birliği teklifinizi iletin. Mesajınız site editör paneline düşer."}
          </p>
        </div>

        {state === "sent" ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
            Talebiniz alındı. En kısa sürede size dönüş yapılacaktır.
          </div>
        ) : null}
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
          <fieldset className="space-y-2">
            <legend className="text-sm font-bold text-slate-800">Talep türü *</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {intentOptions.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
                    intent === opt.id ? "border-red-400 bg-red-50 text-red-900" : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="intent"
                    value={opt.id}
                    checked={intent === opt.id}
                    onChange={() => setIntent(opt.id)}
                    className="accent-red-600"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label className="text-sm font-bold text-slate-800" htmlFor="category">
              {categoryLegend} *
            </label>
            <select
              id="category"
              name="category"
              required
              value={categoryId || selectedCategory?.id || ""}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-950 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-bold text-slate-800" htmlFor="message">
              Mesajınız *
            </label>
            <textarea
              id="message"
              name="message"
              required
              minLength={10}
              rows={6}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100"
              placeholder="Talebinizi kısaca açıklayın…"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-sm font-bold text-slate-800" htmlFor="name">
                Ad soyad *
              </label>
              <input
                id="name"
                name="name"
                required
                minLength={2}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-950 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-800" htmlFor="email">
                E-posta *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-950 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-800" htmlFor="phone">
                Telefon
              </label>
              <input
                id="phone"
                name="phone"
                inputMode="tel"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-950 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={state === "sending" || categories.length === 0}
            className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {state === "sending" ? "Gönderiliyor..." : "Talebi Gönder"}
          </button>
        </form>
      </div>
    </main>
  );
}
