import { EditorLayout } from "@/components/EditorLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link, useLocation, useParams } from "wouter";
import { useHmEditor } from "@/contexts/HmEditorContext";
import { apiUrl } from "@/lib/apiBase";
import { readHmJwt } from "@/lib/hmSession";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { HM_EDITOR_MAKALE_QUERY_KEY } from "@/lib/hmEditorQueryKeys";
import { apiRequest } from "@/lib/queryClient";
import { useEffect, useState } from "react";
import type { News } from "@workspace/api-client-react";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function EditorHmMakale() {
  const [loc, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const path = (loc.split("?")[0] ?? "").trim();
  const isNew = path === "/editor/makaleler/yeni";
  const editId =
    !isNew && params.id && /^\d+$/.test(params.id) ? parseInt(params.id, 10) : 0;

  const { site } = useHmEditor();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [spot, setSpot] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [authorId, setAuthorId] = useState<string>("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [saving, setSaving] = useState(false);

  const { data: authors } = useQuery({
    queryKey: ["/api/authors", "hm-makale-editor", site?.id],
    queryFn: () =>
      apiRequest(`/api/authors?hmSiteId=${encodeURIComponent(String(site!.id))}`) as Promise<
        { id: number; name: string }[]
      >,
    enabled: !!site?.id,
  });

  const { data: existing, isLoading } = useQuery({
    queryKey: ["/api/hm/editor/makale/item", editId],
    queryFn: async () => {
      const t = readHmJwt();
      if (!t) throw new Error("jwt");
      const r = await fetch(apiUrl(`/api/hm/editor/makale/${editId}`), {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json() as Promise<News & { contentKind?: string }>;
    },
    enabled: !isNew && editId > 0,
  });

  useEffect(() => {
    if (!existing || isNew) return;
    setTitle(existing.title ?? "");
    setSlug(existing.slug ?? "");
    setSpot(existing.spot ?? "");
    setContent(existing.content ?? "");
    setImageUrl(existing.imageUrl ?? "");
    setAuthorId(existing.authorId != null ? String(existing.authorId) : "");
    setStatus(existing.status === "published" ? "published" : "draft");
  }, [existing, isNew]);

  const submit = async () => {
    const t = readHmJwt();
    if (!t) {
      toast({ title: "Oturum yok", variant: "destructive" });
      return;
    }
    if (!title.trim()) {
      toast({ title: "Başlık gerekli", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        spot: spot.trim() || null,
        content: content.trim() || null,
        imageUrl: imageUrl.trim() || null,
        authorId: authorId === "" ? null : parseInt(authorId, 10),
        status,
      };
      const url = isNew
        ? apiUrl("/api/hm/editor/makale")
        : apiUrl(`/api/hm/editor/makale/${editId}`);
      const r = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: {
          Authorization: `Bearer ${t}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const raw = await r.text().catch(() => "");
      if (!r.ok) {
        toast({
          title: "Kaydedilemedi",
          description: raw.slice(0, 200),
          variant: "destructive",
        });
        return;
      }
      let createdId: number | undefined;
      try {
        const j = JSON.parse(raw) as { id?: number };
        if (typeof j.id === "number") createdId = j.id;
      } catch {
        /* 204 empty */
      }
      toast({ title: isNew ? "Oluşturuldu" : "Güncellendi" });
      await qc.invalidateQueries({ queryKey: [...HM_EDITOR_MAKALE_QUERY_KEY] });
      if (isNew && createdId != null) {
        setLocation(`/editor/makaleler/${createdId}/duzenle`);
      }
    } catch (e) {
      toast({
        title: "Hata",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isNew && editId <= 0) {
    return (
      <EditorLayout title="Köşe makalesi">
        <p className="text-sm text-red-600">Geçersiz adres.</p>
      </EditorLayout>
    );
  }

  if (!isNew && isLoading) {
    return (
      <EditorLayout title="Köşe makalesi">
        <div className="flex items-center gap-2 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Yükleniyor…
        </div>
      </EditorLayout>
    );
  }

  return (
    <EditorLayout title={isNew ? "Yeni köşe makalesi" : "Köşe makalesi düzenle"}>
      <div className="max-w-3xl space-y-6">
        <Button variant="outline" size="sm" asChild className="gap-1">
          <Link href="/editor/makaleler">
            <ArrowLeft className="h-4 w-4" />
            Makale listesi
          </Link>
        </Button>

        <div className="rounded-lg border bg-white p-4 md:p-6 space-y-4 shadow-sm">
          <div>
            <Label htmlFor="hm-m-t">Başlık *</Label>
            <Input id="hm-m-t" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="hm-m-s">Slug</Label>
            <Input
              id="hm-m-s"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="mt-1 font-mono text-sm"
              placeholder="bos-birakilirsa-basliktan-uretilir"
            />
          </div>
          <div>
            <Label htmlFor="hm-m-sp">Özet</Label>
            <Textarea id="hm-m-sp" value={spot} onChange={(e) => setSpot(e.target.value)} className="mt-1 min-h-[72px]" />
          </div>
          <div>
            <Label htmlFor="hm-m-c">İçerik</Label>
            <Textarea
              id="hm-m-c"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="mt-1 min-h-[240px] font-mono text-sm"
            />
          </div>
          <div>
            <Label htmlFor="hm-m-img">Görsel URL</Label>
            <Input id="hm-m-img" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Yazar</Label>
            <Select value={authorId || "__none"} onValueChange={(v) => setAuthorId(v === "__none" ? "" : v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Yazar seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">—</SelectItem>
                {(authors ?? []).map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Durum</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "draft" | "published")}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Taslak</SelectItem>
                <SelectItem value="published">Yayında</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              className="bg-[#e61e25] hover:bg-[#c9181e] text-white"
              disabled={saving}
              onClick={() => void submit()}
            >
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/editor/makaleler">İptal</Link>
            </Button>
          </div>

          <p className="text-xs text-slate-500 pt-2 border-t">
            Panelden eklediğiniz <strong>blog kategorili haberler</strong> de köşe yazarı sayfasında listelenir; düzenlemek
            için burada <strong>hm_makaleler</strong> kaydı kullanın veya Haberler → blog ile düzenleyin.
          </p>
        </div>
      </div>
    </EditorLayout>
  );
}
