import { AdminLayout } from "@/components/AdminLayout";
import { PhoneCall } from "lucide-react";
import { Link } from "wouter";
import { YekpareAiCallNav } from "./YekpareAiCallNav";

export function YekpareAiCallLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AdminLayout title="Yekpare AI Call">
      <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-8rem)]">
        <aside className="lg:w-64 shrink-0 lg:sticky lg:top-4 lg:self-start max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border bg-white p-4 shadow-sm">
          <div className="mb-4 pb-3 border-b">
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <PhoneCall className="w-6 h-6 text-[#e61e25]" />
              Yekpare AI Call
            </h1>
            <p className="text-xs text-gray-500 mt-1">{title}</p>
          </div>
          <YekpareAiCallNav />
        </aside>

        <main className="flex-1 min-w-0 space-y-6">
          <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600 max-w-2xl">
              Yekpare yerel çağrı merkezi — AI Call Center ve PBX aynı platformda. API anahtarları, SIP trunk ve kampanyalar
              yönetim panelinden yapılandırılır.
            </p>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Link
                href="/admin/yekpare-ai-call/verimor"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e3a5f] px-3 py-2 text-sm font-medium text-white hover:bg-[#152a45]"
              >
                Verimor ayarları
              </Link>
              <Link
                href="/admin/yekpare-ai-call/ayarlar"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#e61e25] px-3 py-2 text-sm font-medium text-white hover:bg-[#c91920]"
              >
                AI ayarları
              </Link>
              <Link href="/ai-cagri-merkezi" className="text-sm text-[#e61e25] underline inline-flex items-center py-2">
                Tanıtım
              </Link>
            </div>
          </header>
          {children}
        </main>
      </div>
    </AdminLayout>
  );
}
