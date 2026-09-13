import type { AnchorHTMLAttributes, ReactNode } from "react";
import { Link } from "wouter";
import { isHmPublicNavExternal } from "@/lib/hmPublicLinks";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  children: ReactNode;
};

/** Renders a wouter `Link` for in-app hrefs and a plain `<a>` for external/mailto/tel. */
export function VatanLink({ href, children, ...rest }: Props) {
  if (!href || href === "#") {
    return (
      <a href="#" {...rest} aria-disabled="true" onClick={(e) => e.preventDefault()}>
        {children}
      </a>
    );
  }
  if (isHmPublicNavExternal(href)) {
    const external = /^https?:/i.test(href);
    return (
      <a href={href} {...rest} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} {...rest}>
      {children}
    </Link>
  );
}
