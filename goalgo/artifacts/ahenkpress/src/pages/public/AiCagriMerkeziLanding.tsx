import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  PhoneCall,
  Bot,
  Target,
  BarChart3,
  Workflow,
  BookOpen,
  Calendar,
  MessageSquare,
  Check,
  ArrowRight,
  Shield,
  Zap,
  Loader2,
} from "lucide-react";
import { apiFetch, apiUrl, portalCanonicalAdminPath } from "@/lib/apiBase";
import { applySocialShareMeta, resetSeoToSiteDefaults } from "@/lib/pageSeo";
import { CALL_CENTER_MODULES } from "@/lib/callCenterModules";
import {
  SADE_HERO_EYEBROW_CLASS,
  SADE_HERO_ICON_CLASS,
  SADE_HERO_SHELL_CLASS,
  YEKPARE_SADE_TEAL,
} from "@/lib/yekpareSadeTheme";

type Plan = {
  id: string;
  name: string;
  priceLabel: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  cta: "contact" | "subscribe";
};

type PublicStatus = {
  subscriptionActive: boolean;
};

const FEATURES = [
  { icon: Bot, title: "Akıllı sesli asistanlar", desc: "Doğal Türkçe görüşme, kayıt ve yönlendirme akışı." },
  { icon: Target, title: "Toplu arama kampanyaları", desc: "Otomatik arama, transkript ve sonuç takibi." },
  { icon: Workflow, title: "Akış otomasyonu", desc: "Randevu, form ve webhook akışları." },
  { icon: BookOpen, title: "Bilgi tabanı", desc: "Dokümanlarınızdan RAG ile doğru yanıtlar." },
  { icon: BarChart3, title: "Analitik", desc: "Çağrı performansı ve dönüşüm raporları." },
  { icon: Calendar, title: "Randevu ve CRM", desc: "Google Takvim ve hızlı CRM." },
];

