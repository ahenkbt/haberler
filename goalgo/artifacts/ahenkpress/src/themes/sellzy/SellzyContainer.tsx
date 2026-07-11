import { YEKPARE_PAGE_CONTAINER_CLASS } from "@/lib/yekpareLayout";
import { cn } from "@/lib/utils";

/** Ported from Sellzy apps/web/src/components/common/Container.tsx */
export function SellzyContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn(YEKPARE_PAGE_CONTAINER_CLASS, className)}>{children}</div>;
}
