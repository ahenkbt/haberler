import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronDown, Globe, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useGetSiteSettings } from "@workspace/api-client-react";
import { adminPanelCookieApiPath, apiFetch, apiUrl } from "@/lib/apiBase";
import {
  type AdminNavSection,
  adminNavItemIsActive,
  adminNavSectionIdsOpenForLocation,
  adminNavSectionsFiltered,
  canAccessAdminPath,
} from "@/lib/adminNavSections";
import { normalizePortalDisplayName, PORTAL_BRAND_SHORT } from "@/lib/portalBrand";
import { AdminGlobalSearch } from "@/components/AdminGlobalSearch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

/** Sidebar: DB’de kısa süre Goalgo kalsa bile panel başlığı markayı göstersin. */
function panelBrandTitle(siteName: string | undefined): string {
  return normalizePortalDisplayName(siteName);
}

function SidebarContent({
  onClose,
  sections,
}: {
  onClose?: () => void;
  sections: AdminNavSection[];
}) {
  const [location] = useLocation();
  const { logout } = useAuth();
  const { data: siteSettings } = useGetSiteSettings();
  const adminBrand = panelBrandTitle(siteSettings?.siteName);
  const brandInitial = (adminBrand.charAt(0) || "Y").toUpperCase();

  const [openSections, setOpenSections] = useState<string[]>(() => adminNavSectionIdsOpenForLocation(location));

  useEffect(() => {
    const need = adminNavSectionIdsOpenForLocation(location);
    setOpenSections((prev) => Array.from(new Set([...prev, ...need])));
  }, [location]);

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 flex items-center justify-between px-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#e61e25] flex items-center justify-center rounded-lg font-black text-white text-base shrink-0">
            {brandInitial}
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm leading-tight truncate max-w-[9rem]" title={adminBrand}>
              {adminBrand}
            </div>
            <div className="text-[10px] text-gray-400">Yönetim paneli</div>
          </div>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="px-3 py-3 border-b border-gray-100">
        <div
          className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700"
          title="Tek site; çoklu site seçimi ileride eklenebilir."
        >
          <Globe className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="flex-1 font-medium truncate">{adminBrand}</span>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 opacity-50" aria-hidden />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-1 px-1">
        <Accordion type="multiple" value={openSections} onValueChange={setOpenSections} className="w-full">
          {sections.map((section) => (
            <AccordionItem key={section.id} value={section.id} className="border-gray-100 border-b">
              <AccordionTrigger className="py-2.5 px-2 text-[11px] font-bold text-gray-700 tracking-wide uppercase hover:no-underline [&[data-state=open]]:text-gray-900">
                {section.title}
              </AccordionTrigger>
              <AccordionContent className="pb-1 pt-0">
                <ul className="space-y-0.5 pb-2">
                  {section.items.map((item) => {
                    const isActive = adminNavItemIsActive(location, item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={`flex items-center gap-2.5 mx-1 px-2.5 py-1.5 rounded-lg text-[13px] leading-snug transition-colors ${
                            isActive
                              ? "bg-[#e61e25] text-white font-semibold"
                              : "text-gray-900 hover:bg-gray-100 hover:text-gray-950"
                          }`}
                        >
                          <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-gray-700"}`} />
                          <span className="min-w-0">{item.name}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </nav>

      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-3 mb-2 px-1">
          <div className="w-8 h-8 rounded-full bg-[#e61e25] flex items-center justify-center font-bold text-white text-sm shrink-0">
            {brandInitial}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 truncate">admin</div>
            <div className="text-xs text-gray-400">Yönetici</div>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 transition-colors py-2 px-3 rounded-lg hover:bg-red-50"
        >
          <LogOut className="w-4 h-4" />
          Çıkış Yap
        </button>
      </div>
    </div>
  );
}

type PanelAccessState = {
  loaded: boolean;
  panelBootstrap: boolean;
  panelFullAdmin: boolean;
  permissions: string[] | null;
};

export function AdminLayout({ children, title }: { children: React.ReactNode; title: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();
  const [access, setAccess] = useState<PanelAccessState>({
    loaded: false,
    panelBootstrap: false,
    panelFullAdmin: true,
    permissions: null,
  });

  const navSections = useMemo(
    () =>
      adminNavSectionsFiltered({
        panelFullAdmin: access.panelFullAdmin,
        permissions: access.permissions,
      }),
    [access.panelFullAdmin, access.permissions],
  );

  useEffect(() => {
    const prev = document.title;
    document.title = `${title} · Yekpare Yönetim`;
    return () => {
      document.title = prev;
    };
  }, [title]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    void (async () => {
      try {
        const st = await apiFetch(adminPanelCookieApiPath("/api/members/admin-panel-status"), {
          credentials: "include",
        });
        const j = (await st.json().catch(() => ({}))) as {
          panelBootstrap?: boolean;
          panelFullAdmin?: boolean;
          permissions?: string[] | null;
        };
        if (!cancelled) {
          setAccess({
            loaded: true,
            panelBootstrap: j.panelBootstrap === true,
            panelFullAdmin: j.panelFullAdmin === true,
            permissions: Array.isArray(j.permissions) ? j.permissions : null,
          });
        }
      } catch {
        if (!cancelled) setAccess((a) => ({ ...a, loaded: true }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const routeAllowed = canAccessAdminPath(location, {
    loaded: access.loaded,
    panelFullAdmin: access.panelFullAdmin,
    permissions: access.permissions,
  });

  return (
    <div className="admin-panel min-h-screen bg-gray-50 flex">
      <aside className="hidden md:flex w-64 shrink-0 bg-white border-r border-gray-200 flex-col h-screen sticky top-0">
        <SidebarContent sections={navSections} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] bg-white h-full shadow-xl flex flex-col">
            <SidebarContent sections={navSections} onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="min-h-14 bg-white border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 px-4 md:px-6 py-2 sticky top-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500 shrink-0"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm text-gray-500 min-w-0 hidden sm:block">
              <span className="text-gray-400">Yönetim /</span>{" "}
              <span className="font-medium text-gray-900">{title}</span>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-end gap-2 min-w-0 w-full sm:w-auto sm:max-w-xl order-3 sm:order-none">
            <AdminGlobalSearch className="w-full" />
          </div>
          <Button variant="outline" size="sm" asChild className="shrink-0 order-2 sm:order-none">
            <Link href="/" target="_blank">
              Siteyi Gör →
            </Link>
          </Button>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          {!access.loaded ? (
            <p className="text-sm text-gray-500">Oturum bilgisi yükleniyor…</p>
          ) : !access.panelBootstrap ? (
            <p className="text-sm text-red-600">Panel oturumu bulunamadı. Lütfen yeniden giriş yapın.</p>
          ) : !routeAllowed ? (
            <div className="max-w-lg rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
              <p className="font-semibold">Bu bölüme erişim yetkiniz yok.</p>
              <p className="text-sm mt-2 text-amber-900/90">
                Hesabınıza atanmış izinler dışındaki sayfalar gizlenir. Gerekli alanlar için tam yetkili yöneticiden izin
                isteyebilirsiniz.
              </p>
              <Button className="mt-4 bg-red-600 hover:bg-red-700 text-white" asChild>
                <Link href="/admin">Kontrol paneline dön</Link>
              </Button>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
