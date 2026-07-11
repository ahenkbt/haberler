import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, asArray } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen, Plus, Trash2, Search, Save, ExternalLink,
  Pencil, Check, X, ChevronUp, ChevronDown, RotateCcw,
} from "lucide-react";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

const DEFAULT_TOPICS = [
  { title: "Türkiye",                  emoji: "🇹🇷", desc: "Resmi adı Türkiye Cumhuriyeti olan ülke" },
  { title: "Ankara",                   emoji: "🏛️", desc: "Türkiye'nin başkenti" },
  { title: "İstanbul",                 emoji: "🌉", desc: "Türkiye'nin en kalabalık şehri" },
  { title: "Osmanlı İmparatorluğu",    emoji: "📜", desc: "1299-1922 arası süren büyük imparatorluk" },
  { title: "Mustafa Kemal Atatürk",    emoji: "🎖️", desc: "Türkiye Cumhuriyeti'nin kurucusu" },
  { title: "Kapadokya",                emoji: "🎈", desc: "Eşsiz coğrafyasıyla dünyaca ünlü bölge" },
  { title: "Topkapı Sarayı",           emoji: "🏰", desc: "İstanbul'daki tarihi Osmanlı sarayı" },
  { title: "Ayasofya",                 emoji: "⛪", desc: "İstanbul'daki tarihi yapı" },
  { title: "Efes",                     emoji: "🏺", desc: "Antik Yunan şehri, İzmir yakınları" },
  { title: "Pamukkale",                emoji: "🌊", desc: "Travertenleri ile ünlü UNESCO mirası" },
];

interface FeaturedTopic { title: string; emoji: string; desc: string; }

interface WikiEncyclopediaUi {
  heroTitle: string;
  heroSubtitle: string;
  heroGradientFrom: string;
  heroGradientTo: string;
  heroTextColor: string;
  mainHeading: string;
  mainSubheading: string;
  searchPlaceholder: string;
  searchButtonLabel: string;
  topicsSectionLabel: string;
  footerNote: string;
  wikiLang: "tr" | "en";
  wikiSearchLimit: number;
  pathSlugHint: string;
}

const DEFAULT_ENCYC_UI: WikiEncyclopediaUi = {
  heroTitle: "Bilgi Ağacı",
  heroSubtitle: "",
  heroGradientFrom: "#039D55",
  heroGradientTo: "#028347",
  heroTextColor: "#ffffff",
  mainHeading: "Türk dünyasını keşfedin",
  mainSubheading: "Tarih, kültür, halk ve medeniyetler hakkında bilgi",
  searchPlaceholder: "Araştırmak istediğiniz konuyu yazın...",
  searchButtonLabel: "Ara",
  topicsSectionLabel: "Önerilen konular",
  footerNote: "",
  wikiLang: "tr",
  wikiSearchLimit: 10,
  pathSlugHint: "bilgiagaci",
};

