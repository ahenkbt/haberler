import { Link } from "wouter";
import { FileText, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { useSidebarStaticPages } from "@/hooks/useSidebarStaticPages";
import { ytRoutes } from "@/lib/routes";
import { withHmEmbedQuery } from "@/lib/runtimeConfig";

function staticPageHref(slug: string): string {
  const path = slug === "telif-kullanim" ? ytRoutes.staticPage(slug) : ytRoutes.staticPageGeneric(slug);
  return slug === "telif-kullanim" ? withHmEmbedQuery(path) : path;
}

function isStaticPageActive(path: string, slug: string): boolean {
  if (slug === "telif-kullanim") return path.includes("/telif-kullanim");
  return path.includes(`/sayfa/${slug}`);
}

const TELIF_SLUG = "telif-kullanim";

type SidebarStaticNavLinksProps = {
  path: string;
  /** Desktop sidebar link style */
  variant?: "sidebar" | "drawer" | "footer";
  onNavigate?: () => void;
};

function NavLink({
  href,
  label,
  active,
  variant,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  variant: "sidebar" | "drawer" | "footer";
  onNavigate?: () => void;
}) {
  const Icon: LucideIcon = FileText;
  const cls =
    variant === "footer"
      ? cn(
          "block rounded-lg px-3 py-1.5 text-xs yt-panel-hover",
          active ? "text-[var(--color-yt-text)]" : "text-[var(--color-yt-muted)]",
        )
      : cn(
          "flex items-center gap-4 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
          active ? "yt-nav-active text-[var(--color-yt-text)]" : "text-[var(--color-yt-text)] yt-panel-hover",
        );

  if (variant === "footer") {
    return (
      <Link href={href} onClick={onNavigate} className={cls}>
        {label}
      </Link>
    );
  }

  if (variant === "drawer") {
    return (
      <Link href={href} onClick={onNavigate} className={cls}>
        <Icon className="h-5 w-5 shrink-0" />
        {label}
      </Link>
    );
  }

  return (
    <Link href={href} onClick={onNavigate} className={cls}>
      <Icon className="h-5 w-5 shrink-0" />
      {label}
    </Link>
  );
}

export function SidebarStaticNavLinks({ path, variant = "sidebar", onNavigate }: SidebarStaticNavLinksProps) {
  const { data: pages, isLoading } = useSidebarStaticPages();
  const mainPages = pages?.filter((page) => page.slug !== TELIF_SLUG) ?? [];

  if (isLoading || !mainPages.length) {
    return null;
  }

  return (
    <>
      {mainPages.map((page) => {
        const label = page.sidebarLabel ?? page.title;
        return (
          <NavLink
            key={page.slug}
            href={staticPageHref(page.slug)}
            label={label}
            active={isStaticPageActive(path, page.slug)}
            variant={variant === "footer" ? "sidebar" : variant}
            onNavigate={onNavigate}
          />
        );
      })}
    </>
  );
}

/** Telif & Kullanım — sidebar alt bölümünde (Yekpare üstü) */
export function SidebarFooterStaticNavLinks({ path, onNavigate }: Pick<SidebarStaticNavLinksProps, "path" | "onNavigate">) {
  const { data: pages, isLoading } = useSidebarStaticPages();
  const telifPage = pages?.find((page) => page.slug === TELIF_SLUG);

  if (isLoading || !telifPage) {
    return <FallbackTelifNavLink path={path} variant="footer" onNavigate={onNavigate} />;
  }

  const label = telifPage.sidebarLabel ?? telifPage.title;
  return (
    <NavLink
      href={staticPageHref(telifPage.slug)}
      label={label}
      active={isStaticPageActive(path, telifPage.slug)}
      variant="footer"
      onNavigate={onNavigate}
    />
  );
}

export function sidebarHasStaticFallback(): boolean {
  return true;
}

/** API yüklenmeden önce telif linki için yedek */
export function FallbackTelifNavLink({
  path,
  variant = "sidebar",
  onNavigate,
}: SidebarStaticNavLinksProps) {
  const href = ytRoutes.staticPage("telif-kullanim");
  return (
    <NavLink
      href={href}
      label="Telif & Kullanım"
      active={path.includes("/telif-kullanim")}
      variant={variant}
      onNavigate={onNavigate}
    />
  );
}
