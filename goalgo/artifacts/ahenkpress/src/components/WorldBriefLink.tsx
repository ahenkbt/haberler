import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Link } from "wouter";
import { isExternalNewsHref } from "@/lib/hybridNewsHref";

type WorldBriefLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<"a">, "href" | "children" | "className">;

/** World brief cards — external RSS sources open in a new tab; site paths use wouter. */
export function WorldBriefLink({ href, className, children, ...rest }: WorldBriefLinkProps) {
  if (isExternalNewsHref(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} {...rest}>
      {children}
    </Link>
  );
}
