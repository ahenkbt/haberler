import { useEffect, useRef, useState } from "react";
import { loadStripe, type Stripe, type StripeCardElement } from "@stripe/stripe-js";

export type TrCheckoutPayload =
  | { gateway: "paytr"; iframeToken: string }
  | { gateway: "iyzico"; checkoutFormContent: string; token?: string }
  | { gateway: "paytr"; error: string }
  | { gateway: "iyzico"; error: string }
  | { gateway: "stripe"; clientSecret: string; publishableKey: string };

function IyzicoMount({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !html) return;
    el.innerHTML = html;
    el.querySelectorAll("script").forEach((oldScript) => {
      const s = document.createElement("script");
      for (const a of oldScript.attributes) s.setAttribute(a.name, a.value);
      s.textContent = oldScript.textContent;
      oldScript.replaceWith(s);
    });
  }, [html]);
  return <div ref={ref} className="w-full min-h-[420px]" />;
}

export function StripeCardPay({
  publishableKey,
  clientSecret,
  onSucceeded,
}: {
  publishableKey: string;
  clientSecret: string;
  onSucceeded: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const cardRef = useRef<StripeCardElement | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const el = wrapRef.current;
    if (!el) return undefined;
    (async () => {
      const stripe = await loadStripe(publishableKey);
      if (!stripe || cancelled) return;
      const elements = stripe.elements();
      const card = elements.create("card", { hidePostalCode: true });
      card.mount(el);
      stripeRef.current = stripe;
      cardRef.current = card;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      try {
        cardRef.current?.unmount();
      } catch {
        /* noop */
      }
      cardRef.current = null;
      stripeRef.current = null;
    };
  }, [publishableKey]);

  async function pay() {
    const stripe = stripeRef.current;
    const card = cardRef.current;
    if (!stripe || !card) return;
    setBusy(true);
    setErr(null);
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card },
    });
    setBusy(false);
    if (error) {
      setErr(error.message || "Ödeme tamamlanamadı");
      return;
    }
    if (paymentIntent?.status === "succeeded") onSucceeded();
    else setErr(`Ödeme durumu: ${paymentIntent?.status ?? "bilinmiyor"}`);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <p className="text-xs text-gray-600 leading-relaxed">
        Kart bilgileriniz doğrudan Stripe üzerinden işlenir (platform tahsilatı).
      </p>
      <div ref={wrapRef} className="rounded-lg border border-gray-200 bg-white px-3 py-2" />
      {err ? <p className="text-sm text-rose-600">{err}</p> : null}
      <button
        type="button"
        disabled={!ready || busy}
        onClick={() => void pay()}
        className="w-full rounded-xl bg-indigo-600 text-white font-bold py-3 text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {busy ? "İşleniyor…" : "Ödemeyi tamamla"}
      </button>
    </div>
  );
}

export function TrCheckoutPanel({
  tr,
  onStripeSucceeded,
}: {
  tr: TrCheckoutPayload | null;
  onStripeSucceeded?: () => void;
}) {
  if (!tr) return null;
  if (typeof tr === "object" && "error" in tr && typeof (tr as { error?: unknown }).error === "string") {
    const msg = String((tr as { error: string }).error);
    const gw = (tr as { gateway?: string }).gateway === "iyzico" ? "iyzico" : "paytr";
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm p-4">
        {gw === "paytr" ? "PayTR" : "iyzico"}: {msg}
      </div>
    );
  }
  if ("iframeToken" in tr && tr.gateway === "paytr") {
    return (
      <iframe
        title="Güvenli ödeme"
        src={`https://www.paytr.com/odeme/guvenli/${encodeURIComponent(tr.iframeToken)}`}
        className="w-full min-h-[520px] rounded-xl border border-gray-200 bg-white"
      />
    );
  }
  if ("checkoutFormContent" in tr && tr.gateway === "iyzico") {
    return <IyzicoMount html={tr.checkoutFormContent} />;
  }
  if ("clientSecret" in tr && tr.gateway === "stripe" && tr.publishableKey && onStripeSucceeded) {
    return (
      <StripeCardPay
        publishableKey={tr.publishableKey}
        clientSecret={tr.clientSecret}
        onSucceeded={onStripeSucceeded}
      />
    );
  }
  if ("clientSecret" in tr && tr.gateway === "stripe" && tr.publishableKey && !onStripeSucceeded) {
    return <p className="text-sm text-rose-600">Ödeme tamamlama geri çağrısı eksik; sayfayı yenileyin.</p>;
  }
  return null;
}
