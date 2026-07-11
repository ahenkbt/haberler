import { useCallback, useEffect, useRef, type RefObject } from "react";

function isVideoWithPiP(el: HTMLMediaElement): el is HTMLVideoElement {
  return (
    el instanceof HTMLVideoElement &&
    "requestPictureInPicture" in el &&
    typeof el.requestPictureInPicture === "function"
  );
}

async function requestPiP(el: HTMLMediaElement): Promise<void> {
  if (!isVideoWithPiP(el)) throw new Error("PiP desteklenmiyor");
  await el.requestPictureInPicture();
}

export function isPictureInPictureSupported(): boolean {
  return typeof document !== "undefined" && Boolean(document.pictureInPictureEnabled);
}

export function usePictureInPicture(mediaRef: RefObject<HTMLMediaElement | null>) {
  const enterPiP = useCallback(async () => {
    const el = mediaRef.current;
    if (!el || !isPictureInPictureSupported() || !isVideoWithPiP(el)) return false;
    try {
      if (document.pictureInPictureElement === el) return true;
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      await requestPiP(el);
      return true;
    } catch {
      return false;
    }
  }, [mediaRef]);

  const exitPiP = useCallback(async () => {
    if (!document.pictureInPictureElement) return;
    try {
      await document.exitPictureInPicture();
    } catch {
      /* ignore */
    }
  }, []);

  return { enterPiP, exitPiP, supported: isPictureInPictureSupported() };
}

/** Uygulama arka plana geçince veya başka sekmeye gidince küçük ekran (PiP) açmayı dener. */
export function useAutoPictureInPicture(
  mediaRef: RefObject<HTMLMediaElement | null>,
  active: boolean,
) {
  const pipRequested = useRef(false);

  useEffect(() => {
    if (!active || !isPictureInPictureSupported()) return;

    const tryPiP = () => {
      const el = mediaRef.current;
      if (!el || el.paused || el.ended || !isVideoWithPiP(el)) return;
      if (document.pictureInPictureElement === el) return;
      if (pipRequested.current) return;
      pipRequested.current = true;
      void requestPiP(el).catch(() => {
        pipRequested.current = false;
      });
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") tryPiP();
    };

    const onPageHide = () => tryPiP();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [mediaRef, active]);

  useEffect(() => {
    pipRequested.current = false;
  }, [active, mediaRef]);
}
