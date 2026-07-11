import { useMemo, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useListNews, useListAuthors } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/AdminLayout";
import { apiFetch, apiUrl, ensureAdminPanelBootstrap } from "@/lib/apiBase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { format, isValid } from "date-fns";
import { Search, Send, Sparkles, PlayCircle, Trash2 } from "lucide-react";

function formatAdminDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (!isValid(d)) return "—";
  return format(d, "dd.MM.yyyy HH:mm");
}
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type HmSiteRow = { id: number; slug: string; displayName: string; active: boolean };

type PoolItemRow = {
  id: number;
  sourceNewsId: number | null;
  status: string;
  kind: string;
  payloadJson: string | null;
  createdAt: string;
};

type PoolJobRow = {
  id: number;
  poolItemId: number;
  targetSiteId: number;
  mode: string;
  status: string;
  errorMessage: string | null;
  resultNewsId: number | null;
  createdAt: string;
  updatedAt: string;
  targetSlug: string;
  targetName: string;
};

async function fetchHmSites(): Promise<{ items: HmSiteRow[] }> {
  await ensureAdminPanelBootstrap();
  const r = await apiFetch(apiUrl("/api/hm/sites"));
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function fetchPoolItems(): Promise<{ items: PoolItemRow[] }> {
  await ensureAdminPanelBootstrap();
  const r = await apiFetch(apiUrl("/api/hm/pool/items"));
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function fetchPoolJobs(): Promise<{ jobs: PoolJobRow[] }> {
  await ensureAdminPanelBootstrap();
  const r = await apiFetch(apiUrl("/api/hm/pool/jobs?limit=60"));
  if (!r.ok) throw new Error(await r.text());
  return (await r.json()) as { jobs: PoolJobRow[] };
}

export default function IcerikHavuzu() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState("haberler");
  const [search, setSearch] = useState("");
  const [processingQueue, setProcessingQueue] = useState(false);
  const [requeueingFailed, setRequeueingFailed] = useState(false);
  const { data: newsList, isLoading: newsLoading } = useListNews({
    siteScope: "portal",
  } as Parameters<typeof useListNews>[0]);
  const { data: authors, isLoading: authorsLoading } = useListAuthors();

  const { data: hmSitesData } = useQuery({
    queryKey: ["/api/hm/sites"],
    queryFn: fetchHmSites,
  });
  const { data: poolData } = useQuery({
    queryKey: ["/api/hm/pool/items"],
    queryFn: fetchPoolItems,
  });
  const { data: poolJobsData } = useQuery({
    queryKey: ["/api/hm/pool/jobs"],
    queryFn: fetchPoolJobs,
  });

  const { data: editorNewsData, isLoading: editorNewsLoading } = useQuery({
    queryKey: ["/api/news", "editor-manual", search],
    queryFn: async () => {
      await ensureAdminPanelBootstrap();
      const q = new URLSearchParams({
        status: "published",
        isEditorManual: "true",
        limit: "200",
      });
      if (search.trim()) q.set("q", search.trim());
      const r = await apiFetch(apiUrl(`/api/news?${q}`));
      if (!r.ok) throw new Error(await r.text());
      return (await r.json()) as { items?: { id: number; title: string; slug: string; status: string; createdAt: string }[] };
    },
    enabled: tab === "editor",
  });

  const hmSites = useMemo(
    () => (hmSitesData?.items ?? []).filter((s) => s.active),
    [hmSitesData?.items],
  );
  const poolItems = poolData?.items ?? [];
  const poolJobs = poolJobsData?.jobs ?? [];

  const poolQueueToastDescription = (j: {
    attempted?: number;
    completed?: number;
    failed?: number;
    requeued?: number;
    hint?: string;
    queue?: { queued?: number; failed?: number; processing?: number };
    aiKeysReady?: boolean;
  }) => {
    const parts = [
      `İşlenen: ${j.attempted ?? 0}, tamam: ${j.completed ?? 0}, hata: ${j.failed ?? 0}`,
    ];
    if ((j.requeued ?? 0) > 0) parts.push(`yeniden kuyruğa alınan: ${j.requeued}`);
    if (j.queue) {
      parts.push(
        `bekleyen: ${j.queue.queued ?? 0}, başarısız: ${j.queue.failed ?? 0}, işleniyor: ${j.queue.processing ?? 0}`,
      );
    }
    if (j.aiKeysReady === false) {
      parts.push(
        "AI anahtarı yok — OpenAI: AI İçerik Robotu → Ayarlar; Gemini: Genel Ayarlar → Entegrasyonlar.",
      );
    } else if ((j.attempted ?? 0) === 0) {
      parts.push("Anahtar: OpenAI (AI Robotu) veya Gemini (Genel Ayarlar); OpenAI kotası dolunca Gemini kullanılır.");
    }
    if (j.hint) parts.push(j.hint);
    return parts.join(". ");
  };

  const runPoolQueue = async (opts?: { requeueFailed?: boolean }) => {
    setProcessingQueue(true);
    try {
      await ensureAdminPanelBootstrap();
      const r = await apiFetch(apiUrl("/api/hm/pool/process"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 15, requeueFailed: opts?.requeueFailed === true }),
      });
      const j = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        completed?: number;
        failed?: number;
        attempted?: number;
        requeued?: number;
        hint?: string;
        queue?: { queued?: number; failed?: number; processing?: number };
        aiKeysReady?: boolean;
        error?: string;
      };
      if (!r.ok || !j.ok) {
        toast({
          title: "Kuyruk işlenemedi",
          description: j.error || (await r.text().catch(() => "")),
          variant: "destructive",
        });
        return;
      }
      const zeroWork = (j.attempted ?? 0) === 0 && (j.requeued ?? 0) === 0;
      toast({
        title: zeroWork ? "Sırada iş yok" : "Kuyruk güncellendi",
        description: poolQueueToastDescription(j),
        variant: zeroWork && j.aiKeysReady === false ? "destructive" : undefined,
      });
      await qc.invalidateQueries({ queryKey: ["/api/hm/pool/items"] });
      await qc.invalidateQueries({ queryKey: ["/api/hm/pool/jobs"] });
    } catch (e) {
      toast({
        title: "Bağlantı hatası",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setProcessingQueue(false);
    }
  };

  const requeueFailedJobs = async () => {
    setRequeueingFailed(true);
    try {
      await ensureAdminPanelBootstrap();
      const r = await apiFetch(apiUrl("/api/hm/pool/jobs/requeue-failed"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 50 }),
      });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; requeued?: number; error?: string };
      if (!r.ok || !j.ok) {
        toast({
          title: "Yeniden kuyruk başarısız",
          description: j.error || (await r.text().catch(() => "")),
          variant: "destructive",
        });
        return;
      }
      toast({
        title: j.requeued ? "Başarısız işler kuyruğa alındı" : "Başarısız iş yok",
        description: j.requeued
          ? `${j.requeued} iş yeniden sırada. Şimdi «AI kuyruğunu işle» ile çalıştırın.`
          : "Kuyrukta failed durumunda kayıt bulunamadı.",
      });
      await qc.invalidateQueries({ queryKey: ["/api/hm/pool/jobs"] });
    } catch (e) {
      toast({
        title: "Bağlantı hatası",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setRequeueingFailed(false);
    }
  };

  const [aiByNewsId, setAiByNewsId] = useState<Record<number, boolean>>({});
  const [targets, setTargets] = useState<Record<number, boolean>>({});

  const newsItems = Array.isArray(newsList?.items) ? newsList.items : [];
  const editorItems = Array.isArray(editorNewsData?.items) ? editorNewsData.items : [];
  const filteredNews = useMemo(
    () =>
      newsItems.filter((n) =>
        search.trim() === "" ? true : n.title.toLowerCase().includes(search.toLowerCase()),
      ),
    [newsItems, search],
  );

  const setTarget = (id: number, checked: boolean) => {
    setTargets((p) => ({ ...p, [id]: checked }));
  };

  const selectedSiteIds = hmSites.filter((s) => targets[s.id]).map((s) => s.id);
  const selectedSiteLabels = hmSites.filter((s) => targets[s.id]).map((s) => s.displayName);

  const [sendAsPublished, setSendAsPublished] = useState(true);
  const [copyToYekpareAuthors, setCopyToYekpareAuthors] = useState(true);
  const [pickedNews, setPickedNews] = useState<Record<number, boolean>>({});
  const [pickedAuthors, setPickedAuthors] = useState<Record<number, boolean>>({});
  const [bulkNewsRunning, setBulkNewsRunning] = useState(false);
  const [authorAssignRunning, setAuthorAssignRunning] = useState(false);
  const [deleteJobId, setDeleteJobId] = useState<number | null>(null);
  const [deletePoolItemId, setDeletePoolItemId] = useState<number | null>(null);
  const [deletingJob, setDeletingJob] = useState(false);
  const [deletingPoolItem, setDeletingPoolItem] = useState(false);

  const confirmDeleteJob = async () => {
    if (deleteJobId == null) return;
    setDeletingJob(true);
    try {
      await ensureAdminPanelBootstrap();
      const r = await apiFetch(apiUrl(`/api/hm/pool/jobs/${deleteJobId}`), { method: "DELETE" });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        toast({
          title: "Silinemedi",
          description: j.error || (await r.text().catch(() => "")),
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Kuyruk işi silindi" });
      setDeleteJobId(null);
      await qc.invalidateQueries({ queryKey: ["/api/hm/pool/jobs"] });
      await qc.invalidateQueries({ queryKey: ["/api/hm/pool/items"] });
    } catch (e) {
      toast({
        title: "Bağlantı hatası",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setDeletingJob(false);
    }
  };

  const confirmDeletePoolItem = async () => {
    if (deletePoolItemId == null) return;
    setDeletingPoolItem(true);
    try {
      await ensureAdminPanelBootstrap();
      const r = await apiFetch(apiUrl(`/api/hm/pool/items/${deletePoolItemId}`), { method: "DELETE" });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        toast({
          title: "Silinemedi",
          description: j.error || (await r.text().catch(() => "")),
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Havuz kaydı silindi" });
      setDeletePoolItemId(null);
      await qc.invalidateQueries({ queryKey: ["/api/hm/pool/items"] });
      await qc.invalidateQueries({ queryKey: ["/api/hm/pool/jobs"] });
    } catch (e) {
      toast({
        title: "Bağlantı hatası",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setDeletingPoolItem(false);
    }
  };

  const queueSingleNewsToHmPool = useCallback(
    async (newsId: number): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (selectedSiteIds.length === 0) {
        return { ok: false, error: "En az bir haber merkezi sitesi işaretleyin." };
      }
      try {
        await ensureAdminPanelBootstrap();
        const r1 = await apiFetch(apiUrl("/api/hm/pool/from-news"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceNewsId: newsId }),
        });
        const j1 = (await r1.json().catch(() => ({}))) as { id?: number; error?: string };
        if (!r1.ok || typeof j1.id !== "number") {
          return { ok: false, error: j1.error || (await r1.text().catch(() => "Havuz kaydı başarısız")) };
        }
        const mode = aiByNewsId[newsId] ? "full_ai" : "same";
        const r2 = await apiFetch(apiUrl("/api/hm/pool/jobs"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            poolItemId: j1.id,
            targetSiteIds: selectedSiteIds,
            mode,
            postStatus: sendAsPublished ? "published" : "draft",
          }),
        });
        const j2 = (await r2.json().catch(() => ({}))) as { error?: string };
        if (!r2.ok) {
          return { ok: false, error: j2.error || "AI kuyruğu oluşturulamadı" };
        }
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    },
    [aiByNewsId, selectedSiteIds, sendAsPublished],
  );

  /** Seçili HM siteleri için: yazar(lar)a atanmış yayında köşe haberlerini havuz kuyruğuna ekler (`AI özgün` anahtarı kapalıysa aynı içerik). */
  const queuePublishedNewsForAuthorsToHmPool = useCallback(
    async (authorIds: number[]): Promise<{ queued: number; failed: number }> => {
      if (selectedSiteIds.length === 0 || authorIds.length === 0) return { queued: 0, failed: 0 };
      let queued = 0;
      let failed = 0;
      const seenNews = new Set<number>();
      await ensureAdminPanelBootstrap();
      for (const aid of authorIds) {
        const r = await apiFetch(
          apiUrl(`/api/news?authorId=${encodeURIComponent(String(aid))}&status=published&limit=200`),
        );
        if (!r.ok) {
          failed += 1;
          continue;
        }
        const j = (await r.json().catch(() => ({}))) as { items?: { id: number }[] };
        for (const it of j.items ?? []) {
          if (seenNews.has(it.id)) continue;
          seenNews.add(it.id);
          const q = await queueSingleNewsToHmPool(it.id);
          if (q.ok) queued += 1;
          else failed += 1;
        }
      }
      return { queued, failed };
    },
    [queueSingleNewsToHmPool, selectedSiteIds],
  );

  const sendNewsToHmPool = async (newsId: number, title: string) => {
    const r = await queueSingleNewsToHmPool(newsId);
    if (!r.ok) {
      toast({ title: "Dağıtım başarısız", description: r.error, variant: "destructive" });
      return;
    }
    const mode = aiByNewsId[newsId] ? "full_ai" : "same";
    toast({
      title: "Kuyruğa alındı",
      description: `${title} → ${selectedSiteLabels.join(", ")} (${mode === "full_ai" ? "AI özgünleştirme" : "aynı içerik"}, ${sendAsPublished ? "yayında" : "taslak"}). Hedef sitede haber oluşması için bu sayfada «AI kuyruğunu işle» düğmesine basın.`,
    });
    await qc.invalidateQueries({ queryKey: ["/api/hm/pool/items"] });
    await qc.invalidateQueries({ queryKey: ["/api/hm/pool/jobs"] });
  };

  const sendBulkNewsToHmPool = async (rows: { id: number; title: string }[]) => {
    const targets = rows.filter((n) => pickedNews[n.id]);
    if (targets.length === 0) {
      toast({ title: "Seçim yok", description: "En az bir haber işaretleyin.", variant: "destructive" });
      return;
    }
    if (selectedSiteIds.length === 0) {
      toast({
        title: "Hedef site seçin",
        description: "En az bir haber merkezi sitesi işaretleyin.",
        variant: "destructive",
      });
      return;
    }
    setBulkNewsRunning(true);
    let ok = 0;
    let fail = 0;
    let lastErr = "";
    try {
      for (const n of targets) {
        const r = await queueSingleNewsToHmPool(n.id);
        if (r.ok) ok += 1;
        else {
          fail += 1;
          lastErr = r.error;
        }
      }
      if (fail === 0) {
        toast({
          title: "Toplu kuyruk tamam",
          description: `${ok} haber kuyruğa alındı. Hedef sitelerde içeriğin oluşması için «AI kuyruğunu işle (sıradaki işler)» düğmesine basın.`,
        });
      } else {
        toast({
          title: "Kısmen tamamlandı",
          description: `Kuyruğa alınan: ${ok}, hata: ${fail}. ${lastErr}`,
          variant: fail === targets.length ? "destructive" : "default",
        });
      }
      await qc.invalidateQueries({ queryKey: ["/api/hm/pool/items"] });
      await qc.invalidateQueries({ queryKey: ["/api/hm/pool/jobs"] });
    } finally {
      setBulkNewsRunning(false);
    }
  };

  const postAuthorBulkDistribute = async (authorIds: number[]) => {
    if (authorIds.length === 0) {
      toast({ title: "Seçim yok", description: "En az bir yazar işaretleyin.", variant: "destructive" });
      return;
    }
    if (selectedSiteIds.length === 0 && !copyToYekpareAuthors) {
      toast({
        title: "Hedef seçin",
        description: "Yekpare (merkez) ve/veya en az bir HM sitesi işaretleyin.",
        variant: "destructive",
      });
      return;
    }
    setAuthorAssignRunning(true);
    try {
      await ensureAdminPanelBootstrap();
      const r = await apiFetch(apiUrl("/api/authors/bulk-distribute"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorIds,
          targetHmSiteIds: selectedSiteIds,
          copyToPortal: copyToYekpareAuthors,
          syncArticlesOnly: false,
        }),
      });
      const j = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        created?: number;
        skipped?: number;
        articlesAdded?: number;
        articlesSkipped?: number;
        error?: string;
      };
      if (!r.ok || !j.ok) {
        toast({
          title: "Atama başarısız",
          description: j.error || (await r.text().catch(() => "")),
          variant: "destructive",
        });
        return;
      }
      const poolStats =
        selectedSiteIds.length > 0 ? await queuePublishedNewsForAuthorsToHmPool(authorIds) : null;
      let desc = `Yeni profil: ${j.created ?? 0}, atlanan (zaten vardı): ${j.skipped ?? 0}.`;
      if (selectedSiteIds.length > 0 && (j.articlesAdded ?? 0) + (j.articlesSkipped ?? 0) > 0) {
        desc += ` Köşe makaleleri: ${j.articlesAdded ?? 0} kopyalandı${
          j.articlesSkipped ? `, ${j.articlesSkipped} atlandı` : ""
        }.`;
      }
      if (poolStats && selectedSiteIds.length > 0) {
        desc += ` Köşe haberleri (havuz): ${poolStats.queued} kuyruğa alındı${
          poolStats.failed ? `, ${poolStats.failed} satırda hata` : ""
        }.`;
        await qc.invalidateQueries({ queryKey: ["/api/hm/pool/items"] });
        await qc.invalidateQueries({ queryKey: ["/api/hm/pool/jobs"] });
      }
      toast({
        title: "Yazar ataması tamam",
        description: desc,
      });
      await qc.invalidateQueries({ queryKey: ["/api/authors"] });
    } catch (e) {
      toast({
        title: "Bağlantı hatası",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setAuthorAssignRunning(false);
    }
  };

  const postAuthorSyncArticles = async (authorIds: number[]) => {
    if (authorIds.length === 0) {
      toast({ title: "Seçim yok", description: "En az bir yazar işaretleyin.", variant: "destructive" });
      return;
    }
    if (selectedSiteIds.length === 0) {
      toast({
        title: "Hedef site seçin",
        description: "Makale eşitleme için en az bir HM sitesi işaretleyin.",
        variant: "destructive",
      });
      return;
    }
    setAuthorAssignRunning(true);
    try {
      await ensureAdminPanelBootstrap();
      const r = await apiFetch(apiUrl("/api/authors/bulk-distribute"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorIds,
          targetHmSiteIds: selectedSiteIds,
          syncArticlesOnly: true,
        }),
      });
      const j = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        articlesAdded?: number;
        articlesSkipped?: number;
        error?: string;
      };
      if (!r.ok || !j.ok) {
        toast({
          title: "Makale eşitleme başarısız",
          description: j.error || (await r.text().catch(() => "")),
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Köşe makaleleri eşitlendi",
        description: `${j.articlesAdded ?? 0} makale kopyalandı${j.articlesSkipped ? `, ${j.articlesSkipped} zaten vardı/atlandı` : ""}.`,
      });
      await qc.invalidateQueries({ queryKey: ["/api/authors"] });
    } catch (e) {
      toast({
        title: "Bağlantı hatası",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setAuthorAssignRunning(false);
    }
  };

  const authorsList = Array.isArray(authors) ? authors : [];
  const togglePickNews = (id: number, checked: boolean) => {
    setPickedNews((p) => ({ ...p, [id]: checked }));
  };
  const togglePickAuthor = (id: number, checked: boolean) => {
    setPickedAuthors((p) => ({ ...p, [id]: checked }));
  };
  const allNewsFilteredPicked =
    filteredNews.length > 0 && filteredNews.every((n) => pickedNews[n.id]);
  const allEditorPicked = editorItems.length > 0 && editorItems.every((n) => pickedNews[n.id]);
  const allAuthorsPicked = authorsList.length > 0 && authorsList.every((a) => pickedAuthors[a.id]);
  const selectedAuthorIds = authorsList.filter((a) => pickedAuthors[a.id]).map((a) => a.id);

  return (
    <AdminLayout title="İçerik Havuzu">
      <div className="space-y-4">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-5">
          <h1 className="text-lg font-bold text-gray-900">İçerik Havuzu</h1>
          <p className="text-sm text-gray-600 mt-1 max-w-3xl">
            Haber Merkezi: havuza haber ekleyip hedef HM sitelerine AI veya aynı içerik modunda kuyruk oluşturur.
            Kuyruk oluşunca hedef sitede haber için <strong>AI kuyruğunu işle</strong> düğmesine basın. AI anahtarı:{" "}
            <strong>OpenAI</strong> (AI İçerik Robotu → Ayarlar) veya <strong>Gemini</strong> (Genel Ayarlar → Entegrasyonlar);
            OpenAI kotası dolunca Gemini kullanılır. Siteleri{" "}
            <a className="text-red-600 font-semibold hover:underline" href="/admin/haber-siteleri">
              Haber siteleri (HM)
            </a>{" "}
            sayfasından tanımlayın.
          </p>
          <p className="text-sm text-slate-700 mt-3 max-w-3xl border-l-4 border-slate-300 pl-3">
            Köşe <strong>yazarı silmek / düzenlemek</strong> veya köşe <strong>makalesini silmek</strong> için bu sayfa değil: sol menüden{" "}
            <a className="font-semibold text-red-600 hover:underline" href="/admin/kose-yazarlari">
              Köşe Yazarları
            </a>{" "}
            (sil + editörde düzenle bağlantısı) ve{" "}
            <a className="font-semibold text-red-600 hover:underline" href="/admin/hm-kose-makaleler">
              Köşe makaleleri (HM)
            </a>{" "}
            (sil + editörde düzenle) sayfalarını kullanın. Burada yalnızca havuzdan siteye <strong>Ata</strong> vardır.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              className="gap-2 bg-slate-900 text-white"
              disabled={processingQueue || requeueingFailed}
              onClick={() => void runPoolQueue()}
            >
              <PlayCircle className="h-4 w-4 shrink-0" />
              {processingQueue ? "Kuyruk işleniyor…" : "AI kuyruğunu işle (sıradaki işler)"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={processingQueue || requeueingFailed}
              onClick={() => void runPoolQueue({ requeueFailed: true })}
            >
              <PlayCircle className="h-4 w-4 shrink-0" />
              Başarısızları yeniden dene ve işle
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={processingQueue || requeueingFailed}
              onClick={() => void requeueFailedJobs()}
            >
              {requeueingFailed ? "Kuyruğa alınıyor…" : "Yalnızca başarısızları kuyruğa al"}
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Hedef HM siteleri</p>
          {hmSites.length === 0 ? (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Kayıtlı aktif site yok. Önce admin → Haber siteleri (HM) ile site ve editör ekleyin.
            </p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {hmSites.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={!!targets[s.id]}
                    onCheckedChange={(c) => setTarget(s.id, c === true)}
                  />
                  <span>
                    {s.displayName} <span className="text-gray-400">({s.slug})</span>
                  </span>
                </label>
              ))}
            </div>
          )}
          <div className="mt-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer max-w-xl">
              <Checkbox
                checked={sendAsPublished}
                onCheckedChange={(c) => setSendAsPublished(c === true)}
              />
              <span>
                <strong>Yayında olarak gönder</strong> — hedef HM sitesinde haber taslak değil, yayında oluşturulsun
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1 max-w-2xl">
              AI İçerik Robotu ayarındaki «yayın durumu» havuz dağıtımını etkilemez. Taslak göndermek için kutuyu kaldırın.
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Köşe yazarı ataması</p>
            <label className="flex items-center gap-2 text-sm cursor-pointer max-w-xl">
              <Checkbox
                checked={copyToYekpareAuthors}
                onCheckedChange={(c) => setCopyToYekpareAuthors(c === true)}
              />
              <span>
                <strong>Yekpare Haber (merkez)</strong> — seçilen yazarları portal köşe havuzuna kopyala{" "}
                <span className="text-gray-500">(yazarlar / haber sayfası)</span>
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-2 max-w-2xl">
              HM siteleri yalnızca haber havuzu dağıtımı içindir; köşe yazarlarını sitelere kopyalamak için yukarıdaki
              siteleri işaretleyin veya yalnızca merkez kutusunu kullanın.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Havuz öğeleri (son kayıtlar)</p>
          {poolItems.length === 0 ? (
            <p className="text-sm text-gray-500">Henüz havuz kaydı yok veya liste alınamadı.</p>
          ) : (
            <div className="border rounded-md overflow-x-auto max-h-48 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80">
                    <TableHead className="w-14">#</TableHead>
                    <TableHead>Haber</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead className="w-16 text-right">Sil</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {poolItems.slice(0, 30).map((p) => {
                    let title = "—";
                    try {
                      const o = p.payloadJson ? (JSON.parse(p.payloadJson) as { title?: string }) : null;
                      title = o?.title ?? title;
                    } catch {
                      /* ignore */
                    }
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs text-muted-foreground">{p.id}</TableCell>
                        <TableCell className="text-sm">
                          <div className="font-medium line-clamp-2">{title}</div>
                          <div className="text-xs text-muted-foreground">news #{p.sourceNewsId ?? "—"}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{p.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {formatAdminDate(p.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            aria-label="Havuz kaydını sil"
                            onClick={() => setDeletePoolItemId(p.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">AI dağıtım kuyruğu (işler)</p>
          {poolJobs.length === 0 ? (
            <p className="text-sm text-gray-500">Henüz iş yok veya liste alınamadı.</p>
          ) : (
            <div className="border rounded-md overflow-x-auto max-h-56 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80">
                    <TableHead className="w-14">#</TableHead>
                    <TableHead>Hedef site</TableHead>
                    <TableHead>Mod</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Hata / not</TableHead>
                    <TableHead className="w-16 text-right">Sil</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {poolJobs.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell className="text-xs text-muted-foreground">{j.id}</TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium">{j.targetName}</div>
                        <div className="text-xs text-muted-foreground">{j.targetSlug}</div>
                      </TableCell>
                      <TableCell className="text-xs">{j.mode === "same" ? "Aynı içerik" : "AI özgün"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            j.status === "completed"
                              ? "default"
                              : j.status === "failed"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {j.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[220px] break-words">
                        {j.errorMessage ??
                          (j.resultNewsId != null ? `Haber #${j.resultNewsId} (site ${j.targetSiteId})` : "—")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          aria-label="Kuyruk işini sil"
                          disabled={j.status === "processing"}
                          onClick={() => setDeleteJobId(j.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="haberler">Haberler</TabsTrigger>
            <TabsTrigger value="kose">Köşe yazarları</TabsTrigger>
            <TabsTrigger value="editor">Editör haberleri</TabsTrigger>
          </TabsList>

          <TabsContent value="haberler" className="mt-4">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Haber ara..."
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-1.5 shrink-0"
                  disabled={bulkNewsRunning || filteredNews.length === 0}
                  onClick={() =>
                    void sendBulkNewsToHmPool(
                      filteredNews.map((n) => ({ id: n.id, title: n.title })),
                    )
                  }
                >
                  <Send className="w-3.5 h-3.5" />
                  {bulkNewsRunning ? "Gönderiliyor…" : "Seçilenleri dağıt"}
                </Button>
              </div>

              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/80">
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allNewsFilteredPicked}
                          onCheckedChange={(c) => {
                            const on = c === true;
                            const next: Record<number, boolean> = { ...pickedNews };
                            for (const n of filteredNews) next[n.id] = on;
                            setPickedNews(next);
                          }}
                          aria-label="Tümünü seç"
                        />
                      </TableHead>
                      <TableHead>HABER</TableHead>
                      <TableHead>DURUM</TableHead>
                      <TableHead>TARİH</TableHead>
                      <TableHead className="whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          AI özgünleştir
                        </span>
                      </TableHead>
                      <TableHead className="text-right">Dağıt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                          Yükleniyor...
                        </TableCell>
                      </TableRow>
                    ) : filteredNews.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                          Havuzda haber yok.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredNews.map((n) => (
                        <TableRow key={n.id}>
                          <TableCell>
                            <Checkbox
                              checked={!!pickedNews[n.id]}
                              onCheckedChange={(c) => togglePickNews(n.id, c === true)}
                              aria-label={`Seç: ${n.title}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-gray-900">{n.title}</div>
                            <div className="text-xs text-muted-foreground">{n.slug}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={n.status === "published" ? "default" : "secondary"}>
                              {n.status === "published" ? "Yayında" : "Taslak"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {formatAdminDate(n.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`ai-${n.id}`}
                                checked={!!aiByNewsId[n.id]}
                                onCheckedChange={(c) =>
                                  setAiByNewsId((prev) => ({ ...prev, [n.id]: !!c }))
                                }
                              />
                              <Label htmlFor={`ai-${n.id}`} className="text-xs text-muted-foreground cursor-pointer">
                                Başlık + özet + gövde
                              </Label>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => void sendNewsToHmPool(n.id, n.title)}
                            >
                              <Send className="w-3.5 h-3.5" />
                              Gönder
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="editor" className="mt-4">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <p className="text-sm text-gray-600 mb-4">
                Panelden manuel eklenen ve yayında olan haberler (<code className="text-xs bg-gray-100 px-1 rounded">is_editor_manual</code>
                ). RSS ile gelenler burada listelenmez.
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Editör haberi ara..."
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-1.5 shrink-0"
                  disabled={bulkNewsRunning || editorItems.length === 0}
                  onClick={() =>
                    void sendBulkNewsToHmPool(
                      editorItems.map((n) => ({ id: n.id, title: n.title })),
                    )
                  }
                >
                  <Send className="w-3.5 h-3.5" />
                  {bulkNewsRunning ? "Gönderiliyor…" : "Seçilenleri dağıt"}
                </Button>
              </div>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/80">
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allEditorPicked}
                          onCheckedChange={(c) => {
                            const on = c === true;
                            const next: Record<number, boolean> = { ...pickedNews };
                            for (const n of editorItems) next[n.id] = on;
                            setPickedNews(next);
                          }}
                          aria-label="Tümünü seç"
                        />
                      </TableHead>
                      <TableHead>HABER</TableHead>
                      <TableHead>DURUM</TableHead>
                      <TableHead>TARİH</TableHead>
                      <TableHead className="whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          AI özgünleştir
                        </span>
                      </TableHead>
                      <TableHead className="text-right">Dağıt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editorNewsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                          Yükleniyor...
                        </TableCell>
                      </TableRow>
                    ) : editorItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                          Yayında editör haberi yok.
                        </TableCell>
                      </TableRow>
                    ) : (
                      editorItems.map((n) => (
                        <TableRow key={n.id}>
                          <TableCell>
                            <Checkbox
                              checked={!!pickedNews[n.id]}
                              onCheckedChange={(c) => togglePickNews(n.id, c === true)}
                              aria-label={`Seç: ${n.title}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-gray-900">{n.title}</div>
                            <div className="text-xs text-muted-foreground">{n.slug}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={n.status === "published" ? "default" : "secondary"}>
                              {n.status === "published" ? "Yayında" : "Taslak"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {formatAdminDate(n.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`ai-ed-${n.id}`}
                                checked={!!aiByNewsId[n.id]}
                                onCheckedChange={(c) =>
                                  setAiByNewsId((prev) => ({ ...prev, [n.id]: !!c }))
                                }
                              />
                              <Label htmlFor={`ai-ed-${n.id}`} className="text-xs text-muted-foreground cursor-pointer">
                                Başlık + özet + gövde
                              </Label>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => void sendNewsToHmPool(n.id, n.title)}
                            >
                              <Send className="w-3.5 h-3.5" />
                              Gönder
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="kose" className="mt-4">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <p className="text-sm text-gray-600 mb-4">
                Seçtiğiniz yazarları <strong>Yekpare merkez</strong> havuzuna ve/veya işaretlediğiniz HM sitelerine
                kopyalayın (aynı isimde kayıt varsa atlanır). Hedef HM sitesi seçiliyken <strong>Ata</strong> dendiğinde
                kaynak yazarın yayınlı <strong>köşe makaleleri</strong> ve yazarlı <strong>haber</strong> kayıtları hedef
                siteye kopyalanır. Yazarlar zaten atanmışsa <strong>Makaleleri eşle</strong> ile eksik makaleleri
                tamamlayabilirsiniz.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-1"
                  disabled={authorAssignRunning || authorsList.length === 0}
                  onClick={() => void postAuthorBulkDistribute(selectedAuthorIds)}
                >
                  <Send className="w-3.5 h-3.5" />
                  {authorAssignRunning ? "Atanıyor…" : "Seçilenleri ata"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={authorAssignRunning || authorsList.length === 0 || selectedSiteIds.length === 0}
                  onClick={() => void postAuthorSyncArticles(selectedAuthorIds)}
                >
                  Makaleleri eşle
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={authorAssignRunning || authorsList.length === 0}
                  onClick={() => void postAuthorBulkDistribute(authorsList.map((a) => a.id))}
                >
                  Tüm yazarları ata
                </Button>
              </div>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/80">
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allAuthorsPicked}
                          onCheckedChange={(c) => {
                            const on = c === true;
                            const next: Record<number, boolean> = { ...pickedAuthors };
                            for (const a of authorsList) next[a.id] = on;
                            setPickedAuthors(next);
                          }}
                          aria-label="Tüm yazarları seç"
                        />
                      </TableHead>
                      <TableHead>YAZAR</TableHead>
                      <TableHead>ÜNVAN</TableHead>
                      <TableHead className="text-right">İşlem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {authorsLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                          Yükleniyor...
                        </TableCell>
                      </TableRow>
                    ) : authorsList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                          Henüz yazar yok.
                        </TableCell>
                      </TableRow>
                    ) : (
                      authorsList.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>
                            <Checkbox
                              checked={!!pickedAuthors[a.id]}
                              onCheckedChange={(c) => togglePickAuthor(a.id, c === true)}
                              aria-label={`Seç: ${a.name}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{a.name}</TableCell>
                          <TableCell>{a.title || "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              disabled={authorAssignRunning}
                              onClick={() => void postAuthorBulkDistribute([a.id])}
                            >
                              <Send className="w-3.5 h-3.5" />
                              Ata
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <AlertDialog open={deleteJobId != null} onOpenChange={(open) => !open && setDeleteJobId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Kuyruk işini sil</AlertDialogTitle>
              <AlertDialogDescription>
                Bu iş kaydı silinecek. Tamamlanmış işlerde oluşturulan haber silinmez; yalnızca kuyruk satırı kaldırılır.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingJob}>İptal</AlertDialogCancel>
              <Button
                type="button"
                variant="destructive"
                disabled={deletingJob}
                onClick={() => void confirmDeleteJob()}
              >
                {deletingJob ? "Siliniyor…" : "Sil"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deletePoolItemId != null} onOpenChange={(open) => !open && setDeletePoolItemId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Havuz kaydını sil</AlertDialogTitle>
              <AlertDialogDescription>
                Havuz öğesi ve bağlı tüm kuyruk işleri silinir. Yayınlanmış haberler silinmez.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingPoolItem}>İptal</AlertDialogCancel>
              <Button
                type="button"
                variant="destructive"
                disabled={deletingPoolItem}
                onClick={() => void confirmDeletePoolItem()}
              >
                {deletingPoolItem ? "Siliniyor…" : "Sil"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
