import { useEffect, useMemo, useRef, useState } from "react";
import { EditorLayout } from "@/components/EditorLayout";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { useHmEditor } from "@/contexts/HmEditorContext";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { useToast } from "@/hooks/use-toast";
import type { HmExtraPage } from "@/lib/newsSiteLayout";
import {
  clearHmEditorPagesDraft,
  readHmEditorPagesDraft,
  writeHmEditorPagesDraft,
} from "@/lib/hmEditorPageDraft";
import { hmPublicExtraPagePreviewHref } from "@/lib/hmExtraPageLookup";
import {
  isHmEditorProtectedStandardSlug,
  isHmEditorStubExtraPageId,
  mergeHmEditorTelifExtraPage,
  upsertHmEditorExtraPage,
} from "@/lib/hmEditorStandardExtraPages";
import { Trash2, Plus, ExternalLink, Loader2 } from "lucide-react";
import { EditorHmHtmlField } from "@/components/EditorHmHtmlField";

const LEGACY_CORPORATE_KEYS = ["kunye", "iletisim", "reklam", "abonelik"] as const;

function extraPagesMatchServer(pages: HmExtraPage[], server: HmExtraPage[] | null | undefined): boolean {
  return JSON.stringify(pages) === JSON.stringify(server ?? []);
}

