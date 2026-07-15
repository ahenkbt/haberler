import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EditorLayout } from "@/components/EditorLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { apiUrl } from "@/lib/apiBase";
import { readHmJwt } from "@/lib/hmSession";
import { HM_EDITOR_NEWS_QUERY_KEY } from "@/lib/hmEditorQueryKeys";
import type { News } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

type NewsFlagField = "isFeatured" | "isSiteManset" | "isBreaking";

async function patchFlags(id: number, body: Partial<Record<NewsFlagField, boolean>>) {
  const t = readHmJwt();
  if (!t) throw new Error("Oturum yok");
  const r = await fetch(apiUrl(`/api/hm/editor/news/${id}/flags`), {
    method: "PATCH",
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<News>;
}

type NewsWithSiteManset = News & { isSiteManset?: boolean };

export default function EditorManset() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<number | null>(null);

  const q = useQuery({
    queryKey: HM_EDITOR_NEWS_QUERY_KEY,
    queryFn: async () => {
      const t = readHmJwt();
      if (!t) throw new Error("Oturum yok");
      const r = await fetch(apiUrl("/api/hm/editor/news?limit=200"), {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json() as Promise<{ items: NewsWithSiteManset[]; total: number }>;
    },
  });

  const items = (q.data?.items ?? []).filter((n) => n.status === "published");

  const toggle = async (n: NewsWithSiteManset, field: NewsFlagField, value: boolean) => {
    setBusyId(n.id);
    try {
      await patchFlags(n.id, { [field]: value });
      await qc.invalidateQueries({ queryKey: HM_EDITOR_NEWS_QUERY_KEY });
      toast({ title: "Güncellendi" });
    } catch (e) {
      toast({
        title: "Kaydedilemedi",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <EditorLayout title="Slider ve Bant Yönetimi">
      <div className="max-w-5xl space-y-4">
        <p className="text-sm text-slate-600">
          <strong>Tepe manşet</strong> yalnızca <strong>Manşet</strong> işaretli haberleri gösterir.
          <strong> Site manşet</strong> işaretlenirse alt (orta) slider’da bu haberler çıkar; hiç işaret
          yoksa en son eklenen güncel haberler dolar. <strong>Son dakika</strong> bandı ayrı bayraktır.
        </p>

        <div className="rounded-md border bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead>Başlık</TableHead>
                <TableHead className="w-[110px] text-center">Tepe manşet</TableHead>
                <TableHead className="w-[110px] text-center">Site manşet</TableHead>
                <TableHead className="w-[110px] text-center">Son dakika</TableHead>
                <TableHead className="w-[100px]">Tarih</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-slate-500">
                    Yükleniyor…
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-slate-500">
                    Yayında haber yok. Önce <strong>Haberler</strong> bölümünden içerik yayınlayın.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell>
                      <div className="font-medium text-slate-900 line-clamp-2">{n.title}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant="outline" className="text-[10px]">
                          {n.categoryName}
                        </Badge>
                        {n.isFeatured ? (
                          <Badge className="text-[10px] bg-amber-600">Tepe</Badge>
                        ) : null}
                        {n.isSiteManset ? (
                          <Badge className="text-[10px] bg-sky-700">Site</Badge>
                        ) : null}
                        {n.isBreaking ? (
                          <Badge className="text-[10px] bg-orange-600">Son dakika</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={!!n.isFeatured}
                        disabled={busyId === n.id}
                        onCheckedChange={(c) => void toggle(n, "isFeatured", !!c)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={!!n.isSiteManset}
                        disabled={busyId === n.id}
                        onCheckedChange={(c) => void toggle(n, "isSiteManset", !!c)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={!!n.isBreaking}
                        disabled={busyId === n.id}
                        onCheckedChange={(c) => void toggle(n, "isBreaking", !!c)}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                      {format(new Date(n.createdAt), "dd.MM.yy")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </EditorLayout>
  );
}
