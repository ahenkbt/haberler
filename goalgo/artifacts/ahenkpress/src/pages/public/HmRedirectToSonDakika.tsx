import { Redirect } from "wouter";
import { useHmPublicHref } from "@/contexts/HmPublicLinkContext";

/** Eski / bilinmeyen HM yollarını son dakika listesine yönlendirir. */
export default function HmRedirectToSonDakika() {
  const h = useHmPublicHref();
  const qs = typeof window !== "undefined" ? window.location.search : "";
  return <Redirect to={`${h("/sondakika")}${qs}`} />;
}
