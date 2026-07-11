import { useEffect } from "react";
import {
  ArrowRight,
  Briefcase,
  Check,
  PhoneCall,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { applySocialShareMeta, resetSeoToSiteDefaults } from "@/lib/pageSeo";
import {
  SADE_HERO_EYEBROW_CLASS,
  SADE_HERO_ICON_CLASS,
  SADE_HERO_SHELL_CLASS,
  YEKPARE_SADE_TEAL,
} from "@/lib/yekpareSadeTheme";

const QUALITIES = [
  "İkna kabiliyeti yüksek, enerjisiyle telefona hayat verebilen",
  "Diksiyonu düzgün ve hedef odaklı çalışan",
  "Satışın bir tutku olduğunu bilen",
  "Özgüveni yüksek ve ikna gücüyle gelirini katlamayı hedefleyen",
];

const BENEFITS = [
  "Tamamen performans odaklı yüksek prim sistemi",
  "İşin uzmanlarından profesyonel satış ve ürün eğitimleri",
  "Türkiye'nin yerli teknoloji girişiminde kariyer fırsatı",
];

const APPLY_HREF = "/iletisim-kunye";

export default function Kariyer() {
  useEffect(() => {
    applySocialShareMeta({
      title: "Kariyer — Çağrı Merkezi Satış Temsilcileri | Yekpare.net",
      descriptionPrimary:
        "Yekpare.net ailesine katılın. Türkiye'nin yerli Süper App'inde çağrı merkezi satış temsilcisi olarak yüksek kazanç potansiyeli ve prim usulü çalışma modeli.",
      canonicalPath: "/kariyer",
    });
    return () => resetSeoToSiteDefaults();
  }, []);

  return (
    <div className="sade-public-page flex min-w-0 flex-1 flex-col text-slate-900">
      <section className={`sade-public-hero ${SADE_HERO_SHELL_CLASS} rounded-b-[2rem]`}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(3,157,85,0.14),transparent_55%),radial-gradient(ellipse_at_85%_20%,rgba(15,118,110,0.12),transparent_40%)]" />
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:py-20">
          <div className={SADE_HERO_ICON_CLASS}>
            <Briefcase className="h-8 w-8 text-white" />
          </div>
          <p className={SADE_HERO_EYEBROW_CLASS}>Kariyer</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Yekpare.net ailesine katılmaya hazır mısınız?
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Türkiye&apos;nin yeni nesil yerli arama motoru ve &quot;Süper App&quot; uygulaması yekpare.net olarak,
            dijital dünyada işletmelerin görünürlüğünü artırıyor ve kullanıcılarımıza tek bir uygulama üzerinden
            hayatlarını kolaylaştıracak kapsamlı çözümler sunuyoruz. Büyüyen ekibimizde, Türkiye genelindeki
            işletmeleri dijital dünyamıza kazandıracak{" "}
            <strong className="text-slate-900">Çağrı Merkezi Satış Temsilcileri</strong> arıyoruz!
          </p>
          <Button asChild size="lg" className="sade-btn-primary mt-8 gap-2">
            <Link href={APPLY_HREF}>
              Hemen başvur
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader>
              <Sparkles className="h-8 w-8" style={{ color: YEKPARE_SADE_TEAL }} />
              <CardTitle className="text-xl">Neden Yekpare.net?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed text-slate-600">
              <p>
                Biz bir &quot;Süper App&quot;iz. Sadece bir arama motoru değil; kullanıcıların alışverişten randevuya,
                konum bazlı ihtiyaçlardan dijital hizmetlere kadar her şeyi bulabildiği devasa bir ekosistemiz.
                İşletmeler için ise; harita kayıtlarından profesyonel firma profillerine kadar dijital vitrinlerini
                oluşturdukları bir merkeziz.
              </p>
              <p>
                <strong className="text-slate-900">Modelimiz şeffaftır:</strong> Diğer platformların aksine, işletmeleri
                komisyon yükü altında ezmiyoruz. Abonelik modelimizle işletmelere sürdürülebilir, tahmin edilebilir ve
                uygun maliyetli bir çözüm sunuyoruz.
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 shadow-sm">
            <CardHeader>
              <Users className="h-8 w-8" style={{ color: YEKPARE_SADE_TEAL }} />
              <CardTitle className="text-xl">Kimi arıyoruz?</CardTitle>
              <CardDescription>Ekibimize katılacak ideal aday profili</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-slate-600">
                {QUALITIES.map((item) => (
                  <li key={item} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-y bg-slate-50 py-14">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-2">
          <Card className="border-slate-200/80 bg-white shadow-sm">
            <CardHeader>
              <Target className="h-8 w-8" style={{ color: YEKPARE_SADE_TEAL }} />
              <CardTitle className="text-xl">İşletmelerimize neler sunuyoruz?</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-slate-600">
              Yekpare.net üzerinde; restoranlardan kafelere, tamir servislerinden butik mağazalara, hukuk bürolarından
              sağlık kuruluşlarına kadar her sektörü dijital dünyada görünür kılıyoruz.
            </CardContent>
          </Card>

          <Card className="border-slate-200/80 bg-white shadow-sm">
            <CardHeader>
              <TrendingUp className="h-8 w-8" style={{ color: YEKPARE_SADE_TEAL }} />
              <CardTitle className="text-xl">Kazanç ve yan haklar</CardTitle>
              <CardDescription>Prim usulü çalışma modeli</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-600">
                Bu pozisyonda yüksek kazanç potansiyeli sunan &quot;Prim Usulü&quot; çalışma modeli uygulanmaktadır.
                Başarılı olduğunuz sürece kazancınızın sınırı yoktur.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                {BENEFITS.map((item) => (
                  <li key={item} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="basvuru" className="mx-auto max-w-2xl px-4 py-16 pb-24">
        <div className="mb-8 text-center">
          <PhoneCall className="mx-auto h-8 w-8" style={{ color: YEKPARE_SADE_TEAL }} />
          <h2 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">Başvuru</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Siz de Türkiye&apos;nin yerli gücüne ortak olmak ve yüksek kazançlı bir satış kariyerine adım atmak
            istiyorsanız, güncel CV&apos;nizi ve kısa bir ön yazınızı iletişim formumuz üzerinden iletebilirsiniz.
          </p>
          <p className="mt-4 text-sm font-semibold text-slate-800">Yekpare.net – Türkiye&apos;nin Dijital Geleceği.</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Çağrı Merkezi Satış Temsilcisi başvurusu</CardTitle>
            <CardDescription>
              Başvurunuzu iletişim sayfamızdaki form aracılığıyla gönderebilirsiniz.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 pb-8">
            <p className="text-center text-sm leading-relaxed text-slate-600">
              Mesajınızda pozisyon adını (<strong className="text-slate-900">Çağrı Merkezi Satış Temsilcisi</strong>),
              iletişim bilgilerinizi ve CV&apos;nizi belirtmeniz yeterlidir.
            </p>
            <Button asChild size="lg" className="sade-btn-primary w-full gap-2 sm:w-auto">
              <Link href={APPLY_HREF}>
                İletişim formuna git
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
