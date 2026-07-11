import { Redirect, useParams } from "wouter";
import { isYekparePortalHubOnly } from "@/lib/hmPortalHosts";

type Props = {
  children: React.ReactNode;
  /** Nested `/tr/:slug/…` routes pass slug from params; kök hub rotaları boş bırakılır. */
  routeSlug?: string | null;
};

export function YekparePortalHubOnlyRoute({ children, routeSlug }: Props) {
  const params = useParams<{ slug?: string }>();
  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";
  const slug = routeSlug !== undefined ? routeSlug : String(params.slug ?? "").trim() || null;
  if (!isYekparePortalHubOnly(host, slug)) {
    const redirectTo = slug ? `/tr/${encodeURIComponent(slug)}` : "/";
    return <Redirect to={redirectTo} replace />;
  }
  return <>{children}</>;
}

export function useYekparePortalHubOnly(routeSlug?: string | null): boolean {
  const params = useParams<{ slug?: string }>();
  const host =
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";
  const slug = routeSlug !== undefined ? routeSlug : String(params.slug ?? "").trim() || null;
  return isYekparePortalHubOnly(host, slug);
}