export function EditorSayfalarContent({ className = "max-w-5xl" }: { className?: string }) {
  const { site, newsLayoutPrefs, saveNewsSiteLayout, refreshMe } = useHmEditor();
  const { toast } = useToast();
  const [extra, setExtra] = useState<HmExtraPage[]>(() => newsLayoutPrefs.hmExtraPages ?? []);
  const [saving, setSaving] = useState(false);
  const [extraSaveState, setExtraSaveState] = useState<"idle" | "pending" | "saved" | "error">("idle");
  const extraHydratedRef = useRef(false);
  const draftRestoreOfferedRef = useRef(false);
  const forceExtraSyncRef = useRef(false);
  const legacyCorpClearAttemptedRef = useRef(false);

  const hmBase = site?.slug ? `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(site.slug)}` : "";

  const displayPages = useMemo(() => mergeHmEditorTelifExtraPage(extra), [extra]);

  const extraDirty = useMemo(
    () => !extraPagesMatchServer(extra, newsLayoutPrefs.hmExtraPages),
    [extra, newsLayoutPrefs.hmExtraPages],
  );

  const updatePage = (pageId: string, patch: Partial<HmExtraPage>) => {
    setExtra((prev) => upsertHmEditorExtraPage(prev, pageId, patch));
  };

  useEffect(() => {
    const serverPages = newsLayoutPrefs.hmExtraPages ?? [];
    const blockSync =
      extraDirty &&
      !forceExtraSyncRef.current &&
      extraHydratedRef.current &&
      !(extra.length === 0 && serverPages.length > 0);
    if (blockSync) return;
    forceExtraSyncRef.current = false;
    setExtra(serverPages);
    extraHydratedRef.current = true;
  }, [newsLayoutPrefs.hmExtraPages, extraDirty, extra.length]);

  useEffect(() => {
    if (legacyCorpClearAttemptedRef.current || !site?.id) return;
    const corp = newsLayoutPrefs.hmCorporatePageHtml;
    const hasLegacyCorp = corp && LEGACY_CORPORATE_KEYS.some((k) => (corp[k] ?? "").trim());
    if (!hasLegacyCorp) return;
    legacyCorpClearAttemptedRef.current = true;
    clearHmEditorPagesDraft(site.id);
    void saveNewsSiteLayout(newsLayoutPrefs, {
      layoutPatch: { hmCorporatePageHtml: { kunye: "", iletisim: "", reklam: "", abonelik: "" } },
      allowClearCorporatePageHtml: true,
    });
  }, [site?.id, newsLayoutPrefs.hmCorporatePageHtml, newsLayoutPrefs, saveNewsSiteLayout]);

  const saveExtra = async (pages: HmExtraPage[], opts?: { silent?: boolean }) => {
    setSaving(true);
    setExtraSaveState("pending");
    const r = await saveNewsSiteLayout(newsLayoutPrefs, {
      layoutPatch: { hmExtraPages: pages },
      allowClearExtraPages: pages.length === 0,
    });
    setSaving(false);
    if (!r.ok) {
      setExtraSaveState("error");
      toast({
        title: "Kaydedilemedi",
        description: r.error.slice(0, 200),
        variant: "destructive",
      });
      forceExtraSyncRef.current = true;
      setExtra(newsLayoutPrefs.hmExtraPages ?? []);
    } else {
      setExtra(pages);
      setExtraSaveState("saved");
      if (!opts?.silent) toast({ title: "Kaydedildi" });
    }
  };

  useEffect(() => {
    if (!site?.id || draftRestoreOfferedRef.current) return;
    const draftExtra = readHmEditorPagesDraft(site.id);
    if (!draftExtra?.length) return;
    const serverExtra = newsLayoutPrefs.hmExtraPages ?? [];
    if (serverExtra.length > 0) return;
    draftRestoreOfferedRef.current = true;
    if (
      confirm(
        "Sunucudaki özel sayfa listesi boş; bu tarayıcıda daha önce yazdığınız bir taslak var. Geri yüklemek ister misiniz?",
      )
    ) {
      setExtra(draftExtra);
      void saveExtra(draftExtra, { silent: true });
    }
  }, [site?.id, newsLayoutPrefs.hmExtraPages]);

  useEffect(() => {
    if (!site?.id) return;
    writeHmEditorPagesDraft(site.id, extra);
  }, [site?.id, extra]);

  useEffect(() => {
    if (!site?.id || extraDirty) return;
    clearHmEditorPagesDraft(site.id);
  }, [site?.id, extraDirty]);

  useEffect(() => {
    if (!extraHydratedRef.current || !extraDirty || saving || extra.length === 0) return;
    setExtraSaveState("pending");
    const timer = window.setTimeout(() => {
      void saveExtra(extra, { silent: true });
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [extra, extraDirty, saving]);

  const addPage = () => {
    const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `p-${Date.now()}`;
    const pages = [
      ...extra,
      {
        id,
        title: "Yeni sayfa",
        slug: `sayfa-${extra.length + 1}`,
        bodyHtml: "<p>İçerik</p>",
        enabled: true,
        fullWidth: true,
      },
    ];
    void saveExtra(pages);
  };

  const removePage = (id: string, slug: string) => {
    if (isHmEditorProtectedStandardSlug(slug) || isHmEditorStubExtraPageId(id)) {
      toast({
        title: "Kaldırılamaz",
        description: "Telif & Kullanım standart sayfası editörde her zaman listelenir.",
      });
      return;
    }
    if (!confirm("Bu sayfayı silmek istiyor musunuz?")) return;
    void saveExtra(extra.filter((x) => x.id !== id));
  };

  const slugPreview = (slug: string) => hmPublicExtraPagePreviewHref(hmBase, slug);

  const handleRefreshFromServer = () => {
    forceExtraSyncRef.current = true;
    void refreshMe();
  };

  return (
    <div className={`space-y-8 ${className}`}>
      <section className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        Tüm sayfa içerikleri buradan yönetilir. Adres yapısı:{" "}
        {hmBase ? (
          <code className="rounded bg-white px-1 text-xs">{hmBase}/kunye</code>
        ) : (
          "/tr/site-slug/kunye"
        )}{" "}
        ( <code className="rounded bg-white px-1 text-xs">/sayfa/</code> yok ). Künye için slug{" "}
        <strong>kunye</strong>, iletişim için <strong>iletisim</strong>, telif için{" "}
        <strong>telif-kullanim</strong> kullanın. Genişlik: 1280px.
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Sayfalar</h2>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={saving} onClick={handleRefreshFromServer}>
              Sunucudan yenile
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-1 bg-red-600 text-white hover:bg-red-700"
              disabled={saving}
              onClick={addPage}
            >
              <Plus className="h-4 w-4" />
              Sayfa ekle
            </Button>
          </div>
        </div>
        {extraSaveState === "pending" || extraDirty ? (
          <p className="mb-4 text-xs font-semibold text-amber-700">
            {extraSaveState === "pending" || saving ? "Sayfalar kaydediliyor…" : "Kaydedilmemiş değişiklik var."}
          </p>
        ) : extraSaveState === "saved" ? (
          <p className="mb-4 text-xs font-semibold text-emerald-700">Sayfalar sunucuya kaydedildi.</p>
        ) : null}

        <div className="space-y-8">
          {displayPages.length === 0 ? (
            <p className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">
              Henüz sayfa yok. Künye için slug <strong>kunye</strong>, iletişim için <strong>iletisim</strong>, abonelik
              için <strong>abonelik</strong>, telif için <strong>telif-kullanim</strong> kullanın.
            </p>
          ) : (
            displayPages.map((pg) => {
              const isStub = isHmEditorStubExtraPageId(pg.id);
              const slugLocked = isHmEditorProtectedStandardSlug(pg.slug);
              return (
              <div key={pg.id} className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={pg.enabled}
                        disabled={saving}
                        onCheckedChange={(c) => {
                          const pages = upsertHmEditorExtraPage(extra, pg.id, { enabled: !!c });
                          void saveExtra(pages);
                        }}
                      />
                      <span className="text-xs text-slate-500">Yayında</span>
                    </div>
                    {!slugLocked ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-red-600"
                        disabled={saving}
                        onClick={() => removePage(pg.id, pg.slug)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                  {isStub ? (
                    <p className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-900">
                      Siteye özel içerik henüz kaydedilmedi. &quot;Yayında&quot; anahtarını açıp kaydettiğinizde telif sayfası menüde görünür.
                    </p>
                  ) : null}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Başlık</Label>
                      <Input
                        className="mt-1"
                        value={pg.title}
                        disabled={saving}
                        onChange={(e) => updatePage(pg.id, { title: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Slug</Label>
                      <Input
                        className="mt-1 font-mono text-sm"
                        value={pg.slug}
                        disabled={saving || slugLocked}
                        onChange={(e) => updatePage(pg.id, { slug: e.target.value })}
                      />
                      {slugPreview(pg.slug) ? (
                        <p className="mt-1 truncate text-[11px] text-slate-500">{slugPreview(pg.slug)}</p>
                      ) : null}
                    </div>
                  </div>
                  <EditorHmHtmlField
                    idPrefix={`extra-${pg.id}`}
                    label="Sayfa içeriği"
                    value={pg.bodyHtml}
                    onChange={(v) => updatePage(pg.id, { bodyHtml: v })}
                    disabled={saving}
                    minHeightClass="min-h-[260px]"
                    importSource={pg.importSource}
                    corporatePreview={newsLayoutPrefs.hmVitrinTheme === "corporate"}
                    previewSite={
                      site
                        ? { id: site.id, slug: site.slug, domain: site.domain ?? null }
                        : undefined
                    }
                  />
                </div>

                <div className="h-fit space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
                  <h3 className="border-b pb-2 text-sm font-bold text-slate-900">Yayın</h3>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-xs font-semibold text-slate-700">Tam genişlik (1280px)</Label>
                      <Switch
                        checked={pg.fullWidth !== false}
                        disabled={saving}
                        onCheckedChange={(c) => {
                          const pages = upsertHmEditorExtraPage(extra, pg.id, { fullWidth: c ? true : false });
                          void saveExtra(pages);
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={saving || !(pg.slug ?? "").trim()} asChild>
                      <Link href={slugPreview(pg.slug) || "#"} target="_blank" rel="noreferrer">
                        Önizle <ExternalLink className="ml-1 inline h-3 w-3" />
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-slate-900 text-white"
                      disabled={saving}
                      onClick={() => void saveExtra(extra)}
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Kaydet
                    </Button>
                  </div>
                </div>
              </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

export default function EditorSayfalar() {
  return (
    <EditorLayout title="Sayfalar">
      <EditorSayfalarContent />
    </EditorLayout>
  );
}
