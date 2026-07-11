import { getGetDashboardSummaryQueryKey, useGetDashboardSummary } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Newspaper, LayoutGrid, Rss, RssIcon, MonitorPlay, FileText, Store, ShoppingCart, UtensilsCrossed, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import type { LucideIcon } from "lucide-react";
import { Link, useLocation } from "wouter";
import { adminNavSectionsFiltered, adminNavItemIsActive } from "@/lib/adminNavSections";
import { adminPanelCookieApiPath } from "@/lib/apiBase";
import { AdminGlobalSearch } from "@/components/AdminGlobalSearch";

interface DeliveryStats {
  totalVendors: number;
  deliveryVendors: number;
  ecomVendors: number;
  totalOrders: number;
  totalMenuItems: number;
}

export default function Dashboard() {
  const [location] = useLocation();
  const [access, setAccess] = useState<{ ready: boolean; full: boolean; perms: string[] | null }>({
    ready: false,
    full: false,
    perms: null,
  });
  const canSummary =
    access.ready && (access.full || access.perms?.includes("dashboard") || access.perms?.includes("haberler") || false);
  const { data: summary, isLoading } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey(), enabled: canSummary },
  });
  const [delivStats, setDelivStats] = useState<DeliveryStats | null>(null);
  const [delivLoading, setDelivLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const st = await fetch(adminPanelCookieApiPath("/api/members/admin-panel-status"), { credentials: "include" });
        const j = (await st.json().catch(() => ({}))) as { panelFullAdmin?: boolean; permissions?: string[] | null };
        setAccess({
          ready: true,
          full: j.panelFullAdmin === true,
          perms: Array.isArray(j.permissions) ? j.permissions : null,
        });
      } catch {
        setAccess({ ready: true, full: true, perms: null });
      }
    })();
  }, []);

  const showNewsBlock =
    access.full || (access.perms?.includes("dashboard") ?? false) || (access.perms?.includes("haberler") ?? false);
  const showDelivBlock = access.full || (access.perms?.includes("teslimat") ?? false);

  useEffect(() => {
    if (!showDelivBlock) {
      setDelivLoading(false);
      return;
    }
    fetch("/api/delivery/stats")
      .then((r) => r.json())
      .then((data) => {
        setDelivStats(data);
        setDelivLoading(false);
      })
      .catch(() => setDelivLoading(false));
  }, [showDelivBlock]);

  const quickNav = adminNavSectionsFiltered({ panelFullAdmin: access.full, permissions: access.perms });

  return (
    <AdminLayout title="Kontrol Paneli">
      <div className="space-y-8">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-800 mb-1">Hızlı arama</h2>
          <p className="text-xs text-gray-500 mb-3">
            Gemini API, Yekpare AI, haberler, turizm, mağaza, sipariş, kullanıcılar, SEO ve diğer yönetim sayfalarına doğrudan gidin.
          </p>
          <AdminGlobalSearch autoFocus placeholder="Örn. Gemini API, haberler, turizm, sipariş, ayarlar…" />
        </div>

        {showNewsBlock ? (
          <div>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Haber ve içerik özeti</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
              <StatCard title="Toplam Haber" value={summary?.totalNews} icon={Newspaper} isLoading={isLoading} color="blue" />
              <StatCard title="Yayında" value={summary?.publishedNews} icon={FileText} isLoading={isLoading} color="green" />
              <StatCard title="Taslak" value={summary?.draftNews} icon={FileText} isLoading={isLoading} color="gray" />
              <StatCard title="Kategori" value={summary?.totalCategories} icon={LayoutGrid} isLoading={isLoading} color="purple" />
              <StatCard title="Aktif RSS" value={summary?.activeCampaigns} icon={Rss} isLoading={isLoading} color="orange" />
              <StatCard title="RSS Haberler" value={summary?.totalAddedByRss} icon={RssIcon} isLoading={isLoading} color="orange" />
              <StatCard title="Video Kaynak" value={summary?.totalVideoSources} icon={MonitorPlay} isLoading={isLoading} color="red" />
            </div>
          </div>
        ) : null}

        {showDelivBlock ? (
          <div>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Sipariş ve alışveriş özeti</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard title="Toplam Firma" value={delivStats?.totalVendors} icon={Store} isLoading={delivLoading} color="indigo" />
              <StatCard title="Teslimat Firması" value={delivStats?.deliveryVendors} icon={UtensilsCrossed} isLoading={delivLoading} color="red" />
              <StatCard title="E-Ticaret Mağazası" value={delivStats?.ecomVendors} icon={ShoppingCart} isLoading={delivLoading} color="blue" />
              <StatCard title="Toplam Sipariş" value={delivStats?.totalOrders} icon={Package} isLoading={delivLoading} color="green" />
              <StatCard title="Ürün / Menü" value={delivStats?.totalMenuItems} icon={LayoutGrid} isLoading={delivLoading} color="purple" />
            </div>
          </div>
        ) : null}

        <div>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Hızlı bağlantılar</h2>
          <p className="text-xs text-gray-500 mb-4 max-w-3xl">
            Sol menüde bölümler açılır listedir. Sık kullandığınız sayfalara buradan da geçebilirsiniz.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {quickNav.map((section) => (
              <Card key={section.id} className="border-gray-200 shadow-sm overflow-hidden">
                <CardHeader className="py-3 px-4 bg-gray-50/80 border-b border-gray-100">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-600">{section.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {section.items.map((item) => {
                      const active = adminNavItemIsActive(location, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                            active ? "bg-[#e61e25] text-white font-medium" : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          <item.icon className={`w-4 h-4 shrink-0 ${active ? "text-white" : "text-gray-400"}`} />
                          <span className="leading-snug min-w-0">{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  isLoading,
  color = "gray",
}: {
  title: string;
  value?: number;
  icon: LucideIcon;
  isLoading: boolean;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-600 bg-blue-50",
    green: "text-green-600 bg-green-50",
    red: "text-red-600 bg-red-50",
    purple: "text-purple-600 bg-purple-50",
    orange: "text-orange-600 bg-orange-50",
    indigo: "text-indigo-600 bg-indigo-50",
    gray: "text-gray-500 bg-gray-50",
  };
  const cls = colorMap[color] ?? colorMap.gray;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`p-1.5 rounded-lg ${cls}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold">{(value ?? 0).toLocaleString("tr-TR")}</div>
        )}
      </CardContent>
    </Card>
  );
}
