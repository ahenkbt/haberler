import { useEffect, useState } from "react";
import { Link } from "wouter";
import { BadgePercent, ShoppingBag } from "lucide-react";

type Campaign = {
  id: number;
  code: string;
  title: string;
  description?: string | null;
  vendorName: string;
  storefrontHref: string;
};

export default function MagazaKampanyalar() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    fetch("/api/delivery/marketplace?lang=tr&limit=40")
      .then((r) => r.json())
      .then((d) => setCampaigns(d?.data?.campaigns ?? []))
      .catch(() => setCampaigns([]));
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-4">
          <Link href="/magaza" className="flex items-center gap-2 font-black"><ShoppingBag className="h-5 w-5 text-[#0f766e]" /> Kampanyalar</Link>
          <Link href="/magaza" className="text-sm font-black text-[#0f766e]">Ana sayfa</Link>
        </div>
      </div>
      <main className="mx-auto max-w-[1200px] space-y-4 px-4 pb-8 pt-3 md:pt-4 md:pb-10">
        <h1 className="text-3xl font-black">Aktif kampanyalar</h1>
        {campaigns.length ? campaigns.map((c) => (
          <Link key={c.id} href={c.storefrontHref} className="flex items-start gap-4 rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm hover:border-emerald-200">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-[#0f766e]"><BadgePercent className="h-6 w-6" /></span>
            <span>
              <span className="block text-lg font-black text-slate-950">{c.title}</span>
              <span className="mt-1 block text-sm font-semibold text-slate-500">{c.description}</span>
              <span className="mt-2 block text-xs font-black uppercase tracking-wide text-emerald-700">{c.vendorName} · {c.code}</span>
            </span>
          </Link>
        )) : (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">Henüz aktif kampanya bulunamadı.</p>
        )}
      </main>
    </div>
  );
}
