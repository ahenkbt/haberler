import "./adminEmbedLight.css";
import { Route, Switch, Redirect } from "wouter";
import { ytMainRoute } from "@/lib/routes";
import { AdminAuthProvider, AdminGate } from "./AdminAuth";
import { AdminShell } from "./AdminShell";
import { AdminDashboard } from "./AdminDashboard";
import { AdminSourcesPage } from "./AdminSourcesPage";
import { AdminVideosPage } from "./AdminVideosPage";
import { AdminModulesPage } from "./AdminModulesPage";
import { AdminToolsPage } from "./AdminToolsPage";
import { AdminSettingsPage } from "./AdminSettingsPage";
import { AdminPresetsPage } from "./AdminPresetsPage";
import { AdminMusicPage } from "./AdminMusicPage";
import { AdminKidsPage } from "./AdminKidsPage";
import { AdminYektubePage } from "./AdminYektubePage";
import { AdminEditorsPage } from "./AdminEditorsPage";
import { AdminSyncScraperPage } from "./AdminSyncScraperPage";
import { AdminLivePage } from "./AdminLivePage";
import { AdminPagesPage } from "./AdminPagesPage";

const PAGES = [
  { suffix: "", component: AdminDashboard },
  { suffix: "/yektube", component: AdminYektubePage },
  { suffix: "/editorler", component: AdminEditorsPage },
  { suffix: "/canli-yayinlar", component: AdminLivePage },
  { suffix: "/kaynaklar", component: AdminSourcesPage },
  { suffix: "/videolar", component: AdminVideosPage },
  { suffix: "/hazir-kanallar", component: AdminPresetsPage },
  { suffix: "/muzik", component: AdminMusicPage },
  { suffix: "/cocuk", component: AdminKidsPage },
  { suffix: "/kaziyici", component: AdminSyncScraperPage },
  { suffix: "/moduller", component: AdminModulesPage },
  { suffix: "/araclar", component: AdminToolsPage },
  { suffix: "/ayarlar", component: AdminSettingsPage },
  { suffix: "/sayfalar", component: AdminPagesPage },
] as const;

export function AdminRoutes() {
  return (
    <AdminAuthProvider>
      <AdminGate>
        <AdminShell>
          <Switch>
            {PAGES.flatMap(({ suffix, component: Page }) => {
              const base = `/admin${suffix}`;
              const dedicated = ytMainRoute(base);
              return [
                <Route key={base} path={base} component={Page} />,
                dedicated !== base ? <Route key={dedicated} path={dedicated} component={Page} /> : null,
              ];
            })}
            <Route>
              <Redirect to={ytMainRoute("/admin")} />
            </Route>
          </Switch>
        </AdminShell>
      </AdminGate>
    </AdminAuthProvider>
  );
}
