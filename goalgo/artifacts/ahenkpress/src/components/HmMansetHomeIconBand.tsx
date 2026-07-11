import type { CSSProperties } from "react";
import { Link } from "wouter";
import { Camera, Compass, Images, MapPin, Newspaper, UtensilsCrossed } from "lucide-react";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { isYekparePortalHubOnly } from "@/lib/hmPortalHosts";
import type { HmCorporateQuickLink } from "@/lib/newsSiteLayout";

type BandLink = {
  key: string;
  icon: string;
  title: string;
  subtitle: string;
  href: string;
};

function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href.trim());
}

function resolveStoredHref(h: (path: string) => string, href: string): string {
  const raw = href.trim();
  if (!raw || isExternalHref(raw)) return raw;
  return h(raw.startsWith("/") ? raw : `/${raw}`);
}

function bandSubtitle(title: string): string {
  const normalized = title.toLocaleLowerCase("tr-TR");
  if (normalized.includes("foto")) return "Galeri ve albümler";
  if (normalized.includes("gezilecek")) return "Rotalar ve öneriler";
  if (normalized.includes("galeri")) return "Foto ve video";
  if (normalized.includes("haber")) return "Tüm başlıklar";
  if (normalized.includes("mutfak")) return "Lezzet rehberi";
  return "Detaylara hızlı ulaşın";
}

function LucideIcon({ name }: { name: string }) {
  const cls = "h-4 w-4 shrink-0 opacity-90";
  if (name === "compass") return <Compass className={cls} aria-hidden />;
  if (name === "camera") return <Camera className={cls} aria-hidden />;
  if (name === "images") return <Images className={cls} aria-hidden />;
  if (name === "map") return <MapPin className={cls} aria-hidden />;
  if (name === "food") return <UtensilsCrossed className={cls} aria-hidden />;
  return <Newspaper className={cls} aria-hidden />;
}

function renderLink(link: BandLink) {
  const inner = (
    <>
      <span className="hm-manset-icon-band__icon" aria-hidden>
        <LucideIcon name={link.icon} />
      </span>
      <span className="hm-manset-icon-band__copy">
        <span className="hm-manset-icon-band__label">{link.title}</span>
        <span className="hm-manset-icon-band__subtitle">{link.subtitle}</span>
      </span>
    </>
  );
  if (isExternalHref(link.href)) {
    return (
      <a key={link.key} href={link.href} className="hm-manset-icon-band__kart" rel="noopener noreferrer" target="_blank">
        {inner}
      </a>
    );
  }
  return (
    <Link key={link.key} href={link.href} className="hm-manset-icon-band__kart">
      {inner}
    </Link>
  );
}

/** Manşet altı yatay ikon bandı — Gezilecek Yerler, Foto Galeri vb. */
export function HmMansetHomeIconBand({
  accent,
  className = "",
  quickLinks,
}: {
  accent: string;
  className?: string;
  quickLinks?: HmCorporateQuickLink[] | null;
}) {
  const h = useHmPublicHref();
  const ctx = useHmPublicLinkContextOptional();
  const portalHubOnly = isYekparePortalHubOnly(
    typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "",
    ctx?.slug ?? null,
  );
  const tumHaberlerHref = h("/tum-haberler");
  const fotoHref = h("/foto-galeri");
  const videoHref = h("/video-galeri");

  const managed: BandLink[] = (quickLinks ?? [])
    .filter((item) => item.enabled !== false && item.label.trim() && item.href.trim())
    .map((item, index) => ({
      key: item.id || `quick-${index + 1}`,
      icon: item.icon?.trim() || "news",
      title: item.label.trim(),
      subtitle: item.subtitle?.trim() || bandSubtitle(item.label),
      href: resolveStoredHref(h, item.href),
    }));

  const fallback: BandLink[] = [
    ...(portalHubOnly
      ? [{ key: "gezilecek", icon: "compass", title: "Gezilecek Yerler", subtitle: "Rotalar ve öneriler", href: h("/kesfet") }]
      : []),
    { key: "foto", icon: "camera", title: "Foto Galeri", subtitle: "Albümler ve kareler", href: fotoHref },
    { key: "video", icon: "images", title: "Video Galeri", subtitle: "Öne çıkan videolar", href: videoHref },
    { key: "haberler", icon: "news", title: "Tüm Haberler", subtitle: "Arşiv ve listeler", href: tumHaberlerHref },
    ...(portalHubOnly
      ? [{ key: "harita", icon: "map", title: "Haritalar", subtitle: "Keşfet ve konum", href: h("/haritalar") }]
      : []),
    { key: "gundem", icon: "news", title: "Gündem", subtitle: "Son gelişmeler", href: h("/kategori/gundem") },
  ];

  const links = managed.length > 0 ? managed : fallback;
  if (!links.length) return null;

  const style = { ["--hm-manset-icon-band-accent" as string]: accent } as CSSProperties;

  return (
    <section className={`hm-manset-icon-band ${className}`.trim()} aria-label="Hızlı erişim" style={style}>
      <div className="hm-manset-icon-band__grid">{links.slice(0, 7).map(renderLink)}</div>
    </section>
  );
}
