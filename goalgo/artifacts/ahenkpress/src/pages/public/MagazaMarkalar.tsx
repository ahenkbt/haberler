import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ShoppingBag, Store } from "lucide-react";
import { resolveClientMediaSrc } from "@/lib/apiBase";

type Brand = { id: number; name: string; slug: string; logoUrl?: string | null; href: string };

export default function MagazaMarkalar() {
  const [brands, setBrands] = useState<Brand[]>([]);

  useEffect(() => {
    fetch("/api/delivery/marketplace?lang=tr&limit=12")
      .then((r) => r.json())
      .then((d) => setBrands(d?.data?.brands ?? []))
      .catch(() => setBrands([]));
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-4">
          <Link href="/magaza" className="flex items-center gap-2 font-black"><ShoppingBag className="h-5 w-5 text-[#0f766e]" /> Markalar</Link>
          <Link href="/magaza" className="text-sm font-black text-[#0f766e]">Ana sayfa</Link>
        </div>
      </div>
      <main className="mx-auto max-w-[1200px] px-4 pb-8 pt-3 md:pt-4 md:pb-10">
        <h1 className="mb-6 text-3xl font-black">Pazaryeri markaları</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {brands.map((brand) => {
            const logo = resolveClientMediaSrc(brand.logoUrl);
            return (
              <Link key={brand.id} href={brand.href} className="flex items-center gap-4 rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm hover:border-emerald-200">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-slate-50">
                  {logo ? <img src={logo} alt={brand.name} className="h-full w-full object-cover" /> : <Store className="h-7 w-7 text-slate-300" />}
                </div>
                <span className="font-black text-slate-900">{brand.name}</span>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
