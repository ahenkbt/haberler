import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { apiFetch, apiUrl } from "@/lib/apiBase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Globe, Plus, RefreshCw, Trash2 } from "lucide-react";

const API_ROOT = apiUrl("/api/admin/global-map-news");

const CONTINENTS = [
  { id: "global", label: "Küresel" },
  { id: "europe", label: "Avrupa" },
  { id: "asia", label: "Asya" },
  { id: "middle-east", label: "Orta Doğu" },
  { id: "africa", label: "Afrika" },
  { id: "americas", label: "Amerika" },
  { id: "oceania", label: "Okyanusya" },
] as const;

const CATEGORY_OPTIONS = [
  { value: "news", label: "Haber" },
  { value: "video", label: "Video" },
  { value: "both", label: "Haber + Video" },
] as const;

type FeedRow = {
  id: number;
  name: string;
  url: string;
  continent: string;
  countryCode: string | null;
  countryName: string | null;
  category: "news" | "video" | "both";
  scope: "global" | "continent" | "country";
  enabled: boolean;
  priority: number;
};

type CountryGroup = {
  code: string;
  name: string;
  feeds: FeedRow[];
};

type ContinentGroup = {
  id: string;
  label: string;
  feeds: FeedRow[];
  countries: CountryGroup[];
};

type FeedForm = {
  name: string;
  url: string;
  continent: string;
  countryCode: string;
  countryName: string;
  category: "news" | "video" | "both";
  scope: "global" | "continent" | "country";
  priority: string;
  enabled: boolean;
};

const emptyForm = (continent = "global"): FeedForm => ({
  name: "",
  url: "",
  continent,
  countryCode: "",
  countryName: "",
  category: "news",
  scope: continent === "global" ? "global" : "country",
  priority: "0",
  enabled: true,
});

function categoryLabel(category: FeedRow["category"]): string {
  return CATEGORY_OPTIONS.find((row) => row.value === category)?.label ?? category;
}

