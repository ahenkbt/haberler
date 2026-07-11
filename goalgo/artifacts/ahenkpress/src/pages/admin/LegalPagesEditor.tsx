import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  LEGAL_PAGE_DEFINITIONS,
  defaultLegalPagesContent,
  type LegalPageKey,
  type LegalPagesContentMap,
} from "@workspace/site-nav";
import { ExternalLink, RotateCcw } from "lucide-react";
import { useState } from "react";

type Props = {
  value: LegalPagesContentMap;
  onChange: (next: LegalPagesContentMap) => void;
};

export function LegalPagesEditor({ value, onChange }: Props) {
  const [activeKey, setActiveKey] = useState<LegalPageKey>(LEGAL_PAGE_DEFINITIONS[0]!.key);
  const activeDef = LEGAL_PAGE_DEFINITIONS.find((d) => d.key === activeKey)!;
  const active = value[activeKey];

  const patchActive = (patch: Partial<{ title: string; bodyHtml: string }>) => {
    onChange({
      ...value,
      [activeKey]: { ...value[activeKey], ...patch },
    });
  };

  const resetActive = () => {
    const defaults = defaultLegalPagesContent();
    onChange({ ...value, [activeKey]: defaults[activeKey] });
  };

  const resetAll = () => onChange(defaultLegalPagesContent());

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {LEGAL_PAGE_DEFINITIONS.map((def) => (
          <Button
            key={def.key}
            type="button"
            size="sm"
            variant={def.key === activeKey ? "default" : "outline"}
            onClick={() => setActiveKey(def.key)}
          >
            {def.label}
          </Button>
        ))}
      </div>

      <div className="rounded-lg border bg-gray-50/60 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-gray-900">{activeDef.label}</p>
            <p className="text-xs text-gray-500 font-mono">{activeDef.path}</p>
          </div>
          <a
            href={activeDef.path}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[#e61e25] hover:underline"
          >
            Önizle
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="space-y-2">
          <Label htmlFor="legal-page-title">Sayfa başlığı</Label>
          <Input
            id="legal-page-title"
            value={active.title}
            onChange={(e) => patchActive({ title: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="legal-page-body">İçerik (HTML)</Label>
          <p className="text-xs text-gray-500">
            Başlıklar için <span className="font-mono">&lt;h2&gt;</span>, paragraflar için{" "}
            <span className="font-mono">&lt;p&gt;</span>, listeler için{" "}
            <span className="font-mono">&lt;ul&gt;&lt;li&gt;</span> kullanın.
            {activeKey === "iletisim-kunye" ? (
              <> Boş bırakırsanız hazır iletişim formu ve ofis kartları gösterilir.</>
            ) : null}
          </p>
          <Textarea
            id="legal-page-body"
            value={active.bodyHtml}
            onChange={(e) => patchActive({ bodyHtml: e.target.value })}
            rows={16}
            className="font-mono text-xs leading-relaxed"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={resetActive}>
            <RotateCcw className="w-3.5 h-3.5" />
            Bu sayfayı varsayılana sıfırla
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={resetAll}>
            Tüm yasal sayfaları sıfırla
          </Button>
        </div>
      </div>
    </div>
  );
}
