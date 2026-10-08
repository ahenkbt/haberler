import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EditorLayout } from "@/components/EditorLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { hmEditorJson } from "@/lib/hmEditorApi";

type FeedItem = {
  kind: "rss" | "news";
  refId: number;
  publicSlug: string;
  title: string;
  category: string;
  source: string;
  link: string;
  imageUrl: string;
  at: string | null;
  active: boolean;
  hiddenReason: string | null;
  categoryOff: boolean;
  url: string;
};
type FeedResp = { siteId: number; items: FeedItem[]; limit: number; offset: number };
type Cat = { slug: string; name: string; own: boolean; recent: number; active: boolean };
type CatResp = { siteId: number; categories: Cat[] };

const PAGE = 50;

function fmt(at: string | null): string {
  if (!at) return "";
  try {
    return new Date(at).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "short", timeStyle: "short" });
  } catch {
    return String(at);
  }
}

function reasonLabel(it: FeedItem): string {
  if (it.categoryOff) return "Kategori kapalı";
  if (!it.hiddenReason) return "";
  if (it.hiddenReason === "editor_pasif") return "Editör pasif yaptı";
  if (it.hiddenReason.startsWith("off_topic") || it.hiddenReason.startsWith("not_city")) return "Konu dışı (otomatik)";
  if (it.hiddenReason === "blocked_terms") return "Yasaklı ifade";
  return it.hiddenReason;
}

