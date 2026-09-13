import { useMemo } from "react";
import type { HmNestedMetaCached } from "@/lib/hmNestedMetaStorage";
import type { NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";
import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";
import { buildVatanFooterGroups } from "@/lib/hmVatanNav";
import { VATAN_FOOTER_MISSION } from "@/lib/hmVatanHomeContent";
import { isVkdSiteSlug } from "@/lib/hmVkdFooterNav";
import { resolveHmCorporateRequestFormEnabled, hmRequestFormPath } from "@/lib/hmRequestForm";
import { isHmVideoTvAllowed, isYekparePortalHubOnly } from "@/lib/hmPortalHosts";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { VKD_CONTACT_ADDRESS, VKD_CONTACT_PHONE_DISPLAY, VKD_CONTACT_PHONE_TEL } from "@/lib/vkdPublicContact";
import { VatanBrand } from "@/components/vatan/HmVatanHeader";
import { VatanLink } from "@/components/vatan/ui/VatanLink";

type Social = { key: string; label: string; href: string };

function SocialIcon({ kind }: { kind: string }) {
  switch (kind) {
    case "instagram":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
          <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
        </svg>
      );
    case "facebook":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
          <path d="M14 8h3V5h-3a4 4 0 0 0-4 4v2H7v3h3v7h3v-7h3l1-3h-4V9a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    case "x":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
          <path d="m4 4 16 16M20 4 4 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
          <rect x="3" y="6" width="18" height="12" rx="3" stroke="currentColor" strokeWidth="1.5" />
          <path d="m10 9.5 5 2.5-5 2.5z" fill="currentColor" />
        </svg>
      );
  }
}

export function HmVatanFooter({
  site,
  layoutPrefs,
  showVideoTvLink,
}: {
  site: HmNestedMetaCached;
  layoutPrefs: NewsSiteLayoutPrefs;
  showVideoTvLink: boolean;
}) {
  const h = useHmPublicHref();
  const groups = useMemo(() => buildVatanFooterGroups(layoutPrefs, h), [layoutPrefs, h]);
  const year = new Date().getFullYear();
  const isVkd = isVkdSiteSlug(site.slug);
  const hostKey = typeof window !== "undefined" ? window.location.hostname.toLowerCase().split(":")[0] ?? "" : "";
  const portalHubOnly = isYekparePortalHubOnly(hostKey, site.slug);
  const videoAllowed = showVideoTvLink && isHmVideoTvAllowed(hostKey, site.slug);
  const videoPath = !portalHubOnly ? "/video" : `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(site.slug)}/video-tv`;

  const address = site.contact?.address?.trim() || (isVkd ? VKD_CONTACT_ADDRESS : "");
  const phone = site.contact?.phone?.trim() || (isVkd ? VKD_CONTACT_PHONE_DISPLAY : "");
  const phoneTel = site.contact?.phone?.trim()
    ? `tel:${site.contact.phone.replace(/[^\d+]/g, "")}`
    : isVkd
      ? `tel:${VKD_CONTACT_PHONE_TEL}`
      : "";
  const email = site.contact?.email?.trim() || "";

  const socials: Social[] = [];
  const s = layoutPrefs.hmFooterSocial;
  if (s?.instagramUrl?.trim()) socials.push({ key: "instagram", label: "Instagram", href: s.instagramUrl.trim() });
  if (s?.facebookUrl?.trim()) socials.push({ key: "facebook", label: "Facebook", href: s.facebookUrl.trim() });
  if (s?.xUrl?.trim()) socials.push({ key: "x", label: "X", href: s.xUrl.trim() });
  if (s?.youtubeUrl?.trim()) socials.push({ key: "youtube", label: "YouTube", href: s.youtubeUrl.trim() });

  const legal: { key: string; label: string; href: string }[] = [
    { key: "kunye", label: "Künye", href: h("/kunye") },
  ];
  if (resolveHmCorporateRequestFormEnabled(layoutPrefs)) {
    legal.push({ key: "talep", label: "Talep Formu", href: h(hmRequestFormPath()) });
  }
  legal.push({ key: "haberler", label: "Haberler", href: h("/tum-haberler") });
  if (videoAllowed) legal.push({ key: "video", label: "Video TV", href: h(videoPath) });

  return (
    <footer className="vatan-footer" role="contentinfo">
      <div className="vatan-wrap vatan-footer__inner">
        <div className="vatan-footer__brand">
          <VatanBrand logoUrl={layoutPrefs.logoUrl?.trim() || undefined} displayName={site.displayName} homeHref={h("/")} compact />
          <p className="vatan-footer__mission">{VATAN_FOOTER_MISSION}</p>
          <address className="vatan-footer__contact">
            {address ? <span>{address}</span> : null}
            {phone ? <a href={phoneTel}>{phone}</a> : null}
            {email ? <a href={`mailto:${email}`}>{email}</a> : null}
          </address>
          {socials.length ? (
            <ul className="vatan-footer__social" role="list" aria-label="Sosyal medya">
              {socials.map((so) => (
                <li key={so.key}>
                  <a href={so.href} target="_blank" rel="noopener noreferrer" aria-label={so.label} className="vatan-iconbtn vatan-iconbtn--sm">
                    <SocialIcon kind={so.key} />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {groups.map((group) => (
          <nav key={group.key} className="vatan-footer__group" aria-label={group.heading}>
            <p className="vatan-eyebrow vatan-footer__heading">{group.heading}</p>
            <ul role="list">
              {group.links.map((link) => (
                <li key={link.key}>
                  <VatanLink href={link.href} className="vatan-footer__link">
                    {link.label}
                  </VatanLink>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="vatan-wrap vatan-footer__legal">
        <p className="vatan-footer__copy">
          © {year} {site.displayName}
        </p>
        <ul className="vatan-footer__legal-links" role="list">
          {legal.map((l) => (
            <li key={l.key}>
              <VatanLink href={l.href}>{l.label}</VatanLink>
            </li>
          ))}
        </ul>
        <p className="vatan-footer__credit">
          Altyapı:{" "}
          <a href="https://ahenk.net.tr" rel="noreferrer">
            Ahenk Bilgi Teknolojileri
          </a>
        </p>
      </div>
    </footer>
  );
}
