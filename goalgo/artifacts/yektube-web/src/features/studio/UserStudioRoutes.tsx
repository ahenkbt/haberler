import { Route, Switch, Redirect } from "wouter";
import { ytMainRoute, ytRoutes } from "@/lib/routes";
import { UserStudioShell } from "./UserStudioShell";
import { UserStudioDashboard } from "./UserStudioDashboard";
import { StudioAddContentPage } from "./StudioAddContentPage";

const PAGES = [
  { suffix: "", component: UserStudioDashboard },
  { suffix: "/ekle", component: StudioAddContentPage },
] as const;

export function UserStudioRoutes() {
  return (
    <UserStudioShell>
      <Switch>
        {PAGES.flatMap(({ suffix, component: Page }) => {
          const base = `/studio${suffix}`;
          const dedicated = ytMainRoute(base);
          return [
            <Route key={base} path={base} component={Page} />,
            dedicated !== base ? <Route key={dedicated} path={dedicated} component={Page} /> : null,
          ];
        })}
        <Route>
          <Redirect to={ytRoutes.userStudio()} />
        </Route>
      </Switch>
    </UserStudioShell>
  );
}
