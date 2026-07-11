import { Redirect, useLocation } from "wouter";
import { hmLegacyPublicPathToTr } from "@/lib/hmSitePublicPath";

/** `/hm/...` → `/tr/...` (wouter `<Redirect replace />`). */
export function HmLegacyPublicRedirect() {
  const [loc] = useLocation();
  return <Redirect to={hmLegacyPublicPathToTr(loc)} replace />;
}
