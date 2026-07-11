import type { ReactNode } from "react";
import { PortalSeoSync } from "@/components/PortalSeoSync";
import { MemberBroadcastStrip } from "@/components/MemberBroadcastStrip";

/**
 * @deprecated Turizm artık `TurizmRoute` → `SadeAwarePublicLayout` (Yeni Sade/SixAmMart chrome) kullanır.
 * Eski mor AppNav + koyu SiteFooter yasak. Geriye dönük importlar için tutulur.
 */
export function TurizmStandaloneLayout({ children }: { children: ReactNode }) {
  return (
    <div className="turizm-standalone-root flex min-h-[100dvh] flex-col" data-chrome="turizm-theme">
      <PortalSeoSync />
      <main className="flex min-h-0 flex-1 flex-col">
        <MemberBroadcastStrip />
        {children}
      </main>
    </div>
  );
}
