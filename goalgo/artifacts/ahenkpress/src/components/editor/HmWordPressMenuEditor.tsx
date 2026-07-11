import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { HmCorporateMenuItem, HmExtraPage } from "@/lib/newsSiteLayout";
import {
  itemsToMenuRows,
  makeMenuItemId,
  menuItemTypeLabel,
  menuRowsToItems,
  reorderMenuRows,
  type MenuDropPosition,
  type MenuEditorRow,
} from "@/lib/hmMenuEditorUtils";
import { resolveHmEditorLoginPublicHref } from "@/lib/hmEditorPublicLinks";
import type { NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";
import { isHmTelifPageSlug, shouldShowHmTelifInPublicNav } from "@/lib/hmTelifNav";
import { HM_TELIF_MENU_LABEL } from "@/lib/hmTelifDefaults";

export type MenuPageCandidate = {
  key: string;
  label: string;
  href: string;
  group?: string;
};

export type MenuCategoryCandidate = {
  id: number;
  name: string;
  slug: string;
};

type HmWordPressMenuEditorProps = {
  menuName: string;
  items: HmCorporateMenuItem[];
  allowNesting: boolean;
  disabled?: boolean;
  saving?: boolean;
  pageCandidates: MenuPageCandidate[];
  categoryCandidates: MenuCategoryCandidate[];
  onChange: (items: HmCorporateMenuItem[]) => void;
  onSave: () => void;
  onReset: () => void;
};

const STANDARD_PAGE_GROUPS = ["Site", "Kurumsal", "Medya"];

export function HmWordPressMenuEditor({
  menuName,
  items,
  allowNesting,
  disabled,
  saving,
  pageCandidates,
  categoryCandidates,
  onChange,
  onSave,
  onReset,
}: HmWordPressMenuEditorProps) {
  const rows = useMemo(() => itemsToMenuRows(items), [items]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [pageSearch, setPageSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [selectedPageKeys, setSelectedPageKeys] = useState<Set<string>>(() => new Set());
  const [selectedCategorySlugs, setSelectedCategorySlugs] = useState<Set<string>>(() => new Set());
  const [customUrl, setCustomUrl] = useState("https://");
  const [customLabel, setCustomLabel] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropHint, setDropHint] = useState<{ index: number; position: MenuDropPosition } | null>(null);

  const filteredPages = useMemo(() => {
    const q = pageSearch.trim().toLowerCase();
    if (!q) return pageCandidates;
    return pageCandidates.filter(
      (p) => p.label.toLowerCase().includes(q) || p.href.toLowerCase().includes(q),
    );
  }, [pageCandidates, pageSearch]);

  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) return categoryCandidates;
    return categoryCandidates.filter(
      (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q),
    );
  }, [categoryCandidates, categorySearch]);

  const commitRows = (nextRows: MenuEditorRow[]) => {
    onChange(menuRowsToItems(nextRows));
  };

  const addItems = (newItems: HmCorporateMenuItem[]) => {
    if (!newItems.length) return;
    onChange([...items, ...newItems]);
  };

  const addSelectedPages = () => {
    const picked = pageCandidates.filter((p) => selectedPageKeys.has(p.key));
    addItems(
      picked.map((p) => ({
        id: makeMenuItemId("page"),
        label: p.label,
        href: p.href,
        enabled: true,
      })),
    );
    setSelectedPageKeys(new Set());
  };

  const addSelectedCategories = () => {
    const picked = categoryCandidates.filter((c) => selectedCategorySlugs.has(c.slug));
    addItems(
      picked.map((c) => ({
        id: makeMenuItemId("cat"),
        label: c.name,
        href: `/kategori/${c.slug}`,
        enabled: true,
      })),
    );
    setSelectedCategorySlugs(new Set());
  };

  const addCustomLink = () => {
    const label = customLabel.trim();
    const href = customUrl.trim();
    if (!label || !href) return;
    addItems([
      {
        id: makeMenuItemId("link"),
        label,
        href,
        enabled: true,
      },
    ]);
    setCustomLabel("");
    setCustomUrl("https://");
  };

  const updateItem = (id: string, patch: Partial<HmCorporateMenuItem>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const removeItem = (id: string) => {
    onChange(
      items
        .filter((item) => item.id !== id)
        .map((item) => ((item.parentId ?? "") === id ? { ...item, parentId: null } : item)),
    );
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDrop = (targetIndex: number, position: MenuDropPosition) => {
    if (dragIndex == null) return;
    const next = reorderMenuRows(rows, dragIndex, targetIndex, allowNesting ? position : position === "inside" ? "after" : position);
    commitRows(next);
    setDragIndex(null);
    setDropHint(null);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(280px,360px)_1fr]">
      <div className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-bold text-slate-900">Menü öğeleri ekle</h3>
          <p className="mt-1 text-xs text-slate-500">
            WordPress&apos;teki gibi soldan seçip sağdaki menü yapısına ekleyin.
          </p>
        </div>

        <Accordion type="multiple" defaultValue={["pages", "categories", "custom"]} className="rounded-xl border border-slate-200 bg-white px-3">
          <AccordionItem value="pages">
            <AccordionTrigger className="text-sm font-semibold text-slate-800 hover:no-underline">
              Sayfalar
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-4">
              <Input
                placeholder="Sayfa ara…"
                value={pageSearch}
                disabled={disabled}
                onChange={(e) => setPageSearch(e.target.value)}
              />
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/80 p-2">
                {filteredPages.length === 0 ? (
                  <p className="px-2 py-3 text-xs text-slate-500">Sayfa bulunamadı.</p>
                ) : (
                  filteredPages.map((page) => (
                    <label
                      key={page.key}
                      className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white"
                    >
                      <Checkbox
                        checked={selectedPageKeys.has(page.key)}
                        disabled={disabled}
                        onCheckedChange={(checked) => {
                          setSelectedPageKeys((prev) => {
                            const next = new Set(prev);
                            if (checked) next.add(page.key);
                            else next.delete(page.key);
                            return next;
                          });
                        }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-slate-800">{page.label}</span>
                        <span className="block truncate font-mono text-[10px] text-slate-400">{page.href}</span>
                        {page.group ? (
                          <span className="mt-0.5 inline-block rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] text-slate-600">
                            {page.group}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ))
                )}
              </div>
              <Button type="button" size="sm" className="w-full" disabled={disabled || selectedPageKeys.size === 0} onClick={addSelectedPages}>
                Menüye ekle
              </Button>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="categories">
            <AccordionTrigger className="text-sm font-semibold text-slate-800 hover:no-underline">
              Kategoriler
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-4">
              <Input
                placeholder="Kategori ara…"
                value={categorySearch}
                disabled={disabled}
                onChange={(e) => setCategorySearch(e.target.value)}
              />
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/80 p-2">
                {filteredCategories.length === 0 ? (
                  <p className="px-2 py-3 text-xs text-slate-500">Kategori bulunamadı.</p>
                ) : (
                  filteredCategories.map((cat) => (
                    <label
                      key={cat.slug}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white"
                    >
                      <Checkbox
                        checked={selectedCategorySlugs.has(cat.slug)}
                        disabled={disabled}
                        onCheckedChange={(checked) => {
                          setSelectedCategorySlugs((prev) => {
                            const next = new Set(prev);
                            if (checked) next.add(cat.slug);
                            else next.delete(cat.slug);
                            return next;
                          });
                        }}
                      />
                      <span className="font-medium text-slate-800">{cat.name}</span>
                      <span className="font-mono text-[10px] text-slate-400">/kategori/{cat.slug}</span>
                    </label>
                  ))
                )}
              </div>
              <Button
                type="button"
                size="sm"
                className="w-full"
                disabled={disabled || selectedCategorySlugs.size === 0}
                onClick={addSelectedCategories}
              >
                Menüye ekle
              </Button>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="custom">
            <AccordionTrigger className="text-sm font-semibold text-slate-800 hover:no-underline">
              Özel bağlantılar
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-4">
              <div>
                <Label className="text-xs text-slate-600">URL</Label>
                <Input
                  className="mt-1 font-mono text-xs"
                  value={customUrl}
                  disabled={disabled}
                  onChange={(e) => setCustomUrl(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Bağlantı metni</Label>
                <Input
                  className="mt-1"
                  value={customLabel}
                  disabled={disabled}
                  onChange={(e) => setCustomLabel(e.target.value)}
                />
              </div>
              <Button
                type="button"
                size="sm"
                className="w-full gap-1"
                disabled={disabled || !customLabel.trim() || !customUrl.trim()}
                onClick={addCustomLink}
              >
                <Plus className="h-4 w-4" />
                Menüye ekle
              </Button>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-4">
          <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Menü yapısı</Label>
          <Input className="mt-2 max-w-md font-semibold" value={menuName} readOnly />
          <p className="mt-2 text-xs text-slate-500">
            Öğeleri sürükleyip bırakarak sıralayın
            {allowNesting ? "; bir öğenin üzerine bırakarak alt menü oluşturun." : "."}
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-500">
              Menünüz henüz boş. Soldan sayfa, kategori veya özel bağlantı ekleyin.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((row, index) => {
              const { item, depth } = row;
              const expanded = expandedIds.has(item.id);
              const isDropTarget = dropHint?.index === index;
              return (
                <div key={item.id}>
                  {isDropTarget && dropHint?.position === "before" ? (
                    <div className="mx-4 h-0.5 rounded bg-orange-500" />
                  ) : null}
                  <div
                    draggable={!disabled}
                    onDragStart={() => setDragIndex(index)}
                    onDragEnd={() => {
                      setDragIndex(null);
                      setDropHint(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                      const y = e.clientY - rect.top;
                      const third = rect.height / 3;
                      let position: MenuDropPosition = "after";
                      if (allowNesting && y < third) position = "before";
                      else if (allowNesting && y > third * 2) position = "inside";
                      setDropHint({ index, position });
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dropHint) handleDrop(dropHint.index, dropHint.position);
                    }}
                    className={`group ${dragIndex === index ? "opacity-50" : ""}`}
                    style={{ paddingLeft: `${16 + depth * 24}px` }}
                  >
                    <div className="flex items-center gap-2 border-b border-slate-50 px-4 py-2.5 hover:bg-slate-50/80">
                      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-300 group-hover:text-slate-500" />
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        disabled={disabled}
                        onClick={() => toggleExpanded(item.id)}
                      >
                        {expanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                        )}
                        <span className="truncate font-medium text-slate-900">
                          {item.icon ? (
                            <span className="mr-1.5" aria-hidden>
                              {item.icon}
                            </span>
                          ) : null}
                          {item.label || "Başlıksız"}
                        </span>
                        <span className="ml-2 shrink-0 text-[10px] font-semibold text-slate-500">
                          {item.enabled === false ? "Pasif" : "Aktif"}
                        </span>
                        <span className="ml-auto shrink-0 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          {menuItemTypeLabel(item.href)}
                        </span>
                      </button>
                      <Switch
                        checked={item.enabled !== false}
                        disabled={disabled}
                        aria-label={`${item.label || "Menü"} aktif`}
                        onCheckedChange={(checked) => updateItem(item.id, { enabled: !!checked })}
                      />
                    </div>

                    {expanded ? (
                      <div className="space-y-3 border-b border-slate-100 bg-slate-50/60 px-4 py-4" style={{ marginLeft: `${depth * 24}px` }}>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <Label className="text-xs text-slate-600">Gezinti etiketi</Label>
                            <Input
                              className="mt-1"
                              value={item.label}
                              disabled={disabled}
                              onChange={(e) => updateItem(item.id, { label: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-600">URL</Label>
                            <Input
                              className="mt-1 font-mono text-xs"
                              value={item.href}
                              disabled={disabled}
                              onChange={(e) => updateItem(item.id, { href: e.target.value })}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label className="text-xs text-slate-600">Simge / emoji (isteğe bağlı)</Label>
                            <Input
                              className="mt-1 max-w-xs"
                              value={item.icon ?? ""}
                              disabled={disabled}
                              placeholder="📰"
                              maxLength={8}
                              onChange={(e) => updateItem(item.id, { icon: e.target.value.trim() || null })}
                            />
                            <p className="mt-1 text-[11px] text-slate-500">
                              Logo menüsünde bağlantı yazısının önünde görünür.
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            disabled={disabled}
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="mr-1 h-4 w-4" />
                            Kaldır
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  {isDropTarget && dropHint?.position === "after" ? (
                    <div className="mx-4 h-0.5 rounded bg-orange-500" />
                  ) : null}
                  {isDropTarget && dropHint?.position === "inside" ? (
                    <div className="mx-4 mb-1 h-1 rounded bg-orange-300" style={{ marginLeft: `${16 + (depth + 1) * 24}px` }} />
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-4">
          <p className="text-xs text-slate-500">
            {rows.length} öğe · {allowNesting ? "Alt menü desteklenir" : "Düz liste"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={disabled || saving} onClick={onReset}>
              Menüyü sıfırla
            </Button>
            <Button type="button" size="sm" className="bg-orange-600 text-white hover:bg-orange-700" disabled={disabled || saving} onClick={onSave}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Menüyü kaydet
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function buildDefaultMenuPageCandidates(
  hmBase: string,
  extraPages: HmExtraPage[] | null | undefined,
  opts?: { siteOrigin?: string | null; layoutPrefs?: NewsSiteLayoutPrefs | null },
): MenuPageCandidate[] {
  const prefix = hmBase || "";
  const siteSlug = prefix.match(/^\/tr\/([^/]+)/)?.[1];
  const siteOrigin = String(opts?.siteOrigin ?? "").trim().replace(/\/+$/, "");
  const editorLoginHref = resolveHmEditorLoginPublicHref(siteOrigin || null);
  const standard: MenuPageCandidate[] = [
    { key: "home", label: "Anasayfa", href: prefix || "/", group: "Site" },
    { key: "all-news", label: "Tüm Haberler", href: `${prefix}/tum-haberler`, group: "Site" },
    { key: "editor-login", label: "Editör girişi", href: editorLoginHref, group: "Site" },
    { key: "kunye", label: "Künye", href: `${prefix}/kunye`, group: "Kurumsal" },
    { key: "iletisim", label: "İletişim", href: `${prefix}/iletisim`, group: "Kurumsal" },
    { key: "reklam", label: "Reklam", href: `${prefix}/reklam`, group: "Kurumsal" },
    { key: "abonelik", label: "Abonelik", href: `${prefix}/abonelik`, group: "Kurumsal" },
    { key: "yazarlar", label: "Yazarlar", href: `${prefix}/yazarlar`, group: "Medya" },
    { key: "rss", label: "RSS Bağlantıları", href: `${prefix}/rss-baglantilari`, group: "Medya" },
    { key: "haber-gonder", label: "Haber Gönder", href: `${prefix}/haber-gonder`, group: "Medya" },
    { key: "sitene-ekle", label: "Sitene Ekle", href: `${prefix}/sitene-ekle`, group: "Medya" },
    { key: "foto-galeri", label: "Foto Galeri", href: `${prefix}/foto-galeri`, group: "Medya" },
  ];
  const customPages = (extraPages ?? [])
    .filter((p) => p.enabled !== false && p.title.trim() && p.slug.trim())
    .filter((p) => !isHmTelifPageSlug(p.slug))
    .map((p) => ({
      key: `page-${p.id}`,
      label: p.title.trim(),
      href: `${prefix}/${encodeURIComponent(p.slug.trim())}`,
      group: "Özel sayfa",
    }));
  const telifCandidate: MenuPageCandidate[] =
    shouldShowHmTelifInPublicNav(opts?.layoutPrefs ?? null)
      ? [
          {
            key: "telif-kullanim",
            label: HM_TELIF_MENU_LABEL,
            href: `${prefix}/telif-kullanim`,
            group: "Kurumsal",
          },
        ]
      : [];
  return [...standard, ...telifCandidate, ...customPages];
}

export { STANDARD_PAGE_GROUPS };
