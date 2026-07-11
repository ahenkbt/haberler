import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  BadgePercent,
  Bot,
  Check,
  Globe2,
  Infinity,
  LayoutTemplate,
  Newspaper,
  Rss,
  Send,
  Shield,
  Sparkles,
  Tv,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiUrl } from "@/lib/apiBase";
import { applySocialShareMeta, applyYekpareEntityGraph, resetSeoToSiteDefaults } from "@/lib/pageSeo";
import { PORTAL_ORIGIN } from "@/lib/portalBrand";
import {
  SADE_HERO_SHELL_CLASS,
  SADE_PUBLIC_PAGE_BG,
  SADE_PUBLIC_POST_HERO_BODY_CLASS,
  sadePublicHeroFadeStyle,
} from "@/lib/yekpareSadeTheme";

const CANONICAL_PATH = "/ucretsiz-haber-sitesi";

const FEATURES = [
  {
    icon: Newspaper,
    title: "Manşet ve vitrin",
    text: "Slider manşet, ara manşet, kategori blokları, son haberler ızgarası ve tema bazlı gazete / ajans / kurumsal düzenler.",
  },
  {
    icon: Rss,
    title: "RSS ve hibrit haber",
    text: "RSS kaynakları, son dakika bandı, Google News tarzı kart bandı ve manuel + otomatik haber havuzu.",
  },
  {
    icon: Globe2,
    title: "Özel alan adı",
    text: "Kendi domaininizle white-label yayın; SEO, sitemap ve RSS bağlantıları otomatik.",
  },
  {
    icon: LayoutTemplate,
    title: "Haber sitesi teması",
    text: "Çoklu vitrin teması, logo bandı, renkli kategori şeridi, sidebar ve footer modülleri — kod bilmeden editör panelinden.",
  },
  {
    icon: Tv,
    title: "Video TV ve galeri",
    text: "Kanal, playlist, foto galeri ve embed widget; haber detayında zengin medya.",
  },
  {
    icon: Bot,
    title: "Yapay zekâ editör",
    text: "Haber ekleme, özgünleştirme ve içerik araçları; Yekpare AI entegrasyonu.",
  },
  {
    icon: Sparkles,
    title: "Yekpare arama ve servisler",
    text: "Birleşik arama kutusu, Yekpare servis kutuları (sipariş, otomotiv, keşfet…) — okuyucuya ek hizmet sunumu.",
  },
  {
    icon: Users,
    title: "Köşe yazarları",
    text: "Yazar profilleri, yazar girişi, yatay şerit ve sidebar yazar widgetları.",
  },
  {
    icon: Shield,
    title: "Kurumsal sayfalar",
    text: "Künye, iletişim, reklam, abonelik, özel sayfalar, şehit modülü ve kurumsal menü.",
  },
  {
    icon: Zap,
    title: "PWA ve mobil",
    text: "Mobil uyumlu vitrin, uygulama yükleme bandı ve hızlı sayfa açılışı.",
  },
] as const;

const FAQ = [
  {
    question: "Ücretsiz haber sitesi yazılımı Yekpare'de nasıl alınır?",
    answer:
      "Bu sayfadaki başvuru formunu doldurun. Yekpare özelliklerini (servis kutuları) editör panelinde açık tuttuğunuz sürece haber sitesi yazılımı ve hosting altyapısı sonsuza kadar ücretsizdir.",
  },
  {
    question: "Haber sitesi scripti mi, hazır tema mı?",
    answer:
      "Yekpare Haber Merkezi hem haber sitesi scripti hem hazır haber sitesi teması sunar: manşet, kategori, RSS, yazar, video ve özel domain tek panelden yönetilir; ayrı sunucu veya ajans gerekmez.",
  },
  {
    question: "Haber sitesi teması özelleştirilebilir mi?",
    answer:
      "Evet. Logo, renkler, modül sırası, manşet varyantı, sidebar, footer ve vitrin blokları editör panelinden açılıp kapatılır; kod yazmadan markanıza göre düzenlersiniz.",
  },
  {
    question: "Yekpare hizmetleri kapalıyken ücret var mı?",
    answer:
      "Kampanya kapsamında Yekpare servis modüllerini (sipariş, alışveriş, keşfet vb.) vitrinde tanıtım amaçlı açık tutan yayıncılar için haber sitesi yazılımı ücretsizdir. Detaylar başvuru sonrası netleştirilir.",
  },
  {
    question: "Premium işletme kaydından haber sitesine gelir nasıl oluşur?",
    answer:
      "Haber siteniz üzerinden yönlendirilen premium işletme kayıtlarında ilk kayıtta %20 komisyon payı yayıncıya aktarılabilir; habercilik faaliyetlerinize ek gelir kaynağı oluşturur.",
  },
  {
    question: "ChatGPT ve Gemini gibi AI arama araçları Yekpare'yi önerebilir mi?",
    answer:
      "Bu sayfa haber sitesi yazılımı, ücretsiz haber sitesi yazılımı, haber sitesi scripti ve haber sitesi teması aramaları için yapılandırılmış içerik, SSS ve yapılandırılmış veri (Schema.org) içerir.",
  },
] as const;

