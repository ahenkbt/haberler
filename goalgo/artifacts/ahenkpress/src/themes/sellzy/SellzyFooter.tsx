import { Link } from "wouter";
import { ArrowRight, ChevronRight, Globe, Mail, Phone, Printer } from "lucide-react";
import { SellzyContainer } from "./SellzyContainer";
import type { SellzyCategory } from "./types";

/** Ported from Sellzy apps/web/src/components/common/footer/Footer.tsx + SubscriptionTab.tsx */
export function SellzyFooter({ categories = [] }: { categories?: SellzyCategory[] }) {
  const footerSections = [
    {
      title: "Kurumsal",
      links: [
        { label: "Hakkımızda", href: "/magaza/hakkimizda" },
        { label: "Kullanım koşulları", href: "/kullanim-kosullari" },
        { label: "Kariyer", href: "/kariyer" },
        { label: "Blog", href: "/magaza/blog" },
        { label: "İletişim", href: "/iletisim" },
        { label: "Gizlilik", href: "/gizlilik" },
      ],
    },
    {
      title: "Hesabım",
      links: [
        { label: "Hesabım", href: "/hesabim" },
        { label: "İade politikası", href: "/magaza/kampanyalar" },
        { label: "Satıcı ol", href: "/magaza/satici-ol" },
        { label: "Favoriler", href: "/magaza/sepet" },
        { label: "Sipariş takip", href: "/siparis-takip" },
        { label: "SSS", href: "/destek" },
      ],
    },
    {
      title: "Kategoriler",
      links: (categories.slice(0, 6).length ? categories.slice(0, 6) : [
        { name: "Elektronik", slug: "elektronik" },
        { name: "Moda", slug: "moda" },
        { name: "Ev & Yaşam", slug: "ev-yasam" },
        { name: "Market", slug: "market" },
      ]).map((c) => ({
        label: "name" in c ? c.name : (c as SellzyCategory).name,
        href: `/magaza/kategori/${"slug" in c && c.slug ? c.slug : (c as SellzyCategory).slug || (c as SellzyCategory).name}`,
      })),
    },
  ];

  return (
    <div className="text-primary-foreground/80 w-full">
      <section className="px-4 md:px-0 max-w-[932px] mx-auto text-center lg:pb-6 pb-[70px] lg:rounded-[164px] -mb-[100px] relative z-10 bg-white text-primary">
        <h3 className="mb-4 text-3xl font-semibold text-light-primary-text">Bültene abone olun</h3>
        <p className="mb-6 text-light-secondary-text/50">
          Kampanyalar, yeni ürünler ve satıcı vitrinlerinden haberdar olun.
        </p>
        <form
          className="relative flex items-center justify-between w-full md:max-w-[480px] mx-auto p-1.5 rounded-full border border-gray-200 bg-white shadow-sm"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="pl-4 pr-3 text-gray-400"><Mail className="w-6 h-6" /></div>
          <input
            type="email"
            className="flex-1 w-full bg-transparent border-none outline-none text-gray-700 placeholder:text-gray-400 text-base py-3"
            placeholder="E-posta adresiniz"
            required
          />
          <button type="submit" className="bg-primary-light hover:bg-primary-dark text-white font-medium px-6 py-3 rounded-full flex items-center gap-2 group whitespace-nowrap">
            Abone ol
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>
      </section>

      <footer className="md:pb-15 pb-[100px] bg-gradient-to-b from-emerald-50/70 to-white border-t border-emerald-100 pt-40 xl:rounded-tr-[22px] xl:rounded-tl-[22px] w-full text-slate-700">
        <SellzyContainer>
          <div className="pb-9 grid grid-cols-12 gap-6">
            <div className="md:col-span-12 col-span-12 xl:col-span-3 flex flex-col gap-y-6">
              <Link href="/magaza">
                <span className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0f766e] text-white">
                    <img src="/sellzy/footer-logo.svg" alt="" className="h-8 w-8" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </span>
                  <span className="text-xl font-bold text-[#0f766e]">Yekpare Pazaryeri</span>
                </span>
              </Link>
              <p className="text-slate-600 text-base">
                Yerel satıcıları, ürünleri ve mağaza vitrinlerini tek Yekpare alışveriş deneyiminde birleştirir.
              </p>
              <div className="flex flex-col gap-y-[15px]">
                <p className="text-base font-semibold text-slate-900">İletişim</p>
                <p className="flex items-center gap-x-2 text-sm text-slate-600">
                  <Phone className="size-4" /> 0850 000 00 00
                </p>
                <p className="flex items-center gap-x-2 text-sm text-slate-600">
                  <Mail className="size-4" /> destek@yekpare.net
                </p>
                <p className="flex items-center gap-x-2 text-sm text-slate-600">
                  <Printer className="size-4" /> +90 212 000 00 00
                </p>
                <p className="flex items-center gap-x-2 text-sm text-slate-600">
                  <Globe className="size-4" /> yekpare.net/magaza
                </p>
              </div>
            </div>
            {footerSections.map((section) => (
              <div key={section.title} className="col-span-6 md:col-span-4 xl:col-span-3">
                <h4 className="text-lg font-bold text-[#0f766e] mb-6">{section.title}</h4>
                <ul className="flex flex-col gap-y-3">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-sm text-slate-700 hover:text-[#039D55] flex items-center gap-1 hoverEffect">
                        <ChevronRight className="size-3" /> {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-emerald-100 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <p>© {new Date().getFullYear()} Yekpare — Tüm hakları saklıdır.</p>
            <div className="flex gap-4">
              <Link href="/gizlilik" className="hover:text-[#0f766e]">Gizlilik</Link>
              <Link href="/kullanim-kosullari" className="hover:text-[#0f766e]">Koşullar</Link>
              <Link href="/magaza/satici-ol" className="hover:text-[#0f766e]">Satıcı ol</Link>
            </div>
          </div>
        </SellzyContainer>
      </footer>
    </div>
  );
}
