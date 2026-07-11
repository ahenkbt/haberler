import { HmNestedLayout } from "@/components/HmNestedLayout";
import HaberDetay from "@/pages/public/HaberDetay";

/** `/tr/:slug/haber/:id` — vitrin bağlamında haber detayı. */
export default function HmPublicHaberDetayRoute() {
  return (
    <HmNestedLayout>
      <HaberDetay />
    </HmNestedLayout>
  );
}
