import { useMemo, useState } from "react";
import { Loader2, Star, ChevronDown, ChevronUp, ExternalLink, MapPin, Phone } from "lucide-react";

type MenuItem = {
  name: string;
  description?: string | null;
  price?: number | null;
  imageUrl?: string | null;
  category?: string | null;
};

type PreviewCategory = {
  name: string;
  items: MenuItem[];
};

export type ExternalMenuPreview = {
  platform: string;
  sourceUrl: string;
  name: string;
  description?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  neighborhood?: string | null;
  lat?: number | null;
  lng?: number | null;
  imageUrl?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  isOpen: boolean;
  categories: PreviewCategory[];
  totalItems: number;
};

type Props = {
  compact?: boolean;
  exampleUrls?: string[];
  previewUrl: string;
  importUrl: string;
  buildHeaders: () => Record<string, string>;
  onImported?: (stats: { items?: number; categories?: number }) => void;
  extraImportBody?: Record<string, unknown>;
};

const PLATFORM_LABELS: Record<string, string> = {
  yemeksepeti: "Yemeksepeti",
  "getir-yemek": "Getir Yemek",
  "getir-carsi": "Getir Çarşı",
  "migros-yemek": "Migros Yemek",
  "trendyol-yemek": "Trendyol Yemek",
  tgo: "TGO Yemek",
  "google-maps": "Google Haritalar",
  unknown: "Harici kaynak",
};

function fmtPrice(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `₺${v.toFixed(2).replace(".", ",")}`;
}

