import { createContext, useCallback, useContext, type ReactNode } from "react";
import { hmPublicHref, type HmSiteDomainFields } from "@/lib/hmPublicLinks";
import type { NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";
import type { HmSeoVerification } from "@/lib/pageSeo";

export type HmPublicSiteContact = { phone?: string; email?: string; address?: string; notes?: string } | null;

export type HmPublicLinkContextValue = Omit<HmSiteDomainFields, "domain"> & {
  siteId: number;
  slug: string;
  domain: string | null;
  displayName: string;
  description?: string | null;
  seoVerification?: HmSeoVerification | null;
  layoutPrefs: NewsSiteLayoutPrefs;
  contact: HmPublicSiteContact;
};

const HmPublicLinkContext = createContext<HmPublicLinkContextValue | null>(null);

export function HmPublicLinkProvider({
  value,
  children,
}: {
  value: HmPublicLinkContextValue;
  children: ReactNode;
}) {
  return <HmPublicLinkContext.Provider value={value}>{children}</HmPublicLinkContext.Provider>;
}

export function useHmPublicLinkContextOptional(): HmPublicLinkContextValue | null {
  return useContext(HmPublicLinkContext);
}

/** Bağlam yoksa yolu olduğu gibi döndürür (ör. vitrin dışı sayfalar). */
export function useHmPublicHref(): (path: string) => string {
  const ctx = useContext(HmPublicLinkContext);
  return useCallback(
    (path: string) => {
      if (!ctx) return path;
      return hmPublicHref(path, {
        domain: ctx.domain,
        domain2: ctx.domain2,
        domain3: ctx.domain3,
        slug: ctx.slug,
        siteId: ctx.siteId,
      });
    },
    [ctx],
  );
}
