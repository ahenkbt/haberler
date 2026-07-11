/**
 * Ported from Sellzy apps/web (public)/about/page.tsx — AboutHero, AboutFeatures, AboutQuality, AboutTeam, AboutTestimonials
 */
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ChevronRight, Shield, Truck, Users } from "lucide-react";
import { SellzyContainer } from "@/themes/sellzy/SellzyContainer";

type AboutData = {
  title: string;
  mission: string;
  vision: string;
  stats: Array<{ value: string; label: string }>;
};

const FALLBACK: AboutData = {
  title: "Yekpare Pazaryeri hakkında",
  mission: "Yerel satıcıları tek çatı altında buluşturarak sağlık, market ve kişisel bakım alışverişini kolaylaştırıyoruz.",
  vision: "Türkiye'nin en güvenilir çok satıcılı e-ticaret pazaryeri olmak.",
  stats: [
    { value: "500+", label: "Aktif satıcı" },
    { value: "10K+", label: "Ürün çeşidi" },
    { value: "4.8", label: "Ortalama puan" },
    { value: "81", label: "İl kapsamı" },
  ],
};

export default function MagazaHakkimizda() {
  const [about, setAbout] = useState<AboutData>(FALLBACK);

  useEffect(() => {
    fetch("/api/delivery/marketplace/about")
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && d?.data) setAbout({ ...FALLBACK, ...d.data });
      })
      .catch(() => undefined);
  }, []);

  return (
    <main className="bg-background w-full">
      <SellzyContainer className="py-6">
        <nav className="mb-6 flex items-center gap-1.5 text-sm text-light-secondary-text">
          <Link href="/magaza" className="hover:text-primary">Pazaryeri</Link>
          <ChevronRight className="size-3.5" />
          <span className="text-light-primary-text">Hakkımızda</span>
        </nav>
      </SellzyContainer>

      <section className="bg-primary/5 py-16 md:py-24">
        <SellzyContainer className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-primary mb-4">Yekpare Pazaryeri</p>
            <h1 className="text-4xl md:text-5xl font-bold text-light-primary-text leading-tight mb-6">{about.title}</h1>
            <p className="text-lg text-light-secondary-text leading-8 mb-4">{about.mission}</p>
            <p className="text-base text-light-secondary-text leading-7">{about.vision}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {about.stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-border bg-white p-6 text-center shadow-sm">
                <p className="text-3xl font-bold text-primary">{stat.value}</p>
                <p className="text-sm text-light-secondary-text mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </SellzyContainer>
      </section>

      <section className="py-16">
        <SellzyContainer>
          <h2 className="text-3xl font-bold text-light-primary-text mb-10 text-center">Neden Yekpare?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Truck, title: "Hızlı teslimat", text: "Yerel satıcılardan güvenilir kargo ve teslimat seçenekleri." },
              { icon: Shield, title: "Güvenli alışveriş", text: "3D Secure ödeme altyapısı ve satıcı doğrulama süreçleri." },
              { icon: Users, title: "Çok satıcılı pazar", text: "Tek sepette farklı mağazalardan ürün keşfi ve karşılaştırma." },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-border bg-white p-8 text-center">
                <item.icon className="size-10 text-primary mx-auto mb-4" />
                <h3 className="font-bold text-xl mb-2">{item.title}</h3>
                <p className="text-light-secondary-text text-sm leading-6">{item.text}</p>
              </div>
            ))}
          </div>
        </SellzyContainer>
      </section>
    </main>
  );
}
