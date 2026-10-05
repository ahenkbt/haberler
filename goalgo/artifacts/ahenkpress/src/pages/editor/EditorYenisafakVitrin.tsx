import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowDown, ArrowUp, Loader2 } from "lucide-react";
import { EditorLayout } from "@/components/EditorLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useHmEditor } from "@/contexts/HmEditorContext";
import { useToast } from "@/hooks/use-toast";
import type { HmYsKunye, NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";
import {
  YS_AD_SLOTS,
  YS_MANSET_PRESETS,
  YS_MODULES,
  buildYenisafakLayoutPatch,
  readYsEditorSnapshot,
  type YsAdSlotKey,
  type YsEditorSnapshot,
  type YsMansetPresetId,
} from "@/lib/yenisafakEditorLayout";

const KUNYE_FIELDS: Array<{ key: keyof HmYsKunye; label: string; multiline?: boolean }> = [
  { key: "lead", label: "Üst not", multiline: true },
  { key: "yayin", label: "Yayın" },
  { key: "genelMudur", label: "Genel müdür" },
  { key: "yayinYonetmeni", label: "Genel yayın yönetmeni" },
  { key: "yaziIsleri", label: "Yazı işleri müdürü" },
  { key: "address", label: "Adres" },
  { key: "phone", label: "Telefon" },
  { key: "email", label: "E-posta" },
  { key: "tuzel", label: "Tüzel kişilik" },
  { key: "yayinIlkeleri", label: "Yayın ilkeleri", multiline: true },
];

function moveRow(rows: YsEditorSnapshot["modules"], index: number, dir: -1 | 1) {
  const nextIndex = index + dir;
  if (nextIndex < 0 || nextIndex >= rows.length) return rows;
  const next = [...rows];
  const current = next[index];
  const other = next[nextIndex];
  if (!current || !other) return rows;
  next[index] = other;
  next[nextIndex] = current;
  return next;
}

export default function EditorYenisafakVitrin() {
  const { newsLayoutPrefs, saveNewsSiteLayout, site } = useHmEditor();
  const { toast } = useToast();
  const loaded = useMemo(() => readYsEditorSnapshot(newsLayoutPrefs), [newsLayoutPrefs]);
  const [draft, setDraft] = useState<YsEditorSnapshot>(loaded);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(loaded);
  }, [loaded]);

  const save = async (next: YsEditorSnapshot) => {
    setDraft(next);
    setSaving(true);
    const patch = buildYenisafakLayoutPatch(newsLayoutPrefs, next);
    const result = await saveNewsSiteLayout(newsLayoutPrefs, {
      layoutPatch: patch as Partial<NewsSiteLayoutPrefs>,
      allowStockLayoutReset: true,
    });
    setSaving(false);
    if (!result.ok) {
      toast({
        title: "Kaydedilemedi",
        description: result.error.slice(0, 220) || "Sunucuya yazılamadı.",
        variant: "destructive",
      });
      setDraft(loaded);
      return;
    }
    toast({ title: "Yenişafak ayarları kaydedildi", description: site?.displayName ?? undefined });
  };

  const setAd = (slotKey: YsAdSlotKey, patch: Partial<YsEditorSnapshot["ads"][YsAdSlotKey]>) => {
    setDraft((prev) => ({
      ...prev,
      ads: { ...prev.ads, [slotKey]: { ...prev.ads[slotKey], ...patch } },
    }));
  };

  return (
    <EditorLayout title="Vitrin ayarları">
      <div className="max-w-3xl space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
          <p className="text-base font-black text-slate-900">Yenişafak tema</p>
          <p className="text-sm text-slate-600">
            Bu haber sitesi tek temayı kullanır. HABER, KURUMSAL, VATAN ve çiçek temaları seçilemez. Görünüm burada
            renk ve manşet yerleşiminden değişir. Kayıt <code>layout_json</code> alanına yazılır; PHP tema aynı
            anahtarları okur.
          </p>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <Label className="font-semibold text-slate-900">Manşet yerleşimi</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => setDraft((prev) => ({ ...prev, preset: null }))}
              className={`rounded-lg border px-3 py-2 text-left ${
                draft.preset == null ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white"
              }`}
            >
              <span className="block text-sm font-bold">Tema varsayılanı</span>
              <span className={`mt-0.5 block text-[11px] ${draft.preset == null ? "text-white/70" : "text-slate-500"}`}>
                Kayıtlı yerleşim yoksa PHP temanın kendi manşeti kalır.
              </span>
            </button>
            {YS_MANSET_PRESETS.map((preset) => {
              const active = draft.preset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  disabled={saving}
                  onClick={() => setDraft((prev) => ({ ...prev, preset: preset.id as YsMansetPresetId }))}
                  className={`rounded-lg border px-3 py-2 text-left ${
                    active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white"
                  }`}
                >
                  <span className="block text-sm font-bold">{preset.label}</span>
                  <span className={`mt-0.5 block text-[11px] ${active ? "text-white/70" : "text-slate-500"}`}>
                    {preset.description}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <Label className="font-semibold text-slate-900">Renkler</Label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Ana vurgu (hmPrimaryColor)</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Ana vurgu rengi"
                  className="h-10 w-14 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
                  value={/^#[0-9a-f]{6}$/i.test(draft.primaryColor) ? draft.primaryColor : "#c8102e"}
                  disabled={saving}
                  onChange={(e) => setDraft((prev) => ({ ...prev, primaryColor: e.target.value }))}
                />
                <Input
                  value={draft.primaryColor}
                  disabled={saving}
                  placeholder="#c8102e"
                  onChange={(e) => setDraft((prev) => ({ ...prev, primaryColor: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">İkinci renk</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="İkinci renk"
                  className="h-10 w-14 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
                  value={/^#[0-9a-f]{6}$/i.test(draft.secondaryColor) ? draft.secondaryColor : "#1a1020"}
                  disabled={saving}
                  onChange={(e) => setDraft((prev) => ({ ...prev, secondaryColor: e.target.value }))}
                />
                <Input
                  value={draft.secondaryColor}
                  disabled={saving}
                  placeholder="#1a1020"
                  onChange={(e) => setDraft((prev) => ({ ...prev, secondaryColor: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label className="font-semibold text-slate-900">Anasayfa modülleri</Label>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/editor/kose-yazarlari">Yazarları düzenle</Link>
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Sıra, kategori ve adet PHP temanın <code>hmNewsHomeModuleOrder</code>, kategori ve adet alanlarına yazılır.
            Kapalı modül hem yeni hem eski anahtarda false olur.
          </p>
          <div className="space-y-3">
            {draft.modules.map((row, index) => {
              const def = YS_MODULES.find((item) => item.id === row.id);
              return (
                <div key={row.id} className="rounded-lg border border-slate-100 bg-slate-50/80 p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{def?.label ?? row.id}</p>
                      <p className="font-mono text-[11px] text-slate-500">{row.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={saving || index === 0}
                        onClick={() =>
                          setDraft((prev) => ({ ...prev, modules: moveRow(prev.modules, index, -1) }))
                        }
                        aria-label="Yukarı taşı"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={saving || index === draft.modules.length - 1}
                        onClick={() =>
                          setDraft((prev) => ({ ...prev, modules: moveRow(prev.modules, index, 1) }))
                        }
                        aria-label="Aşağı taşı"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Switch
                        checked={row.enabled}
                        disabled={saving}
                        onCheckedChange={(checked) =>
                          setDraft((prev) => ({
                            ...prev,
                            modules: prev.modules.map((item) =>
                              item.id === row.id ? { ...item, enabled: checked } : item,
                            ),
                          }))
                        }
                        aria-label={`${def?.label ?? row.id} açık`}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Kategori slug</Label>
                      <Input
                        value={row.category}
                        disabled={saving}
                        placeholder={def?.defaultCategory || "boş: tüm kategoriler"}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            modules: prev.modules.map((item) =>
                              item.id === row.id ? { ...item, category: e.target.value } : item,
                            ),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Adet (1–24)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={24}
                        value={row.count}
                        disabled={saving}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            modules: prev.modules.map((item) =>
                              item.id === row.id ? { ...item, count: Number(e.target.value) } : item,
                            ),
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <Label className="font-semibold text-slate-900">Logo</Label>
          <p className="text-xs text-slate-500">
            Adres <code>logoUrl</code> alanına yazılır. Dosya yükleme Genel ayarlardaki logo kutusundan da yapılır.
          </p>
          <Input
            value={draft.logoUrl}
            disabled={saving}
            placeholder="https://… veya /api/media/uploads/…"
            onChange={(e) => setDraft((prev) => ({ ...prev, logoUrl: e.target.value }))}
          />
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/editor/genel-ayarlar#hm-site-seo-logo">Logo yükleme</Link>
          </Button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <Label className="font-semibold text-slate-900">Slogan</Label>
          <Input
            value={draft.slogan}
            disabled={saving}
            placeholder="Footer sloganı"
            onChange={(e) => setDraft((prev) => ({ ...prev, slogan: e.target.value }))}
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <Label className="font-semibold text-slate-900">Künye</Label>
          <p className="text-xs text-slate-500">
            Dolu alanlar <code>hmYsKunye</code> olarak saklanır. Boş bırakılan künye, temanın mevcut metnini değiştirmez.
          </p>
          <div className="grid gap-3">
            {KUNYE_FIELDS.map((field) => (
              <div key={field.key} className="space-y-1">
                <Label className="text-xs">{field.label}</Label>
                {field.multiline ? (
                  <Textarea
                    value={draft.kunye[field.key] ?? ""}
                    disabled={saving}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, kunye: { ...prev.kunye, [field.key]: e.target.value } }))
                    }
                  />
                ) : (
                  <Input
                    value={draft.kunye[field.key] ?? ""}
                    disabled={saving}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, kunye: { ...prev.kunye, [field.key]: e.target.value } }))
                    }
                  />
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label className="font-semibold text-slate-900">Reklam alanları</Label>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/editor/reklam-alanlari">Ayrıntılı reklam sayfası</Link>
            </Button>
          </div>
          {YS_AD_SLOTS.map((slot) => {
            const row = draft.ads[slot.slotKey];
            return (
              <div key={slot.slotKey} className="rounded-lg border border-slate-100 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{slot.name}</p>
                    <p className="text-[11px] text-slate-500">{slot.description}</p>
                  </div>
                  <Switch
                    checked={row.enabled}
                    disabled={saving}
                    onCheckedChange={(checked) => setAd(slot.slotKey, { enabled: checked })}
                    aria-label={`${slot.name} açık`}
                  />
                </div>
                <Input
                  value={row.imageMediaUrl ?? ""}
                  disabled={saving}
                  placeholder="Görsel adresi"
                  onChange={(e) => setAd(slot.slotKey, { imageMediaUrl: e.target.value, contentMode: "image" })}
                />
                <Input
                  value={row.imageClickUrl ?? ""}
                  disabled={saving}
                  placeholder="Tıklanınca açılacak adres"
                  onChange={(e) => setAd(slot.slotKey, { imageClickUrl: e.target.value })}
                />
              </div>
            );
          })}
        </section>

        <Button type="button" className="bg-slate-900 text-white" disabled={saving} onClick={() => void save(draft)}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Yenişafak ayarlarını kaydet
        </Button>
      </div>
    </EditorLayout>
  );
}
