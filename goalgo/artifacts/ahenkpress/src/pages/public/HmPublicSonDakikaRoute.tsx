import { HmNestedLayout } from "@/components/HmNestedLayout";
import TumHaberler from "@/pages/public/TumHaberler";

/** `/tr/:slug/sondakika` */
export default function HmPublicSonDakikaRoute() {
  return (
    <HmNestedLayout>
      <TumHaberler view="list" />
    </HmNestedLayout>
  );
}
