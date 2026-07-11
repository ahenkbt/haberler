import * as React from "react"

const MOBILE_BREAKPOINT = 768
/** HM alt şerit menü + mobil krom — tablet portrait dahil (768–1023px). */
export const HM_COMPACT_CHROME_BREAKPOINT = 1024

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(() =>
    typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false,
  )

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}

/** Logo altı üst menü + alt şerit menü — telefon ve tablet (1024px altı). */
export function useIsHmCompactViewport() {
  const [compact, setCompact] = React.useState(() =>
    typeof window !== "undefined" ? window.innerWidth < HM_COMPACT_CHROME_BREAKPOINT : false,
  )

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${HM_COMPACT_CHROME_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setCompact(window.innerWidth < HM_COMPACT_CHROME_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setCompact(window.innerWidth < HM_COMPACT_CHROME_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return compact
}
