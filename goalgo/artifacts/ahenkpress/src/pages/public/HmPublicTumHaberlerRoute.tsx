import { HmNestedLayout } from "@/components/HmNestedLayout";
import TumHaberler from "@/pages/public/TumHaberler";

/** `/tr/:slug/tum-haberler` */
export default function HmPublicTumHaberlerRoute() {
  return (
    <HmNestedLayout>
      <TumHaberler />
    </HmNestedLayout>
  );
}