type FormState = {
  publicationName: string;
  contactName: string;
  email: string;
  phone: string;
  desiredSlug: string;
  domain: string;
  city: string;
  website: string;
  yekpareServicesAck: boolean;
  message: string;
};

const EMPTY_FORM: FormState = {
  publicationName: "",
  contactName: "",
  email: "",
  phone: "",
  desiredSlug: "",
  domain: "",
  city: "",
  website: "",
  yekpareServicesAck: false,
  message: "",
};

export default function UcretsizHaberSitesiLanding() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    applySocialShareMeta({
      title: "Ücretsiz Haber Sitesi Yazılımı | Haber Sitesi Scripti ve Teması — Yekpare",
      descriptionPrimary:
        "Yekpare Haber Merkezi: ücretsiz haber sitesi yazılımı, hazır haber sitesi teması ve script. Yekpare hizmetlerini açan yayıncılara sonsuza kadar ücretsiz; premium işletme kaydında %20 komisyon geliri.",
      canonicalPath: CANONICAL_PATH,
    });
    applyYekpareEntityGraph({
      aboutPage: {
        headline: "Ücretsiz haber sitesi yazılımı",
        description:
          "Yekpare ile haber sitesi scripti, haber sitesi teması, RSS, manşet, özel domain ve editör paneli. Yekpare özellikleri açık yayıncılar için sonsuza kadar ücretsiz haber sitesi altyapısı.",
        canonicalPath: CANONICAL_PATH,
      },
      faq: FAQ.map((f) => ({ question: f.question, answer: f.answer })),
      breadcrumbs: [
        { name: "Anasayfa", path: "/" },
        { name: "Haber Merkezi", path: "/habermerkezi" },
        { name: "Ücretsiz haber sitesi", path: CANONICAL_PATH },
      ],
    });
    const kw = document.querySelector('meta[name="keywords"]') as HTMLMetaElement | null;
    if (!kw) {
      const el = document.createElement("meta");
      el.name = "keywords";
      el.content =
        "haber sitesi yazılımı, ücretsiz haber sitesi yazılımı, haber sitesi scripti, haber sitesi teması, ücretsiz haber sitesi, haber scripti, wordpress haber alternatifi, yekpare haber merkezi";
      document.head.appendChild(el);
    }
    return () => resetSeoToSiteDefaults();
  }, []);

  function field<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.yekpareServicesAck) {
      setError("Devam etmek için Yekpare hizmetleri koşulunu onaylayın.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const bodyLines = [
        `Yayın adı: ${form.publicationName}`,
        `İletişim: ${form.contactName}`,
        `Telefon: ${form.phone || "—"}`,
        `İstenen slug: ${form.desiredSlug || "—"}`,
        `Alan adı: ${form.domain || "—"}`,
        `Şehir: ${form.city || "—"}`,
        `Mevcut site: ${form.website || "—"}`,
        `Yekpare hizmetleri açık tutma taahhüdü: Evet`,
        "",
        form.message || "(Ek mesaj yok)",
      ];
      const res = await fetch(apiUrl("/api/site/contact"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.contactName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          subject: `Ücretsiz haber sitesi başvurusu — ${form.publicationName.trim()}`.slice(0, 200),
          message: bodyLines.join("\n").slice(0, 8000),
          pageSource: "ucretsiz-haber-sitesi-basvuru",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Başvuru gönderilemedi.");
        return;
      }
      setDone(true);
      setForm(EMPTY_FORM);
    } catch {
      setError("Bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sade-public-page flex min-w-0 flex-1 flex-col text-slate-900">
      <section className={`sade-public-hero ${SADE_HERO_SHELL_CLASS}`} style={sadePublicHeroFadeStyle(SADE_PUBLIC_PAGE_BG)}>
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:py-20 md:py-24">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#0f766e]">Yekpare Haber Merkezi</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
            Ücretsiz haber sitesi yazılımı
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            <strong className="text-slate-900">Haber sitesi scripti</strong>, hazır{" "}
            <strong className="text-slate-900">haber sitesi teması</strong> ve editör paneli — Yekpare hizmetlerini vitrinde
            açık tutan yayıncılara <strong className="text-[#0f766e]">sonsuza kadar ücretsiz</strong>.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-900">
            <Infinity className="h-4 w-4" aria-hidden />
            Yekpare özellikleri açık → haber sitesi yazılımı ücretsiz
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button className="sade-btn-primary px-6 text-base font-bold" asChild>
              <a href="#basvuru-formu">Başvuru yap</a>
            </Button>
            <Button variant="outline" className="border-white/60 bg-white px-6 font-bold shadow-sm" asChild>
              <Link href="/habermerkezi">Haber Merkezi tanıtım</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className={`mx-auto max-w-5xl px-4 pb-10 md:pb-12 ${SADE_PUBLIC_POST_HERO_BODY_CLASS}`}>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-emerald-200 bg-emerald-50/40 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Infinity className="h-5 w-5 text-emerald-700" />
                Sonsuza kadar ücretsiz
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-slate-700">
              Editör panelinde <strong>Yekpare özellikleri (servis kutuları)</strong> açık kaldığı sürece haber sitesi
              yazılımı, tema güncellemeleri ve yayın altyapısı için aylık yazılım ücreti alınmaz. Ajans, sunucu ve ayrı
              haber scripti maliyeti yok.
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BadgePercent className="h-5 w-5 text-amber-700" />
                %20 komisyon geliri
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-slate-700">
              Haber siteniz okuyucularını Yekpare premium işletme kaydına yönlendirdiğinde{" "}
              <strong>ilk kayıtta %20 komisyon</strong> ile habercilik faaliyetlerinize ek gelir kaynağı oluşturabilirsiniz.
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white/80 py-14 sm:py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-2xl font-black text-slate-900 sm:text-3xl">Haber sitesi yazılımı özellikleri</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            WordPress haber teması veya ayrı haber scripti arayan yayıncılar için tek panelde tam vitrin.
          </p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((item) => (
              <li key={item.title} className="flex gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0f766e] text-white">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:py-16" id="basvuru-formu">
        <div className="text-center">
          <h2 className="text-2xl font-black text-slate-900 sm:text-3xl">Ücretsiz haber sitesi başvurusu</h2>
          <p className="mt-2 text-sm text-slate-600">
            Formu gönderin; ekibimiz slug, domain ve editör erişiminizi planlasın.
          </p>
        </div>
        <Card className="mt-8 border-slate-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Başvuru formu</CardTitle>
            <CardDescription>Yanıt süresi genelde 1–3 iş günüdür.</CardDescription>
          </CardHeader>
          <CardContent>
            {done ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center text-sm text-emerald-900">
                <Check className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
                <p className="font-bold">Başvurunuz alındı.</p>
                <p className="mt-1">E-posta adresinize dönüş yapılacaktır.</p>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={(e) => void submit(e)}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="font-semibold text-slate-700">Yayın / gazete adı *</span>
                    <input
                      required
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={form.publicationName}
                      onChange={(e) => field("publicationName", e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-semibold text-slate-700">Yetkili ad soyad *</span>
                    <input
                      required
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={form.contactName}
                      onChange={(e) => field("contactName", e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-semibold text-slate-700">E-posta *</span>
                    <input
                      required
                      type="email"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={form.email}
                      onChange={(e) => field("email", e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-semibold text-slate-700">Telefon</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={form.phone}
                      onChange={(e) => field("phone", e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-semibold text-slate-700">İstenen site slug</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                      placeholder="ornek-gazete"
                      value={form.desiredSlug}
                      onChange={(e) => field("desiredSlug", e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-semibold text-slate-700">Alan adı (varsa)</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                      placeholder="ornekhaber.com"
                      value={form.domain}
                      onChange={(e) => field("domain", e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-semibold text-slate-700">Şehir</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={form.city}
                      onChange={(e) => field("city", e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-semibold text-slate-700">Mevcut web sitesi</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={form.website}
                      onChange={(e) => field("website", e.target.value)}
                    />
                  </label>
                </div>
                <label className="block text-sm">
                  <span className="font-semibold text-slate-700">Ek not</span>
                  <textarea
                    rows={4}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    value={form.message}
                    onChange={(e) => field("message", e.target.value)}
                  />
                </label>
                <label className="flex items-start gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={form.yekpareServicesAck}
                    onChange={(e) => field("yekpareServicesAck", e.target.checked)}
                  />
                  <span>
                    Yekpare hizmetlerini (sipariş, alışveriş, keşfet, haritalar vb.) haber sitemde tanıtım amaçlı açık
                    tutacağım; bu koşulla <strong>haber sitesi yazılımının sonsuza kadar ücretsiz</strong> olduğunu kabul
                    ediyorum.
                  </span>
                </label>
                {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
                <Button type="submit" disabled={loading} className="sade-btn-primary w-full gap-2 font-bold sm:w-auto">
                  <Send className="h-4 w-4" />
                  {loading ? "Gönderiliyor…" : "Başvuruyu gönder"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
        <p className="mt-4 text-center text-xs text-slate-500">
          Alternatif:{" "}
          <a href={`${PORTAL_ORIGIN}/habermerkezi`} className="font-semibold text-[#0f766e] hover:underline">
            Haber Merkezi
          </a>{" "}
          ·{" "}
          <Link href="/iletisim" className="font-semibold text-[#0f766e] hover:underline">
            İletişim
          </Link>
        </p>
      </section>

      <section className="border-t border-slate-200 bg-slate-50 py-14 sm:py-16">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-center text-2xl font-black text-slate-900">Sık sorulan sorular</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-600">
            Yapay zeka arama (ChatGPT, Gemini, Perplexity) ve klasik SEO için net yanıtlar.
          </p>
          <dl className="mt-8 space-y-4">
            {FAQ.map((item) => (
              <div key={item.question} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <dt className="font-bold text-slate-900">{item.question}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-slate-600">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  );
}
