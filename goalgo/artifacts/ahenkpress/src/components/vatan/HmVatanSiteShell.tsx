import { createContext, useContext, useEffect, useMemo, type ReactNode, type RefObject } from "react";
import type { HmNestedMetaCached } from "@/lib/hmNestedMetaStorage";
import type { NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";
import { useVatanScrolled } from "@/hooks/useVatanScrolled";
import { HmVatanHeader } from "@/components/vatan/HmVatanHeader";
import { HmVatanFooter } from "@/components/vatan/HmVatanFooter";

export type VatanShellContextValue = {
  isHomeRoot: boolean;
  scrolled: boolean;
};

const VatanShellContext = createContext<VatanShellContextValue | null>(null);

export function useVatanShellOptional(): VatanShellContextValue | null {
  return useContext(VatanShellContext);
}

const VATAN_FONT_LINK_ID = "vatan-display-font";
const VATAN_FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&display=swap";

/** Cormorant Garamond is only requested when the Vatan shell mounts (Inter is already global). */
function useVatanDisplayFont() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(VATAN_FONT_LINK_ID)) return;
    const link = document.createElement("link");
    link.id = VATAN_FONT_LINK_ID;
    link.rel = "stylesheet";
    link.href = VATAN_FONT_HREF;
    document.head.appendChild(link);
  }, []);
}

export function HmVatanSiteShell({
  site,
  layoutPrefs,
  isHomeRoot,
  pathOnly,
  showVideoTvLink,
  headerBandRef,
  topOffsetPx = 0,
  hideFooter = false,
  children,
}: {
  site: HmNestedMetaCached;
  layoutPrefs: NewsSiteLayoutPrefs;
  isHomeRoot: boolean;
  pathOnly: string;
  showVideoTvLink: boolean;
  headerBandRef?: RefObject<HTMLDivElement | null>;
  /** Platform nav height when `showPlatformNav` is on; the fixed header sits below it. */
  topOffsetPx?: number;
  hideFooter?: boolean;
  children: ReactNode;
}) {
  useVatanDisplayFont();
  const scrolled = useVatanScrolled(24);
  const ctx = useMemo(() => ({ isHomeRoot, scrolled }), [isHomeRoot, scrolled]);

  return (
    <VatanShellContext.Provider value={ctx}>
      <a className="vatan-skip" href="#icerik">
        İçeriğe geç
      </a>
      <HmVatanHeader
        site={site}
        layoutPrefs={layoutPrefs}
        isHomeRoot={isHomeRoot}
        pathOnly={pathOnly}
        scrolled={scrolled}
        showVideoTvLink={showVideoTvLink}
        bandRef={headerBandRef}
        topOffsetPx={topOffsetPx}
      />
      <main
        id="icerik"
        className={`vatan-main${isHomeRoot ? " vatan-main--home" : " vatan-main--page"}`}
        tabIndex={-1}
      >
        {children}
      </main>
      {hideFooter ? null : <HmVatanFooter site={site} layoutPrefs={layoutPrefs} showVideoTvLink={showVideoTvLink} />}
    </VatanShellContext.Provider>
  );
}
