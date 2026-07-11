import { YekpareAiCallLayout } from "../yekpare-ai-call/YekpareAiCallLayout";
import { Link } from "wouter";
import { PbxNav } from "./PbxNav";

export function PbxLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <YekpareAiCallLayout title={title}>
      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-56 shrink-0">
          <div className="rounded-xl border bg-white p-3 shadow-sm space-y-2 lg:sticky lg:top-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2">PBX / Çağrı Merkezi</p>
            <PbxNav compact />
            <Link href="/pbx" className="block text-xs text-[#e61e25] underline px-2 pt-2 border-t">
              Temsilci portalı (/pbx) →
            </Link>
          </div>
        </aside>
        <div className="flex-1 min-w-0 space-y-6">{children}</div>
      </div>
    </YekpareAiCallLayout>
  );
}