export default function AiCagriMerkeziLanding() {
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    applySocialShareMeta({
      title: "Yekpare Akıllı Çağrı Merkezi",
      descriptionPrimary:
        "Yapay zekâ destekli sesli arama ve çağrı merkezi otomasyonu. Kampanya, SIP, mesajlaşma ve ekip yönetimi.",
      canonicalPath: "/ai-cagri-merkezi",
    });
    return () => resetSeoToSiteDefaults();
  }, []);

  const { data: plansData } = useQuery({
    queryKey: ["/api/call-center/public/plans"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/call-center/public/plans"));
      if (!r.ok) throw new Error("Paketler yüklenemedi");
      return (await r.json()) as { plans: Plan[] };
    },
  });

  const { data: status } = useQuery({
    queryKey: ["/api/call-center/public/status"],
    queryFn: async () => {
      const r = await fetch(apiUrl("/api/call-center/public/status"));
      if (!r.ok) throw new Error("Durum alınamadı");
      return (await r.json()) as PublicStatus;
    },
  });

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/call-center/subscribe-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, planId: selectedPlan, pageSource: "ai-cagri-merkezi" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gönderilemedi");
      return data;
    },
    onSuccess: () => setSubmitted(true),
  });

  const plans = plansData?.plans ?? [];

  return (
    <div className="sade-public-page flex min-w-0 flex-1 flex-col text-slate-900">
      <section className={`sade-public-hero ${SADE_HERO_SHELL_CLASS} rounded-b-[2rem]`}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(3,157,85,0.14),transparent_55%),radial-gradient(ellipse_at_85%_20%,rgba(15,118,110,0.12),transparent_40%)]" />
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:py-24">
          <div className={SADE_HERO_ICON_CLASS}>
            <PhoneCall className="h-8 w-8 text-white" />
          </div>
          <p className={SADE_HERO_EYEBROW_CLASS}>Yekpare</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">Akıllı Çağrı Merkezi</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Yapay zekâ ile giden ve gelen aramaları otomatikleştirin. Kampanya, asistan, bilgi tabanı ve analiz — tek
            platformda.
          </p>
          <HeroCtas />
          <HeroBadges />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">Neden AI Çağrı Merkezi?</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
          Yerel Türkçe panel, çağrı akışı ve kampanya yönetimi tek çatı altında çalışır.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="border-slate-200/80 shadow-sm">
              <CardHeader>
                <f.icon className="h-8 w-8" style={{ color: YEKPARE_SADE_TEAL }} />
                <CardTitle className="text-lg">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">{f.desc}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-bold text-slate-900">Dahil modüller</h2>
          <p className="mt-2 text-slate-600">Mesajlaşma, hat yönetimi, ekip ve bağlantı ayarları Yekpare panelinden doğrudan yönetilir.</p>
          <div className="mt-8 flex flex-wrap gap-2">
            {CALL_CENTER_MODULES.map((m) => (
              <Badge key={m.id} variant="secondary" className="px-3 py-1.5 text-sm font-normal">
                {m.labelTr.replace("SIP Trunk", "Hat yönetimi").replace("REST API", "Bağlantılar")}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      <section id="paketler" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold text-slate-900">Abonelik paketleri</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-slate-600">
          Aktivasyon yönetici onayı ile açılır. Kurumsal paket için teklif alın.
        </p>
        <PlansSection
          plans={plans}
          selectedPlan={selectedPlan}
          onSelectPlan={setSelectedPlan}
          subscriptionActive={status?.subscriptionActive}
        />
      </section>

      <section id="basvuru" className="mx-auto max-w-xl px-4 pb-20">
        <SubscribeCard
          plans={plans}
          selectedPlan={selectedPlan}
          form={form}
          setForm={setForm}
          submitted={submitted}
          pending={subscribeMutation.isPending}
          error={subscribeMutation.isError ? subscribeMutation.error : null}
          onSubmit={() => subscribeMutation.mutate()}
        />
      </section>
    </div>
  );
}

function HeroCtas() {
  return (
    <div className="mt-8 flex flex-wrap justify-center gap-3">
      <Button asChild size="lg" className="sade-btn-primary gap-2">
        <a href="#paketler">
          Paketleri gör
          <ArrowRight className="h-4 w-4" />
        </a>
      </Button>
      <Button asChild size="lg" variant="outline" className="border-emerald-200 bg-white text-slate-900 hover:bg-emerald-50">
        <Link href={portalCanonicalAdminPath("/admin/yekpare-ai-call")}>Yönetim paneli</Link>
      </Button>
    </div>
  );
}

function HeroBadges() {
  return (
    <div className="mt-10 flex flex-wrap justify-center gap-3 text-xs text-slate-500">
      <span className="flex items-center gap-1">
        <Zap className="h-3.5 w-3.5" /> Anında kurulum
      </span>
      <span className="flex items-center gap-1">
        <Shield className="h-3.5 w-3.5" /> Güvenli hat yönetimi
      </span>
      <span className="flex items-center gap-1">
        <MessageSquare className="h-3.5 w-3.5" /> Çok kanallı
      </span>
    </div>
  );
}

function PlansSection({
  plans,
  selectedPlan,
  onSelectPlan,
  subscriptionActive,
}: {
  plans: Plan[];
  selectedPlan: string;
  onSelectPlan: (id: string) => void;
  subscriptionActive?: boolean;
}) {
  if (!plans.length) {
    return (
      <div className="mt-10 flex justify-center py-12 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  return (
    <>
      <PlansGrid plans={plans} selectedPlan={selectedPlan} onSelectPlan={onSelectPlan} />
      {subscriptionActive ? (
        <p className="mt-6 text-center text-sm text-green-700">
          Abonelik aktif —{" "}
          <Link href={portalCanonicalAdminPath("/admin/yekpare-ai-call")} className="font-medium underline">
            panele git
          </Link>
        </p>
      ) : null}
    </>
  );
}

function PlansGrid({
  plans,
  selectedPlan,
  onSelectPlan,
}: {
  plans: Plan[];
  selectedPlan: string;
  onSelectPlan: (id: string) => void;
}) {
  return (
    <div className="mt-10 grid gap-6 md:grid-cols-3">
      {plans.map((plan) => (
        <Card
          key={plan.id}
          className={`relative cursor-pointer transition-shadow hover:shadow-md ${
            plan.highlighted ? "border-[#0f766e] ring-2 ring-[#0f766e]/20" : ""
          } ${selectedPlan === plan.id ? "ring-2 ring-indigo-500" : ""}`}
          onClick={() => onSelectPlan(plan.id)}
        >
          {plan.highlighted ? (
            <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#0f766e]">Önerilen</Badge>
          ) : null}
          <CardHeader>
            <CardTitle>{plan.name}</CardTitle>
            <p className="text-2xl font-bold text-slate-900">{plan.priceLabel}</p>
            <CardDescription>{plan.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-slate-600">
              {plan.features.map((feat) => (
                <li key={feat} className="flex gap-2">
                  <Check className="h-4 w-4 shrink-0 text-green-600" />
                  {feat}
                </li>
              ))}
            </ul>
            <Button
              type="button"
              className="mt-6 w-full"
              variant={selectedPlan === plan.id ? "default" : "outline"}
              onClick={(e) => {
                e.stopPropagation();
                onSelectPlan(plan.id);
                document.getElementById("basvuru")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              {plan.cta === "contact" ? "Teklif al" : "Bu paketi seç"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SubscribeCard({
  plans,
  selectedPlan,
  form,
  setForm,
  submitted,
  pending,
  error,
  onSubmit,
}: {
  plans: Plan[];
  selectedPlan: string;
  form: { name: string; email: string; phone: string; company: string; message: string };
  setForm: React.Dispatch<
    React.SetStateAction<{ name: string; email: string; phone: string; company: string; message: string }>
  >;
  submitted: boolean;
  pending: boolean;
  error: unknown;
  onSubmit: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Abonelik talebi</CardTitle>
        <CardDescription>
          Seçili paket: <strong>{plans.find((p) => p.id === selectedPlan)?.name ?? selectedPlan}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {submitted ? (
          <Alert className="border-green-200 bg-green-50 text-green-900">
            <Check className="h-4 w-4" />
            <AlertDescription>Talebiniz alındı. Ekibimiz en kısa sürede dönüş yapacaktır.</AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ad Soyad" id="cc-name">
                <Input id="cc-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </Field>
              <Field label="E-posta" id="cc-email">
                <Input
                  id="cc-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </Field>
            </div>
            <Field label="Telefon" id="cc-phone">
              <Input id="cc-phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </Field>
            <Field label="Şirket" id="cc-company">
              <Input
                id="cc-company"
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              />
            </Field>
            <Field label="Mesaj" id="cc-msg">
              <Textarea
                id="cc-msg"
                rows={4}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              />
            </Field>
            <Button
              type="button"
              className="sade-btn-primary w-full gap-2"
              disabled={pending}
              onClick={onSubmit}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Talep gönder
            </Button>
            {error ? (
              <p className="text-sm text-red-600">{error instanceof Error ? error.message : "Gönderilemedi"}</p>
            ) : null}
          </>
        )}
        <p className="text-xs text-slate-500">
          <Link href="/iletisim" className="underline">
            İletişim
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