export default function AnsiklopediYonetimi() {
  const qc = useQueryClient();
  const { toast } = useToast();

  /* New topic form */
  const [newTitle, setNewTitle] = useState("");
  const [newEmoji, setNewEmoji] = useState("");
  const [newDesc, setNewDesc]   = useState("");

  /* Wikipedia search */
  const [wikiSearch,   setWikiSearch]   = useState("");
  const [wikiResults,  setWikiResults]  = useState<any[]>([]);
  const [searching,    setSearching]    = useState(false);

  /* Inline edit state */
  const [editIdx, setEditIdx]       = useState<number | null>(null);
  const [editEmoji, setEditEmoji]   = useState("");
  const [editTitle, setEditTitle]   = useState("");
  const [editDesc,  setEditDesc]    = useState("");

  const [uiDraft, setUiDraft] = useState<WikiEncyclopediaUi>(DEFAULT_ENCYC_UI);

  const { data: encRes } = useQuery({
    queryKey: ["/api/wiki/encyclopedia-ui"],
    queryFn: async () => apiRequest("/api/wiki/encyclopedia-ui"),
    staleTime: 15_000,
  });

  useEffect(() => {
    const d = encRes?.data ?? encRes;
    if (d && typeof d === "object" && !Array.isArray(d)) {
      setUiDraft({ ...DEFAULT_ENCYC_UI, ...(d as WikiEncyclopediaUi) });
    }
  }, [encRes]);

  const saveUiMut = useMutation({
    mutationFn: () =>
      apiRequest("/api/wiki/encyclopedia-ui", {
        method: "PUT",
        body: JSON.stringify(uiDraft),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/wiki/encyclopedia-ui"] });
      toast({ title: "Ansiklopedi ayarları kaydedildi" });
    },
    onError: () => toast({ title: "Ayarlar kaydedilemedi", variant: "destructive" }),
  });

  const { data: topicsData, isLoading } = useQuery<FeaturedTopic[]>({
    queryKey: ["/api/wiki/featured"],
    queryFn: async () => {
      const r = await apiRequest("/api/wiki/featured");
      const data = asArray<FeaturedTopic>(r?.data ?? r);
      return data.length > 0 ? data : DEFAULT_TOPICS;
    },
    staleTime: 30_000,
  });
  const topics = asArray(topicsData);

  const saveMut = useMutation({
    mutationFn: (newTopics: FeaturedTopic[]) =>
      apiRequest("/api/wiki/featured", { method: "PUT", body: JSON.stringify({ topics: newTopics }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/wiki/featured"] });
      toast({ title: "Konular kaydedildi" });
    },
    onError: () => toast({ title: "Kayıt hatası", variant: "destructive" }),
  });

  /* ── Helpers ── */

  function save(newTopics: FeaturedTopic[]) { saveMut.mutate(newTopics); }

  function addTopic() {
    if (!newTitle.trim()) return;
    const topic: FeaturedTopic = {
      title: newTitle.trim(),
      emoji: newEmoji.trim() || "📖",
      desc:  newDesc.trim() || "",
    };
    save([...topics, topic]);
    setNewTitle(""); setNewEmoji(""); setNewDesc("");
  }

  function removeTopic(i: number) {
    if (!confirm("Bu konuyu kaldırmak istediğinizden emin misiniz?")) return;
    const next = [...topics]; next.splice(i, 1); save(next);
  }

  function moveUp(i: number) {
    if (i === 0) return;
    const next = [...topics];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    save(next);
  }

  function moveDown(i: number) {
    if (i === topics.length - 1) return;
    const next = [...topics];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    save(next);
  }

  function startEdit(i: number) {
    setEditIdx(i);
    setEditEmoji(topics[i].emoji);
    setEditTitle(topics[i].title);
    setEditDesc(topics[i].desc);
  }

  function cancelEdit() { setEditIdx(null); }

  function saveEdit(i: number) {
    if (!editTitle.trim()) return;
    const next = [...topics];
    next[i] = { title: editTitle.trim(), emoji: editEmoji.trim() || "📖", desc: editDesc.trim() };
    save(next);
    setEditIdx(null);
  }

  function addFromSearch(r: any) {
    const topic: FeaturedTopic = {
      title: r.title,
      emoji: "📖",
      desc:  r.snippet?.replace(/<[^>]*>/g, "").slice(0, 80) || "",
    };
    save([...topics, topic]);
    setWikiSearch(""); setWikiResults([]);
  }

  async function searchWiki() {
    if (!wikiSearch.trim()) return;
    setSearching(true);
    try {
      const r = await apiRequest(
        `/api/wiki/search?q=${encodeURIComponent(wikiSearch)}&limit=6&lang=${uiDraft.wikiLang}`,
      );
      setWikiResults(r?.data ?? []);
    } finally { setSearching(false); }
  }

  function resetToDefaults() {
    if (!confirm("Varsayılan konulara sıfırlansın mı?")) return;
    save(DEFAULT_TOPICS);
  }

  /* ── Render ── */

  return (
    <AdminLayout title="Ansiklopedi Ayarları">
      <div className="space-y-6 max-w-4xl p-1">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-500" /> Ansiklopedi
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Görünüm metinleri, renkler, Wikipedia dili ve öne çıkan konuları yönetin.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={resetToDefaults} className="flex items-center gap-1">
              <RotateCcw className="w-3.5 h-3.5" /> Konuları sıfırla
            </Button>
            <Button size="sm" asChild>
              <a href="/bilgiagaci" target="_blank" rel="noreferrer" className="flex items-center gap-1">
                <ExternalLink className="w-4 h-4" /> Canlıya bak
              </a>
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Üst alan renkleri &amp; yazıları</CardTitle>
              <CardDescription>Ansiklopedi sayfasındaki kahraman (hero) bölümü</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-gray-600">Sayfa başlığı</Label>
                <Input className="mt-1" value={uiDraft.heroTitle}
                  onChange={e => setUiDraft(u => ({ ...u, heroTitle: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Alt başlık</Label>
                <Input className="mt-1" value={uiDraft.heroSubtitle}
                  onChange={e => setUiDraft(u => ({ ...u, heroSubtitle: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-gray-600">Arka plan — başlangıç</Label>
                  <div className="flex gap-2 mt-1">
                    <input type="color" className="h-9 w-full rounded border cursor-pointer"
                      value={uiDraft.heroGradientFrom}
                      onChange={e => setUiDraft(u => ({ ...u, heroGradientFrom: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Arka plan — bitiş</Label>
                  <input type="color" className="h-9 w-full rounded border cursor-pointer mt-1"
                    value={uiDraft.heroGradientTo}
                    onChange={e => setUiDraft(u => ({ ...u, heroGradientTo: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Yazı rengi</Label>
                  <input type="color" className="h-9 w-full rounded border cursor-pointer mt-1"
                    value={uiDraft.heroTextColor}
                    onChange={e => setUiDraft(u => ({ ...u, heroTextColor: e.target.value }))} />
                </div>
              </div>
              <div
                className="rounded-lg border p-6 text-center mt-2 shadow-inner"
                style={{
                  background: `linear-gradient(135deg, ${uiDraft.heroGradientFrom} 0%, ${uiDraft.heroGradientTo} 100%)`,
                  color: uiDraft.heroTextColor,
                }}
              >
                <p className="text-lg sm:text-xl font-bold font-serif">{uiDraft.heroTitle}</p>
                <p className="text-sm mt-2 opacity-95 italic">{uiDraft.heroSubtitle}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Arama &amp; konu önerileri</CardTitle>
              <CardDescription>Arama kutusu ve önerilen konular başlığı</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-gray-600">Arama kutusu metni (placeholder)</Label>
                <Input className="mt-1" value={uiDraft.searchPlaceholder}
                  onChange={e => setUiDraft(u => ({ ...u, searchPlaceholder: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Arama düğmesi etiketi</Label>
                <Input className="mt-1" value={uiDraft.searchButtonLabel}
                  onChange={e => setUiDraft(u => ({ ...u, searchButtonLabel: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Ana içerik başlığı</Label>
                <Input className="mt-1" value={uiDraft.mainHeading}
                  onChange={e => setUiDraft(u => ({ ...u, mainHeading: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Ana içerik alt başlığı</Label>
                <Input className="mt-1" value={uiDraft.mainSubheading}
                  onChange={e => setUiDraft(u => ({ ...u, mainSubheading: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Önerilen konular etiketi</Label>
                <Input className="mt-1" value={uiDraft.topicsSectionLabel}
                  onChange={e => setUiDraft(u => ({ ...u, topicsSectionLabel: e.target.value }))} />
              </div>
              <p className="text-xs text-gray-500 pt-1">
                Önerilen konu düğmeleri aşağıdaki listeden yönetilir; her satır bir konu kartıdır.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Wikipedia ayarları</CardTitle>
              <CardDescription>Arama ve makale verisi hangi dilde çekilsin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-gray-600">Wikipedia dili</Label>
                <select
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  value={uiDraft.wikiLang}
                  onChange={e => setUiDraft(u => ({ ...u, wikiLang: e.target.value === "en" ? "en" : "tr" }))}
                >
                  <option value="tr">Türkçe (tr)</option>
                  <option value="en">English (en)</option>
                </select>
              </div>
              <div>
                <Label className="text-xs text-gray-600">Arama sonuç sayısı (1–20)</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  className="mt-1 w-28"
                  value={uiDraft.wikiSearchLimit}
                  onChange={e => {
                    const n = parseInt(e.target.value, 10);
                    setUiDraft(u => ({
                      ...u,
                      wikiSearchLimit: Number.isFinite(n) ? Math.min(20, Math.max(1, n)) : u.wikiSearchLimit,
                    }));
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sayfa bağlantısı &amp; dipnot</CardTitle>
              <CardDescription>
                Gerçek uygulama yolu sabittir: <code className="text-xs bg-muted px-1 rounded">/bilgiagaci</code>
                . Slug alanı kayıt ve bu açıklama için kullanılır; yönlendirme kodu değiştirilmeden URL değişmez.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-gray-600">Yol / slug (bilgi)</Label>
                <Input className="mt-1 font-mono text-sm" value={uiDraft.pathSlugHint}
                  onChange={e => setUiDraft(u => ({ ...u, pathSlugHint: e.target.value }))} />
                <p className="text-xs text-gray-500 mt-1">
                  Yayın adresi: <code className="bg-gray-100 px-1 rounded">/{uiDraft.pathSlugHint || "bilgiagaci"}</code>
                  {" "}ve{" "}
                  <code className="bg-gray-100 px-1 rounded">/{uiDraft.pathSlugHint || "bilgiagaci"}/Konu_Başlığı</code>
                  . Makale içi Vikipedi bağlantıları aynı sayfada <code className="bg-gray-100 px-1 rounded">/bilgiagaci/…</code> rotasına yönlendirilir.
                </p>
              </div>
              <div>
                <Label className="text-xs text-gray-600">Kaynak / dipnot metni</Label>
                <textarea
                  className="mt-1 flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                  value={uiDraft.footerNote}
                  onChange={e => setUiDraft(u => ({ ...u, footerNote: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => saveUiMut.mutate()} disabled={saveUiMut.isPending} className="gap-2">
            <Save className="w-4 h-4" /> Ayarları kaydet
          </Button>
          {saveUiMut.isPending && <span className="text-sm text-gray-500">Kaydediliyor…</span>}
        </div>

        <div className="border-t pt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Öne çıkan konular</h2>
          <p className="text-sm text-gray-500 mb-4">
            Ana sayfadaki önerilen konu düğmeleri; sıra ve içerik buradan yönetilir.
          </p>
        </div>

        {/* Topic list */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
            <span className="font-semibold text-gray-700 text-sm">
              Öne Çıkan Konular <span className="text-gray-400">({topics.length})</span>
            </span>
            <span className="text-xs text-gray-400">Sırayı değiştirmek için ↑↓ tuşlarını kullanın</span>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-gray-400">Yükleniyor...</div>
          ) : topics.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Henüz öne çıkan konu yok</p>
            </div>
          ) : (
            <div className="divide-y">
              {topics.map((t, i) => (
                <div key={i} className="px-4 py-3 hover:bg-gray-50 transition">
                  {editIdx === i ? (
                    /* ── Inline edit row ── */
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={editEmoji}
                          onChange={e => setEditEmoji(e.target.value)}
                          placeholder="📖"
                          className="w-16 text-center text-lg"
                        />
                        <Input
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          placeholder="Konu başlığı"
                          className="flex-1"
                        />
                      </div>
                      <Input
                        value={editDesc}
                        onChange={e => setEditDesc(e.target.value)}
                        placeholder="Kısa açıklama"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(i)} disabled={!editTitle.trim() || saveMut.isPending}
                          className="flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Kaydet
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit} className="flex items-center gap-1">
                          <X className="w-3.5 h-3.5" /> İptal
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* ── Display row ── */
                    <div className="flex items-center gap-3">
                      {/* Up/Down */}
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => moveUp(i)} disabled={i === 0}
                          className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed transition">
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => moveDown(i)} disabled={i === topics.length - 1}
                          className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed transition">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Number badge */}
                      <span className="w-5 text-center text-[11px] font-bold text-gray-300">{i + 1}</span>

                      {/* Emoji */}
                      <span className="text-2xl w-8 shrink-0 text-center">{t.emoji}</span>

                      {/* Title + desc */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900">{t.title}</div>
                        {t.desc && <div className="text-xs text-gray-400 truncate">{t.desc}</div>}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <a href={`/bilgiagaci/${encodeURIComponent(t.title.replace(/ /g, "_"))}`}
                          target="_blank"
                          title="Makaleyi görüntüle"
                          className="p-1.5 text-blue-400 hover:text-blue-600 rounded hover:bg-blue-50 transition">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button onClick={() => startEdit(i)}
                          title="Düzenle"
                          className="p-1.5 text-gray-400 hover:text-indigo-600 rounded hover:bg-indigo-50 transition">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => removeTopic(i)}
                          title="Kaldır"
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add new topic manually */}
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <h3 className="font-semibold text-gray-700 text-sm mb-3">Manuel Konu Ekle</h3>
          <div className="grid sm:grid-cols-3 gap-3 mb-3">
            <div className="sm:col-span-1">
              <label className="text-xs text-gray-500 font-medium">Emoji</label>
              <Input value={newEmoji} onChange={e => setNewEmoji(e.target.value)}
                placeholder="📖" className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500 font-medium">Konu Başlığı (Türkçe Wikipedia adı) *</label>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTopic()}
                placeholder="örn. Efes, Kapadokya..." className="mt-1" />
            </div>
            <div className="sm:col-span-3">
              <label className="text-xs text-gray-500 font-medium">Kısa Açıklama</label>
              <Input value={newDesc} onChange={e => setNewDesc(e.target.value)}
                placeholder="Konunun kısa açıklaması" className="mt-1" />
            </div>
          </div>
          <Button onClick={addTopic} disabled={!newTitle.trim() || saveMut.isPending}
            className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Ekle
          </Button>
        </div>

        {/* Add from Wikipedia search */}
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <h3 className="font-semibold text-gray-700 text-sm mb-3">Wikipedia'dan Ara & Ekle</h3>
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input value={wikiSearch} onChange={e => setWikiSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && searchWiki()}
                placeholder="Türkçe Wikipedia'da ara..." className="pl-9" />
            </div>
            <Button onClick={searchWiki} disabled={searching} variant="outline">
              {searching ? "Aranıyor..." : "Ara"}
            </Button>
          </div>
          {wikiResults.length > 0 && (
            <div className="divide-y border rounded-lg overflow-hidden">
              {wikiResults.map((r, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 hover:bg-blue-50 transition">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-900">{r.title}</div>
                    <div className="text-xs text-gray-400 truncate"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(r.snippet || "") }} />
                  </div>
                  <Button size="sm" variant="outline" onClick={() => addFromSearch(r)}
                    disabled={topics.some(t => t.title === r.title)}>
                    {topics.some(t => t.title === r.title)
                      ? "Eklendi"
                      : <><Plus className="w-3 h-3 mr-1" />Ekle</>}
                  </Button>
                </div>
              ))}
            </div>
          )}
          {wikiResults.length === 0 && !searching && wikiSearch && (
            <p className="text-sm text-gray-400 text-center py-4">Sonuç bulunamadı.</p>
          )}
        </div>

        {/* Save indicator */}
        {saveMut.isPending && (
          <div className="fixed bottom-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 text-sm z-50">
            <Save className="w-4 h-4 animate-pulse" /> Kaydediliyor...
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
