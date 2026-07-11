import { useCallback, useEffect, useMemo, useState } from "react";
import { apiUrl } from "@/lib/apiBase";
import type { VendorThemeDef } from "@/lib/vendorThemes";

type DomainRow = { id: number; domain: string; position: number; verified_at: string | null; status?: string; admin_note?: string | null };

type StorefrontThemePayload = {
  themeKey: string;
  themeConfig: Record<string, string>;
  defaultThemeKey: string;
  storefrontPath: string;
  availableThemes: VendorThemeDef[];
  domains: DomainRow[];
};

type Props = {
  authHeaders: () => Record<string, string>;
  flash: (msg: string, ok?: boolean) => void;
  isApproved: boolean;
};

type PanelLang = "tr" | "en";

const PANEL_COPY = {
  tr: {
    title: "🎨 Vitrin Görünümü",
    loading: "Vitrin ayarları yükleniyor…",
    pending: "Başvurunuz onaylandıktan sonra vitrin görünümünü seçebilirsiniz.",
    intro: "Mağaza vitrininiz bağımsız görünür. Kapak görseli, başlık ve metin alanlarını düzenleyin.",
    preview: "Vitrini önizle →",
    slots: "Vitrin içerik alanları",
    save: "Vitrini kaydet",
    saving: "Kaydediliyor…",
    language: "Dil",
  },
  en: {
    title: "🎨 Vitrin Görünümü",
    loading: "Vitrin ayarları yükleniyor…",
    pending: "Başvurunuz onaylandıktan sonra vitrin görünümünü seçebilirsiniz.",
    intro: "Mağaza vitrininiz bağımsız görünür. Kapak görseli, başlık ve metin alanlarını düzenleyin.",
    preview: "Vitrini önizle →",
    slots: "Vitrin içerik alanları",
    save: "Vitrini kaydet",
    saving: "Saving…",
    language: "Dil",
  },
} satisfies Record<PanelLang, Record<string, string>>;

const THEME_COPY: Record<string, { enName?: string; enDescription?: string }> = {
  "sellzy-store": { enName: "Pazaryeri Vitrini", enDescription: "Modern çok satıcılı mağaza vitrini" },
  "nest-market": { enName: "Taze Market", enDescription: "Market, gıda ve çok kategorili mağaza düzeni" },
  "pixio-shop": { enName: "Butik Vitrin", enDescription: "Moda, butik ve yaşam stili vitrini" },
  "kartify-shop": { enName: "Hızlı Kart Vitrini", enDescription: "Kart odaklı modern mağaza vitrini" },
  "kartify-gadget": { enName: "Teknoloji Vitrini", enDescription: "Teknoloji, aksesuar ve cihaz vitrini" },
  "kartify-mega-mart": { enName: "Büyük Pazar", enDescription: "Çok kategorili kampanya vitrini" },
  "kartify-organic-store": { enName: "Doğal Market", enDescription: "Organik ürün ve doğal market vitrini" },
  "kartify-style-tech": { enName: "Stil ve Teknoloji", enDescription: "Yaşam stili, moda ve teknoloji vitrini" },
  "kartify-electro": { enName: "Elektronik Vitrini", enDescription: "Elektronik ve cihaz odaklı vitrin" },
  "kartify-baby-shop": { enName: "Çocuk Dünyası", enDescription: "Bebek, çocuk ve oyuncak vitrini" },
  "listinghub-shop": { enName: "Rehber Vitrini", enDescription: "Rehber ve mağaza karması ürün düzeni" },
  foodmart: { enName: "Market Vitrini", enDescription: "Alışveriş ve e-ticaret vitrini" },
};

function GlassInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
}) {
  const cls =
    "w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400";
  return (
    <label className="block space-y-1">
      <span className="text-xs font-bold text-gray-700">{label}</span>
      {multiline ? (
        <textarea
          className={`${cls} min-h-[72px] resize-y`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          type={type}
          className={cls}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </label>
  );
}

export function VendorThemesPanel({ authHeaders, flash, isApproved }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingDomains, setSavingDomains] = useState(false);
  const [panelLang, setPanelLang] = useState<PanelLang>("tr");
  const [payload, setPayload] = useState<StorefrontThemePayload | null>(null);
  const [themeKey, setThemeKey] = useState("");
  const [themeConfig, setThemeConfig] = useState<Record<string, string>>({});
  const [domains, setDomains] = useState<string[]>(["", "", ""]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(apiUrl("/api/providers/storefront/theme"), { headers: authHeaders() });
      const d = (await r.json()) as StorefrontThemePayload & { error?: string };
      if (!r.ok) throw new Error(d.error || "Yüklenemedi");
      setPayload(d);
      setThemeKey(d.themeKey);
      setThemeConfig(d.themeConfig ?? {});
      const doms = (d.domains ?? []).map((x) => x.domain);
      setDomains([doms[0] ?? "", doms[1] ?? "", doms[2] ?? ""]);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Vitrin ayarları yüklenemedi", false);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, flash]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeTheme = payload?.availableThemes?.find((t) => t.key === themeKey)
    ?? payload?.availableThemes?.[0];
  const themeGroups = useMemo(() => {
    const grouped = new Map<string, VendorThemeDef[]>();
    for (const theme of payload?.availableThemes ?? []) {
      const group = theme.themeGroup?.replace(/Temaları/g, "Görünümleri") || "Önerilen Görünümler";
      grouped.set(group, [...(grouped.get(group) ?? []), theme]);
    }
    return [...grouped.entries()].sort(([a], [b]) => {
      if (a === "Restaurant ve Cafe Görünümleri") return 1;
      if (b === "Restaurant ve Cafe Görünümleri") return -1;
      return a.localeCompare(b, "tr");
    });
  }, [payload?.availableThemes]);

  async function saveTheme() {
    setSaving(true);
    try {
      const r = await fetch(apiUrl("/api/providers/storefront/theme"), {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ themeKey, themeConfig }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Kaydedilemedi");
      flash("Vitrin ayarları kaydedildi");
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Kayıt hatası", false);
    } finally {
      setSaving(false);
    }
  }

  async function saveDomains() {
    setSavingDomains(true);
    try {
      const list = domains.map((d) => d.trim()).filter(Boolean);
      const r = await fetch(apiUrl("/api/providers/storefront/domains"), {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ domains: list }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Alan adları kaydedilemedi");
      flash(d.message || "Domain talebiniz admin onayına gönderildi");
      await load();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Alan adı hatası", false);
    } finally {
      setSavingDomains(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-300 rounded-2xl p-8 text-center text-gray-500">
        {PANEL_COPY[panelLang].loading}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-300 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-2">
          <h2 className="text-gray-900 font-bold text-lg">{PANEL_COPY[panelLang].title}</h2>
          <label className="flex items-center gap-2 text-xs font-bold text-gray-600">
            {PANEL_COPY[panelLang].language}
            <select
              value={panelLang}
              onChange={(e) => setPanelLang(e.target.value === "en" ? "en" : "tr")}
              className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs font-bold"
            >
              <option value="tr">Türkçe</option>
              <option value="en">İngilizce</option>
            </select>
          </label>
        </div>
        {!isApproved ? (
          <p className="text-amber-800 text-sm">{PANEL_COPY[panelLang].pending}</p>
        ) : (
          <>
            <p className="text-sm text-gray-700 leading-relaxed">
              {PANEL_COPY[panelLang].intro}
              {payload?.storefrontPath ? (
                <>
                  {" "}
                  <a
                    href={payload.storefrontPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-indigo-700 underline"
                  >
                    {PANEL_COPY[panelLang].preview}
                  </a>
                </>
              ) : null}
            </p>

            <div className="space-y-5">
              {themeGroups.map(([groupName, themes]) => (
                <section key={groupName} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">{groupName}</h3>
                    <span className="text-[11px] font-bold text-gray-400">{themes.length} görünüm</span>
                  </div>
                  <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                    {themes.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => {
                          setThemeKey(t.key);
                          if (t.key !== themeKey) {
                            const next: Record<string, string> = {};
                            for (const slot of t.slots ?? []) {
                              next[slot.key] = themeConfig[slot.key] ?? slot.defaultValue ?? "";
                            }
                            setThemeConfig(next);
                          }
                        }}
                        className={`text-left rounded-xl border-2 overflow-hidden transition ${
                          themeKey === t.key
                            ? "border-indigo-500 ring-2 ring-indigo-200"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                          <img
                            src={t.previewImage}
                            alt={t.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                          <span className="absolute">{t.name}</span>
                        </div>
                        <div className="p-3">
                          <div className="font-bold text-sm text-gray-900">{panelLang === "en" ? (THEME_COPY[t.key]?.enName || t.name) : t.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{panelLang === "en" ? (THEME_COPY[t.key]?.enDescription || t.description) : t.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            {activeTheme ? (
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
                <h3 className="text-sm font-bold text-gray-900">{PANEL_COPY[panelLang].slots} — {panelLang === "en" ? (THEME_COPY[activeTheme.key]?.enName || activeTheme.name) : activeTheme.name}</h3>
                {(activeTheme.slots ?? []).map((slot) => (
                  <GlassInput
                    key={slot.key}
                    label={slot.label}
                    type={slot.type === "color" ? "color" : "text"}
                    multiline={slot.type === "textarea"}
                    value={themeConfig[slot.key] ?? ""}
                    onChange={(v) => setThemeConfig((prev) => ({ ...prev, [slot.key]: v }))}
                    placeholder={slot.defaultValue}
                  />
                ))}
              </div>
            ) : null}

            <button
              type="button"
              disabled={saving || !isApproved}
              onClick={() => void saveTheme()}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40 hover:bg-indigo-500 transition"
            >
              {saving ? PANEL_COPY[panelLang].saving : PANEL_COPY[panelLang].save}
            </button>
          </>
        )}
      </div>

      <div className="bg-white border border-gray-300 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-gray-900 font-bold text-lg border-b border-gray-200 pb-2">🌐 Özel Alan Adı</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          En fazla 3 alan adı ekleyebilirsiniz (<code className="text-xs bg-gray-100 px-1 rounded">magaza.com</code>,{" "}
          <code className="text-xs bg-gray-100 px-1 rounded">www.magaza.com</code>). Alan adı talebi admin paneline düşer;
          DNS yönlendirmesi kontrol edildikten sonra aktif edilir.
        </p>
        {payload?.domains?.length ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-2">
            <div className="text-xs font-bold text-gray-700">Mevcut talepler</div>
            {payload.domains.map((d) => (
              <div key={d.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs">
                <span className="font-semibold text-gray-900">{d.domain}</span>
                <span className={`rounded-full px-2 py-0.5 font-bold ${
                  d.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                  d.status === "rejected" ? "bg-red-100 text-red-700" :
                  "bg-amber-100 text-amber-700"
                }`}>
                  {d.status === "approved" ? "Aktif" : d.status === "rejected" ? "Reddedildi" : "Admin onayı bekliyor"}
                </span>
                {d.admin_note ? <span className="text-gray-500">{d.admin_note}</span> : null}
              </div>
            ))}
          </div>
        ) : null}
        {[0, 1, 2].map((i) => (
          <GlassInput
            key={i}
            label={`Alan adı ${i + 1}`}
            value={domains[i] ?? ""}
            onChange={(v) =>
              setDomains((prev) => {
                const next = [...prev];
                next[i] = v;
                return next;
              })
            }
            placeholder={i === 0 ? "ornek-magaza.com" : "isteğe bağlı"}
          />
        ))}
        <details className="border border-sky-200 rounded-xl p-3 bg-sky-50/80 text-[11px] text-sky-950 leading-relaxed" open>
          <summary className="cursor-pointer font-bold list-none">DNS kurulum özeti (Vercel Nameserver)</summary>
          <div className="mt-2 space-y-2 pt-2 border-t border-sky-200/80">
            <p>
              Domain sağlayıcınızda nameserver/DNS sunucusu alanına şu iki kaydı girin:
            </p>
            <p>
              <code className="bg-white px-1.5 py-0.5 rounded border border-sky-200">ns1.vercel-dns.com</code>
              {" "}
              <code className="bg-white px-1.5 py-0.5 rounded border border-sky-200">ns2.vercel-dns.com</code>
            </p>
            <p>Kaydet butonuna bastığınızda talep admin paneline düşer. DNS kontrolünden sonra domain aktif edilir.</p>
          </div>
        </details>
        <button
          type="button"
          disabled={savingDomains || !isApproved}
          onClick={() => void saveDomains()}
          className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold text-sm disabled:opacity-40 hover:bg-emerald-500 transition"
        >
          {savingDomains ? "Gönderiliyor…" : "Domain talebini admin onayına gönder"}
        </button>
      </div>
    </div>
  );
}
