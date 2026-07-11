import type { ReactNode } from "react";
import type { NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";
import { hmChromeContainedShellClass, isHmHeaderChromeContained } from "@/lib/hmChromeLayout";

/** Üst reklam şeritleri: vitrin içeriğiyle aynı genişlik (`hmHeaderChromeFullBleed` kapalıyken). */
export function HmChromeWidthShell({
  layoutPrefs,
  children,
}: {
  layoutPrefs: NewsSiteLayoutPrefs;
  children: ReactNode;
}) {
  if (!isHmHeaderChromeContained(layoutPrefs)) return <>{children}</>;
  return <div className={hmChromeContainedShellClass()}>{children}</div>;
}