export default function EditorRssHaberler() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [qApplied, setQApplied] = useState("");
  const [cat, setCat] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [state, setState] = useState<"all" | "aktif" | "pasif">("all");
  const [kind, setKind] = useState<"all" | "rss" | "news">("all");
  const [offset, setOffset] = useState(0);

  const params = new URLSearchParams();
  if (qApplied) params.set("q", qApplied);
  if (cat) params.set("cat", cat);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  params.set("state", state);
  params.set("kind", kind);
  params.set("limit", String(PAGE));
  params.set("offset", String(offset));
  const feedPath = `/api/hm/editor/site-feed?${params.toString()}`;

  const feed = useQuery({
    queryKey: ["/api/hm/editor/site-feed", feedPath],
    queryFn: () => hmEditorJson<FeedResp>(feedPath),
  });
  const cats = useQuery({
    queryKey: ["/api/hm/editor/site-categories"],
    queryFn: () => hmEditorJson<CatResp>("/api/hm/editor/site-categories"),
  });

  const setItem = useMutation({
    mutationFn: (v: { it: FeedItem; active: boolean }) =>
      hmEditorJson<{ ok: boolean }>("/api/hm/editor/site-feed/state", {
        method: "POST",
        body: JSON.stringify({ kind: v.it.kind, refId: v.it.refId, publicSlug: v.it.publicSlug, title: v.it.title, active: v.active }),
      }),
    onSuccess: (_d, v) => {
      toast({ title: v.active ? "Haber bu sitede aktif" : "Haber bu sitede pasif", description: "Diğer siteler etkilenmez." });
      void qc.invalidateQueries({ queryKey: ["/api/hm/editor/site-feed"] });
    },
    onError: (e: Error) => toast({ title: "Kaydedilemedi", description: e.message.slice(0, 200), variant: "destructive" }),
  });
  const setCatState = useMutation({
    mutationFn: (v: { slug: string; active: boolean }) =>
      hmEditorJson<{ ok: boolean }>("/api/hm/editor/site-categories/state", {
        method: "POST",
        body: JSON.stringify(v),
      }),
    onSuccess: (_d, v) => {
      toast({
        title: v.active ? "Kategori bu sitede açıldı" : "Kategori bu sitede kapatıldı",
        description: v.active ? "" : "Menü öğesi, anasayfa bloğu ve haberleri yalnızca bu sitede gizlenir.",
      });
      void qc.invalidateQueries({ queryKey: ["/api/hm/editor/site-categories"] });
      void qc.invalidateQueries({ queryKey: ["/api/hm/editor/site-feed"] });
    },
    onError: (e: Error) => toast({ title: "Kaydedilemedi", description: e.message.slice(0, 200), variant: "destructive" }),
  });

  const items = feed.data?.items ?? [];
  const catList = cats.data?.categories ?? [];

  return (
    <EditorLayout title="RSS Haberler">
      <div className="bg-[#0b1328] text-white p-6 rounded-t-md">
        <div className="bg-[#e61e25] text-white text-[10px] font-bold px-2 py-1 rounded inline-block mb-2">ORTAK HABER HAVUZU</div>
        <h1 className="text-2xl font-bold">RSS Haberler</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Sitenizde görünen, otomatik eklenen tüm haberler. "Pasif" yalnızca bu sitede gizler; diğer siteler etkilenmez.
        </p>
      </div>
      <div className="bg-white p-4 rounded-b-md shadow-sm border-x border-b">
        <Tabs defaultValue="haberler">
          <TabsList>
            <TabsTrigger value="haberler">Haberler</TabsTrigger>
            <TabsTrigger value="kategoriler">Kategoriler (bu site)</TabsTrigger>
          </TabsList>
          <TabsContent value="haberler">
            <form
              className="flex flex-wrap gap-2 items-end my-3"
              onSubmit={(e) => {
                e.preventDefault();
                setOffset(0);
                setQApplied(q.trim());
              }}
            >
              <div>
                <label className="block text-xs text-muted-foreground">Ara</label>
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Başlık veya kaynak" className="w-56" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground">Kategori</label>
                <select
                  className="h-9 border rounded px-2 text-sm"
                  value={cat}
                  onChange={(e) => {
                    setOffset(0);
                    setCat(e.target.value);
                  }}
                >
                  <option value="">Tümü</option>
                  {catList.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name} {c.active ? "" : "(kapalı)"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground">Başlangıç</label>
                <Input type="date" value={from} onChange={(e) => { setOffset(0); setFrom(e.target.value); }} className="w-40" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground">Bitiş</label>
                <Input type="date" value={to} onChange={(e) => { setOffset(0); setTo(e.target.value); }} className="w-40" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground">Durum</label>
                <select className="h-9 border rounded px-2 text-sm" value={state} onChange={(e) => { setOffset(0); setState(e.target.value as typeof state); }}>
                  <option value="all">Tümü</option>
                  <option value="aktif">Aktif</option>
                  <option value="pasif">Pasif</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground">Tür</label>
                <select className="h-9 border rounded px-2 text-sm" value={kind} onChange={(e) => { setOffset(0); setKind(e.target.value as typeof kind); }}>
                  <option value="all">Tümü</option>
                  <option value="rss">RSS</option>
                  <option value="news">Havuz / AI</option>
                </select>
              </div>
              <Button type="submit">Filtrele</Button>
            </form>
            {!from && !to ? <p className="text-xs text-muted-foreground mb-2">Tarih seçilmezse son 14 gün listelenir.</p> : null}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>TARİH</TableHead>
                  <TableHead>BAŞLIK</TableHead>
                  <TableHead>KATEGORİ</TableHead>
                  <TableHead>KAYNAK</TableHead>
                  <TableHead className="text-right">BU SİTEDE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feed.isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Yükleniyor...</TableCell></TableRow>
                ) : feed.error ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-red-600">{(feed.error as Error).message}</TableCell></TableRow>
                ) : !items.length ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Kayıt bulunamadı.</TableCell></TableRow>
                ) : (
                  items.map((it) => (
                    <TableRow key={`${it.kind}-${it.refId}-${it.publicSlug}`} className={it.active ? "" : "opacity-60"}>
                      <TableCell className="whitespace-nowrap text-xs">{fmt(it.at)}</TableCell>
                      <TableCell className="max-w-[420px]">
                        <a href={it.url} target="_blank" rel="noopener noreferrer" className="hover:underline font-medium">{it.title}</a>
                        {reasonLabel(it) ? <div className="text-[11px] text-amber-700">{reasonLabel(it)}</div> : null}
                      </TableCell>
                      <TableCell><Badge variant="outline">{it.category || "—"}</Badge></TableCell>
                      <TableCell className="text-xs">
                        {it.link ? <a href={it.link} target="_blank" rel="noopener noreferrer" className="hover:underline">{it.source || "kaynak"}</a> : it.source}
                        <div className="text-[10px] text-muted-foreground">{it.kind === "rss" ? "RSS" : "Havuz"}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <span className="text-xs">{it.active ? "Aktif" : "Pasif"}</span>
                          <Switch
                            checked={!it.hiddenReason}
                            disabled={setItem.isPending || it.hiddenReason === "blocked_terms"}
                            onCheckedChange={(v) => setItem.mutate({ it, active: v })}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="flex justify-between mt-3">
              <Button variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Önceki</Button>
              <Button variant="outline" disabled={items.length < PAGE} onClick={() => setOffset(offset + PAGE)}>Sonraki</Button>
            </div>
          </TabsContent>
          <TabsContent value="kategoriler">
            <p className="text-sm text-muted-foreground my-3">
              Kapatılan kategori yalnızca bu sitede menüden, anasayfa bloklarından ve listelerden kalkar. Diğer siteler etkilenmez.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>KATEGORİ</TableHead>
                  <TableHead>SON 14 GÜN</TableHead>
                  <TableHead className="text-right">BU SİTEDE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cats.isLoading ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-8">Yükleniyor...</TableCell></TableRow>
                ) : (
                  catList.map((c) => (
                    <TableRow key={c.slug} className={c.active ? "" : "opacity-60"}>
                      <TableCell>
                        <span className="font-medium">{c.name}</span> <span className="text-xs text-muted-foreground">/{c.slug}</span>
                        {c.own ? <Badge className="ml-2" variant="secondary">site</Badge> : null}
                      </TableCell>
                      <TableCell className="text-xs">{c.recent}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          <span className="text-xs">{c.active ? "Açık" : "Kapalı"}</span>
                          <Switch checked={c.active} disabled={setCatState.isPending} onCheckedChange={(v) => setCatState.mutate({ slug: c.slug, active: v })} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </div>
    </EditorLayout>
  );
}
