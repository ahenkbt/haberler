import { Link } from "wouter";
import { Loader2, ExternalLink } from "lucide-react";
import { YekpareAiCallLayout } from "./YekpareAiCallLayout";
import { Button } from "@/components/ui/button";
import { callCenterAdminWorkspaceHref } from "@/lib/callCenterWorkspace";

export default function YekpareAiCallModuleStub({
  moduleId,
  label,
  description,
  workspacePath,
}: {
  moduleId: string;
  label: string;
  description: string;
  workspacePath: string;
}) {
  return (
    <YekpareAiCallLayout title={label}>
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 p-8 text-center max-w-lg">
        <Loader2 className="w-8 h-8 text-[#e61e25] mx-auto mb-3 animate-pulse" />
        <p className="font-semibold text-gray-900">Modül yükleniyor</p>
        <p className="text-sm text-gray-600 mt-2">{description}</p>
        <p className="text-xs text-gray-400 mt-2 font-mono">{moduleId}</p>
        <Link href={callCenterAdminWorkspaceHref(workspacePath)} className="inline-block mt-6">
          <Button type="button" className="bg-[#e61e25] hover:bg-[#c91920] gap-2">
            {label} — çalışma alanında aç
            <ExternalLink className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </YekpareAiCallLayout>
  );
}
