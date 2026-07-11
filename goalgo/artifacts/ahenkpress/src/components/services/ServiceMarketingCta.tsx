import { Link } from "wouter";
import { ExternalLink } from "lucide-react";
import {
  SADE_BTN_GHOST_ON_TEAL_CLASS,
  SADE_BTN_ON_TEAL_CLASS,
  SADE_BTN_PRIMARY_CLASS,
  SADE_BTN_SECONDARY_CLASS,
} from "@/lib/yekpareSadeTheme";

export type ServiceCtaItem = {
  label: string;
  href: string;
  external?: boolean;
};

type Variant = "primary" | "secondary" | "onTeal" | "ghostOnTeal";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: SADE_BTN_PRIMARY_CLASS,
  secondary: SADE_BTN_SECONDARY_CLASS,
  onTeal: SADE_BTN_ON_TEAL_CLASS,
  ghostOnTeal: SADE_BTN_GHOST_ON_TEAL_CLASS,
};

type Props = {
  href: string;
  label: string;
  variant?: Variant;
  external?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export function ServiceMarketingCta({
  href,
  label,
  variant = "primary",
  external,
  className = "",
  children,
}: Props) {
  const cls = `${VARIANT_CLASS[variant]} ${className}`.trim();
  const content = (
    <>
      {children ?? label}
      {external ? <ExternalLink className="h-4 w-4 shrink-0 opacity-80" aria-hidden /> : null}
    </>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={cls}>
      {content}
    </Link>
  );
}

export function ServiceMarketingCtaGroup({
  items,
  variant = "primary",
  className = "",
}: {
  items: ServiceCtaItem[];
  variant?: Variant;
  className?: string;
}) {
  if (!items.length) return null;
  return (
    <div className={`flex flex-wrap gap-3 ${className}`.trim()}>
      {items.map((item) => (
        <ServiceMarketingCta
          key={`${item.href}-${item.label}`}
          href={item.href}
          label={item.label}
          variant={variant}
          external={item.external}
        />
      ))}
    </div>
  );
}
