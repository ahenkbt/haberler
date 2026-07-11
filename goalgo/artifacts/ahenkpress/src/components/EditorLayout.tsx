import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { LogOut, Menu, RefreshCw, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useHmEditorOptional } from "@/contexts/HmEditorContext";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { editorNavItems, editorNavIsActive } from "@/lib/editorNavSections";
import { normalizeHmVitrinTheme, resolveHmCorporateAuthorsEnabled } from "@/lib/newsSiteLayout";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { normalizePortalDisplayName } from "@/lib/portalBrand";
import { clearHmSitePublicCaches } from "@/lib/hmSitePublicCacheClear";
import { useToast } from "@/hooks/use-toast";

function panelBrandTitle(siteName: string | undefined): string {
  return normalizePortalDisplayName(siteName);
}

function EditorSidebar({ onClose }: { onClose?: () => void }) {
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [cacheClearBusy, setCacheClearBusy] = useState(false);
  const { logout: adminLogout } = useAuth();
  const hm = useHmEditorOptional();
  const { logout: hmLogout, site } = hm ?? { logout: () => {}, site: null };
  const isCorporateEditor =
    normalizeHmVitrinTheme(hm?.newsLayoutPrefs?.hmVitrinTheme) === "corporate";
  const corporateAuthorsEnabled = resolveHmCorporateAuthorsEnabled(hm?.newsLayoutPrefs);
  const visibleNavItems = editorNavItems.filter((item) => {
    if (item.href === "/editor/kose-yazarlari" && isCorporateEditor && !corporateAuthorsEnabled) {
      return false;
    }
    return true;
  });
  const { data: siteSettings } = useGetSiteSettings();
  const brand =
    (site?.displayName ?? "").trim() ||
    panelBrandTitle(siteSettings?.siteName);

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 flex items-center justify-between px-4 border-b border-slate-100">
        <div>
          <div className="font-bold text-slate-900 text-sm truncate max-w-[10rem]" title={brand}>
            {brand}
          </div>
          <div className="text-[10px] text-slate-500">Editör paneli</div>
        </div>
        {onClose ? (
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2">
        <ul className="space-y-0.5">
          {visibleNavItems.map((item) => {
            const active = editorNavIsActive(location, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-colors ${
                    active
                      ? "bg-slate-900 text-white font-semibold"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <item.icon className={`w-4 h-4 shrink-0 ${active ? "text-slate-200" : "text-slate-400"}`} />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-slate-100 p-3">
        {site ? (
          <button
            type="button"
            disabled={cacheClearBusy}
            onClick={async () => {
              if (!site) return;
              setCacheClearBusy(true);
              try {
                await clearHmSitePublicCaches(queryClient, {
                  siteId: site.id,
                  slug: site.slug,
                  domain: site.domain,
                });
                toast({
                  title: "Önbellek temizlendi",
                  description:
                    "Site meta, hibrit haber ve domain önbelleği silindi. Ziyaretçiler için tam güncelleme CDN deploy sonrası görünür.",
                });
                onClose?.();
              } catch {
                toast({
                  title: "Önbellek temizlenemedi",
                  description: "Tarayıcı depolamasına erişilemedi. Sayfayı yenileyip tekrar deneyin.",
                  variant: "destructive",
                });
              } finally {
                setCacheClearBusy(false);
              }
            }}
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-900 hover:bg-sky-100 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${cacheClearBusy ? "animate-spin" : ""}`} />
            {cacheClearBusy ? "Temizleniyor…" : "Önbellek temizle / boşalt"}
          </button>
        ) : null}
        <Link
          href="/admin"
          className="mb-2 block rounded-lg border border-slate-200 px-3 py-2 text-center text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          İçerik yönetimi (admin)
        </Link>
        <button
          type="button"
          onClick={() => {
            hmLogout();
            adminLogout();
          }}
          className="w-full flex items-center gap-2 text-sm text-slate-500 hover:text-red-600 py-2 px-2 rounded-lg hover:bg-red-50"
        >
          <LogOut className="w-4 h-4" />
          Çıkış
        </button>
      </div>
    </div>
  );
}

export function EditorLayout({ children, title }: { children: React.ReactNode; title: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const hm = useHmEditorOptional();
  const site = hm?.site ?? null;
  const publicHmHref = site?.slug ? `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(site.slug)}` : "/";

  useEffect(() => {
    const prev = document.title;
    document.title = `${title} · Editör`;
    document.body.classList.add("hm-editor-mode");
    return () => {
      document.title = prev;
      document.body.classList.remove("hm-editor-mode");
    };
  }, [title]);

  return (
    <div className="hm-editor-panel min-h-screen bg-slate-50 text-slate-900 flex">
      <aside className="hidden md:flex w-60 shrink-0 bg-white border-r border-slate-200 flex-col h-screen sticky top-0">
        <EditorSidebar />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] bg-white h-full shadow-xl flex flex-col">
            <EditorSidebar onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-500"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm text-slate-500">
              <span className="text-slate-400">Editör /</span> <span className="font-medium text-slate-900">{title}</span>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={publicHmHref} target="_blank" rel="noopener noreferrer">
              Siteyi gör →
            </Link>
          </Button>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          <p className="mb-4 text-xs text-slate-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 max-w-3xl">
            Oturum: Haber Merkezi editör JWT. Vitrin, logo ve renk tercihleri sunucuda siteye özel kaydedilir; havuz
            kuyruğu yönetim panelinden yönetilir.
          </p>
          {children}
        </main>
      </div>
    </div>
  );
}
