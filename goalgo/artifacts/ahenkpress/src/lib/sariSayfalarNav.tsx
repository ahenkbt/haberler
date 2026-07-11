import { useCallback, type AnchorHTMLAttributes, type ReactNode } from "react";
import { useLocation } from "wouter";

/** wouter Link bazen aynı layout içinde remount tetiklemez; explicit navigate güvenilir. */
export function useSariSayfalarNavigate() {
  const [, navigate] = useLocation();
  return useCallback(
    (href: string, opts?: { replace?: boolean }) => {
      navigate(href, opts);
    },
    [navigate],
  );
}

type SariSayfalarNavLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  replace?: boolean;
  children: ReactNode;
};

export function SariSayfalarNavLink({
  href,
  replace = false,
  children,
  onClick,
  ...rest
}: SariSayfalarNavLinkProps) {
  const navigate = useSariSayfalarNavigate();
  return (
    <a
      href={href}
      {...rest}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented
          || event.ctrlKey
          || event.metaKey
          || event.altKey
          || event.shiftKey
          || event.button !== 0
        ) {
          return;
        }
        event.preventDefault();
        navigate(href, { replace });
      }}
    >
      {children}
    </a>
  );
}
