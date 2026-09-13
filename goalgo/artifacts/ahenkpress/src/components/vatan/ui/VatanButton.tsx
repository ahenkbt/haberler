import type { ReactNode } from "react";
import { VatanLink } from "@/components/vatan/ui/VatanLink";

type Variant = "primary" | "outline" | "outline-dark" | "text";

export function VatanArrow({ className }: { className?: string }) {
  return (
    <svg
      className={`vatan-arrow${className ? ` ${className}` : ""}`}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2 8h11M9 3.5 13.5 8 9 12.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function VatanButton({
  href,
  variant = "primary",
  children,
  arrow = false,
  className,
  ariaLabel,
}: {
  href: string;
  variant?: Variant;
  children: ReactNode;
  arrow?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const cls = `vatan-btn vatan-btn--${variant}${className ? ` ${className}` : ""}`;
  return (
    <VatanLink href={href} className={cls} aria-label={ariaLabel}>
      <span>{children}</span>
      {arrow ? <VatanArrow /> : null}
    </VatanLink>
  );
}
