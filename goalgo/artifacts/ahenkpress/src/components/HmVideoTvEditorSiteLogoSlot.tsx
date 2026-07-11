import { useEffect, useState } from "react";
import { Link } from "wouter";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";

/** Video TV üst şerit: editör sitesi logosu (layoutPrefs.logoUrl). */
export function HmVideoTvEditorSiteLogoSlot() {
  const ctx = useHmPublicLinkContextOptional();
  const h = useHmPublicHref();
  const logoUrl = ctx?.layoutPrefs?.logoUrl?.trim() ?? "";
  const displayName = ctx?.displayName ?? "Haber";
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [logoUrl]);

  if (!ctx) return null;

  const homeHref = h("/");

  return (
    <Link
      href={homeHref}
      className="hm-video-tv-editor-logo-slot flex h-full min-h-[48px] w-full items-center justify-center px-1.5 py-1 hover:opacity-95 md:min-h-[56px] md:px-2"
      aria-label={displayName}
    >
      {logoUrl && !failed ? (
        <img
          src={resolveClientMediaSrc(logoUrl)}
          alt=""
          className="hm-video-tv-editor-logo-slot__img"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="hm-video-tv-editor-logo-slot__fallback line-clamp-3 text-center text-[10px] font-black uppercase leading-tight tracking-wide text-slate-800">
          {displayName}
        </span>
      )}
    </Link>
  );
}