export function ExternalMenuImportPanel({
  compact,
  exampleUrls,
  previewUrl,
  importUrl,
  buildHeaders,
  onImported,
  extraImportBody,
}: Props) {
  const [url, setUrl] = useState("");
  const [pastedHtml, setPastedHtml] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [preview, setPreview] = useState<ExternalMenuPreview | null>(null);
  const [rawMenu, setRawMenu] = useState<MenuItem[]>([]);
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const trimmedPaste = pastedHtml.trim();
  const pastedJsonReady =
    trimmedPaste.startsWith("{") &&
    /menu_categories|productCategories|menuCategories/i.test(trimmedPaste);
  const pastedHtmlReady = trimmedPaste.length > 400 || pastedJsonReady;

  const selectedItemCount = useMemo(() => {
    if (!preview) return 0;
    if (!selectedCats.size) return preview.totalItems;
    return preview.categories
      .filter((c) => selectedCats.has(c.name))
      .reduce((n, c) => n + c.items.length, 0);
  }, [preview, selectedCats]);

  async function runPreview() {
    const trimmed = url.trim();
    if (!trimmed) return;
    if (pastedHtml.trim() && !pastedHtmlReady) {
      setError("Yapıştırılan sayfa kaynağı çok kısa; tarayıcıda Ctrl+A ile tüm HTML’i kopyalayıp tekrar deneyin.");
      return;
    }
    setPreviewing(true);
    setError("");
    setWarning("");
    setPreview(null);
    try {
      const body: Record<string, string> = { sourceUrl: trimmed };
      if (pastedHtmlReady) body.prefetchedHtml = pastedHtml.trim();
      const res = await fetch(previewUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...buildHeaders() },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || "Önizleme alınamadı");
        return;
      }
      const p = d.preview as ExternalMenuPreview;
      setPreview(p);
      setRawMenu(Array.isArray(d.rawMenu) ? d.rawMenu : []);
      const w = typeof d.warning === "string" ? d.warning.trim() : "";
      if (w) setWarning(w);
      else if (pastedHtmlReady) setWarning("");
      else if (p.totalItems === 0 && p.description?.includes("HTTP")) setWarning(p.description);
      const catNames = new Set((p.categories || []).map((c) => c.name));
      setSelectedCats(catNames);
      setExpandedCats(new Set());
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setPreviewing(false);
    }
  }

  async function runImport() {
    if (!preview || !url.trim()) return;
    setImporting(true);
    setError("");
    try {
      const selectedCategories = [...selectedCats];
      const res = await fetch(importUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...buildHeaders() },
        credentials: "include",
        body: JSON.stringify({
          sourceUrl: url.trim(),
          selectedCategories: selectedCategories.length ? selectedCategories : undefined,
          menu: rawMenu.length ? rawMenu : undefined,
          prefetchedHtml: pastedHtmlReady ? pastedHtml.trim() : undefined,
          platform: preview.platform,
          name: preview.name,
          phone: preview.phone,
          address: preview.address,
          city: preview.city,
          district: preview.district,
          neighborhood: preview.neighborhood,
          lat: preview.lat,
          lng: preview.lng,
          rating: preview.rating,
          reviewCount: preview.reviewCount,
          ...extraImportBody,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || "İçe aktarma başarısız");
        return;
      }
      onImported?.(d.menuStats ?? {});
      setPreview(null);
      setRawMenu([]);
      setUrl("");
      setPastedHtml("");
    } catch {
      setError("Bağlantı hatası");
    } finally {
      setImporting(false);
    }
  }

  function toggleCat(name: string) {
    setSelectedCats((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function toggleExpand(name: string) {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="space-y-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Yemeksepeti / Getir işletme linki yapıştırın"
          className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm outline-none focus:border-indigo-400 placeholder-gray-400"
        />
        {exampleUrls?.length ? (
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Örnek:{" "}
            {exampleUrls.map((u, i) => (
              <span key={u}>
                {i > 0 ? " · " : ""}
                <button type="button" className="text-indigo-600 hover:underline" onClick={() => setUrl(u)}>
                  {u.includes("yemeksepeti") ? "Yemeksepeti" : u.includes("getir") ? "Getir" : "Link"}
                </button>
              </span>
            ))}
          </p>
        ) : null}
        <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50/60 p-3 space-y-2">
          <div>
            <p className="text-sm font-semibold text-indigo-950">Sayfa kaynağını yapıştır (405 / menü gelmiyorsa)</p>
            <p className="text-[11px] text-indigo-900/80 mt-0.5 leading-relaxed">
              Restoran sayfasında{" "}
              <kbd className="px-1 py-0.5 rounded bg-white border text-[10px]">Ctrl+U</kbd> →{" "}
              <kbd className="px-1 py-0.5 rounded bg-white border text-[10px]">Ctrl+A</kbd> →{" "}
              <kbd className="px-1 py-0.5 rounded bg-white border text-[10px]">Ctrl+C</kbd> ile HTML’i yapıştırın.
              {" "}<strong>Yemeksepeti:</strong> menü kaynakta yok; sistem HTML’den restoran kodunu okuyup menü JSON’unu otomatik çeker (Vercel edge).
              {" "}<strong>Getir:</strong> HTML yeterli. Üstteki link alanı dolu olmalı.
            </p>
          </div>
          <textarea
            value={pastedHtml}
            onChange={(e) => setPastedHtml(e.target.value)}
            placeholder="Sayfa kaynağını (HTML) buraya yapıştırın — Yemeksepeti menüsü otomatik çekilir…"
            rows={compact ? 6 : 8}
            spellCheck={false}
            className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-gray-900 text-xs font-mono outline-none focus:border-indigo-400 placeholder-gray-400 resize-y min-h-[140px]"
          />
          {pastedHtml.trim() && !pastedHtmlReady ? (
            <p className="text-[11px] text-amber-800">
              Kaynak çok kısa ({pastedHtml.trim().length} karakter). Tüm sayfa HTML’ini yapıştırdığınızdan emin olun.
            </p>
          ) : pastedHtmlReady ? (
            <p className="text-[11px] text-emerald-800 font-medium">
              ✓ {Math.round(pastedHtml.trim().length / 1024)} KB kaynak hazır — «Kaynaktan önizle» ile devam edin.
            </p>
          ) : (
            <p className="text-[11px] text-indigo-800/70">Boş bırakırsanız linkten otomatik çekmeyi dener.</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void runPreview()}
            disabled={previewing || !url.trim()}
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-sky-300 bg-sky-50 text-sky-950 hover:bg-sky-100 disabled:opacity-50 transition"
          >
            {previewing ? (
              <>
                <Loader2 className="w-4 h-4 inline animate-spin mr-1" />
                Çekiliyor…
              </>
            ) : pastedHtmlReady ? (
              "Kaynaktan önizle"
            ) : (
              "Önizle"
            )}
          </button>
          {preview ? (
            <button
              type="button"
              onClick={() => void runImport()}
              disabled={importing || selectedItemCount === 0}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-emerald-300 bg-emerald-50 text-emerald-950 hover:bg-emerald-100 disabled:opacity-50 transition"
            >
              {importing ? "Aktarılıyor…" : `Seçilenleri içe aktar (${selectedItemCount})`}
            </button>
          ) : null}
        </div>
      </div>

      {warning ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{warning}</div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
      ) : null}

      {preview ? (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3 items-start">
            {preview.imageUrl ? (
              <img src={preview.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover border border-gray-100" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-orange-50 flex items-center justify-center text-2xl">🍽️</div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-bold text-gray-900">{preview.name}</h4>
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {PLATFORM_LABELS[preview.platform] || preview.platform}
                </span>
                {preview.rating != null && preview.rating > 0 ? (
                  <span className="inline-flex items-center gap-1 text-amber-700 text-sm font-semibold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {preview.rating.toFixed(1)}
                    {preview.reviewCount != null ? (
                      <span className="text-gray-500 font-normal text-xs">({preview.reviewCount} değerlendirme)</span>
                    ) : null}
                  </span>
                ) : null}
              </div>
              {(preview.address || preview.neighborhood || preview.city || preview.district) ? (
                <p className="text-xs text-gray-600 mt-2 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-400" />
                  <span>
                    {[preview.neighborhood, preview.address, preview.district, preview.city].filter(Boolean).join(" · ")}
                  </span>
                </p>
              ) : null}
              {preview.phone ? (
                <p className="text-xs text-gray-600 mt-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  {preview.phone}
                </p>
              ) : null}
              {preview.lat != null && preview.lng != null ? (
                <p className="text-[11px] text-gray-400 mt-1 tabular-nums">
                  Konum: {preview.lat.toFixed(5)}, {preview.lng.toFixed(5)}
                </p>
              ) : null}
              {!(preview.address || preview.city) ? (
                <p className="text-[11px] text-amber-700 mt-1">
                  Adres sayfadan alınamadı; içe aktarmadan önce paneldeki konum alanını doldurabilirsiniz.
                </p>
              ) : null}
              <p className="text-xs text-gray-600 mt-2">
                <strong>{preview.totalItems}</strong> ürün, <strong>{preview.categories.length}</strong> kategori bulundu.
                Olmayan kategoriler otomatik oluşturulur.
              </p>
              <a
                href={preview.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:underline mt-1"
              >
                Kaynak sayfa <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {preview.totalItems === 0 ? (
            <div className="p-4 text-sm text-amber-800 bg-amber-50 space-y-2">
              <p>Menü ürünü bulunamadı. Sayfa bot koruması veya farklı yapı kullanıyor olabilir.</p>
              <p className="text-xs">
                Deneyin: mor kutudaki «Sayfa kaynağını yapıştır» alanına tarayıcıdaki HTML’i yapıştırın; veya CSV ile manuel içe aktarma.
              </p>
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-100">
              {preview.categories.map((cat) => {
                const checked = selectedCats.has(cat.name);
                const expanded = expandedCats.has(cat.name);
                return (
                  <div key={cat.name} className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCat(cat.name)}
                        className="rounded border-gray-300"
                      />
                      <button
                        type="button"
                        className="flex-1 flex items-center justify-between text-left"
                        onClick={() => toggleExpand(cat.name)}
                      >
                        <span className="font-semibold text-sm text-gray-900">
                          {cat.name}{" "}
                          <span className="text-gray-400 font-normal">({cat.items.length})</span>
                        </span>
                        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                    {expanded ? (
                      <ul className="mt-2 ml-6 space-y-1.5">
                        {cat.items.slice(0, 40).map((item, idx) => (
                          <li key={`${item.name}-${idx}`} className="flex justify-between gap-2 text-xs">
                            <span className="text-gray-800">
                              {item.name}
                              {item.description ? (
                                <span className="block text-gray-400 truncate max-w-[240px]">{item.description}</span>
                              ) : null}
                            </span>
                            <span className="text-gray-900 font-semibold tabular-nums shrink-0">{fmtPrice(item.price ?? null)}</span>
                          </li>
                        ))}
                        {cat.items.length > 40 ? (
                          <li className="text-[11px] text-gray-400">+{cat.items.length - 40} ürün daha…</li>
                        ) : null}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
