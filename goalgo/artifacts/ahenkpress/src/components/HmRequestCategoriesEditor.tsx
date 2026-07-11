import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { HmRequestCategory } from "@/lib/hmRequestForm";

function moveArrayItem<T>(items: T[], index: number, dir: -1 | 1): T[] {
  const next = index + dir;
  if (next < 0 || next >= items.length) return items;
  const copy = [...items];
  const [moved] = copy.splice(index, 1);
  copy.splice(next, 0, moved);
  return copy;
}

type HmRequestCategoriesEditorProps = {
  title: string;
  description: string;
  items: HmRequestCategory[];
  disabled?: boolean;
  onChange: (items: HmRequestCategory[]) => void;
  onSave: () => void;
  defaultExamples?: string;
};

function makeRequestCategoryId(): string {
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function HmRequestCategoriesEditor({
  title,
  description,
  items,
  disabled,
  onChange,
  onSave,
  defaultExamples,
}: HmRequestCategoriesEditorProps) {
  const addItem = () => {
    onChange([...items, { id: makeRequestCategoryId(), label: "Yeni talep konusu", enabled: true }]);
  };

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Label className="font-semibold text-slate-900">{title}</Label>
          <p className="text-xs text-slate-500 mt-1">{description}</p>
          {defaultExamples ? (
            <p className="text-xs text-slate-400 mt-1">Örnekler: {defaultExamples}</p>
          ) : null}
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-1" disabled={disabled} onClick={addItem}>
          <Plus className="h-4 w-4" />
          Konu ekle
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
          Henüz talep konusu yok. Ziyaretçiler formda konu seçemez — en az bir madde ekleyin.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:flex-nowrap"
            >
              <Input
                className="min-w-0 flex-1"
                value={item.label}
                disabled={disabled}
                placeholder="Talep konusu"
                onChange={(e) =>
                  onChange(items.map((x) => (x.id === item.id ? { ...x, label: e.target.value } : x)))
                }
              />
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  disabled={disabled || index === 0}
                  onClick={() => onChange(moveArrayItem(items, index, -1))}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  disabled={disabled || index === items.length - 1}
                  onClick={() => onChange(moveArrayItem(items, index, 1))}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Switch
                  checked={item.enabled !== false}
                  disabled={disabled}
                  onCheckedChange={(c) =>
                    onChange(items.map((x) => (x.id === item.id ? { ...x, enabled: !!c } : x)))
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-red-600"
                  disabled={disabled}
                  onClick={() => onChange(items.filter((x) => x.id !== item.id))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button type="button" size="sm" disabled={disabled} onClick={onSave}>
        Talep konularını kaydet
      </Button>
    </div>
  );
}
