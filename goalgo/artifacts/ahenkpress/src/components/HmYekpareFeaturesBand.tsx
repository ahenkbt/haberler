import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { HmYekpareFeaturesCards } from "@/components/HmYekpareFeaturesCards";

type HmYekpareFeaturesBandProps = {
  className?: string;
};

/** Editör haber sitelerinde Yekpare servis kutuları — yalnızca panelde açıksa. */
export function HmYekpareFeaturesBand({ className = "" }: HmYekpareFeaturesBandProps) {
  const hmCtx = useHmPublicLinkContextOptional();
  if (!hmCtx || hmCtx.layoutPrefs.hmNewsYekpareFeaturesEnabled !== true) return null;
  return <HmYekpareFeaturesCards className={className} />;
}
