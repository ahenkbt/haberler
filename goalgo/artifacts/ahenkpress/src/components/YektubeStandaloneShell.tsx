/** @deprecated Yektube v1 standalone shell — v2 geçişinde `YektubeStandaloneRoute`. */
import type { ReactNode } from "react";
import { useHmVideoTvLayout } from "@/contexts/HmVideoTvContext";

/** Yekpare global header/footer olmadan Yektube — mobil üst/alt çubuk CanliTv içinde. */
export function YektubeStandaloneShell({ children }: { children: ReactNode }) {
  const hmTv = useHmVideoTvLayout();

  return (
    <div className={`yektube-standalone-root flex min-h-[100dvh] flex-col ${hmTv ? "bg-[#f8fafc]" : "bg-white"}`}>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
