/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Örn. https://api.example.com — sonda / olmadan. @workspace/api-client-react istekleri bu host’a gider. */
  readonly VITE_API_BASE_URL?: string;
  /** Özel alan vitrininde doğrudan Railway API kökü (build-time). */
  readonly VITE_PUBLIC_API_ORIGIN?: string;
  /**
   * true ise SPA her zaman `VITE_API_BASE_URL` kullanır (çapraz köken + CORS/credentials bilinçli kurulum).
   * Atlanırsa ve sayfa kökü ile API kökü farklıysa otomatik göreli `/api` seçilir (panel oturumu için).
   */
  readonly VITE_API_CROSS_ORIGIN?: string;
  /** Özel alan adı için A kaydında kullanılacak IPv4 (panel “Genel ayarlar” metninde gösterilir). */
  readonly VITE_YEKPARE_APEX_IP?: string;
  /** @deprecated Yekpare AI Call artık iframe kullanmıyor. */
  readonly VITE_AGENTLABS_EMBED_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** YouTube IFrame API — yalnızca kullandığımız yüzey. */
type YoutubeIframeApi = {
  Player: new (el: HTMLElement | string, opts: Record<string, unknown>) => {
    destroy(): void;
    playVideo?(): void;
    pauseVideo?(): void;
    setVolume(v: number): void;
    getVolume(): number;
    mute?(): void;
    unMute?(): void;
  };
  PlayerState?: { PLAYING: number; PAUSED: number; ENDED: number; BUFFERING?: number; UNSTARTED?: number };
};

interface Window {
  YT?: YoutubeIframeApi;
  onYouTubeIframeAPIReady?: () => void;
  /** index.html erken bootstrap — React yüklenmeden anasayfa haber havuzu. */
  __YEKPARE_HM_HOME_HYBRID__?: {
    siteId: number;
    savedAt: number;
    items: import("@/hooks/useHomeHybridNews").HomeHybridNewsItem[];
  };
  /** index.html erken bootstrap — özel alan slug/meta ipucu. */
  __YEKPARE_HM_DOMAIN_BOOT__?: {
    host?: string;
    domain?: string;
    slug?: string;
    savedAt?: number;
  };
}
