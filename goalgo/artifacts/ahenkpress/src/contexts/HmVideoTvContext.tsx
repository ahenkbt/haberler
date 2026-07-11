import { createContext, useContext } from "react";

/** Haber merkezi sitesi altında `/tr/:slug/video-tv` gömülü Yektube (Video TV). */
export type HmVideoTvLayoutValue = {
  slug: string;
  pathHome: string;
  /** AppNav (varsa) + haber sitesi üst şeridi sonrası; Yektube içi sticky öğeler için `top` (px). */
  contentStickyTopPx: number;
  displayName: string;
};

const HmVideoTvContext = createContext<HmVideoTvLayoutValue | null>(null);

export function useHmVideoTvLayout(): HmVideoTvLayoutValue | null {
  return useContext(HmVideoTvContext);
}

export const HmVideoTvContextProvider = HmVideoTvContext.Provider;