export default function GlobalMapNewsAdmin() {
  const [continents, setContinents] = useState<ContinentGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [enabledCount, setEnabledCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [activeContinent, setActiveContinent] = useState<string>("global");
  const [activeCountry, setActiveCountry] = useState<string>("");
  const [form, setForm] = useState<FeedForm>(emptyForm());
  const [editId, setEditId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_ROOT}/feeds`);
      const data = await res.json();
      setContinents(Array.isArray(data?.continents) ? data.continents : []);
      setTotal(Number(data?.total ?? 0));
      setEnabledCount(Number(data?.enabled ?? 0));
    } catch {
      setMessage("Küresel harita RSS kaynakları yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeGroup = useMemo(
    () => continents.find((row) => row.id === activeContinent) ?? null,
    [continents, activeContinent],
  );

  const countryTabs = useMemo(() => {
    const countries = activeGroup?.countries ?? [];
    return countries.sort((a, b) => a.name.localeCompare(b.name, "tr-TR"));
  }, [activeGroup]);

  const visibleFeeds = useMemo(() => {
    if (!activeGroup) return [] as FeedRow[];
    if (!activeCountry) {
      return [
        ...activeGroup.feeds,
        ...activeGroup.countries.flatMap((country) => country.feeds),
      ].sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name, "tr-TR"));
    }
    return (
      activeGroup.countries.find((country) => country.code === activeCountry)?.feeds ?? []
    ).sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name, "tr-TR"));
  }, [activeGroup, activeCountry]);

  useEffect(() => {
    setForm(emptyForm(activeContinent));
    setEditId(null);
    setActiveCountry("");
  }, [activeContinent]);

  async function saveFeed() {
    setSaving(true);
    setMessage(null);
    try {
      const body = {
        name: form.name.trim(),
        url: form.url.trim(),
        continent: form.continent,
        countryCode: form.countryCode.trim() || null,
        countryName: form.countryName.trim() || null,
        category: form.category,
        scope: form.scope,
        priority: Number(form.priority || 0),
        enabled: form.enabled,
      };
      const res = await apiFetch(`${API_ROOT}/feeds${editId ? `/${editId}` : ""}`, {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(String(data?.error ?? "Kayıt başarısız"));
      setForm(emptyForm(activeContinent));
      setEditId(null);
      setMessage(editId ? "Kaynak güncellendi." : "Yeni RSS kaynağı eklendi.");
      await load();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled(feed: FeedRow, enabled: boolean) {
    await apiFetch(`${API_ROOT}/feeds/${feed.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...feed, enabled }),
    });
    await load();
  }

  async function removeFeed(id: number) {
    if (!confirm("Bu RSS kaynağı silinsin mi?")) return;
    await apiFetch(`${API_ROOT}/feeds/${id}`, { method: "DELETE" });
    await load();
  }

  async function seedDefaults() {
    if (!confirm("Varsayılan küresel RSS kaynakları yüklensin mi? Mevcut URL'ler atlanır.")) return;
    setSeeding(true);
    setMessage(null);
    try {
      const res = await apiFetch(`${API_ROOT}/feeds/seed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(String(data?.error ?? "Tohum yükleme başarısız"));
      setMessage(`${data.inserted ?? 0} kaynak eklendi, ${data.skipped ?? 0} atlandı. Toplam: ${data.total ?? 0}.`);
      await load();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "Tohum yükleme başarısız");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <AdminLayout title="Küresel Harita Haberleri">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            <Globe className="w-3.5 h-3.5 mr-1.5 inline" />
            {enabledCount}/{total} aktif kaynak
          </Badge>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>
          <Button type="button" size="sm" onClick={() => void seedDefaults()} disabled={seeding}>
            Varsayılan küresel kaynakları yükle
          </Button>
        </div>

        {message ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {message}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {CONTINENTS.map((continent) => (
            <button
              key={continent.id}
              type="button"
              onClick={() => setActiveContinent(continent.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium border transition ${
                activeContinent === continent.id
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
              }`}
            >
              {continent.label}
            </button>
          ))}
        </div>

        {countryTabs.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveCountry("")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold border ${
                !activeCountry ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200"
              }`}
            >
              Tümü
            </button>
            {countryTabs.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => setActiveCountry(country.code)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold border ${
                  activeCountry === country.code
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-200"
                }`}
              >
                {country.name} ({country.feeds.length})
              </button>
            ))}
          </div>
        ) : null}

        <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b px-4 py-3 text-sm font-semibold text-slate-900">
              RSS kaynakları ({visibleFeeds.length})
            </div>
            {loading ? (
              <p className="p-6 text-sm text-slate-500">Yükleniyor…</p>
            ) : visibleFeeds.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">Bu sekmede kaynak yok. Sağdan ekleyin veya varsayılanları yükleyin.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="p-3">Ad</th>
                      <th className="p-3">URL</th>
                      <th className="p-3">Kategori</th>
                      <th className="p-3">Aktif</th>
                      <th className="p-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {visibleFeeds.map((feed) => (
                      <tr key={feed.id} className="border-t align-top">
                        <td className="p-3 font-medium text-slate-900">
                          <div>{feed.name}</div>
                          {feed.countryName ? (
                            <div className="text-xs text-slate-500 mt-1">{feed.countryName}</div>
                          ) : null}
                        </td>
                        <td className="p-3 max-w-xs break-all text-slate-600">{feed.url}</td>
                        <td className="p-3 whitespace-nowrap">{categoryLabel(feed.category)}</td>
                        <td className="p-3">
                          <Switch
                            checked={feed.enabled}
                            onCheckedChange={(checked) => void toggleEnabled(feed, checked)}
                          />
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditId(feed.id);
                              setForm({
                                name: feed.name,
                                url: feed.url,
                                continent: feed.continent,
                                countryCode: feed.countryCode ?? "",
                                countryName: feed.countryName ?? "",
                                category: feed.category,
                                scope: feed.scope,
                                priority: String(feed.priority),
                                enabled: feed.enabled,
                              });
                            }}
                          >
                            Düzenle
                          </Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => void removeFeed(feed.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4 h-fit">
            <div>
              <h2 className="font-semibold text-slate-900">{editId ? "Kaynağı düzenle" : "Yeni RSS kaynağı"}</h2>
              <p className="text-xs text-slate-500 mt-1">Newsmap hibrit havuzuna eklenir; mevcut konum kazıma akışı korunur.</p>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Ad</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <Label>RSS URL</Label>
                <Input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <Label>Kıta</Label>
                <select
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  value={form.continent}
                  onChange={(e) => setForm((f) => ({ ...f, continent: e.target.value }))}
                >
                  {CONTINENTS.map((continent) => (
                    <option key={continent.id} value={continent.id}>{continent.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Ülke kodu</Label>
                  <Input value={form.countryCode} onChange={(e) => setForm((f) => ({ ...f, countryCode: e.target.value.toUpperCase() }))} placeholder="US" />
                </div>
                <div>
                  <Label>Ülke adı</Label>
                  <Input value={form.countryName} onChange={(e) => setForm((f) => ({ ...f, countryName: e.target.value }))} placeholder="ABD" />
                </div>
              </div>
              <div>
                <Label>Kategori</Label>
                <select
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as FeedForm["category"] }))}
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Öncelik</Label>
                <Input type="number" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Aktif</Label>
                <Switch checked={form.enabled} onCheckedChange={(checked) => setForm((f) => ({ ...f, enabled: checked }))} />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="button" className="flex-1" onClick={() => void saveFeed()} disabled={saving}>
                <Plus className="w-4 h-4 mr-1.5" />
                {editId ? "Güncelle" : "Ekle"}
              </Button>
              {editId ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditId(null);
                    setForm(emptyForm(activeContinent));
                  }}
                >
                  İptal
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
