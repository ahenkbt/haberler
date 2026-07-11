import { useEffect, useState } from "react";

export function useIsMobile(breakpoint = 1024) {
  const [mobile, setMobile] = useState(
    typeof window !== "undefined" ? window.matchMedia(`(max-width: ${breakpoint - 1}px)`).matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const fn = () => setMobile(mq.matches);
    fn();
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, [breakpoint]);
  return mobile;
}

export function useIsWatchRoute(path: string) {
  return /\/kanal\/[^/]+\/[^/]+/.test(path);
}
