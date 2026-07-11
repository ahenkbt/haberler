import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FooterLegalLink } from "@workspace/site-nav";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { useState } from "react";

type Props = {
  title: string;
  description: string;
  links: FooterLegalLink[];
  onChange: (next: FooterLegalLink[]) => void;
  onResetDefaults: () => void;
  labelPlaceholder?: string;
  hrefPlaceholder?: string;
};

export function FooterLinksEditor({
  title,
  description,
  links,
  onChange,
  onResetDefaults,
  labelPlaceholder = "Menü etiketi",
  hrefPlaceholder = "/sayfa-yolu",
}: Props) {
  const [label, setLabel] = useState("");
  const [href, setHref] = useState("");

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= links.length) return;
    const next = [...links];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const add = () => {
    const l = label.trim();
    const h = href.trim();
    if (!l || !h) return;
    onChange([...links, { label: l, href: h }]);
    setLabel("");
    setHref("");
  };

  return (
    <div className="border-t pt-6 mt-6 space-y-3">
      <Label className="text-gray-800">{title}</Label>
      <p className="text-xs text-gray-500">{description}</p>
      <div className="border rounded-md divide-y">
        {links.map((row, i) => (
          <div key={`${row.href}-${i}`} className="flex flex-wrap items-center gap-2 px-3 py-2.5 bg-gray-50/80">
            <span className="flex-1 text-sm font-medium text-gray-900 min-w-0">{row.label}</span>
            <span className="text-xs font-mono text-gray-500 truncate max-w-[200px]">{row.href}</span>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => move(i, -1)} disabled={i === 0}>
              <ChevronUp className="w-4 h-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => move(i, 1)} disabled={i === links.length - 1}>
              <ChevronDown className="w-4 h-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-red-600" onClick={() => onChange(links.filter((_, k) => k !== i))}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input placeholder={labelPlaceholder} value={label} onChange={(e) => setLabel(e.target.value)} />
        <Input placeholder={hrefPlaceholder} value={href} onChange={(e) => setHref(e.target.value)} className="font-mono text-sm" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" className="gap-1" onClick={add}>
          <Plus className="w-3.5 h-3.5" />
          Satıra ekle
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onResetDefaults}>
          Varsayılan listeye dön
        </Button>
      </div>
    </div>
  );
}
