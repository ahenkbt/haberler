import { useState, type FormEvent } from "react";
import { apiUrl } from "@/lib/apiBase";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";

type SubmitState = "idle" | "sending" | "sent";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("Dosya okunamadı."));
    };
    reader.onerror = () => reject(new Error("Dosya okunamadı."));
    reader.readAsDataURL(file);
  });
}

export default function HaberGonder() {
  const hmCtx = useHmPublicLinkContextOptional();
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  const siteSlug = hmCtx?.slug ?? "";

  async function onImageChange(file: File | null) {
    setError("");
    setImageFile(null);
    setImagePreview("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Yalnızca görsel dosyası yükleyin.");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setError("Görsel en fazla 6 MB olabilir.");
      return;
    }
    setImageFile(file);
    setImagePreview(await readFileAsDataUrl(file));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!siteSlug) {
      setError("Haber sitesi bilgisi alınamadı.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const payload = {
      title: String(form.get("title") ?? "").trim(),
      spot: String(form.get("spot") ?? "").trim(),
      content: String(form.get("content") ?? "").trim(),
      senderFullName: String(form.get("senderFullName") ?? "").trim(),
      senderEmail: String(form.get("senderEmail") ?? "").trim(),
      senderPhone: String(form.get("senderPhone") ?? "").trim(),
      imageDataUrl: imageFile ? await readFileAsDataUrl(imageFile) : undefined,
    };

    if (payload.title.length < 5 || payload.content.length < 30 || payload.senderFullName.length < 3) {
      setError("Başlık, haber metni ve ad soyad alanlarını kontrol edin.");
      return;
    }

    setState("sending");
    try {
      const res = await fetch(apiUrl(`/api/hm/public/sites/${encodeURIComponent(siteSlug)}/news-submissions`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Gönderim kaydedilemedi.");
      event.currentTarget.reset();
      setImageFile(null);
      setImagePreview("");
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
          <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">Haber ihbarı</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">Haber Gönder</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Gönderdiğiniz haber editör onayından sonra yayına alınır. İletişim bilgileriniz editör kontrolü için saklanır.
          </p>
        </div>

        {state === "sent" ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
            Haberiniz alındı. Editör onayından sonra yayına hazırlanacaktır.
          </div>
        ) : null}
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <div>
            <label className="text-sm font-bold text-slate-800" htmlFor="title">Başlık *</label>
            <input id="title" name="title" required minLength={5} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100" />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-800" htmlFor="spot">Kısa özet</label>
            <input id="spot" name="spot" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100" />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-800" htmlFor="content">Haber metni *</label>
            <textarea id="content" name="content" required minLength={30} rows={8} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100" />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-800" htmlFor="image">Görsel</label>
            <input
              id="image"
              type="file"
              accept="image/*"
              className="mt-1 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-bold file:text-white"
              onChange={(event) => void onImageChange(event.target.files?.[0] ?? null)}
            />
            {imagePreview ? <img src={imagePreview} alt="" className="mt-3 max-h-56 rounded-xl border object-contain" /> : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-sm font-bold text-slate-800" htmlFor="senderFullName">Ad soyad *</label>
              <input id="senderFullName" name="senderFullName" required minLength={3} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100" />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-800" htmlFor="senderEmail">E-posta *</label>
              <input id="senderEmail" name="senderEmail" type="email" required className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100" />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-800" htmlFor="senderPhone">Telefon</label>
              <input id="senderPhone" name="senderPhone" inputMode="tel" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-red-400 focus:ring-2 focus:ring-red-100" />
            </div>
          </div>
          <button
            type="submit"
            disabled={state === "sending"}
            className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {state === "sending" ? "Gönderiliyor..." : "Haberi Gönder"}
          </button>
        </form>
      </div>
    </main>
  );
}
