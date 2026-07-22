import { EditorLayout } from "@/components/EditorLayout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowDown, ArrowUp, ExternalLink, Upload, Images, Loader2, X, Edit2, Trash2, UserPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { YekpareMediaPickerDialog } from "@/components/YekpareMediaPickerDialog";
import { appendYekpareCustomMedia, uploadYekpareMediaFile } from "@/lib/yekpareMediaLibrary";
import { useHmEditor } from "@/contexts/HmEditorContext";
import { normalizeHmVitrinTheme, resolveHmCorporateAuthorsEnabled } from "@/lib/newsSiteLayout";
import { apiUrl, resolveClientMediaSrc } from "@/lib/apiBase";
import { readHmJwt } from "@/lib/hmSession";
import { useToast } from "@/hooks/use-toast";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";

type AuthorRow = {
  id: number;
  name: string;
  title?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  hmSortOrder?: number | null;
  articleCount?: number | null;
  sourceSiteName?: string | null;
  siteName?: string | null;
};

export default function EditorKoseYazarlari() {
  const { site, newsLayoutPrefs } = useHmEditor();
  const [, setLocation] = useLocation();
  const isCorporateSite = normalizeHmVitrinTheme(newsLayoutPrefs.hmVitrinTheme) === "corporate";
  const corporateAuthorsEnabled = resolveHmCorporateAuthorsEnabled(newsLayoutPrefs);
  const qc = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [selectedAuthorIds, setSelectedAuthorIds] = useState<number[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deletingAuthorId, setDeletingAuthorId] = useState<number | null>(null);
  const [poolQuery, setPoolQuery] = useState("");
  const [poolAddingId, setPoolAddingId] = useState<number | null>(null);
  const [ordering, setOrdering] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCorporateSite && !corporateAuthorsEnabled) {
      setLocation("/editor");
    }
  }, [isCorporateSite, corporateAuthorsEnabled, setLocation]);

  const { data: authors = [], isLoading } = useQuery({
    queryKey: ["/api/authors", "hm-editor", site?.id],
    queryFn: async () => {
      if (!site?.id) return [];
      const r = await fetch(apiUrl(`/api/authors?hmSiteId=${encodeURIComponent(String(site.id))}`));
      if (!r.ok) throw new Error("list");
      return (await r.json()) as AuthorRow[];
    },
    enabled: !!site?.id,
  });

  const { data: poolAuthors = [], isLoading: poolLoading, isError: poolError } = useQuery({
    queryKey: ["/api/hm/editor/pool/authors", site?.id, poolQuery],
    queryFn: async () => {
      const t = readHmJwt();
      if (!t) throw new Error("Oturum yok");
      const qs = new URLSearchParams({ limit: "80" });
      if (poolQuery.trim()) qs.set("q", poolQuery.trim());
      const r = await fetch(apiUrl(`/api/hm/editor/pool/authors?${qs}`), {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!r.ok) throw new Error(await r.text());
      const j = (await r.json()) as { items?: AuthorRow[] };
      return j.items ?? [];
    },
    enabled: !!site?.id && !!readHmJwt() && (!isCorporateSite || corporateAuthorsEnabled),
    retry: false,
    staleTime: 60_000,
  });

  const resetForm = () => {
    setName("");
    setTitle("");
    setEmail("");
    setPassword("");
    setAvatarUrl("");
    setBio("");
    setEditingId(null);
  };

  const startEdit = (a: AuthorRow) => {
    setEditingId(a.id);
    setName(a.name ?? "");
    setTitle(a.title ?? "");
    setEmail(a.email?.trim() ?? "");
    setPassword("");
    setAvatarUrl(a.avatarUrl?.trim() ?? "");
    setBio(a.bio?.trim() ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const visibleAuthorIds = authors.map((a) => a.id);
  const selectedVisibleCount = selectedAuthorIds.filter((id) => visibleAuthorIds.includes(id)).length;
  const allVisibleSelected = visibleAuthorIds.length > 0 && selectedVisibleCount === visibleAuthorIds.length;

  const toggleAuthor = (id: number, checked: boolean) => {
    setSelectedAuthorIds((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((item) => item !== id)));
  };

  const toggleAllVisible = (checked: boolean) => {
    setSelectedAuthorIds((prev) => {
      const rest = prev.filter((id) => !visibleAuthorIds.includes(id));
      return checked ? [...rest, ...visibleAuthorIds] : rest;
    });
  };

  const deleteAuthorsByIds = async (ids: number[]) => {
    if (ids.length === 0) return;
    const label =
      ids.length === 1
        ? "Bu köşe yazarı siteden silinsin mi? Yazılarındaki yazar bağlantısı kaldırılır."
        : `${ids.length} köşe yazarı siteden silinsin mi? Bu yazarların yazılarındaki yazar bağlantısı kaldırılır.`;
    if (!confirm(label)) return;
    const t = readHmJwt();
    if (!t) {
      toast({ title: "Silinemedi", description: "Oturum bulunamadı. Yeniden giriş yapın.", variant: "destructive" });
      return;
    }
    setBulkDeleting(true);
    if (ids.length === 1) setDeletingAuthorId(ids[0]!);
    try {
      const r = await fetch(apiUrl("/api/hm/editor/authors/bulk-delete"), {
        method: "POST",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const j = (await r.json().catch(() => ({}))) as {
        deleted?: number;
        detached?: number;
        error?: string;
      };
      if (!r.ok) {
        // Eski API hâlâ 404 «Bu siteye ait…» dönerse kullanıcıya anlaşılır mesaj.
        const msg = j.error || "Silme başarısız";
        if (/siteye ait seçili yazar bulunamadı/i.test(msg)) {
          throw new Error(
            "Bu yazar başka siteden sızmış; silme düzeltmesi henüz canlıya alınmamış olabilir. Deploy sonrası Sil çalışır. Şimdilik sayfayı yenileyin.",
          );
        }
        throw new Error(msg);
      }
      setSelectedAuthorIds((prev) => prev.filter((id) => !ids.includes(id)));
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["/api/authors"] }),
        qc.invalidateQueries({ queryKey: ["/api/hm/editor/pool/authors"] }),
      ]);
      const deleted = j.deleted ?? 0;
      const detached = j.detached ?? 0;
      toast({
        title: "Yazar siteden kaldırıldı",
        description:
          detached > 0 && deleted === 0
            ? `${detached} yabancı yazar kaydı bu siteden ayrıldı.`
            : `${deleted + detached} kayıt işlendi.`,
      });
    } catch (err) {
      toast({
        title: "Silinemedi",
        description: String((err as Error).message),
        variant: "destructive",
      });
    } finally {
      setBulkDeleting(false);
      setDeletingAuthorId(null);
    }
  };

  const bulkDeleteAuthors = async () => {
    const ids = selectedAuthorIds.filter((id) => visibleAuthorIds.includes(id));
    await deleteAuthorsByIds(ids);
  };

  const saveAuthorOrder = async (ids: number[]) => {
    const t = readHmJwt();
    if (!t) return;
    setOrdering(true);
    try {
      const r = await fetch(apiUrl("/api/hm/editor/authors/order"), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!r.ok) throw new Error(await r.text());
      await qc.invalidateQueries({ queryKey: ["/api/authors", "hm-editor", site?.id] });
      toast({ title: "Yazar sırası kaydedildi" });
    } catch (err) {
      toast({ title: "Sıra kaydedilemedi", description: String((err as Error).message), variant: "destructive" });
    } finally {
      setOrdering(false);
    }
  };

  const moveAuthor = (index: number, dir: -1 | 1) => {
    const nextIndex = index + dir;
    if (nextIndex < 0 || nextIndex >= authors.length) return;
    const next = [...authors];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    void saveAuthorOrder(next.map((row) => row.id));
  };

  const addPoolAuthor = async (id: number) => {
    const t = readHmJwt();
    if (!t) return;
    setPoolAddingId(id);
    try {
      const r = await fetch(apiUrl(`/api/hm/editor/pool/authors/${id}/publish`), {
        method: "POST",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
      });
      const j = (await r.json().catch(() => ({}))) as { copied?: number; error?: string };
      if (!r.ok) throw new Error(j.error || "Yazar eklenemedi");
      await qc.invalidateQueries({ queryKey: ["/api/authors", "hm-editor", site?.id] });
      await qc.invalidateQueries({ queryKey: ["/api/hm/editor/pool/authors"] });
      toast({ title: "Yazar havuzdan eklendi", description: `${j.copied ?? 0} makale kopyalandı.` });
    } catch (err) {
      toast({ title: "Eklenemedi", description: String((err as Error).message), variant: "destructive" });
    } finally {
      setPoolAddingId(null);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = readHmJwt();
    if (!t || !name.trim()) return;
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        title: title.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        bio: bio.trim() || undefined,
        email: email.trim() || undefined,
        password: password.trim() || undefined,
      };
      const url =
        editingId != null
          ? apiUrl(`/api/hm/editor/authors/${editingId}`)
          : apiUrl("/api/hm/editor/authors");
      const r = await fetch(url, {
        method: editingId != null ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Kayıt başarısız");
      }
      resetForm();
      await qc.invalidateQueries({ queryKey: ["/api/authors", "hm-editor", site?.id] });
      toast({ title: editingId != null ? "Yazar güncellendi" : "Yazar eklendi" });
    } catch (err) {
      toast({
        title: "Eklenemedi",
        description: String((err as Error).message),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <EditorLayout title="Köşe yazarları">
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-6">
        <p className="text-sm text-slate-600 max-w-2xl">
          Bu sitede yayınlanacak köşe yazarlarını buradan ekleyebilirsiniz. Haber yazarken yazar olarak seçebilirsiniz.
          İsteğe bağlı: aynı e-posta ve şifre ile (en az 8 karakter) yazar hesabı tanımlanır; ikisi de boş bırakılırsa sadece vitrin kaydı oluşur.
          Giriş adresi:{" "}
          {site?.slug ? (
            <Link
              href={`/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(site.slug)}/yazar/giris`}
              className="text-red-600 font-semibold hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              /{HM_SITE_PUBLIC_PREFIX}/{site.slug}/yazar/giris
            </Link>
          ) : (
            "—"
          )}
          {" "}— yazar kendi makalesini buradan ekler, şifresini değiştirir.
          Portal genelindeki tüm yazarlar için yönetim paneli:{" "}
          <Link href="/admin/kose-yazarlari" className="text-red-600 font-semibold hover:underline inline-flex items-center gap-1">
            Admin köşe yazarları
            <ExternalLink className="w-3 h-3" />
          </Link>
        </p>

        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2 max-w-2xl border border-slate-100 rounded-lg p-4 bg-slate-50/80">
          {editingId != null ? (
            <div className="sm:col-span-2 flex items-center justify-between gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-950">
              <span>
                <strong>Yazar düzenleniyor</strong> (#{editingId}) — kaydet veya iptal edin.
              </span>
              <Button type="button" variant="outline" size="sm" onClick={() => resetForm()}>
                İptal
              </Button>
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <Label htmlFor="hm-au-name">Yazar adı *</Label>
            <Input id="hm-au-name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="hm-au-title">Ünvan</Label>
            <Input id="hm-au-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="hm-au-email">E-posta (isteğe bağlı)</Label>
            <Input
              id="hm-au-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
              placeholder="yazar@ornek.com"
            />
          </div>
          <div>
            <Label htmlFor="hm-au-pw">Şifre {editingId != null ? "(yalnızca değiştirmek için)" : "(isteğe bağlı)"}</Label>
            <Input
              id="hm-au-pw"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1"
              placeholder={editingId != null ? "Boş bırakın veya yeni şifre (min. 8)" : "E-posta varsa min. 8 karakter"}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="hm-au-bio">Kısa biyografi</Label>
            <Textarea
              id="hm-au-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="mt-1 min-h-[88px]"
              placeholder="İsteğe bağlı — vitrinde yazar kartında görünür."
            />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="hm-au-av">Avatar</Label>
            <Input id="hm-au-av" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} className="mt-1" placeholder="https://..." />
            <div className="flex flex-wrap gap-2">
              <input ref={avatarFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file || !file.type.startsWith("image/")) return;
                void (async () => {
                  setAvatarUploading(true);
                  try {
                    const { url, title } = await uploadYekpareMediaFile(file);
                    appendYekpareCustomMedia({ url, title });
                    setAvatarUrl(url);
                    toast({ title: "Avatar yüklendi" });
                  } catch (err) {
                    toast({ title: "Yükleme başarısız", description: String((err as Error).message), variant: "destructive" });
                  } finally {
                    setAvatarUploading(false);
                  }
                })();
              }} />
              <Button type="button" variant="outline" size="sm" className="gap-1" disabled={avatarUploading} onClick={() => avatarFileRef.current?.click()}>
                {avatarUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Dosyadan yükle
              </Button>
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setMediaOpen(true)}>
                <Images className="h-3.5 w-3.5" />
                Medyadan seç
              </Button>
              {avatarUrl ? (
                <Button type="button" variant="ghost" size="sm" className="text-slate-500" onClick={() => setAvatarUrl("")}>
                  <X className="h-3.5 w-3.5" />
                  Temizle
                </Button>
              ) : null}
            </div>
            {avatarUrl ? (
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={resolveClientMediaSrc(avatarUrl) || avatarUrl}
                  alt=""
                  className="h-14 w-14 rounded-full border object-cover bg-slate-100"
                />
              </div>
            ) : null}
            <YekpareMediaPickerDialog
              open={mediaOpen}
              onOpenChange={setMediaOpen}
              title="Avatar — Yekpare medya"
              onSelect={(url) => setAvatarUrl(url)}
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving} className="bg-[#e61e25] hover:bg-[#c9181e] text-white">
              {saving ? "Kaydediliyor…" : "Yazar ekle"}
            </Button>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-100 bg-red-50/60 px-3 py-2">
          <p className="text-sm font-medium text-slate-700">
            {selectedVisibleCount > 0
              ? `${selectedVisibleCount} yazar seçildi — silmek için «Seçilenleri sil»e basın.`
              : "Silmek için satırdaki «Sil»e basın veya soldan işaretleyip toplu silin."}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1 border-red-200 text-red-700 hover:bg-red-50"
            disabled={selectedVisibleCount === 0 || bulkDeleting}
            onClick={() => void bulkDeleteAuthors()}
          >
            {bulkDeleting && deletingAuthorId == null ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Seçilenleri sil
          </Button>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-900">Yazar havuzu</h2>
              <p className="mt-1 text-xs text-slate-500">
                Diğer editör sitelerindeki köşe yazarını seçin; yazar ve yayınlanmış tüm makaleleri bu siteye kopyalanır.
              </p>
            </div>
            <Input
              value={poolQuery}
              onChange={(e) => setPoolQuery(e.target.value)}
              placeholder="Yazar ara"
              className="w-full sm:w-56"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {poolLoading ? (
              <p className="text-sm text-slate-500">Havuz yükleniyor...</p>
            ) : poolError ? (
              <p className="text-sm text-red-600">Yazar havuzu yüklenemedi. Oturumu yenileyip tekrar deneyin.</p>
            ) : poolAuthors.length === 0 ? (
              <p className="text-sm text-slate-500">Havuzda eklenebilir yazar bulunamadı.</p>
            ) : (
              poolAuthors.slice(0, 8).map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{a.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {a.siteName || a.sourceSiteName || "Editör sitesi"} · {a.articleCount ?? 0} makale
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1"
                    disabled={poolAddingId === a.id}
                    onClick={() => void addPoolAuthor(a.id)}
                  >
                    {poolAddingId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                    Ekle
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[44px]">
                  <input
                    type="checkbox"
                    aria-label="Tüm yazarları seç"
                    checked={allVisibleSelected}
                    onChange={(e) => toggleAllVisible(e.target.checked)}
                    disabled={isLoading || visibleAuthorIds.length === 0}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </TableHead>
                <TableHead className="w-[92px]">SIRA</TableHead>
                <TableHead>YAZAR</TableHead>
                <TableHead>E-POSTA</TableHead>
                <TableHead>ÜNVAN</TableHead>
                <TableHead className="text-right w-[180px]">İŞLEM</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Yükleniyor...
                  </TableCell>
                </TableRow>
              ) : !authors?.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Henüz yazar yok. Yukarıdan ekleyin veya haberlere yazar atayın.
                  </TableCell>
                </TableRow>
              ) : (
                authors.map((a, index) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        aria-label={`${a.name} seç`}
                        checked={selectedAuthorIds.includes(a.id)}
                        onChange={(e) => toggleAuthor(a.id, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index === 0 || ordering} onClick={() => moveAuthor(index, -1)}>
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index === authors.length - 1 || ordering} onClick={() => moveAuthor(index, 1)}>
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell className="text-sm text-slate-600">{a.email?.trim() ? a.email : "—"}</TableCell>
                    <TableCell>{a.title || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => startEdit(a)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          Düzenle
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1 border-red-200 text-red-700 hover:bg-red-50"
                          disabled={bulkDeleting}
                          onClick={() => void deleteAuthorsByIds([a.id])}
                        >
                          {deletingAuthorId === a.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          Sil
                        </Button>
                      </div>
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
